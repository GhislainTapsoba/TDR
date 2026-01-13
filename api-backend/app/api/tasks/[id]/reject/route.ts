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

    const { id: taskId } = await context.params;
    const taskIdNum = parseInt(taskId);
    const body = await request.json();
    const { rejectionReason } = body;

    if (!rejectionReason || rejectionReason.trim() === '') {
      return corsResponse({ error: 'La raison du refus est obligatoire' }, request, { status: 400 });
    }

    const { rows: taskRows } = await db.query('SELECT * FROM tasks WHERE id = $1', [taskIdNum]);
    if (taskRows.length === 0) {
      return corsResponse({ error: 'Tâche non trouvée' }, request, { status: 404 });
    }
    const task = taskRows[0];

    if (task.assigned_to_id !== user.id) {
      return corsResponse({ error: 'Vous ne pouvez refuser que les tâches qui vous sont assignées' }, request, { status: 403 });
    }

    const { rows: projectRows } = await db.query(
      `SELECT p.id, p.title, p.created_by_id, p.manager_id, u.id as creator_id, u.email as creator_email, u.name as creator_name, u.role as creator_role
       FROM projects p 
       LEFT JOIN users u ON p.created_by_id = u.id 
       WHERE p.id = $1`,
      [task.project_id]
    );

    if (projectRows.length === 0) {
      return corsResponse({ error: 'Projet associé introuvable' }, request, { status: 404 });
    }
    const project = projectRows[0];
    
    const { rows: admins } = await db.query("SELECT * FROM users WHERE role = 'ADMIN'");

    const recipients: Array<{ id: number; email: string; name: string }> = [];
    if (project.creator_email) {
      recipients.push({ id: project.creator_id, email: project.creator_email, name: project.creator_name || 'Chef de projet' });
    }
    if (admins && admins.length > 0) {
      const admin = admins[0];
      if (!recipients.find(r => r.email === admin.email)) {
        recipients.push({ id: admin.id, email: admin.email, name: admin.name || 'Responsable général' });
      }
    }

    for (const recipient of recipients) {
      const emailHtml = taskRejectedByEmployeeTemplate({
        employeeName: user.name || user.email || 'Employé',
        taskTitle: task.title,
        projectName: project.title || 'Projet',
        taskId: task.id,
        rejectionReason,
        managerName: recipient.name
      });

      await sendEmail({ to: recipient.email, subject: `❌ Tâche refusée: ${task.title}`, html: emailHtml, userId: recipient.id.toString(), metadata: { task_id: task.id.toString(), project_id: project.id.toString(), action: 'TASK_REJECTED', rejected_by: user.id.toString(), rejection_reason: rejectionReason } });
    }

    await db.query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
       VALUES ($1, 'reject', 'task', $2, $3)`,
      [user.id.toString(), taskId, `Tâche refusée: ${task.title}${rejectionReason ? ` - Raison: ${rejectionReason}` : ''}`]
    );

    return corsResponse({ success: true, message: 'Tâche refusée avec succès. Les responsables ont été notifiés.', task: { id: task.id.toString(), title: task.title, status: task.status } }, request);
  } catch (error) {
    console.error('POST /api/tasks/[id]/reject error:', error);
    return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
  }
}
