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

            // Jika sukses, simpan status login di sessionStorage dan arahkan ke dashboard
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
    // 1. Cek status login, jika tidak ada, tendang ke halaman login
    if (sessionStorage.getItem('isAdminLoggedIn') !== 'true') {
        window.location.href = '/admin/login.html';
        return; // Hentikan eksekusi lebih lanjut
    }

    // 2. Setup tombol logout
    document.getElementById('logoutButton').addEventListener('click', (e) => {
        e.preventDefault();
        sessionStorage.removeItem('isAdminLoggedIn');
        window.location.href = '/admin/login.html';
    });

    // 3. Setup form untuk membuat admin baru
    handleCreateAdminForm();

    // 4. Ambil dan tampilkan semua data yang diperlukan
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
            form.reset(); // Kosongkan form setelah berhasil
            fetchDashboardData(); // Refresh tabel data user

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
    try {
        const response = await fetch('/api/admin/dashboard');
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);

        // Update statistik cards
        document.getElementById('totalUsers').textContent = data.totalUsers;
        document.getElementById('totalAdmins').textContent = data.roleCounts.admin || 0;
        document.getElementById('totalMembers').textContent = data.roleCounts.member || 0;

        // Tampilkan data user di tabel
        const tableBody = document.getElementById('userTableBody');
        tableBody.innerHTML = ''; // Kosongkan tabel

        if (data.users.length === 0) {
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
        
        // Tambahkan event listener untuk semua tombol di tabel (Save & Delete)
        addEventListenersToButtons();

    } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        document.getElementById('userTableBody').innerHTML = `<tr><td colspan="4" style="color:red;">Error: ${error.message}</td></tr>`;
    }
}

/**
 * Mengambil data SEMUA server dari Pterodactyl dan menampilkannya.
 */
async function fetchAllServersData() {
    try {
        const response = await fetch('/api/admin/get-all-servers');
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);

        // Update statistik card total server
        document.getElementById('totalServers').textContent = data.totalServers;

        // Tampilkan data di tabel server
        const tableBody = document.getElementById('serverTableBody');
        tableBody.innerHTML = ''; // Kosongkan tabel

        if (data.servers.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5">No servers found on Pterodactyl.</td></tr>';
            return;
        }

        data.servers.forEach(server => {
            const row = document.createElement('tr');
            row.innerHTML = `
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
        document.getElementById('serverTableBody').innerHTML = `<tr><td colspan="5" style="color:red;">Error: ${error.message}</td></tr>`;
    }
}

/**
 * Menambahkan event listener ke tombol "Save Role" dan "Delete" di tabel user.
 */
function addEventListenersToButtons() {
    // Event listener untuk tombol Save Role
    document.querySelectorAll('.btn-save-role').forEach(button => {
        button.addEventListener('click', async (e) => {
            const username = e.target.dataset.username;
            const newRole = e.target.closest('tr').querySelector('.user-role-select').value;
            
            try {
                const response = await fetch('/api/admin/change-role', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, newRole })
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message);

                alert(result.message);
                fetchDashboardData(); // Refresh data untuk update statistik
            } catch (error) {
                alert('Error changing role: ' + error.message);
            }
        });
    });

    // Event listener untuk tombol Delete User
    document.querySelectorAll('.btn-delete').forEach(button => {
        button.addEventListener('click', async (e) => {
            const username = e.target.dataset.username;
            if (confirm(`Are you sure you want to delete user "${username}"? This cannot be undone.`)) {
                try {
                    const response = await fetch('/api/admin/delete-user', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username })
                    });
                    const result = await response.json();
                    if (!response.ok) throw new Error(result.message);

                    alert(result.message);
                    fetchDashboardData(); // Refresh tabel dan statistik
                } catch (error) {
                    alert('Error deleting user: ' + error.message);
                }
            }
        });
    });
}