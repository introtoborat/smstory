import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ageGroupCreateSchema } from "@/lib/validations";
import { badRequest, success, created, forbidden } from "@/lib/api-response";
import { requirePermission } from "@/lib/auth";

// GET /api/settings/age-groups - Admin only.
export async function GET() {
  try {
    const user = await requirePermission("settings.manage");
    if (!user) return forbidden();

    const ageGroups = await prisma.ageGroup.findMany({
      orderBy: [{ order: "asc" }, { name: "asc" }],
    });
    return success({ ageGroups });
  } catch (error) {
    console.error("List age groups error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/settings/age-groups - Admin only.
export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission("settings.manage");
    if (!user) return forbidden();

    const body = await request.json();
    const parsed = ageGroupCreateSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);

    let order = parsed.data.order;
    if (order === undefined) {
      const last = await prisma.ageGroup.findFirst({ orderBy: { order: "desc" } });
      order = (last?.order ?? -1) + 1;
    }

    try {
      const ageGroup = await prisma.ageGroup.create({
        data: { name: parsed.data.name, order },
      });
      return created(ageGroup);
    } catch (e: unknown) {
      if (e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "P2002") {
        return badRequest("An age group with this name already exists");
      }
      throw e;
    }
  } catch (error) {
    console.error("Create age group error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}