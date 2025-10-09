export default async function handler(request, response) {
    const { PTERO_DOMAIN, PTERO_ADMIN_API_KEY, PTERO_CLIENT_API_KEY } = process.env;

    if (!PTERO_DOMAIN || !PTERO_ADMIN_API_KEY) {
        return response.status(500).json({ message: "PTERO_DOMAIN atau PTERO_ADMIN_API_KEY belum diatur di Vercel." });
    }

    try {
        const page = request.query.page || '1';
        const pteroResponse = await fetch(`${PTERO_DOMAIN}/api/application/servers?page=${page}&include=user`, {
            headers: {
                'Authorization': `Bearer ${PTERO_ADMIN_API_KEY}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json' // Tambahkan ini untuk konsistensi
            },
        });

        if (!pteroResponse.ok) {
            // Jika gagal, coba baca teks error dari Pterodactyl
            const errorText = await pteroResponse.text();
            console.error("Pterodactyl API Error Response:", errorText); // Log ini akan muncul di Vercel
            throw new Error(`Pterodactyl API merespon dengan status ${pteroResponse.status}. Pastikan API Key dan Domain sudah benar.`);
        }
        
        const data = await pteroResponse.json();
        const servers = data.data;

        // Fungsi helper untuk status real-time
        async function getServerStatus(identifier) {
            if (!PTERO_CLIENT_API_KEY) return { text: "N/A", class: "other" }; // Jika client key tidak ada, jangan coba
            try {
                const res = await fetch(`${PTERO_DOMAIN}/api/client/servers/${identifier}/resources`, {
                    headers: { 'Authorization': `Bearer ${PTERO_CLIENT_API_KEY}`, 'Accept': 'application/json' },
                });
                if (!res.ok) return { text: "N/A", class: "other" };
                const resourceData = await res.json();
                const state = resourceData.attributes.current_state;
                if (state === "running") return { text: "Online", class: "active" };
                if (state === "offline") return { text: "Offline", class: "suspended" };
                if (state === "starting") return { text: "Starting", class: "warning" };
                return { text: state, class: "other" };
            } catch (e) {
                return { text: "N/A", class: "other" };
            }
        }
        
        const serversWithStatus = await Promise.all(servers.map(async (srv) => {
            const attr = srv.attributes;
            let status = attr.suspended ? { text: "Suspended", class: "suspended" } : await getServerStatus(attr.identifier);
            return {
                id: attr.id, name: attr.name, user_id: attr.user,
                ram: attr.limits.memory, disk: attr.limits.disk, cpu: attr.limits.cpu,
                status: status
            };
        }));

        return response.status(200).json({
            servers: serversWithStatus,
            pagination: data.meta.pagination
        });
    } catch (error) {
        console.error("Get All Servers Final Error:", error.message);
        return response.status(500).json({ message: error.message });
    }
}