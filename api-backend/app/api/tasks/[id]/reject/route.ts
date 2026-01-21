import { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/verifyAuth';
import { db } from '@/lib/db';
import { handleCorsOptions, corsResponse } from '@/lib/cors';
import { sendEmail } from '@/lib/emailService';
import { taskRejectedByEmployeeTemplate } from '@/lib/emailTemplates';
import { mapDbRoleToUserRole } from '@/lib/permissions';

// Gérer les requêtes OPTIONS (preflight CORS)
export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

// POST /api/tasks/[id]/reject - Refuser une tâche assignée
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return corsResponse({ error: 'Unauthorized' }, request, { status: 401 });
    }

    const { id: taskId } = context.params;
    const body = await request.json();
    const { rejectionReason } = body;

    if (!rejectionReason || rejectionReason.trim() === '') {
      return corsResponse({ error: 'La raison du refus est obligatoire' }, request, { status: 400 });
    }

    const { rows: taskRows } = await db.query('SELECT * FROM tasks WHERE id = $1', [taskId]);
    if (taskRows.length === 0) {
      return corsResponse({ error: 'Tâche non trouvée' }, request, { status: 404 });
    }
    const task = taskRows[0];

    // Check if user is assigned to this task
    const { rows: assigneeRows } = await db.query(
      'SELECT user_id FROM task_assignees WHERE task_id = $1 AND user_id = $2',
      [taskId, user.id]
    );

    if (assigneeRows.length === 0) {
      return corsResponse({ error: 'Vous ne pouvez refuser que les tâches qui vous sont assignées' }, request, { status: 403 });
    }

    const { rows: projectRows } = await db.query(
      `SELECT p.id, p.title, p.manager_id, 
              m.id as manager_id_user, m.email as manager_email, m.name as manager_name
       FROM projects p 
       LEFT JOIN users m ON p.manager_id = m.id 
       WHERE p.id = $1`,
      [task.project_id]
    );

    if (projectRows.length === 0) {
      return corsResponse({ error: 'Projet associé introuvable' }, request, { status: 404 });
    }
    const project = projectRows[0];
    
    // Find admins
    const { rows: admins } = await db.query("SELECT id, email, name FROM users WHERE UPPER(role) = 'ADMIN'");

    // Build recipient list (manager + admins)
    const recipients = new Map<string, { id: string; email: string; name: string }>();

    if (project.manager_email) {
      recipients.set(project.manager_email, { id: project.manager_id_user, email: project.manager_email, name: project.manager_name || 'Manager' });
    }
    if (admins) {
      for (const admin of admins) {
        if (!recipients.has(admin.email)) {
          recipients.set(admin.email, { id: admin.id, email: admin.email, name: admin.name || 'Responsable général' });
        }
      }
    }

    // Send email to all recipients
    for (const recipient of recipients.values()) {
      const emailHtml = taskRejectedByEmployeeTemplate({
        employeeName: user.name || user.email,
        taskTitle: task.title,
        projectName: project.title || 'Projet',
        taskId: task.id,
        rejectionReason,
        managerName: recipient.name
      });

      await sendEmail({ 
        to: recipient.email, 
        subject: `❌ Tâche refusée: ${task.title}`, 
        html: emailHtml, 
        userId: recipient.id, 
        metadata: { 
          task_id: task.id, 
          project_id: project.id, 
          action: 'TASK_REJECTED', 
          rejected_by: user.id, 
          rejection_reason: rejectionReason 
        } 
      });
    }

    // Log the activity
    await db.query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
       VALUES ($1, 'reject_task', 'task', $2, $3)`,
      [user.id, taskId, `Raison: ${rejectionReason}`]
    );

    return corsResponse({ success: true, message: 'Tâche refusée avec succès. Les responsables ont été notifiés.' }, request);
  } catch (error) {
    console.error('POST /api/tasks/[id]/reject error:', error);
    return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
  }
}

