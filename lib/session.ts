import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

import { env } from "@/lib/env";

export const OPS_SESSION_COOKIE = "ops-session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function getSessionSecret() {
  return env.authSecret || env.databaseUrl;
}

function signPayload(payload: string) {
  const secret = getSessionSecret();

  if (!secret) {
    throw new Error("AUTH_SECRET atau DATABASE_URL wajib tersedia untuk session lokal OPS.");
  }

  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function encode(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function decode<T>(value: string): T | null {
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

export async function createLocalSession(userId: string) {
  const expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  const payload = encode({ userId, expiresAt });
  const signature = signPayload(payload);
  const cookieStore = await cookies();

  cookieStore.set(OPS_SESSION_COOKIE, `${payload}.${signature}`, {
    httpOnly: true,
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearLocalSession() {
  const cookieStore = await cookies();
  cookieStore.delete(OPS_SESSION_COOKIE);
}

export async function getLocalSessionUserId() {
  const cookieStore = await cookies();
  const rawCookie = cookieStore.get(OPS_SESSION_COOKIE)?.value;

  if (!rawCookie) {
    return null;
  }

  const [payload, signature] = rawCookie.split(".");

  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = signPayload(payload);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null;
  }

  const session = decode<{ userId: string; expiresAt: number }>(payload);

  if (!session?.userId || !session.expiresAt || session.expiresAt < Date.now()) {
    return null;
  }

  return session.userId;
}
