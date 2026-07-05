import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pageCreateSchema, pageReorderSchema, pageUpdateSchema } from "@/lib/validations";
import { unauthorized, badRequest, notFound, success, created, forbidden } from "@/lib/api-response";
import { requirePermission } from "@/lib/auth";
import { z } from "zod";

const pageBulkCreateSchema = z.object({
  storyId: z.string().min(1),
  pages: z.array(
    pageCreateSchema.extend({ storyText: z.string() })
  ).min(1),
});

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

    // Check if this is a bulk-create request
    if (body.storyId && body.pages && Array.isArray(body.pages) && body.pages.length > 0 && !body.pages[0]?.id) {
      const parsed = pageBulkCreateSchema.safeParse(body);
      if (!parsed.success) {
        console.error("Bulk create validation error:", JSON.stringify(parsed.error.issues));
        return badRequest(parsed.error.issues[0].message);
      }

      const story = await prisma.story.findUnique({ where: { id: parsed.data.storyId } });
      if (!story) return notFound("Story not found");

      // Delete any previously saved pages for this story before re-inserting
      // (handles retries and partial saves from earlier attempts)
      await prisma.storyPage.deleteMany({ where: { storyId: parsed.data.storyId } });

      // Re-assign page numbers sequentially (1-based) before inserting
      const pagesData = parsed.data.pages.map((p, i) => ({
        storyId: parsed.data.storyId,
        title: p.title?.trim() || `Page ${i + 1}`,
        pageNumber: i + 1,
        sceneDescription: p.sceneDescription ?? null,
        storyText: p.storyText,
        imagePrompt: p.imagePrompt ?? null,
        notes: p.notes ?? null,
      }));

      await prisma.storyPage.createMany({ data: pagesData });

      const pageCount = await prisma.storyPage.count({ where: { storyId: parsed.data.storyId } });
      await prisma.story.update({ where: { id: parsed.data.storyId }, data: { pageCount } });

      return created({ count: pagesData.length });
    }

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
        title: parsed.data.title?.trim() || `Page ${parsed.data.pageNumber}`,
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
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Create page error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
