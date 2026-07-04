import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ageGroupUpdateSchema } from "@/lib/validations";
import { badRequest, success, forbidden, notFound } from "@/lib/api-response";
import { requirePermission } from "@/lib/auth";

// PATCH /api/settings/age-groups/[id] - Admin only.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission("settings.manage");
    if (!user) return forbidden();

    const { id } = await params;
    const body = await request.json();
    const parsed = ageGroupUpdateSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);

    try {
      const ageGroup = await prisma.ageGroup.update({ where: { id }, data: parsed.data });
      return success(ageGroup);
    } catch (e: unknown) {
      if (e && typeof e === "object" && "code" in e) {
        const code = (e as { code?: string }).code;
        if (code === "P2025") return notFound("Age group not found");
        if (code === "P2002") return badRequest("An age group with this name already exists");
      }
      throw e;
    }
  } catch (error) {
    console.error("Update age group error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/settings/age-groups/[id] - Admin only.
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission("settings.manage");
    if (!user) return forbidden();

    const { id } = await params;
    const ageGroup = await prisma.ageGroup.findUnique({ where: { id } });
    if (!ageGroup) return notFound("Age group not found");

    const usage = await prisma.story.count({ where: { ageGroupId: ageGroup.id } });
    if (usage > 0) {
      return badRequest(
        `Cannot delete "${ageGroup.name}" — it is used by ${usage} stor${usage === 1 ? "y" : "ies"}.`
      );
    }

    await prisma.ageGroup.delete({ where: { id } });
    return success({ deleted: true });
  } catch (error) {
    console.error("Delete age group error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
