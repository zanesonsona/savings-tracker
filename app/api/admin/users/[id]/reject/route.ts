import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toUserDTO } from "@/lib/types";
import { parseIdParam } from "@/lib/validation";

// POST /api/admin/users/[id]/reject → 200 { user } (T27).
// Guards: unknown id → 404; an admin cannot decide their own account → 400;
// ADMIN accounts can never be rejected (no last-admin lockout) → 400;
// only PENDING registrations can be decided → 409 `Registration already decided`.
export async function POST(_request: Request, ctx: RouteContext<"/api/admin/users/[id]/reject">) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const { id: rawId } = await ctx.params;
  const id = parseIdParam(rawId);
  if (id === null) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (user.id === auth.user.id) {
    return NextResponse.json({ error: "You cannot decide your own account" }, { status: 400 });
  }
  if (user.role === "ADMIN") {
    return NextResponse.json({ error: "Admin accounts cannot be rejected" }, { status: 400 });
  }
  if (user.status !== "PENDING") {
    return NextResponse.json({ error: "Registration already decided" }, { status: 409 });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { status: "REJECTED", decidedAt: new Date() },
  });

  return NextResponse.json({ user: toUserDTO(updated) });
}
