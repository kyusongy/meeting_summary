import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, sessionToken, safeEqual } from "@/lib/auth";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

/** Single instance, so an in-process map is enough to blunt brute force. */
const attempts = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}

export async function POST(req: NextRequest) {
  const password = process.env.APP_PASSWORD;
  if (!password) {
    return NextResponse.json({ error: "The app isn’t configured yet." }, { status: 503 });
  }

  const ip = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for") ?? "local";
  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait 15 minutes and try again." },
      { status: 429 }
    );
  }

  const { password: submitted } = await req.json().catch(() => ({ password: "" }));
  if (typeof submitted !== "string" || !safeEqual(submitted, password)) {
    return NextResponse.json({ error: "That password isn’t right." }, { status: 401 });
  }

  attempts.delete(ip);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, sessionToken(password), {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // stay signed in on her device
  });
  return res;
}
