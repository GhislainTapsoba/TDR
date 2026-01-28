// api-backend/app/api/reject-task-via-token/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { confirmToken, executeConfirmationAction } from '@/lib/emailConfirmation';
import { handleCorsOptions, corsResponse } from '@/lib/cors';
import { db } from '@/lib/db'; // Import db to fetch task details

// Gérer les requêtes OPTIONS (preflight CORS)
export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

// POST /api/reject-task-via-token - Refuser une tâche via un token
export async function POST(request: NextRequest) {
  try {
    const { token, rejectionReason } = await request.json();

    if (!token) {
      return corsResponse({ error: 'Jeton manquant' }, request, { status: 400 });
    }
    if (!rejectionReason || rejectionReason.trim() === '') {
      return corsResponse({ error: 'La raison du refus est obligatoire' }, request, { status: 400 });
    }

    // 1. Vérifier et confirmer le token
    const result = await confirmToken(token);

    if (!result.success) {
      // Return specific error messages from confirmToken
      return corsResponse({ error: result.error }, request, { status: 400 });
    }

    // Ensure the token is for task rejection
    if (result.data.type !== 'TASK_REJECTION') {
      return corsResponse({ error: 'Type de jeton invalide pour cette action.' }, request, { status: 400 });
    }

    // 2. Exécuter l'action de refus
    // Pass the rejectionReason from the request body to override any placeholder in metadata
    const actionSuccess = await executeConfirmationAction(result.data, { rejectionReason });

    if (!actionSuccess) {
      return corsResponse({ error: 'Erreur lors de l\'exécution de l\'action de refus.' }, request, { status: 500 });
    }

    // 3. Fetch task details to return in response
    const { rows: taskRows } = await db.query(
      'SELECT id, title FROM tasks WHERE id = $1',
      [result.data.entityId]
    );
    const taskDetails = taskRows[0];

    return corsResponse(
      {
        success: true,
        message: 'Tâche refusée avec succès. Les responsables ont été notifiés.',
        taskId: taskDetails?.id,
        taskTitle: taskDetails?.title,
      },
      request
    );
  } catch (error) {
    console.error('POST /api/reject-task-via-token error:', error);
    return corsResponse({ error: 'Erreur serveur interne' }, request, { status: 500 });
  }
}
