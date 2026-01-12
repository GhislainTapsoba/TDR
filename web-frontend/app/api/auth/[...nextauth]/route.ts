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
          // Utiliser l'URL de l'API
          const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/auth/login`;
          console.log("📡 Appel vers:", apiUrl);

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

          console.log("📊 Statut réponse:", res.status);

          if (!res.ok) {
            const errorText = await res.text();
            console.error("❌ Erreur API:", res.status, errorText);
            return null;
          }

          const data = await res.json();
          console.log("✅ Données reçues:", JSON.stringify(data, null, 2));

          // Vérifier le format de réponse du backend
          if (!data.success || !data.user) {
            console.error("❌ Format de réponse invalide:", data);
            return null;
          }

          console.log("✅ Utilisateur authentifié:", data.user.email);

          // Retourner l'utilisateur (le token est optionnel pour NextAuth JWT)
          return {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            role: data.user.role,
            token: data.token, // Optionnel : si vous avez besoin du token ailleurs
          };

        } catch (error) {
          console.error("💥 Erreur lors de l'authentification:", error);
          return null;
        }
      },
    }),
  ],
  session: { 
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 jours
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
        // @ts-ignore - Stocker le token si nécessaire
        if (user.token) {
          token.accessToken = user.token;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        const mapRole = (dbRole: string): string => {
          console.log("DEBUG: dbRole received from token:", dbRole); // Add this line
          switch (dbRole) {
            case 'ADMIN': return 'admin'
            case 'PROJECT_MANAGER': return 'chef_projet'
            case 'EMPLOYEE': return 'employe'
            default: return 'employe'
          }
        }

        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.role = mapRole(token.role as string);
        // @ts-ignore - Exposer le token dans la session
        if (token.accessToken) {
          session.accessToken = token.accessToken;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  debug: true, // Logs détaillés
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };