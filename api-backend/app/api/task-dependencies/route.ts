import { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/verifyAuth';
import { db } from '@/lib/db';
import { handleCorsOptions, corsResponse } from '@/lib/cors';
import { mapDbRoleToUserRole, requirePermission } from '@/lib/permissions';

// Gérer les requêtes OPTIONS (preflight CORS)
export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

// GET /api/task-dependencies - Récupérer les dépendances de tâches
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return corsResponse({ error: 'Unauthorized' }, request, { status: 401 });
    }

    const userRole = mapDbRoleToUserRole(user.role ?? null);
    const perm = requirePermission(userRole, 'tasks', 'read'); // Dépendances liées aux tâches
    if (!perm.allowed) {
      return corsResponse({ error: perm.error }, request, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('task_id');
    const dependentTaskId = searchParams.get('dependent_task_id');

    let queryText = 'SELECT * FROM task_dependencies';
    const queryParams: any[] = [];
    const whereClauses: string[] = [];
    let paramIndex = 1;

    if (taskId) {
      whereClauses.push(`task_id = $${paramIndex++}`);
      queryParams.push(taskId);
    }
    if (dependentTaskId) {
      whereClauses.push(`dependent_task_id = $${paramIndex++}`);
      queryParams.push(dependentTaskId);
    }

    if (whereClauses.length > 0) {
      queryText += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    const { rows } = await db.query(queryText, queryParams);
    return corsResponse(rows, request);
  } catch (error) {
    console.error('GET /api/task-dependencies error:', error);
    return corsResponse(
      { error: 'Erreur serveur' },
      request,
      { status: 500 }
    );
  }
}

// Fonction pour vérifier la dépendance circulaire
async function hasCircularDependency(taskId: string, dependentTaskId: string): Promise<boolean> {
  const q = `
    WITH RECURSIVE dependency_path (task_id, dependent_task_id, path, depth) AS (
      SELECT td.task_id, td.dependent_task_id, ARRAY[td.task_id, td.dependent_task_id], 1
      FROM task_dependencies td
      WHERE td.task_id = $1
      UNION ALL
      SELECT dp.task_id, td.dependent_task_id, dp.path || td.dependent_task_id, dp.depth + 1
      FROM dependency_path dp
      JOIN task_dependencies td ON dp.dependent_task_id = td.task_id
      WHERE td.dependent_task_id != ALL(dp.path)
    )
    SELECT EXISTS (SELECT 1 FROM dependency_path WHERE dependent_task_id = $2);
  `;
  const { rows } = await db.query(q, [dependentTaskId, taskId]);
  return rows[0].exists;
}

// POST /api/task-dependencies - Créer une nouvelle dépendance
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return corsResponse({ error: 'Unauthorized' }, request, { status: 401 });
    }

    const userRole = mapDbRoleToUserRole(user.role ?? null);
    const perm = requirePermission(userRole, 'tasks', 'update'); // Nécessite la permission de modifier les tâches
    if (!perm.allowed) {
      return corsResponse({ error: perm.error }, request, { status: 403 });
    }

    const body = await request.json();
    const { task_id, dependent_task_id } = body;

    if (!task_id || !dependent_task_id) {
      return corsResponse(
        { error: 'task_id et dependent_task_id sont requis' },
        request,
        { status: 400 }
      );
    }

    if (task_id === dependent_task_id) {
      return corsResponse(
        { error: 'Une tâche ne peut pas dépendre d\'elle-même' },
        request,
        { status: 400 }
      );
    }

    // Vérifier l'existence des tâches
    const { rowCount: task1Count } = await db.query('SELECT id FROM tasks WHERE id = $1', [task_id]);
    const { rowCount: task2Count } = await db.query('SELECT id FROM tasks WHERE id = $1', [dependent_task_id]);

    if (task1Count === 0 || task2Count === 0) {
      return corsResponse(
        { error: 'Une ou plusieurs tâches spécifiées n\'existent pas' },
        request,
        { status: 404 }
      );
    }

    // Vérifier si la dépendance existe déjà
    const { rowCount: existingDepCount } = await db.query(
      'SELECT id FROM task_dependencies WHERE task_id = $1 AND dependent_task_id = $2',
      [task_id, dependent_task_id]
    );

    if ((existingDepCount ?? 0) > 0) {
      return corsResponse(
        { error: 'Cette dépendance existe déjà' },
        request,
        { status: 409 }
      );
    }

    // Vérifier les dépendances circulaires
    if (await hasCircularDependency(task_id, dependent_task_id)) {
      return corsResponse(
        { error: 'Cette dépendance créerait une dépendance circulaire' },
        request,
        { status: 400 }
      );
    }

    const insertQuery = 'INSERT INTO task_dependencies (task_id, dependent_task_id) VALUES ($1, $2) RETURNING *';
    const { rows } = await db.query(insertQuery, [task_id, dependent_task_id]);
    const newDependency = rows[0];

    await db.query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) 
       VALUES ($1, 'create', 'task_dependency', $2, $3)`,
      [user.id, newDependency.id, `Created dependency: task ${task_id} -> ${dependent_task_id}`]
    );

    return corsResponse(newDependency, request, { status: 201 });
  } catch (error) {
    console.error('POST /api/task-dependencies error:', error);
    return corsResponse(
      { error: 'Erreur serveur' },
      request,
      { status: 500 }
    );
  }
}

// DELETE /api/task-dependencies - Supprimer une dépendance
export async function DELETE(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return corsResponse({ error: 'Unauthorized' }, request, { status: 401 });
    }

    const userRole = mapDbRoleToUserRole(user.role ?? null);
    const perm = requirePermission(userRole, 'tasks', 'update');
    if (!perm.allowed) {
      return corsResponse({ error: perm.error }, request, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('task_id');
    const dependentTaskId = searchParams.get('dependent_task_id');

    if (!taskId || !dependentTaskId) {
      return corsResponse(
        { error: 'task_id et dependent_task_id sont requis' },
        request,
        { status: 400 }
      );
    }

    const { rowCount } = await db.query(
      'DELETE FROM task_dependencies WHERE task_id = $1 AND dependent_task_id = $2',
      [taskId, dependentTaskId]
    );

    if (rowCount === 0) {
      return corsResponse(
        { error: 'Dépendance non trouvée' },
        request,
        { status: 404 }
      );
    }

    await db.query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) 
       VALUES ($1, 'delete', 'task_dependency', NULL, $2)`,
      [user.id, `Deleted dependency: task ${taskId} -> ${dependentTaskId}`]
    );

    return corsResponse({ message: 'Dépendance supprimée avec succès' }, request);
  } catch (error) {
    console.error('DELETE /api/task-dependencies error:', error);
    return corsResponse(
      { error: 'Erreur serveur' },
      request,
      { status: 500 }
    );
  }
}
