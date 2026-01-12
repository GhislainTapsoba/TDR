import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function POST(req: Request) {
  // TODO 1 — Méthode POST uniquement (handled by Next.js App Router for route.ts files)
  // We are in a route.ts file, which means it handles all methods. We need to check the method.
  if (req.method !== "POST") {
    const res = new Response("Method Not Allowed", { status: 405 });
    res.headers.set("Access-Control-Allow-Origin", "*");
    res.headers.set("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    return res;
  }

  try {
    console.log('[API /login] Endpoint hit.');
    // TODO 2 — Lire email & password depuis JSON
    const { email, password } = await req.json();
    console.log(`[API /login] Attempting to log in with email: ${email}`);

    if (!email || !password) {
      console.log('[API /login] Missing email or password.');
      return new Response(JSON.stringify({ error: 'Email and password are required' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // TODO 3 — Vérifier les identifiants
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user || !user.password) {
      console.log('[API /login] User not found or no password set in DB.');
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log(`[API /login] Password validation result: ${isPasswordValid}`);

    if (!isPasswordValid) {
      console.log('[API /login] Invalid password.');
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    
    // Generate JWT
    const jwtSecret = process.env.NEXTAUTH_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT secret is not configured');
    }
    const jwtToken = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      jwtSecret,
      { expiresIn: '1d' } // Example expiration
    );

    // TODO 4 — Retourner la structure OBLIGATOIRE
    const responseData = {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token: jwtToken,
    };

    console.log('[API /login] Login successful. Returning user data and token.');
    // TODO 5 — Activer CORS
    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('[API /login] CATCH BLOCK ERROR:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-control-allow-methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  })
}
