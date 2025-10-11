import { kv } from '@vercel/kv';

async function deleteWebsiteUser(username) {
    if (!username) throw new Error("Username diperlukan.");
    await kv.del(`user:${username}`);
    return `User "${username}" berhasil dihapus.`;
}

async function deletePterodactylServerByAdmin(serverId) {
    if (!serverId) throw new Error("Server ID diperlukan.");
    const pteroConfig = await kv.get('config:pterodactyl');
    const { domain, adminApiKey } = pteroConfig || {};
    if (!domain || !adminApiKey) throw new Error("Konfigurasi Pterodactyl belum diatur.");
    const pteroResponse = await fetch(`${domain}/api/application/servers/${serverId}`, {
        method: 'DELETE', headers: { 'Authorization': `Bearer ${adminApiKey}` }
    });
    if (pteroResponse.status !== 204) throw new Error(`Gagal hapus server dari Pterodactyl. Status: ${pteroResponse.status}`);
    return `Server ID ${serverId} berhasil dihapus.`;
}

async function deletePterodactylServerByUser(loggedInUser, serverId, panelIndex) {
    if (!loggedInUser || !serverId || panelIndex === undefined) throw new Error("Informasi tidak lengkap.");
    const userPanels = await kv.lrange(`panels:${loggedInUser}`, 0, -1);
    const panelToDelete = userPanels[panelIndex];
    if (!panelToDelete || panelToDelete.server_id.toString() !== serverId.toString()) {
        throw new Error("Akses ditolak. Anda tidak berhak menghapus panel ini.");
    }
    await deletePterodactylServerByAdmin(serverId);
    await kv.lrem(`panels:${loggedInUser}`, 1, panelToDelete);
    return `Panel "${panelToDelete.server_name}" berhasil dihapus.`;
}

export default async function handler(request, response) {
    if (request.method !== 'POST') return response.status(405).end();
    try {
        const { type, username, serverId, loggedInUser, panelIndex } = request.body;
        let message = "";
        switch (type) {
            case 'admin-delete-user':
                message = await deleteWebsiteUser(username);
                break;
            case 'admin-delete-server':
                message = await deletePterodactylServerByAdmin(serverId);
                break;
            case 'user-delete-panel':
                message = await deletePterodactylServerByUser(loggedInUser, serverId, panelIndex);
                break;
            default:
                return response.status(400).json({ message: "Tipe delete tidak valid." });
        }
        return response.status(200).json({ message });
    } catch (error) {
        console.error("Delete Action Error:", error);
        return response.status(500).json({ message: error.message });
    }
} 