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
  console.error("1. npm run env:pull:development");
  console.error("2. npm run dev");
  console.error("");
  console.error("Untuk deploy production:");
  console.error("1. npm run env:pull:production");
  console.error("2. npm run deploy:prod");
  console.error("");
  console.error("Jika file .env dibuat tidak sengaja, pindahkan isinya ke .env.local lalu hapus file .env tersebut.");
  process.exit(1);
}
