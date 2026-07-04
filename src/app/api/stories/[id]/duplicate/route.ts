import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forbidden, notFound, created } from "@/lib/api-response";
import { requirePermission } from "@/lib/auth";
import { serializeStory, storyLookupInclude } from "@/lib/story-view";

// POST /api/stories/[id]/duplicate - Editors and admins can duplicate.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission("story.create");
    if (!user) return forbidden();

    const { id } = await params;
    const original = await prisma.story.findUnique({
      where: { id },
      include: {
        ...storyLookupInclude,
        pages: { orderBy: { pageNumber: "asc" } },
        tags: { include: { tag: true } },
      },
    });

    if (!original) return notFound("Story not found");

    const duplicate = await prisma.story.create({
      data: {
        title: `${original.title} (Copy)`,
        ageGroupLookup: { connect: { id: original.ageGroupId } },
        genreLookup: { connect: { id: original.genreId } },
        characterGenderLookup: { connect: { id: original.characterGenderId } },
        createdById: user.id,
        tags: original.tags.length > 0
          ? {
              create: original.tags.map((t) => ({
                tag: { connect: { id: t.tag.id } },
              })),
            }
          : undefined,
        pages: {
          create: original.pages.map((p) => ({
            pageNumber: p.pageNumber,
            title: p.title ?? `Page ${p.pageNumber}`,
            sceneDescription: p.sceneDescription,
            storyText: p.storyText,
            imagePrompt: p.imagePrompt,
            notes: p.notes,
          })),
        },
      },
      include: {
        ...storyLookupInclude,
        pages: true,
        tags: { include: { tag: true } },
      },
    });

    return created({
      ...serializeStory(duplicate),
      tagList: duplicate.tags.map((t) => t.tag),
      tags: undefined,
    });
  } catch (error) {
    console.error("Duplicate story error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
