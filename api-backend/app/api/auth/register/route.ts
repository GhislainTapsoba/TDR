import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Tous les champs sont requis.' }, { status: 400 });
    }

    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase();

    // Basic email validation
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
        return NextResponse.json({ error: 'Format d\'email invalide.' }, { status: 400 });
    }

    // Check if user already exists
    const existingUserQuery = 'SELECT email FROM users WHERE email = ';
    const { rows: existingUsers } = await db.query(existingUserQuery, [normalizedEmail]);

    if (existingUsers.length > 0) {
      return NextResponse.json({ error: 'Un utilisateur avec cet email existe déjà.' }, { status: 409 });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user
    const insertQuery = `
      INSERT INTO users (name, email, password, role) 
      VALUES (, $2, $3, 'EMPLOYEE')
      RETURNING id, name, email, role, created_at, updated_at
    `;
    const { rows: newUsers } = await db.query(insertQuery, [name, normalizedEmail, hashedPassword]);

    if (newUsers.length === 0) {
      return NextResponse.json({ error: 'Erreur lors de la création de l\'utilisateur.' }, { status: 500 });
    }
    
    const newUser = newUsers[0];

    return NextResponse.json({ message: 'Utilisateur créé avec succès.', user: newUser }, { status: 201 });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
  }
}