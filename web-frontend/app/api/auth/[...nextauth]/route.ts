import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import type { AuthOptions } from "next-auth";

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

        console.log("🔐 Tentative de connexion:", credentials.email);
        console.log("🌐 API URL:", process.env.NEXT_PUBLIC_API_URL);

        try {
          const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/auth/login`;
          console.log("📡 Appel vers:", apiUrl);

          const res = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

          console.log("📊 Statut réponse:", res.status);

          if (!res.ok) {
            const errorText = await res.text();
            console.error("❌ Erreur API:", errorText);
            return null;
          }

          const data = await res.json();
          console.log("✅ Données reçues:", data);

          if (!data.success || !data.user) {
            console.error("❌ Authentification échouée:", data);
            return null;
          }

          console.log("✅ Utilisateur authentifié:", data.user.email);
          return data.user;
        } catch (error) {
          console.error("💥 Erreur lors de l'authentification:", error);
          return null;
        }
      },
    }),
  ],
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  debug: true, // Active les logs en développement
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };