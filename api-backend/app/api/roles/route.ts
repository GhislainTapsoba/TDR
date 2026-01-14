import { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/verifyAuth';
import { db } from '@/lib/db';
import { handleCorsOptions, corsResponse } from '@/lib/cors';

// Gérer les requêtes OPTIONS (preflight CORS)
export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

// GET /api/roles - Récupérer tous les rôles
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return corsResponse({ error: 'Unauthorized' }, request, { status: 401 });
    }

    const query = 'SELECT id, name, description FROM roles ORDER BY name ASC';
    const { rows } = await db.query(query);

    return corsResponse(rows, request);
  } catch (error) {
    console.error('GET /api/roles error:', error);
    return corsResponse(
      { error: 'Erreur serveur' },
      request,
      { status: 500 }
    );
  }
}
