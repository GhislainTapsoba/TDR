import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { handleCorsOptions, corsResponse } from '@/lib/cors'; // Import CORS handler

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    console.log('Login attempt for email:', email);

    if (!email || !password) {
      return corsResponse({ error: 'Email et mot de passe sont requis' }, req, { status: 400 });
    }

    // Look up the user in the database
    const { rows } = await db.query(
      `SELECT id, name, email, password, role_id, is_active FROM users WHERE email = $1`,
      [email]
    );

    console.log('Database query result for user:', rows);

    if (rows.length === 0) {
      return corsResponse({ error: 'Email ou mot de passe incorrect' }, req, { status: 401 });
    }

    const user = rows[0];

    // Compare the provided password with the hashed password
    const passwordMatch = await bcrypt.compare(password, user.password);
    console.log('Password comparison result:', passwordMatch);

    if (!passwordMatch) {
      return corsResponse({ error: 'Email ou mot de passe incorrect' }, req, { status: 401 });
    }

    if (!user.is_active) {
      return corsResponse({ error: 'Votre compte est inactif. Veuillez contacter l\'administrateur.' }, req, { status: 403 });
    }

    // Fetch permissions for the user's role
    const { rows: permissionRows } = await db.query(
        `SELECT p.name
         FROM permissions p
         JOIN role_permissions rp ON p.id = rp.permission_id
         WHERE rp.role_id = $1
        `, [user.role_id]);
    const permissions = permissionRows.map(row => row.name);


    return corsResponse({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role, // Assuming user.role is a string like 'ADMIN', 'MANAGER', 'EMPLOYEE'
        is_active: user.is_active,
        permissions: permissions
      },
    }, req, { status: 200 });

  } catch (error) {
    console.error('API /api/auth/login error:', error);
    return corsResponse({ error: 'Erreur interne du serveur' }, req, { status: 500 });
  }
}