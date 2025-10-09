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
        const userDataString = await kv.get(`user:${username}`);
        if (!userDataString) {
            return response.status(404).json({ message: 'Username atau password salah.' });
        }
        const user = JSON.parse(userDataString);
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return response.status(401).json({ message: 'Username atau password salah.' });
        }
        return response.status(200).json({ message: 'Login berhasil!' });
    } catch (error) {
        console.error(error);
        return response.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
}