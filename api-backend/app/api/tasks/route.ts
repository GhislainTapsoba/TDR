import { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/verifyAuth';
import { db } from '@/lib/db';
import { handleCorsOptions, corsResponse } from '@/lib/cors';
import { createConfirmationToken } from '@/lib/emailConfirmation';
import { mapDbRoleToUserRole, requirePermission, canManageProject } from '@/lib/permissions';
import { sendActionNotification } from '@/lib/notificationService';

// Gérer les requêtes OPTIONS (preflight CORS)
export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

// GET /api/tasks - Récupérer toutes les tâches (filtrées par assignation)
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return corsResponse({ error: 'Unauthorized' }, request, { status: 401 });
    }

    const userRole = mapDbRoleToUserRole(user.role);
    const perm = await requirePermission(userRole, 'tasks', 'read');
    if (!perm.allowed) {
      return corsResponse({ error: perm.error }, request, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const project_id = searchParams.get('project_id');

    let queryText: string;
    const queryParams: any[] = [];
    let paramIndex = 1;

    const baseQuery = `
      SELECT t.*, 
             c.name as created_by_name,
             (SELECT json_agg(json_build_object('id', u.id, 'name', u.name, 'email', u.email)) 
              FROM task_assignees ta
              JOIN users u ON ta.user_id = u.id
              WHERE ta.task_id = t.id) as assignees
      FROM tasks t 
      LEFT JOIN users c ON t.created_by_id = c.id
    `;
    const whereClauses: string[] = [];

    if (userRole === 'admin') {
      if (status) {
        whereClauses.push(`t.status = $${paramIndex++}`);
        queryParams.push(status);
      }
      if (project_id) {
        whereClauses.push(`t.project_id = $${paramIndex++}`);
        queryParams.push(project_id);
      }
    } else {
      const { rows: projectMembers } = await db.query('SELECT project_id FROM project_members WHERE user_id = $1', [user.id]);
      const memberProjectIds = projectMembers.map(pm => pm.project_id);

      const { rows: managedProjects } = await db.query('SELECT id FROM projects WHERE manager_id = $1 OR created_by_id = $1', [user.id]);
      const managedProjectIds = managedProjects.map(p => p.id);

      const accessibleProjectIds = [...new Set([...memberProjectIds, ...managedProjectIds])];

      let accessControlClause = `EXISTS (SELECT 1 FROM task_assignees ta WHERE ta.task_id = t.id AND ta.user_id = $${paramIndex++})`;
      queryParams.push(user.id);

      if (accessibleProjectIds.length > 0) {
        accessControlClause += ` OR t.project_id = ANY($${paramIndex++})`;
        queryParams.push(accessibleProjectIds);
      }
      whereClauses.push(`(${accessControlClause})`);
      
      if (status) {
        whereClauses.push(`t.status = $${paramIndex++}`);
        queryParams.push(status);
      }
      if (project_id) {
        whereClauses.push(`t.project_id = $${paramIndex++}`);
        queryParams.push(project_id);
      }
    }

    queryText = baseQuery + (whereClauses.length > 0 ? ` WHERE ${whereClauses.join(' AND ')}` : '');
    queryText += ' ORDER BY t.created_at DESC';

    const { rows: tasks } = await db.query(queryText, queryParams);

    return corsResponse(tasks || [], request);
  } catch (error) {
    console.error('GET /api/tasks error:', error);
    return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
  }
}

