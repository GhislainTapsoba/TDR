import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ message: "Email et mot de passe requis" }, { status: 400 });
    }

    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase();

    // Look up the user in the database
    const { rows } = await db.query(
      `SELECT u.id, u.name, u.email, u.password, u.role_id, u.is_active, r.name as role
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.email = $1`,
      [normalizedEmail]
    );

    if (rows.length === 0) {
      return NextResponse.json({ message: "Email ou mot de passe incorrect" }, { status: 401 });
    }

    const user = rows[0];

    // Compare the provided password with the hashed password
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return NextResponse.json({ message: "Email ou mot de passe incorrect" }, { status: 401 });
    }

    if (!user.is_active) {
      return NextResponse.json({ message: "Votre compte est inactif. Veuillez contacter l'administrateur." }, { status: 403 });
    }

    // Fetch permissions for the user's role
    const { rows: permissionRows } = await db.query(
      `SELECT p.name
       FROM permissions p
       JOIN role_permissions rp ON p.id = rp.permission_id
       WHERE rp.role_id = $1`,
      [user.role_id]
    );
    const permissions = permissionRows.map(row => row.name);

    // Return user object directly (no wrapper)
    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      permissions: permissions
    });

  } catch (error) {
    console.error('API /api/auth/login error:', error);
    return NextResponse.json({ message: 'Erreur interne du serveur' }, { status: 500 });
  }
}
