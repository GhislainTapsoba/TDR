import { S3Client } from "@aws-sdk/client-s3";

let s3ClientInstance: S3Client | null = null;

export function getS3Client(): S3Client {
  if (!s3ClientInstance) {
    const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT || "localhost";
    const MINIO_PORT = parseInt(process.env.MINIO_PORT || "9000", 10);
    const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY;
    const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY;

    if (!MINIO_ACCESS_KEY || !MINIO_SECRET_KEY) {
      throw new Error("MinIO access key or secret key is not defined in environment variables");
    }

    s3ClientInstance = new S3Client({
      endpoint: `http://${MINIO_ENDPOINT}:${MINIO_PORT}`,
      region: "us-east-1", // This is required for AWS SDK v3, but can be a placeholder for MinIO
      credentials: {
        accessKeyId: MINIO_ACCESS_KEY,
        secretAccessKey: MINIO_SECRET_KEY,
      },
      forcePathStyle: true, // This is crucial for MinIO
    });
  }
  return s3ClientInstance;
}

// For backward compatibility, export as s3Client using a getter
export const s3Client: S3Client = new Proxy({} as S3Client, {
  get(target, prop) {
    const client = getS3Client();
    return (client as any)[prop];
  }
});
