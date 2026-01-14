import { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/verifyAuth';
import { db } from '@/lib/db';
import { handleCorsOptions, corsResponse } from '@/lib/cors';
import { mapDbRoleToUserRole, requirePermission } from '@/lib/permissions';

// Gérer les requêtes OPTIONS (preflight CORS)
export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

// GET /api/projects - Récupérer tous les projets accessibles
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return corsResponse({ error: 'Unauthorized' }, request, { status: 401 });
    }

    const userRole = mapDbRoleToUserRole(user.role as string | null);
    const userId = user.id as string;
    const perm = requirePermission(userRole, 'projects', 'read');
    if (!perm.allowed) {
      return corsResponse({ error: perm.error }, request, { status: 403 });
    }

    let queryText: string;
    const queryParams: any[] = [];

    if (userRole === 'admin') {
      // Admin voit tous les projets
      queryText = `
        SELECT p.*, u.name as manager_name, cu.name as created_by_name
        FROM projects p
        LEFT JOIN users u ON p.manager_id = u.id
        LEFT JOIN users cu ON p.created_by_id = cu.id
        ORDER BY p.created_at DESC
      `;
    } else {
      // Autres rôles voient seulement les projets auxquels ils ont accès
      queryText = `
        SELECT DISTINCT p.*, u.name as manager_name, cu.name as created_by_name
        FROM projects p
        LEFT JOIN users u ON p.manager_id = u.id
        LEFT JOIN users cu ON p.created_by_id = cu.id
        LEFT JOIN project_members pm ON p.id = pm.project_id
        LEFT JOIN tasks t ON p.id = t.project_id
        WHERE p.created_by_id = $1
           OR p.manager_id = $1
           OR pm.user_id = $1
           OR t.assigned_to_id = $1
        ORDER BY p.created_at DESC
      `;
      queryParams.push(userId);
    }

    const { rows } = await db.query(queryText, queryParams);

    return corsResponse(rows, request);
  } catch (error) {
    console.error('GET /api/projects error:', error);
    return corsResponse(
      { error: 'Erreur serveur' },
      request,
      { status: 500 }
    );
  }
}

// POST /api/projects - Créer un nouveau projet
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return corsResponse({ error: 'Unauthorized' }, request, { status: 401 });
    }

    const userRole = mapDbRoleToUserRole(user.role as string | null);
    const userId = user.id as string;
    const perm = requirePermission(userRole, 'projects', 'create');
    if (!perm.allowed) {
      return corsResponse({ error: perm.error }, request, { status: 403 });
    }

    const body = await request.json();
    const { title, description, start_date, due_date, manager_id } = body;

    // Validation
    if (!title) {
      return corsResponse(
        { error: 'Le titre est requis' },
        request,
        { status: 400 }
      );
    }

    const insertQuery = `
      INSERT INTO projects (title, description, start_date, due_date, status, manager_id, created_by_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const { rows } = await db.query(insertQuery, [
      title,
      description || null,
      start_date || null,
      due_date || null,
      'planifie',
      manager_id || null,
      userId
    ]);

    const newProject = rows[0];

    // Log de l'activité
    await db.query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
       VALUES ($1, 'create', 'project', $2, $3)`,
      [userId, newProject.id, `Created project: ${title}`]
    );

    // Récupérer le projet avec les noms
    const { rows: finalRows } = await db.query(
      `SELECT p.*, u.name as manager_name, cu.name as created_by_name
       FROM projects p
       LEFT JOIN users u ON p.manager_id = u.id
       LEFT JOIN users cu ON p.created_by_id = cu.id
       WHERE p.id = $1`,
      [newProject.id]
    );

    return corsResponse(finalRows[0], request, { status: 201 });
  } catch (error) {
    console.error('POST /api/projects error:', error);
    return corsResponse(
      { error: 'Erreur serveur' },
      request,
      { status: 500 }
    );
  }
}
