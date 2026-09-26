import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    if (path.startsWith("/admin") && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/403", req.url));
    }
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token, // just needs to be logged in; role check happens above
    },
  }
);

// Only these paths run through the middleware — public pages (landing,
// /ebooks listing, /login, /register, /payment info) stay open.
// Actual content access (e.g. e-book file bytes) is enforced again at the
// API layer regardless of middleware, per defense-in-depth.
export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/ebooks/:slug/read", "/courses/:slug/learn/:lessonId"],
};
