import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { characterGenderCreateSchema } from "@/lib/validations";
import { badRequest, success, created, forbidden } from "@/lib/api-response";
import { requirePermission } from "@/lib/auth";

// GET /api/settings/genders - Admin only.
export async function GET() {
  try {
    const user = await requirePermission("settings.manage");
    if (!user) return forbidden();

    const genders = await prisma.characterGender.findMany({
      orderBy: [{ order: "asc" }, { name: "asc" }],
    });
    return success({ genders });
  } catch (error) {
    console.error("List genders error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/settings/genders - Admin only.
export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission("settings.manage");
    if (!user) return forbidden();

    const body = await request.json();
    const parsed = characterGenderCreateSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);

    let order = parsed.data.order;
    if (order === undefined) {
      const last = await prisma.characterGender.findFirst({ orderBy: { order: "desc" } });
      order = (last?.order ?? -1) + 1;
    }

    try {
      const gender = await prisma.characterGender.create({
        data: { name: parsed.data.name, order },
      });
      return created(gender);
    } catch (e: unknown) {
      if (e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "P2002") {
        return badRequest("A gender with this name already exists");
      }
      throw e;
    }
  } catch (error) {
    console.error("Create gender error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}