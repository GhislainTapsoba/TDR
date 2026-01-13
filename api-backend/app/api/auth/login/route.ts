import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function POST(req: Request) {
  console.log('>>> API Backend /auth/login route hit');
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email et mot de passe sont requis.' },
        { status: 400 }
      );
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase();

    // Validate email
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      return NextResponse.json({ error: 'Format d\'email invalide.' }, { status: 400 });
    }

    // Fetch user from DB
    const userQuery = `
      SELECT id, name, email, password, role, created_at, updated_at
      FROM users
      WHERE email = $1
    `;
    const { rows: users } = await db.query(userQuery, [normalizedEmail]);

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'Email ou mot de passe incorrect.' },
        { status: 401 }
      );
    }

    const user = users[0];

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Email ou mot de passe incorrect.' },
        { status: 401 }
      );
    }

    // Remove password
    const { password: _, ...userWithoutPassword } = user;

    // Ensure id is string
    const userResponse = { ...userWithoutPassword, id: String(userWithoutPassword.id) };

    // Generate JWT token for NextAuth
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.NEXTAUTH_SECRET!,
      { expiresIn: '30d' }
    );

    // Return in NextAuth format
    return NextResponse.json({
      success: true,
      user: userResponse,
      token,
    }, { status: 200 });

  } catch (error) {
    console.error('LOGIN ERROR >>>', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur interne' },
      { status: 500 }
    );
  }
}
