import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toUserDTO } from "@/lib/types";
import { adminUsersStatusSchema, zodErrorMessage } from "@/lib/validation";

// GET /api/admin/users?status=PENDING|APPROVED|REJECTED|ALL (default ALL) → UserDTO[] (T27).
// ADMIN only (`403 Admin access required`); ordered by registration (id asc). The
// password hash is never included — every row goes through toUserDTO.
export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const statusParam = new URL(request.url).searchParams.get("status") ?? "ALL";
  const parsed = adminUsersStatusSchema.safeParse(statusParam);
  if (!parsed.success) {
    return NextResponse.json({ error: zodErrorMessage(parsed.error) }, { status: 400 });
  }

  const users = await prisma.user.findMany({
    where: parsed.data === "ALL" ? {} : { status: parsed.data },
    orderBy: { id: "asc" },
  });

  return NextResponse.json(users.map((user) => toUserDTO(user)));
}
