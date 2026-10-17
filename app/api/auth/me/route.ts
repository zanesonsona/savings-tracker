import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { toUserDTO } from "@/lib/types";

// GET /api/auth/me → the session user re-read from the DB (incl. role/status),
// or 401 `Authentication required` (T23). Consumed by the T25 shell.
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  return NextResponse.json({ user: toUserDTO(user) });
}
