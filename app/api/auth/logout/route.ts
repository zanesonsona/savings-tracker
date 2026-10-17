import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";

// POST /api/auth/logout → clears the session cookie (204). Idempotent.
export async function POST() {
  await clearSessionCookie();
  return new NextResponse(null, { status: 204 });
}
