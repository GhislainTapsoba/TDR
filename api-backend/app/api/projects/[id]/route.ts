import { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/verifyAuth';
import { db } from '@/lib/db';
import { handleCorsOptions, corsResponse } from '@/lib/cors';
import { mapDbRoleToUserRole, requirePermission, canManageProject } from '@/lib/permissions';
import { isValidUUID } from '@/lib/validation';

// Helper function to map frontend status to DB status
const mapFrontendStatusToDbStatus = (frontendStatus: string) => {
  switch (frontendStatus) {
    case 'planifie': return 'PLANNING';
    case 'en_cours': return 'IN_PROGRESS';
    case 'en_pause': return 'ON_HOLD';
    case 'termine': return 'COMPLETED';
    case 'annule': return 'CANCELLED';
    default: return 'PLANNING'; // Default to a valid status
  }
};

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
    const perm = await requirePermission(userRole, 'projects', 'read');
    if (!perm.allowed) {
      return corsResponse({ error: perm.error }, request, { status: 403 });
    }

    const { id } = await params;

    if (!isValidUUID(id)) {
      return corsResponse({ error: 'Invalid UUID format' }, request, { status: 400 });
    }

    // Get project with manager info
    const { rows, rowCount } = await db.query(
      `SELECT p.*, u.name as manager_name, u.email as manager_email
       FROM projects p
       LEFT JOIN users u ON p.manager_id = u.id
       WHERE p.id = $1`,
      [id]
    );

    if (rowCount === 0) {
      return corsResponse({ error: 'Project not found' }, request, { status: 404 });
    }

    const project = rows[0];

    // Get team members (from project_members table or tasks assigned to project)
    const { rows: teamMemberRows } = await db.query(
      `SELECT DISTINCT u.id, u.name, u.email, u.role
       FROM users u
       WHERE u.id IN (
         SELECT pm.user_id FROM project_members pm WHERE pm.project_id = $1
         UNION
         SELECT ta.user_id FROM task_assignees ta JOIN tasks t ON ta.task_id = t.id WHERE t.project_id = $1
       )`,
      [id]
    );

    // Get project statistics
    const { rows: statsRows } = await db.query(
      `SELECT
        COUNT(DISTINCT t.id) as total_tasks,
        COUNT(DISTINCT CASE WHEN t.status = 'COMPLETED' THEN t.id END) as completed_tasks,
        COUNT(DISTINCT CASE WHEN t.status = 'IN_PROGRESS' THEN t.id END) as in_progress_tasks,
        COUNT(DISTINCT CASE WHEN t.status = 'TODO' AND t.due_date < NOW() THEN t.id END) as overdue_tasks,
        COUNT(DISTINCT s.id) as total_stages,
        COUNT(DISTINCT CASE WHEN s.status = 'COMPLETED' THEN s.id END) as completed_stages
       FROM projects p
       LEFT JOIN stages s ON s.project_id = p.id
       LEFT JOIN tasks t ON t.project_id = p.id
       WHERE p.id = $1`,
      [id]
    );

    const stats = statsRows[0];
    const progress_percentage = stats.total_tasks > 0 ? Math.round((stats.completed_tasks / stats.total_tasks) * 100) : 0;
    const is_overdue = stats.overdue_tasks > 0;

    // Allow all authenticated users to read project details; permissions are checked in the frontend for actions

    // Transform data to match frontend expectations
    const transformedProject = {
      id: project.id,
      title: project.title,
      description: project.description,
      start_date: project.start_date,
      end_date: project.end_date,
      status: project.status === 'PLANNING' ? 'planifie' :
              project.status === 'IN_PROGRESS' ? 'en_cours' :
              project.status === 'ON_HOLD' ? 'en_pause' :
              project.status === 'COMPLETED' ? 'termine' :
              project.status === 'CANCELLED' ? 'annule' : 'planifie',
      manager_id: project.manager_id,
      manager: project.manager_name ? {
        id: project.manager_id,
        name: project.manager_name,
        email: project.manager_email
      } : null,
      team_members: teamMemberRows.map(tm => tm.id),
      teamMembers: teamMemberRows,
      stats: {
        total_tasks: parseInt(stats.total_tasks) || 0,
        completed_tasks: parseInt(stats.completed_tasks) || 0,
        in_progress_tasks: parseInt(stats.in_progress_tasks) || 0,
        overdue_tasks: parseInt(stats.overdue_tasks) || 0,
        total_stages: parseInt(stats.total_stages) || 0,
        completed_stages: parseInt(stats.completed_stages) || 0,
        progress_percentage: progress_percentage,
        is_overdue: is_overdue
      }
    };

    return corsResponse(transformedProject, request);
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
    
    const fieldsToUpdate = ['title', 'description', 'start_date', 'end_date', 'manager_id']; // Removed 'status'

    fieldsToUpdate.forEach(field => {
        if (body[field] !== undefined) {
            updateFields.push(`${field} = $${paramIndex++}`);
            queryParams.push(body[field]);
        }
    });

    // Handle status separately with mapping
    if (body.status !== undefined) {
      const dbStatus = mapFrontendStatusToDbStatus(body.status);
      updateFields.push(`status = $${paramIndex++}`);
      queryParams.push(dbStatus);
    }

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
