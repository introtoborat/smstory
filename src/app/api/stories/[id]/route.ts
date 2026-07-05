import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { storyUpdateSchema } from "@/lib/validations";
import { unauthorized, badRequest, notFound, success, forbidden } from "@/lib/api-response";
import { requirePermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { isLookupConnectError, serializeStory, storyLookupConnect, storyLookupInclude } from "@/lib/story-view";
import { deleteStoryImage } from "@/lib/cloudinary";

// GET /api/stories/[id] - Get single story with pages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission("story.read");
    if (!user) return unauthorized();

    const { id } = await params;
    const story = await prisma.story.findUnique({
      where: { id },
      include: {
        ...storyLookupInclude,
        pages: { orderBy: { pageNumber: "asc" } },
        tags: { include: { tag: true } },
      },
    });

    if (!story) return notFound("Story not found");

    return success({
      ...serializeStory(story),
      tagList: story.tags.map((t) => t.tag),
      tags: undefined,
    });
  } catch (error) {
    console.error("Get story error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/stories/[id] - Update story
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission("story.update");
    if (!user) return forbidden();

    const { id } = await params;
    const body = await request.json();
    const parsed = storyUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0].message);
    }

    const existing = await prisma.story.findUnique({ where: { id } });
    if (!existing) return notFound("Story not found");

    if (parsed.data.tags) {
      await prisma.storyTag.deleteMany({ where: { storyId: id } });
    }

    const { tags, title, uploadStatus, ...lookupInput } = parsed.data;

    // If coverImageUrl is being cleared or replaced, delete the old Cloudinary image
    if ("coverImageUrl" in parsed.data) {
      const oldPublicId = existing.coverImagePublicId;
      const newUrl = parsed.data.coverImageUrl;
      // Delete old image when it's being removed (null) or replaced (different publicId incoming)
      if (oldPublicId && (newUrl == null || (parsed.data.coverImagePublicId && parsed.data.coverImagePublicId !== oldPublicId))) {
        deleteStoryImage(oldPublicId).catch((err) =>
          console.error("Failed to delete old cover image from Cloudinary:", err)
        );
      }
    }

    const { coverImageUrl, coverImagePublicId, ...restLookupInput } = lookupInput as typeof lookupInput & {
      coverImageUrl?: string | null;
      coverImagePublicId?: string | null;
    };

    const story = await prisma.story.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(uploadStatus !== undefined ? { uploadStatus } : {}),
        ...storyLookupConnect(restLookupInput),
        ...("coverImageUrl" in parsed.data ? { coverImageUrl: coverImageUrl ?? null } : {}),
        ...("coverImagePublicId" in parsed.data ? { coverImagePublicId: coverImagePublicId ?? null } : {}),
        tags: tags
          ? {
              create: tags.map((tagName) => ({
                tag: {
                  connectOrCreate: {
                    where: { name: tagName },
                    create: { name: tagName },
                  },
                },
              })),
            }
          : undefined,
      },
      include: {
        ...storyLookupInclude,
        tags: { include: { tag: true } },
      },
    });

    await logAudit({
      actorId: user.id,
      action: "story.update",
      entity: "story",
      entityId: id,
      metadata: { title: story.title, fields: Object.keys(parsed.data) },
      request,
    });

    return success({
      ...serializeStory(story),
      tagList: story.tags.map((t) => t.tag),
      tags: undefined,
    });
  } catch (error) {
    console.error("Update story error:", error);
    if (isLookupConnectError(error)) {
      return badRequest("Selected age group, genre, or character gender does not exist");
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/stories/[id] - Delete story (Admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission("story.delete");
    if (!user) return forbidden();

    const { id } = await params;
    const existing = await prisma.story.findUnique({ where: { id } });
    if (!existing) return notFound("Story not found");

    await prisma.story.delete({ where: { id } });

    // Clean up cover image from Cloudinary if present
    if (existing.coverImagePublicId) {
      deleteStoryImage(existing.coverImagePublicId).catch((err) =>
        console.error("Failed to delete cover image from Cloudinary:", err)
      );
    }

    await logAudit({
      actorId: user.id,
      action: "story.delete",
      entity: "story",
      entityId: id,
      metadata: { title: existing.title },
      request,
    });

    return success({ message: "Story deleted successfully" });
  } catch (error) {
    console.error("Delete story error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
