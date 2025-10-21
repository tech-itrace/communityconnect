import dotenv from 'dotenv';
import { Pool } from 'pg';

// Load environment variables before creating pool
dotenv.config();

// Database connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000, // Increased to 10 seconds
    query_timeout: 30000, // 30 seconds for query execution
});

// Test connection
pool.on('connect', () => {
    console.log('[DB] Connected to PostgreSQL database');
});

pool.on('error', (err) => {
    console.error('[DB] Unexpected error on idle client', err);
    process.exit(-1);
});

export default pool;

// Helper function to execute queries
export async function query(text: string, params?: any[]) {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log('[DB] Executed query', { text: text.substring(0, 100), duration, rows: res.rowCount });
        return res;
    } catch (error) {
        console.error('[DB] Query error', { text, error });
        throw error;
    }
}

// Helper function to get a client for transactions
export async function getClient() {
    const client = await pool.connect();
    const query = client.query.bind(client);
    const originalRelease = client.release.bind(client);

    // Set a timeout of 30 seconds for transactions
    const timeout = setTimeout(() => {
        console.error('[DB] Client checkout timeout');
        originalRelease();
    }, 30000);

    // Override release to clear timeout
    const release = () => {
        clearTimeout(timeout);
        originalRelease();
    };

    return { query, release };
}
