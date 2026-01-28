// web-frontend/app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import type { AuthOptions } from "next-auth";

export const config = {
  api: {
    bodyParser: true,
    externalResolver: true,
  },
};

const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.log("❌ Credentials manquantes");
          return null;
        }

        try {
          const apiUrl = `${process.env.INTERNAL_API_URL}/auth/login`;

          const res = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

          const responseText = await res.text();
          if (!res.ok) {
            console.error("❌ Erreur HTTP:", res.status, responseText);
            return null;
          }

          let data;
          try {
            data = JSON.parse(responseText);
          } catch (e) {
            console.error("❌ Erreur parsing JSON:", e);
            return null;
          }

          if (!data.success || !data.user) return null;

          // 🔑 Retourne l'utilisateur avec son rôle et ses permissions
          return {
            id: String(data.user.id),
            email: data.user.email,
            name: data.user.name || "",
            role: data.user.role?.toLowerCase() || "user",
            accessToken: data.token,
            permissions: data.user.permissions || [], // ✅ IMPORTANT pour middleware
          };
        } catch (error) {
          console.error("💥 ERREUR CRITIQUE:", error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        console.log("➡️ JWT callback - user found:", user);
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
        token.accessToken = (user as any).accessToken;
        token.permissions = (user as any).permissions;
      } else {
        console.log("➡️ JWT callback - token:", token);
      }
      return token;
    },
    async session({ session, token }) {
      console.log("➡️ Session callback - token:", token);
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.role = token.role as string;
        session.user.permissions = token.permissions as string[];
        (session as any).accessToken = token.accessToken;
      }
      console.log("➡️ Session callback - session:", session);
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/403",
  },
  debug: true,
  cookies: {
    sessionToken: {
      name: `__Secure-next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: true, // <- doit être true en HTTPS
      },
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
