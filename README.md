## Jengkar KPI

Fondasi aplikasi operasional Rumah Jengkar untuk:
- SOP
- KPI
- bonus tahunan
- review operasional lintas tim

Domain target production:
- `https://ops.rumahjengkar.com`

## Menjalankan lokal

```bash
npm install
npm run dev
```

Buka `http://localhost:3000`.

## Build production

```bash
npm run typecheck
npm run build
```

## Fokus tahap awal

- halaman publik yang rapi dan siap online
- navigasi lintas aplikasi Rumah Jengkar
- struktur modul untuk SOP, KPI, bonus tahunan, dan review
- pondasi yang mudah dikembangkan ke autentikasi dan data model berikutnya

## Deploy

Deploy dengan Vercel CLI:

```bash
npx vercel --prod
```

Lalu kaitkan domain custom:

```bash
npx vercel domains add ops.rumahjengkar.com
```
