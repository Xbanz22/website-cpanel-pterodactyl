let currentServerPage = 1;

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('adminLoginForm')) {
        handleAdminLogin();
    }
    if (document.querySelector('.dashboard-container')) {
        initDashboard();
    }
});

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
                    password: form.password.value
                })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            sessionStorage.setItem('isAdminLoggedIn', 'true');
            window.location.href = '/admin/index.html';
        } catch (error) {
            iziToast.error({ title: 'Error', message: error.message, position: 'topRight' });
            button.textContent = 'Login';
            button.disabled = false;
        }
    });
}

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
    handleConfigForm();
    loadCurrentConfig();
    fetchDashboardData();
    fetchAllServersData(currentServerPage);
}

async function loadCurrentConfig() {
    try {
        const response = await fetch('/api/admin/manage-config');
        const config = await response.json();
        if (response.ok) {
            document.querySelector('#configForm input[name="ptero_domain"]').value = config.ptero_domain || '';
        }
    } catch (error) {
        console.error("Failed to load current config:", error);
    }
}

function handleConfigForm() {
    const form = document.getElementById('configForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const button = form.querySelector('button');
        button.textContent = "Saving...";
        button.disabled = true;
        const data = {
            ptero_domain: form.ptero_domain.value,
            ptero_admin_api_key: form.ptero_admin_api_key.value,
            ptero_client_api_key: form.ptero_client_api_key.value,
        };
        const payload = Object.fromEntries(Object.entries(data).filter(([_, v]) => v.trim() !== ''));
        try {
            const response = await fetch('/api/admin/manage-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            iziToast.success({ title: 'Success', message: result.message, position: 'topRight' });
            form.ptero_admin_api_key.value = '';
            form.ptero_client_api_key.value = '';
        } catch (error) {
            iziToast.error({ title: 'Error', message: error.message, position: 'topRight' });
        } finally {
            button.textContent = "Save Config";
            button.disabled = false;
        }
    });
}

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
                    password: form.password.value
                })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            iziToast.success({ title: 'Success', message: result.message, position: 'topRight' });
            form.reset();
            fetchDashboardData();
        } catch (error) {
            iziToast.error({ title: 'Error', message: error.message, position: 'topRight' });
        } finally {
            button.disabled = false;
            button.textContent = originalText;
        }
    });
}

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
        if (data.users.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="4">No users found.</td></tr>';
            return;
        }
        data.users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `<td>${user.username}</td><td>${user.email}</td><td><select class="user-role-select" data-username="${user.username}"><option value="free" ${user.role === 'free' ? 'selected' : ''}>Free</option><option value="member" ${user.role === 'member' ? 'selected' : ''}>Member</option><option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option></select></td><td><button class="btn-save-role" data-username="${user.username}">Save</button><button class="btn-delete" data-username="${user.username}">Delete</button></td>`;
            tableBody.appendChild(row);
        });
        addEventListenersToButtons();
    } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        if (tableBody) tableBody.innerHTML = `<tr><td colspan="4" style="color:var(--danger-color);">${error.message}</td></tr>`;
    }
}

async function fetchAllServersData(page = 1) {
    const tableBody = document.getElementById('serverTableBody');
    tableBody.innerHTML = `<tr><td colspan="7">Loading server list on page ${page}...</td></tr>`;
    try {
        const response = await fetch(`/api/admin/get-all-servers?page=${page}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        currentServerPage = data.pagination.current_page;
        updateServerPagination(data.pagination);
        const totalServersEl = document.getElementById('totalServers');
        if (totalServersEl) totalServersEl.textContent = data.pagination.total;
        tableBody.innerHTML = '';
        if (data.servers.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="7">No servers found on page ${page}.</td></tr>`;
            return;
        }
        data.servers.forEach(server => {
            const statusClass = `status-${server.status.class}`;
            const actionButton = server.status.text === 'Suspended' ? `<button class="btn-action btn-unsuspend" data-server-id="${server.id}">Unsuspend</button>` : `<button class="btn-action btn-suspend" data-server-id="${server.id}">Suspend</button>`;
            const row = document.createElement('tr');
            row.innerHTML = `<td><div class="status"><span class="status-dot ${statusClass}"></span>${server.status.text}</div></td><td>${server.name}</td><td>${server.user_id}</td><td>${server.ram} MB</td><td>${server.disk} MB</td><td>${server.cpu}%</td><td>${actionButton}<button class="btn-delete" data-server-id="${server.id}">Delete</button></td>`;
            tableBody.appendChild(row);
        });
        addEventListenersToButtons();
    } catch (error) {
        console.error('Failed to fetch all servers data:', error);
        tableBody.innerHTML = `<tr><td colspan="7" style="color:var(--danger-color);">Error: ${error.message} Periksa API Key Anda.</td></tr>`;
    }
}

