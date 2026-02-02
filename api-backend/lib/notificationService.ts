import { db } from './db';
import { sendEmail } from './emailService';
import * as emailTemplates from './emailTemplates';

export type ActionType =
  | 'TASK_CREATED'
  | 'TASK_UPDATED'
  | 'TASK_STATUS_CHANGED'
  | 'TASK_ASSIGNED'
  | 'TASK_COMPLETED'
  | 'TASK_REFUSED' // Add new action type for task refusal
  | 'PROJECT_CREATED'
  | 'PROJECT_UPDATED'
  | 'STAGE_CREATED'
  | 'STAGE_UPDATED'
  | 'STAGE_COMPLETED';

export interface NotificationContext {
  actionType: ActionType;
  performedBy: {
    id: string;
    name: string;
    email: string;
    role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
  };
  entity: {
    type: 'task' | 'project' | 'stage';
    id: string;
    data: any; // Les données complètes de l'entité
  };
  affectedUsers?: {
    id: string;
    name: string;
    email: string;
    role: string;
  }[];
  projectId?: string;
  metadata?: any;
}

// Interface pour les rappels de tâches
export interface NotificationData {
  userId: string;
  type: 'task_reminder' | 'task_due_today' | 'task_overdue';
  title: string;
  message: string;
  metadata?: any;
}

/**
 * Détermine les destinataires des notifications selon les règles métier
 */
async function determineRecipients(context: NotificationContext): Promise<string[]> {
  const recipients = new Set<string>();
  const { performedBy, affectedUsers, projectId } = context;
  const userRole = (performedBy.role || '').toUpperCase();


  // Récupérer le manager si nécessaire
  let projectManager: any = null;
  if (projectId) {
    const { rows: projectRows } = await db.query(
      `SELECT u.id, u.email, u.name, u.role FROM projects p LEFT JOIN users u ON p.manager_id = u.id WHERE p.id = $1`,
      [projectId]
    );

    if (projectRows.length > 0 && projectRows[0].id) { // Check if manager exists
      projectManager = projectRows[0];
    }
  }

  // Récupérer l'admin (case-insensitive)
  const { rows: admins } = await db.query("SELECT id, email, name, role FROM users WHERE UPPER(role) = 'ADMIN'");
  const adminEmails = admins?.map(a => a.email) || [];


  // Règles de notification selon le rôle de celui qui fait l'action
  switch (userRole) {
    case 'EMPLOYEE':
      // Employé → Email à : Employé + Manager + Admin
      recipients.add(performedBy.email);
      if (projectManager) {
        recipients.add(projectManager.email);
      }
      adminEmails.forEach(email => recipients.add(email));
      break;

    case 'MANAGER':
      // Manager → Email à : Manager + Admin + (Employés concernés si applicable)
      recipients.add(performedBy.email);
      adminEmails.forEach(email => recipients.add(email));

      // Ajouter les employés concernés
      if (affectedUsers && affectedUsers.length > 0) {
        affectedUsers.forEach(user => {
          if ((user.role || '').toUpperCase() === 'EMPLOYEE') {
            recipients.add(user.email);
          }
        });
      }
      break;

    case 'ADMIN':
      // Admin → Email à : Admin + (Personnes concernées si applicable)
      recipients.add(performedBy.email);

      // Ajouter les personnes concernées (employés ou managers)
      if (affectedUsers && affectedUsers.length > 0) {
        affectedUsers.forEach(user => recipients.add(user.email));
      }
      if (projectManager && affectedUsers && affectedUsers.length > 0) {
        recipients.add(projectManager.email);
      }
      break;
    
    default:
      // No rules applied for other roles
      break;
  }

  return Array.from(recipients);
}

/**
 * Génère le contenu de l'email selon le type d'action
 */
