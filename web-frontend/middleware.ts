// middleware/permissions.ts
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // 🚫 Pas connecté → redirect login
    if (!token) return NextResponse.redirect(new URL("/login", req.url));

    // 🔒 Protection spécifique pour user-settings
    if (pathname.startsWith("/user-settings")) {
      const userIdParam = req.nextUrl.searchParams.get("userId") || token.sub;
      if (pathname.includes("/edit") || pathname.includes("/update")) {
        if (userIdParam !== token.sub) {
          return NextResponse.redirect(new URL("/403", req.url));
        }
      } else {
        if (userIdParam !== token.sub) {
          return NextResponse.redirect(new URL("/403", req.url));
        }
      }
      return NextResponse.next();
    }

    // ✅ Pour toutes les autres routes, laisser passer si connecté
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token, // connecté seulement
    },
  }
);

// Appliquer le middleware aux routes concernées
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/projects/:path*",
    "/stages/:path*",
    "/tasks/:path*",
    "/documents/:path*",
    "/users/:path*",
    "/activity-logs/:path*",
    "/user-settings/:path*",
  ],
};
