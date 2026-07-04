import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { completePasswordResetSchema } from "@/lib/validations";
import { hashPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { badRequest, success, serverError } from "@/lib/api-response";

// POST /api/password-resets/confirm - Public. Set a new password using the
// single-use token from the reset email. Invalidates all active sessions.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = completePasswordResetSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);

    const reset = await prisma.passwordReset.findUnique({
      where: { token: parsed.data.token },
    });
    if (!reset) return badRequest("Invalid or expired reset link");
    if (reset.usedAt) return badRequest("This reset link has already been used");
    if (reset.expiresAt < new Date()) return badRequest("This reset link has expired");

    const hashed = await hashPassword(parsed.data.password);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: reset.userId },
        data: { password: hashed },
      }),
      prisma.passwordReset.update({
        where: { id: reset.id },
        data: { usedAt: new Date() },
      }),
      // Invalidate all sessions so stolen cookies are useless.
      prisma.session.deleteMany({ where: { userId: reset.userId } }),
    ]);

    await logAudit({
      actorId: reset.userId,
      action: "password.reset_complete",
      entity: "user",
      entityId: reset.userId,
      targetUserId: reset.userId,
      metadata: { triggeredBy: reset.triggeredBy },
      request,
    });

    return success({ success: true });
  } catch (error) {
    console.error("Confirm reset error:", error);
    return serverError();
  }
}