function generateEmailContent(context: NotificationContext, recipientEmail: string): {
  subject: string;
  html: string;
} | null {
  const { actionType, performedBy, entity, metadata } = context;

  switch (actionType) {
    case 'TASK_CREATED':
    case 'TASK_ASSIGNED':
      return {
        subject: `Nouvelle tâche assignée: ${entity.data.title}`,
        html: emailTemplates.taskAssignedTemplate({
          userName: metadata?.assigneeName || 'Utilisateur',
          taskTitle: entity.data.title,
          taskDescription: entity.data.description,
          projectName: metadata?.projectName || 'Projet',
          dueDate: entity.data.due_date,
          priority: entity.data.priority || 'MEDIUM',
          taskId: entity.id,
          confirmationToken: metadata?.confirmationToken
        })
      };

    case 'TASK_STATUS_CHANGED':
      return {
        subject: `Changement de statut: ${entity.data.title}`,
        html: emailTemplates.taskStatusChangedByEmployeeTemplate({
          employeeName: performedBy.name,
          taskTitle: entity.data.title,
          taskId: entity.id,
          projectTitle: metadata?.projectName || 'Projet',
          projectId: metadata?.projectId || '',
          oldStatus: metadata?.oldStatus || 'UNKNOWN',
          newStatus: entity.data.status,
          comment: metadata?.comment
        })
      };

    case 'TASK_COMPLETED':
      return {
        subject: `✅ Tâche terminée: ${entity.data.title}`,
        html: emailTemplates.taskCompletedByEmployeeTemplate({
          managerName: 'Responsable',
          taskTitle: entity.data.title,
          employeeName: performedBy.name,
          projectName: metadata?.projectName || 'Projet',
          completionComment: metadata?.comment,
          taskId: entity.id
        })
      };

    case 'TASK_UPDATED':
      return {
        subject: `Tâche mise à jour: ${entity.data.title}`,
        html: emailTemplates.taskUpdatedTemplate({
          userName: 'Utilisateur',
          taskTitle: entity.data.title,
          changes: metadata?.changes || 'Modifications effectuées',
          taskId: entity.id,
          updatedBy: performedBy.name
        })
      };

    case 'TASK_REFUSED': // Add new case for task refused
      return {
        subject: `❌ Tâche refusée: ${entity.data.title}`,
        html: emailTemplates.taskRefusedTemplate({
          taskTitle: entity.data.title,
          projectName: metadata?.projectName || 'Projet',
          refusedBy: metadata?.refusedBy || performedBy.name,
          refusalReason: metadata?.refusalReason || 'Aucune raison fournie.',
          taskId: entity.id,
        })
      };

    case 'PROJECT_CREATED':
      return {
        subject: `🎉 Nouveau projet créé: ${entity.data.name}`,
        html: emailTemplates.projectCreatedTemplate({
          projectName: entity.data.name,
          description: entity.data.description,
          startDate: entity.data.start_date,
          dueDate: entity.data.due_date,
          createdBy: performedBy.name,
          projectId: entity.id
        })
      };

    case 'STAGE_COMPLETED':
      return {
        subject: `✅ Étape complétée: ${entity.data.name}`,
        html: emailTemplates.stageCompletedTemplate({
          stageName: entity.data.name,
          projectName: metadata?.projectName || 'Projet',
          completedBy: performedBy.name,
          nextStageName: metadata?.nextStageName,
          tasksCreated: metadata?.tasksCreated || 0,
          projectId: metadata?.projectId || entity.id
        })
      };

    case 'STAGE_UPDATED':
      return {
        subject: `Étape mise à jour: ${entity.data.name}`,
        html: emailTemplates.stageStatusChangedByEmployeeTemplate({
          employeeName: performedBy.name,
          stageName: entity.data.name,
          stageId: entity.id,
          projectTitle: metadata?.projectName || 'Projet',
          projectId: metadata?.projectId || '',
          oldStatus: metadata?.oldStatus || 'UNKNOWN',
          newStatus: entity.data.status,
          comment: metadata?.comment
        })
      };

    default:
      return null;
  }
}

/**
 * Fonction principale pour envoyer les notifications
 */
