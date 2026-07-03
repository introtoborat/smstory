import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { activateAccountSchema } from "@/lib/validations";
import { hashPassword, createToken, getRequestMeta } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { badRequest, serverError, created } from "@/lib/api-response";
import { cookies } from "next/headers";

// POST /api/invitations/accept - Public. Accept an invitation, set password,
// activate the account, and log the user in.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = activateAccountSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);

    const { token, password } = parsed.data;

    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!invitation) return badRequest("Invalid or expired invitation link");
    if (invitation.acceptedAt) return badRequest("This invitation has already been used");
    if (invitation.expiresAt < new Date()) return badRequest("This invitation has expired");

    const hashed = await hashPassword(password);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: invitation.userId },
        data: { password: hashed, status: "active" },
      }),
      prisma.invitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      }),
    ]);

    const ip = getRequestMeta(request).ip;

    await logAudit({
      actorId: invitation.userId,
      action: "invitation.accepted",
      entity: "user",
      entityId: invitation.userId,
      targetUserId: invitation.userId,
      request,
    });

    // Auto-login the user after activation.
    const authToken = await createToken(invitation.userId);
    const cookieStore = await cookies();
    cookieStore.set("token", authToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return NextResponse.json({
      user: {
        id: invitation.userId,
        email: invitation.user.email,
        name: invitation.user.name,
        role: invitation.user.role,
      },
    });
  } catch (error) {
    console.error("Accept invitation error:", error);
    return serverError();
  }
}