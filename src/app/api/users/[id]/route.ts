import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { userUpdateByAdminSchema } from "@/lib/validations";
import { requirePermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { badRequest, forbidden, notFound, success, serverError, unauthorized } from "@/lib/api-response";
import { toPublicUser } from "@/lib/user-view";

// GET /api/users/[id] - Admin only. Returns user details + last few audit entries.
export async function GET(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const me = await requirePermission("user.read");
    if (!me) return unauthorized();

    const { id } = await ctx.params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        createdById: true,
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
    if (!user) return notFound("User not found");

    const recentActivity = await prisma.auditLog.findMany({
      where: { OR: [{ actorId: id }, { targetUserId: id }] },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return success({ user: { ...user, hasPassword: true }, recentActivity });
  } catch (error) {
    console.error("Get user error:", error);
    return serverError();
  }
}

// PATCH /api/users/[id] - Admin updates name/email/role/status.
export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const me = await requirePermission("user.update");
    if (!me) return unauthorized();

    const { id } = await ctx.params;
    const body = await request.json();
    const parsed = userUpdateByAdminSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return notFound("User not found");

    // Prevent the last admin from being demoted or deactivated.
    const isRemovingAdmin =
      (parsed.data.role && parsed.data.role !== "admin" && target.role === "admin") ||
      (parsed.data.status && parsed.data.status !== "active" && target.role === "admin");

    if (isRemovingAdmin) {
      const adminCount = await prisma.user.count({ where: { role: "admin", status: "active" } });
      if (adminCount <= 1) {
        return badRequest("Cannot remove the last active admin");
      }
    }

    // Email uniqueness check.
    if (parsed.data.email && parsed.data.email.toLowerCase() !== target.email) {
      const exists = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
      if (exists) return badRequest("A user with this email already exists");
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.email !== undefined ? { email: parsed.data.email.toLowerCase() } : {}),
        ...(parsed.data.role !== undefined ? { role: parsed.data.role } : {}),
        ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        createdById: true,
      },
    });

    const changes: Record<string, { from: unknown; to: unknown }> = {};
    if (parsed.data.role && parsed.data.role !== target.role) {
      changes.role = { from: target.role, to: parsed.data.role };
      await logAudit({
        actorId: me.id,
        action: "user.role_change",
        entity: "user",
        entityId: id,
        targetUserId: id,
        metadata: changes.role,
        request,
      });
    }
    if (parsed.data.status && parsed.data.status !== target.status) {
      await logAudit({
        actorId: me.id,
        action: parsed.data.status === "active" ? "user.activate" : parsed.data.status === "inactive" ? "user.deactivate" : "user.update",
        entity: "user",
        entityId: id,
        targetUserId: id,
        metadata: { from: target.status, to: parsed.data.status },
        request,
      });
    }
    await logAudit({
      actorId: me.id,
      action: "user.update",
      entity: "user",
      entityId: id,
      targetUserId: id,
      metadata: { changes },
      request,
    });

    return success({ user: { ...updated, hasPassword: true } });
  } catch (error) {
    console.error("Update user error:", error);
    return serverError();
  }
}

// DELETE /api/users/[id] - Hard delete (cascade removes audit logs & invitations).
export async function DELETE(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const me = await requirePermission("user.delete");
    if (!me) return unauthorized();

    const { id } = await ctx.params;
    if (id === me.id) return badRequest("You cannot delete your own account");

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return notFound("User not found");

    if (target.role === "admin") {
      const adminCount = await prisma.user.count({ where: { role: "admin" } });
      if (adminCount <= 1) return badRequest("Cannot delete the last admin");
    }

    await prisma.user.delete({ where: { id } });

    await logAudit({
      actorId: me.id,
      action: "user.delete",
      entity: "user",
      entityId: id,
      targetUserId: id,
      metadata: { email: target.email, role: target.role },
      request,
    });

    return success({ success: true });
  } catch (error) {
    console.error("Delete user error:", error);
    return serverError();
  }
}