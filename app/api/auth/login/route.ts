import { NextResponse } from "next/server";
import { setSessionCookie, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toUserDTO } from "@/lib/types";
import { loginSchema, zodErrorMessage } from "@/lib/validation";

// POST /api/auth/login → 200 { user } + session cookie.
// 401 `Invalid username or password` for unknown user OR wrong password
// (identical message on purpose); 403 while PENDING / when REJECTED (T23).
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: zodErrorMessage(parsed.error) }, { status: 400 });
  }
  const { username, password } = parsed.data;

  // Case-insensitive lookup in JS (SQLite compares case-sensitively — D16).
  const users = await prisma.user.findMany();
  const user = users.find((u) => u.username.toLowerCase() === username.toLowerCase());

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
  }

  // Status gate AFTER the password check: the reason is only revealed to
  // someone who holds the correct credentials.
  if (user.status === "PENDING") {
    return NextResponse.json({ error: "Account pending admin approval" }, { status: 403 });
  }
  if (user.status === "REJECTED") {
    return NextResponse.json({ error: "This account registration was declined" }, { status: 403 });
  }
  if (user.status !== "APPROVED") {
    return NextResponse.json({ error: "Account is not approved" }, { status: 403 });
  }

  await setSessionCookie(user.id);
  return NextResponse.json({ user: toUserDTO(user) });
}
