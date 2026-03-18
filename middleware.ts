import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // Allow the request to continue if authenticated
    return NextResponse.next();
  },
  {
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  // Protect all dashboard/app routes; exclude auth pages, public pages, and Next.js internals
  matcher: [
    "/scans/:path*",
    "/reports/:path*",
    "/settings/:path*",
    "/profile/:path*",
    "/invite/:path*",
    "/pricing/:path*",
  ],
};
