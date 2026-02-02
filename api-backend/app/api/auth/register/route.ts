import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { handleCorsOptions, corsResponse } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return corsResponse({ error: 'Tous les champs sont requis.' }, req, { status: 400 });
    }

    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase();

    // Basic email validation
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
        return corsResponse({ error: 'Format d\'email invalide.' }, req, { status: 400 });
    }

    // Check if user already exists
    const existingUserQuery = 'SELECT email FROM users WHERE email = $1';
    const { rows: existingUsers } = await db.query(existingUserQuery, [normalizedEmail]);

    if (existingUsers.length > 0) {
      return corsResponse({ error: 'Un utilisateur avec cet email existe déjà.' }, req, { status: 409 });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user
    const insertQuery = `
      INSERT INTO users (name, email, password, role)
      VALUES ($1, $2, $3, 'EMPLOYEE')
      RETURNING id, name, email, role, created_at, updated_at
    `;
    const { rows: newUsers } = await db.query(insertQuery, [name, normalizedEmail, hashedPassword]);

    if (newUsers.length === 0) {
      return corsResponse({ error: 'Erreur lors de la création de l\'utilisateur.' }, req, { status: 500 });
    }
    
    const newUser = newUsers[0];

    return corsResponse({ message: 'Utilisateur créé avec succès.', user: newUser }, req, { status: 201 });

  } catch (error) {
    console.error('Registration error:', error);
    return corsResponse({ error: 'Erreur interne du serveur.' }, req, { status: 500 });
  }
}
