// Menentukan fungsi mana yang dijalankan berdasarkan halaman yang dimuat
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('adminLoginForm')) {
        handleAdminLogin();
    }
    if (document.querySelector('.dashboard-container')) {
        initDashboard();
    }
});

/**
 * Menangani form login admin.
 */
function handleAdminLogin() {
    const form = document.getElementById('adminLoginForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const button = form.querySelector('button');
        button.textContent = 'Logging in...';
        button.disabled = true;

        try {
            const response = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: form.username.value,
                    password: form.password.value,
                })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);

            sessionStorage.setItem('isAdminLoggedIn', 'true');
            window.location.href = '/admin/index.html';

        } catch (error) {
            alert('Error: ' + error.message);
            button.textContent = 'Login';
            button.disabled = false;
        }
    });
}

/**
 * Fungsi utama untuk inisialisasi halaman dashboard.
 */
function initDashboard() {
    if (sessionStorage.getItem('isAdminLoggedIn') !== 'true') {
        window.location.href = '/admin/login.html';
        return;
    }

    document.getElementById('logoutButton').addEventListener('click', (e) => {
        e.preventDefault();
        sessionStorage.removeItem('isAdminLoggedIn');
        window.location.href = '/admin/login.html';
    });

    handleCreateAdminForm();
    fetchDashboardData();
    fetchAllServersData();
}

/**
 * Menangani form untuk membuat admin baru.
 */
function handleCreateAdminForm() {
    const form = document.getElementById('createAdminForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const button = form.querySelector('button');
        const originalText = button.textContent;
        button.disabled = true;
        button.textContent = "Creating...";

        try {
            const response = await fetch('/api/admin/create-admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: form.username.value,
                    email: form.email.value,
                    password: form.password.value,
                })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);

            alert(result.message);
            form.reset();
            fetchDashboardData();

        } catch (error) {
            alert('Error: ' + error.message);
        } finally {
            button.disabled = false;
            button.textContent = originalText;
        }
    });
}

/**
 * Mengambil data user dari website kita dan menampilkannya.
 */
async function fetchDashboardData() {
    const tableBody = document.getElementById('userTableBody');
    tableBody.innerHTML = '<tr><td colspan="4">Loading data...</td></tr>';
    try {
        const response = await fetch('/api/admin/dashboard');
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        
        const totalUsersEl = document.getElementById('totalUsers');
        const totalAdminsEl = document.getElementById('totalAdmins');
        
        if (totalUsersEl) totalUsersEl.textContent = data.totalUsers;
        if (totalAdminsEl) totalAdminsEl.textContent = data.roleCounts.admin || 0;
        
        tableBody.innerHTML = '';
        if(data.users.length === 0){
             tableBody.innerHTML = '<tr><td colspan="4">No users found.</td></tr>';
             return;
        }
        data.users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td>
                    <select class="user-role-select" data-username="${user.username}">
                        <option value="free" ${user.role === 'free' ? 'selected' : ''}>Free</option>
                        <option value="member" ${user.role === 'member' ? 'selected' : ''}>Member</option>
                        <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                    </select>
                </td>
                <td>
                    <button class="btn-save-role" data-username="${user.username}">Save</button>
                    <button class="btn-delete" data-username="${user.username}">Delete</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
        addEventListenersToButtons();
    } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        if (tableBody) tableBody.innerHTML = `<tr><td colspan="4" style="color:var(--danger-color);">${error.message}</td></tr>`;
    }
}

/**
 * Mengambil data SEMUA server dari Pterodactyl dan menampilkannya.
 */
async function fetchAllServersData() {
    const tableBody = document.getElementById('serverTableBody');
    tableBody.innerHTML = '<tr><td colspan="6">Loading server list...</td></tr>';
    try {
        const response = await fetch('/api/admin/get-all-servers');
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Failed to fetch servers.");
        
        const totalServersEl = document.getElementById('totalServers');
        if (totalServersEl) totalServersEl.textContent = data.totalServers;

        tableBody.innerHTML = '';
        if (data.servers.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6">No servers found on Pterodactyl.</td></tr>';
            return;
        }
        data.servers.forEach(server => {
            const statusClass = server.suspended ? 'status-suspended' : 'status-active';
            const statusText = server.suspended ? 'Suspended' : 'Active';
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><div class="status"><span class="status-dot ${statusClass}"></span>${statusText}</div></td>
                <td>${server.name}</td>
                <td>${server.user_id}</td>
                <td>${server.ram} MB</td>
                <td>${server.disk} MB</td>
                <td>${server.cpu}%</td>
            `;
            tableBody.appendChild(row);
        });
    } catch (error) {
        console.error('Failed to fetch all servers data:', error);
        tableBody.innerHTML = `<tr><td colspan="6" style="color:var(--danger-color);">Error: ${error.message} Periksa API Key Pterodactyl Anda di Vercel.</td></tr>`;
    }
}

/**
 * Menambahkan event listener ke tombol "Save Role" dan "Delete" di tabel user.
 */
function addEventListenersToButtons() {
    document.querySelectorAll('.btn-save-role').forEach(button => {
        button.addEventListener('click', async (e) => {
            const username = e.target.dataset.username;
            const newRole = e.target.closest('tr').querySelector('.user-role-select').value;
            try {
                const response = await fetch('/api/admin/change-role', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, newRole }) });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message);
                alert(result.message);
                fetchDashboardData();
            } catch (error) {
                alert('Error changing role: ' + error.message);
            }
        });
    });
    document.querySelectorAll('.btn-delete').forEach(button => {
        button.addEventListener('click', async (e) => {
            const username = e.target.dataset.username;
            if (confirm(`Are you sure you want to delete user "${username}"?`)) {
                try {
                    const response = await fetch('/api/admin/delete-user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username }) });
                    const result = await response.json();
                    if (!response.ok) throw new Error(result.message);
                    alert(result.message);
                    fetchDashboardData();
                } catch (error) {
                    alert('Error deleting user: ' + error.message);
                }
            }
        });
    });
}