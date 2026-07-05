import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getRequestMeta } from "@/lib/auth";

export type AuditAction =
  | "login"
  | "login_failed"
  | "logout"
  | "password.change"
  | "password.reset_request"
  | "password.reset_complete"
  | "invitation.sent"
  | "invitation.accepted"
  | "user.create"
  | "user.update"
  | "user.delete"
  | "user.activate"
  | "user.deactivate"
  | "user.role_change"
  | "story.create"
  | "story.update"
  | "story.delete";

export interface AuditLogInput {
  actorId?: string | null;
  action: AuditAction;
  entity?: string;
  entityId?: string;
  targetUserId?: string;
  metadata?: Record<string, unknown>;
  request?: Request;
}

const SENSITIVE_KEYS = new Set(["password", "currentPassword", "newPassword", "token", "hash"]);

function sanitize(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(sanitize);
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(k)) continue;
      out[k] = sanitize(v);
    }
    return out;
  }
  return value;
}

export async function logAudit(input: AuditLogInput): Promise<void> {
  const { ip, userAgent } = input.request ? getRequestMeta(input.request) : { ip: undefined, userAgent: undefined };
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        targetUserId: input.targetUserId,
        metadata: input.metadata ? (JSON.stringify(sanitize(input.metadata)) as Prisma.InputJsonValue as string) : null,
        ip,
        userAgent,
      },
    });
  } catch (err) {
    // Never let an audit write fail the calling request — just log it.
    console.error("audit log write failed:", err);
  }
}