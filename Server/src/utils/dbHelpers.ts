/**
 * Database Helper Utilities
 *
 * Provides transaction support and reusable database patterns
 */

import pool from '../config/db';
import { PoolClient } from 'pg';

/**
 * Execute a function within a database transaction
 * Automatically handles BEGIN, COMMIT, and ROLLBACK
 *
 * @example
 * const result = await withTransaction(async (client) => {
 *   await client.query('INSERT INTO members ...');
 *   await client.query('INSERT INTO communities ...');
 *   return { success: true };
 * });
 */
export async function withTransaction<T>(
    callback: (client: PoolClient) => Promise<T>
): Promise<T> {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        console.log('[DB Transaction] BEGIN');

        const result = await callback(client);

        await client.query('COMMIT');
        console.log('[DB Transaction] COMMIT');

        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('[DB Transaction] ROLLBACK due to error:', error);
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Execute a query with a client (for use within transactions)
 */
export async function executeQuery(
    client: PoolClient,
    text: string,
    params?: any[]
): Promise<any> {
    const start = Date.now();
    try {
        const result = await client.query(text, params);
        const duration = Date.now() - start;

        console.log('[DB Query]', {
            duration,
            rows: result.rowCount,
            // Only show first 100 chars of query for logging
            query: text.substring(0, 100) + (text.length > 100 ? '...' : '')
        });

        return result;
    } catch (error: any) {
        console.error('[DB Query Error]', {
            error: error.message,
            query: text.substring(0, 100),
            params
        });
        throw error;
    }
}

/**
 * Check if a record exists by ID
 */
export async function exists(
    tableName: string,
    id: string,
    idColumn: string = 'id'
): Promise<boolean> {
    const result = await pool.query(
        `SELECT EXISTS(SELECT 1 FROM ${tableName} WHERE ${idColumn} = $1 AND is_active = TRUE)`,
        [id]
    );
    return result.rows[0].exists;
}

/**
 * Batch insert helper
 * Generates parameterized INSERT query for multiple rows
 *
 * @example
 * await batchInsert('members', ['name', 'phone', 'email'], [
 *   ['John', '919876543210', 'john@example.com'],
 *   ['Jane', '919876543211', 'jane@example.com']
 * ]);
 */
export async function batchInsert(
    tableName: string,
    columns: string[],
    values: any[][],
    client?: PoolClient
): Promise<any> {
    if (values.length === 0) {
        return { rows: [], rowCount: 0 };
    }

    const queryExecutor = client || pool;

    // Generate placeholders: ($1, $2, $3), ($4, $5, $6), ...
    const placeholders = values
        .map((row, rowIndex) => {
            const rowPlaceholders = columns
                .map((_, colIndex) => `$${rowIndex * columns.length + colIndex + 1}`)
                .join(', ');
            return `(${rowPlaceholders})`;
        })
        .join(', ');

    const flatValues = values.flat();

    const query = `
        INSERT INTO ${tableName} (${columns.join(', ')})
        VALUES ${placeholders}
        RETURNING *
    `;

    return queryExecutor.query(query, flatValues);
}

/**
 * Soft delete helper (sets is_active = FALSE)
 */
export async function softDelete(
    tableName: string,
    id: string,
    idColumn: string = 'id'
): Promise<boolean> {
    const result = await pool.query(
        `UPDATE ${tableName}
         SET is_active = FALSE, updated_at = NOW()
         WHERE ${idColumn} = $1 AND is_active = TRUE`,
        [id]
    );
    return result.rowCount! > 0;
}

/**
 * Update helper with automatic updated_at timestamp
 */
export async function updateRecord(
    tableName: string,
    id: string,
    updates: Record<string, any>,
    idColumn: string = 'id',
    client?: PoolClient
): Promise<any> {
    const queryExecutor = client || pool;

    const keys = Object.keys(updates);
    if (keys.length === 0) {
        throw new Error('No fields to update');
    }

    // Generate SET clause: field1 = $1, field2 = $2, ...
    const setClause = keys
        .map((key, index) => `${key} = $${index + 1}`)
        .join(', ');

    const values = keys.map(key => updates[key]);
    values.push(id); // Add ID as last parameter

    const query = `
        UPDATE ${tableName}
        SET ${setClause}, updated_at = NOW()
        WHERE ${idColumn} = $${values.length}
        RETURNING *
    `;

    const result = await queryExecutor.query(query, values);
    return result.rows[0] || null;
}

/**
 * Escape LIKE pattern special characters
 * Prevents unintended wildcard matches
 */
export function escapeLikePattern(pattern: string): string {
    return pattern.replace(/[%_\\]/g, '\\$&');
}

/**
 * Build dynamic WHERE clause with parameterized values
 * Helps prevent SQL injection in dynamic queries
 *
 * @example
 * const { whereClause, params } = buildWhereClause({
 *   name: 'John',
 *   age: 30,
 *   city: 'Chennai'
 * });
 * // Returns: { whereClause: "name = $1 AND age = $2 AND city = $3", params: ['John', 30, 'Chennai'] }
 */
export function buildWhereClause(
    conditions: Record<string, any>,
    startIndex: number = 1
): { whereClause: string; params: any[] } {
    const keys = Object.keys(conditions).filter(key => conditions[key] !== undefined);

    if (keys.length === 0) {
        return { whereClause: 'TRUE', params: [] };
    }

    const clauses: string[] = [];
    const params: any[] = [];
    let paramIndex = startIndex;

    keys.forEach(key => {
        clauses.push(`${key} = $${paramIndex}`);
        params.push(conditions[key]);
        paramIndex++;
    });

    return {
        whereClause: clauses.join(' AND '),
        params
    };
}

/**
 * Parse database row to camelCase object
 * Converts snake_case column names to camelCase
 */
export function snakeToCamel(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(snakeToCamel);
    }

    const camelObj: any = {};
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
            camelObj[camelKey] = snakeToCamel(obj[key]);
        }
    }
    return camelObj;
}

/**
 * Parse camelCase object to snake_case for database
 */
export function camelToSnake(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(camelToSnake);
    }

    const snakeObj: any = {};
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            snakeObj[snakeKey] = camelToSnake(obj[key]);
        }
    }
    return snakeObj;
}
