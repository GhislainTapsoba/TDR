import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/verifyAuth';
import { supabase } from '@/supabase'; // ton client Supabase
import { sendEmail } from '@/lib/emailService';
import { taskDueSoonTemplate } from '@/lib/emailTemplates'; // ou ton template correct

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stageId: string }> }
) {
  try {
    const { id, stageId } = await params;
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, order, duration, status, dependencyIds } = await request.json();

    // Récupérer l'étape originale
    const { data: originalStage, error: fetchError } = await supabase
      .from('stages')
      .select('*, project_id')
      .eq('id', parseInt(stageId))
      .single();

    if (fetchError) {
      console.error('Fetch original stage error:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 400 });
    }

    // Mettre à jour l'étape
    const { data: updatedStage, error: updateError } = await supabase
      .from('stages')
      .update({
        name,
        order,
        duration,
        status,
        dependencies: dependencyIds || [],
      })
      .eq('id', parseInt(stageId))
      .select('*')
      .single();

    if (updateError) {
      console.error('Update stage error:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    // Envoyer un email si le statut passe à "completed"
    if (
      originalStage &&
      originalStage.status !== updatedStage.status &&
      ['completed', 'Completed', 'validated'].includes(updatedStage.status)
    ) {
      const projectManagerEmail = process.env.PROJECT_MANAGER_EMAIL;
      const generalManagerEmail = process.env.GENERAL_MANAGER_EMAIL;

      if (projectManagerEmail || generalManagerEmail) {
        const { subject, html } = taskDueSoonTemplate(updatedStage);

        if (projectManagerEmail) await sendEmail(projectManagerEmail, subject, html);
        if (generalManagerEmail) await sendEmail(generalManagerEmail, subject, html);
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
  { params }: { params: Promise<{ id: string; stageId: string }> }
) {
  try {
    const { id, stageId } = await params;
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
      .from('stages')
      .delete()
      .eq('id', parseInt(stageId));

    if (error) {
      console.error('Delete stage error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ message: 'Stage deleted successfully' });
  } catch (error) {
    console.error('Delete stage error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
