import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { genreUpdateSchema } from "@/lib/validations";
import { badRequest, success, forbidden, notFound } from "@/lib/api-response";
import { requirePermission } from "@/lib/auth";

// PATCH /api/settings/genres/[id] - Admin only.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission("settings.manage");
    if (!user) return forbidden();

    const { id } = await params;
    const body = await request.json();
    const parsed = genreUpdateSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);

    try {
      const genre = await prisma.genre.update({ where: { id }, data: parsed.data });
      return success(genre);
    } catch (e: unknown) {
      if (e && typeof e === "object" && "code" in e) {
        const code = (e as { code?: string }).code;
        if (code === "P2025") return notFound("Genre not found");
        if (code === "P2002") return badRequest("A genre with this name already exists");
      }
      throw e;
    }
  } catch (error) {
    console.error("Update genre error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/settings/genres/[id] - Admin only.
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission("settings.manage");
    if (!user) return forbidden();

    const { id } = await params;
    const genre = await prisma.genre.findUnique({ where: { id } });
    if (!genre) return notFound("Genre not found");

    const usage = await prisma.story.count({ where: { genreId: genre.id } });
    if (usage > 0) {
      return badRequest(
        `Cannot delete "${genre.name}" — it is used by ${usage} stor${usage === 1 ? "y" : "ies"}.`
      );
    }

    await prisma.genre.delete({ where: { id } });
    return success({ deleted: true });
  } catch (error) {
    console.error("Delete genre error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
