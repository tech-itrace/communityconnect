import { Pool } from 'pg';

// Database connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
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
    const release = client.release.bind(client);

    // Set a timeout of 5 seconds for transactions
    const timeout = setTimeout(() => {
        console.error('[DB] Client checkout timeout');
        client.release();
    }, 5000);

    client.release = () => {
        clearTimeout(timeout);
        client.release();
    };

    return { query, release };
}
