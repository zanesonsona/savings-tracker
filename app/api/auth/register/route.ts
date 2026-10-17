import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toUserDTO } from "@/lib/types";
import { registerSchema, zodErrorMessage } from "@/lib/validation";

// POST /api/auth/register → 201 { user, message }.
//
// The FIRST-ever account becomes the app admin (ADMIN + APPROVED, D15). Every
// later registration lands as USER + PENDING and cannot sign in until an admin
// approves it (T27). Neither path auto-logs-in.
//
// Note: the D21 "claim legacy NULL-owner rows" step of the T21→T26 sequence is
// complete — `userId` is required now (T26), so such rows can no longer exist.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: zodErrorMessage(parsed.error) }, { status: 400 });
  }
  const { username, password } = parsed.data;

  // `username` is @unique but SQLite compares case-sensitively → check in JS,
  // like category names (D16). The table is tiny (local single-server app).
  const existing = await prisma.user.findMany({ select: { id: true, username: true } });
  if (existing.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
    return NextResponse.json(
      { error: `Username "${username}" is already taken` },
      { status: 409 },
    );
  }

  const passwordHash = await hashPassword(password);
  // Note: count-then-create has a theoretical race window; harmless here (local
  // single-server app, and the worst case is a second account becoming admin).
  const userCount = await prisma.user.count();

  if (userCount === 0) {
    const admin = await prisma.user.create({
      data: { username, passwordHash, role: "ADMIN", status: "APPROVED" },
    });

    return NextResponse.json(
      { user: toUserDTO(admin), message: "Admin account created — sign in to continue." },
      { status: 201 },
    );
  }

  const user = await prisma.user.create({
    data: { username, passwordHash }, // defaults: role USER, status PENDING
  });

  return NextResponse.json(
    {
      user: toUserDTO(user),
      message: "Account created — an admin must approve it before you can sign in.",
    },
    { status: 201 },
  );
}
