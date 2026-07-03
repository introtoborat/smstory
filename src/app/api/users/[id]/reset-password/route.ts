import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, generateToken, hoursFromNow } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { badRequest, notFound, success, serverError, unauthorized } from "@/lib/api-response";
import { allowDevResetUrl, buildAppUrl, isEmailConfigured, sendPasswordResetEmail } from "@/lib/email";

// POST /api/users/[id]/reset-password - Admin triggers a password reset email.
// Generates a single-use token valid for 1 hour and emails the reset URL.
export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const me = await requirePermission("user.resetPassword");
    if (!me) return unauthorized();

    const { id } = await ctx.params;
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return notFound("User not found");
    if (!isEmailConfigured() && !allowDevResetUrl()) {
      return badRequest("Email delivery is not configured");
    }

    const token = generateToken();
    const expiresAt = hoursFromNow(1);

    await prisma.passwordReset.create({
      data: { userId: id, token, triggeredBy: "admin", expiresAt },
    });

    await logAudit({
      actorId: me.id,
      action: "password.reset_request",
      entity: "user",
      entityId: id,
      targetUserId: id,
      metadata: { triggeredBy: "admin" },
      request,
    });

    const resetUrl = buildAppUrl(`/reset-password?token=${token}`);
    if (isEmailConfigured()) {
      await sendPasswordResetEmail({
        to: target.email,
        name: target.name || target.email,
        resetUrl,
        expiresAt,
      });
    }

    return success({
      emailSent: isEmailConfigured(),
      ...(allowDevResetUrl() ? { resetUrl } : {}),
      expiresAt,
    });
  } catch (error) {
    console.error("Admin reset password error:", error);
    return serverError();
  }
}
