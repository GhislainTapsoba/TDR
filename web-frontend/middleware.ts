// middleware/permissions.ts
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// Map des routes vers les permissions requises
const routePermissions: Record<string, string[]> = {
  "/dashboard": ["dashboard.read"],
  "/activity-logs": ["activity_logs.read"],
  "/projects": ["projects.read"],
  "/stages": ["stages.create", "stages.read", "stages.update", "stages.delete"],
  "/tasks": ["tasks.create", "tasks.read", "tasks.update", "tasks.delete"],
  "/documents": ["documents.create", "documents.read", "documents.update", "documents.delete"],
  "/users": ["users.create", "users.read", "users.update", "users.delete"],
  "/user-settings": ["user_settings.read", "user_settings.update"],
};

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    if (!token) return NextResponse.redirect(new URL("/login", req.url));

    // 🔍 Trouve les permissions requises pour cette route
    const requiredPermissions = Object.entries(routePermissions).find(([route]) =>
      pathname.startsWith(route)
    )?.[1];

    // Si pas de permissions spécifiques, on laisse passer
    if (!requiredPermissions) return NextResponse.next();

    // Vérifie la route user-settings pour que l'utilisateur ne touche que ses propres settings
    if (pathname.startsWith("/user-settings")) {
      const userIdParam = req.nextUrl.searchParams.get("userId") || token.sub;
      if (pathname.includes("/edit") || pathname.includes("/update")) {
        if (
          !token.permissions?.includes("user_settings.update") ||
          userIdParam !== token.sub
        ) {
          return NextResponse.redirect(new URL("/403", req.url));
        }
      } else {
        if (
          !token.permissions?.includes("user_settings.read") ||
          userIdParam !== token.sub
        ) {
          return NextResponse.redirect(new URL("/403", req.url));
        }
      }
      return NextResponse.next();
    }

    // Vérifie que l'utilisateur possède au moins une permission requise pour la route
    const hasPermission = requiredPermissions.some((perm) =>
      token.permissions?.includes(perm)
    );

    if (!hasPermission) return NextResponse.redirect(new URL("/403", req.url));

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token, // S'assure que l'utilisateur est connecté
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
