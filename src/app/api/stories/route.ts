import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { storyCreateSchema, storySearchSchema } from "@/lib/validations";
import { unauthorized, badRequest, success, created, forbidden } from "@/lib/api-response";
import { requirePermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { isLookupConnectError, serializeStory, storyLookupInclude } from "@/lib/story-view";

// GET /api/stories - List/Search stories
export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission("story.read");
    if (!user) return unauthorized();

    const { searchParams } = new URL(request.url);
    const filters = storySearchSchema.parse(Object.fromEntries(searchParams));

    const where: Record<string, unknown> = {};

    if (filters.query) {
      where.OR = [
        { title: { contains: filters.query, mode: "insensitive" } },
        { pages: { some: { storyText: { contains: filters.query, mode: "insensitive" } } } },
      ];
    }

    if (filters.ageGroup) where.ageGroupLookup = { name: filters.ageGroup };
    if (filters.genre) where.genreLookup = { name: filters.genre };
    if (filters.characterGender) where.characterGenderLookup = { name: filters.characterGender };

    if (filters.pageMin !== undefined || filters.pageMax !== undefined) {
      (where.pageCount as Record<string, number>) = {};
      if (filters.pageMin !== undefined) (where.pageCount as Record<string, number>).gte = filters.pageMin;
      if (filters.pageMax !== undefined) (where.pageCount as Record<string, number>).lte = filters.pageMax;
    }

    const orderBy: Record<string, string> = {};
    orderBy[filters.sortBy] = filters.sortOrder;

    const [stories, total] = await Promise.all([
      prisma.story.findMany({
        where,
        orderBy,
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
        include: {
          ...storyLookupInclude,
          tags: { include: { tag: true } },
          _count: { select: { pages: true } },
        },
      }),
      prisma.story.count({ where }),
    ]);

    return success({
      stories: stories.map((s) => ({
        ...serializeStory(s),
        tagList: s.tags.map((t) => t.tag),
        tags: undefined,
      })),
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    });
  } catch (error) {
    console.error("List stories error:", error);
    if (error instanceof Error && error.message.includes("Invalid")) {
      return badRequest(error.message);
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/stories - Create story
export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission("story.create");
    if (!user) return forbidden();

    const body = await request.json();
    const parsed = storyCreateSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0].message);
    }

    const story = await prisma.story.create({
      data: {
        title: parsed.data.title,
        ageGroupLookup: { connect: { name: parsed.data.ageGroup } },
        genreLookup: { connect: { name: parsed.data.genre } },
        characterGenderLookup: { connect: { name: parsed.data.characterGender } },
        createdById: user.id,
        tags: parsed.data.tags
          ? {
              create: parsed.data.tags.map((tagName) => ({
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
      action: "story.create",
      entity: "story",
      entityId: story.id,
      metadata: { title: story.title },
      request,
    });

    return created({
      ...serializeStory(story),
      tagList: story.tags.map((t) => t.tag),
      tags: undefined,
    });
  } catch (error) {
    console.error("Create story error:", error);
    if (isLookupConnectError(error)) {
      return badRequest("Selected age group, genre, or character gender does not exist");
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
