document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('registerForm')) handleRegister();
    if (document.getElementById('loginForm')) handleLogin();
    if (document.getElementById('createPanelForm')) {
        handlePanelCreation();
        initCreatePanelPage();
    }
    if (document.getElementById('panelListContainer')) {
        initMyPanelsPage();
    }
});

async function initMyPanelsPage() {
    displayUserInfo();
    const container = document.getElementById('panelListContainer');
    const loggedInUser = sessionStorage.getItem('loggedInUser');
    if (!loggedInUser) {
        window.location.href = 'login.html';
        return;
    }
    try {
        const response = await fetch('/api/user-panels', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: loggedInUser })
        });
        const panels = await response.json();
        if (!response.ok) throw new Error(panels.message);
        container.innerHTML = '';
        if (panels.length === 0) {
            container.innerHTML = '<p style="text-align: center;">Anda belum pernah membuat panel.</p>';
            return;
        }
        panels.forEach(panel => {
            const panelCard = document.createElement('div');
            panelCard.className = 'data-item full-width';
            panelCard.style.marginBottom = '15px';
            panelCard.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <strong>${panel.server_name}</strong>
                    <span style="font-size: 0.8rem;">${new Date(panel.createdAt).toLocaleDateString('id-ID')}</span>
                </div>
                <div class="data-grid">
                    <div class="data-item"><span>Username</span><strong>${panel.username}</strong></div>
                    <div class="data-item"><span>Password</span><strong>${panel.password}</strong></div>
                </div>
            `;
            container.appendChild(panelCard);
        });
    } catch (error) {
        container.innerHTML = `<p style="color:red; text-align:center;">Error: ${error.message}</p>`;
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
        logoutBtn.addEventListener('click', () => {
            sessionStorage.clear();
            window.location.href = 'login.html';
        });
    }
}

function initCreatePanelPage() {
    displayUserInfo();
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
        const button = form.querySelector('button');
        button.disabled = true; button.textContent = 'Logging In...';
        const formData = { username: form.username.value, password: form.password.value };
        try {
            const response = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            iziToast.success({ title: 'Success', message: result.message, position: 'topRight' });
            sessionStorage.setItem('loggedInUser', formData.username);
            sessionStorage.setItem('userRole', result.role);
            setTimeout(() => { window.location.href = 'create-panel.html'; }, 1000);
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
        const button = form.querySelector('button');
        button.disabled = true; button.textContent = 'Mendaftar...';
        const formData = { username: form.username.value, email: form.email.value, password: form.password.value };
        try {
            const response = await fetch('/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            iziToast.success({ title: 'Success', message: result.message, position: 'topRight' });
            setTimeout(() => { window.location.href = 'login.html'; }, 1000);
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