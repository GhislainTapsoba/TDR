import { randomBytes } from 'crypto';
import { db } from './db';
import { sendEmailToResponsibles } from './emailService';
import {
  employeeTaskConfirmationTemplate,
  taskStatusChangeAcknowledgementTemplate,
  stageStatusChangeAcknowledgementTemplate
} from './emailTemplates';

export interface ConfirmationTokenData {
  type: 'TASK_ASSIGNMENT' | 'TASK_STATUS_CHANGE' | 'STAGE_STATUS_CHANGE' | 'PROJECT_CREATED';
  userId: string;
  entityType: string;
  entityId: string;
  metadata?: any;
}

/**
 * Générer un token de confirmation sécurisé
 */
export function generateConfirmationToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Créer un token de confirmation dans la base de données
 */
export async function createConfirmationToken(data: ConfirmationTokenData): Promise<string | null> {
  try {
    const token = generateConfirmationToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expire dans 7 jours

    const { rows } = await db.query(
      `INSERT INTO email_confirmations (token, type, user_id, entity_type, entity_id, metadata, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING token`,
      [
        token,
        data.type,
        data.userId,
        data.entityType,
        data.entityId,
        data.metadata ? JSON.stringify(data.metadata) : null,
        expiresAt.toISOString(),
      ]
    );

    if (rows.length === 0) {
      console.error('Error creating confirmation token: no row returned');
      return null;
    }

    return rows[0].token;
  } catch (error) {
    console.error('Error in createConfirmationToken:', error);
    return null;
  }
}

/**
 * Vérifier et confirmer un token
 */
export async function confirmToken(token: string): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  try {
    const { rows, rowCount } = await db.query('SELECT * FROM email_confirmations WHERE token = $1', [token]);

    if (rowCount === 0) {
      return { success: false, error: 'Token invalide ou expiré' };
    }
    const confirmation = rows[0];

    if (confirmation.confirmed) {
      return { success: false, error: 'Ce token a déjà été utilisé' };
    }

    if (new Date(confirmation.expires_at) < new Date()) {
      return { success: false, error: 'Ce token a expiré' };
    }

    const { rowCount: updateCount } = await db.query(
      `UPDATE email_confirmations SET confirmed = TRUE, confirmed_at = NOW() WHERE id = $1`,
      [confirmation.id]
    );

    if (updateCount === 0) {
      console.error('Error updating confirmation: no row updated');
      return { success: false, error: 'Erreur lors de la confirmation' };
    }

    return {
      success: true,
      data: {
        type: confirmation.type,
        userId: confirmation.user_id,
        entityType: confirmation.entity_type,
        entityId: confirmation.entity_id,
        metadata: confirmation.metadata
      }
    };
  } catch (error) {
    console.error('Error in confirmToken:', error);
    return { success: false, error: 'Erreur serveur' };
  }
}

/**
 * Exécuter l'action liée à la confirmation
 */
