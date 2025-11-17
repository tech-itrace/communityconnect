/**
 * Lean Schema Migration Runner
 * 
 * Executes all migration phases sequentially with error handling
 * 
 * Usage:
 *   npm run migrate:lean              - Run all phases
 *   npm run migrate:validate          - Run validation only
 *   npm run migrate:drop-old-tables   - Drop old tables (after validation)
 */

import dotenv from 'dotenv';
import pool from '../config/db';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

dotenv.config();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askQuestion(question: string): Promise<string> {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer);
        });
    });
}

async function runMigration(filename: string): Promise<void> {
    const filePath = path.join(__dirname, '../migrations', filename);

    if (!fs.existsSync(filePath)) {
        throw new Error(`Migration file not found: ${filename}`);
    }

    const sql = fs.readFileSync(filePath, 'utf8');

    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔄 Running migration: ${filename}`);
    console.log('='.repeat(60));

    try {
        const client = await pool.connect();

        try {
            // Execute migration
            await client.query(sql);
            console.log(`✅ Migration completed successfully`);
        } finally {
            client.release();
        }
    } catch (error: any) {
        console.error(`\n❌ Migration failed: ${error.message}`);
        if (error.detail) {
            console.error(`   Detail: ${error.detail}`);
        }
        if (error.hint) {
            console.error(`   Hint: ${error.hint}`);
        }
        throw error;
    }
}

async function checkDatabaseConnection(): Promise<void> {
    console.log('🔍 Checking database connection...');
    try {
        const result = await pool.query('SELECT current_database(), current_user;');
        console.log(`✅ Connected to database: ${result.rows[0].current_database}`);
        console.log(`   User: ${result.rows[0].current_user}`);
    } catch (error: any) {
        console.error(`❌ Database connection failed: ${error.message}`);
        throw error;
    }
}

async function createBackup(): Promise<void> {
    console.log('\n⚠️  IMPORTANT: Have you backed up your database?');
    console.log('   Recommended: pg_dump communityconnect > backup_$(date +%Y%m%d_%H%M%S).sql\n');

    const answer = await askQuestion('Have you created a backup? (yes/no): ');

    if (answer.toLowerCase() !== 'yes') {
        console.log('\n❌ Please create a backup before proceeding.');
        console.log('   Run: pg_dump communityconnect > backup.sql');
        process.exit(1);
    }
}

async function runAllMigrations(): Promise<void> {
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║         LEAN SCHEMA MIGRATION - Community Connect         ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');

    await checkDatabaseConnection();
    await createBackup();

    const migrations = [
        '001_add_profile_data_column.sql',
        '002_migrate_profile_data.sql',
        '003_add_search_vector_to_embeddings.sql',
        '004_validate_migration.sql'
    ];

    try {
        for (const migration of migrations) {
            await runMigration(migration);

            // Pause after validation to review
            if (migration === '004_validate_migration.sql') {
                console.log('\n' + '='.repeat(60));
                console.log('⚠️  VALIDATION COMPLETE - Please review the output above');
                console.log('='.repeat(60));
                console.log('\nNext steps:');
                console.log('1. Review validation results carefully');
                console.log('2. Test your application with the new schema');
                console.log('3. When ready, run: npm run migrate:drop-old-tables');
                console.log('\nNOTE: Old tables are still present for safety.');
            }
        }

        console.log('\n╔═══════════════════════════════════════════════════════════╗');
        console.log('║              ✅ MIGRATIONS COMPLETED SUCCESSFULLY          ║');
        console.log('╚═══════════════════════════════════════════════════════════╝');
        console.log('\n📋 Summary:');
        console.log('   ✅ Added JSONB columns (profile_data, permissions)');
        console.log('   ✅ Migrated all profile data to JSONB');
        console.log('   ✅ Added search_vector to member_embeddings');
        console.log('   ✅ Validation completed');
        console.log('\n🔧 Next Actions:');
        console.log('   1. Test application thoroughly');
        console.log('   2. Verify queries work with new structure');
        console.log('   3. Run: npm run migrate:drop-old-tables (when confident)');
        console.log('   4. Or rollback: npm run migrate:rollback');
        console.log('');

    } catch (error) {
        console.error('\n╔═══════════════════════════════════════════════════════════╗');
        console.error('║                💥 MIGRATION FAILED                        ║');
        console.error('╚═══════════════════════════════════════════════════════════╝');
        console.error('\n🔧 Recovery Options:');
        console.error('   1. Check error message above');
        console.error('   2. Fix the issue and re-run');
        console.error('   3. Rollback: npm run migrate:rollback');
        console.error('   4. Restore from backup if needed\n');
        process.exit(1);
    } finally {
        rl.close();
        await pool.end();
    }
}

async function runValidation(): Promise<void> {
    console.log('Running validation only...\n');

    try {
        await checkDatabaseConnection();
        await runMigration('004_validate_migration.sql');
        console.log('\n✅ Validation complete');
    } catch (error) {
        console.error('\n❌ Validation failed');
        process.exit(1);
    } finally {
        rl.close();
        await pool.end();
    }
}

async function dropOldTables(): Promise<void> {
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║             ⚠️  DROP OLD TABLES - DESTRUCTIVE             ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log('\nThis will permanently delete:');
    console.log('  • alumni_profiles');
    console.log('  • entrepreneur_profiles');
    console.log('  • resident_profiles');
    console.log('  • member_search_index');
    console.log('  • community_admins');
    console.log('\n⚠️  Make sure:');
    console.log('  1. Validation passed successfully');
    console.log('  2. Application tested with new schema');
    console.log('  3. You have a recent backup');
    console.log('');

    const answer = await askQuestion('Type "DROP TABLES" to confirm: ');

    if (answer !== 'DROP TABLES') {
        console.log('\n❌ Cancelled. Tables not dropped.');
        rl.close();
        await pool.end();
        process.exit(0);
    }

    try {
        await checkDatabaseConnection();
        await runMigration('005_drop_old_tables.sql');

        console.log('\n╔═══════════════════════════════════════════════════════════╗');
        console.log('║           ✅ OLD TABLES DROPPED SUCCESSFULLY              ║');
        console.log('╚═══════════════════════════════════════════════════════════╝');
        console.log('\n🎉 Lean schema migration complete!');
        console.log('   Schema reduced from 12 tables to ~8 tables');
        console.log('   ~40% fewer indexes');
        console.log('   Simpler codebase');
        console.log('');
    } catch (error) {
        console.error('\n❌ Failed to drop tables');
        console.error('   Your data is still safe in JSONB columns');
        console.error('   You can retry or rollback\n');
        process.exit(1);
    } finally {
        rl.close();
        await pool.end();
    }
}

async function rollback(): Promise<void> {
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║                  ⚠️  ROLLBACK MIGRATION                   ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log('\nThis will revert to the original schema.');
    console.log('');

    const answer = await askQuestion('Type "ROLLBACK" to confirm: ');

    if (answer !== 'ROLLBACK') {
        console.log('\n❌ Cancelled.');
        rl.close();
        await pool.end();
        process.exit(0);
    }

    try {
        await checkDatabaseConnection();
        await runMigration('ROLLBACK_lean_schema.sql');
        console.log('\n✅ Rollback complete - schema reverted');
    } catch (error) {
        console.error('\n❌ Rollback failed');
        process.exit(1);
    } finally {
        rl.close();
        await pool.end();
    }
}

// Main execution
const command = process.argv[2];

(async () => {
    try {
        switch (command) {
            case 'validate':
                await runValidation();
                break;
            case 'drop':
                await dropOldTables();
                break;
            case 'rollback':
                await rollback();
                break;
            default:
                await runAllMigrations();
        }
    } catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
})();
