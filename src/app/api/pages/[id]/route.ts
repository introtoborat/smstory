import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pageUpdateSchema } from "@/lib/validations";
import { unauthorized, badRequest, notFound, success, forbidden } from "@/lib/api-response";
import { requirePermission } from "@/lib/auth";

// GET /api/pages/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission("story.read");
    if (!user) return unauthorized();

    const { id } = await params;
    const page = await prisma.storyPage.findUnique({ where: { id } });
    if (!page) return notFound("Page not found");

    return success(page);
  } catch (error) {
    console.error("Get page error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/pages/[id] - requires story.update
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission("story.update");
    if (!user) return forbidden();

    const { id } = await params;
    const body = await request.json();
    const parsed = pageUpdateSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);

    const existing = await prisma.storyPage.findUnique({ where: { id } });
    if (!existing) return notFound("Page not found");

    const page = await prisma.storyPage.update({
      where: { id },
      data: parsed.data,
    });

    return success(page);
  } catch (error) {
    console.error("Update page error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/pages/[id] - requires story.update (editors may remove a page
// while editing their own story). Hard delete is reserved for admins via
// the story DELETE endpoint.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission("story.update");
    if (!user) return forbidden();

    const { id } = await params;
    const existing = await prisma.storyPage.findUnique({ where: { id } });
    if (!existing) return notFound("Page not found");

    const storyId = existing.storyId;

    await prisma.storyPage.delete({ where: { id } });

    const remainingPages = await prisma.storyPage.findMany({
      where: { storyId },
      orderBy: { pageNumber: "asc" },
    });

    await prisma.$transaction(
      remainingPages.map((p, index) =>
        prisma.storyPage.update({
          where: { id: p.id },
          data: { pageNumber: index + 1 },
        })
      )
    );

    const pageCount = await prisma.storyPage.count({ where: { storyId } });
    await prisma.story.update({
      where: { id: storyId },
      data: { pageCount },
    });

    return success({ message: "Page deleted successfully" });
  } catch (error) {
    console.error("Delete page error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}