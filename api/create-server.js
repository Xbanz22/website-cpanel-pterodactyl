import { kv } from '@vercel/kv';

// Fungsi helper (sama seperti sebelumnya)
function capital(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function normalizeDomain(domain) {
  if (!domain) throw new Error("Domain tidak boleh kosong");
  domain = domain.replace(/\/$/, "");
  if (!/^https?:\/\//i.test(domain)) {
    domain = "https://" + domain;
  }
  return domain;
}

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        // === 1. AMBIL KONFIGURASI DARI ENVIRONMENT VARIABLES ===
        const {
            PTERO_DOMAIN,
            PTERO_ADMIN_API_KEY,
            PTERO_EGG_ID,
            PTERO_NEST_ID,
            PTERO_LOCATION_ID
        } = process.env;

        if (!PTERO_DOMAIN || !PTERO_ADMIN_API_KEY || !PTERO_EGG_ID || !PTERO_NEST_ID || !PTERO_LOCATION_ID) {
            throw new Error("Konfigurasi panel di Vercel Environment Variables belum lengkap.");
        }

        const baseUrl = normalizeDomain(PTERO_DOMAIN);
        const apikey = PTERO_ADMIN_API_KEY;

        // === 2. AMBIL DATA DARI FORM WEBSITE (TERMASUK USER YANG LOGIN) ===
        const { panelUsername, email, plan, loggedInUser } = request.body;
        if (!panelUsername || !email || !plan || !loggedInUser) {
            return response.status(400).json({ message: 'Informasi dari form tidak lengkap.' });
        }

        // === 3. PEMERIKSAAN HAK AKSES BERDASARKAN ROLE (BAGIAN BARU!) ===
        const user = await kv.get(`user:${loggedInUser}`);
        if (!user) {
            return response.status(403).json({ message: "Akses Ditolak: User yang sedang login tidak ditemukan." });
        }

        const userRole = user.role || 'free'; // Jika user lama tidak punya role, anggap 'free'
        
        // Aturan Hak Akses
        if (userRole === 'free' && plan !== '1gb') {
            return response.status(403).json({ message: "Akses Ditolak: Sebagai Free User, Anda hanya bisa membuat panel 1GB." });
        }
        // Jika role 'member' atau 'admin', mereka bisa melanjutkan tanpa pengecekan plan.


        // === 4. TENTUKAN SPESIFIKASI BERDASARKAN PLAN ===
        const specs = {
    "1gb": { ram: 1024, disk: 2048, cpu: 50 },
    "2gb": { ram: 2048, disk: 3072, cpu: 75 },
    "3gb": { ram: 3072, disk: 4096, cpu: 100 },
    "4gb": { ram: 4096, disk: 5120, cpu: 125 },
    "5gb": { ram: 5120, disk: 6144, cpu: 150 },
    "6gb": { ram: 6144, disk: 7168, cpu: 175 },
    "7gb": { ram: 7168, disk: 8192, cpu: 200 },
    "8gb": { ram: 8192, disk: 9216, cpu: 225 },
    "9gb": { ram: 9216, disk: 10240, cpu: 250 },
    "10gb": { ram: 10240, disk: 11264, cpu: 275 }, 
    "unli": { ram: 0, disk: 0, cpu: 0 }
};

if (!specs[plan]) {
    return response.status(400).json({ message: `Plan '${plan}' tidak valid.` });
}
const { ram, disk, cpu } = specs[plan];
        
        // === 5. SIAPKAN DATA UNTUK API CALL ===
        // Menggunakan panelUsername dari form, bukan loggedInUser
        const password = panelUsername + Math.random().toString(36).substring(2, 6);
        const serverName = capital(panelUsername) + " Server";

        // === 6. BUAT USER BARU DI PTERODACTYL (API CALL 1) ===
        const createUserRes = await fetch(`${baseUrl}/api/application/users`, {
            method: "POST",
            headers: { "Accept": "application/json", "Content-Type": "application/json", "Authorization": `Bearer ${apikey}` },
            body: JSON.stringify({
                email: email, // Menggunakan email dari form
                username: panelUsername, // Menggunakan username dari form
                first_name: panelUsername,
                last_name: "User",
                password: password
            })
        });

        if (createUserRes.status === 422) {
            return response.status(409).json({ message: 'Username atau Email untuk panel sudah terdaftar di Pterodactyl.' });
        }
        if (!createUserRes.ok) {
            throw new Error(`Gagal membuat user Pterodactyl (HTTP ${createUserRes.status})`);
        }
        const userData = await createUserRes.json();
        const userId = userData.attributes.id;

        // === 7. BUAT SERVER DI PTERODACTYL (API CALL 2) ===
        const createServerRes = await fetch(`${baseUrl}/api/application/servers`, {
            method: "POST",
            headers: { "Accept": "application/json", "Content-Type": "application/json", "Authorization": `Bearer ${apikey}` },
            body: JSON.stringify({
                name: serverName, user: userId, egg: parseInt(PTERO_EGG_ID),
                docker_image: "ghcr.io/parkervcp/yolks:nodejs_18", // Sesuaikan jika perlu
                startup: "npm start", // Sesuaikan jika perlu
                environment: { INST: "npm", USER_UPLOAD: "0", AUTO_UPDATE: "0", CMD_RUN: "npm start" },
                limits: { memory: ram, swap: 0, disk, io: 500, cpu },
                feature_limits: { databases: 2, backups: 2, allocations: 2 },
                deploy: { locations: [parseInt(PTERO_LOCATION_ID)], dedicated_ip: false, port_range: [] }
            })
        });

        if (!createServerRes.ok) {
            // Cleanup: Hapus user Pterodactyl yang sudah dibuat jika server gagal dibuat
            await fetch(`${baseUrl}/api/application/users/${userId}`, { method: "DELETE", headers: { "Authorization": `Bearer ${apikey}` } });
            throw new Error(`User Pterodactyl dibuat tapi server gagal (HTTP ${createServerRes.status})`);
        }
        const serverData = await createServerRes.json();

        // === 8. KIRIM HASIL SUKSES KE WEBSITE ===
        return response.status(201).json({
            domain: baseUrl,
            username: panelUsername,
            password: password,
            email: email,
            ram: ram === 0 ? "Unlimited" : `${ram / 1024} GB`,
            disk: disk === 0 ? "Unlimited" : `${disk / 1024} GB`,
            cpu: cpu === 0 ? "Unlimited" : `${cpu}%`,
            server_id: serverData.attributes.id,
            user_id: userId
        });

    } catch (error) {
        console.error("CREATE SERVER ERROR:", error);
        return response.status(500).json({ message: error.message });
    }
}