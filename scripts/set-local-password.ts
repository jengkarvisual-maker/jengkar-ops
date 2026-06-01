import { hashPassword } from "@/lib/passwords";
import { prisma } from "@/lib/prisma";

async function main() {
  const [, , rawEmail, rawPassword] = process.argv;
  const email = rawEmail?.trim().toLowerCase();
  const password = rawPassword?.trim();

  if (!email || !password) {
    throw new Error("Usage: npx tsx scripts/set-local-password.ts <email> <new-password>");
  }

  if (password.length < 8) {
    throw new Error("Password minimal 8 karakter.");
  }

  const user = await prisma.user.findUnique({
    where: {
      email,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
    },
  });

  if (!user) {
    throw new Error(`User dengan email ${email} tidak ditemukan.`);
  }

  if (!user.isActive) {
    throw new Error(`User ${email} sedang nonaktif. Aktifkan dulu sebelum reset password.`);
  }

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      passwordHash: hashPassword(password),
      authUserId: null,
    },
  });

  console.log(`Password lokal berhasil diset untuk ${user.name} (${user.email}, ${user.role}).`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
