import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

export const SESSION_COOKIE = "mn_session";

/** Bump to invalidate every existing session. */
const TOKEN_VERSION = "v1";

/**
 * Stateless session token: proof the holder knew the password, without
 * storing the password itself in the cookie. No server-side session store,
 * so it survives restarts and redeploys.
 */
export function sessionToken(password: string): string {
  return createHmac("sha256", password).update(TOKEN_VERSION).digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** False when no password is configured, so every caller fails closed. */
export function isAuthed(req: NextRequest): boolean {
  const password = process.env.APP_PASSWORD;
  const cookie = req.cookies.get(SESSION_COOKIE)?.value;
  return !!password && !!cookie && safeEqual(cookie, sessionToken(password));
}
