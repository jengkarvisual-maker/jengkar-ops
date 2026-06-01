export const env = {
  databaseUrl: process.env.DATABASE_URL ?? "",
  authSecret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "",
};

export function isDatabaseConfigured() {
  return Boolean(env.databaseUrl);
}
