import { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/verifyAuth';
import { db } from '@/lib/db';
import { handleCorsOptions, corsResponse } from '@/lib/cors';
import { mapDbRoleToUserRole, requirePermission, canManageProject } from '@/lib/permissions';

// Gérer les requêtes OPTIONS (preflight CORS)
export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

// GET /api/projects/[id] - Récupérer un projet par ID (avec vérification d'accès)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return corsResponse({ error: 'Unauthorized' }, request, { status: 401 });
    }

    const userRole = mapDbRoleToUserRole(user.role ?? null);
    const perm = requirePermission(userRole, 'projects', 'read');
    if (!perm.allowed) {
      return corsResponse({ error: perm.error }, request, { status: 403 });
    }

    const { id } = await params;

    const { rows, rowCount } = await db.query(
      `SELECT p.*, u.name as manager_name 
       FROM projects p 
       LEFT JOIN users u ON p.manager_id = u.id 
       WHERE p.id = $1`,
      [id]
    );

    if (rowCount === 0) {
      return corsResponse({ error: 'Project not found' }, request, { status: 404 });
    }

    const project = rows[0];

    // Si non-ADMIN, vérifier l'accès au projet
    if (userRole !== 'admin') {
      const hasAccess = project.created_by_id === user.id || project.manager_id === user.id;

      if (!hasAccess) {
        const { rowCount: memberCount } = await db.query(
          'SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2',
          [id, user.id]
        );

        if (memberCount === 0) {
          const { rowCount: taskCount } = await db.query(
            'SELECT id FROM tasks WHERE project_id = $1 AND assigned_to_id = $2 LIMIT 1',
            [id, user.id]
          );

          if (taskCount === 0) {
            return corsResponse({ error: 'Vous n\'avez pas accès à ce projet' }, request, { status: 403 });
          }
        }
      }
    }

    return corsResponse(project, request);
  } catch (error) {
    console.error('Get project error:', error);
    return corsResponse(
      { error: 'Failed to fetch project', details: error instanceof Error ? error.message : 'Unknown error' },
      request,
      { status: 500 }
    );
  }
}

// PATCH /api/projects/[id] - Mettre à jour un projet
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return corsResponse({ error: 'Unauthorized' }, request, { status: 401 });
    }

    const userRole = mapDbRoleToUserRole(user.role ?? null);
    const userId = user.id as string;

    const perm = requirePermission(userRole, 'projects', 'update');
    if (!perm.allowed) {
      return corsResponse({ error: perm.error }, request, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const { rows: projectRows, rowCount: projectCount } = await db.query('SELECT id, manager_id FROM projects WHERE id = $1', [id]);
    if (projectCount === 0) {
      return corsResponse({ error: 'Project not found' }, request, { status: 404 });
    }
    const project = projectRows[0];

    if (!canManageProject(userRole, userId, project.manager_id)) {
      return corsResponse({ error: 'Vous ne pouvez modifier que vos propres projets' }, request, { status: 403 });
    }

    const updateFields: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;
    
    const fieldsToUpdate = ['title', 'description', 'start_date', 'end_date', 'due_date', 'status', 'manager_id'];
    fieldsToUpdate.forEach(field => {
        if (body[field] !== undefined) {
            updateFields.push(`${field} = $${paramIndex++}`);
            queryParams.push(body[field]);
        }
    });

    if (updateFields.length === 0) {
      return corsResponse({ error: 'Aucun champ à mettre à jour' }, request, { status: 400 });
    }

    queryParams.push(id);
    const updateQuery = `
        UPDATE projects SET ${updateFields.join(', ')} 
        WHERE id = $${paramIndex}
        RETURNING *
    `;
    
    await db.query(updateQuery, queryParams);

    const { rows: updatedProjectRows } = await db.query(
        `SELECT p.*, u.name as manager_name 
         FROM projects p 
         LEFT JOIN users u ON p.manager_id = u.id 
         WHERE p.id = $1`,
        [id]
    );

    return corsResponse(updatedProjectRows[0], request);
  } catch (error) {
    console.error('Update project error:', error);
    return corsResponse(
      { error: 'Failed to update project', details: error instanceof Error ? error.message : 'Unknown error' },
      request,
      { status: 500 }
    );
  }
}

// PUT /api/projects/[id] - Mettre à jour un projet (alias de PATCH)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return PATCH(request, { params });
}

// DELETE /api/projects/[id] - Supprimer un projet
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return corsResponse({ error: 'Unauthorized' }, request, { status: 401 });
    }

    const userRole = mapDbRoleToUserRole(user.role ?? null);
    const userId = user.id as string;

    const perm = requirePermission(userRole, 'projects', 'delete');
    if (!perm.allowed) {
      return corsResponse({ error: perm.error }, request, { status: 403 });
    }

    const { id } = await params;

    const { rows: projectRows, rowCount: projectCount } = await db.query('SELECT id, manager_id FROM projects WHERE id = $1', [id]);

    if (projectCount === 0) {
      return corsResponse({ error: 'Project not found' }, request, { status: 404 });
    }
    const project = projectRows[0];
    
    if (!canManageProject(userRole, userId, project.manager_id)) {
      return corsResponse({ error: 'Vous ne pouvez supprimer que vos propres projets' }, request, { status: 403 });
    }

    await db.query('DELETE FROM projects WHERE id = $1', [id]);

    return corsResponse({ message: 'Project deleted successfully' }, request);
  } catch (error) {
    console.error('Delete project error:', error);
    return corsResponse(
      { error: 'Failed to delete project', details: error instanceof Error ? error.message : 'Unknown error' },
      request,
      { status: 500 }
    );
  }
}
