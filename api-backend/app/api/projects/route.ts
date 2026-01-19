import { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/verifyAuth';
import { db } from '@/lib/db';
import { handleCorsOptions, corsResponse } from '@/lib/cors';
import { mapDbRoleToUserRole, requirePermission } from '@/lib/permissions';

// Gérer les requêtes OPTIONS (preflight CORS)
export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

// GET /api/projects - Récupérer tous les projets (avec vérification d'accès)
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return corsResponse({ error: 'Unauthorized' }, request, { status: 401 });
    }

    const userRole = mapDbRoleToUserRole(user.role as string | null);
    const userId = user.id as string;

    const perm = await requirePermission(userRole, 'projects', 'read');
    if (!perm.allowed) {
      return corsResponse({ error: perm.error }, request, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');

    let queryText = `
      SELECT DISTINCT p.id, p.title, p.description, p.status, p.start_date, p.due_date,
             p.manager_id, p.created_by_id, p.created_at, p.updated_at,
             u.name as manager_name, cu.name as created_by_name
      FROM projects p
      LEFT JOIN users u ON p.manager_id = u.id
      LEFT JOIN users cu ON p.created_by_id = cu.id
    `;
    const queryParams: (string | number)[] = [];
    let whereClauses: string[] = [];
    let paramIndex = 1;

    if (userRole === 'admin') {
      // Admin sees all projects (optionally filtered by status)
      if (statusFilter) {
        whereClauses.push(`p.status = $${paramIndex++}`);
        queryParams.push(statusFilter);
      }
    } else if (userRole === 'manager') {
      // Manager sees:
      // 1. Projects they manage (as manager_id)
      // 2. Projects they created
      // 3. Projects where they are assigned to tasks
      let managerWhere: string[] = [];

      managerWhere.push(`p.manager_id = $${paramIndex++}`);
      queryParams.push(userId);

      managerWhere.push(`p.created_by_id = $${paramIndex++}`);
      queryParams.push(userId);

      managerWhere.push(`
        p.id IN (
          SELECT DISTINCT t.project_id
          FROM tasks t
          WHERE t.assigned_to = $${paramIndex++}
        )
      `);
      queryParams.push(userId);

      let finalManagerWhere = `(${managerWhere.join(' OR ')})`;

      if (statusFilter) {
        finalManagerWhere += ` AND p.status = $${paramIndex++}`;
        queryParams.push(statusFilter);
      }

      whereClauses.push(finalManagerWhere);
    } else {
      // Employee sees:
      // 1. Projects they created
      // 2. Projects where they are assigned to tasks
      // 3. Projects they manage (if any)
      let employeeWhere: string[] = [];

      employeeWhere.push(`p.created_by_id = $${paramIndex++}`);
      queryParams.push(userId);

      employeeWhere.push(`p.manager_id = $${paramIndex++}`);
      queryParams.push(userId);

      employeeWhere.push(`
        p.id IN (
          SELECT DISTINCT t.project_id
          FROM tasks t
          WHERE t.assigned_to = $${paramIndex++}
        )
      `);
      queryParams.push(userId);

      let finalEmployeeWhere = `(${employeeWhere.join(' OR ')})`;

      if (statusFilter) {
        finalEmployeeWhere += ` AND p.status = $${paramIndex++}`;
        queryParams.push(statusFilter);
      }

      whereClauses.push(finalEmployeeWhere);
    }

    if (whereClauses.length > 0) {
      queryText += ' WHERE ' + whereClauses.join(' AND ');
    }

    queryText += ' ORDER BY p.created_at DESC';

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

    const perm = await requirePermission(userRole, 'projects', 'create');
    if (!perm.allowed) {
      return corsResponse({ error: perm.error }, request, { status: 403 });
    }

    const body = await request.json();
    const { title, description, status, start_date, due_date, manager_id } = body;

    // Validation
    if (!title || !status) {
      return corsResponse(
        { error: 'Le titre et le statut sont requis' },
        request,
        { status: 400 }
      );
    }

    // Vérifier les permissions pour assigner un manager
    let finalManagerId = manager_id;
    if (manager_id) {
      if (userRole !== 'admin') {
        // Seuls les admins peuvent assigner un manager différent
        finalManagerId = user.id;
      }
    } else {
      // Si pas de manager spécifié, utiliser l'utilisateur actuel si c'est un manager
      if (userRole === 'manager' || userRole === 'admin') {
        finalManagerId = user.id;
      }
    }

    const insertQuery = `
      INSERT INTO projects (title, description, status, start_date, due_date, manager_id, created_by_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, title, description, status, start_date, due_date, manager_id, created_by_id, created_at, updated_at
    `;
    const { rows } = await db.query(insertQuery, [
      title,
      description || null,
      status,
      start_date || null,
      due_date || null,
      finalManagerId || null,
      user.id
    ]);

    return corsResponse(rows[0], request, { status: 201 });
  } catch (error) {
    console.error('POST /api/projects error:', error);
    return corsResponse(
      { error: 'Erreur serveur' },
      request,
      { status: 500 }
    );
  }
}
