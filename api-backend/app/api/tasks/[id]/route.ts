import { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/verifyAuth';
import { db } from '@/lib/db';
import { handleCorsOptions, corsResponse } from '@/lib/cors';
import { createConfirmationToken } from '@/lib/emailConfirmation';
import { mapDbRoleToUserRole, requirePermission, canEditTask, canManageProject } from '@/lib/permissions';
import { sendActionNotification } from '@/lib/notificationService';

// Mapping for task status from frontend to DB
const mapFrontendStatusToDb = (status: string): string => {
  const statusMap: Record<string, string> = {
    'a_faire': 'TODO',
    'en_cours': 'IN_PROGRESS',
    'termine': 'COMPLETED',
    'refuse': 'REFUSED', // Add refused status mapping
  };
  return statusMap[status] || status;
};

type UserInfo = { id: string; name: string | null; email: string; role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE' };

// Gérer les requêtes OPTIONS (preflight CORS)
export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

// GET /api/tasks/[id] - Récupérer une tâche par ID (avec vérification d'accès)
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
    const perm = await requirePermission(userRole, 'tasks', 'read');
    if (!perm.allowed) {
      return corsResponse({ error: perm.error }, request, { status: 403 });
    }

    const { id } = await params;

    const { rows, rowCount } = await db.query(
      `SELECT t.*, c.name as created_by_name,
              (SELECT json_agg(ta.user_id) FROM task_assignees ta WHERE ta.task_id = t.id) as assignees
       FROM tasks t
       LEFT JOIN users c ON t.created_by_id = c.id
       WHERE t.id = $1`,
      [id]
    );

    if (rowCount === 0) {
      return corsResponse({ error: 'Tâche non trouvée' }, request, { status: 404 });
    }
    const task = rows[0];

    // Si non-ADMIN, vérifier l'accès à la tâche
    if (userRole !== 'admin') {
      const { rows: assigneeRows } = await db.query('SELECT user_id FROM task_assignees WHERE task_id = $1', [id]);
      const assignees = assigneeRows.map(row => row.user_id);
      if (!assignees.includes(user.id)) {
        const { rows: projectRows } = await db.query(
          'SELECT created_by_id, manager_id FROM projects WHERE id = $1',
          [task.project_id]
        );
        if (projectRows.length > 0) {
          const project = projectRows[0];
          if (project.created_by_id !== user.id && project.manager_id !== user.id) {
            const { rowCount: memberCount } = await db.query(
              'SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2',
              [task.project_id, user.id]
            );
            if (memberCount === 0) {
              return corsResponse({ error: 'Vous n\'avez pas accès à cette tâche' }, request, { status: 403 });
            }
          }
        }
      }
    }

    return corsResponse(task, request);
  } catch (error) {
    console.error('GET /api/tasks/[id] error:', error);
    return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
  }
}

