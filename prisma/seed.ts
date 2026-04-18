import { PrismaClient } from "@prisma/client";

import { INITIAL_USERS, SEED_DEFAULT_PASSWORD } from "../lib/constants";
import { createSupabaseAdminClient } from "../lib/supabase/admin";
import { calculateBonusPool } from "../lib/utils";

const prisma = new PrismaClient();

async function seedUsers() {
  const supabaseAdmin = createSupabaseAdminClient();
  const authUsersByEmail = new Map<string, string>();

  if (supabaseAdmin) {
    let page = 1;
    let shouldContinue = true;

    while (shouldContinue) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage: 200,
      });

      if (error) {
        throw error;
      }

      data.users.forEach((user) => {
        if (user.email) {
          authUsersByEmail.set(user.email.toLowerCase(), user.id);
        }
      });

      shouldContinue = data.users.length === 200;
      page += 1;
    }
  }

  for (const user of INITIAL_USERS) {
    let authUserId = authUsersByEmail.get(user.email);

    if (!authUserId && supabaseAdmin) {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: SEED_DEFAULT_PASSWORD,
        email_confirm: true,
        user_metadata: {
          name: user.name,
          role: user.role,
        },
      });

      if (error && !error.message.toLowerCase().includes("already")) {
        throw error;
      }

      authUserId = data.user?.id ?? authUsersByEmail.get(user.email) ?? undefined;
    }

    await prisma.user.upsert({
      where: {
        email: user.email,
      },
      update: {
        name: user.name,
        role: user.role,
        authUserId: authUserId ?? undefined,
      },
      create: {
        name: user.name,
        email: user.email,
        role: user.role,
        authUserId: authUserId ?? undefined,
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
