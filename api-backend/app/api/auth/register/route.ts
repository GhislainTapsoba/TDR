import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
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
    const existingUserQuery = 'SELECT email FROM users WHERE email = $1';
    const { rows: existingUsers } = await db.query(existingUserQuery, [normalizedEmail]);

    if (existingUsers.length > 0) {
      return NextResponse.json({ error: 'Un utilisateur avec cet email existe déjà.' }, { status: 409 });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Get role_id for EMPLOYEE
    const roleQuery = 'SELECT id FROM roles WHERE name = $1';
    const { rows: roleRows } = await db.query(roleQuery, ['EMPLOYEE']);
    if (roleRows.length === 0) {
      return NextResponse.json({ error: 'Rôle par défaut non trouvé.' }, { status: 500 });
    }
    const roleId = roleRows[0].id;

    // Insert new user
    const insertQuery = `
      INSERT INTO users (name, email, password, role_id)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, email, role_id, created_at, updated_at
    `;
    const { rows: newUsers } = await db.query(insertQuery, [name, normalizedEmail, hashedPassword, roleId]);

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
