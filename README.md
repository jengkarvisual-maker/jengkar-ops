## JENGKAR KPI

Aplikasi KPI management untuk tim kreatif Rumah Jengkar dengan fondasi:
- Next.js 16 App Router
- TypeScript
- Prisma ORM
- Supabase PostgreSQL + Auth
- Tailwind CSS v4
- Server-side auth guard
- Dashboard multi-role: Owner, Admin, Karyawan

Domain target production:
- `https://ops.rumahjengkar.com`

## Status Fondasi Saat Ini

Fondasi repo ini sekarang sudah diselaraskan dengan kebutuhan produk utama Anda:
- schema Prisma sudah mencakup `User`, `Attendance`, `DailyProgress`, `KpiMonthly`, `KpiYearly`, dan `CompanyFinance`
- helper Supabase Auth dan guard route sudah tersedia
- login page dan dashboard multi-role dasar sudah tersedia
- util bisnis untuk KPI bulanan, KPI tahunan, bonus pool, dan bonus individual sudah tersedia
- seed user internal sudah tersedia

Yang masih menjadi tahap berikutnya adalah mengisi modul CRUD dan workflow operasional lebih detail di atas fondasi ini.

## Struktur Folder

```text
app/
components/
lib/
prisma/
types/
```

## Environment Variables

Gunakan `.env.local` untuk local development, dan simpan rahasia production di Vercel Project Settings.

Template variabel yang dibutuhkan ada di `.env.example`:

```bash
DATABASE_URL="postgresql://postgres:password@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require"
DIRECT_URL="postgresql://postgres:password@db.project.supabase.co:5432/postgres?sslmode=require"
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-optional-service-role-key"
```

Catatan:
- `DATABASE_URL` disarankan memakai `transaction pooler` Supabase untuk runtime serverless seperti Vercel agar koneksi tidak cepat habis.
- `DIRECT_URL` dipakai Prisma untuk operasi schema seperti `db push` atau migration.
- Jangan gunakan file `.env` di root repo. Workflow OPS sekarang sengaja memblokir command utama jika file `.env` masih ada.
- `SUPABASE_SERVICE_ROLE_KEY` bersifat opsional, tetapi sangat membantu jika Anda ingin `prisma db seed` sekaligus membuat akun Supabase Auth otomatis.
- Tanpa service role key, seed tetap membuat profil user di database aplikasi. Akun auth bisa dibuat manual di dashboard Supabase dengan email yang sama.

## Workflow Env Resmi

Untuk local development:

```bash
npm run env:pull:development
npm run dev
```

Untuk sinkronisasi env production ke `.env.local` sebelum pengecekan lokal:

```bash
npm run env:pull:production
```

Untuk deploy production:

```bash
npm run deploy:prod
```

Prinsip workflow ini:
- `Vercel Project Settings` adalah sumber utama env untuk deploy online
- `.env.local` hanya untuk kebutuhan lokal
- `.env` di root repo tidak dipakai lagi

## Setup Lokal

```bash
npm run env:pull:development
npm install
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

Buka:
- `http://localhost:3000`

## Seed Akun Awal

Seed menyiapkan user internal berikut:

Owner:
- `owner@jengkar.com`

Admin:
- `admin@jengkar.com`

Karyawan:
- `nuzulul@jengkar.com`
- `cepi@jengkar.com`
- `ilham@jengkar.com`
- `zaka@jengkar.com`
- `yongki@jengkar.com`
- `naila@jengkar.com`
- `lugas@jengkar.com`
- `sindy@jengkar.com`

Default password jika service role dipakai saat seed:
- `12345678`

## Build & Validasi

```bash
npm run typecheck
npm run lint
npm run build
```

## Catatan Arsitektur

- Route `/dashboard` memutuskan tampilan berdasarkan role user yang login.
- Guard auth dilakukan berlapis:
  - `proxy.ts` menjaga route login/dashboard berdasarkan sesi Supabase
  - `lib/auth.ts` memastikan user auth benar-benar punya profil aplikasi yang valid
- Relasi user aplikasi dan user Supabase dipautkan lewat email pada login pertama, lalu disimpan ke `authUserId`.
- Formula KPI dan bonus disiapkan di `lib/utils.ts` agar aturan bisnis tetap terpusat.

## Deploy ke Vercel

1. Tambahkan environment variables di Vercel Project Settings.
2. Pastikan `DATABASE_URL` memakai `transaction pooler` dan `DIRECT_URL` memakai koneksi direct atau session pooler yang stabil untuk operasi schema.
3. Jika perlu cek lokal dengan env production, jalankan `npm run env:pull:production`.
4. Deploy dengan `npm run deploy:prod`.
5. Kaitkan domain `ops.rumahjengkar.com` ke project Vercel.
