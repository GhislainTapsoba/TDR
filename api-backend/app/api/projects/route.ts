import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/verifyAuth';
import { db } from '@/lib/db';
import { handleCorsOptions, corsResponse } from '@/lib/cors';
import { sendActionNotification } from '@/lib/notificationService';
import { mapDbRoleToUserRole, requirePermission } from '@/lib/permissions';

// Gérer les requêtes OPTIONS (preflight CORS)
export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

// GET /api/projects - Récupérer tous les projets (filtrés par assignation)
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return corsResponse({ error: 'Unauthorized' }, request, { status: 401 });
    }

    const userRole = mapDbRoleToUserRole(user.role);
    const perm = requirePermission(userRole, 'projects', 'read');
    if (!perm.allowed) {
      return corsResponse({ error: perm.error }, request, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    let queryText: string;
    const queryParams: any[] = [];

    let paramIndex = 1;

    // Base query with join
    const baseQuery = `
      SELECT p.*, u.name as manager_name 
      FROM projects p 
      LEFT JOIN users u ON p.manager_id = u.id
    `;

    // Si ADMIN, retourner tous les projets
    if (userRole === 'admin') {
      queryText = baseQuery;
      if (status) {
        queryText += ` WHERE p.status = ${paramIndex++}`;
        queryParams.push(status);
      }
    } else {
      // Pour les autres rôles, filtrer par assignation
      const { rows: projectMembers } = await db.query('SELECT project_id FROM project_members WHERE user_id = ', [user.id]);
      const memberProjectIds = projectMembers.map(pm => pm.project_id);

      const { rows: assignedTasks } = await db.query('SELECT DISTINCT project_id FROM tasks WHERE assigned_to_id = ', [user.id]);
      const taskProjectIds = assignedTasks.map(t => t.project_id);
      
      const allAccessibleProjectIds = [...new Set([...memberProjectIds, ...taskProjectIds])];

      queryText = baseQuery + ` WHERE (p.created_by_id = ${paramIndex} OR p.manager_id = ${paramIndex++}`;
      queryParams.push(user.id);
      
      if (allAccessibleProjectIds.length > 0) {
        queryText += ` OR p.id = ANY(${paramIndex++}))`;
        queryParams.push(allAccessibleProjectIds);
      } else {
        queryText += `)`;
      }

      if (status) {
        queryText += ` AND p.status = ${paramIndex++}`;
        queryParams.push(status);
      }
    }

    queryText += ' ORDER BY p.created_at DESC';

    const { rows: projects } = await db.query(queryText, queryParams);

    return corsResponse(projects || [], request);
  } catch (error) {
    console.error('Get projects error:', error);
    return corsResponse(
      { error: 'Failed to fetch projects', details: error instanceof Error ? error.message : 'Unknown error' },
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

    const userRole = mapDbRoleToUserRole(user.role);
    const perm = requirePermission(userRole, 'projects', 'create');
    if (!perm.allowed) {
      return corsResponse({ error: perm.error }, request, { status: 403 });
    }

    const body = await request.json();
    
    const insertQuery = `
      INSERT INTO projects (title, description, start_date, end_date, due_date, status, created_by_id, manager_id)
      VALUES (, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const { rows } = await db.query(insertQuery, [
      body.title,
      body.description || null,
      body.start_date || null,
      body.end_date || null,
      body.due_date || null,
      body.status || 'PLANNING',
      body.created_by_id || user.id || null,
      body.manager_id || null,
    ]);

    const newProject = rows[0];

    // Envoyer les notifications selon les règles métier
    let managerInfo = null;
    if (newProject.manager_id) {
        const { rows: managerRows } = await db.query('SELECT id, name, email, role FROM users WHERE id = ', [newProject.manager_id]);
        if (managerRows.length > 0) {
            managerInfo = managerRows[0];
        }
    }
    
    const affectedUsers = managerInfo ? [managerInfo] : [];

    await sendActionNotification({
      actionType: 'PROJECT_CREATED',
      performedBy: {
        id: user.id,
        name: user.name || 'Utilisateur',
        email: user.email,
        role: user.role as 'ADMIN' | 'PROJECT_MANAGER' | 'EMPLOYEE'
      },
      entity: {
        type: 'project',
        id: newProject.id,
        data: newProject
      },
      affectedUsers,
      projectId: newProject.id,
      metadata: {}
    });

    // We can join in the initial query to get manager_name, let's refetch for simplicity for now
    const { rows: projectWithManager } = await db.query(
      'SELECT p.*, u.name as manager_name FROM projects p LEFT JOIN users u ON p.manager_id = u.id WHERE p.id = ',
      [newProject.id]
    );

    return corsResponse(projectWithManager[0], request, { status: 201 });
  } catch (error) {
    console.error('Create project error:', error);
    return corsResponse(
      { error: 'Failed to create project', details: error instanceof Error ? error.message : 'Unknown error' },
      request,
      { status: 500 }
    );
  }
}

