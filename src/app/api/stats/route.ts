import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { unauthorized, success } from "@/lib/api-response";
import { requirePermission } from "@/lib/auth";
import { serializeStory, storyLookupInclude } from "@/lib/story-view";

// GET /api/stats
export async function GET() {
  try {
    const user = await requirePermission("stats.read");
    if (!user) return unauthorized();

    const [
      totalStories,
      totalPages,
      storiesByAgeGroup,
      storiesByGenre,
      storiesByGender,
      recentStories,
      avgPagesPerStory,
      tagsCount,
      ageGroups,
      genres,
      genders,
    ] = await Promise.all([
      prisma.story.count(),
      prisma.storyPage.count(),
      prisma.story.groupBy({ by: ["ageGroupId"], _count: true }),
      prisma.story.groupBy({ by: ["genreId"], _count: true }),
      prisma.story.groupBy({ by: ["characterGenderId"], _count: true }),
      prisma.story.findMany({
        orderBy: { updatedAt: "desc" },
        take: 5,
        include: { ...storyLookupInclude, tags: { include: { tag: true } } },
      }),
      prisma.story.aggregate({ _avg: { pageCount: true }, _sum: { pageCount: true } }),
      prisma.tag.count(),
      prisma.ageGroup.findMany({ select: { id: true, name: true } }),
      prisma.genre.findMany({ select: { id: true, name: true } }),
      prisma.characterGender.findMany({ select: { id: true, name: true } }),
    ]);

    const ageGroupNames = new Map(ageGroups.map((g) => [g.id, g.name]));
    const genreNames = new Map(genres.map((g) => [g.id, g.name]));
    const genderNames = new Map(genders.map((g) => [g.id, g.name]));

    return success({
      totalStories,
      totalPages,
      avgPagesPerStory: Math.round((avgPagesPerStory._avg.pageCount || 0) * 10) / 10,
      totalWords: avgPagesPerStory._sum.pageCount || 0,
      storiesByAgeGroup: storiesByAgeGroup.map((g) => ({ name: ageGroupNames.get(g.ageGroupId) || "Unknown", count: g._count })),
      storiesByGenre: storiesByGenre.map((g) => ({ name: genreNames.get(g.genreId) || "Unknown", count: g._count })),
      storiesByGender: storiesByGender.map((g) => ({ name: genderNames.get(g.characterGenderId) || "Unknown", count: g._count })),
      recentStories: recentStories.map((s) => ({
        ...serializeStory(s),
        tagList: s.tags.map((t) => t.tag),
        tags: undefined,
      })),
      tagsCount,
    });
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
