/**
 * Fresh Setup Script - TypeScript Version
 * Wipes database and creates lean schema from scratch
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import pool, { query } from '../config/db';

const execAsync = promisify(exec);

// Extract database name from DATABASE_URL or use DATABASE_NAME env variable
function getDatabaseName(): string {
    if (process.env.DATABASE_NAME) {
        console.log('Using DATABASE_NAME from environment variable.: ', process.env.DATABASE_NAME);
        return process.env.DATABASE_NAME;
    }

    if (process.env.DATABASE_URL) {
        console.log('Extracting database name from DATABASE_URL. : ', process.env.DATABASE_URL);
        // Extract database name from postgresql://user:pass@host:port/dbname
        const match = process.env.DATABASE_URL.match(/\/([^/?]+)(?:\?|$)/);
        if (match && match[1]) {
            return match[1];
        }
    }

    return 'communityconnect';
}

const DB_NAME = getDatabaseName();

async function freshSetup() {
    console.log('🔄 Fresh Database Setup - Lean Schema');
    console.log(`📂 Database: ${DB_NAME}`);
    console.log('');

    try {
        // Backup existing database
        console.log('📦 Checking for existing database...');
        try {
            const { stdout } = await execAsync(`psql -lqt | grep -w ${DB_NAME}`);
            if (stdout.trim()) {
                console.log('📦 Creating backup...');
                const backupDir = path.join(__dirname, '../../backups');
                if (!fs.existsSync(backupDir)) {
                    fs.mkdirSync(backupDir, { recursive: true });
                }
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                await execAsync(`pg_dump ${DB_NAME} > ${backupDir}/backup_${timestamp}.sql`);
                console.log('✓ Backup saved');
            }
        } catch (e) {
            console.log('ℹ️  No existing database found');
        }

        // Drop and recreate database
        console.log('');
        console.log('🗑️  Dropping database...');

        // Terminate active connections first
        try {
            await execAsync(`psql -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB_NAME}' AND pid <> pg_backend_pid();"`);
        } catch (e) {
            // Ignore errors if database doesn't exist
        }

        await execAsync(`dropdb --if-exists ${DB_NAME}`);

        console.log('✨ Creating fresh database...');
        await execAsync(`createdb ${DB_NAME}`);

        // Load schema
        console.log('📊 Installing lean schema...');
        const schemaPath = path.join(__dirname, '../../../docs/CommunityConnect_LEAN_SCHEMA.sql');
        await execAsync(`psql -d ${DB_NAME} -f ${schemaPath}`);

        // Grant permissions to application user if specified in DATABASE_URL
        if (process.env.DATABASE_URL) {
            const userMatch = process.env.DATABASE_URL.match(/\/\/([^:]+):/);
            if (userMatch && userMatch[1] && userMatch[1] !== 'postgres') {
                const appUser = userMatch[1];
                console.log(`🔐 Granting permissions to ${appUser}...`);
                await execAsync(`psql -d ${DB_NAME} -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${appUser};"`);
                await execAsync(`psql -d ${DB_NAME} -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${appUser};"`);
                await execAsync(`psql -d ${DB_NAME} -c "GRANT ALL PRIVILEGES ON SCHEMA public TO ${appUser};"`);
                await execAsync(`psql -d ${DB_NAME} -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${appUser};"`);
                await execAsync(`psql -d ${DB_NAME} -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${appUser};"`);

                // Disable RLS for import scripts (they will need BYPASSRLS or to disable RLS on tables)
                console.log(`🔓 Disabling RLS for import operations...`);
                await execAsync(`psql -d ${DB_NAME} -c "ALTER TABLE community_memberships DISABLE ROW LEVEL SECURITY;"`);
                await execAsync(`psql -d ${DB_NAME} -c "ALTER TABLE member_embeddings DISABLE ROW LEVEL SECURITY;"`);
                await execAsync(`psql -d ${DB_NAME} -c "ALTER TABLE search_cache DISABLE ROW LEVEL SECURITY;"`);

                // Change table ownership to app user so they can create indexes
                console.log(`👤 Changing table ownership to ${appUser}...`);
                await execAsync(`psql -d ${DB_NAME} -c "ALTER TABLE member_embeddings OWNER TO ${appUser};"`);
                await execAsync(`psql -d ${DB_NAME} -c "ALTER TABLE community_memberships OWNER TO ${appUser};"`);
            }
        }

        // Create default community using the pool
        console.log('🏘️  Creating default community...');
        await query(`
            INSERT INTO communities (name, slug, type)
            VALUES ('Main Community', 'main-community', 'mixed')
            ON CONFLICT (slug) DO NOTHING
        `);

        console.log('');
        console.log('✅ Database setup complete!');
        console.log('');
        console.log('Next steps:');
        console.log('  1. npm run import:members:lean');
        console.log('  2. npm run generate:embeddings:lean');
        console.log('  3. npm run dev');

    } catch (error: any) {
        console.error('❌ Setup failed:', error.message);
        throw error;
    } finally {
        await pool.end();
    }
}

freshSetup()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
