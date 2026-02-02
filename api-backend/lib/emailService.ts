import { db } from './db';

// Configuration Mailjet
if (!process.env.MAILJET_API_KEY || !process.env.MAILJET_SECRET_KEY) {
  console.warn('MAILJET credentials not found, emails will not be sent');
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  userId?: string;
  metadata?: any;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  let emailLog: any = null;
  try {
    // Vérifier si Mailjet est configuré
    if (!process.env.MAILJET_API_KEY || !process.env.MAILJET_SECRET_KEY) {
      console.log(`Email disabled - would send to: ${options.to}`);
      return false;
    }

    // Créer un log avant l'envoi
    const { rows: emailLogRows } = await db.query(
      `INSERT INTO email_logs (recipient_id, recipient, subject, body, status, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        options.userId || null,
        options.to,
        options.subject,
        options.html,
        'PENDING',
        options.metadata ? JSON.stringify(options.metadata) : null,
      ]
    );
    emailLog = emailLogRows[0];

    // Envoyer l'email avec Mailjet
    const auth = Buffer.from(`${process.env.MAILJET_API_KEY}:${process.env.MAILJET_SECRET_KEY}`).toString('base64');
    
    const response = await fetch('https://api.mailjet.com/v3.1/send', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        Messages: [{
          From: {
            Email: process.env.MAIL_FROM_EMAIL || 'no-reply@tdrprojects.com',
            Name: process.env.MAIL_FROM_NAME || 'TDR Projects'
          },
          To: [{
            Email: options.to
          }],
          Subject: options.subject,
          HTMLPart: options.html
        }]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Mailjet API error: ${response.status} - ${errorText}`);
    }

    // Mettre à jour le statut du log
    if (emailLog) {
      await db.query(
        `UPDATE email_logs SET status = 'SENT', sent_at = NOW() WHERE id = $1`,
        [emailLog.id]
      );
    }

    console.log('Email sent via Mailjet');
    return true;
  } catch (error) {
    console.error('Error sending email:', error);

    // Mettre à jour le log avec l'erreur
    // Note: options.metadata.log_id might not exist if initial insert failed
    if (options.metadata?.log_id || (emailLog && emailLog.id)) {
      const logIdToUpdate = options.metadata?.log_id || emailLog.id;
      await db.query(
        `UPDATE email_logs SET status = 'FAILED', error_message = $1 WHERE id = $2`,
        [error instanceof Error ? error.message : 'Unknown error', logIdToUpdate]
      );
    }

    return false;
  }
}

// Envoyer un email aux responsables (Manager + Responsable général)
export async function sendEmailToResponsibles(
  projectId: string, // Changed from number to string to match UUID
  subject: string,
  html: string,
  metadata?: any
): Promise<void> {
  try {
    // Récupérer le manager
    const { rows: projectRows } = await db.query(
      `SELECT p.id, p.title, p.created_by_id, p.manager_id, 
              u.id as created_by_user_id, u.email as created_by_email, u.name as created_by_name, u.role as created_by_role
       FROM projects p 
       LEFT JOIN users u ON p.created_by_id = u.id 
       WHERE p.id = $1`,
      [projectId]
    );

    if (projectRows.length === 0) {
      console.error('Project not found');
      return;
    }
    const project = projectRows[0];

    // Récupérer le responsable général (Admin)
    const { rows: admins } = await db.query("SELECT * FROM users WHERE role = 'ADMIN'");

    const recipients: Array<{ id: string; email: string; name: string }> = []; // Changed id to string

    // Ajouter le créateur du projet (souvent le manager)
    if (project.created_by_email) {
      recipients.push({
        id: project.created_by_user_id,
        email: project.created_by_email,
        name: project.created_by_name || 'Manager'
      });
    }

    // Ajouter le responsable général
    if (admins && admins.length > 0) {
      const admin = admins[0];
      // Éviter les doublons
      if (!recipients.find(r => r.email === admin.email)) {
        recipients.push({
          id: admin.id,
          email: admin.email,
          name: admin.name || 'Responsable général'
        });
      }
    }

    // Envoyer l'email à tous les destinataires
    for (const recipient of recipients) {
      await sendEmail({
        to: recipient.email,
        subject,
        html,
        userId: recipient.id,
        metadata: { ...metadata, project_id: projectId }
      });
    }
  } catch (error) {
    console.error('Error sending emails to responsibles:', error);
  }
}

// Envoyer un rappel de tâche par email
export async function sendTaskReminderEmail(
  email: string,
  taskData: {
    taskTitle: string;
    projectTitle: string;
    dueDate: string;
    daysDiff: number;
    assigneeName: string;
  }
): Promise<boolean> {
  const { taskTitle, projectTitle, dueDate, daysDiff, assigneeName } = taskData;
  
  let urgencyLevel = '';
  let urgencyColor = '';
  let message = '';
  
  if (daysDiff === 0) {
    urgencyLevel = 'URGENT';
    urgencyColor = '#dc2626';
    message = 'est due aujourd\'hui';
  } else if (daysDiff === 1) {
    urgencyLevel = 'IMPORTANT';
    urgencyColor = '#ea580c';
    message = 'est due demain';
  } else {
    urgencyLevel = 'RAPPEL';
    urgencyColor = '#2563eb';
    message = `est due dans ${daysDiff} jours`;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Rappel de tâche</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: ${urgencyColor}; color: white; padding: 15px; border-radius: 8px 8px 0 0; text-align: center;">
                <h1 style="margin: 0; font-size: 24px;">🔔 ${urgencyLevel}</h1>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #e9ecef;">
                <p style="font-size: 18px; margin-bottom: 20px;">Bonjour <strong>${assigneeName}</strong>,</p>
                
                <div style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid ${urgencyColor};">
                    <h3 style="margin-top: 0; color: ${urgencyColor};">Rappel de tâche</h3>
                    <p><strong>Tâche :</strong> ${taskTitle}</p>
                    <p><strong>Projet :</strong> ${projectTitle}</p>
                    <p><strong>Date d'échéance :</strong> ${dueDate}</p>
                    <p style="font-size: 16px; color: ${urgencyColor}; font-weight: bold;">
                        ⏰ Cette tâche ${message}
                    </p>
                </div>
                
                <div style="margin-top: 20px; padding: 15px; background: #e3f2fd; border-radius: 6px;">
                    <p style="margin: 0; font-size: 14px; color: #1565c0;">
                        💡 <strong>Conseil :</strong> Connectez-vous à la plateforme pour voir tous les détails de cette tâche.
                    </p>
                </div>
                
                <div style="text-align: center; margin-top: 20px;">
                    <p style="font-size: 12px; color: #666;">
                        Ceci est un rappel automatique de Team Project<br>
                        Pour toute question, contactez votre responsable de projet.
                    </p>
                </div>
            </div>
        </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to: email,
    subject: `${urgencyLevel}: ${taskTitle} ${message}`,
    html,
    metadata: { type: 'task_reminder', urgency: urgencyLevel }
  });
}
