import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { handleCorsOptions, corsResponse } from '@/lib/cors';
import { verifyAuth } from '@/lib/verifyAuth';
import { mapDbRoleToUserRole } from '@/lib/permissions';

// Gérer les requêtes OPTIONS (preflight CORS)
export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

// GET /api/dashboard/stats - Récupérer les statistiques du dashboard
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult) {
      return corsResponse(
        { error: 'Unauthorized' },
        request,
        { status: 401 }
      );
    }

    const { id: userId, role: userRole } = authResult;
    const mappedRole = mapDbRoleToUserRole(userRole);

    const [
      projectsCountResult,
      tasksCountResult,
      completedTasksCountResult,
      usersCountResult,
      myProjectsCountResult,
      myTasksCountResult,
      pendingTasksCountResult,
      inProgressTasksCountResult,
      recentProjectsResult,
      recentTasksResult,
      tasksByStatusResult,
      projectsByStatusResult,
    ] = await Promise.all([
      db.query('SELECT COUNT(*)::int FROM projects'),
      db.query('SELECT COUNT(*)::int FROM tasks'),
      db.query("SELECT COUNT(*)::int FROM tasks WHERE status = 'COMPLETED'"),
      db.query('SELECT COUNT(*)::int FROM users'),
      db.query('SELECT COUNT(*)::int FROM projects WHERE manager_id = $1', [userId]),
      db.query('SELECT COUNT(DISTINCT t.id)::int FROM tasks t JOIN task_assignees ta ON t.id = ta.task_id WHERE ta.user_id = $1', [userId]),
      db.query("SELECT COUNT(DISTINCT t.id)::int FROM tasks t JOIN task_assignees ta ON t.id = ta.task_id WHERE ta.user_id = $1 AND t.status = 'TODO'", [userId]),
      db.query("SELECT COUNT(DISTINCT t.id)::int FROM tasks t JOIN task_assignees ta ON t.id = ta.task_id WHERE ta.user_id = $1 AND t.status = 'IN_PROGRESS'", [userId]),
      db.query(`
        SELECT p.*, m.name as manager_name, c.name as created_by_name
        FROM projects p
        LEFT JOIN users m ON p.manager_id = m.id
        LEFT JOIN users c ON p.created_by_id = c.id
        ORDER BY p.created_at DESC
        LIMIT 5
      `),
      db.query(`
        SELECT t.*, c.name as created_by_name,
               (SELECT json_agg(json_build_object('id', u.id, 'name', u.name, 'email', u.email)) 
                FROM task_assignees ta
                JOIN users u ON ta.user_id = u.id
                WHERE ta.task_id = t.id) as assignees
        FROM tasks t
        LEFT JOIN users c ON t.created_by_id = c.id
        ORDER BY t.created_at DESC
        LIMIT 5
      `),
      db.query('SELECT status, COUNT(*)::int FROM tasks GROUP BY status'),
      db.query('SELECT status, COUNT(*)::int FROM projects GROUP BY status'),
    ]);

    const projectsCount = projectsCountResult.rows[0].count;
    const tasksCount = tasksCountResult.rows[0].count;
    const completedTasksCount = completedTasksCountResult.rows[0].count;
    const usersCount = usersCountResult.rows[0].count;
    const myProjectsCount = myProjectsCountResult.rows[0].count;
    const myTasksCount = myTasksCountResult.rows[0].count;
    const pendingTasksCount = pendingTasksCountResult.rows[0].count;
    const inProgressTasksCount = inProgressTasksCountResult.rows[0].count;
    const recentProjects = recentProjectsResult.rows;
    const recentTasks = recentTasksResult.rows;

    const statusCounts: { [key: string]: number } = {
      TODO: 0, IN_PROGRESS: 0, IN_REVIEW: 0, COMPLETED: 0, CANCELLED: 0
    };
    tasksByStatusResult.rows.forEach(row => { statusCounts[row.status] = row.count; });

    const projectStatusCounts: { [key: string]: number } = {
      PLANNING: 0, IN_PROGRESS: 0, ON_HOLD: 0, COMPLETED: 0, CANCELLED: 0
    };
    projectsByStatusResult.rows.forEach(row => { projectStatusCounts[row.status] = row.count; });

    const stats = {
      totalProjects: projectsCount || 0,
      activeProjects: projectStatusCounts.IN_PROGRESS || 0,
      completedProjects: projectStatusCounts.COMPLETED || 0,
      totalTasks: tasksCount || 0,
      completedTasks: completedTasksCount || 0,
      pendingTasks: statusCounts.TODO || 0,
      activeTasks: statusCounts.IN_PROGRESS || 0,
      overdueTasks: 0, // TODO: implement overdue logic
      myProjects: myProjectsCount || 0,
      myTasks: myTasksCount || 0,
      pending_my_tasks: pendingTasksCount || 0,
      in_progress_my_tasks: inProgressTasksCount || 0,
      totalUsers: usersCount || 0,
      recentActivity: [], // TODO: implement
      tasksByStatus: statusCounts,
      projectsByStatus: projectStatusCounts,
      recentProjects: recentProjects || [],
      recentTasks: recentTasks || [],
    };

    return corsResponse(stats, request);
  } catch (error) {
    console.error('GET /api/dashboard/stats error:', error);
    return corsResponse(
      { error: 'Erreur serveur' },
      request,
      { status: 500 }
    );
  }
}
