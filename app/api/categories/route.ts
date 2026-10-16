import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatPercentBp } from "@/lib/money";
import { toCategoryDTO } from "@/lib/types";
import { categoryCreateSchema, zodErrorMessage } from "@/lib/validation";

// GET /api/categories → CategoryDTO[] ordered by id (t05: includes usage counts).
export async function GET() {
  const categories = await prisma.category.findMany({
    orderBy: { id: "asc" },
    include: { _count: { select: { expenses: true, savingsEntries: true } } },
  });

  return NextResponse.json(
    categories.map((c) => toCategoryDTO(c, c._count.expenses, c._count.savingsEntries)),
  );
}

// POST /api/categories → 201 with the created CategoryDTO.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const parsed = categoryCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: zodErrorMessage(parsed.error) }, { status: 400 });
  }
  const { name, percentage, kind, color } = parsed.data;

  // `name` is @unique but SQLite compares case-sensitively → check in JS.
  const existing = await prisma.category.findMany({
    select: { id: true, name: true, percentage: true },
  });

  const duplicate = existing.find((c) => c.name.toLowerCase() === name.toLowerCase());
  if (duplicate) {
    return NextResponse.json(
      { error: `A category named "${duplicate.name}" already exists` },
      { status: 409 },
    );
  }

  // Σ% must stay ≤ 100.01 (basis-point integer math — §7 / D5).
  const totalBp = existing.reduce((sum, c) => sum + Math.round(c.percentage * 100), 0) +
    Math.round(percentage * 100);
  if (totalBp > 10001) {
    return NextResponse.json(
      { error: `Total allocation cannot exceed 100% (would be ${formatPercentBp(totalBp)}%)` },
      { status: 400 },
    );
  }

  const created = await prisma.category.create({
    data: { name, percentage, kind, color: color ?? null },
  });

  return NextResponse.json(toCategoryDTO(created, 0, 0), { status: 201 });
}
