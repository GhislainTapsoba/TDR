import { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/verifyAuth';
import { db } from '@/lib/db';
import { handleCorsOptions, corsResponse } from '@/lib/cors';
import bcrypt from 'bcryptjs';
import { mapDbRoleToUserRole, requirePermission } from '@/lib/permissions';

// Gérer les requêtes OPTIONS (preflight CORS)
export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

// GET /api/users - Récupérer tous les utilisateurs
// Query params: ?role=PROJECT_MANAGER pour filtrer par rôle
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return corsResponse({ error: 'Unauthorized' }, request, { status: 401 });
    }

    const userRole = mapDbRoleToUserRole(user.role as string | null);
    const perm = requirePermission(userRole, 'users', 'read');
    if (!perm.allowed) {
      return corsResponse({ error: perm.error }, request, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');

    let queryText = 'SELECT id, name, email, role, created_at, updated_at FROM users';
    const queryParams = [];

    if (role) {
      queryText += ' WHERE role = $1';
      queryParams.push(role);
    }

    queryText += ' ORDER BY name ASC';

    const { rows, rowCount } = await db.query(queryText, queryParams);

    return corsResponse(rows || [], request);
  } catch (error) {
    console.error('GET /api/users error:', error);
    return corsResponse(
      { error: 'Erreur serveur' },
      request,
      { status: 500 }
    );
  }
}

// POST /api/users - Créer un nouvel utilisateur (Admin only)
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return corsResponse({ error: 'Unauthorized' }, request, { status: 401 });
    }

    const userRole = mapDbRoleToUserRole(user.role as string | null);
    const perm = requirePermission(userRole, 'users', 'create');
    if (!perm.allowed) {
      return corsResponse({ error: perm.error }, request, { status: 403 });
    }

    const body = await request.json();

    // Validation
    if (!body.name || !body.email || !body.password || !body.role) {
      return corsResponse(
        { error: 'Nom, email, mot de passe et rôle sont requis' },
        request,
        { status: 400 }
      );
    }

    // Vérifier si l'email existe déjà
    const { rows: existingUsers } = await db.query('SELECT email FROM users WHERE email = $1', [body.email]);

    if (existingUsers.length > 0) {
      return corsResponse(
        { error: 'Cet email est déjà utilisé' },
        request,
        { status: 400 }
      );
    }

    // Hash le mot de passe
    const hashedPassword = await bcrypt.hash(body.password, 10);

    // Normaliser le rôle (frontend envoie 'admin', 'manager', 'user')
    let dbRole = body.role.toUpperCase();
    if (dbRole === 'ADMIN') dbRole = 'ADMIN';
    else if (dbRole === 'MANAGER') dbRole = 'PROJECT_MANAGER';
    else if (dbRole === 'USER') dbRole = 'EMPLOYEE';

    // Créer l'utilisateur
    const insertQuery = `
      INSERT INTO users (name, email, password, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, email, role, created_at, updated_at
    `;
    const { rows } = await db.query(insertQuery, [body.name, body.email, hashedPassword, dbRole]);
    
    if (rows.length === 0) {
      return corsResponse(
        { error: 'Erreur lors de la création de l\'utilisateur' },
        request,
        { status: 500 }
      );
    }

    return corsResponse(rows[0], request, { status: 201 });
  } catch (error) {
    console.error('POST /api/users error:', error);
    return corsResponse(
      { error: 'Erreur serveur' },
      request,
      { status: 500 }
    );
  }
}
