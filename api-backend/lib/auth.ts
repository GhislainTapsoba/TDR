import { NextAuthOptions, User } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { supabaseAdmin } from './supabase'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials): Promise<User | null> {
        console.log('[Auth authorize] Function called.');
        if (!credentials?.email || !credentials?.password) {
          console.log('[Auth authorize] Missing credentials.');
          return null;
        }

        console.log(`[Auth authorize] Attempting to log in with email: ${credentials.email}`);

        try {
          const { data: user, error } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('email', credentials.email)
            .single();

          if (error) {
            console.error('[Auth authorize] Supabase error:', error.message);
            return null;
          }

          if (!user) {
            console.log('[Auth authorize] User not found in DB.');
            return null;
          }
          
          if (!user.password) {
            console.log('[Auth authorize] User found but has no password set.');
            return null;
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );
          
          console.log(`[Auth authorize] Password validation result: ${isPasswordValid}`);

          if (!isPasswordValid) {
            console.log('[Auth authorize] Invalid password.');
            return null;
          }

          console.log('[Auth authorize] Login successful. Generating custom token.');
          
          const customToken = jwt.sign(
            { id: user.id, email: user.email, role: user.role, sub: user.id },
            process.env.NEXTAUTH_SECRET!,
            { expiresIn: '30d' }
          );

          return {
            id: user.id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
            customToken: customToken,
          };
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
        token.id = user.id;
        token.role = user.role;
        if (user.customToken) {
          token.customToken = user.customToken
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.customToken = token.customToken as string;
      }
      return session;
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