function updateServerPagination(pagination) {
    const paginationEl = document.getElementById('serverPagination');
    if (!paginationEl) return;
    paginationEl.innerHTML = `<button id="prevPageBtn" ${pagination.current_page === 1 ? 'disabled' : ''}>&laquo; Prev</button><span>Page ${pagination.current_page} of ${pagination.total_pages}</span><button id="nextPageBtn" ${pagination.current_page >= pagination.total_pages ? 'disabled' : ''}>Next &raquo;</button>`;
    const prevBtn = document.getElementById('prevPageBtn');
    if (prevBtn) prevBtn.addEventListener('click', () => fetchAllServersData(currentServerPage - 1));
    const nextBtn = document.getElementById('nextPageBtn');
    if (nextBtn) nextBtn.addEventListener('click', () => fetchAllServersData(currentServerPage + 1));
}

function addEventListenersToButtons() {
    document.querySelectorAll('.btn-save-role').forEach(button => {
        button.addEventListener('click', async (e) => {
            const username = e.target.dataset.username;
            const newRole = e.target.closest('tr').querySelector('.user-role-select').value;
            try {
                const response = await fetch('/api/admin/change-role', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, newRole }) });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message);
                iziToast.success({ title: 'Success', message: result.message, position: 'topRight' });
                fetchDashboardData();
            } catch (error) {
                iziToast.error({ title: 'Error', message: error.message, position: 'topRight' });
            }
        });
    });

    // PANGGILAN API DELETE USER YANG BARU
    document.querySelectorAll('.btn-delete[data-username]').forEach(button => {
        button.addEventListener('click', async (e) => {
            const username = e.target.dataset.username;
            if (confirm(`Are you sure you want to delete user "${username}"?`)) {
                try {
                    const response = await fetch('/api/admin/delete', { // <-- URL BARU
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ type: 'user', username: username }) // <-- BODY BARU
                    });
                    const result = await response.json();
                    if (!response.ok) throw new Error(result.message);
                    iziToast.success({ title: 'Success', message: result.message, position: 'topRight' });
                    fetchDashboardData();
                } catch (error) {
                    iziToast.error({ title: 'Error', message: error.message, position: 'topRight' });
                }
            }
        });
    });

    // PANGGILAN API DELETE SERVER YANG BARU
    document.querySelectorAll('.btn-delete[data-server-id]').forEach(button => {
        button.addEventListener('click', async (e) => {
            const serverId = e.target.dataset.serverId;
            if (confirm(`PERINGATAN: Anda akan menghapus server ID ${serverId} secara permanen dari Pterodactyl. Lanjutkan?`)) {
                try {
                    const response = await fetch('/api/admin/delete', { // <-- URL BARU
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ type: 'server', serverId: serverId }) // <-- BODY BARU
                    });
                    const result = await response.json();
                    if (!response.ok) throw new Error(result.message);
                    iziToast.success({ title: 'Success', message: result.message, position: 'topRight' });
                    fetchAllServersData(currentServerPage);
                } catch (error) {
                    iziToast.error({ title: 'Error', message: `Gagal hapus server: ${error.message}`, position: 'topRight' });
                }
            }
        });
    });

    document.querySelectorAll('.btn-suspend, .btn-unsuspend').forEach(button => {
        button.addEventListener('click', async (e) => {
            const serverId = e.target.dataset.serverId;
            const action = e.target.classList.contains('btn-suspend') ? 'suspend' : 'unsuspend';
            if (!confirm(`Are you sure you want to ${action} server ${serverId}?`)) return;
            try {
                const response = await fetch('/api/admin/server-action', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ serverId, action })
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message);
                iziToast.success({ title: 'Success', message: result.message, position: 'topRight' });
                fetchAllServersData(currentServerPage);
            } catch (error) {
                iziToast.error({ title: 'Error', message: `Gagal ${action} server: ${error.message}`, position: 'topRight' });
            }
        });
    });
}