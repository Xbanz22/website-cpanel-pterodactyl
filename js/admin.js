// Menentukan fungsi mana yang dijalankan berdasarkan halaman
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('adminLoginForm')) {
        handleAdminLogin();
    }
    if (document.querySelector('.dashboard-container')) {
        initDashboard();
    }
});

// Fungsi untuk login admin (tetap sama)
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

// Fungsi utama untuk dashboard
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
}

// Fungsi untuk menangani form pembuatan admin baru
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
            form.reset(); // Kosongkan form
            fetchDashboardData(); // Refresh tabel data

        } catch (error) {
            alert('Error: ' + error.message);
        } finally {
            button.disabled = false;
            button.textContent = originalText;
        }
    });
}

// Fungsi untuk mengambil data dan menampilkan di dashboard
async function fetchDashboardData() {
    try {
        const response = await fetch('/api/admin/dashboard');
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);

        // Update statistik cards
        document.getElementById('totalUsers').textContent = data.totalUsers;
        document.getElementById('totalAdmins').textContent = data.roleCounts.admin || 0;
        document.getElementById('totalMembers').textContent = data.roleCounts.member || 0;

        const tableBody = document.getElementById('userTableBody');
        tableBody.innerHTML = ''; // Kosongkan tabel

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
        document.getElementById('userTableBody').innerHTML = `<tr><td colspan="4" style="color:red;">Error: ${error.message}</td></tr>`;
    }
}

// Fungsi untuk menambahkan event listener ke semua tombol di tabel
function addEventListenersToButtons() {
    // Tombol Save Role
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

    // Tombol Delete User (sama seperti sebelumnya)
    document.querySelectorAll('.btn-delete').forEach(button => {
        button.addEventListener('click', async (e) => {
            const username = e.target.dataset.username;
            if (confirm(`Are you sure you want to delete user "${username}"?`)) {
                try {
                    const response = await fetch('/api/admin/delete-user', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username })
                    });
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