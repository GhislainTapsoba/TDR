const { db } = require('./lib/db');

async function debugTasks() {
  try {
    console.log('=== DEBUGGING TASKS ===');

    // Get all tasks
    const { rows: tasks } = await db.query('SELECT id, title, assigned_to_id FROM tasks LIMIT 20');
    console.log('All tasks:', tasks);

    // Get task assignees
    const { rows: assignees } = await db.query('SELECT task_id, user_id FROM task_assignees LIMIT 20');
    console.log('Task assignees:', assignees);

    // Check if there are tasks with assigned_to_id
    const assignedTasks = tasks.filter(t => t.assigned_to_id);
    console.log('Tasks with assigned_to_id:', assignedTasks);

    // Check task_assignees table
    const assigneeTasks = assignees.map(a => a.task_id);
    console.log('Tasks with assignees in task_assignees:', [...new Set(assigneeTasks)]);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

debugTasks();