export async function executeConfirmationAction(confirmationData: any): Promise<boolean> {
  try {
    switch (confirmationData.type) {
      case 'TASK_ASSIGNMENT':
        const { rows: updatedTaskRows, rowCount: updatedTaskCount } = await db.query(
          `UPDATE tasks SET status = 'IN_PROGRESS' WHERE id = $1 RETURNING *`,
          [confirmationData.entityId]
        );

        if (updatedTaskCount === 0) {
          console.error('Error updating task or task not found for TASK_ASSIGNMENT');
          return false;
        }
        const updatedTask = updatedTaskRows[0];

        const { rows: taskDetailsRows } = await db.query(
          `SELECT 
            t.id, t.title, t.description,
            p.id as project_id, p.title as project_title
           FROM tasks t 
           LEFT JOIN projects p ON t.project_id = p.id 
           WHERE t.id = $1`,
          [confirmationData.entityId]
        );
        const taskDetails = taskDetailsRows[0];
        
        // Get assignees for this task
        const { rows: assigneesRows } = await db.query(
          `SELECT u.id as assignee_id, u.name as assignee_name, u.email as assignee_email
           FROM task_assignees ta
           JOIN users u ON ta.user_id = u.id
           WHERE ta.task_id = $1`,
          [confirmationData.entityId]
        );
        const firstAssignee = assigneesRows[0] || { assignee_name: 'Un employé', assignee_email: '', assignee_id: '' };
        
        await db.query(
          `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) 
           VALUES ($1, 'start', 'task', $2, $3)`,
          [confirmationData.userId, confirmationData.entityId, 'Task started by email confirmation']
        );

        if (taskDetails.project_id) {
          await sendEmailToResponsibles(
            taskDetails.project_id,
            `✅ Tâche démarrée: ${taskDetails.title}`,
            employeeTaskConfirmationTemplate({
              employeeName: firstAssignee.assignee_name || 'Un employé',
              taskTitle: taskDetails.title,
              projectName: taskDetails.project_title,
              taskId: taskDetails.id.toString(),
              managerName: 'Responsable', // This might need to be fetched dynamically
            }),
            {
              entity_type: 'task',
              entity_id: taskDetails.id,
              action: 'TASK_STARTED_NOTIFICATION'
            }
          );
        }
        break;

      case 'TASK_STATUS_CHANGE':
        const { rows: taskStatusDetailsRows, rowCount: taskStatusDetailsCount } = await db.query(
          `SELECT 
            t.*, 
            p.id as project_id, p.title as project_title
           FROM tasks t 
           LEFT JOIN projects p ON t.project_id = p.id 
           WHERE t.id = $1`,
          [confirmationData.entityId]
        );

        if (taskStatusDetailsCount === 0) {
          console.error('Error fetching task for acknowledgement: task not found');
          return false;
        }
        const taskData = taskStatusDetailsRows[0];

        await db.query(
          `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details, metadata) 
           VALUES ($1, 'acknowledge', 'task', $2, $3, $4)`,
          [confirmationData.userId, confirmationData.entityId, 'Task status change acknowledged', JSON.stringify(confirmationData.metadata)]
        );

        if (taskData.project_id) {
          await sendEmailToResponsibles(
            taskData.project_id,
            `📧 Accusé de réception: ${taskData.title}`,
            taskStatusChangeAcknowledgementTemplate({
              employeeName: taskData.assignee_name || 'Un employé',
              taskTitle: taskData.title,
              projectName: taskData.project_title,
              taskId: taskData.id.toString(),
              managerName: 'Responsable', // This might need to be fetched dynamically
              oldStatus: confirmationData.metadata?.old_status || 'UNKNOWN',
              newStatus: confirmationData.metadata?.new_status || taskData.status
            }),
            {
              entity_type: 'task',
              entity_id: taskData.id,
              action: 'TASK_STATUS_CHANGE_ACKNOWLEDGED'
            }
          );
        }
        break;

      case 'STAGE_STATUS_CHANGE':
        const { rows: stageDetailsRows, rowCount: stageDetailsCount } = await db.query(
          `SELECT 
            s.*, 
            p.id as project_id, p.title as project_title
           FROM stages s 
           LEFT JOIN projects p ON s.project_id = p.id 
           WHERE s.id = $1`,
          [confirmationData.entityId]
        );

        if (stageDetailsCount === 0) {
          console.error('Error fetching stage for acknowledgement: stage not found');
          return false;
        }
        const stageData = stageDetailsRows[0];

        const { rows: employeeDataRows } = await db.query(
          'SELECT name FROM users WHERE id = $1',
          [confirmationData.userId]
        );
        const employeeData = employeeDataRows[0];

        await db.query(
          `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details, metadata) 
           VALUES ($1, 'acknowledge', 'stage', $2, $3, $4)`,
          [confirmationData.userId, confirmationData.entityId, 'Stage status change acknowledged', JSON.stringify(confirmationData.metadata)]
        );

        if (stageData.project_id) {
          await sendEmailToResponsibles(
            stageData.project_id,
            `📧 Accusé de réception: Étape ${stageData.name}`,
            stageStatusChangeAcknowledgementTemplate({
              employeeName: employeeData?.name || 'Un employé',
              stageName: stageData.name,
              projectName: stageData.project_title,
              projectId: stageData.project_id.toString(),
              stageId: stageData.id.toString(),
              managerName: 'Responsable', // This might need to be fetched dynamically
              oldStatus: confirmationData.metadata?.old_status || 'UNKNOWN',
              newStatus: confirmationData.metadata?.new_status || stageData.status
            }),
            {
              entity_type: 'stage',
              entity_id: stageData.id,
              action: 'STAGE_STATUS_CHANGE_ACKNOWLEDGED'
            }
          );
        }
        break;

      default:
        console.log('Unknown confirmation type:', confirmationData.type);
    }

    return true;
  } catch (error) {
    console.error('Error executing confirmation action:', error);
    return false;
  }
}

