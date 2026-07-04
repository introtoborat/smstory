import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { pageNameSuggestionCreateSchema } from "@/lib/validations";
import { badRequest, created, success, forbidden } from "@/lib/api-response";
import { requirePermission } from "@/lib/auth";

// GET /api/settings/page-name-suggestions
export async function GET() {
  try {
    const user = await requirePermission("settings.manage");
    if (!user) return forbidden();
    try {
      const items = await prisma.pageNameSuggestion.findMany({ orderBy: { order: "asc" } });
      return success({ suggestions: items });
    } catch (e: any) {
      // If table doesn't exist (P2021), create it and retry
      if (e?.code === "P2021") {
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "PageNameSuggestion" (
            "id" TEXT PRIMARY KEY,
            "name" TEXT NOT NULL UNIQUE,
            "order" INTEGER NOT NULL DEFAULT 0,
            "enabled" BOOLEAN NOT NULL DEFAULT TRUE,
            "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `);
        const items = await prisma.pageNameSuggestion.findMany({ orderBy: { order: "asc" } });
        return success({ suggestions: items });
      }
      throw e;
    }
  } catch (error) {
    console.error("List page name suggestions error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
}

// POST /api/settings/page-name-suggestions
export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission("settings.manage");
    if (!user) return forbidden();

    const body = await request.json();
    const parsed = pageNameSuggestionCreateSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);

    let order = parsed.data.order;
    if (order === undefined) {
      try {
        const last = await prisma.pageNameSuggestion.findFirst({ orderBy: { order: "desc" } });
        order = (last?.order ?? -1) + 1;
      } catch (e: any) {
        if (e?.code === "P2021") {
          await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "PageNameSuggestion" (
              "id" TEXT PRIMARY KEY,
              "name" TEXT NOT NULL UNIQUE,
              "order" INTEGER NOT NULL DEFAULT 0,
              "enabled" BOOLEAN NOT NULL DEFAULT TRUE,
              "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
              "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
          `);
          const last = await prisma.pageNameSuggestion.findFirst({ orderBy: { order: "desc" } });
          order = (last?.order ?? -1) + 1;
        } else throw e;
      }
    }

    try {
      const item = await prisma.pageNameSuggestion.create({ data: { name: parsed.data.name, order, enabled: parsed.data.enabled ?? true } });
      return created(item);
    } catch (e: unknown) {
      console.error(e);
      return badRequest("Failed to create suggestion");
    }
  } catch (error) {
    console.error("Create page name suggestion error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
}
