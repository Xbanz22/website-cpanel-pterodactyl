document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('registerForm')) handleRegister();
    if (document.getElementById('loginForm')) handleLogin();
    if (document.getElementById('createPanelForm')) initCreatePanelPage();
    if (document.getElementById('panelListContainer')) initMyPanelsPage();
    if (document.getElementById('detailsGrid')) initPanelDetailsPage();
});

async function initMyPanelsPage() {
    displayUserInfo();
    const container = document.getElementById('panelListContainer');
    const loggedInUser = sessionStorage.getItem('loggedInUser');
    if (!loggedInUser) { window.location.href = 'login.html'; return; }

    try {
        const response = await fetch('/api/user-panels', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: loggedInUser }) });
        const panels = await response.json();
        if (!response.ok) throw new Error(panels.message);

        container.innerHTML = '';
        if (panels.length === 0) { container.innerHTML = '<p style="text-align: center;">Anda belum pernah membuat panel.</p>'; return; }

        const panelList = document.createElement('ul');
        panelList.className = 'panel-list';
        panels.forEach((panel, index) => {
            const listItem = document.createElement('li');
            listItem.className = 'panel-list-item';
            listItem.innerHTML = `<a href="panel-details.html?index=${index}"><div class="panel-info"><span class="panel-number">${index + 1}</span><span class="panel-name">${panel.server_name}</span></div><span class="panel-date">${new Date(panel.createdAt).toLocaleDateString('id-ID')}</span></a>`;
            panelList.appendChild(listItem);
        });
        container.appendChild(panelList);

    } catch (error) {
        container.innerHTML = `<p style="color:red; text-align:center;">Error: ${error.message}</p>`;
    }
}

async function initPanelDetailsPage() {
    displayUserInfo();
    const loggedInUser = sessionStorage.getItem('loggedInUser');
    if (!loggedInUser) { window.location.href = 'login.html'; return; }

    const urlParams = new URLSearchParams(window.location.search);
    const panelIndex = urlParams.get('index');
    if (panelIndex === null) {
        document.getElementById('detailsGrid').innerHTML = '<p style="color:red; text-align:center;">Panel tidak ditemukan.</p>';
        return;
    }

    try {
        const response = await fetch('/api/user-panels', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: loggedInUser }) });
        const panels = await response.json();
        if (!response.ok) throw new Error(panels.message);

        const panel = panels[panelIndex];
        if (!panel) throw new Error("Panel tidak valid.");

        const pteroConfigResponse = await fetch('/api/admin/manage-config');
        const pteroConfig = await pteroConfigResponse.json();
        const domainPanel = pteroConfig.ptero_domain || "Link tidak tersedia";

        document.getElementById('detailServerName').textContent = panel.server_name;
        document.getElementById('detailDomainPanel').innerHTML = `<a href="${domainPanel}" target="_blank" style="color: var(--primary-color);">${domainPanel}</a>`;
        document.getElementById('detailServerId').textContent = panel.server_id;
        document.getElementById('detailPlan').textContent = panel.plan.toUpperCase();
        document.getElementById('detailUsername').textContent = panel.username;
        document.getElementById('detailPassword').textContent = panel.password;
        document.getElementById('detailCreatedDate').textContent = new Date(panel.createdAt).toLocaleString('id-ID');
        
        document.querySelectorAll('.copy-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const targetId = e.currentTarget.dataset.copyTarget;
                const textToCopy = document.getElementById(targetId).textContent;
                navigator.clipboard.writeText(textToCopy).then(() => {
                    iziToast.success({ title: 'Copied!', message: 'Berhasil disalin.', position: 'topRight', timeout: 2000 });
                });
            });
        });

        const deleteButton = document.getElementById('deletePanelButton');
        deleteButton.addEventListener('click', async () => {
            if (!confirm(`Anda yakin ingin menghapus "${panel.server_name}" secara permanen? Aksi ini tidak dapat dibatalkan.`)) return;
            deleteButton.textContent = 'Menghapus...';
            deleteButton.disabled = true;
            try {
                const deleteResponse = await fetch('/api/admin/delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: 'user-delete-panel', loggedInUser: loggedInUser, serverId: panel.server_id, panelIndex: panelIndex })
                });
                const result = await deleteResponse.json();
                if (!deleteResponse.ok) throw new Error(result.message);
                iziToast.success({ title: 'Berhasil', message: result.message, position: 'topRight', onClosed: () => { window.location.href = 'my-panels.html'; } });
            } catch (error) {
                iziToast.error({ title: 'Error', message: error.message, position: 'topRight' });
                deleteButton.textContent = 'Hapus Panel Ini';
                deleteButton.disabled = false;
            }
        });

    } catch (error) {
        iziToast.error({ title: 'Error', message: `Gagal memuat detail panel: ${error.message}`, position: 'topRight' });
    }
}

