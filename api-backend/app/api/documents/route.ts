import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { handleCorsOptions, corsResponse } from '@/lib/cors';
import { verifyAuth } from '@/lib/verifyAuth';

// Gérer les requêtes OPTIONS (preflight CORS)
export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

// GET /api/documents - Récupérer tous les documents ou par projet
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');
    const taskId = searchParams.get('task_id');

    let queryText = `
      SELECT d.*, 
             u.name as uploaded_by_name, 
             p.title as project_title, 
             t.title as task_title 
      FROM documents d 
      LEFT JOIN users u ON d.uploaded_by = u.id 
      LEFT JOIN projects p ON d.project_id = p.id 
      LEFT JOIN tasks t ON d.task_id = t.id
    `;
    const queryParams: any[] = [];
    const whereClauses: string[] = [];
    let paramIndex = 1;

    if (projectId) {
      whereClauses.push(`d.project_id = $${paramIndex++}`);
      queryParams.push(projectId);
    }

    if (taskId) {
      whereClauses.push(`d.task_id = $${paramIndex++}`);
      queryParams.push(taskId);
    }

    if (whereClauses.length > 0) {
      queryText += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    queryText += ' ORDER BY d.created_at DESC';

    const { rows } = await db.query(queryText, queryParams);
    return corsResponse(rows || [], request);
  } catch (error) {
    console.error('GET /api/documents error:', error);
    return corsResponse(
      { error: 'Erreur serveur' },
      request,
      { status: 500 }
    );
  }
}

// POST /api/documents - Créer un nouveau document
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return corsResponse({ error: 'Unauthorized' }, request, { status: 401 });
    }

    const body = await request.json();

    // Validation
    if (!body.name || !body.file_url) {
      return corsResponse(
        { error: 'Le nom et l\'URL du fichier sont requis' },
        request,
        { status: 400 }
      );
    }

    if (!body.project_id && !body.task_id) {
      return corsResponse(
        { error: 'project_id ou task_id est requis' },
        request,
        { status: 400 }
      );
    }

    const insertQuery = `
      INSERT INTO documents (name, file_url, file_type, file_size, description, project_id, task_id, uploaded_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `;
    const { rows } = await db.query(insertQuery, [
      body.name,
      body.file_url,
      body.file_type || null,
      body.file_size || null,
      body.description || null,
      body.project_id || null,
      body.task_id || null,
      user.id, // Use authenticated user's ID
    ]);

    const newDocument = rows[0];

    // Log activity
    await db.query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details, metadata) 
       VALUES ($1, 'create', 'document', $2, $3, $4)`,
      [
        user.id,
        newDocument.id,
        `Uploaded document: ${newDocument.name}`,
        JSON.stringify({
          document_name: newDocument.name,
          project_id: newDocument.project_id,
          task_id: newDocument.task_id,
        }),
      ]
    );

    const { rows: finalDocRows } = await db.query(`
      SELECT d.*, 
             u.name as uploaded_by_name, 
             p.title as project_title, 
             t.title as task_title 
      FROM documents d 
      LEFT JOIN users u ON d.uploaded_by = u.id 
      LEFT JOIN projects p ON d.project_id = p.id 
      LEFT JOIN tasks t ON d.task_id = t.id
      WHERE d.id = $1
    `, [newDocument.id]);

    return corsResponse(finalDocRows[0], request, { status: 201 });
  } catch (error) {
    console.error('POST /api/documents error:', error);
    return corsResponse(
      { error: 'Erreur serveur' },
      request,
      { status: 500 }
    );
  }
}
