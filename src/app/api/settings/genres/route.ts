import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { genreCreateSchema } from "@/lib/validations";
import { badRequest, success, created, forbidden } from "@/lib/api-response";
import { requirePermission } from "@/lib/auth";

// GET /api/settings/genres - Read (all logged-in users can list).
export async function GET() {
  try {
    const user = await requirePermission("settings.manage");
    if (!user) return forbidden();

    const genres = await prisma.genre.findMany({
      orderBy: [{ order: "asc" }, { name: "asc" }],
    });
    return success({ genres });
  } catch (error) {
    console.error("List genres error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/settings/genres - Admin only.
export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission("settings.manage");
    if (!user) return forbidden();

    const body = await request.json();
    const parsed = genreCreateSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);

    let order = parsed.data.order;
    if (order === undefined) {
      const last = await prisma.genre.findFirst({ orderBy: { order: "desc" } });
      order = (last?.order ?? -1) + 1;
    }

    try {
      const genre = await prisma.genre.create({
        data: { name: parsed.data.name, color: parsed.data.color ?? "#6366f1", order },
      });
      return created(genre);
    } catch (e: unknown) {
      if (e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "P2002") {
        return badRequest("A genre with this name already exists");
      }
      throw e;
    }
  } catch (error) {
    console.error("Create genre error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}