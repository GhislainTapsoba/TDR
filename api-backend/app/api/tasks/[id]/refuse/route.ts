import { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/verifyAuth';
import { db } from '@/lib/db';
import { handleCorsOptions, corsResponse } from '@/lib/cors';
import { mapDbRoleToUserRole, requirePermission, canEditTask } from '@/lib/permissions';
import { sendActionNotification } from '@/lib/notificationService';

// Gérer les requêtes OPTIONS (preflight CORS)
export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

// POST /api/tasks/[id]/refuse - Refuser une tâche
export async function POST(
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
    const perm = await requirePermission(userRole, 'tasks', 'update'); // Refusal is a form of update
    if (!perm.allowed) {
      return corsResponse({ error: perm.error }, request, { status: 403 });
    }

    const { id: taskId } = await params;
    const { reason } = await request.json();

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return corsResponse({ error: 'La raison du refus est requise' }, request, { status: 400 });
    }

    // Fetch the task and check assignee
    const { rows: taskRows } = await db.query(
      `SELECT t.*,
              (SELECT json_agg(ta.user_id) FROM task_assignees ta WHERE ta.task_id = t.id) as assignees
       FROM tasks t
       WHERE t.id = $1`,
      [taskId]
    );

    if (taskRows.length === 0) {
      return corsResponse({ error: 'Tâche non trouvée' }, request, { status: 404 });
    }
    const task = taskRows[0];
    const assignees = task.assignees || [];

    // Ensure the refusing user is an assignee of the task
    if (!assignees.includes(userId)) {
      return corsResponse({ error: 'Vous ne pouvez refuser que les tâches qui vous sont assignées' }, request, { status: 403 });
    }

    // Start transaction
    await db.query('BEGIN');

    // Update task status to REFUSED
    const { rows: updatedTaskRows } = await db.query(
      `UPDATE tasks SET status = $1, refusal_reason = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
      ['REFUSED', reason, taskId]
    );

    // Add entry to activity logs
    await db.query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, 'refused', 'task', taskId, `Task refused with reason: ${reason}`]
    );

    await db.query('COMMIT');

    // Fetch project manager and admin users for notification
    const { rows: projectInfoRows } = await db.query(
      `SELECT p.title as project_name, u_manager.id as manager_id, u_manager.name as manager_name, u_manager.email as manager_email, u_manager.role as manager_role
       FROM projects p
       LEFT JOIN users u_manager ON p.manager_id = u_manager.id
       WHERE p.id = $1`,
      [task.project_id]
    );
    const projectInfo = projectInfoRows[0];

    const { rows: adminUsersRows } = await db.query(
      `SELECT id, name, email, role FROM users WHERE role = 'ADMIN'`
    );

    const affectedUsers = [];
    if (projectInfo.manager_id && projectInfo.manager_id !== userId) {
      affectedUsers.push({
        id: projectInfo.manager_id,
        name: projectInfo.manager_name,
        email: projectInfo.manager_email,
        role: projectInfo.manager_role,
      });
    }
    adminUsersRows.forEach((admin: any) => {
      if (admin.id !== userId && (!projectInfo.manager_id || admin.id !== projectInfo.manager_id)) { // Avoid duplicating notifications if admin is also manager or refuser
        affectedUsers.push({
          id: admin.id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
        });
      }
    });

    await sendActionNotification({
      actionType: 'TASK_REFUSED',
      performedBy: { ...user, name: user.name || 'Utilisateur', role: user.role as 'ADMIN' | 'MANAGER' | 'EMPLOYEE' },
      entity: { type: 'task', id: task.id, data: updatedTaskRows[0] },
      affectedUsers: affectedUsers,
      projectId: task.project_id,
      metadata: {
        projectName: projectInfo.project_name,
        taskTitle: task.title,
        refusalReason: reason,
        refusedBy: user.name || user.email,
      },
    });

    return corsResponse({ message: 'Tâche refusée avec succès' }, request);
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('POST /api/tasks/[id]/refuse error:', error);
    return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
  }
}
