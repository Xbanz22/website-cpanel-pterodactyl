// Menentukan fungsi mana yang dijalankan berdasarkan halaman
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('registerForm')) handleRegister();
    if (document.getElementById('loginForm')) handleLogin();
    if (document.getElementById('createPanelForm')) {
        handlePanelCreation();
        initCreatePanelPage(); // Panggil fungsi baru untuk kunci form
    }
    if (document.getElementById('loading')) createPanelAndShowData();
});

// Fungsi baru untuk mengatur halaman pembuatan panel
function initCreatePanelPage() {
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

// Fungsi untuk menangani login (diperbarui untuk menyimpan role)
function handleLogin() {
    const form = document.getElementById('loginForm');
    const button = form.querySelector('button');
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        button.disabled = true; button.textContent = 'Logging In...';
        const formData = { username: form.username.value, password: form.password.value };
        try {
            const response = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            alert(result.message + ' Anda akan diarahkan ke halaman pembuatan panel.');
            sessionStorage.setItem('loggedInUser', formData.username);
            sessionStorage.setItem('userRole', result.role); // Simpan role dari API
            window.location.href = 'create-panel.html';
        } catch (error) {
            alert('Error: ' + error.message);
        } finally {
            button.disabled = false; button.textContent = 'Login';
        }
    });
}

// Fungsi untuk menangani registrasi (tidak berubah)
function handleRegister() {
    const form = document.getElementById('registerForm');
    const button = form.querySelector('button');
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        button.disabled = true; button.textContent = 'Mendaftar...';
        const formData = { username: form.username.value, email: form.email.value, password: form.password.value };
        try {
            const response = await fetch('/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            alert(result.message + ' Anda akan diarahkan ke halaman login.');
            window.location.href = 'login.html';
        } catch (error) {
            alert('Error: ' + error.message);
        } finally {
            button.disabled = false; button.textContent = 'Daftar';
        }
    });
}

// Fungsi untuk menangani form pembuatan panel (tidak berubah)
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

// Fungsi untuk memanggil backend dan menampilkan hasil (tidak berubah)
function createPanelAndShowData() {
    const loadingDiv = document.getElementById('loading');
    const panelDataDiv = document.getElementById('panelData');
    if (!loadingDiv) return;
    const panelRequestData = JSON.parse(sessionStorage.getItem('panelRequestData'));
    if (!panelRequestData) {
        loadingDiv.innerHTML = "<p>Data permintaan tidak ditemukan. Silakan kembali.</p>"; return;
    }
    async function executePanelCreation() {
        try {
            const response = await fetch('/api/create-server', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(panelRequestData) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            loadingDiv.style.display = 'none';
            document.getElementById('dataUsername').textContent = result.username;
            document.getElementById('dataPassword').textContent = result.password;
            document.getElementById('dataEmail').textContent = result.email;
            document.getElementById('dataRam').textContent = result.ram;
            document.getElementById('dataDisk').textContent = result.disk;
            document.getElementById('dataCpu').textContent = result.cpu;
            const linkElement = document.getElementById('dataLink');
            linkElement.href = result.domain;
            linkElement.textContent = result.domain;
            panelDataDiv.style.display = 'block';
        } catch (error) {
            loadingDiv.innerHTML = `<p style="color: red; font-weight: bold;">Terjadi Kesalahan:</p><p>${error.message}</p>`;
        }
    }
    executePanelCreation();
}