import { kv } from '@vercel/kv';
import bcrypt from 'bcryptjs';

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Method Not Allowed' });
    }
    try {
        const { username, email, password } = request.body;
        if (!username || !email || !password) {
            return response.status(400).json({ message: 'Username, email, and password are required.' });
        }

        const existingUser = await kv.get(`user:${username}`);
        if (existingUser) {
            return response.status(409).json({ message: 'Username already exists.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        const newAdmin = { 
            username, 
            email, 
            password: hashedPassword,
            role: 'admin' // Langsung set role sebagai admin
        };
        
        await kv.set(`user:${username}`, newAdmin);
        
        return response.status(201).json({ message: `Admin user "${username}" created successfully!` });

    } catch (error) {
        console.error("Create Admin Error:", error);
        return response.status(500).json({ message: 'Failed to create admin user.' });
    }
}