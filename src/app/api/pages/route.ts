import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pageCreateSchema, pageReorderSchema, pageUpdateSchema } from "@/lib/validations";
import { unauthorized, badRequest, notFound, success, created, forbidden } from "@/lib/api-response";
import { requirePermission } from "@/lib/auth";

// GET /api/pages?storyId=xxx - Get all pages for a story
export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission("story.read");
    if (!user) return unauthorized();

    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get("storyId");
    if (!storyId) return badRequest("storyId is required");

    const pages = await prisma.storyPage.findMany({
      where: { storyId },
      orderBy: { pageNumber: "asc" },
    });

    return success(pages);
  } catch (error) {
    console.error("List pages error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/pages - Create a page
export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission("story.create");
    if (!user) return forbidden();

    const body = await request.json();

    // Check if this is a reorder request
    if (body.pages) {
      const parsed = pageReorderSchema.safeParse(body);
      if (!parsed.success) return badRequest(parsed.error.issues[0].message);

      const storyId = parsed.data.pages[0]?.id
        ? (await prisma.storyPage.findUnique({ where: { id: parsed.data.pages[0].id }, select: { storyId: true } }))?.storyId
        : null;

      if (!storyId) return badRequest("Invalid page IDs");

      await prisma.$transaction(
        parsed.data.pages.map((p) =>
          prisma.storyPage.update({
            where: { id: p.id },
            data: { pageNumber: p.pageNumber },
          })
        )
      );

      return success({ message: "Pages reordered successfully" });
    }

    // Regular page creation
    const parsed = pageCreateSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);

    if (!body.storyId) return badRequest("storyId is required");

    // Verify story exists
    const story = await prisma.story.findUnique({ where: { id: body.storyId } });
    if (!story) return notFound("Story not found");

    const page = await prisma.storyPage.create({
      data: {
        storyId: body.storyId,
        pageNumber: parsed.data.pageNumber,
        sceneDescription: parsed.data.sceneDescription,
        storyText: parsed.data.storyText,
        imagePrompt: parsed.data.imagePrompt,
        notes: parsed.data.notes,
      },
    });

    // Update story page count
    const pageCount = await prisma.storyPage.count({ where: { storyId: body.storyId } });
    await prisma.story.update({
      where: { id: body.storyId },
      data: { pageCount },
    });

    return created(page);
  } catch (error) {
    console.error("Create page error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
