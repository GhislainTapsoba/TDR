import { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/verifyAuth';
import { db } from '@/lib/db';
import { handleCorsOptions, corsResponse } from '@/lib/cors';

// Gérer les requêtes OPTIONS (preflight CORS)
export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

// GET /api/notification-preferences - Récupérer les préférences de notifications
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return corsResponse({ error: 'Unauthorized' }, request, { status: 401 });
    }

    const { rows: preferencesRows, rowCount: preferencesCount } = await db.query(
      'SELECT * FROM notification_preferences WHERE user_id = $1',
      [user.id]
    );

    if (preferencesCount === 0) {
      // Si pas de préférences, créer des préférences par défaut
      const { rows: newPreferencesRows } = await db.query(
        `INSERT INTO notification_preferences (user_id, email_task_assigned, email_task_updated, email_task_due, email_stage_completed, email_project_created, push_notifications, daily_summary)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [user.id, true, true, true, false, true, true, false]
      );
      if (newPreferencesRows.length === 0) {
        console.error('Error creating notification preferences: no row returned');
        return corsResponse(
          { error: 'Erreur lors de la création des préférences de notifications' },
          request,
          { status: 500 }
        );
      }
      return corsResponse(newPreferencesRows[0], request);
    }

    return corsResponse(preferencesRows[0], request);
  } catch (error) {
    console.error('GET /api/notification-preferences error:', error);
    return corsResponse(
      { error: 'Erreur serveur' },
      request,
      { status: 500 }
    );
  }
}

// PUT /api/notification-preferences - Mettre à jour les préférences de notifications
export async function PUT(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return corsResponse({ error: 'Unauthorized' }, request, { status: 401 });
    }

    const body = await request.json();
    const {
      email_task_assigned,
      email_task_updated,
      email_task_due,
      email_stage_completed,
      email_project_created,
      push_notifications,
      daily_summary,
    } = body;

    if (
      email_task_assigned === undefined && email_task_updated === undefined &&
      email_task_due === undefined && email_stage_completed === undefined &&
      email_project_created === undefined && push_notifications === undefined &&
      daily_summary === undefined
    ) {
      return corsResponse(
        { error: 'Au moins une préférence doit être fournie' },
        request,
        { status: 400 }
      );
    }

    const updateFields = [];
    const queryParams = [];
    let paramIndex = 1;

    if (email_task_assigned !== undefined) { updateFields.push(`email_task_assigned = $${paramIndex++}`); queryParams.push(email_task_assigned); }
    if (email_task_updated !== undefined) { updateFields.push(`email_task_updated = $${paramIndex++}`); queryParams.push(email_task_updated); }
    if (email_task_due !== undefined) { updateFields.push(`email_task_due = $${paramIndex++}`); queryParams.push(email_task_due); }
    if (email_stage_completed !== undefined) { updateFields.push(`email_stage_completed = $${paramIndex++}`); queryParams.push(email_stage_completed); }
    if (email_project_created !== undefined) { updateFields.push(`email_project_created = $${paramIndex++}`); queryParams.push(email_project_created); }
    if (push_notifications !== undefined) { updateFields.push(`push_notifications = $${paramIndex++}`); queryParams.push(push_notifications); }
    if (daily_summary !== undefined) { updateFields.push(`daily_summary = $${paramIndex++}`); queryParams.push(daily_summary); }

    queryParams.push(user.id); // last parameter is user_id for WHERE clause
    const updateQuery = `
      UPDATE notification_preferences 
      SET ${updateFields.join(', ')} 
      WHERE user_id = $${paramIndex}
      RETURNING *
    `;

    const { rows: preferencesRows, rowCount: preferencesCount } = await db.query(updateQuery, queryParams);

    if (preferencesCount === 0) {
      return corsResponse(
        { error: 'Préférences de notifications non trouvées pour cet utilisateur' },
        request,
        { status: 404 }
      );
    }
    const preferences = preferencesRows[0];

    await db.query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details, metadata) 
       VALUES ($1, 'update', 'notification_preferences', $2, $3, $4)`,
      [user.id, preferences.id, 'Préférences de notifications mises à jour', JSON.stringify(updateData)]
    );

    return corsResponse(preferences, request);
  } catch (error) {
    console.error('PUT /api/notification-preferences error:', error);
    return corsResponse(
      { error: 'Erreur serveur' },
      request,
      { status: 500 }
    );
  }
}
