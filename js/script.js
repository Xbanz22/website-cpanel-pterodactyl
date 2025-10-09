// Cek di halaman mana kita berada dan jalankan fungsi yang sesuai
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('registerForm')) handleRegister();
    if (document.getElementById('loginForm')) handleLogin();
    if (document.getElementById('createPanelForm')) handlePanelCreation();
    if (document.getElementById('loading')) createPanelAndShowData();
});

// Fungsi untuk menangani registrasi user
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
            password: form.password.value,
        };

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
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

// Fungsi untuk menangani login user
function handleLogin() {
    const form = document.getElementById('loginForm');
    const button = form.querySelector('button');

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        button.disabled = true;
        button.textContent = 'Logging In...';

        const formData = {
            username: form.username.value,
            password: form.password.value,
        };

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);

            alert(result.message + ' Anda akan diarahkan ke halaman pembuatan panel.');
            sessionStorage.setItem('loggedInUser', formData.username);
            window.location.href = 'create-panel.html';

        } catch (error) {
            alert('Error: ' + error.message);
        } finally {
            button.disabled = false;
            button.textContent = 'Login';
        }
    });
}

// Fungsi untuk menangani form pembuatan panel
function handlePanelCreation() {
    const form = document.getElementById('createPanelForm');
    if (!form) return;

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const panelRequestData = {
            username: form.panelUsername.value.toLowerCase().trim(),
            email: form.email.value.trim(),
            plan: form.plan.value
        };
        // Simpan data form untuk digunakan di halaman berikutnya
        sessionStorage.setItem('panelRequestData', JSON.stringify(panelRequestData));
        
        // Pindah ke halaman loading/data
        window.location.href = 'panel-data.html';
    });
}

// Fungsi untuk memanggil backend dan menampilkan data panel
function createPanelAndShowData() {
    const loadingDiv = document.getElementById('loading');
    const panelDataDiv = document.getElementById('panelData');
    if (!loadingDiv) return;

    const panelRequestData = JSON.parse(sessionStorage.getItem('panelRequestData'));

    if (!panelRequestData) {
        loadingDiv.innerHTML = "<p>Data permintaan tidak ditemukan. Silakan kembali.</p>";
        return;
    }

    // Fungsi async untuk berkomunikasi dengan API backend
    async function executePanelCreation() {
        try {
            const response = await fetch('/api/create-server', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(panelRequestData)
            });
            
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            
            // Jika sukses, isi data ke elemen HTML
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
            // Jika gagal, tampilkan pesan error
            loadingDiv.innerHTML = `<p style="color: red; font-weight: bold;">Terjadi Kesalahan:</p><p>${error.message}</p>`;
        }
    }

    // Jalankan fungsi pembuatan panel
    executePanelCreation();
}