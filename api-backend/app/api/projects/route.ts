gemimport { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/verifyAuth';
import { db } from '@/lib/db';
import { handleCorsOptions, corsResponse } from '@/lib/cors';
import { mapDbRoleToUserRole, requirePermission, canManageProject } from '@/lib/permissions';
import { isValidUUID } from '@/lib/validation';

// Gérer les requêtes OPTIONS (preflight CORS)
export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

// GET /api/projects - Récupérer tous les projets (avec vérification d'accès)
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return corsResponse({ error: 'Unauthorized' }, request, { status: 401 });
    }

    const userRole = mapDbRoleToUserRole(user.role as string | null);
    const userId = user.id as string;

    const perm = await requirePermission(userRole, 'projects', 'read');
    if (!perm.allowed) {
      return corsResponse({ error: perm.error }, request, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');

    let queryText = `
      SELECT DISTINCT p.id, p.title, p.description,
             CASE
               WHEN p.status = 'PLANNING' THEN 'planifie'
               WHEN p.status = 'IN_PROGRESS' THEN 'en_cours'
               WHEN p.status = 'ON_HOLD' THEN 'en_pause'
               WHEN p.status = 'COMPLETED' THEN 'termine'
               WHEN p.status = 'CANCELLED' THEN 'annule'
               ELSE 'planifie'
             END as status,
             p.start_date, p.end_date, p.due_date,
             p.manager_id as chef_projet_id, p.created_by_id, p.created_at, p.updated_at,
             u.name as manager_name, u.email as manager_email, cu.name as created_by_name
      FROM projects p
      LEFT JOIN users u ON p.manager_id = u.id
      LEFT JOIN users cu ON p.created_by_id = cu.id
    `;
    const queryParams: (string | number)[] = [];
    let whereClauses: string[] = [];
    let paramIndex = 1;

    if (userRole === 'admin') {
      // Admin sees all projects (optionally filtered by status)
      if (statusFilter) {
        whereClauses.push(`p.status = $${paramIndex++}`);
        queryParams.push(statusFilter);
      }
    } else if (userRole === 'manager') {
      // Manager sees:
      // 1. Projects they manage (as manager_id)
      // 2. Projects they created
      // 3. Projects where they are assigned to tasks
      let managerWhere: string[] = [];

      managerWhere.push(`p.manager_id = $${paramIndex++}`);
      queryParams.push(userId);

      managerWhere.push(`p.created_by_id = $${paramIndex++}`);
      queryParams.push(userId);

      managerWhere.push(`
        p.id IN (
          SELECT DISTINCT t.project_id
          FROM tasks t
          WHERE t.assigned_to = $${paramIndex++}
        )
      `);
      queryParams.push(userId);

      let finalManagerWhere = `(${managerWhere.join(' OR ')})`;

      if (statusFilter) {
        finalManagerWhere += ` AND p.status = $${paramIndex++}`;
        queryParams.push(statusFilter);
      }

      whereClauses.push(finalManagerWhere);
    } else {
      // Employee sees:
      // 1. Projects they created
      // 2. Projects where they are assigned to tasks
      // 3. Projects they manage (if any)
      let employeeWhere: string[] = [];

      employeeWhere.push(`p.created_by_id = $${paramIndex++}`);
      queryParams.push(userId);

      employeeWhere.push(`p.manager_id = $${paramIndex++}`);
      queryParams.push(userId);

      employeeWhere.push(`
        p.id IN (
          SELECT DISTINCT t.project_id
          FROM tasks t
          WHERE t.assigned_to = $${paramIndex++}
        )
      `);
      queryParams.push(userId);

      let finalEmployeeWhere = `(${employeeWhere.join(' OR ')})`;

      if (statusFilter) {
        finalEmployeeWhere += ` AND p.status = $${paramIndex++}`;
        queryParams.push(statusFilter);
      }

      whereClauses.push(finalEmployeeWhere);
    }

    if (whereClauses.length > 0) {
      queryText += ' WHERE ' + whereClauses.join(' AND ');
    }

    queryText += ' ORDER BY p.created_at DESC';

    const { rows } = await db.query(queryText, queryParams);

    // Transform data to match frontend expectations
    const transformedRows = rows.map(row => ({
      id: parseInt(row.id),
      title: row.title,
      description: row.description,
      start_date: row.start_date,
      end_date: row.end_date,
      status: row.status,
      chef_projet_id: parseInt(row.chef_projet_id),
      chef_projet: row.manager_name ? {
        id: parseInt(row.chef_projet_id),
        name: row.manager_name,
        email: row.manager_email
      } : null
    }));

    return corsResponse(transformedRows, request);
  } catch (error) {
    console.error('GET /api/projects error:', error);
    return corsResponse(
      { error: 'Erreur serveur' },
      request,
      { status: 500 }
    );
  }
}

