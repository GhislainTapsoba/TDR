import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { handleCorsOptions, corsResponse } from '@/lib/cors';
import { verifyAuth } from '@/lib/verifyAuth';

// Gérer les requêtes OPTIONS (preflight CORS)
export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

// POST /api/tasks/[id]/respond - Répondre à une tâche (accepter/refuser)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return corsResponse({ error: 'Unauthorized' }, request, { status: 401 });
    }

    const { id: taskId } = await params;
    const body = await request.json();
    const { response } = body; // 'accepted' ou 'rejected'

    if (!response || !['accepted', 'rejected'].includes(response)) {
      return corsResponse(
        { error: 'Response must be "accepted" or "rejected"' },
        request,
        { status: 400 }
      );
    }

    // Vérifier si l'utilisateur a déjà répondu à cette tâche
    const { rows: existingResponse } = await db.query(
      'SELECT id, response FROM task_responses WHERE task_id = $1 AND user_id = $2',
      [taskId, user.id]
    );

    if (existingResponse.length > 0) {
      return corsResponse(
        { 
          error: 'You have already responded to this task',
          existing_response: existingResponse[0].response
        },
        request,
        { status: 409 }
      );
    }

    // Vérifier que l'utilisateur est assigné à cette tâche
    const { rows: taskAssignees } = await db.query(
      'SELECT user_id FROM task_assignees WHERE task_id = $1 AND user_id = $2',
      [taskId, user.id]
    );

    if (taskAssignees.length === 0) {
      return corsResponse(
        { error: 'You are not assigned to this task' },
        request,
        { status: 403 }
      );
    }

    // Enregistrer la réponse
    const { rows } = await db.query(
      `INSERT INTO task_responses (task_id, user_id, response) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [taskId, user.id, response]
    );

    // Si accepté, changer le statut de la tâche à "IN_PROGRESS"
    if (response === 'accepted') {
      await db.query(
        'UPDATE tasks SET status = $1 WHERE id = $2',
        ['IN_PROGRESS', taskId]
      );
    }

    // Log de l'activité
    await db.query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) 
       VALUES ($1, $2, 'task', $3, $4)`,
      [
        user.id,
        response === 'accepted' ? 'accept_task' : 'reject_task',
        taskId,
        `${response === 'accepted' ? 'Accepted' : 'Rejected'} task assignment`
      ]
    );

    return corsResponse(rows[0], request, { status: 201 });
  } catch (error) {
    console.error('POST /api/tasks/[id]/respond error:', error);
    return corsResponse(
      { error: 'Server error' },
      request,
      { status: 500 }
    );
  }
}

// GET /api/tasks/[id]/respond - Vérifier si l'utilisateur a déjà répondu
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return corsResponse({ error: 'Unauthorized' }, request, { status: 401 });
    }

    const { id: taskId } = await params;

    const { rows } = await db.query(
      'SELECT response, responded_at FROM task_responses WHERE task_id = $1 AND user_id = $2',
      [taskId, user.id]
    );

    return corsResponse(
      { 
        has_responded: rows.length > 0,
        response: rows.length > 0 ? rows[0].response : null,
        responded_at: rows.length > 0 ? rows[0].responded_at : null
      },
      request
    );
  } catch (error) {
    console.error('GET /api/tasks/[id]/respond error:', error);
    return corsResponse(
      { error: 'Server error' },
      request,
      { status: 500 }
    );
  }
}