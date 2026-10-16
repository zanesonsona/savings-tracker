import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseIdParam } from "@/lib/validation";

// DELETE /api/incomes/[id] → 204 / 404 (deleting entries is always allowed, D9).
export async function DELETE(_request: Request, ctx: RouteContext<"/api/incomes/[id]">) {
  const { id: rawId } = await ctx.params;
  const id = parseIdParam(rawId);
  if (id === null) {
    return NextResponse.json({ error: "Invalid income id" }, { status: 400 });
  }

  const existing = await prisma.income.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Income not found" }, { status: 404 });
  }

  await prisma.income.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
