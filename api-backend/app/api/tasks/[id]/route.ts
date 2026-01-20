import { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/verifyAuth';
import { db } from '@/lib/db';
import { handleCorsOptions, corsResponse } from '@/lib/cors';
import { createConfirmationToken } from '@/lib/emailConfirmation';
import { mapDbRoleToUserRole, requirePermission, canEditTask, canManageProject } from '@/lib/permissions';
import { sendActionNotification } from '@/lib/notificationService';

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
      `SELECT t.*, a.name as assigned_to_name, c.name as created_by_name 
       FROM tasks t 
       LEFT JOIN users a ON t.assigned_to_id = a.id
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
      if (task.assigned_to_id !== user.id) {
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
    if (!perm.allowed) {
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

    if (!canEditTask(userRole, userId, oldTask.assigned_to_id, project.manager_id)) {
      return corsResponse({ error: 'Vous ne pouvez modifier que vos tâches ou celles de vos projets' }, request, { status: 403 });
    }
    
    const updateFields: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    const fields = ['title', 'description', 'status', 'priority', 'due_date', 'assigned_to_id', 'project_id', 'stage_id'];
    fields.forEach(field => {
        if (body[field] !== undefined) {
            updateFields.push(`${field} = $${paramIndex++}`);
            queryParams.push(body[field]);
        }
    });
    if (body.status === 'COMPLETED' && !body.completed_at) {
        updateFields.push(`completed_at = $${paramIndex++}`);
        queryParams.push(new Date().toISOString());
    }

    if (updateFields.length === 0) {
        return corsResponse({ error: 'Aucun champ à mettre à jour'}, request, {status: 400})
    }

    queryParams.push(taskId);
    const updateQuery = `UPDATE tasks SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const { rows: updatedTaskRows } = await db.query(updateQuery, queryParams);
    const task = updatedTaskRows[0];

    // Notification Logic
    const changes: string[] = [];
    if (body.title && oldTask?.title !== body.title) changes.push(`Titre modifié`);
    if (body.status && oldTask?.status !== body.status) changes.push(`Statut changé: ${oldTask?.status} → ${body.status}`);
    const hasReassignment = !!(body.assigned_to_id && oldTask?.assigned_to_id !== body.assigned_to_id);
    if (hasReassignment && !userPermissions.includes('tasks.assign')) {
      return corsResponse({ error: 'Vous n\'avez pas la permission d\'assigner des tâches' }, request, { status: 403 });
    }
    const hasStatusChange = !!(body.status && oldTask?.status !== body.status);
    const isCompletedNow = body.status === 'COMPLETED' && oldTask?.status !== 'COMPLETED';

    const { rows: detailRows } = await db.query(
        `SELECT p.name as project_name, p.title as project_title, u.id as user_id, u.name as user_name, u.email as user_email, u.role as user_role
         FROM projects p
         LEFT JOIN users u ON u.id = $1
         WHERE p.id = $2`,
        [task.assigned_to_id, task.project_id]
    );
    const details = detailRows[0] || {};
    let assignedUserInfo: UserInfo | null = null;
    if (task.assigned_to_id && details.user_id && details.user_name && details.user_email && details.user_role) {
      assignedUserInfo = {
        id: details.user_id,
        name: details.user_name,
        email: details.user_email,
        role: details.user_role as 'ADMIN' | 'MANAGER' | 'EMPLOYEE'
      };
    }

    if (hasReassignment && assignedUserInfo) {
        const token = await createConfirmationToken({ type: 'TASK_ASSIGNMENT', userId: task.assigned_to_id!, entityType: 'task', entityId: task.id, metadata: { task_title: task.title, project_name: details.project_title } });
        // @ts-ignore
        await sendActionNotification({ actionType: 'TASK_ASSIGNED', performedBy: user, entity: { type: 'task', id: task.id, data: task }, affectedUsers: [assignedUserInfo], projectId: task.project_id, metadata: { projectName: details.project_title, assigneeName: assignedUserInfo.name, confirmationToken: token } });
    }
    if (hasStatusChange) {
        let token: string | null = null;
        if (userRole !== 'user' && assignedUserInfo) {
          token = await createConfirmationToken({ type: 'TASK_STATUS_CHANGE', userId: assignedUserInfo.id, entityType: 'task', entityId: task.id, metadata: { old_status: oldTask?.status, new_status: body.status, project_name: details.project_title } });
        }
        // @ts-ignore
        await sendActionNotification({ actionType: isCompletedNow ? 'TASK_COMPLETED' : 'TASK_STATUS_CHANGED', performedBy: user, entity: { type: 'task', id: task.id, data: task }, affectedUsers: assignedUserInfo ? [assignedUserInfo] : [], projectId: task.project_id, metadata: { projectName: details.project_title, oldStatus: oldTask?.status, newStatus: body.status, confirmationToken: token } });
    }
    if (!hasStatusChange && !hasReassignment && changes.length > 0) {
        // @ts-ignore
        await sendActionNotification({ actionType: 'TASK_UPDATED', performedBy: user, entity: { type: 'task', id: task.id, data: task }, affectedUsers: assignedUserInfo ? [assignedUserInfo] : [], projectId: task.project_id, metadata: { projectName: details.project_title, changes: changes.join(', ') } });
    }

    const { rows: finalTaskRows } = await db.query(`
      SELECT t.*, a.name as assigned_to_name, c.name as created_by_name 
      FROM tasks t 
      LEFT JOIN users a ON t.assigned_to_id = a.id 
      LEFT JOIN users c ON t.created_by_id = c.id
      WHERE t.id = $1
    `, [task.id]);

    return corsResponse(finalTaskRows[0], request);
  } catch (error) {
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

    await db.query('DELETE FROM tasks WHERE id = $1', [taskId]);

    await db.query(
        `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) 
         VALUES ($1, 'delete', 'task', $2, $3)`,
        [user.id, taskId, `Deleted task: ${task.title}`]
      );

    return corsResponse({ success: true, message: 'Tâche supprimée avec succès' }, request);
  } catch (error) {
    console.error('DELETE /api/tasks/[id] error:', error);
    return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
  }
}
