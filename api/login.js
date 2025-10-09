import { kv } from '@vercel/kv';
import bcrypt from 'bcryptjs';

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Method Not Allowed' });
    }
    try {
        const { username, password } = request.body;
        if (!username || !password) {
            return response.status(400).json({ message: 'Username dan password diperlukan.' });
        }

        // Ambil data langsung sebagai objek, tanpa perlu parsing
        const user = await kv.get(`user:${username}`);
        
        // Cek jika user tidak ada (null)
        if (!user) {
            return response.status(404).json({ message: 'Username atau password salah.' });
        }

        // Bandingkan password yang diinput dengan hash di database
        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (!isPasswordValid) {
            return response.status(401).json({ message: 'Username atau password salah.' });
        }
        
        return response.status(200).json({ message: 'Login berhasil!' });

    } catch (error) {
        console.error("Login Error:", error);
        return response.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
}