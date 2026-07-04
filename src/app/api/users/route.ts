import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { userInviteSchema, userSearchSchema } from "@/lib/validations";
import { requirePermission, generateToken, hoursFromNow } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { badRequest, unauthorized, created, success, serverError } from "@/lib/api-response";
import { toPublicUser } from "@/lib/user-view";
import { allowDevInviteUrl, buildAppUrl, isEmailConfigured, sendInvitationEmail } from "@/lib/email";

// GET /api/users - List users (Admin only). Supports search & filtering.
export async function GET(request: NextRequest) {
  try {
    const me = await requirePermission("user.read");
    if (!me) return unauthorized();

    const { searchParams } = new URL(request.url);
    const filters = userSearchSchema.parse(Object.fromEntries(searchParams));

    const where: Record<string, unknown> = {};
    if (filters.query) {
      where.OR = [
        { name: { contains: filters.query, mode: "insensitive" } },
        { email: { contains: filters.query, mode: "insensitive" } },
      ];
    }
    if (filters.role) where.role = filters.role;
    if (filters.status) where.status = filters.status;

    const orderBy: Record<string, string> = {};
    orderBy[filters.sortBy] = filters.sortOrder;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy,
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
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
      }),
      prisma.user.count({ where }),
    ]);

    return success({
      users: users.map((u) => ({ ...u, hasPassword: true })),
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    });
  } catch (error) {
    console.error("List users error:", error);
    return serverError();
  }
}

// POST /api/users - Admin invites a new user. Creates the user (status=pending,
// no password) and an invitation token valid for 72 hours.
export async function POST(request: NextRequest) {
  try {
    const me = await requirePermission("user.create");
    if (!me) return unauthorized();

    const body = await request.json();
    const parsed = userInviteSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);

    const { name, email, role } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) return badRequest("A user with this email already exists");
    if (!isEmailConfigured() && !allowDevInviteUrl()) {
      return badRequest("Email delivery is not configured");
    }

    const invitationToken = generateToken();
    const expiresAt = hoursFromNow(72);

    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        role,
        status: "pending",
        password: null,
        createdById: me.id,
        invitations: {
          create: {
            token: invitationToken,
            invitedBy: me.id,
            expiresAt,
          },
        },
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

    await logAudit({
      actorId: me.id,
      action: "user.create",
      entity: "user",
      entityId: user.id,
      targetUserId: user.id,
      metadata: { name, email: normalizedEmail, role },
      request,
    });

    await logAudit({
      actorId: me.id,
      action: "invitation.sent",
      entity: "user",
      entityId: user.id,
      targetUserId: user.id,
      metadata: { expiresAt },
      request,
    });

    const activationUrl = buildAppUrl(`/activate?token=${invitationToken}`);
    if (isEmailConfigured()) {
      await sendInvitationEmail({
        to: user.email,
        name: user.name || user.email,
        activationUrl,
        expiresAt,
      });
    }

    return created({
      user: { ...user, hasPassword: false },
      emailSent: isEmailConfigured(),
      ...(allowDevInviteUrl() ? { activationUrl } : {}),
      expiresAt,
    });
  } catch (error) {
    console.error("Create user error:", error);
    return serverError();
  }
}
