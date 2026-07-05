import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/invitations/preview?token=... - Public. Validate an invitation token
// and return minimal user info (name, email) so the activation page can greet
// the user. Does not reveal sensitive fields.
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");
    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        user: { select: { id: true, email: true, name: true, status: true } },
      },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Invalid invitation link" }, { status: 404 });
    }
    if (invitation.acceptedAt) {
      return NextResponse.json({ error: "This invitation has already been used" }, { status: 410 });
    }
    if (invitation.expiresAt < new Date()) {
      return NextResponse.json({ error: "This invitation has expired" }, { status: 410 });
    }

    return NextResponse.json({
      email: invitation.user.email,
      name: invitation.user.name,
      expiresAt: invitation.expiresAt,
    });
  } catch (error) {
    console.error("Invitation preview error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}