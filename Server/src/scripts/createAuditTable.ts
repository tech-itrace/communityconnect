/**
 * Create Audit Logs Table
 * 
 * Creates audit_logs table for tracking all admin actions,
 * permission denials, and important system events
 */

import pool from '../config/db';

async function createAuditTable() {
    console.log('Creating audit_logs table...\n');

    try {
        // Create audit_logs table
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS audit_logs (
                id SERIAL PRIMARY KEY,
                user_id VARCHAR(50),
                phone VARCHAR(20),
                user_name VARCHAR(255),
                user_role VARCHAR(20),
                action VARCHAR(100) NOT NULL,
                resource_type VARCHAR(50),
                resource_id VARCHAR(100),
                old_value JSONB,
                new_value JSONB,
                ip_address VARCHAR(45),
                user_agent TEXT,
                status VARCHAR(20) DEFAULT 'success',
                error_message TEXT,
                metadata JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;

        await pool.query(createTableQuery);
        console.log('✓ audit_logs table created');

        // Create indexes for efficient querying
        const indexes = [
            {
                name: 'idx_audit_user_phone',
                query: 'CREATE INDEX IF NOT EXISTS idx_audit_user_phone ON audit_logs(phone);'
            },
            {
                name: 'idx_audit_action',
                query: 'CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);'
            },
            {
                name: 'idx_audit_resource',
                query: 'CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_logs(resource_type, resource_id);'
            },
            {
                name: 'idx_audit_created_at',
                query: 'CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at DESC);'
            },
            {
                name: 'idx_audit_status',
                query: 'CREATE INDEX IF NOT EXISTS idx_audit_status ON audit_logs(status);'
            },
            {
                name: 'idx_audit_user_role',
                query: 'CREATE INDEX IF NOT EXISTS idx_audit_user_role ON audit_logs(user_role);'
            }
        ];

        for (const index of indexes) {
            await pool.query(index.query);
            console.log(`✓ Created index: ${index.name}`);
        }

        // Create view for failed actions
        const viewQuery = `
            CREATE OR REPLACE VIEW audit_failed_actions AS
            SELECT 
                id,
                phone,
                user_name,
                action,
                resource_type,
                status,
                error_message,
                created_at
            FROM audit_logs
            WHERE status = 'failure'
            ORDER BY created_at DESC;
        `;

        await pool.query(viewQuery);
        console.log('✓ Created view: audit_failed_actions');

        // Display table info
        const tableInfo = await pool.query(`
            SELECT 
                column_name, 
                data_type, 
                is_nullable
            FROM information_schema.columns
            WHERE table_name = 'audit_logs'
            ORDER BY ordinal_position;
        `);

        console.log('\n📋 Audit Logs Table Schema:');
        console.log('┌─────────────────┬──────────────┬──────────┐');
        console.log('│ Column          │ Type         │ Nullable │');
        console.log('├─────────────────┼──────────────┼──────────┤');
        tableInfo.rows.forEach((row: any) => {
            const col = row.column_name.padEnd(15);
            const type = row.data_type.padEnd(12);
            const nullable = row.is_nullable === 'YES' ? 'Yes' : 'No';
            console.log(`│ ${col} │ ${type} │ ${nullable.padEnd(8)} │`);
        });
        console.log('└─────────────────┴──────────────┴──────────┘');

        // Display indexes
        const indexInfo = await pool.query(`
            SELECT indexname 
            FROM pg_indexes 
            WHERE tablename = 'audit_logs'
            ORDER BY indexname;
        `);

        console.log('\n📊 Indexes:');
        indexInfo.rows.forEach((row: any) => {
            console.log(`   - ${row.indexname}`);
        });

        console.log('\n✅ Migration Complete!\n');
        console.log('📝 Audit Actions Tracked:');
        console.log('   - role.promote / role.demote (role changes)');
        console.log('   - member.create / member.update / member.delete');
        console.log('   - permission.denied (403 errors)');
        console.log('   - search.query / search.members');
        console.log('   - session.create / session.expire');
        console.log('   - auth.login / auth.logout');
        console.log('   - admin.* (all admin actions)');
        console.log('');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

createAuditTable();
