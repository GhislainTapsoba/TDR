import { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/verifyAuth';
import { db } from '@/lib/db';
import { handleCorsOptions, corsResponse } from '@/lib/cors';
import { stageStatusChangedByEmployeeTemplate } from '@/lib/emailTemplates';
import { sendEmail } from '@/lib/emailService';
import { mapDbRoleToUserRole, requirePermission, canManageProject } from '@/lib/permissions';

// Gérer les requêtes OPTIONS (preflight CORS)
export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

// GET /api/stages/[id] - Récupérer une étape par ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return corsResponse({ error: 'Unauthorized' }, request, { status: 401 });
    }

    const userRole = mapDbRoleToUserRole(user.role ?? null);
    const perm = requirePermission(userRole, 'stages', 'read');
    if (!perm.allowed) {
      return corsResponse({ error: perm.error }, request, { status: 403 });
    }

    const { id } = params;

    const { rows, rowCount } = await db.query(
      `SELECT s.*, u.name as created_by_name 
       FROM stages s 
       LEFT JOIN users u ON s.created_by_id = u.id 
       WHERE s.id = $1`,
      [id]
    );

    if (rowCount === 0) {
      return corsResponse({ error: 'Étape non trouvée' }, request, { status: 404 });
    }
    const stage = rows[0];

    // Si non-ADMIN, vérifier l'accès au projet de l'étape
    if (userRole !== 'admin') {
      const { rows: projectRows } = await db.query(
        'SELECT created_by_id, manager_id FROM projects WHERE id = $1',
        [stage.project_id]
      );
      if (projectRows.length === 0) {
        return corsResponse({ error: 'Projet associé introuvable' }, request, { status: 404 });
      }
      const project = projectRows[0];

      const hasAccess = project.created_by_id === user.id || project.manager_id === user.id;

      if (!hasAccess) {
        const { rowCount: memberCount } = await db.query(
          'SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2',
          [stage.project_id, user.id]
        );

        if (memberCount === 0) {
          return corsResponse({ error: 'Vous n\'avez pas accès à cette étape' }, request, { status: 403 });
        }
      }
    }

    return corsResponse(stage, request);
  } catch (error) {
    console.error('GET /api/stages/[id] error:', error);
    return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
  }
}

