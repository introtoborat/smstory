import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { loginSchema, registerSchema } from "@/lib/validations";
import { hashPassword, verifyPassword, createToken, generateAndSetCsrfCookie, createDBSession, cleanupExpiredSessions } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { badRequest, created } from "@/lib/api-response";
import { authLimiter, checkRateLimit } from "@/lib/upstash";

// POST /api/auth - Login or register. New self-registration is allowed only
// when there are no users yet (initial setup). Otherwise users are created by
// admins via /api/users.
export async function POST(request: NextRequest) {
  // Strict rate limit: 5 attempts per 60 s per IP (brute-force protection)
  const rateLimitResponse = await checkRateLimit(authLimiter, request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = await request.json();

    // ===== Login =====
    if (body.email && body.password && !body.name) {
      const parsed = loginSchema.safeParse(body);
      if (!parsed.success) return badRequest(parsed.error.issues[0].message);

      const user = await prisma.user.findUnique({
        where: { email: parsed.data.email.toLowerCase() },
      });
      if (!user || !user.password) {
        await logAudit({
          actorId: null,
          action: "login_failed",
          metadata: { email: parsed.data.email.toLowerCase(), reason: "no_user_or_password" },
          request,
        });
        return badRequest("Invalid email or password");
      }

      const valid = await verifyPassword(parsed.data.password, user.password);
      if (!valid) {
        await logAudit({
          actorId: user.id,
          action: "login_failed",
          metadata: { email: user.email, reason: "bad_password" },
          request,
        });
        return badRequest("Invalid email or password");
      }

      if (user.status !== "active") {
        await logAudit({
          actorId: user.id,
          action: "login_failed",
          metadata: { email: user.email, reason: user.status },
          request,
        });
        return badRequest(user.status === "pending" ? "Please activate your account first" : "This account has been deactivated");
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      await logAudit({
        actorId: user.id,
        action: "login",
        request,
      });

      const token = await createToken(user.id);
      const response = NextResponse.json({
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
        token,
      });
      response.cookies.set("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      });
      generateAndSetCsrfCookie(response);
      await createDBSession(user.id, token, request);
      // Best-effort cleanup of expired sessions
      cleanupExpiredSessions().catch(() => {});
      return response;
    }

    // ===== Self-registration (only when there are zero users) =====
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      return badRequest("Self-registration is disabled. Ask an admin to invite you.");
    }

    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);

    const existing = await prisma.user.findUnique({
      where: { email: parsed.data.email.toLowerCase() },
    });
    if (existing) return badRequest("A user with this email already exists");

    const hashedPassword = await hashPassword(parsed.data.password);
    const user = await prisma.user.create({
      data: {
        email: parsed.data.email.toLowerCase(),
        name: parsed.data.name,
        password: hashedPassword,
        role: "admin",
        status: "active",
      },
    });

    await logAudit({
      actorId: user.id,
      action: "user.create",
      entity: "user",
      entityId: user.id,
      targetUserId: user.id,
      metadata: { selfRegistration: true },
      request,
    });

    const token = await createToken(user.id);
    const response = created({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      token,
    });
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    generateAndSetCsrfCookie(response);
    await createDBSession(user.id, token, request);
    return response;
  } catch (error) {
    console.error("Auth error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}