import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/verifyAuth';
import { s3Client } from '@/lib/storage';
import { db } from '@/lib/db';
import { Upload } from "@aws-sdk/lib-storage";
import { handleCorsOptions, corsResponse } from '@/lib/cors';

// Use Node.js runtime to handle file streams
export const runtime = 'nodejs';

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

// POST /api/documents/upload - Upload a file to MinIO and save metadata to Postgres
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return corsResponse({ error: 'Unauthorized' }, request, { status: 401 });
    }

    const data = await request.formData();
    const file = data.get('file') as File | null;
    const taskId = data.get('task_id') as string | null;
    const projectId = data.get('project_id') as string | null;

    if (!file) {
      return corsResponse({ error: 'No file provided' }, request, { status: 400 });
    }

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      return corsResponse({ error: 'File is too large (max 10MB)' }, request, { status: 400 });
    }

    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop();
    const storage_path = `documents/${timestamp}_${randomString}.${fileExtension}`;

    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: process.env.MINIO_BUCKET!,
        Key: storage_path,
        Body: file.stream(),
        ContentType: file.type,
      },
    });

    await upload.done();
    
    // The file URL will be constructed on the fly using a presigned URL on the frontend
    // Here we save the storage path
    const file_url = storage_path;

    const insertQuery = `
      INSERT INTO documents (task_id, project_id, uploaded_by, name, file_url, file_type, file_size)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    const { rows } = await db.query(insertQuery, [
      taskId || null,
      projectId || null,
      user.id,
      file.name,
      file_url,
      file.type,
      file.size,
    ]);

    return corsResponse(rows[0], request, { status: 201 });

  } catch (error) {
    console.error('POST /api/documents/upload error:', error);
    return corsResponse(
      { error: 'Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
      request,
      { status: 500 }
    );
  }
}
