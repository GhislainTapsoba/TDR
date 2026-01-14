import { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/verifyAuth';
import { db } from '@/lib/db';
import { handleCorsOptions, corsResponse } from '@/lib/cors';

// Gérer les requêtes OPTIONS (preflight CORS)
export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

// GET /api/role-permissions - Récupérer toutes les associations rôle-permission
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return corsResponse({ error: 'Unauthorized' }, request, { status: 401 });
    }

    const query = `
      SELECT rp.id, rp.role_id, rp.permission_id, r.name as role_name, p.name as permission_name, p.resource, p.action
      FROM role_permissions rp
      JOIN roles r ON rp.role_id = r.id
      JOIN permissions p ON rp.permission_id = p.id
      ORDER BY r.name, p.resource, p.action
    `;
    const { rows } = await db.query(query);

    return corsResponse(rows, request);
  } catch (error) {
    console.error('GET /api/role-permissions error:', error);
    return corsResponse(
      { error: 'Erreur serveur' },
      request,
      { status: 500 }
    );
  }
}

// POST /api/role-permissions - Assigner une permission à un rôle
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return corsResponse({ error: 'Unauthorized' }, request, { status: 401 });
    }

    const body = await request.json();
    const { role_id, permission_id } = body;

    // Validation
    if (!role_id || !permission_id) {
      return corsResponse(
        { error: 'role_id et permission_id sont requis' },
        request,
        { status: 400 }
      );
    }

    // Vérifier si l'association existe déjà
    const { rows: existing } = await db.query(
      'SELECT id FROM role_permissions WHERE role_id = $1 AND permission_id = $2',
      [role_id, permission_id]
    );
    if (existing.length > 0) {
      return corsResponse({ error: 'Cette association existe déjà' }, request, { status: 400 });
    }

    const insertQuery = `
      INSERT INTO role_permissions (role_id, permission_id)
      VALUES ($1, $2)
      RETURNING id, role_id, permission_id
    `;
    const { rows } = await db.query(insertQuery, [role_id, permission_id]);

    return corsResponse(rows[0], request, { status: 201 });
  } catch (error) {
    console.error('POST /api/role-permissions error:', error);
    return corsResponse(
      { error: 'Erreur serveur' },
      request,
      { status: 500 }
    );
  }
}
