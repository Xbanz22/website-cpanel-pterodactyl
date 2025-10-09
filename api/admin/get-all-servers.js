export default async function handler(request, response) {
    // 1. Ambil konfigurasi rahasia dari Environment Variables
    const { PTERO_DOMAIN, PTERO_ADMIN_API_KEY } = process.env;

    if (!PTERO_DOMAIN || !PTERO_ADMIN_API_KEY) {
        return response.status(500).json({ message: "Konfigurasi Pterodactyl di Environment Variables belum lengkap." });
    }

    try {
        // 2. Minta daftar semua server ke Pterodactyl API
        // Kita minta 'per_page=1000' untuk mengambil sebanyak mungkin dalam satu panggilan
        const pteroResponse = await fetch(`${PTERO_DOMAIN}/api/application/servers?per_page=1000`, {
            headers: {
                'Authorization': `Bearer ${PTERO_ADMIN_API_KEY}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        if (!pteroResponse.ok) {
            throw new Error(`Pterodactyl API merespon dengan status ${pteroResponse.status}`);
        }

        const data = await pteroResponse.json();

        // 3. Proses data dan kirim kembali ke frontend
        return response.status(200).json({
            totalServers: data.meta.pagination.total,
            servers: data.data.map(srv => ({ // Ambil hanya data yang kita perlukan
                name: srv.attributes.name,
                user_id: srv.attributes.user,
                ram: srv.attributes.limits.memory,
                disk: srv.attributes.limits.disk,
                cpu: srv.attributes.limits.cpu,
                suspended: srv.attributes.suspended // <-- INI YANG PALING PENTING!
            }))
        });

    } catch (error)
        console.error("Get All Servers Error:", error);
        return response.status(500).json({ message: error.message });
    }
}