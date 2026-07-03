import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, unauthorized } from "@/lib/api-response";
import { requirePermission } from "@/lib/auth";

// GET /api/settings/lookups — combined lookup endpoint for editor/filters.
// Returns active genres, age groups, and genders in one call. Any logged-in
// user can read lookups (the editor needs them to fill story forms).
export async function GET() {
  try {
    const user = await requirePermission("story.read");
    if (!user) return unauthorized();

    const [genres, ageGroups, genders] = await Promise.all([
      prisma.genre.findMany({ orderBy: [{ order: "asc" }, { name: "asc" }] }),
      prisma.ageGroup.findMany({ orderBy: [{ order: "asc" }, { name: "asc" }] }),
      prisma.characterGender.findMany({ orderBy: [{ order: "asc" }, { name: "asc" }] }),
    ]);

    return success({ genres, ageGroups, genders });
  } catch (error) {
    console.error("Lookups error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}