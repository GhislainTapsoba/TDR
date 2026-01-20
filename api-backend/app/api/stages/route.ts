import { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/verifyAuth';
import { db } from '@/lib/db';
import { handleCorsOptions, corsResponse } from '@/lib/cors';
import { mapDbRoleToUserRole, requirePermission, canManageProject } from '@/lib/permissions';

// Gérer les requêtes OPTIONS (preflight CORS)
export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

// GET /api/stages - Récupérer toutes les étapes (filtrées par accès au projet)
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return corsResponse({ error: 'Unauthorized' }, request, { status: 401 });
    }

    const userRole = mapDbRoleToUserRole(user.role as string | null);
    const userId = user.id as string;
    const perm = await requirePermission(userRole, 'stages', 'read');
    if (!perm.allowed) {
      return corsResponse({ error: perm.error }, request, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');

    let queryText: string;
    const queryParams: any[] = [];
    let paramIndex = 1;

    const baseQuery = `
      SELECT s.*, u.name as created_by_name, p.title as project_title
      FROM stages s
      LEFT JOIN users u ON s.created_by_id = u.id
      LEFT JOIN projects p ON s.project_id = p.id
    `;
    const whereClauses: string[] = [];

    // Si ADMIN, retourner toutes les étapes
    if (userRole === 'admin') {
      queryText = baseQuery;
      if (projectId) {
        whereClauses.push(`s.project_id = $${paramIndex++}`);
        queryParams.push(projectId);
      }
    } else {
      // Pour les autres rôles, filtrer par accès au projet
      queryText = baseQuery;
      const { rows: projectMembers } = await db.query('SELECT project_id FROM project_members WHERE user_id = $1', [userId]);
      const memberProjectIds = projectMembers.map(pm => pm.project_id);

      const { rows: assignedTasks } = await db.query('SELECT DISTINCT project_id FROM tasks WHERE assigned_to_id = $1', [userId]);
      const taskProjectIds = assignedTasks.map(t => t.project_id);

      const allAccessibleProjectIds = [...new Set([...memberProjectIds, ...taskProjectIds])];

      const { rows: accessibleProjects } = await db.query(
        `SELECT id FROM projects WHERE created_by_id = $1 OR manager_id = $1 ${allAccessibleProjectIds.length > 0 ? `OR id = ANY($2)` : ''}`,
        allAccessibleProjectIds.length > 0 ? [userId, allAccessibleProjectIds] : [userId]
      );
      const finalAccessibleProjectIds = accessibleProjects.map(p => p.id);

      if (finalAccessibleProjectIds.length === 0) {
        return corsResponse([], request);
      }

      whereClauses.push(`s.project_id = ANY($${paramIndex++})`);
      queryParams.push(finalAccessibleProjectIds);

      if (projectId) {
        if (!finalAccessibleProjectIds.includes(projectId)) {
          return corsResponse({ error: 'Accès non autorisé à ce projet' }, request, { status: 403 });
        }
        whereClauses.push(`s.project_id = $${paramIndex++}`);
        queryParams.push(projectId);
      }
    }

    queryText += (whereClauses.length > 0 ? ` WHERE ${whereClauses.join(' AND ')}` : '');
    queryText += ' ORDER BY s.position ASC';

    const { rows: stages } = await db.query(queryText, queryParams);

    return corsResponse(stages, request);
  } catch (error) {
    console.error('GET /api/stages error:', error);
    return corsResponse(
      { error: 'Erreur serveur' },
      request,
      { status: 500 }
    );
  }
}

// POST /api/stages - Créer une nouvelle étape
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return corsResponse({ error: 'Unauthorized' }, request, { status: 401 });
    }

    const userRole = mapDbRoleToUserRole(user.role as string | null);
    const userId = user.id as string;
    const perm = await requirePermission(userRole, 'stages', 'create');
    if (!perm.allowed) {
      return corsResponse({ error: perm.error }, request, { status: 403 });
    }

    const body = await request.json();
    const { name, description, position, duration, project_id } = body;

    // Validation
    if (!name || !project_id) {
      return corsResponse(
        { error: 'Le nom et le project_id sont requis' },
        request,
        { status: 400 }
      );
    }

    const { rows: projectRows } = await db.query('SELECT id, manager_id FROM projects WHERE id = $1', [project_id]);
    if (projectRows.length === 0) {
      return corsResponse({ error: 'Projet introuvable' }, request, { status: 404 });
    }
    const project = projectRows[0];

    if (!canManageProject(userRole, userId, project.manager_id)) {
      return corsResponse(
        { error: 'Vous ne pouvez créer des étapes que sur vos projets' },
        request,
        { status: 403 }
      );
    }

    const insertQuery = `
      INSERT INTO stages (name, description, "position", duration, project_id, status, created_by_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const { rows } = await db.query(insertQuery, [
      name,
      description || null,
      position || 0,
      duration || null,
      project_id,
      'PENDING',
      userId
    ]);
    const newStage = rows[0];

    await db.query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) 
       VALUES ($1, 'create', 'stage', $2, $3)`,
      [user.id, newStage.id, `Created stage: ${name}`]
    );

    const { rows: finalStageRows } = await db.query(
      `SELECT s.*, u.name as created_by_name, p.title as project_title
       FROM stages s
       LEFT JOIN users u ON s.created_by_id = u.id
       LEFT JOIN projects p ON s.project_id = p.id
       WHERE s.id = $1`,
      [newStage.id]
    );

    return corsResponse(finalStageRows[0], request, { status: 201 });
  } catch (error) {
    console.error('POST /api/stages error:', error);
    return corsResponse(
      { error: 'Erreur serveur' },
      request,
      { status: 500 }
    );
  }
}
