import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { supabaseAdmin } from './supabase'
import bcrypt from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        console.log('[Auth authorize] Function called.');
        if (!credentials?.email || !credentials?.password) {
          console.log('[Auth authorize] Missing credentials.');
          return null
        }
        
        try {
          // TODO 7 — URL backend CORRECTE
          const loginUrl = "http://api-backend:3000/api/login";
          console.log(`[Auth authorize] Fetching ${loginUrl}`);
          const res = await fetch(loginUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });
          
          console.log(`[Auth authorize] Response status from /api/login: ${res.status}`);
          // TODO 8 — authorize() DOIT retourner un user
          if (!res.ok) {
            console.log('[Auth authorize] Response not OK.');
            return null;
          }

          const data = await res.json();
          console.log('[Auth authorize] Response data from /api/login:', data);

          if (data.user && data.token) {
            console.log('[Auth authorize] Success, returning user object.');
            return {
              id: data.user.id,
              name: data.user.name,
              email: data.user.email,
              role: data.user.role,
              token: data.token,
            };
          }
          
          console.log('[Auth authorize] Failed, data object is missing user or token.');
          return null;

        } catch (e) {
          console.error("[Auth authorize] CATCH BLOCK ERROR:", e);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 jours
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        // @ts-ignore
        token.accessToken = user.token
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.email = token.email as string
        session.user.name = token.name as string | null
        // @ts-ignore
        session.accessToken = token.accessToken
      }
      return session
    }
  },
  pages: {
    signIn: '/auth/signin'
  },
  // Configuration pour le cross-origin avec frontend séparé
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'none',
        path: '/',
        secure: true, // Mettre à false en développement si vous n'utilisez pas HTTPS
      },
    },
  },
  // Activer le debug en développement
  debug: process.env.NODE_ENV === 'development',
}
