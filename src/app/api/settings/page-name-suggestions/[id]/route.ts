import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { pageNameSuggestionUpdateSchema } from "@/lib/validations";
import { badRequest, success, forbidden, notFound } from "@/lib/api-response";
import { requirePermission } from "@/lib/auth";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePermission("settings.manage");
    if (!user) return forbidden();

    const { id } = await params;
    const body = await request.json();
    const parsed = pageNameSuggestionUpdateSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);

    try {
      const item = await prisma.pageNameSuggestion.update({ where: { id }, data: parsed.data });
      return success(item);
    } catch (e: unknown) {
      console.error(e);
      return notFound("Suggestion not found");
    }
  } catch (error) {
    console.error("Update page name suggestion error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePermission("settings.manage");
    if (!user) return forbidden();

    const { id } = await params;
    const item = await prisma.pageNameSuggestion.findUnique({ where: { id } });
    if (!item) return notFound("Suggestion not found");

    await prisma.pageNameSuggestion.delete({ where: { id } });
    return success({ deleted: true });
  } catch (error) {
    console.error("Delete page name suggestion error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
}
