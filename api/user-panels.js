import { kv } from '@vercel/kv';

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).end();
    }
    try {
        const { username } = request.body;
        if (!username) {
            return response.status(400).json({ message: "Username is required." });
        }

        // Ambil semua riwayat panel dari list di Vercel KV
        const panels = await kv.lrange(`panels:${username}`, 0, -1); // 0, -1 berarti ambil semua

        return response.status(200).json(panels);

    } catch (error) {
        console.error("Fetch User Panels Error:", error);
        return response.status(500).json({ message: "Failed to fetch user panels." });
    }
}