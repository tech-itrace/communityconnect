/**
 * Migration Script: Convert Single-Community Members to Multi-Community Structure
 * 
 * This script:
 * 1. Creates memberships for all existing members in the "main-community"
 * 2. Assumes all existing members are 'alumni' type (adjust if needed)
 * 3. Preserves existing member data
 * 4. Creates alumni_profiles for each member
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

interface Member {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    role?: string;
}

async function migrateMembersToMultiCommunity() {
    const client = await pool.connect();

    try {
        console.log('🚀 Starting member migration to multi-community structure...\n');

        // Step 1: Get the main community ID
        console.log('📍 Step 1: Finding main community...');
        const communityResult = await client.query(
            `SELECT id, name, slug FROM communities WHERE slug = 'main-community' LIMIT 1`
        );

        if (communityResult.rows.length === 0) {
            throw new Error('Main community not found. Please ensure a community with slug "main-community" exists.');
        }

        const mainCommunity = communityResult.rows[0];
        console.log(`✅ Found community: ${mainCommunity.name} (${mainCommunity.id})\n`);

        // Step 2: Get all existing members
        console.log('📍 Step 2: Fetching existing members...');
        const membersResult = await client.query<Member>(`
      SELECT id, name, phone, email 
      FROM members 
      ORDER BY name
    `);

        const members = membersResult.rows;
        console.log(`✅ Found ${members.length} members\n`);

        if (members.length === 0) {
            console.log('ℹ️  No members to migrate. Exiting.');
            return;
        }

        // Step 3: Check for existing memberships
        console.log('📍 Step 3: Checking existing memberships...');
        const existingMembershipsResult = await client.query(`
      SELECT COUNT(*) as count 
      FROM community_memberships 
      WHERE community_id = $1
    `, [mainCommunity.id]);

        const existingCount = parseInt(existingMembershipsResult.rows[0].count);
        console.log(`ℹ️  Found ${existingCount} existing memberships\n`);

        // Step 4: Begin transaction for data migration
        console.log('📍 Step 4: Creating memberships and profiles...');
        await client.query('BEGIN');

        let created = 0;
        let skipped = 0;
        let errors = 0;

        for (const member of members) {
            try {
                // Check if membership already exists
                const checkResult = await client.query(`
          SELECT id FROM community_memberships 
          WHERE community_id = $1 AND member_id = $2
        `, [mainCommunity.id, member.id]);

                if (checkResult.rows.length > 0) {
                    console.log(`⏭️  Skipped: ${member.name} (membership exists)`);
                    skipped++;
                    continue;
                }

                // Create membership
                const membershipResult = await client.query(`
          INSERT INTO community_memberships 
            (community_id, member_id, member_type, role, is_active, joined_at)
          VALUES ($1, $2, $3, $4, $5, NOW())
          RETURNING id
        `, [
                    mainCommunity.id,
                    member.id,
                    'alumni',  // Default to alumni type
                    'member',  // Default role
                    true
                ]);

                const membershipId = membershipResult.rows[0].id;

                // Create basic alumni profile (you may need to adjust fields based on your data)
                await client.query(`
          INSERT INTO alumni_profiles 
            (membership_id, college, graduation_year, degree, department)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (membership_id) DO NOTHING
        `, [
                    membershipId,
                    'Community College',  // Default value - update manually later
                    2020,                 // Default year - update manually later
                    'Bachelor',           // Default degree - update manually later
                    'General'            // Default department - update manually later
                ]);

                console.log(`✅ Created: ${member.name} → ${member.phone}`);
                created++;

            } catch (error) {
                console.error(`❌ Error migrating ${member.name}:`, error);
                errors++;
            }
        }

        await client.query('COMMIT');

        // Step 5: Summary
        console.log('\n' + '='.repeat(60));
        console.log('📊 Migration Summary:');
        console.log('='.repeat(60));
        console.log(`Total members:       ${members.length}`);
        console.log(`✅ Created:          ${created}`);
        console.log(`⏭️  Skipped:          ${skipped}`);
        console.log(`❌ Errors:           ${errors}`);
        console.log('='.repeat(60));

        // Step 6: Verify final state
        console.log('\n📍 Step 5: Verifying final state...');
        const finalResult = await client.query(`
      SELECT 
        COUNT(*) as total_memberships,
        COUNT(DISTINCT member_id) as unique_members
      FROM community_memberships 
      WHERE community_id = $1
    `, [mainCommunity.id]);

        const finalStats = finalResult.rows[0];
        console.log(`✅ Total memberships: ${finalStats.total_memberships}`);
        console.log(`✅ Unique members: ${finalStats.unique_members}\n`);

        if (errors === 0 && created > 0) {
            console.log('🎉 Migration completed successfully!');
            console.log('\n📝 Next steps:');
            console.log('1. Update alumni_profiles with actual data (college, graduation_year, etc.)');
            console.log('2. Run: npm run generate:contextual-embeddings');
            console.log('3. Test WhatsApp search: npm run test:whatsapp');
            console.log('4. Test dashboard functionality\n');
        } else if (errors > 0) {
            console.log('⚠️  Migration completed with errors. Please review the errors above.');
        } else {
            console.log('ℹ️  No new memberships created.');
        }

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Run migration
if (require.main === module) {
    migrateMembersToMultiCommunity()
        .then(() => {
            console.log('✅ Script completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Script failed:', error);
            process.exit(1);
        });
}

export { migrateMembersToMultiCommunity };
