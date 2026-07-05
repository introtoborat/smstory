import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { badRequest, notFound, success, serverError, unauthorized } from "@/lib/api-response";

// POST /api/users/[id]/deactivate - Disable a user. They cannot log in while inactive.
export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const me = await requirePermission("user.deactivate");
    if (!me) return unauthorized();

    const { id } = await ctx.params;
    if (id === me.id) return badRequest("You cannot deactivate your own account");

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return notFound("User not found");

    if (target.role === "admin") {
      const activeAdminCount = await prisma.user.count({ where: { role: "admin", status: "active" } });
      if (activeAdminCount <= 1) return badRequest("Cannot deactivate the last active admin");
    }

    if (target.status === "inactive") return badRequest("User is already inactive");

    await prisma.user.update({ where: { id }, data: { status: "inactive" } });
    // Invalidate all active sessions for this user.
    await prisma.session.deleteMany({ where: { userId: id } });

    await logAudit({
      actorId: me.id,
      action: "user.deactivate",
      entity: "user",
      entityId: id,
      targetUserId: id,
      metadata: { from: target.status, to: "inactive" },
      request,
    });

    return success({ success: true });
  } catch (error) {
    console.error("Deactivate user error:", error);
    return serverError();
  }
}