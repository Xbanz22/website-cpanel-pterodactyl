import { kv } from '@vercel/kv';

// Kunci unik untuk menyimpan semua konfigurasi di database
const CONFIG_KEY = 'config:pterodactyl';

export default async function handler(request, response) {
    // Fitur ini hanya bisa diakses dengan metode POST (menyimpan) dan GET (mengambil)
    if (request.method === 'POST') {
        // --- BAGIAN MENYIMPAN KONFIGURASI BARU ---
        try {
            const { ptero_domain, ptero_admin_api_key, ptero_client_api_key } = request.body;
            
            // 1. Ambil konfigurasi yang sudah ada (jika ada)
            const existingConfig = await kv.get(CONFIG_KEY) || {};

            // 2. Gabungkan/timpa dengan data baru yang diinput.
            // Jika input kosong, gunakan nilai yang sudah ada.
            const newConfig = {
                domain: ptero_domain || existingConfig.domain,
                adminApiKey: ptero_admin_api_key || existingConfig.adminApiKey,
                clientApiKey: ptero_client_api_key || existingConfig.clientApiKey,
            };

            // 3. Simpan konfigurasi yang sudah diperbarui ke Vercel KV
            await kv.set(CONFIG_KEY, newConfig);

            return response.status(200).json({ message: "Konfigurasi berhasil disimpan dan langsung aktif!" });

        } catch (error) {
            console.error("Save Config Error:", error);
            return response.status(500).json({ message: error.message });
        }
    } 
    else if (request.method === 'GET') {
        // --- BAGIAN MENGAMBIL KONFIGURASI SAAT INI (UNTUK DITAMPILKAN DI FORM) ---
        try {
            const config = await kv.get(CONFIG_KEY);
            // Kirim kembali hanya domain, jangan pernah mengirim API key ke frontend demi keamanan
            return response.status(200).json({
                ptero_domain: config?.domain || ''
            });
        } catch (error) {
            console.error("Get Config Error:", error);
            return response.status(500).json({ message: error.message });
        }
    }

    // Jika metode bukan GET atau POST, tolak permintaan
    return response.status(405).end();
}