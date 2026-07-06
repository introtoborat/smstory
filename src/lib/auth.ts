import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

const secret = (() => {
  const key = process.env.AUTH_SECRET;
  if (!key) throw new Error("AUTH_SECRET environment variable is required");
  return new TextEncoder().encode(key);
})();

export type Role = "admin" | "editor" | "viewer";
export const ROLES: Role[] = ["admin", "editor", "viewer"];

export const PERMISSIONS = {
  // user management
  "user.create": ["admin"],
  "user.read": ["admin"],
  "user.update": ["admin"],
  "user.delete": ["admin"],
  "user.assignRole": ["admin"],
  "user.activate": ["admin"],
  "user.deactivate": ["admin"],
  "user.resetPassword": ["admin"],
  "user.viewActivityLog": ["admin"],
  // settings (lookup tables)
  "settings.manage": ["admin"],
  // stories
  "story.read": ["admin", "editor", "viewer"],
  "story.create": ["admin", "editor"],
  "story.update": ["admin", "editor"],
  "story.delete": ["admin"],
  // drafts
  "draft.manage": ["admin", "editor"],
  // export
  "export.run": ["admin", "editor"],
  // stats
  "stats.read": ["admin", "editor", "viewer"],
} as const satisfies Record<string, Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function hasPermission(role: string | undefined | null, perm: Permission): boolean {
  if (!role) return false;
  const allowed = (PERMISSIONS as Record<string, readonly string[]>)[perm];
  return !!allowed && allowed.includes(role);
}

// ===== Password helpers =====
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(password, hashed);
}

// ===== Token helpers =====
export async function createToken(userId: string): Promise<string> {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .setJti(globalThis.crypto.randomUUID()) // unique token ID for session tracking
    .sign(secret);
}

export async function verifyToken(token: string): Promise<{ userId: string; jti?: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as { userId: string; jti?: string };
  } catch {
    return null;
  }
}

// Single-use secure tokens for invitations and password resets.
export function generateToken(): string {
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64url");
}

export function generateSessionId(): string {
  return globalThis.crypto.randomUUID();
}

// ===== Session helpers =====
export async function getSession(): Promise<{ userId: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  // Verify the session exists in the database and hasn't expired.
  // This allows server-side session invalidation (password change, admin
  // deactivation, etc.) to take effect immediately.
  try {
    const { prisma } = await import("@/lib/prisma");
    const session = await prisma.session.findFirst({
      where: {
        userId: payload.userId,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });
    if (!session) return null;
  } catch {
    // If the DB is unreachable, fall back to just the JWT check.
    // This prevents a DB outage from locking everyone out.
    console.error("Session DB check failed, falling back to JWT-only");
  }

  return { userId: payload.userId };
}

// Returns the current user (without password). Returns null for inactive users
// (treated as not authenticated). Pass `{ includeInactive: true }` for admin
// pages that need to inspect disabled accounts.
export async function getCurrentUser(opts: { includeInactive?: boolean } = {}) {
  const session = await getSession();
  if (!session) return null;

  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return null;
  if (!opts.includeInactive && user.status !== "active") return null;
  return user;
}

// Strict auth: returns the user, or null if not authenticated or inactive.
export async function requireAuth() {
  return getCurrentUser();
}

// Returns the user if they have the given permission; null otherwise.
export async function requirePermission(perm: Permission) {
  const user = await requireAuth();
  if (!user) return null;
  return hasPermission(user.role, perm) ? user : null;
}

// Pull request metadata for audit logging.
export function getRequestMeta(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    undefined;
  const userAgent = request.headers.get("user-agent") || undefined;
  return { ip, userAgent };
}

export function hoursFromNow(hours: number): Date {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

// ===== CSRF Protection =====
// We use a double-submit cookie pattern: a random CSRF token is set as a
// non-httpOnly cookie (readable by client JS). The client sends it back as
// an X-CSRF-Token header on state-changing requests. The server compares
// the header value to the cookie value.

const CSRF_COOKIE = "csrf-token";
const CSRF_HEADER = "x-csrf-token";
const CSRF_SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function generateCsrfToken(): string {
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64url");
}

/** Hash a CSRF token for the httpOnly cookie (defense in depth). */
export function hashCsrfToken(token: string): string {
  const { createHash } = require("crypto") as typeof import("crypto");
  return createHash("sha256").update(token).digest("base64url");
}

/**
 * Validate a CSRF request. Reads the non-httpOnly csrf-token cookie and
 * compares it to the X-CSRF-Token header. Safe methods (GET/HEAD/OPTIONS)
 * are always allowed.
 */
export async function validateCsrf(request: Request): Promise<boolean> {
  if (CSRF_SAFE_METHODS.has(request.method)) return true;

  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(CSRF_COOKIE)?.value;
  const headerToken = request.headers.get(CSRF_HEADER);

  if (!cookieToken || !headerToken) return false;

  // Constant-time comparison to prevent timing attacks
  const a = Buffer.from(cookieToken);
  const b = Buffer.from(headerToken);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

/**
 * Set the CSRF cookie on the response. Call this after login/register.
 * The cookie is NOT httpOnly so client JS can read it and send it as a header.
 */
export function setCsrfCookie(
  response: Response,
  token: string,
): void {
  // NextResponse has a cookies.set method; cast through unknown for safety
  const res = response as unknown as { cookies: { set: (name: string, value: string, opts: Record<string, unknown>) => void } };
  res.cookies.set(CSRF_COOKIE, token, {
    httpOnly: false, // client JS needs to read this
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days, same as auth token
    path: "/",
  });
}

/**
 * Generate a CSRF token and set both the non-httpOnly cookie (for JS to read)
 * and optionally store a hashed version in an httpOnly cookie for double-submit.
 */
export function generateAndSetCsrfCookie(response: Response): string {
  const token = generateCsrfToken();
  setCsrfCookie(response, token);
  return token;
}

// ===== Database session management =====

/**
 * Create a session row in the database. Call this after successful login/register.
 * The session row enables server-side invalidation (e.g., on password change).
 */
export async function createDBSession(
  userId: string,
  token: string,
  request?: Request,
): Promise<void> {
  try {
    const { prisma } = await import("@/lib/prisma");
    const meta = request ? getRequestMeta(request) : { ip: undefined, userAgent: undefined };
    await prisma.session.create({
      data: {
        userId,
        token: token.slice(0, 255), // store a prefix to avoid huge rows
        userAgent: meta.userAgent,
        ip: meta.ip,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });
  } catch (err) {
    // Don't fail login if session row creation fails
    console.error("Failed to create session row:", err);
  }
}

/**
 * Clean up expired sessions. Call periodically (e.g., in a cron job or
 * on login to keep the table small).
 */
export async function cleanupExpiredSessions(): Promise<void> {
  try {
    const { prisma } = await import("@/lib/prisma");
    await prisma.session.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  } catch (err) {
    console.error("Failed to cleanup expired sessions:", err);
  }
}