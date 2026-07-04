import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { badRequest, notFound, success, serverError, unauthorized } from "@/lib/api-response";

// POST /api/users/[id]/activate - Reactivate an inactive/pending user.
export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const me = await requirePermission("user.activate");
    if (!me) return unauthorized();

    const { id } = await ctx.params;
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return notFound("User not found");
    if (target.status === "active") return badRequest("User is already active");

    const updated = await prisma.user.update({
      where: { id },
      data: { status: "active" },
      select: { id: true, status: true },
    });

    await logAudit({
      actorId: me.id,
      action: "user.activate",
      entity: "user",
      entityId: id,
      targetUserId: id,
      metadata: { from: target.status, to: "active" },
      request,
    });

    return success(updated);
  } catch (error) {
    console.error("Activate user error:", error);
    return serverError();
  }
}