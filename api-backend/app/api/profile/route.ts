import { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/verifyAuth';
import { db } from '@/lib/db';
import { handleCorsOptions, corsResponse } from '@/lib/cors';

// Gérer les requêtes OPTIONS (preflight CORS)
export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

// GET /api/profile - Récupérer le profil de l'utilisateur connecté
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return corsResponse({ error: 'Unauthorized' }, request, { status: 401 });
    }

    const { rows, rowCount } = await db.query(
      'SELECT id, name, email, role, created_at, updated_at FROM users WHERE id = $1',
      [user.id]
    );

    if (rowCount === 0) {
      return corsResponse({ error: 'Profil utilisateur non trouvé' }, request, { status: 404 });
    }
    const userData = rows[0];

    return corsResponse(userData, request);
  } catch (error) {
    console.error('GET /api/profile error:', error);
    return corsResponse(
      { error: 'Erreur serveur' },
      request,
      { status: 500 }
    );
  }
}

// PUT /api/profile - Mettre à jour le profil de l'utilisateur connecté
export async function PUT(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return corsResponse({ error: 'Unauthorized' }, request, { status: 401 });
    }

    const body = await request.json();
    const { name, email } = body;

    if (!name && !email) {
      return corsResponse(
        { error: 'Au moins un champ (name ou email) doit être fourni' },
        request,
        { status: 400 }
      );
    }

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return corsResponse(
          { error: 'Format d\'email invalide' },
          request,
          { status: 400 }
        );
      }

      const { rowCount: existingUserCount } = await db.query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, user.id]
      );

      if ((existingUserCount ?? 0) > 0) {
        return corsResponse(
          { error: 'Cet email est déjà utilisé par un autre utilisateur' },
          request,
          { status: 409 }
        );
      }
    }

    const updateFields = [];
    const queryParams = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      queryParams.push(name);
    }
    if (email !== undefined) {
      updateFields.push(`email = $${paramIndex++}`);
      queryParams.push(email);
    }

    queryParams.push(user.id);
    const updateQuery = `
      UPDATE users 
      SET ${updateFields.join(', ')} 
      WHERE id = $${paramIndex}
      RETURNING id, name, email, role, created_at, updated_at
    `;

    const { rows: updatedUserRows, rowCount: updatedUserCount } = await db.query(updateQuery, queryParams);

    if (updatedUserCount === 0) {
      return corsResponse({ error: 'Profil utilisateur non trouvé' }, request, { status: 404 });
    }
    const updatedUser = updatedUserRows[0];

    await db.query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details, metadata)
       VALUES ($1, 'update', 'user_profile', $2, $3, $4)`,
      [user.id, user.id, 'Profil mis à jour', JSON.stringify(body)]
    );

    return corsResponse(updatedUser, request);
  } catch (error) {
    console.error('PUT /api/profile error:', error);
    return corsResponse(
      { error: 'Erreur serveur' },
      request,
      { status: 500 }
    );
  }
}
