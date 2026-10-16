import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatPercentBp } from "@/lib/money";
import { toCategoryDTO } from "@/lib/types";
import { categoryUpdateSchema, zodErrorMessage } from "@/lib/validation";

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// PATCH /api/categories/[id] → 200 with the updated CategoryDTO.
export async function PATCH(request: Request, ctx: RouteContext<"/api/categories/[id]">) {
  const { id: rawId } = await ctx.params;
  const id = parseId(rawId);
  if (id === null) {
    return NextResponse.json({ error: "Invalid category id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const parsed = categoryUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: zodErrorMessage(parsed.error) }, { status: 400 });
  }
  const { name, percentage, kind, color } = parsed.data;

  const current = await prisma.category.findUnique({ where: { id } });
  if (!current) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  const others = await prisma.category.findMany({
    where: { id: { not: id } },
    select: { name: true, percentage: true },
  });

  if (name !== undefined) {
    const duplicate = others.find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (duplicate) {
      return NextResponse.json(
        { error: `A category named "${duplicate.name}" already exists` },
        { status: 409 },
      );
    }
  }

  if (percentage !== undefined) {
    const totalBp = others.reduce((sum, c) => sum + Math.round(c.percentage * 100), 0) +
      Math.round(percentage * 100);
    if (totalBp > 10001) {
      return NextResponse.json(
        { error: `Total allocation cannot exceed 100% (would be ${formatPercentBp(totalBp)}%)` },
        { status: 400 },
      );
    }
  }

  const updated = await prisma.category.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(percentage !== undefined && { percentage }),
      ...(kind !== undefined && { kind }),
      ...(color !== undefined && { color }),
    },
    include: { _count: { select: { expenses: true, savingsEntries: true } } },
  });

  return NextResponse.json(
    toCategoryDTO(updated, updated._count.expenses, updated._count.savingsEntries),
  );
}

// DELETE /api/categories/[id] → 204; 409 when expenses/savings entries exist (D9).
export async function DELETE(_request: Request, ctx: RouteContext<"/api/categories/[id]">) {
  const { id: rawId } = await ctx.params;
  const id = parseId(rawId);
  if (id === null) {
    return NextResponse.json({ error: "Invalid category id" }, { status: 400 });
  }

  const category = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { expenses: true, savingsEntries: true } } },
  });
  if (!category) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  const expenseCount = category._count.expenses;
  const savingsCount = category._count.savingsEntries;
  if (expenseCount > 0 || savingsCount > 0) {
    return NextResponse.json(
      {
        error: `Cannot delete "${category.name}" — it has ${expenseCount} expense(s) and ${savingsCount} savings entry(ies). Delete those entries first.`,
      },
      { status: 409 },
    );
  }

  await prisma.category.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
