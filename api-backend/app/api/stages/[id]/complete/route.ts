import { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/verifyAuth';
import { db } from '@/lib/db';
import { handleCorsOptions, corsResponse } from '@/lib/cors';
import { allStagesCompletedTemplate } from '@/lib/emailTemplates';
import { sendEmail } from '@/lib/emailService';
import { sendActionNotification } from '@/lib/notificationService';

// Gérer les requêtes OPTIONS (preflight CORS)
export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

// POST /api/stages/[id]/complete - Marquer une étape comme terminée
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return corsResponse({ error: 'Unauthorized' }, request, { status: 401 });
    }

    const { id } = await params;

    const { rows: stageRows } = await db.query('SELECT * FROM stages WHERE id = $1', [id]);
    if (stageRows.length === 0) {
      console.error('Error fetching stage: Stage not found');
      return corsResponse({ error: 'Étape introuvable' }, request, { status: 404 });
    }
    const stage = stageRows[0];

    const { rows: tasksInStage } = await db.query('SELECT id, status FROM tasks WHERE stage_id = $1', [id]);
    const hasIncompleteTasks = tasksInStage.some(task => task.status !== 'COMPLETED');

    if (hasIncompleteTasks) {
      return corsResponse(
        {
          error: 'Toutes les tâches de cette étape doivent être terminées avant de valider l\'étape',
          incomplete_tasks: tasksInStage.filter(t => t.status !== 'COMPLETED').length
        },
        request,
        { status: 400 }
      );
    }

    await db.query('UPDATE stages SET status = $1, updated_at = NOW() WHERE id = $2', ['COMPLETED', id]);

    const { rows: projectInfoRows } = await db.query('SELECT id, name, title, manager_id FROM projects WHERE id = $1', [stage.project_id]);
    const projectInfo = projectInfoRows.length > 0 ? projectInfoRows[0] : null;

    let managerInfo = null;
    if (projectInfo?.manager_id) {
      const { rows: managerRows } = await db.query('SELECT id, name, email, role FROM users WHERE id = $1', [projectInfo.manager_id]);
      managerInfo = managerRows.length > 0 ? managerRows[0] : null;
    }

    await sendActionNotification({
      actionType: 'STAGE_COMPLETED',
      performedBy: {
        id: user.id,
        name: user.name || 'Utilisateur',
        email: user.email,
        role: user.role as 'ADMIN' | 'MANAGER' | 'EMPLOYEE'
      },
      entity: {
        type: 'stage',
        id: id,
        data: { ...stage, status: 'COMPLETED' }
      },
      affectedUsers: managerInfo ? [managerInfo] : [],
      projectId: stage.project_id,
      metadata: {
        projectName: projectInfo?.title || projectInfo?.name || 'Projet',
        projectId: stage.project_id
      }
    });

    const { rows: allStagesRows } = await db.query('SELECT id, status, name FROM stages WHERE project_id = $1', [stage.project_id]);
    const allStages = allStagesRows;
    const allStagesCompleted = allStages.every(s => s.status === 'COMPLETED');

    let projectManager = null;
    let project = null;

    if (allStagesCompleted) {
      const { rows: projectDataRows } = await db.query('SELECT id, title, description, manager_id, created_by_id FROM projects WHERE id = $1', [stage.project_id]);
      project = projectDataRows.length > 0 ? projectDataRows[0] : null;

      if (project) {
        const managerId = project.manager_id || project.created_by_id;
        if (managerId) {
          const { rows: managerRows } = await db.query('SELECT id, name, email FROM users WHERE id = $1', [managerId]);
          projectManager = managerRows.length > 0 ? managerRows[0] : null;

          if (projectManager?.email) {
            await db.query(
              `INSERT INTO notifications (user_id, type, title, message, metadata)
               VALUES ($1, $2, $3, $4, $5)`,
              [
                managerId,
                'PROJECT_COMPLETED',
                'Projet terminé',
                `Toutes les étapes du projet "${project.title}" ont été terminées`,
                JSON.stringify({
                  project_id: project.id,
                  completed_by: user.id,
                  stages_count: allStages.length
                })
              ]
            );
          }
        }
      }
    }

    const { rows: nextStageRows } = await db.query('SELECT * FROM stages WHERE project_id = $1 AND "order" = $2', [stage.project_id, stage.order + 1]);
    const nextStage = nextStageRows.length > 0 ? nextStageRows[0] : null;

    if (nextStage && nextStage.status === 'PENDING') {
      await db.query('UPDATE stages SET status = $1, updated_at = NOW() WHERE id = $2', ['IN_PROGRESS', nextStage.id]);
    }

    return corsResponse(
      {
        success: true,
        stage: { ...stage, status: 'COMPLETED' },
        all_stages_completed: allStagesCompleted,
        next_stage: nextStage,
        notification_sent: allStagesCompleted && !!projectManager,
        project_manager: projectManager
      },
      request
    );
  } catch (error) {
    console.error('POST /api/stages/[id]/complete error:', error);
    return corsResponse(
      { error: 'Erreur serveur' },
      request,
      { status: 500 }
    );
  }
}
