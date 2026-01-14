import { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/verifyAuth';
import { db } from '@/lib/db';
import { handleCorsOptions, corsResponse } from '@/lib/cors';

// Gérer les requêtes OPTIONS (preflight CORS)
export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

// GET /api/permissions - Récupérer toutes les permissions
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return corsResponse({ error: 'Unauthorized' }, request, { status: 401 });
    }

    const query = 'SELECT id, name, description, resource, action FROM permissions ORDER BY resource, action';
    const { rows } = await db.query(query);

    return corsResponse(rows, request);
  } catch (error) {
    console.error('GET /api/permissions error:', error);
    return corsResponse(
      { error: 'Erreur serveur' },
      request,
      { status: 500 }
    );
  }
}

// POST /api/permissions - Créer une nouvelle permission
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return corsResponse({ error: 'Unauthorized' }, request, { status: 401 });
    }

    const body = await request.json();
    const { name, description, resource, action } = body;

    // Validation
    if (!name || !resource || !action) {
      return corsResponse(
        { error: 'Tous les champs sont requis' },
        request,
        { status: 400 }
      );
    }

    const insertQuery = `
      INSERT INTO permissions (name, description, resource, action)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, description, resource, action
    `;
    const { rows } = await db.query(insertQuery, [name, description, resource, action]);

    return corsResponse(rows[0], request, { status: 201 });
  } catch (error) {
    console.error('POST /api/permissions error:', error);
    return corsResponse(
      { error: 'Erreur serveur' },
      request,
      { status: 500 }
    );
  }
}
