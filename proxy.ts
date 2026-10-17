import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";

// Optimistic auth redirects (T25): signed-out visitors of app pages go to
// `/login`. Cookie + HMAC verification only — no DB access here (see §12).
//
// Secure checks stay close to the data: the `(app)` layout re-reads the
// session from the DB, auth pages redirect APPROVED sessions away, `/admin/**`
// re-checks the role in the page, and every data API enforces its own guard
// (T26). A valid signature alone never authorizes anything.
export function proxy(request: NextRequest) {
  const session = verifySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/income/:path*",
    "/expenses/:path*",
    "/savings/:path*",
    "/categories/:path*",
    "/admin/:path*",
  ],
};
