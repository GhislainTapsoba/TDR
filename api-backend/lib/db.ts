import { Pool } from 'pg';

let pool: Pool;

if (process.env.NODE_ENV === 'production') {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
  });
} else {
  // In development, it's often easier to manage connections without SSL
  // and with more direct configuration if needed.
  if (!(global as any)._pgPool) {
    (global as any)._pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }
  pool = (global as any)._pgPool;
}

export const db = pool;
