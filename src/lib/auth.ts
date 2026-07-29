import { createHmac, timingSafeEqual } from "node:crypto";

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
