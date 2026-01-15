import { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/verifyAuth';
import { db } from '@/lib/db';
import { handleCorsOptions, corsResponse } from '@/lib/cors';
import { mapDbRoleToUserRole, requirePermission } from '@/lib/permissions';

// Gérer les requêtes OPTIONS (preflight CORS)
export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

// GET /api/users - Récupérer tous les utilisateurs (rôles autorisés)
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return corsResponse({ error: 'Unauthorized' }, request, { status: 401 });
    }

    const userRole = mapDbRoleToUserRole(user.role as string | null);
    const perm = await requirePermission(userRole, 'users', 'read');
    if (!perm.allowed) {
      return corsResponse({ error: perm.error }, request, { status: 403 });
    }

    const query = 'SELECT id, name, email, role, created_at, updated_at, is_active FROM users ORDER BY name ASC';
    const { rows } = await db.query(query);

    return corsResponse(rows, request);
  } catch (error) {
    console.error('GET /api/users error:', error);
    return corsResponse(
      { error: 'Erreur serveur' },
      request,
      { status: 500 }
    );
  }
}

// POST /api/users - Créer un nouvel utilisateur
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return corsResponse({ error: 'Unauthorized' }, request, { status: 401 });
    }

    const userRole = mapDbRoleToUserRole(user.role as string | null);

    // Seuls les admins et chefs de projet peuvent créer des utilisateurs
    if (userRole !== 'admin' && userRole !== 'manager') {
      return corsResponse({ error: 'Accès refusé' }, request, { status: 403 });
    }

    const body = await request.json();
    const { name, email, password, role } = body;

    // Validation
    if (!name || !email || !password || !role) {
      return corsResponse(
        { error: 'Tous les champs sont requis' },
        request,
        { status: 400 }
      );
    }

    // Vérifier si l'email existe déjà
    const { rows: existingUsers } = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUsers.length > 0) {
      return corsResponse({ error: 'Cet email est déjà utilisé' }, request, { status: 400 });
    }

    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);

    // Get role_id from role name
    const { rows: roleData } = await db.query('SELECT id FROM roles WHERE name = $1', [role]);
    if (roleData.length === 0) {
      return corsResponse({ error: 'Rôle invalide' }, request, { status: 400 });
    }
    const roleId = roleData[0].id;

    const insertQuery = `
      INSERT INTO users (name, email, password, role, role_id, is_active)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name, email, role, role_id, created_at, updated_at, is_active
    `;
    const { rows } = await db.query(insertQuery, [name, email, hashedPassword, role, roleId, true]);

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