function displayUserInfo() {
    const header = document.getElementById('userHeader');
    if (!header) return;
    const usernameEl = document.getElementById('headerUsername');
    const roleEl = document.getElementById('headerRole');
    const logoutBtn = document.getElementById('logoutButton');
    const loggedInUser = sessionStorage.getItem('loggedInUser');
    const userRole = sessionStorage.getItem('userRole');
    if (loggedInUser && userRole) {
        usernameEl.textContent = loggedInUser;
        roleEl.textContent = userRole;
        roleEl.className = `role-badge role-${userRole}`;
        header.style.display = 'flex';
        logoutBtn.addEventListener('click', () => { sessionStorage.clear(); window.location.href = 'login.html'; });
    }
}

function initCreatePanelPage() {
    displayUserInfo();
    handlePanelCreation();
    const userRole = sessionStorage.getItem('userRole');
    const planSelect = document.getElementById('plan');
    const planInfo = document.getElementById('planInfo');
    if (userRole === 'free') {
        planSelect.value = '1gb';
        planSelect.disabled = true;
        planInfo.textContent = "Sebagai Free User, Anda hanya dapat membuat panel 1GB.";
    } else {
        planSelect.disabled = false;
        planInfo.textContent = "";
    }
    if (userRole === 'admin') {
        document.getElementById('adminOptions').style.display = 'flex';
    }
}

function handleLogin() {
    const form = document.getElementById('loginForm');
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        const button = form.querySelector('button'); button.disabled = true; button.textContent = 'Logging In...';
        const formData = { username: form.username.value, password: form.password.value };
        try {
            const response = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
            const result = await response.json(); if (!response.ok) throw new Error(result.message);
            sessionStorage.setItem('loggedInUser', formData.username);
            sessionStorage.setItem('userRole', result.role);
            iziToast.success({ title: 'Success', message: result.message, position: 'topRight', timeout: 1500, onClosed: function () { window.location.href = 'create-panel.html'; } });
        } catch (error) {
            iziToast.error({ title: 'Error', message: error.message, position: 'topRight' });
            button.disabled = false; button.textContent = 'Login';
        }
    });
}

function handleRegister() {
    const form = document.getElementById('registerForm');
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        const button = form.querySelector('button'); button.disabled = true; button.textContent = 'Mendaftar...';
        const formData = { username: form.username.value, email: form.email.value, password: form.password.value };
        try {
            const response = await fetch('/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
            const result = await response.json(); if (!response.ok) throw new Error(result.message);
            iziToast.success({ title: 'Success', message: result.message, position: 'topRight', timeout: 1500, onClosed: function() { window.location.href = 'login.html'; } });
        } catch (error) {
            iziToast.error({ title: 'Error', message: error.message, position: 'topRight' });
            button.disabled = false; button.textContent = 'Daftar';
        }
    });
}

function handlePanelCreation() {
    const form = document.getElementById('createPanelForm');
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        const isAdminPanelCheckbox = form.querySelector('#isAdminPanel');
        const panelRequestData = {
            panelUsername: form.panelUsername.value.toLowerCase().trim(),
            email: form.email.value.trim(),
            plan: form.plan.value,
            isAdminPanel: isAdminPanelCheckbox ? isAdminPanelCheckbox.checked : false,
            loggedInUser: sessionStorage.getItem('loggedInUser')
        };
        sessionStorage.setItem('panelRequestData', JSON.stringify(panelRequestData));
        window.location.href = 'panel-data.html';
    });
}