// PATCH /api/stages/[id] - Mettre à jour une étape
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return corsResponse({ error: 'Unauthorized' }, request, { status: 401 });
    }

    const userRole = mapDbRoleToUserRole(user.role ?? null);
    const userId = user.id as string;
    const perm = requirePermission(userRole, 'stages', 'update');
    if (!perm.allowed) {
      return corsResponse({ error: perm.error }, request, { status: 403 });
    }

    const { id } = params;
    const body = await request.json();

    const { rows: oldStageRows } = await db.query('SELECT * FROM stages WHERE id = $1', [id]);
    if (oldStageRows.length === 0) {
      return corsResponse({ error: 'Étape non trouvée' }, request, { status: 404 });
    }
    const oldStage = oldStageRows[0];

    const { rows: projectRows } = await db.query('SELECT id, title, manager_id, created_by_id FROM projects WHERE id = $1', [oldStage.project_id]);
    if (projectRows.length === 0) {
      return corsResponse({ error: 'Projet associé introuvable' }, request, { status: 404 });
    }
    const project = projectRows[0];
    
    const hasProjectAccess = userRole === 'admin' || project.manager_id === userId || project.created_by_id === userId;

    if (!hasProjectAccess && userRole === 'user') {
      const { rowCount: memberCount } = await db.query('SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2', [oldStage.project_id, userId]);
      if (memberCount === 0) {
        return corsResponse({ error: 'Vous ne pouvez modifier que les étapes des projets auxquels vous avez accès' }, request, { status: 403 });
      }
    } else if (!hasProjectAccess) {
      return corsResponse({ error: 'Vous ne pouvez modifier que les étapes de vos propres projets' }, request, { status: 403 });
    }

    const updateFields: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    const fields = ['name', 'description', 'order', 'duration', 'status'];
    fields.forEach(field => {
        if (body[field] !== undefined) {
            updateFields.push(`${field} = $${paramIndex++}`);
            queryParams.push(body[field]);
        }
    });

    if (updateFields.length === 0) {
        return corsResponse({ error: 'Aucun champ à mettre à jour'}, request, {status: 400})
    }

    queryParams.push(id);
    const updateQuery = `UPDATE stages SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const { rows: updatedStageRows } = await db.query(updateQuery, queryParams);
    const stage = updatedStageRows[0];

    await db.query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details, metadata) 
       VALUES ($1, 'update', 'stage', $2, $3, $4)`,
      [userId, id, `Mise à jour de l'étape: ${stage.name}`, JSON.stringify({ changes: updateData })]
    );
    
    const hasStatusChange = !!(body.status && oldStage.status !== body.status);

    if (hasStatusChange && userRole === 'user') {
        const { rows: currentUserRows } = await db.query('SELECT name, email FROM users WHERE id = $1', [userId]);
        const currentUser = currentUserRows[0];

        const recipients: { email: string; name: string }[] = [];

        if (project.manager_id) {
            const { rows: managerRows } = await db.query('SELECT name, email FROM users WHERE id = $1', [project.manager_id]);
            if (managerRows.length > 0) {
                recipients.push({ email: managerRows[0].email, name: managerRows[0].name || 'Chef de projet' });
            }
        }

        const { rows: adminRows } = await db.query("SELECT name, email FROM users WHERE role = 'ADMIN'");
        adminRows.forEach(admin => {
            if (admin.email && !recipients.find(r => r.email === admin.email)) {
                recipients.push({ email: admin.email, name: admin.name || 'Admin' });
            }
        });

        if (recipients.length > 0) {
            const emailHtml = stageStatusChangedByEmployeeTemplate({
              employeeName: currentUser?.name || 'Employé',
              stageName: stage.name,
              stageId: stage.id,
              projectTitle: project.title,
              projectId: stage.project_id,
              oldStatus: oldStage.status,
              newStatus: body.status,
              comment: body.comment
            });
            for (const recipient of recipients) {
                await sendEmail({
                  to: recipient.email,
                  subject: `Changement de statut - ${stage.name}`,
                  html: emailHtml,
                  metadata: {
                    stage_id: stage.id,
                    project_id: stage.project_id,
                    action: 'stage_status_changed_by_employee',
                    old_status: oldStage.status,
                    new_status: body.status
                  }
                });
            }
        }
    }

    const { rows: finalStageRows } = await db.query(
      `SELECT s.*, u.name as created_by_name 
       FROM stages s 
       LEFT JOIN users u ON s.created_by_id = u.id 
       WHERE s.id = $1`,
      [stage.id]
    );

    return corsResponse(finalStageRows[0], request);
  } catch (error) {
    console.error('PATCH /api/stages/[id] error:', error);
    return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
  }
}

// DELETE /api/stages/[id] - Supprimer une étape
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return corsResponse({ error: 'Unauthorized' }, request, { status: 401 });
    }

    const userRole = mapDbRoleToUserRole(user.role ?? null);
    const userId = user.id as string;
    const perm = requirePermission(userRole, 'stages', 'delete');
    if (!perm.allowed) {
      return corsResponse({ error: perm.error }, request, { status: 403 });
    }

    const { id } = params;

    const { rows: stageRows } = await db.query('SELECT name, project_id FROM stages WHERE id = $1', [id]);
    if (stageRows.length === 0) {
      return corsResponse({ error: 'Étape non trouvée' }, request, { status: 404 });
    }
    const stage = stageRows[0];

    const { rows: projectRows } = await db.query('SELECT id, manager_id, created_by_id FROM projects WHERE id = $1', [stage.project_id]);
    if (projectRows.length === 0) {
      return corsResponse({ error: 'Projet associé introuvable' }, request, { status: 404 });
    }
    const project = projectRows[0];
    
    if (!canManageProject(userRole, userId, project.manager_id) && project.created_by_id !== userId) {
      return corsResponse({ error: 'Vous ne pouvez supprimer que les étapes de vos propres projets' }, request, { status: 403 });
    }

    await db.query('DELETE FROM stages WHERE id = $1', [id]);

    await db.query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) 
       VALUES ($1, 'delete', 'stage', $2, $3)`,
      [userId, id, `Suppression de l'étape: ${stage.name}`]
    );

    return corsResponse({ success: true }, request);
  } catch (error) {
    console.error('DELETE /api/stages/[id] error:', error);
    return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
  }
}
