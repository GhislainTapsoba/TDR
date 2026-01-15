import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // 🔐 USERS
    if (pathname.startsWith("/users")) {
      if (!token?.permissions?.includes("users.read")) {
        return NextResponse.redirect(new URL("/403", req.url));
      }
    }

    // 📁 PROJECTS
    if (pathname.startsWith("/projects")) {
      if (!token?.permissions?.includes("projects.read")) {
        return NextResponse.redirect(new URL("/403", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/projects/:path*",
    "/users/:path*",
    "/tasks/:path*",
  ],
};