// PATCH /api/tasks/[id] - Mettre à jour une tâche
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
    const userId = user.id as string;
    const userPermissions = user.permissions as string[];
    const perm = await requirePermission(userRole, 'tasks', 'update');
    // Allow if user has permission or is employee (will check assignment later)
    if (!perm.allowed && userRole !== 'user') {
      return corsResponse({ error: perm.error }, request, { status: 403 });
    }

    const { id: taskId } = await params;
    const body = await request.json();

    const { rows: oldTaskRows } = await db.query('SELECT * FROM tasks WHERE id = $1', [taskId]);
    if (oldTaskRows.length === 0) {
      return corsResponse({ error: 'Tâche non trouvée' }, request, { status: 404 });
    }
    const oldTask = oldTaskRows[0];

    const { rows: projectRows } = await db.query('SELECT id, manager_id FROM projects WHERE id = $1', [oldTask.project_id]);
    if (projectRows.length === 0) {
      return corsResponse({ error: 'Projet associé introuvable' }, request, { status: 404 });
    }
    const project = projectRows[0];

    // Check if user can edit task
    const { rows: oldAssigneeRows } = await db.query('SELECT user_id FROM task_assignees WHERE task_id = $1', [taskId]);
    const oldAssignees = oldAssigneeRows.map(row => row.user_id);
    if (!canEditTask(userRole, userId, oldAssignees, project.manager_id)) {
      return corsResponse({ error: 'Vous ne pouvez modifier que vos tâches ou celles de vos projets' }, request, { status: 403 });
    }

    const updateFields: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    const fields = ['title', 'description', 'status', 'priority', 'due_date', 'project_id', 'stage_id'];
    fields.forEach(field => {
        if (body[field] !== undefined) {
            updateFields.push(`${field} = $${paramIndex++}`);
            let value = body[field];
            if (field === 'status') {
                value = mapFrontendStatusToDb(value);
            }
            queryParams.push(value);
        }
    });
    if (mapFrontendStatusToDb(body.status) === 'COMPLETED' && !body.completed_at) {
        updateFields.push(`completed_at = $${paramIndex++}`);
        queryParams.push(new Date().toISOString());
    }

    if (updateFields.length === 0 && !body.assignees) {
        return corsResponse({ error: 'Aucun champ à mettre à jour'}, request, {status: 400})
    }

    // Handle assignees update
    if (body.assignees !== undefined) {
      if (!Array.isArray(body.assignees)) {
        return corsResponse({ error: 'Les assignees doivent être un tableau' }, request, { status: 400 });
      }
      // Validate assignee_ids if provided
      if (body.assignees.length > 0) {
        const { rows: userRows } = await db.query('SELECT id FROM users WHERE id = ANY($1::uuid[])', [body.assignees]);
        if (userRows.length !== body.assignees.length) {
          return corsResponse({ error: 'Un ou plusieurs utilisateurs assignés n\'existent pas' }, request, { status: 400 });
        }
      }
      // Check permission for assignment
      if (!userPermissions.includes('tasks.assign')) {
        return corsResponse({ error: 'Vous n\'avez pas la permission d\'assigner des tâches' }, request, { status: 403 });
      }
    }

    // Start transaction
    await db.query('BEGIN');

    if (updateFields.length > 0) {
      queryParams.push(taskId);
      const updateQuery = `UPDATE tasks SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
      const { rows: updatedTaskRows } = await db.query(updateQuery, queryParams);
    }

    // Update assignees if provided
    if (body.assignees !== undefined) {
      await db.query('DELETE FROM task_assignees WHERE task_id = $1', [taskId]);
      if (body.assignees.length > 0) {
        const insertAssigneesQuery = `
          INSERT INTO task_assignees (task_id, user_id)
          SELECT $1, user_id FROM unnest($2::uuid[]) AS user_id
        `;
        await db.query(insertAssigneesQuery, [taskId, body.assignees]);
      }
    }

    await db.query('COMMIT');

    // Get updated task
    const { rows: finalTaskRows } = await db.query(`
      SELECT t.*, c.name as created_by_name,
             (SELECT json_agg(ta.user_id) FROM task_assignees ta WHERE ta.task_id = t.id) as assignees
      FROM tasks t
      LEFT JOIN users c ON t.created_by_id = c.id
      WHERE t.id = $1
    `, [taskId]);
    const task = finalTaskRows[0];

    // Notification Logic
    const changes: string[] = [];
    if (body.title && oldTask?.title !== body.title) changes.push(`Titre modifié`);
    if (body.status && oldTask?.status !== body.status) changes.push(`Statut changé: ${oldTask?.status} → ${body.status}`);
    const hasReassignment = body.assignees !== undefined && JSON.stringify(oldAssignees.sort()) !== JSON.stringify(body.assignees.sort());
    const mappedStatus = body.status ? mapFrontendStatusToDb(body.status) : null;
    const hasStatusChange = !!(body.status && oldTask?.status !== mappedStatus);
    const isCompletedNow = mappedStatus === 'COMPLETED' && oldTask?.status !== 'COMPLETED';

    if (hasReassignment && body.assignees.length > 0) {
      const { rows: assignedUsersRows } = await db.query(
        'SELECT id, name, email, role FROM users WHERE id = ANY($1::uuid[])',
        [body.assignees]
      );
      const assignedUsers = assignedUsersRows.map(row => ({
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role as 'ADMIN' | 'MANAGER' | 'EMPLOYEE'
      }));

      const { rows: detailRows } = await db.query(
        'SELECT title as project_title FROM projects WHERE id = $1',
        [task.project_id]
      );
      const details = detailRows[0] || {};

      for (const assignedUser of assignedUsers) {
        const token = await createConfirmationToken({
          type: 'TASK_ASSIGNMENT',
          userId: assignedUser.id,
          entityType: 'task',
          entityId: task.id,
          metadata: { task_title: task.title, project_name: details.project_title }
        });
        await sendActionNotification({
          actionType: 'TASK_ASSIGNED',
          performedBy: { ...user, name: user.name || 'Utilisateur', role: user.role as 'ADMIN' | 'MANAGER' | 'EMPLOYEE' },
          entity: { type: 'task', id: task.id, data: task },
          affectedUsers: [assignedUser],
          projectId: task.project_id,
          metadata: { projectName: details.project_title, assigneeName: assignedUser.name, confirmationToken: token }
        });
      }
    }

    if (hasStatusChange) {
      const { rows: assignedUsersRows } = await db.query(
        'SELECT id, name, email, role FROM users WHERE id = ANY(SELECT user_id FROM task_assignees WHERE task_id = $1)',
        [taskId]
      );
      const assignedUsers = assignedUsersRows.map(row => ({
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role as 'ADMIN' | 'MANAGER' | 'EMPLOYEE'
      }));

      const { rows: detailRows } = await db.query(
        'SELECT title as project_title FROM projects WHERE id = $1',
        [task.project_id]
      );
      const details = detailRows[0] || {};

      let token: string | null = null;
      if (userRole !== 'user' && assignedUsers.length > 0) {
        // Create token for first assignee (or could create for all)
        token = await createConfirmationToken({
          type: 'TASK_STATUS_CHANGE',
          userId: assignedUsers[0].id,
          entityType: 'task',
          entityId: task.id,
          metadata: { old_status: oldTask?.status, new_status: body.status, project_name: details.project_title }
        });
      }
      await sendActionNotification({
        actionType: isCompletedNow ? 'TASK_COMPLETED' : 'TASK_STATUS_CHANGED',
        performedBy: { ...user, name: user.name || 'Utilisateur', role: user.role as 'ADMIN' | 'MANAGER' | 'EMPLOYEE' },
        entity: { type: 'task', id: task.id, data: task },
        affectedUsers: assignedUsers,
        projectId: task.project_id,
        metadata: { projectName: details.project_title, oldStatus: oldTask?.status, newStatus: body.status, confirmationToken: token }
      });
    }

    if (!hasStatusChange && !hasReassignment && changes.length > 0) {
      const { rows: assignedUsersRows } = await db.query(
        'SELECT id, name, email, role FROM users WHERE id = ANY(SELECT user_id FROM task_assignees WHERE task_id = $1)',
        [taskId]
      );
      const assignedUsers = assignedUsersRows.map(row => ({
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role as 'ADMIN' | 'MANAGER' | 'EMPLOYEE'
      }));

      const { rows: detailRows } = await db.query(
        'SELECT title as project_title FROM projects WHERE id = $1',
        [task.project_id]
      );
      const details = detailRows[0] || {};

      await sendActionNotification({
        actionType: 'TASK_UPDATED',
        performedBy: { ...user, name: user.name || 'Utilisateur', role: user.role as 'ADMIN' | 'MANAGER' | 'EMPLOYEE' },
        entity: { type: 'task', id: task.id, data: task },
        affectedUsers: assignedUsers,
        projectId: task.project_id,
        metadata: { projectName: details.project_title, changes: changes.join(', ') }
      });
    }

    return corsResponse(task, request);
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('PATCH /api/tasks/[id] error:', error);
    return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
  }
}

// PUT /api/tasks/[id] - Mettre à jour une tâche (alias de PATCH)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return PATCH(request, { params });
}

// DELETE /api/tasks/[id] - Supprimer une tâche
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
    const userId = user.id as string;
    const perm = await requirePermission(userRole, 'tasks', 'delete');
    if (!perm.allowed) {
      return corsResponse({ error: perm.error }, request, { status: 403 });
    }

    const { id: taskId } = await params;

    const { rows: taskRows } = await db.query('SELECT title, project_id FROM tasks WHERE id = $1', [taskId]);
    if (taskRows.length === 0) {
      return corsResponse({ error: 'Tâche non trouvée' }, request, { status: 404 });
    }
    const task = taskRows[0];

    const { rows: projectRows } = await db.query('SELECT id, manager_id FROM projects WHERE id = $1', [task.project_id]);
    if (projectRows.length === 0) {
      return corsResponse({ error: 'Projet associé introuvable' }, request, { status: 404 });
    }
    const project = projectRows[0];

    if (!canManageProject(userRole, userId, project.manager_id)) {
      return corsResponse({ error: 'Vous ne pouvez supprimer que les tâches de vos projets' }, request, { status: 403 });
    }

    // Start transaction
    await db.query('BEGIN');

    // Delete related records first
    await db.query('DELETE FROM comments WHERE task_id = $1', [taskId]);
    await db.query('DELETE FROM documents WHERE task_id = $1', [taskId]);
    await db.query('DELETE FROM task_assignees WHERE task_id = $1', [taskId]);
    await db.query('DELETE FROM tasks WHERE id = $1', [taskId]);

    await db.query(
        `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
         VALUES ($1, 'delete', 'task', $2, $3)`,
        [user.id, taskId, `Deleted task: ${task.title}`]
      );

    await db.query('COMMIT');

    return corsResponse({ success: true, message: 'Tâche supprimée avec succès' }, request);
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('DELETE /api/tasks/[id] error:', error);
    return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
  }
}
