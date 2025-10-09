// Menentukan fungsi mana yang dijalankan berdasarkan halaman
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('registerForm')) {
        handleRegister();
    }
    if (document.getElementById('loginForm')) {
        handleLogin();
    }
    if (document.getElementById('createPanelForm')) {
        handlePanelCreation();
        initCreatePanelPage();
    }
    // Tidak ada lagi fungsi untuk panel-data.html di sini, karena JS-nya inline
});

/**
 * Menampilkan informasi user (username, role, tombol logout) di header.
 */
function displayUserInfo() {
    const header = document.getElementById('userHeader');
    const usernameEl = document.getElementById('headerUsername');
    const roleEl = document.getElementById('headerRole');
    const logoutBtn = document.getElementById('logoutButton');
    
    const loggedInUser = sessionStorage.getItem('loggedInUser');
    const userRole = sessionStorage.getItem('userRole');

    if (loggedInUser && userRole && header) {
        usernameEl.textContent = loggedInUser;
        roleEl.textContent = userRole;
        roleEl.className = `role-badge role-${userRole}`; // Terapkan class untuk styling
        header.style.display = 'flex';

        logoutBtn.addEventListener('click', () => {
            sessionStorage.clear();
            window.location.href = 'login.html';
        });
    }
}

/**
 * Mengatur halaman pembuatan panel, seperti mengunci pilihan paket untuk free user.
 */
function initCreatePanelPage() {
    displayUserInfo(); // Tampilkan header user
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
}

/**
 * Menangani form login user, termasuk menyimpan role.
 */
function handleLogin() {
    const form = document.getElementById('loginForm');
    const button = form.querySelector('button');
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        button.disabled = true;
        button.textContent = 'Logging In...';
        const formData = {
            username: form.username.value,
            password: form.password.value
        };
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);

            alert(result.message + ' Anda akan diarahkan ke halaman pembuatan panel.');
            sessionStorage.setItem('loggedInUser', formData.username);
            sessionStorage.setItem('userRole', result.role); // Simpan role dari API
            window.location.href = 'create-panel.html';
        } catch (error) {
            alert('Error: ' + error.message);
        } finally {
            button.disabled = false;
            button.textContent = 'Login';
        }
    });
}

/**
 * Menangani form registrasi user.
 */
function handleRegister() {
    const form = document.getElementById('registerForm');
    const button = form.querySelector('button');
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        button.disabled = true;
        button.textContent = 'Mendaftar...';
        const formData = {
            username: form.username.value,
            email: form.email.value,
            password: form.password.value
        };
        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            alert(result.message + ' Anda akan diarahkan ke halaman login.');
            window.location.href = 'login.html';
        } catch (error) {
            alert('Error: ' + error.message);
        } finally {
            button.disabled = false;
            button.textContent = 'Daftar';
        }
    });
}

/**
 * Menangani form pembuatan panel.
 */
function handlePanelCreation() {
    const form = document.getElementById('createPanelForm');
    if (!form) return;
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        const panelRequestData = {
            panelUsername: form.panelUsername.value.toLowerCase().trim(),
            email: form.email.value.trim(),
            plan: form.plan.value,
            loggedInUser: sessionStorage.getItem('loggedInUser')
        };
        sessionStorage.setItem('panelRequestData', JSON.stringify(panelRequestData));
        window.location.href = 'panel-data.html';
    });
}