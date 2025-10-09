import { kv } from '@vercel/kv';

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { username } = request.body;
        if (!username) {
            return response.status(400).json({ message: "Username is required." });
        }

        // Hapus user dari database KV
        await kv.del(`user:${username}`);

        return response.status(200).json({ message: `User "${username}" successfully deleted.` });
    } catch (error) {
        console.error("Delete user error:", error);
        return response.status(500).json({ message: "Failed to delete user." });
    }
}