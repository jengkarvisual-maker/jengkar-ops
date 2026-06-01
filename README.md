## JENGKAR OPS

Aplikasi operasional Rumah Jengkar untuk KPI, absensi, finance, dan monitoring pekerjaan tim.

Fondasi utama:
- Next.js 16 App Router
- TypeScript
- Prisma ORM
- PostgreSQL VPS
- Session login lokal berbasis cookie bertanda tangan
- Tailwind CSS v4
- Dashboard multi-role: Owner, Admin, Karyawan

Domain production:
- `https://ops.rumahjengkar.com`

## Environment

Gunakan `.env.local` untuk development lokal. Production di VPS memakai environment dari PM2/systemd/shell, bukan Supabase atau Vercel.

Template ada di `.env.example`:

```bash
DATABASE_URL="postgresql://ops_user:password@127.0.0.1:5432/ops_db?schema=public&connection_limit=5&pool_timeout=20"
DIRECT_URL="postgresql://ops_user:password@127.0.0.1:5432/ops_db?schema=public&connection_limit=5&pool_timeout=20"
AUTH_SECRET="generate-a-long-random-secret-for-signed-session-cookies"
```

Catatan:
- `DATABASE_URL` adalah koneksi runtime aplikasi ke database PostgreSQL VPS.
- `DIRECT_URL` dipakai Prisma untuk operasi schema/migration.
- `AUTH_SECRET` dipakai untuk tanda tangan cookie session lokal. Gunakan nilai panjang dan acak di production.
- Jangan gunakan file `.env` di root repo. Command utama sengaja diblokir jika `.env` ada.

## Setup Lokal

```bash
npm install
cp .env.example .env.local
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

Buka:
- `http://localhost:3000`

## Seed Akun Awal

Seed menyiapkan user internal dari `lib/constants.ts` dan menyimpan password sebagai hash lokal.

Default password seed:
- `12345678`

Beberapa akun dapat memiliki password awal khusus sesuai definisi di `INITIAL_USERS`.

## Build & Validasi

```bash
npm run typecheck
npm run lint
npm run build
```

## Deploy VPS Hostinger

Production `ops.rumahjengkar.com` berjalan di VPS Hostinger melalui PM2 dan Nginx.

Alur deploy:

```bash
cd /var/www/ops-app
git pull origin codex/ops-vps-migration
npm install
npx prisma generate
npm run build
pm2 restart ops-app --update-env
pm2 save
```

Untuk migration production, jalankan migration hanya ke PostgreSQL VPS yang dipakai PM2:

```bash
npx prisma db execute --url "$DATABASE_URL" --file prisma/migrations/2026060101_add_employee_addon_note_and_types/migration.sql
npx prisma db execute --url "$DATABASE_URL" --file prisma/migrations/2026060102_add_local_auth_password_hash/migration.sql
```

## Catatan Arsitektur

- Route `/dashboard` menampilkan panel berdasarkan role user yang login.
- `proxy.ts` menjaga route login/dashboard/settings berdasarkan cookie session lokal.
- `lib/auth.ts` memvalidasi session lokal dan profil user aktif dari database aplikasi.
- Password disimpan di kolom `User.passwordHash` menggunakan PBKDF2 SHA-256.
- Kolom `User.authUserId` masih ada sebagai data legacy agar migration aman, tetapi tidak dipakai untuk login aktif.
