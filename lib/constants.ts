import { UserRole } from "@prisma/client";

export const APP_NAME = "JENGKAR KPI";
export const APP_DOMAIN = "https://ops.rumahjengkar.com";
export const SEED_DEFAULT_PASSWORD =
  process.env.SEED_DEFAULT_PASSWORD ?? "12345678";
export const EXCLUDED_OPERATIONAL_EMAILS = [
  "owner@rumahjengkar.com",
  "admin@rumahjengkar.com",
  "finance@rumahjengkar.com",
] as const;

type InitialUserSeed = {
  name: string;
  email: string;
  role: UserRole;
  password?: string;
};

export const INITIAL_USERS = [
  {
    name: "Owner Rumah Jengkar",
    email: "owner@rumahjengkar.com",
    role: UserRole.OWNER,
  },
  {
    name: "Admin Rumah Jengkar",
    email: "admin@rumahjengkar.com",
    role: UserRole.ADMIN,
  },
  {
    name: "Finance Rumah Jengkar",
    email: "finance@rumahjengkar.com",
    role: UserRole.KARYAWAN,
  },
  {
    name: "Nuzulul Lia",
    email: "nuz@rumahjengkar.com",
    role: UserRole.KARYAWAN,
  },
  {
    name: "Cepi",
    email: "cepi@rumahjengkar.com",
    role: UserRole.KARYAWAN,
  },
  {
    name: "Ilham Nasrudin",
    email: "ndog@rumahjengkar.com",
    role: UserRole.KARYAWAN,
  },
  {
    name: "Zaka",
    email: "zaka@rumahjengkar.com",
    role: UserRole.KARYAWAN,
  },
  {
    name: "Yongki Pardamean",
    email: "yongki@rumahjengkar.com",
    role: UserRole.KARYAWAN,
  },
  {
    name: "Naila Salma",
    email: "nong@rumahjengkar.com",
    role: UserRole.KARYAWAN,
  },
  {
    name: "Lugas Adepi Bumi",
    email: "lugas@rumahjengkar.com",
    role: UserRole.KARYAWAN,
  },
  {
    name: "Sindy Pratiwi",
    email: "sindy@rumahjengkar.com",
    role: UserRole.KARYAWAN,
  },
  {
    name: "Arif Rahman",
    email: "arif@rumahjengkar.com",
    role: UserRole.KARYAWAN,
    password: "arif5585",
  },
] satisfies readonly InitialUserSeed[];

export const ROLE_COPY = {
  OWNER: {
    label: "Owner",
    description: "Akses penuh ke absensi, progres kerja, KPI, dan bonus tahunan.",
  },
  ADMIN: {
    label: "Admin",
    description: "Mengelola progres harian, membantu validasi data, dan memantau ritme tim.",
  },
  KARYAWAN: {
    label: "Karyawan",
    description: "Mengisi absensi, memperbarui progres kerja, dan melihat KPI pribadi.",
  },
} as const;

export const CORE_MODULES = [
  {
    title: "Absensi Harian",
    description:
      "Check-in, check-out, dan status OFF dengan aturan jam kerja Senin sampai Minggu.",
  },
  {
    title: "Progres Harian",
    description:
      "Daftar pekerjaan, target selesai, revisi, closing, dan status done lintas peran.",
  },
  {
    title: "KPI Bulanan & Tahunan",
    description:
      "Perhitungan 90 persen kinerja berbobot pekerjaan dan 10 persen disiplin, lalu dirangkum per tahun.",
  },
  {
    title: "Bonus Tahunan",
    description:
      "Bonus pool 10 persen laba bersih dengan distribusi berbasis KPI tahunan yang eligible.",
  },
] as const;
