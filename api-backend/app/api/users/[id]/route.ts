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
    
    const query = 'SELECT id, name, email, role, is_active, created_at, updated_at FROM users WHERE id = $1';
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

// PUT /api/users/[id] - Mettre à jour un utilisateur
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return PATCH(request, { params });
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
      else if (dbRole === 'MANAGER') dbRole = 'MANAGER';
      else if (dbRole === 'USER') dbRole = 'EMPLOYEE';
      updateFields.push(`role = $${paramIndex++}`);
      queryParams.push(dbRole);
    }
    if (body.password !== undefined) {
      const hashedPassword = await bcrypt.hash(body.password, 10);
      updateFields.push(`password = $${paramIndex++}`);
      queryParams.push(hashedPassword);
    }
    if (body.is_active !== undefined) {
      updateFields.push(`is_active = $${paramIndex++}`);
      queryParams.push(body.is_active);
    }

    if (updateFields.length === 0) {
        return corsResponse({ error: 'Aucun champ à mettre à jour' }, request, { status: 400 });
    }

    queryParams.push(id);
    const queryText = `
      UPDATE users
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, name, email, role, is_active, created_at, updated_at
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
    
    // Vérifier si l'utilisateur a des projets
    const { rows: projects } = await db.query('SELECT COUNT(*) as count FROM projects WHERE created_by_id = $1', [id]);
    const projectCount = parseInt(projects[0].count);
    
    if (projectCount > 0) {
      // Si l'utilisateur a des projets, faire une suppression "douce" (soft delete)
      await db.query('UPDATE users SET is_active = FALSE WHERE id = $1', [id]);
      return corsResponse({ 
        success: true, 
        message: `L'utilisateur a été désactivé car il a ${projectCount} projet(s) associé(s).` 
      }, request);
    }
    
    // Vérifier si l'utilisateur a des tâches assignées
    const { rows: tasks } = await db.query('SELECT COUNT(*) as count FROM task_assignees WHERE user_id = $1', [id]);
    const taskCount = parseInt(tasks[0].count);
    
    if (taskCount > 0) {
      // Supprimer les assignations de tâches
      await db.query('DELETE FROM task_assignees WHERE user_id = $1', [id]);
    }
    
    const { rowCount } = await db.query('DELETE FROM users WHERE id = $1', [id]);

    if (rowCount === 0) {
        return corsResponse({ error: 'Utilisateur non trouvé' }, request, { status: 404 });
    }

    return corsResponse({ 
      success: true, 
      message: `Utilisateur supprimé avec succès${taskCount > 0 ? ` (${taskCount} assignation(s) de tâche supprimée(s))` : ''}` 
    }, request);
  } catch (error) {
    console.error('DELETE /api/users/[id] error:', error);
    return corsResponse(
      { error: 'Erreur serveur' },
      request,
      { status: 500 }
    );
  }
}
