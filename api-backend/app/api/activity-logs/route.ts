import { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/verifyAuth';
import { db } from '@/lib/db';
import { handleCorsOptions, corsResponse } from '@/lib/cors';
import { mapDbRoleToUserRole, requirePermission } from '@/lib/permissions';

// Gérer les requêtes OPTIONS (preflight CORS)
export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

// GET /api/activity-logs - Récupérer tous les logs d'activité
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return corsResponse({ error: 'Unauthorized' }, request, { status: 401 });
    }

    const userRole = mapDbRoleToUserRole(user.role as string | null);
    // Temporarily bypass permission check for activity-logs for admin
    if (userRole !== 'admin') {
      const perm = await requirePermission(userRole, 'activity-logs', 'read');
      if (!perm.allowed) {
        return corsResponse({ error: perm.error }, request, { status: 403 });
      }
    }

    const { searchParams } = new URL(request.url);
    const entity_type = searchParams.get('entity_type');
    const entity_id = searchParams.get('entity_id');
    const userIdFilter = searchParams.get('user_id');
    const limit = parseInt(searchParams.get('limit') || '50');

    let queryText = `
      SELECT al.*, u.name as user_name
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
    `;
    const queryParams: any[] = [];
    const whereClauses: string[] = [];
    let paramIndex = 1;

    if (entity_type) {
      whereClauses.push(`al.entity_type = $${paramIndex++}`);
      queryParams.push(entity_type);
    }

    if (entity_id) {
      whereClauses.push(`al.entity_id = $${paramIndex++}`);
      queryParams.push(entity_id);
    }

    if (userIdFilter) {
      whereClauses.push(`al.user_id = $${paramIndex++}`);
      queryParams.push(userIdFilter);
    }

    if (whereClauses.length > 0) {
      queryText += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    queryText += ` ORDER BY al.created_at DESC LIMIT $${paramIndex++}`;
    queryParams.push(limit);

    const { rows } = await db.query(queryText, queryParams);

    return corsResponse(rows || [], request);
  } catch (error) {
    console.error('GET /api/activity-logs error:', error);
    return corsResponse(
      { error: 'Erreur serveur' },
      request,
      { status: 500 }
    );
  }
}
