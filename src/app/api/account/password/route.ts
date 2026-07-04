import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { changePasswordSchema } from "@/lib/validations";
import { hashPassword, verifyPassword, requireAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { badRequest, success, serverError, unauthorized } from "@/lib/api-response";

// POST /api/account/password - Authenticated user changes their own password.
export async function POST(request: NextRequest) {
  try {
    const me = await requireAuth();
    if (!me) return unauthorized();

    const body = await request.json();
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);

    if (!me.password) return badRequest("No password set on this account");

    const ok = await verifyPassword(parsed.data.currentPassword, me.password);
    if (!ok) return badRequest("Current password is incorrect");

    if (parsed.data.currentPassword === parsed.data.newPassword) {
      return badRequest("New password must be different from the current password");
    }

    const hashed = await hashPassword(parsed.data.newPassword);

    await prisma.$transaction([
      prisma.user.update({ where: { id: me.id }, data: { password: hashed } }),
      prisma.session.deleteMany({ where: { userId: me.id } }),
    ]);

    await logAudit({
      actorId: me.id,
      action: "password.change",
      entity: "user",
      entityId: me.id,
      targetUserId: me.id,
      request,
    });

    return success({ success: true });
  } catch (error) {
    console.error("Change password error:", error);
    return serverError();
  }
}