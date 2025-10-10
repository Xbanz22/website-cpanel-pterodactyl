import { kv } from '@vercel/kv';

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).end();
    }

    const { serverId, action } = request.body;
    if (!serverId || !action) {
        return response.status(400).json({ message: "Server ID and action are required." });
    }
    if (!['suspend', 'unsuspend'].includes(action)) {
        return response.status(400).json({ message: "Invalid action." });
    }

    const pteroConfig = await kv.get('config:pterodactyl');
    const { domain, adminApiKey } = pteroConfig || {};

    if (!domain || !adminApiKey) {
        return response.status(500).json({ message: "Konfigurasi Pterodactyl belum diatur di dashboard admin." });
    }

    try {
        const pteroResponse = await fetch(`${domain}/api/application/servers/${serverId}/${action}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${adminApiKey}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        // Pterodactyl mengembalikan 204 No Content untuk suspend/unsuspend yang berhasil
        if (pteroResponse.status === 204 || pteroResponse.ok) {
            return response.status(200).json({ message: `Server ${serverId} berhasil di-${action}.` });
        } else {
            const errorData = await pteroResponse.json().catch(() => ({})); // Tangkap jika body bukan JSON
            throw new Error(errorData.errors?.[0]?.detail || `Gagal melakukan aksi '${action}' pada server.`);
        }
    } catch (error) {
        console.error(`Server Action [${action}] Error:`, error);
        return response.status(500).json({ message: error.message });
    }
}