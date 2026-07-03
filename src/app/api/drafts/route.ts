import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { draftSaveSchema } from "@/lib/validations";
import { badRequest, success, forbidden } from "@/lib/api-response";
import { requirePermission } from "@/lib/auth";

// GET /api/drafts?storyId=xxx - Drafts are scoped to the authenticated owner.
export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission("draft.manage");
    if (!user) return forbidden();

    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get("storyId");

    const where: Record<string, unknown> = { userId: user.id };
    if (storyId) where.storyId = storyId;
    const drafts = await prisma.draft.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: storyId ? 1 : 20,
    });

    return success(drafts);
  } catch (error) {
    console.error("Get drafts error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/drafts - Save/update draft (editors + admins only).
export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission("draft.manage");
    if (!user) return forbidden();

    const body = await request.json();
    const parsed = draftSaveSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);

    const existing = parsed.data.storyId
      ? await prisma.draft.findFirst({ where: { userId: user.id, storyId: parsed.data.storyId } })
      : null;

    const draft = existing
      ? await prisma.draft.update({
          where: { id: existing.id },
          data: { data: parsed.data.data },
        })
      : await prisma.draft.create({
          data: { userId: user.id, storyId: parsed.data.storyId, data: parsed.data.data },
        });

    return success(draft);
  } catch (error) {
    console.error("Save draft error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/drafts?id=xxx
export async function DELETE(request: NextRequest) {
  try {
    const user = await requirePermission("draft.manage");
    if (!user) return forbidden();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return badRequest("Draft id is required");

    const deleted = await prisma.draft.deleteMany({ where: { id, userId: user.id } });
    if (deleted.count === 0) return badRequest("Draft not found");

    return success({ message: "Draft deleted" });
  } catch (error) {
    console.error("Delete draft error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
