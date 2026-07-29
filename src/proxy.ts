import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, sessionToken, safeEqual } from "@/lib/auth";

/**
 * Gates the whole app behind a shared password. This URL is public and sits
 * in front of paid Deepgram and OpenRouter keys, so it fails closed: no
 * APP_PASSWORD configured means nobody gets in.
 */
export function proxy(req: NextRequest) {
  const password = process.env.APP_PASSWORD;
  if (!password) {
    return new NextResponse(
      "APP_PASSWORD is not set on the server, so the app is locked.",
      { status: 503 }
    );
  }

  const cookie = req.cookies.get(SESSION_COOKIE)?.value;
  if (cookie && safeEqual(cookie, sessionToken(password))) {
    return NextResponse.next();
  }

  // API calls get a status they can act on; page loads get the login screen.
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/login", req.url));
}

export const config = {
  matcher: [
    // Everything except the login screen, the login endpoint, and static assets.
    "/((?!login|api/login|_next/static|_next/image|favicon.ico).*)",
  ],
};
