import { kv } from '@vercel/kv';

async function getServerStatus(domain, capikey, identifier) {
    if (!capikey) return { text: "Unknown", class: "other" };
    try {
        const res = await fetch(`${domain}/api/client/servers/${identifier}/resources`, {
            headers: { 'Authorization': `Bearer ${capikey}`, 'Accept': 'application/json' },
        });
        if (!res.ok) return { text: "Unknown", class: "other" };
        const data = await res.json();
        const state = data.attributes.current_state;
        if (state === "running") return { text: "Online", class: "active" };
        if (state === "offline") return { text: "Offline", class: "suspended" };
        if (state === "starting") return { text: "Starting", class: "warning" };
        return { text: state, class: "other" };
    } catch (e) {
        return { text: "Unknown", class: "other" };
    }
}

export default async function handler(request, response) {
    // === BAGIAN YANG DIUBAH ===
    const pteroConfig = await kv.get('config:pterodactyl');
    const PTERO_DOMAIN = pteroConfig?.domain;
    const PTERO_ADMIN_API_KEY = pteroConfig?.adminApiKey;
    const PTERO_CLIENT_API_KEY = pteroConfig?.clientApiKey;
    // ==========================

    try {
        if (!PTERO_DOMAIN || !PTERO_ADMIN_API_KEY) {
            throw new Error("Konfigurasi Pterodactyl (Domain/Admin API Key) belum diatur di dashboard admin.");
        }

        const page = request.query.page || '1';
        const pteroResponse = await fetch(`${PTERO_DOMAIN}/api/application/servers?page=${page}&include=user`, {
            headers: { 'Authorization': `Bearer ${PTERO_ADMIN_API_KEY}`, 'Accept': 'application/json' },
        });

        if (!pteroResponse.ok) {
            const errorText = await pteroResponse.text();
            throw new Error(`Pterodactyl API Error: ${errorText}`);
        }
        
        const data = await pteroResponse.json();
        const servers = data.data;

        const serversWithStatus = await Promise.all(servers.map(async (srv) => {
            const attr = srv.attributes;
            let status;
            if (attr.suspended) {
                status = { text: "Suspended", class: "suspended" };
            } else {
                status = await getServerStatus(PTERO_DOMAIN, PTERO_CLIENT_API_KEY, attr.identifier);
            }
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
        console.error("Get All Servers Error:", error);
        return response.status(500).json({ message: error.message });
    }
}