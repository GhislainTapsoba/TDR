// middleware/permissions.ts
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // 🚫 Pas connecté → redirect login
    if (!token) return NextResponse.redirect(new URL("/login", req.url));

    // 🔒 Protection par permissions - Temporairement désactivé pour debug
    // if (pathname.startsWith("/users") && !(token.permissions as string[])?.includes("users.read")) {
    //   return NextResponse.redirect(new URL("/403", req.url));
    // }

    // if (pathname.startsWith("/tasks") && !(token.permissions as string[])?.includes("tasks.read")) {
    //   return NextResponse.redirect(new URL("/403", req.url));
    // }

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
