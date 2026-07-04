import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requestPasswordResetSchema } from "@/lib/validations";
import { generateToken, hoursFromNow } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { allowDevResetUrl, buildAppUrl, isEmailConfigured, sendPasswordResetEmail } from "@/lib/email";
import { authLimiter, checkRateLimit } from "@/lib/upstash";

// POST /api/password-resets - Public. User requests a password reset for
// their own account. Always returns success to avoid leaking which emails
// are registered; the reset URL is only included for development convenience.
export async function POST(request: NextRequest) {
  // Strict rate limit: prevent abuse of password-reset endpoint
  const rateLimitResponse = await checkRateLimit(authLimiter, request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = await request.json();
    const parsed = requestPasswordResetSchema.safeParse(body);
    if (!parsed.success) {
      // Still return success — don't leak account existence or schema details.
      return NextResponse.json({ success: true });
    }

    const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });

    if (user && user.status === "active") {
      const token = generateToken();
      const expiresAt = hoursFromNow(1);
      await prisma.passwordReset.create({
        data: { userId: user.id, token, triggeredBy: "self", expiresAt },
      });
      await logAudit({
        actorId: user.id,
        action: "password.reset_request",
        entity: "user",
        entityId: user.id,
        targetUserId: user.id,
        metadata: { triggeredBy: "self" },
        request,
      });
      const resetUrl = buildAppUrl(`/reset-password?token=${token}`);
      if (isEmailConfigured()) {
        try {
          await sendPasswordResetEmail({
            to: user.email,
            name: user.name || user.email,
            resetUrl,
            expiresAt,
          });
        } catch (error) {
          console.error("Password reset email failed:", error);
        }
      }

      if (allowDevResetUrl()) {
        return NextResponse.json({ success: true, resetUrl, expiresAt });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Request reset error:", error);
    return NextResponse.json({ success: true });
  }
}
