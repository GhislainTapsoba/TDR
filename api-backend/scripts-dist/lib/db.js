import { Pool } from 'pg';
var pool;
if (process.env.NODE_ENV === 'production') {
    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: false
    });
}
else {
    // In development, it's often easier to manage connections without SSL
    // and with more direct configuration if needed.
    if (!global._pgPool) {
        global._pgPool = new Pool({
            connectionString: process.env.DATABASE_URL,
        });
    }
    pool = global._pgPool;
}
export var db = pool;
