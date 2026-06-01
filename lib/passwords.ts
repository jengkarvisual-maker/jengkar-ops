import { pbkdf2Sync, randomBytes, timingSafeEqual } from "crypto";

import { INITIAL_USERS, SEED_DEFAULT_PASSWORD } from "@/lib/constants";

const HASH_PREFIX = "pbkdf2_sha256";
const ITERATIONS = 310000;
const KEY_LENGTH = 32;
const DIGEST = "sha256";

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const hash = pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST).toString("base64url");

  return `${HASH_PREFIX}$${ITERATIONS}$${salt}$${hash}`;
}

export function verifyPassword(password: string, storedHash: string | null | undefined) {
  if (!storedHash) {
    return false;
  }

  const [prefix, iterationsValue, salt, hash] = storedHash.split("$");
  const iterations = Number(iterationsValue);

  if (prefix !== HASH_PREFIX || !Number.isInteger(iterations) || !salt || !hash) {
    return false;
  }

  const expected = Buffer.from(hash, "base64url");
  const actual = pbkdf2Sync(password, salt, iterations, expected.length, DIGEST);

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function getLegacySeedPassword(email: string) {
  const seedUser = INITIAL_USERS.find(
    (user) => user.email.toLowerCase() === email.toLowerCase(),
  );

  if (!seedUser) {
    return null;
  }

  return seedUser.password ?? SEED_DEFAULT_PASSWORD;
}