// POST /api/projects - Créer un nouveau projet
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return corsResponse({ error: 'Unauthorized' }, request, { status: 401 });
    }

    const userRole = mapDbRoleToUserRole(user.role as string | null);

    const perm = await requirePermission(userRole, 'projects', 'create');
    if (!perm.allowed) {
      return corsResponse({ error: perm.error }, request, { status: 403 });
    }

    const body = await request.json();
    const { title, description, start_date, end_date, due_date, manager_id, status = 'PLANNING' } = body;

    // Validation
    if (!title) {
      return corsResponse(
        { error: 'Le titre est requis' },
        request,
        { status: 400 }
      );
    }

    // Vérifier les permissions pour assigner un manager
    let finalManagerId = manager_id;
    if (manager_id) {
      if (userRole !== 'admin') {
        // Seuls les admins peuvent assigner un manager différent
        finalManagerId = user.id;
      }
    } else {
      // Si pas de manager spécifié, utiliser l'utilisateur actuel si c'est un manager
      if (userRole === 'manager' || userRole === 'admin') {
        finalManagerId = user.id;
      }
    }

    const insertQuery = `
      INSERT INTO projects (title, description, status, start_date, end_date, due_date, manager_id, created_by_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, title, description, status, start_date, end_date, due_date, manager_id, created_by_id, created_at, updated_at
    `;
    const { rows } = await db.query(insertQuery, [
      title,
      description || null,
      status,
      start_date || null,
      end_date || null,
      due_date || null,
      finalManagerId || null,
      user.id
    ]);

    // Get the created project with manager info for proper formatting
    const { rows: createdRows } = await db.query(
      `SELECT p.*, u.name as manager_name, u.email as manager_email
       FROM projects p
       LEFT JOIN users u ON p.manager_id = u.id
       WHERE p.id = $1`,
      [rows[0].id]
    );

    const createdProject = createdRows[0];

    // Transform to match frontend expectations
    const transformedProject = {
      id: parseInt(createdProject.id),
      title: createdProject.title,
      description: createdProject.description,
      start_date: createdProject.start_date,
      end_date: createdProject.end_date,
      status: createdProject.status === 'PLANNING' ? 'planifie' :
              createdProject.status === 'IN_PROGRESS' ? 'en_cours' :
              createdProject.status === 'ON_HOLD' ? 'en_pause' :
              createdProject.status === 'COMPLETED' ? 'termine' :
              createdProject.status === 'CANCELLED' ? 'annule' : 'planifie',
      chef_projet_id: parseInt(createdProject.manager_id),
      chef_projet: createdProject.manager_name ? {
        id: parseInt(createdProject.manager_id),
        name: createdProject.manager_name,
        email: createdProject.manager_email
      } : null
    };

    return corsResponse(transformedProject, request, { status: 201 });
  } catch (error) {
    console.error('POST /api/projects error:', error);
    return corsResponse(
      { error: 'Erreur serveur' },
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

    const perm = await requirePermission(userRole, 'projects', 'update');
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

    const fieldsToUpdate = ['title', 'description', 'start_date', 'end_date', 'status', 'manager_id'];
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
        `SELECT p.*, u.name as manager_name, u.email as manager_email
         FROM projects p
         LEFT JOIN users u ON p.manager_id = u.id
         WHERE p.id = $1`,
        [id]
    );

    const updatedProject = updatedProjectRows[0];

    // Transform to match frontend expectations
    const transformedProject = {
      id: parseInt(updatedProject.id),
      title: updatedProject.title,
      description: updatedProject.description,
      start_date: updatedProject.start_date,
      end_date: updatedProject.end_date,
      status: updatedProject.status === 'PLANNING' ? 'planifie' :
              updatedProject.status === 'IN_PROGRESS' ? 'en_cours' :
              updatedProject.status === 'ON_HOLD' ? 'en_pause' :
              updatedProject.status === 'COMPLETED' ? 'termine' :
              updatedProject.status === 'CANCELLED' ? 'annule' : 'planifie',
      chef_projet_id: parseInt(updatedProject.manager_id),
      chef_projet: updatedProject.manager_name ? {
        id: parseInt(updatedProject.manager_id),
        name: updatedProject.manager_name,
        email: updatedProject.manager_email
      } : null
    };

    return corsResponse(transformedProject, request);
  } catch (error) {
    console.error('Update project error:', error);
    return corsResponse(
      { error: 'Failed to update project', details: error instanceof Error ? error.message : 'Unknown error' },
      request,
      { status: 500 }
    );
  }
}

// PUT /api/projects - Not implemented (PUT is for individual resources)
export async function PUT(request: NextRequest) {
  return corsResponse({ error: 'Method not allowed' }, request, { status: 405 });
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

    const perm = await requirePermission(userRole, 'projects', 'delete');
    if (!perm.allowed) {
      return corsResponse({ error: perm.error }, request, { status: 403 });
    }

    const { id } = await params;

    if (!isValidUUID(id)) {
      return corsResponse({ error: 'Invalid UUID format' }, request, { status: 400 });
    }

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
