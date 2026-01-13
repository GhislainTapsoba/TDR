import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/verifyAuth';
import { s3Client } from '@/lib/storage';
import { db } from '@/lib/db';
import { Upload } from "@aws-sdk/lib-storage";
import formidable, { File } from 'formidable';
import fs from 'fs';
import { handleCorsOptions, corsResponse } from '@/lib/cors';

// Disable the default body parser to handle file streams
export const config = {
  api: {
    bodyParser: false,
  },
};

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

    const data = await new Promise<{ fields: formidable.Fields; files: formidable.Files }>((resolve, reject) => {
      const form = formidable({});
      form.parse(request.body as any, (err, fields, files) => {
        if (err) {
          reject(err);
          return;
        }
        resolve({ fields, files });
      });
    });

    const file = data.files.file?.[0] as File;
    const { task_id, project_id } = data.fields;

    if (!file) {
      return corsResponse({ error: 'No file provided' }, request, { status: 400 });
    }

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      return corsResponse({ error: 'File is too large (max 10MB)' }, request, { status: 400 });
    }

    const fileStream = fs.createReadStream(file.filepath);
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.originalFilename?.split('.').pop();
    const storage_path = `documents/${timestamp}_${randomString}.${fileExtension}`;

    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: process.env.MINIO_BUCKET!,
        Key: storage_path,
        Body: fileStream,
        ContentType: file.mimetype!,
      },
    });

    await upload.done();
    
    // The file URL will be constructed on the fly using a presigned URL on the frontend
    // Here we save the storage path
    const file_url = storage_path;

    const insertQuery = `
      INSERT INTO documents (task_id, project_id, user_id, file_name, file_url, file_type, file_size, storage_path)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `;
    const { rows } = await db.query(insertQuery, [
      task_id?.[0] || null,
      project_id?.[0] || null,
      user.id,
      file.originalFilename,
      file_url,
      file.mimetype,
      file.size,
      storage_path,
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
