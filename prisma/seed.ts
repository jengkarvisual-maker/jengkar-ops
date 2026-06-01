import { PrismaClient } from "@prisma/client";

import { INITIAL_USERS, SEED_DEFAULT_PASSWORD } from "../lib/constants";
import { hashPassword } from "../lib/passwords";
import { calculateBonusPool } from "../lib/utils";

const prisma = new PrismaClient();

async function seedUsers() {
  for (const user of INITIAL_USERS) {
    const password = user.password ?? SEED_DEFAULT_PASSWORD;
    const passwordHash = hashPassword(password);

    await prisma.user.upsert({
      where: {
        email: user.email,
      },
      update: {
        name: user.name,
        role: user.role,
        passwordHash,
        authUserId: null,
      },
      create: {
        name: user.name,
        email: user.email,
        role: user.role,
        passwordHash,
        authUserId: null,
      },
    });
  }
}

async function seedCompanyFinance() {
  const currentYear = new Date().getFullYear();
  const netProfit = 0;

  await prisma.companyFinance.upsert({
    where: {
      year: currentYear,
    },
    update: {
      bonusPool: calculateBonusPool(netProfit),
    },
    create: {
      year: currentYear,
      netProfit,
      bonusPool: calculateBonusPool(netProfit),
    },
  });
}

async function main() {
  await seedUsers();
  await seedCompanyFinance();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
