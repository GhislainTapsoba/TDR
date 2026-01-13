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

    console.log("=== DÉBUT AUTHORIZE ===");
    console.log("🔐 Email:", credentials.email);
    
    // ✅ AJOUTEZ CECI
    console.log("🌍 INTERNAL_API_URL:", process.env.INTERNAL_API_URL);
    console.log("🌍 NEXTAUTH_URL:", process.env.NEXTAUTH_URL);
    console.log("🌍 NEXTAUTH_SECRET:", process.env.NEXTAUTH_SECRET ? "✅ Défini" : "❌ Manquant");

    try {
      const apiUrl = `${process.env.INTERNAL_API_URL}/auth/login`;
      console.log("📡 URL complète:", apiUrl);


          const res = await fetch(apiUrl, {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

          console.log("📊 Statut HTTP:", res.status);

          const responseText = await res.text();
          console.log("📦 Réponse brute:", responseText);

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

          console.log("✅ Données parsées:", JSON.stringify(data, null, 2));

          if (!data.success || !data.user) {
            console.error("❌ Format invalide");
            return null;
          }

          console.log("✅ SUCCÈS - Utilisateur:", data.user.email);
          console.log("=== FIN AUTHORIZE ===");

          return {
            id: String(data.user.id),
            email: data.user.email,
            name: data.user.name || '',
            role: data.user.role?.toLowerCase() || 'user', // Convert role to lowercase for frontend
            accessToken: data.token,
          };

        } catch (error) {
          console.error("💥 ERREUR CRITIQUE:", error);
          console.error("💥 Stack:", error instanceof Error ? error.stack : 'N/A');
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
  // ✅ SUPPRIMEZ ou MODIFIEZ la section cookies
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: false,  // ✅ Changez à false si vous utilisez HTTP
        // ✅ Supprimez la ligne domain ou laissez-la vide
      },
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        console.log("🔑 JWT - Ajout user au token");
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
        token.accessToken = (user as any).accessToken;
      }
      console.log("🔑 DEBUG: JWT token content:", token); // Add this line
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        console.log("👤 Session - Ajout token à la session");
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.role = token.role as string;
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