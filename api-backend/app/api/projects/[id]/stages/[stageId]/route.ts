import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/verifyAuth';
import { db } from '@/lib/db';
import { sendEmail } from '@/lib/emailService';
import { stageStatusChangedByEmployeeTemplate } from '@/lib/emailTemplates';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; stageId: string } }
) {
  try {
    const { stageId } = params;
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, order, duration, status, dependencyIds } = body;

    // Récupérer l'étape originale
    const { rows: originalStageRows, rowCount: originalStageCount } = await db.query(
      'SELECT *, project_id FROM stages WHERE id = $1',
      [parseInt(stageId)]
    );

    if (originalStageCount === 0) {
      return NextResponse.json({ error: 'Stage not found' }, { status: 404 });
    }
    const originalStage = originalStageRows[0];

    // Récupérer le projet pour le nom
    let project: { name: string } | null = null;
    const { rows: projectRows } = await db.query(
      'SELECT name FROM projects WHERE id = $1',
      [originalStage.project_id]
    );
    if (projectRows.length > 0) {
      project = projectRows[0];
    }
    
    // Mettre à jour l'étape
    const updateFields = [];
    const queryParams = [];
    let paramIndex = 1;

    if (name !== undefined) { updateFields.push(`name = $${paramIndex++}`); queryParams.push(name); }
    if (order !== undefined) { updateFields.push(`order = $${paramIndex++}`); queryParams.push(order); }
    if (duration !== undefined) { updateFields.push(`duration = $${paramIndex++}`); queryParams.push(duration); }
    if (status !== undefined) { updateFields.push(`status = $${paramIndex++}`); queryParams.push(status); }
    if (dependencyIds !== undefined) { updateFields.push(`dependencies = $${paramIndex++}`); queryParams.push(dependencyIds); }

    if (updateFields.length === 0) {
        return NextResponse.json({ error: "No fields to update"}, { status: 400 });
    }

    queryParams.push(parseInt(stageId));
    const updateQuery = `UPDATE stages SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    
    const { rows: updatedStageRows } = await db.query(updateQuery, queryParams);
    const updatedStage = updatedStageRows[0];


    // Envoyer un email si le statut passe à "completed"
    if (
      originalStage &&
      originalStage.status !== updatedStage.status &&
      ['completed', 'Completed', 'validated'].includes(updatedStage.status)
    ) {
      const projectManagerEmail = process.env.PROJECT_MANAGER_EMAIL;
      const generalManagerEmail = process.env.GENERAL_MANAGER_EMAIL;

      if (projectManagerEmail || generalManagerEmail) {
        const html = stageStatusChangedByEmployeeTemplate({
          employeeName: user.name || user.email,
          stageName: updatedStage.name,
          stageId: updatedStage.id.toString(),
          projectTitle: project?.name || 'Projet',
          projectId: originalStage.project_id.toString(),
          oldStatus: originalStage.status,
          newStatus: updatedStage.status,
        });
        const subject = `Changement de statut d'étape: ${updatedStage.name}`;

        if (projectManagerEmail) await sendEmail({ to: projectManagerEmail, subject, html });
        if (generalManagerEmail) await sendEmail({ to: generalManagerEmail, subject, html });
      }
    }

    return NextResponse.json(updatedStage);
  } catch (error) {
    console.error('Update stage error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; stageId: string } }
) {
  try {
    const { stageId } = params;
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { rowCount } = await db.query('DELETE FROM stages WHERE id = $1', [parseInt(stageId)]);

    if (rowCount === 0) {
        return NextResponse.json({ error: 'Stage not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Stage deleted successfully' });
  } catch (error) {
    console.error('Delete stage error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
