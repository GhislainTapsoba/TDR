import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { handleCorsOptions, corsResponse } from '@/lib/cors';
import { s3Client } from '@/lib/storage';
import { GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { verifyAuth } from '@/lib/verifyAuth';

// Gérer les requêtes OPTIONS (preflight CORS)
export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

// GET /api/documents/[id] - Récupérer un document par ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const { rows, rowCount } = await db.query(
      `SELECT d.*, 
              u.name as uploaded_by_name, 
              p.title as project_title, 
              t.title as task_title 
       FROM documents d 
       LEFT JOIN users u ON d.uploaded_by = u.id 
       LEFT JOIN projects p ON d.project_id = p.id 
       LEFT JOIN tasks t ON d.task_id = t.id
       WHERE d.id = $1`,
      [id]
    );

    if (rowCount === 0) {
      return corsResponse({ error: 'Document non trouvé' }, request, { status: 404 });
    }
    const document = rows[0];

    // Generate presigned URL for the file
    const getObjectCommand = new GetObjectCommand({
        Bucket: process.env.MINIO_BUCKET!,
        Key: document.storage_path,
    });
    const presignedUrl = await getSignedUrl(s3Client, getObjectCommand, { expiresIn: 3600 }); // URL valide 1 heure

    // Replace the file_url with the presigned URL
    document.file_url = presignedUrl;

    return corsResponse(document, request);
  } catch (error) {
    console.error('GET /api/documents/[id] error:', error);
    return corsResponse(
      { error: 'Erreur serveur' },
      request,
      { status: 500 }
    );
  }
}

// PATCH /api/documents/[id] - Mettre à jour un document
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return corsResponse({ error: 'Unauthorized' }, request, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const updateFields = [];
    const queryParams = [];
    let paramIndex = 1;

    if (body.name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      queryParams.push(body.name);
    }
    if (body.description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`);
      queryParams.push(body.description);
    }

    if (updateFields.length === 0) {
        return corsResponse({ error: 'Aucun champ à mettre à jour' }, request, { status: 400 });
    }

    queryParams.push(id);
    const updateQuery = `
      UPDATE documents 
      SET ${updateFields.join(', ')} 
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const { rows, rowCount } = await db.query(updateQuery, queryParams);
    
    if (rowCount === 0) {
      return corsResponse({ error: 'Document non trouvé' }, request, { status: 404 });
    }
    const updatedDocument = rows[0];

    // Log activity
    await db.query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details, metadata) 
       VALUES ($1, 'update', 'document', $2, $3, $4)`,
      [
        user.id,
        updatedDocument.id,
        `Updated document: ${updatedDocument.name}`,
        JSON.stringify({ changes: updateFields.join(', ') }),
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
    `, [updatedDocument.id]);

    return corsResponse(finalDocRows[0], request);
  } catch (error) {
    console.error('PATCH /api/documents/[id] error:', error);
    return corsResponse(
      { error: 'Erreur serveur' },
      request,
      { status: 500 }
    );
  }
}

// DELETE /api/documents/[id] - Supprimer un document
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return corsResponse({ error: 'Unauthorized' }, request, { status: 401 });
    }

    const { id } = await params;
    
    // Get document info before deleting
    const { rows: docRows, rowCount: docCount } = await db.query('SELECT name, storage_path FROM documents WHERE id = $1', [id]);
    if (docCount === 0) {
      return corsResponse({ error: 'Document non trouvé' }, request, { status: 404 });
    }
    const document = docRows[0];

    // Delete from MinIO
    const deleteCommand = new DeleteObjectCommand({
        Bucket: process.env.MINIO_BUCKET!,
        Key: document.storage_path,
    });
    await s3Client.send(deleteCommand);


    const { rowCount: deleteCount } = await db.query('DELETE FROM documents WHERE id = $1', [id]);

    if (deleteCount === 0) {
      return corsResponse({ error: 'Document non trouvé' }, request, { status: 404 });
    }

    // Log activity
    await db.query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) 
       VALUES ($1, 'delete', 'document', $2, $3)`,
      [user.id, id, `Deleted document: ${document.name}`]
    );

    return corsResponse(
      { success: true, message: 'Document supprimé avec succès' },
      request
    );
  } catch (error) {
    console.error('DELETE /api/documents/[id] error:', error);
    return corsResponse(
      { error: 'Erreur serveur' },
      request,
      { status: 500 }
    );
  }
}