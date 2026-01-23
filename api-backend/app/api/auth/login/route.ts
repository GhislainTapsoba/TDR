import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function POST(req: Request) {
  process.stderr.write('>>> API Backend /auth/login route hit\n');

  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      process.stderr.write('❌ Email ou mot de passe manquant\n');
      return NextResponse.json(
        { error: 'Email et mot de passe sont requis.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      process.stderr.write('❌ Format d\'email invalide\n');
      return NextResponse.json({ error: 'Format d\'email invalide.' }, { status: 400 });
    }

    // Fetch user
    const userQuery = `
      SELECT id, name, email, password, role, is_active
      FROM users
      WHERE email = $1
    `;
    const { rows: users } = await db.query(userQuery, [normalizedEmail]);

    if (users.length === 0) {
      process.stderr.write('❌ Utilisateur non trouvé\n');
      return NextResponse.json({ error: 'Email ou mot de passe incorrect.' }, { status: 401 });
    }

    const user = users[0];

    // Check if user is active
    if (!user.is_active) {
      process.stderr.write('❌ Compte utilisateur inactif\n');
      return NextResponse.json({ error: 'Votre compte est inactif. Contactez un administrateur.' }, { status: 403 });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      process.stderr.write('❌ Mot de passe incorrect\n');
      return NextResponse.json({ error: 'Email ou mot de passe incorrect.' }, { status: 401 });
    }

    // Remove password
    const { password: _, ...userWithoutPassword } = user;

    // Lowercase role
    const lowercasedRole = user.role?.toLowerCase() || 'user';


    // Fetch permissions from role_permissions
    const permsQuery = `
      SELECT p.resource, p.action
      FROM role_permissions rp
      JOIN permissions p ON rp.permission_id = p.id
      JOIN roles r ON rp.role_id = r.id
      WHERE r.name = $1
    `;
    const { rows: perms } = await db.query(permsQuery, [lowercasedRole]);
    const permissions = perms.map(p => `${p.resource}.${p.action}`); // array of strings like 'projects.create'

    // Build user object with permissions
    const userResponse = { 
      ...userWithoutPassword, 
      id: String(userWithoutPassword.id),
      permissions
    };

    // Generate JWT with permissions
    const tokenPayload = { 
      sub: user.id, 
      email: user.email, 
      role: lowercasedRole, 
      id: user.id,
      permissions
    };
    const token = jwt.sign(tokenPayload, process.env.NEXTAUTH_SECRET!, { expiresIn: '30d' });
    process.stderr.write('✅ Connexion réussie, jeton généré\n');

    // Return for NextAuth
    return NextResponse.json({
      success: true,
      user: userResponse,
      token,
    }, { status: 200 });

  } catch (error) {
    process.stderr.write(`💥 ERREUR CRITIQUE dans /auth/login: ${error}\n`);
    console.error('LOGIN ERROR >>>', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur interne' },
      { status: 500 }
    );
  }
}
