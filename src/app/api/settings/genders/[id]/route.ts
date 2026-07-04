import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { characterGenderUpdateSchema } from "@/lib/validations";
import { badRequest, success, forbidden, notFound } from "@/lib/api-response";
import { requirePermission } from "@/lib/auth";

// PATCH /api/settings/genders/[id] - Admin only.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission("settings.manage");
    if (!user) return forbidden();

    const { id } = await params;
    const body = await request.json();
    const parsed = characterGenderUpdateSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);

    try {
      const gender = await prisma.characterGender.update({ where: { id }, data: parsed.data });
      return success(gender);
    } catch (e: unknown) {
      if (e && typeof e === "object" && "code" in e) {
        const code = (e as { code?: string }).code;
        if (code === "P2025") return notFound("Gender not found");
        if (code === "P2002") return badRequest("A gender with this name already exists");
      }
      throw e;
    }
  } catch (error) {
    console.error("Update gender error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/settings/genders/[id] - Admin only.
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission("settings.manage");
    if (!user) return forbidden();

    const { id } = await params;
    const gender = await prisma.characterGender.findUnique({ where: { id } });
    if (!gender) return notFound("Gender not found");

    const usage = await prisma.story.count({ where: { characterGenderId: gender.id } });
    if (usage > 0) {
      return badRequest(
        `Cannot delete "${gender.name}" — it is used by ${usage} stor${usage === 1 ? "y" : "ies"}.`
      );
    }

    await prisma.characterGender.delete({ where: { id } });
    return success({ deleted: true });
  } catch (error) {
    console.error("Delete gender error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
