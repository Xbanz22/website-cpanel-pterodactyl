import { kv } from '@vercel/kv';

export default async function handler(request, response) {
    try {
        // kv.scan('user:*') mengambil semua kunci yang cocok dengan pola 'user:'
        const userKeys = [];
        for await (const key of kv.scanIterator({ match: 'user:*' })) {
            userKeys.push(key);
        }

        if (userKeys.length === 0) {
            return response.status(200).json({ totalUsers: 0, users: [] });
        }

        // kv.mget() mengambil semua data dari kunci yang diberikan dalam satu panggilan
        const users = await kv.mget(...userKeys);

        // Menghapus data sensitif seperti password hash sebelum dikirim
        const sanitizedUsers = users.map(user => ({
            username: user.username,
            email: user.email,
        }));

        return response.status(200).json({
            totalUsers: sanitizedUsers.length,
            users: sanitizedUsers
        });
    } catch (error) {
        console.error("Dashboard data error:", error);
        return response.status(500).json({ message: "Failed to fetch dashboard data." });
    }
}