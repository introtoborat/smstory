import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { apiLimiter, mutationLimiter, checkRateLimit, getClientIp } from "@/lib/upstash";

const protectedPaths = [
  "/stories",
  "/dashboard",
  "/account",
  "/admin",
  "/api/stories",
  "/api/pages",
  "/api/stats",
  "/api/drafts",
  "/api/export",
  "/api/account",
  "/api/users",
  "/api/audit",
];
const authPaths = ["/login", "/activate", "/reset-password"];

// API paths that require CSRF validation for state-changing methods.
// GET/HEAD/OPTIONS are always allowed without CSRF.
const csrfProtectedApiPaths = [
  "/api/stories",
  "/api/pages",
  "/api/drafts",
  "/api/export",
  "/api/account",
  "/api/users",
  "/api/audit",
  "/api/auth",
  "/api/settings",
  "/api/password-resets",
  "/api/invitations",
];

const CSRF_SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function validateCsrfMiddleware(request: NextRequest): boolean {
  if (CSRF_SAFE_METHODS.has(request.method)) return true;

  const cookieToken = request.cookies.get("csrf-token")?.value;
  const headerToken = request.headers.get("x-csrf-token");

  if (!cookieToken || !headerToken) return false;

  // Constant-time comparison
  if (cookieToken.length !== headerToken.length) return false;
  const a = new TextEncoder().encode(cookieToken);
  const b = new TextEncoder().encode(headerToken);
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

// Note: this middleware only checks for *presence* of a session token.
// Per-route role enforcement happens inside each API route via
// requirePermission() so inactive users are also rejected there.
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("token")?.value;

  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));
  const isAuth = authPaths.some((p) => pathname.startsWith(p));

  // CSRF check for state-changing API requests
  const needsCsrf = csrfProtectedApiPaths.some((p) => pathname.startsWith(p));
  if (needsCsrf && !validateCsrfMiddleware(request)) {
    return NextResponse.json(
      { error: "CSRF token missing or invalid" },
      { status: 403 },
    );
  }

  // Rate limiting for API routes
  if (pathname.startsWith("/api/")) {
    // Use stricter limiter for state-changing methods
    const isMutation = !CSRF_SAFE_METHODS.has(request.method);
    const limiter = isMutation ? mutationLimiter : apiLimiter;
    const rateLimitResponse = await checkRateLimit(limiter, request);
    if (rateLimitResponse) return rateLimitResponse;
  }

  if (isProtected && !token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuth && token) {
    // Don't auto-redirect away from /activate or /reset-password — users may
    // legitimately want to load those (e.g. admin opens reset link in the
    // same browser where they're already logged in).
    if (pathname === "/login") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/stories/:path*",
    "/account/:path*",
    "/admin/:path*",
    "/login",
    "/activate",
    "/reset-password",
    "/api/stories/:path*",
    "/api/pages/:path*",
    "/api/stats/:path*",
    "/api/drafts/:path*",
    "/api/export/:path*",
    "/api/account/:path*",
    "/api/users/:path*",
    "/api/audit/:path*",
  ],
};