export async function sendActionNotification(context: NotificationContext): Promise<void> {
  try {
    // Déterminer les destinataires
    const recipients = await determineRecipients(context);

    if (recipients.length === 0) {
      console.log('No recipients found for notification');
      return;
    }

    // Envoyer l'email à chaque destinataire
    for (const recipientEmail of recipients) {
      const emailContent = generateEmailContent(context, recipientEmail);

      if (!emailContent) {
        console.error(`No email template found for action type: ${context.actionType}`);
        continue;
      }

      await sendEmail({
        to: recipientEmail,
        subject: emailContent.subject,
        html: emailContent.html
      });

      console.log(`Notification sent to ${recipientEmail} for action ${context.actionType}`);
    }

    // Logger l'activité
    await db.query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details, metadata) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        context.performedBy.id,
        context.actionType.toLowerCase(),
        context.entity.type,
        context.entity.id,
        `Notifications sent to ${recipients.length} recipients`,
        JSON.stringify({ recipients })
      ]
    );

  } catch (error) {
    console.error('Error sending action notification:', error);
    // Ne pas faire échouer la requête si l'email échoue
  }
}

// ===== NOUVELLES FONCTIONS POUR LES RAPPELS =====

/**
 * Créer une notification interne
 */
export async function createNotification(data: NotificationData): Promise<void> {
  try {
    await db.query(
      `INSERT INTO notifications (user_id, type, title, message, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [
        data.userId,
        data.type,
        data.title,
        data.message,
        data.metadata ? JSON.stringify(data.metadata) : null
      ]
    );
  } catch (error) {
    console.error('Erreur lors de la création de la notification:', error);
  }
}

/**
 * Créer les notifications de rappel pour les tâches
 */
export async function createTaskRemindersNotifications(): Promise<void> {
  try {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const dayAfterTomorrow = new Date(today);
    dayAfterTomorrow.setDate(today.getDate() + 2);

    const todayStr = today.toISOString().split('T')[0];
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const dayAfterTomorrowStr = dayAfterTomorrow.toISOString().split('T')[0];

    // Récupérer les tâches qui nécessitent des notifications
    const query = `
      SELECT DISTINCT t.*, p.title as project_title, ta.user_id
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN task_assignees ta ON t.id = ta.task_id
      WHERE t.due_date::date IN ($1, $2, $3)
        AND t.status NOT IN ('COMPLETED', 'CANCELLED')
        AND ta.user_id IS NOT NULL
    `;

    const { rows: tasks } = await db.query(query, [todayStr, tomorrowStr, dayAfterTomorrowStr]);

    for (const task of tasks) {
      const dueDate = new Date(task.due_date);
      const daysDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      let notificationType: NotificationData['type'];
      let title: string;
      let message: string;

      if (daysDiff === 0) {
        notificationType = 'task_due_today';
        title = '🚨 Tâche due aujourd\'hui';
        message = `La tâche "${task.title}" est due aujourd'hui`;
      } else if (daysDiff === 1) {
        notificationType = 'task_reminder';
        title = '⏰ Rappel de tâche';
        message = `La tâche "${task.title}" est due demain`;
      } else if (daysDiff === 2) {
        notificationType = 'task_reminder';
        title = '📅 Rappel de tâche';
        message = `La tâche "${task.title}" est due dans 2 jours`;
      } else {
        continue;
      }

      // Vérifier si la notification a déjà été créée aujourd'hui
      const existingNotif = await db.query(
        `SELECT id FROM notifications 
         WHERE user_id = $1 AND type = $2 AND DATE(created_at) = CURRENT_DATE 
         AND metadata->>'task_id' = $3`,
        [task.user_id, notificationType, task.id]
      );

      if (existingNotif.rows.length === 0) {
        await createNotification({
          userId: task.user_id,
          type: notificationType,
          title,
          message,
          metadata: {
            task_id: task.id,
            task_title: task.title,
            project_title: task.project_title,
            due_date: task.due_date,
            days_remaining: daysDiff
          }
        });
      }
    }

    console.log(`✅ Notifications de rappel créées pour ${tasks.length} tâches`);
  } catch (error) {
    console.error('Erreur lors de la création des notifications de rappel:', error);
  }
}