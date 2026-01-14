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

// GET /api/users/[id] - Récupérer un utilisateur par ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    const query = 'SELECT id, name, email, role, created_at, updated_at FROM users WHERE id = $1';
    const { rows, rowCount } = await db.query(query, [id]);

    if (rowCount === 0) {
      return corsResponse({ error: 'Utilisateur non trouvé' }, request, { status: 404 });
    }

    return corsResponse(rows[0], request);
  } catch (error) {
    console.error('GET /api/users/[id] error:', error);
    return corsResponse(
      { error: 'Erreur serveur' },
      request,
      { status: 500 }
    );
  }
}

// PATCH /api/users/[id] - Mettre à jour un utilisateur
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return corsResponse({ error: 'Unauthorized' }, request, { status: 401 });
    }

    const userRole = mapDbRoleToUserRole(user.role as string | null);
    const perm = await requirePermission(userRole, 'users', 'update');
    if (!perm.allowed) {
      return corsResponse({ error: perm.error }, request, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const updateFields = [];
    const queryParams = [];
    let paramIndex = 1;

    if (body.name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      queryParams.push(body.name);
    }
    if (body.email !== undefined) {
      updateFields.push(`email = $${paramIndex++}`);
      queryParams.push(body.email);
    }
    if (body.role !== undefined) {
      let dbRole = body.role.toUpperCase();
      if (dbRole === 'ADMIN') dbRole = 'ADMIN';
      else if (dbRole === 'MANAGER') dbRole = 'PROJECT_MANAGER';
      else if (dbRole === 'USER') dbRole = 'EMPLOYEE';
      updateFields.push(`role = $${paramIndex++}`);
      queryParams.push(dbRole);
    }
    if (body.password !== undefined) {
      const hashedPassword = await bcrypt.hash(body.password, 10);
      updateFields.push(`password = $${paramIndex++}`);
      queryParams.push(hashedPassword);
    }

    if (updateFields.length === 0) {
        return corsResponse({ error: 'Aucun champ à mettre à jour' }, request, { status: 400 });
    }

    queryParams.push(id);
    const queryText = `
      UPDATE users
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, name, email, role, created_at, updated_at
    `;

    const { rows, rowCount } = await db.query(queryText, queryParams);

    if (rowCount === 0) {
      return corsResponse({ error: 'Utilisateur non trouvé' }, request, { status: 404 });
    }

    return corsResponse(rows[0], request);
  } catch (error) {
    console.error('PATCH /api/users/[id] error:', error);
    return corsResponse(
      { error: 'Erreur serveur' },
      request,
      { status: 500 }
    );
  }
}

// DELETE /api/users/[id] - Supprimer un utilisateur
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return corsResponse({ error: 'Unauthorized' }, request, { status: 401 });
    }

    const userRole = mapDbRoleToUserRole(user.role as string | null);
    const perm = await requirePermission(userRole, 'users', 'delete');
    if (!perm.allowed) {
      return corsResponse({ error: perm.error }, request, { status: 403 });
    }

    const { id } = await params;

    const { rowCount } = await db.query('DELETE FROM users WHERE id = $1', [id]);

    if (rowCount === 0) {
        return corsResponse({ error: 'Utilisateur non trouvé' }, request, { status: 404 });
    }

    return corsResponse({ success: true, message: 'Utilisateur supprimé avec succès' }, request);
  } catch (error) {
    console.error('DELETE /api/users/[id] error:', error);
    return corsResponse(
      { error: 'Erreur serveur' },
      request,
      { status: 500 }
    );
  }
}
