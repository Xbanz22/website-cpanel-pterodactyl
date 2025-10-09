// Menentukan fungsi mana yang dijalankan berdasarkan halaman
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('adminLoginForm')) {
        handleAdminLogin();
    }
    if (document.querySelector('.dashboard-container')) {
        initDashboard();
    }
});

// Fungsi untuk login admin
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

            // Jika sukses, simpan status login dan redirect
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
    // 1. Cek status login, jika tidak ada, tendang ke halaman login
    if (sessionStorage.getItem('isAdminLoggedIn') !== 'true') {
        window.location.href = '/admin/login.html';
        return;
    }

    // 2. Setup tombol logout
    const logoutButton = document.getElementById('logoutButton');
    logoutButton.addEventListener('click', (e) => {
        e.preventDefault();
        sessionStorage.removeItem('isAdminLoggedIn');
        window.location.href = '/admin/login.html';
    });

    // 3. Ambil data dari backend dan tampilkan
    fetchDashboardData();
}

async function fetchDashboardData() {
    try {
        const response = await fetch('/api/admin/dashboard');
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);

        // Update statistik cards
        document.getElementById('totalUsers').textContent = data.totalUsers;
        document.getElementById('totalServers').textContent = data.totalUsers; // Placeholder

        // Tampilkan data user di tabel
        const tableBody = document.getElementById('userTableBody');
        tableBody.innerHTML = ''; // Kosongkan tabel

        if (data.users.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="3">No users found.</td></tr>';
            return;
        }

        data.users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td><button class="btn-delete" data-username="${user.username}">Delete</button></td>
            `;
            tableBody.appendChild(row);
        });
        
        // Tambahkan event listener untuk semua tombol delete
        addDeleteEventListeners();

    } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        document.getElementById('userTableBody').innerHTML = `<tr><td colspan="3" style="color:red;">Error: ${error.message}</td></tr>`;
    }
}

function addDeleteEventListeners() {
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
                    // Hapus baris dari tabel tanpa refresh
                    e.target.closest('tr').remove();
                    // Refresh data statistik
                    fetchDashboardData();
                } catch (error) {
                    alert('Error deleting user: ' + error.message);
                }
            }
        });
    });
}