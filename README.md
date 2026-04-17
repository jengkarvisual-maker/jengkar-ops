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

Salin `.env.example` menjadi `.env.local` lalu isi:

```bash
DATABASE_URL="postgresql://postgres:password@db.project.supabase.co:5432/postgres?sslmode=require"
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-optional-service-role-key"
```

Catatan:
- `SUPABASE_SERVICE_ROLE_KEY` bersifat opsional, tetapi sangat membantu jika Anda ingin `prisma db seed` sekaligus membuat akun Supabase Auth otomatis.
- Tanpa service role key, seed tetap membuat profil user di database aplikasi. Akun auth bisa dibuat manual di dashboard Supabase dengan email yang sama.

## Setup Lokal

```bash
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

1. Tambahkan environment variables yang sama di project Vercel.
2. Pastikan `DATABASE_URL` mengarah ke Supabase PostgreSQL production.
3. Jalankan migration atau schema push.
4. Deploy ke Vercel.
5. Kaitkan domain `ops.rumahjengkar.com` ke project Vercel.
