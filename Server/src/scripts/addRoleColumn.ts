/**
 * Add Role Column to community_members
 * 
 * Migration to add role-based access control
 */

import dotenv from 'dotenv';
import { query } from '../config/db';

dotenv.config();

async function addRoleColumn() {
    console.log('[Migration] Adding role column to community_members...\n');

    try {
        // 1. Add role column
        console.log('1. Adding role column...');
        await query(`
            ALTER TABLE community_members 
            ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'member';
        `);
        console.log('✓ Role column added\n');

        // 2. Create check constraint for valid roles
        console.log('2. Adding role check constraint...');
        await query(`
            ALTER TABLE community_members
            DROP CONSTRAINT IF EXISTS check_valid_role;
        `);
        await query(`
            ALTER TABLE community_members
            ADD CONSTRAINT check_valid_role 
            CHECK (role IN ('member', 'admin', 'super_admin'));
        `);
        console.log('✓ Role constraint added\n');

        // 3. Set default role for existing members
        console.log('3. Setting default role for existing members...');
        const result = await query(`
            UPDATE community_members 
            SET role = 'member' 
            WHERE role IS NULL;
        `);
        console.log(`✓ Updated ${result.rowCount} members with default role\n`);

        // 4. Create index on role column
        console.log('4. Creating index on role column...');
        await query(`
            CREATE INDEX IF NOT EXISTS idx_members_role 
            ON community_members(role);
        `);
        console.log('✓ Role index created\n');

        // 5. Show current role distribution
        console.log('5. Current role distribution:');
        const distribution = await query(`
            SELECT role, COUNT(*) as count 
            FROM community_members 
            GROUP BY role 
            ORDER BY count DESC;
        `);
        console.table(distribution.rows);

        console.log('\n=== Migration Complete! ✓ ===\n');
        console.log('Next steps:');
        console.log('1. Manually promote admins:');
        console.log("   UPDATE community_members SET role = 'admin' WHERE phone = '+919840930854';");
        console.log('\n2. Promote super admins:');
        console.log("   UPDATE community_members SET role = 'super_admin' WHERE phone = '+91xxxxxxxxxx';");
        console.log('');

    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        throw error;
    } finally {
        process.exit(0);
    }
}

// Run migration
addRoleColumn();
