import { existsSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const rootEnvPath = path.join(repoRoot, ".env");

if (existsSync(rootEnvPath)) {
  console.error("");
  console.error("Workflow OPS diblokir karena file .env masih ada di root repo.");
  console.error("Gunakan .env.local untuk local development.");
  console.error("");
  console.error("Alur yang benar:");
  console.error("1. Salin .env.example ke .env.local");
  console.error("2. Isi DATABASE_URL, DIRECT_URL, dan AUTH_SECRET");
  console.error("3. npm run dev");
  console.error("");
  console.error("Untuk deploy production:");
  console.error("1. Simpan env di PM2/systemd atau shell VPS");
  console.error("2. npm run build");
  console.error("3. pm2 restart ops-app --update-env");
  console.error("");
  console.error("Jika file .env dibuat tidak sengaja, pindahkan isinya ke .env.local lalu hapus file .env tersebut.");
  process.exit(1);
}
