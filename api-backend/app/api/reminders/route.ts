import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { handleCorsOptions, corsResponse } from '@/lib/cors';
import { sendTaskReminderEmail } from '@/lib/emailService';
import { sendTaskReminderSMS, sendTaskReminderWhatsApp, formatPhoneNumber } from '@/lib/smsWhatsappService';

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔔 Vérification des rappels de tâches...');
    
    // Calculer les dates pour les rappels (2 jours avant, 1 jour avant, jour J)
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const dayAfterTomorrow = new Date(today);
    dayAfterTomorrow.setDate(today.getDate() + 2);

    // Formater les dates pour PostgreSQL
    const todayStr = today.toISOString().split('T')[0];
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const dayAfterTomorrowStr = dayAfterTomorrow.toISOString().split('T')[0];

    // Récupérer les tâches qui nécessitent des rappels
    const query = `
      SELECT DISTINCT t.*, p.title as project_title,
             json_agg(json_build_object(
               'id', u.id, 
               'name', u.name, 
               'email', u.email,
               'phone', u.phone
             )) as assignees
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN task_assignees ta ON t.id = ta.task_id
      LEFT JOIN users u ON ta.user_id = u.id
      WHERE t.due_date::date IN ($1, $2, $3)
        AND t.status NOT IN ('COMPLETED', 'CANCELLED')
        AND u.email IS NOT NULL
      GROUP BY t.id, p.title
    `;

    const { rows: tasks } = await db.query(query, [todayStr, tomorrowStr, dayAfterTomorrowStr]);
    
    let emailsSent = 0;
    let smsSent = 0;
    let whatsappSent = 0;

    for (const task of tasks) {
      const dueDate = new Date(task.due_date);
      const daysDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      let reminderType = '';
      if (daysDiff === 0) reminderType = 'today';
      else if (daysDiff === 1) reminderType = 'tomorrow';
      else if (daysDiff === 2) reminderType = 'in_2_days';
      else continue;

      // Vérifier si le rappel a déjà été envoyé
      const reminderCheck = await db.query(
        'SELECT id FROM task_reminders WHERE task_id = $1 AND reminder_type = $2 AND DATE(created_at) = CURRENT_DATE',
        [task.id, reminderType]
      );

      if (reminderCheck.rows.length > 0) {
        console.log(`Rappel ${reminderType} déjà envoyé pour la tâche ${task.title}`);
        continue;
      }

      // Envoyer les rappels à chaque assigné
      for (const assignee of task.assignees) {
        if (!assignee.email) continue;

        try {
          // Email
          const emailSent = await sendTaskReminderEmail(assignee.email, {
            taskTitle: task.title,
            projectTitle: task.project_title,
            dueDate: dueDate.toLocaleDateString('fr-FR'),
            daysDiff,
            assigneeName: assignee.name
          });
          if (emailSent) emailsSent++;

          // SMS (si numéro disponible)
          if (assignee.phone) {
            const formattedPhone = formatPhoneNumber(assignee.phone);
            const smsSent_result = await sendTaskReminderSMS(formattedPhone, task, daysDiff);
            if (smsSent_result) smsSent++;
          }

          // WhatsApp (si numéro disponible)
          if (assignee.phone) {
            const formattedPhone = formatPhoneNumber(assignee.phone);
            const whatsappSent_result = await sendTaskReminderWhatsApp(formattedPhone, task, daysDiff);
            if (whatsappSent_result) whatsappSent++;
          }

        } catch (error) {
          console.error(`Erreur envoi rappel pour ${assignee.email}:`, error);
        }
      }

      // Enregistrer le rappel envoyé
      await db.query(
        'INSERT INTO task_reminders (task_id, reminder_type, sent_at) VALUES ($1, $2, NOW())',
        [task.id, reminderType]
      );
    }

    console.log(`✅ Rappels envoyés: ${emailsSent} emails, ${smsSent} SMS, ${whatsappSent} WhatsApp`);

    return corsResponse({
      success: true,
      message: `Rappels envoyés avec succès`,
      stats: { emailsSent, smsSent, whatsappSent, tasksProcessed: tasks.length }
    }, request);

  } catch (error) {
    console.error('Erreur lors de l\'envoi des rappels:', error);
    return corsResponse({ error: 'Erreur lors de l\'envoi des rappels' }, request, { status: 500 });
  }
}