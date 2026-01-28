// api-backend/scripts/send-due-date-reminders.ts
import { db } from '../lib/db';
import { sendEmail } from '../lib/emailService';
import { taskDueSoonTemplate } from '../lib/emailTemplates';
import { Pool } from 'pg';

// Helper function to calculate the difference in days
const diffInDays = (date1: Date, date2: Date): number => {
  const utc1 = Date.UTC(date1.getFullYear(), date1.getMonth(), date1.getDate());
  const utc2 = Date.UTC(date2.getFullYear(), date2.getMonth(), date2.getDate());
  return Math.floor((utc2 - utc1) / (1000 * 60 * 60 * 24));
};

async function getTasksNeedingReminders() {
  console.log('Fetching tasks that need reminders...');
  const query = `
    SELECT
        t.id as task_id,
        t.title as task_title,
        t.due_date,
        u.id as user_id,
        u.email as user_email,
        u.name as user_name
    FROM
        tasks t
    JOIN
        task_assignees ta ON t.id = ta.task_id
    JOIN
        users u ON ta.user_id = u.id
    WHERE
        t.status NOT IN ('COMPLETED', 'CANCELLED')
        AND t.due_date IS NOT NULL
        AND t.due_date <= NOW() + interval '3 days'
  `;

  const { rows } = await db.query(query);
  console.log(`Found ${rows.length} tasks to process.`);
  return rows;
}

export async function sendDueDateReminders() {
  console.log('Starting due date reminder process...');
  try {
    const tasks = await getTasksNeedingReminders();
    const today = new Date();

    for (const task of tasks) {
      const dueDate = new Date(task.due_date);
      const daysRemaining = diffInDays(today, dueDate);

      console.log(`Processing task "${task.task_title}" for user ${task.user_email}. Days remaining: ${daysRemaining}`);

      const emailHtml = taskDueSoonTemplate({
        userName: task.user_name || 'Utilisateur',
        taskTitle: task.task_title,
        dueDate: task.due_date,
        daysRemaining: daysRemaining,
        taskId: task.task_id,
      });

      await sendEmail({
        to: task.user_email,
        subject: `Rappel d'échéance pour la tâche : ${task.task_title}`,
        html: emailHtml,
        userId: task.user_id,
        metadata: {
          taskId: task.task_id,
          reminderType: 'due_date'
        }
      });

      console.log(`Reminder email sent for task ${task.task_id} to ${task.user_email}`);
    }

    console.log('Due date reminder process finished successfully.');
  } catch (error) {
    console.error('An error occurred during the due date reminder process:', error);
  }
}

// Allow running the script directly via ts-node
if (require.main === module) {
  console.log('Running script directly...');
  // We need a way to close the DB connection pool, so we pass it down
  const dbPool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  // A bit of a hack to make the script use this new pool
  // In a real app, a dependency injection setup would be better
  const originalDbQuery = db.query;
  db.query = dbPool.query.bind(dbPool);
  
  sendDueDateReminders()
    .then(() => {
      console.log('Script finished. Closing database connection.');
      return dbPool.end();
    })
    .catch(error => {
      console.error('Script failed:', error);
      return dbPool.end();
    });
    
  // Restore original query function if needed elsewhere, though script exits
  db.query = originalDbQuery;
}
