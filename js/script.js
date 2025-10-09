
// Menentukan fungsi mana yang dijalankan berdasarkan halaman
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('registerForm')) handleRegister();
    if (document.getElementById('loginForm')) handleLogin();
    if (document.getElementById('createPanelForm')) {
        handlePanelCreation();
        initCreatePanelPage(); // PANGGIL FUNGSI BARU UNTUK KUNCI FORM
    }
    if (document.getElementById('loading')) createPanelAndShowData();
});

// FUNGSI BARU UNTUK MENGATUR HALAMAN PEMBUATAN PANEL
function initCreatePanelPage() {
    const userRole = sessionStorage.getItem('userRole');
    const planSelect = document.getElementById('plan');

    if (userRole === 'free') {
        planSelect.value = '1gb'; // Set nilainya ke 1GB
        planSelect.disabled = true; // Kunci dropdown-nya!

        // Tambahkan pesan kecil di bawah dropdown
        const infoText = document.createElement('p');
        infoText.textContent = "Sebagai Free User, Anda hanya bisa membuat panel 1GB.";
        infoText.style.fontSize = '12px';
        infoText.style.marginTop = '-10px';
        infoText.style.textAlign = 'center';
        infoText.style.color = '#777';
        planSelect.parentElement.appendChild(infoText);
    }
}

// FUNGSI UNTUK MENANGANI LOGIN (DIPERBARUI)
function handleLogin() {
    const form = document.getElementById('loginForm');
    const button = form.querySelector('button');

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        button.disabled = true;
        button.textContent = 'Logging In...';

        const formData = { username: form.username.value, password: form.password.value };

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);

            alert(result.message + ' Anda akan diarahkan ke halaman pembuatan panel.');
            
            // SIMPAN USERNAME DAN ROLE
            sessionStorage.setItem('loggedInUser', formData.username);
            sessionStorage.setItem('userRole', result.role); // <-- SIMPAN ROLE DARI API
            
            window.location.href = 'create-panel.html';

        } catch (error) {
            alert('Error: ' + error.message);
        } finally {
            button.disabled = false;
            button.textContent = 'Login';
        }
    });
}

// --- FUNGSI LAINNYA (TIDAK BERUBAH) ---

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

function createPanelAndShowData() {
    const loadingDiv = document.getElementById('loading');
    const panelDataDiv = document.getElementById('panelData');
    if (!loadingDiv) return;
    const panelRequestData = JSON.parse(sessionStorage.getItem('panelRequestData'));
    if (!panelRequestData) {
        loadingDiv.innerHTML = "<p>Data permintaan tidak ditemukan. Silakan kembali.</p>";
        return;
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