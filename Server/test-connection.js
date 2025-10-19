#!/usr/bin/env node
/**
 * Test Database Connection
 * 
 * This script tests if your DATABASE_URL is configured correctly
 * and the database is accessible.
 * 
 * Usage: node test-connection.js
 */

require('dotenv').config();
const { Pool } = require('pg');

console.log('🔍 Testing database connection...\n');

// Check if DATABASE_URL exists
if (!process.env.DATABASE_URL) {
    console.error('❌ ERROR: DATABASE_URL is not set in .env file');
    console.log('\nPlease:');
    console.log('1. Copy .env.example to .env');
    console.log('2. Add your DATABASE_URL');
    console.log('3. Run this script again\n');
    process.exit(1);
}

// Parse connection string (hide password in logs)
const dbUrl = process.env.DATABASE_URL;
const urlWithHiddenPassword = dbUrl.replace(/:([^@]+)@/, ':****@');
console.log('📍 Connection string:', urlWithHiddenPassword);
console.log('');

// Create connection pool
const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }, // Required for Supabase
    connectionTimeoutMillis: 5000,
});

// Test connection
async function testConnection() {
    let client;
    try {
        console.log('⏳ Connecting to database...');
        client = await pool.connect();
        console.log('✅ Successfully connected to PostgreSQL!\n');

        // Test 1: Get server version
        console.log('📊 Running tests...\n');
        const versionResult = await client.query('SELECT version()');
        console.log('✅ Test 1: Server Version');
        console.log('   PostgreSQL is running\n');

        // Test 2: Check for pgvector extension
        const extensionResult = await client.query(
            "SELECT * FROM pg_extension WHERE extname = 'vector'"
        );
        if (extensionResult.rows.length > 0) {
            console.log('✅ Test 2: pgvector Extension');
            console.log('   pgvector is installed and ready\n');
        } else {
            console.log('⚠️  Test 2: pgvector Extension');
            console.log('   pgvector NOT found (will be installed by db:setup)\n');
        }

        // Test 3: Check tables
        const tablesResult = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('community_members', 'member_embeddings', 'search_queries', 'search_cache')
            ORDER BY table_name
        `);

        if (tablesResult.rows.length > 0) {
            console.log('✅ Test 3: Database Tables');
            console.log('   Found tables:');
            tablesResult.rows.forEach(row => {
                console.log(`   - ${row.table_name}`);
            });
            console.log('');

            // Test 4: Check data
            const memberCount = await client.query('SELECT COUNT(*) FROM community_members');
            const embeddingCount = await client.query('SELECT COUNT(*) FROM member_embeddings');

            console.log('✅ Test 4: Data Count');
            console.log(`   Members: ${memberCount.rows[0].count}`);
            console.log(`   Embeddings: ${embeddingCount.rows[0].count}`);
            console.log('');
        } else {
            console.log('⚠️  Test 3: Database Tables');
            console.log('   No tables found (run "npm run db:setup" first)\n');
        }

        console.log('═══════════════════════════════════════');
        console.log('✅ ALL TESTS PASSED!');
        console.log('═══════════════════════════════════════');
        console.log('\nYour database connection is working correctly.');
        console.log('\nNext steps:');
        if (tablesResult.rows.length === 0) {
            console.log('1. Run: npm run db:setup');
            console.log('2. Run: npm run import:members');
            console.log('3. Run: npm run generate:embeddings');
        } else if (memberCount.rows[0].count === '0') {
            console.log('1. Run: npm run import:members');
            console.log('2. Run: npm run generate:embeddings');
        } else if (embeddingCount.rows[0].count === '0') {
            console.log('1. Run: npm run generate:embeddings');
        } else {
            console.log('✅ Setup is complete! Run: npm run dev');
        }
        console.log('');

    } catch (error) {
        console.error('❌ Connection failed!\n');
        console.error('Error:', error.message);
        console.error('');

        // Provide helpful troubleshooting
        console.log('🔧 Troubleshooting:');
        console.log('');

        if (error.message.includes('password authentication failed')) {
            console.log('❌ Password is incorrect');
            console.log('   - Double-check your database password');
            console.log('   - Make sure you replaced [YOUR-PASSWORD] in DATABASE_URL');
            console.log('   - Try resetting password in Supabase Dashboard');
        } else if (error.message.includes('ENOTFOUND') || error.message.includes('ETIMEDOUT')) {
            console.log('❌ Cannot reach database server');
            console.log('   - Check your internet connection');
            console.log('   - Verify the host URL is correct');
            console.log('   - Check if Supabase project is paused');
        } else if (error.message.includes('Connection terminated')) {
            console.log('❌ Connection was terminated');
            console.log('   - SSL might be required (should be auto-enabled)');
            console.log('   - Check firewall settings');
        } else {
            console.log('❌ Unknown error');
            console.log('   - Verify DATABASE_URL format is correct');
            console.log('   - See SUPABASE-SETUP.md for detailed help');
        }
        console.log('');

        process.exit(1);
    } finally {
        if (client) {
            client.release();
        }
        await pool.end();
    }
}

// Run test
testConnection().catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
});
