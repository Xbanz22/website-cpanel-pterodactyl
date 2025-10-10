/**
 * Fungsi helper untuk mengambil status real-time (Online/Offline) dari satu server.
 * Menggunakan Client API Key (capikey).
 */
async function getServerStatus(domain, capikey, identifier) {
    // Jika tidak ada Client API Key, kembalikan status tidak diketahui.
    if (!capikey) {
        return { text: "Unknown", class: "other" };
    }

    try {
        const res = await fetch(`${domain}/api/client/servers/${identifier}/resources`, {
            headers: {
                'Authorization': `Bearer ${capikey}`,
                'Accept': 'application/json',
            },
        });

        // Jika gagal mengambil status, kembalikan tidak diketahui.
        if (!res.ok) {
            return { text: "Unknown", class: "other" };
        }

        const data = await res.json();
        const state = data.attributes.current_state;

        // Tentukan status berdasarkan state dari Pterodactyl
        if (state === "running") return { text: "Online", class: "active" };
        if (state === "offline") return { text: "Offline", class: "suspended" };
        if (state === "starting") return { text: "Starting", class: "warning" };
        
        return { text: state, class: "other" };

    } catch (e) {
        // Jika terjadi error koneksi, kembalikan tidak diketahui.
        return { text: "Unknown", class: "other" };
    }
}

/**
 * Handler utama untuk mengambil daftar semua server.
 * Menggunakan Admin API Key (apikey).
 */
export default async function handler(request, response) {
    const { PTERO_DOMAIN, PTERO_ADMIN_API_KEY, PTERO_CLIENT_API_KEY } = process.env;

    try {
        // Pastikan konfigurasi utama ada
        if (!PTERO_DOMAIN || !PTERO_ADMIN_API_KEY) {
            throw new Error("Konfigurasi Admin API Pterodactyl belum lengkap di Environment Variables.");
        }

        // Ambil nomor halaman dari query URL, default ke halaman 1
        const page = request.query.page || '1';

        // Panggil Pterodactyl Application API untuk mendapatkan daftar server
        const pteroResponse = await fetch(`${PTERO_DOMAIN}/api/application/servers?page=${page}&include=user`, {
            headers: {
                'Authorization': `Bearer ${PTERO_ADMIN_API_KEY}`,
                'Accept': 'application/json',
            },
        });

        // Jika Pterodactyl merespon dengan error, tampilkan pesan yang jelas
        if (!pteroResponse.ok) {
            const errorText = await pteroResponse.text();
            console.error("Pterodactyl API Error:", errorText);
            throw new Error(`Pterodactyl API Error: Pastikan API Key dan Domain sudah benar. (${pteroResponse.status})`);
        }
        
        const data = await pteroResponse.json();
        const servers = data.data;

        // Untuk setiap server, ambil status real-time-nya
        const serversWithStatus = await Promise.all(servers.map(async (srv) => {
            const attr = srv.attributes;
            let status;

            // Jika server di-suspend, langsung beri status Suspended tanpa cek online/offline
            if (attr.suspended) {
                status = { text: "Suspended", class: "suspended" };
            } else {
                // Jika tidak suspended, cek status online/offline
                status = await getServerStatus(PTERO_DOMAIN, PTERO_CLIENT_API_KEY, attr.identifier);
            }

            return {
                id: attr.id,
                name: attr.name,
                user_id: attr.user,
                ram: attr.limits.memory,
                disk: attr.limits.disk,
                cpu: attr.limits.cpu,
                status: status
            };
        }));

        // Kirim data yang sudah lengkap ke frontend
        return response.status(200).json({
            servers: serversWithStatus,
            pagination: data.meta.pagination
        });

    } catch (error) {
        console.error("Get All Servers Error:", error);
        return response.status(500).json({ message: error.message });
    }
}