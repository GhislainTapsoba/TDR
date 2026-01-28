import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import type { AuthOptions } from "next-auth";

const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials, req) {
        console.log("NextAuth authorize function called.");
        console.log("Credentials received:", credentials);

        if (!credentials?.email || !credentials?.password) {
          console.log("NextAuth authorize: Missing email or password.");
          return null;
        }

        const loginUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`;
        console.log("NextAuth authorize: Attempting to fetch from:", loginUrl);

        const res = await fetch(
          loginUrl,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(credentials),
          }
        );
        console.log("NextAuth authorize: Fetch response status:", res.status);
        console.log("NextAuth authorize: Fetch response ok:", res.ok);

        if (!res.ok) {
          const errorText = await res.text();
          console.error("NextAuth authorize: Login API returned error:", errorText);
          return null;
        }

        const data = await res.json();
        console.log("NextAuth authorize: Data from login API:", data);

        if (!data.success || !data.user) {
          console.log("NextAuth authorize: Login API did not return success or user data.");
          return null;
        }

        console.log("NextAuth authorize: Login successful, returning user:", data.user.email);
        return {
          id: String(data.user.id),
          email: data.user.email,
          name: data.user.name || '',
          role: data.user.role, // Assuming role is directly available
          permissions: data.user.permissions || [],
        };
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
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
        token.permissions = user.permissions;
        token.accessToken = (user as any).accessToken;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.role = token.role as string;
        session.user.permissions = token.permissions as string[];
        (session as any).accessToken = token.accessToken;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  debug: true,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
