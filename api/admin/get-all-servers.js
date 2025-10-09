export default async function handler(request, response) {
    const { PTERO_DOMAIN, PTERO_ADMIN_API_KEY } = process.env;

    if (!PTERO_DOMAIN || !PTERO_ADMIN_API_KEY) {
        return response.status(500).json({ message: "Konfigurasi Pterodactyl di Environment Variables belum lengkap." });
    }

    try {
        // Pterodactyl API mungkin membatasi hasil per halaman, jadi kita minta halaman yang besar
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

        // Kirim data server dan jumlah totalnya
        return response.status(200).json({
            totalServers: data.meta.pagination.total,
            servers: data.data.map(srv => ({ // Proses data agar lebih ringkas
                name: srv.attributes.name,
                user_id: srv.attributes.user,
                ram: srv.attributes.limits.memory,
                disk: srv.attributes.limits.disk,
                cpu: srv.attributes.limits.cpu,
            }))
        });

    } catch (error) {
        console.error("Get All Servers Error:", error);
        return response.status(500).json({ message: error.message });
    }
}