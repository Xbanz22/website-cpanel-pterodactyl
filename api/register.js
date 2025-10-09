import { kv } from '@vercel/kv';
import bcrypt from 'bcryptjs';

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Method Not Allowed' });
    }
    try {
        const { username, email, password } = request.body;
        if (!username || !email || !password) {
            return response.status(400).json({ message: 'Username, email, dan password diperlukan.' });
        }

        const existingUser = await kv.get(`user:${username}`);
        if (existingUser) {
            return response.status(409).json({ message: 'Username sudah digunakan.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Buat objek user baru DENGAN ROLE
        const newUser = { 
            username, 
            email, 
            password: hashedPassword,
            role: 'free'
        };
        
        // Simpan objek langsung ke KV
        await kv.set(`user:${username}`, newUser);
        
        return response.status(201).json({ message: 'Registrasi berhasil!' });

    } catch (error) {
        console.error("Register Error:", error);
        return response.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
}