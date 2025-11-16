/**
 * Verification Script: Check Data Import Status
 *
 * This script verifies that data has been properly imported into:
 * 1. communities table
 * 2. members table
 * 3. community_memberships table
 * 4. Type-specific profile tables (alumni_profiles, etc.)
 * 5. community_admins table (if any admins exist)
 */

import dotenv from 'dotenv';
import pool, { query } from '../config/db';

// Load environment variables
dotenv.config();

interface TableStats {
    table_name: string;
    row_count: number;
}

interface CommunityInfo {
    id: string;
    name: string;
    slug: string;
    type: string;
    is_bot_enabled: boolean;
}

interface MembershipStats {
    member_type: string;
    role: string;
    count: number;
}

async function verifyDataImport() {
    console.log('='.repeat(70));
    console.log('DATA IMPORT VERIFICATION REPORT');
    console.log('='.repeat(70));
    console.log();

    try {
        // 1. Check Communities
        console.log('📊 1. COMMUNITIES');
        console.log('-'.repeat(70));

        const communitiesResult = await query(`
            SELECT id, name, slug, type, is_bot_enabled
            FROM communities
            ORDER BY created_at
        `);

        if (communitiesResult.rows.length === 0) {
            console.log('❌ No communities found!');
            console.log('   Action: Create a community first using the dashboard or SQL');
        } else {
            console.log(`✅ Found ${communitiesResult.rows.length} community/communities:\n`);
            communitiesResult.rows.forEach((comm, idx) => {
                console.log(`   ${idx + 1}. ${comm.name} (${comm.slug})`);
                console.log(`      - Type: ${comm.type}`);
                console.log(`      - Bot Enabled: ${comm.is_bot_enabled ? 'Yes' : 'No'}`);
                console.log(`      - ID: ${comm.id}`);
                console.log();
            });
        }

        // 2. Check Members
        console.log('📊 2. MEMBERS');
        console.log('-'.repeat(70));

        const memberStats = await query(`
            SELECT
                COUNT(*) as total_members,
                COUNT(DISTINCT email) FILTER (WHERE email IS NOT NULL) as unique_emails,
                COUNT(*) FILTER (WHERE phone IS NOT NULL) as members_with_phone,
                COUNT(*) FILTER (WHERE is_active = TRUE) as active_members
            FROM members
        `);

        const totalMembers = parseInt(memberStats.rows[0].total_members);

        if (totalMembers === 0) {
            console.log('❌ No members found!');
            console.log('   Action: Run import script:');
            console.log('   npm run import:members');
        } else {
            console.log(`✅ Found ${totalMembers} members:\n`);
            console.log(`   - Active members: ${memberStats.rows[0].active_members}`);
            console.log(`   - With email: ${memberStats.rows[0].unique_emails}`);
            console.log(`   - With phone: ${memberStats.rows[0].members_with_phone}`);

            // Sample members
            const sampleMembers = await query(`
                SELECT name, phone, email
                FROM members
                ORDER BY created_at
                LIMIT 3
            `);

            console.log('\n   Sample members:');
            sampleMembers.rows.forEach((m: any, idx: number) => {
                console.log(`   ${idx + 1}. ${m.name} - ${m.phone || 'no phone'} - ${m.email || 'no email'}`);
            });
        }
        console.log();

        // 3. Check Community Memberships
        console.log('📊 3. COMMUNITY MEMBERSHIPS');
        console.log('-'.repeat(70));

        const membershipResult = await query(`
            SELECT COUNT(*) as total_memberships
            FROM community_memberships
        `);

        const totalMemberships = parseInt(membershipResult.rows[0].total_memberships);

        if (totalMemberships === 0) {
            console.log('❌ No community memberships found!');
            console.log('   Action: Run migration script:');
            console.log('   npm run migrate:memberships');
        } else {
            console.log(`✅ Found ${totalMemberships} memberships:\n`);

            // Breakdown by type and role
            const breakdown = await query(`
                SELECT
                    member_type,
                    role,
                    COUNT(*) as count
                FROM community_memberships
                GROUP BY member_type, role
                ORDER BY member_type, role
            `);

            console.log('   Breakdown by type and role:');
            breakdown.rows.forEach((stat) => {
                console.log(`   - ${stat.member_type} (${stat.role}): ${stat.count}`);
            });

            // By community
            const byCommunity = await query(`
                SELECT
                    c.name as community_name,
                    COUNT(cm.id) as member_count
                FROM communities c
                LEFT JOIN community_memberships cm ON c.id = cm.community_id
                GROUP BY c.id, c.name
            `);

            console.log('\n   Members by community:');
            byCommunity.rows.forEach((stat: any) => {
                console.log(`   - ${stat.community_name}: ${stat.member_count} members`);
            });
        }
        console.log();

        // 4. Check Type-Specific Profiles
        console.log('📊 4. TYPE-SPECIFIC PROFILES');
        console.log('-'.repeat(70));

        // Alumni profiles
        const alumniStats = await query(`
            SELECT
                COUNT(*) as total_alumni,
                COUNT(DISTINCT college) FILTER (WHERE college IS NOT NULL) as unique_colleges,
                COUNT(DISTINCT graduation_year) FILTER (WHERE graduation_year IS NOT NULL) as unique_years,
                COUNT(*) FILTER (WHERE skills IS NOT NULL AND array_length(skills, 1) > 0) as with_skills,
                COUNT(*) FILTER (WHERE current_organization IS NOT NULL) as with_company
            FROM alumni_profiles
        `);

        const totalAlumni = parseInt(alumniStats.rows[0].total_alumni);

        if (totalAlumni > 0) {
            console.log(`✅ Alumni Profiles: ${totalAlumni}`);
            console.log(`   - Unique colleges: ${alumniStats.rows[0].unique_colleges}`);
            console.log(`   - Unique graduation years: ${alumniStats.rows[0].unique_years}`);
            console.log(`   - With skills: ${alumniStats.rows[0].with_skills}`);
            console.log(`   - With company: ${alumniStats.rows[0].with_company}`);
        } else {
            console.log('ℹ️  No alumni profiles found');
        }

        // Entrepreneur profiles
        const entrepreneurStats = await query(`
            SELECT COUNT(*) as count FROM entrepreneur_profiles
        `);
        if (parseInt(entrepreneurStats.rows[0].count) > 0) {
            console.log(`✅ Entrepreneur Profiles: ${entrepreneurStats.rows[0].count}`);
        }

        // Resident profiles
        const residentStats = await query(`
            SELECT COUNT(*) as count FROM resident_profiles
        `);
        if (parseInt(residentStats.rows[0].count) > 0) {
            console.log(`✅ Resident Profiles: ${residentStats.rows[0].count}`);
        }

        console.log();

        // 5. Check Community Admins
        console.log('📊 5. COMMUNITY ADMINS');
        console.log('-'.repeat(70));

        const adminStats = await query(`
            SELECT COUNT(*) as admin_count
            FROM community_memberships
            WHERE role IN ('admin', 'super_admin')
        `);

        const adminCount = parseInt(adminStats.rows[0].admin_count);

        if (adminCount === 0) {
            console.log('⚠️  No admins found!');
            console.log('   Action: Promote members to admin role:');
            console.log('   UPDATE community_memberships');
            console.log("   SET role = 'admin'");
            console.log("   WHERE member_id = (SELECT id FROM members WHERE phone = 'PHONE_NUMBER');");
        } else {
            console.log(`✅ Found ${adminCount} admin(s):\n`);

            const adminDetails = await query(`
                SELECT
                    m.name,
                    m.phone,
                    m.email,
                    cm.role,
                    c.name as community_name
                FROM community_memberships cm
                JOIN members m ON cm.member_id = m.id
                JOIN communities c ON cm.community_id = c.id
                WHERE cm.role IN ('admin', 'super_admin')
                ORDER BY cm.role DESC, m.name
            `);

            adminDetails.rows.forEach((admin: any, idx: number) => {
                console.log(`   ${idx + 1}. ${admin.name} (${admin.role.toUpperCase()})`);
                console.log(`      - Phone: ${admin.phone || 'N/A'}`);
                console.log(`      - Email: ${admin.email || 'N/A'}`);
                console.log(`      - Community: ${admin.community_name}`);
                console.log();
            });
        }

        // 6. Check Embeddings (if any)
        console.log('📊 6. EMBEDDINGS (for AI Search)');
        console.log('-'.repeat(70));

        const embeddingStats = await query(`
            SELECT
                COUNT(*) as total_embeddings,
                COUNT(*) FILTER (WHERE profile_embedding IS NOT NULL) as with_profile,
                COUNT(*) FILTER (WHERE skills_embedding IS NOT NULL) as with_skills,
                COUNT(*) FILTER (WHERE contextual_embedding IS NOT NULL) as with_contextual
            FROM member_embeddings
        `);

        const totalEmbeddings = parseInt(embeddingStats.rows[0].total_embeddings);

        if (totalEmbeddings === 0) {
            console.log('⚠️  No embeddings found!');
            console.log('   Action: Generate embeddings for AI search:');
            console.log('   npm run generate:embeddings');
        } else {
            console.log(`✅ Found ${totalEmbeddings} embedding records:\n`);
            console.log(`   - With profile embedding: ${embeddingStats.rows[0].with_profile}`);
            console.log(`   - With skills embedding: ${embeddingStats.rows[0].with_skills}`);
            console.log(`   - With contextual embedding: ${embeddingStats.rows[0].with_contextual}`);
        }
        console.log();

        // 7. Overall Status Summary
        console.log('='.repeat(70));
        console.log('📋 OVERALL STATUS SUMMARY');
        console.log('='.repeat(70));

        const hasData = communitiesResult.rows.length > 0 && totalMembers > 0 && totalMemberships > 0;

        if (hasData) {
            console.log('✅ Data import appears SUCCESSFUL!');
            console.log();
            console.log('Next steps:');
            if (adminCount === 0) {
                console.log('  1. ⚠️  Create admin users (see section 5 above)');
            }
            if (totalEmbeddings === 0) {
                console.log('  2. ⚠️  Generate embeddings for AI search');
            }
            if (hasData && adminCount > 0 && totalEmbeddings > 0) {
                console.log('  ✅ All systems ready! You can start using the application.');
            }
        } else {
            console.log('❌ Data import INCOMPLETE!');
            console.log();
            console.log('Required actions:');
            if (communitiesResult.rows.length === 0) {
                console.log('  1. Create a community');
            }
            if (totalMembers === 0) {
                console.log('  2. Run: npm run import:members');
            }
            if (totalMemberships === 0) {
                console.log('  3. Run: npm run migrate:memberships');
            }
        }

        console.log();
        console.log('='.repeat(70));

    } catch (error) {
        console.error('❌ Error during verification:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

// Run verification
verifyDataImport()
    .then(() => {
        console.log('Verification complete.');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Verification failed:', error);
        process.exit(1);
    });
