import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auditSearchSchema } from "@/lib/validations";
import { requirePermission } from "@/lib/auth";
import { success, unauthorized, serverError } from "@/lib/api-response";

// GET /api/audit - Admin-only audit log query with filters & pagination.
export async function GET(request: NextRequest) {
  try {
    const me = await requirePermission("user.viewActivityLog");
    if (!me) return unauthorized();

    const { searchParams } = new URL(request.url);
    const filters = auditSearchSchema.parse(Object.fromEntries(searchParams));

    const where: Record<string, unknown> = {};
    if (filters.actorId) where.actorId = filters.actorId;
    if (filters.targetUserId) where.targetUserId = filters.targetUserId;
    if (filters.action) where.action = filters.action;
    if (filters.query) {
      where.OR = [
        { action: { contains: filters.query, mode: "insensitive" } },
        { entity: { contains: filters.query, mode: "insensitive" } },
        { ip: { contains: filters.query, mode: "insensitive" } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
        include: {
          actor: { select: { id: true, name: true, email: true, role: true } },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return success({
      logs,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    });
  } catch (error) {
    console.error("Audit log error:", error);
    return serverError();
  }
}