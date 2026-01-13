import { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/verifyAuth';
import { db } from '@/lib/db';
import { handleCorsOptions, corsResponse } from '@/lib/cors';

// Gérer les requêtes OPTIONS (preflight CORS)
export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

// GET /api/settings - Récupérer les paramètres de l'utilisateur
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return corsResponse({ error: 'Unauthorized' }, request, { status: 401 });
    }

    const { rows: settingsRows, rowCount: settingsCount } = await db.query(
      'SELECT * FROM user_settings WHERE user_id = $1',
      [user.id]
    );

    if (settingsCount === 0) {
      // Si pas de settings, créer des settings par défaut
      const { rows: newSettingsRows } = await db.query(
        `INSERT INTO user_settings (user_id, language, timezone, notifications_enabled, email_notifications, theme)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [user.id, 'fr', 'Europe/Paris', true, true, 'light']
      );
      if (newSettingsRows.length === 0) {
        console.error('Error creating settings: no row returned');
        return corsResponse(
          { error: 'Erreur lors de la création des paramètres' },
          request,
          { status: 500 }
        );
      }
      return corsResponse(newSettingsRows[0], request);
    }

    return corsResponse(settingsRows[0], request);
  } catch (error) {
    console.error('GET /api/settings error:', error);
    return corsResponse(
      { error: 'Erreur serveur' },
      request,
      { status: 500 }
    );
  }
}

// PUT /api/settings - Mettre à jour les paramètres de l'utilisateur
export async function PUT(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return corsResponse({ error: 'Unauthorized' }, request, { status: 401 });
    }

    const body = await request.json();
    const {
      language,
      timezone,
      notifications_enabled,
      email_notifications,
      theme,
      date_format,
      items_per_page,
      font_size,
      compact_mode,
    } = body;

    if (
      language === undefined && timezone === undefined &&
      notifications_enabled === undefined && email_notifications === undefined &&
      theme === undefined && date_format === undefined &&
      items_per_page === undefined && font_size === undefined &&
      compact_mode === undefined
    ) {
      return corsResponse(
        { error: 'Au moins un paramètre doit être fourni' },
        request,
        { status: 400 }
      );
    }

    const updateFields = [];
    const queryParams = [];
    let paramIndex = 1;

    if (language !== undefined) { updateFields.push(`language = ${paramIndex++}`); queryParams.push(language); }
    if (timezone !== undefined) { updateFields.push(`timezone = ${paramIndex++}`); queryParams.push(timezone); }
    if (notifications_enabled !== undefined) { updateFields.push(`notifications_enabled = ${paramIndex++}`); queryParams.push(notifications_enabled); }
    if (email_notifications !== undefined) { updateFields.push(`email_notifications = ${paramIndex++}`); queryParams.push(email_notifications); }
    if (theme !== undefined) { updateFields.push(`theme = ${paramIndex++}`); queryParams.push(theme); }
    if (date_format !== undefined) { updateFields.push(`date_format = ${paramIndex++}`); queryParams.push(date_format); }
    if (items_per_page !== undefined) { updateFields.push(`items_per_page = ${paramIndex++}`); queryParams.push(items_per_page); }
    if (font_size !== undefined) { updateFields.push(`font_size = ${paramIndex++}`); queryParams.push(font_size); }
    if (compact_mode !== undefined) { updateFields.push(`compact_mode = ${paramIndex++}`); queryParams.push(compact_mode); }

    queryParams.push(user.id);
    const updateQuery = `
      UPDATE user_settings 
      SET ${updateFields.join(', ')} 
      WHERE user_id = ${paramIndex}
      RETURNING *
    `;

    const { rows: settingsRows, rowCount: settingsCount } = await db.query(updateQuery, queryParams);

    if (settingsCount === 0) {
      return corsResponse(
        { error: 'Paramètres utilisateur non trouvés pour cet utilisateur' },
        request,
        { status: 404 }
      );
    }
    const settings = settingsRows[0];

    await db.query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details, metadata) 
       VALUES ($1, 'update', 'settings', $2, $3, $4)`,
      [user.id, settings.id, 'Paramètres mis à jour', JSON.stringify(updateData)]
    );

    return corsResponse(settings, request);
  } catch (error) {
    console.error('PUT /api/settings error:', error);
    return corsResponse(
      { error: 'Erreur serveur' },
      request,
      { status: 500 }
    );
  }
}
