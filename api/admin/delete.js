import { kv } from '@vercel/kv';

/**
 * Fungsi untuk menghapus user dari database website (Vercel KV).
 */
async function deleteWebsiteUser(username) {
    if (!username) {
        throw new Error("Username is required to delete a user.");
    }
    await kv.del(`user:${username}`);
    return `User "${username}" berhasil dihapus dari website.`;
}

/**
 * Fungsi untuk menghapus server dari Pterodactyl.
 */
async function deletePterodactylServer(serverId) {
    if (!serverId) {
        throw new Error("Server ID is required to delete a server.");
    }
    
    // Ambil konfigurasi Pterodactyl dari database KV
    const pteroConfig = await kv.get('config:pterodactyl');
    const { domain, adminApiKey } = pteroConfig || {};

    if (!domain || !adminApiKey) {
        throw new Error("Konfigurasi Pterodactyl belum diatur di dashboard admin.");
    }

    // Kirim permintaan DELETE ke Pterodactyl API
    const pteroResponse = await fetch(`${domain}/api/application/servers/${serverId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${adminApiKey}`,
            'Accept': 'application/json'
        }
    });

    // Pterodactyl mengembalikan status 204 No Content jika berhasil
    if (pteroResponse.status !== 204) {
        throw new Error(`Gagal menghapus server dari Pterodactyl. Status: ${pteroResponse.status}`);
    }
    return `Server ID ${serverId} berhasil dihapus dari Pterodactyl.`;
}

/**
 * Handler utama yang akan dipanggil oleh frontend.
 * Akan memilih fungsi mana yang dijalankan berdasarkan 'type'.
 */
export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).end(); // Method Not Allowed
    }

    try {
        const { type, username, serverId } = request.body;
        let message = "";

        if (type === 'user') {
            message = await deleteWebsiteUser(username);
        } else if (type === 'server') {
            message = await deletePterodactylServer(serverId);
        } else {
            return response.status(400).json({ message: "Tipe delete tidak valid. Harus 'user' atau 'server'." });
        }

        return response.status(200).json({ message });

    } catch (error) {
        console.error("Delete Action Error:", error);
        return response.status(500).json({ message: error.message });
    }
}