// POST /api/tasks - Créer une nouvelle tâche
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return corsResponse({ error: 'Unauthorized' }, request, { status: 401 });
    }

    const userRole = mapDbRoleToUserRole(user.role);
    const userId = user.id;
    const perm = await requirePermission(userRole, 'tasks', 'create');
    if (!perm.allowed) {
      return corsResponse({ error: perm.error }, request, { status: 403 });
    }

    const body = await request.json();
    const { title, description, status, priority, due_date, assignee_ids, project_id, stage_id } = body;

    if (!title || !project_id) {
      return corsResponse({ error: 'Le titre et le project_id sont requis' }, request, { status: 400 });
    }

    const { rows: projectRows } = await db.query('SELECT id, manager_id FROM projects WHERE id = $1', [project_id]);
    if (projectRows.length === 0) {
      return corsResponse({ error: 'Projet introuvable' }, request, { status: 404 });
    }
    const project = projectRows[0];

    if (!canManageProject(userRole, userId, project.manager_id)) {
      return corsResponse({ error: 'Vous ne pouvez créer des tâches que sur vos projets' }, request, { status: 403 });
    }

    // Validate stage_id if provided
    if (stage_id) {
      const { rows: stageRows } = await db.query('SELECT id, project_id FROM stages WHERE id = $1', [stage_id]);
      if (stageRows.length === 0) {
        return corsResponse({ error: 'Étape introuvable' }, request, { status: 400 });
      }
      const stage = stageRows[0];
      if (stage.project_id !== project_id) {
        return corsResponse({ error: 'L\'étape n\'appartient pas au projet spécifié' }, request, { status: 400 });
      }
    }

    // Validate assignee_ids if provided
    if (assignee_ids && Array.isArray(assignee_ids) && assignee_ids.length > 0) {
      const { rows: userRows } = await db.query('SELECT id FROM users WHERE id = ANY($1::uuid[])', [assignee_ids]);
      if (userRows.length !== assignee_ids.length) {
        return corsResponse({ error: 'Un ou plusieurs utilisateurs assignés n\'existent pas' }, request, { status: 400 });
      }
    }

    const insertQuery = `
      INSERT INTO tasks (title, description, status, priority, due_date, project_id, stage_id, created_by_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const { rows: taskRows } = await db.query(insertQuery, [
      title,
      description || null,
      status || 'TODO',
      priority || 'MEDIUM',
      due_date || null,
      project_id,
      stage_id || null,
      userId,
    ]);
    const task = taskRows[0];

    let assignedUsers: any[] = [];
    if (assignee_ids && Array.isArray(assignee_ids) && assignee_ids.length > 0) {
      const insertAssigneesQuery = `
        INSERT INTO task_assignees (task_id, user_id)
        SELECT $1, user_id FROM unnest($2::uuid[]) AS user_id
      `;
      await db.query(insertAssigneesQuery, [task.id, assignee_ids]);

      const { rows: usersRows } = await db.query(
        'SELECT id, name, email, role FROM users WHERE id = ANY($1::uuid[])',
        [assignee_ids]
      );
      assignedUsers = usersRows;
    }

    // Get project details for notifications
    const { rows: detailsRows } = await db.query(
      'SELECT title as project_name, title as project_title FROM projects WHERE id = $1',
      [task.project_id]
    );
    const details = detailsRows[0] || {};

    if (assignedUsers.length > 0) {
      for (const assignedUser of assignedUsers) {
        const confirmationToken = await createConfirmationToken({
          type: 'TASK_ASSIGNMENT',
          userId: assignedUser.id,
          entityType: 'task',
          entityId: task.id,
          metadata: {
            task_title: task.title,
            project_name: details.project_title || details.project_name || 'Projet',
          },
        });

        await db.query(
          `INSERT INTO notifications (user_id, type, title, message, metadata)
           VALUES ($1, 'TASK_ASSIGNED', 'Nouvelle tâche assignée', $2, $3)`,
          [
            assignedUser.id,
            `Vous avez été assigné à la tâche: ${task.title}`,
            JSON.stringify({ task_id: task.id, project_id: task.project_id, priority: task.priority }),
          ]
        );

        await sendActionNotification({
          actionType: 'TASK_ASSIGNED',
          performedBy: { id: user.id, name: user.name || 'Utilisateur', email: user.email, role: user.role as 'ADMIN' | 'MANAGER' | 'EMPLOYEE' },
          entity: { type: 'task', id: task.id, data: task },
          affectedUsers: [assignedUser],
          projectId: task.project_id,
          metadata: {
            projectName: details.project_title || details.project_name || 'Projet',
            assigneeName: assignedUser.name || 'Utilisateur',
            confirmationToken,
          },
        });
      }
    } else {
        await sendActionNotification({
            actionType: 'TASK_CREATED',
            performedBy: { id: user.id, name: user.name || 'Utilisateur', email: user.email, role: user.role as 'ADMIN' | 'MANAGER' | 'EMPLOYEE' },
            entity: { type: 'task', id: task.id, data: task },
            projectId: task.project_id,
            metadata: {
              projectName: details.project_title || details.project_name || 'Projet',
            }
        });
    }

    // Finally, get the full task with names for the response
    const { rows: finalTaskRows } = await db.query(`
      SELECT t.*, c.name as created_by_name,
             (SELECT json_agg(json_build_object('id', u.id, 'name', u.name)) 
              FROM task_assignees ta
              JOIN users u ON ta.user_id = u.id
              WHERE ta.task_id = t.id) as assignees
      FROM tasks t 
      LEFT JOIN users c ON t.created_by_id = c.id
      WHERE t.id = $1
    `, [task.id]);

    return corsResponse(finalTaskRows[0], request, { status: 201 });
  } catch (error) {
    console.error('POST /api/tasks error:', error);
    return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
  }
}
