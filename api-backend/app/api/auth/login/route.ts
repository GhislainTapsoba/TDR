import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email et mot de passe sont requis.' }, { status: 400 });
    }

    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase();

    // Basic email validation
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      return NextResponse.json({ error: 'Format d\'email invalide.' }, { status: 400 });
    }

    // Check if user exists
    const userQuery = 'SELECT id, name, email, password, role, created_at, updated_at FROM users WHERE email = $1';
    const { rows: users } = await db.query(userQuery, [normalizedEmail]);

    if (users.length === 0) {
      return NextResponse.json({ error: 'Email ou mot de passe incorrect.' }, { status: 401 });
    }

    const user = users[0];

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Email ou mot de passe incorrect.' }, { status: 401 });
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json(userWithoutPassword, { status: 200 });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
  }
}
