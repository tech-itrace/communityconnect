/**
 * Script to:
 * 1. Promote user with phone 919943549835 to admin in main-community
 * 2. Rename main-community to 'ABC'
 */

import dotenv from 'dotenv';
import pool, { query } from '../config/db';

dotenv.config();

async function promoteAdminAndRename() {
    console.log('='.repeat(70));
    console.log('PROMOTE ADMIN & RENAME COMMUNITY');
    console.log('='.repeat(70));
    console.log();

    try {
        const phoneNumber = '919943549835';
        const newCommunityName = 'ABC';

        // Step 1: Find the member
        console.log(`📍 Step 1: Finding member with phone ${phoneNumber}...`);
        const memberResult = await query(`
            SELECT id, name, phone, email
            FROM members
            WHERE phone = $1
        `, [phoneNumber]);

        if (memberResult.rows.length === 0) {
            console.log(`❌ ERROR: No member found with phone ${phoneNumber}`);
            console.log('\nAvailable phone numbers in database:');
            const allPhones = await query(`
                SELECT name, phone FROM members ORDER BY name LIMIT 10
            `);
            allPhones.rows.forEach((m: any) => {
                console.log(`   - ${m.name}: ${m.phone}`);
            });
            return;
        }

        const member = memberResult.rows[0];
        console.log(`✅ Found member: ${member.name} (${member.phone})`);
        console.log(`   Email: ${member.email || 'N/A'}`);
        console.log();

        // Step 2: Find main-community
        console.log('📍 Step 2: Finding main-community...');
        const communityResult = await query(`
            SELECT id, name, slug
            FROM communities
            WHERE slug = 'main-community'
        `);

        if (communityResult.rows.length === 0) {
            console.log('❌ ERROR: main-community not found!');
            return;
        }

        const community = communityResult.rows[0];
        console.log(`✅ Found community: ${community.name} (${community.slug})`);
        console.log();

        // Step 3: Check if membership exists
        console.log('📍 Step 3: Checking membership...');
        const membershipResult = await query(`
            SELECT id, member_type, role, is_active
            FROM community_memberships
            WHERE member_id = $1 AND community_id = $2
        `, [member.id, community.id]);

        if (membershipResult.rows.length === 0) {
            console.log('⚠️  No membership found. Creating new membership with admin role...');

            await query(`
                INSERT INTO community_memberships
                (member_id, community_id, member_type, role, is_active)
                VALUES ($1, $2, 'generic', 'admin', TRUE)
            `, [member.id, community.id]);

            console.log('✅ Created new membership with admin role');
        } else {
            const membership = membershipResult.rows[0];
            console.log(`✅ Membership exists:`);
            console.log(`   - Current role: ${membership.role}`);
            console.log(`   - Member type: ${membership.member_type}`);
            console.log(`   - Active: ${membership.is_active}`);

            if (membership.role === 'admin') {
                console.log('ℹ️  User is already an admin!');
            } else {
                console.log('\n   Promoting to admin...');
                await query(`
                    UPDATE community_memberships
                    SET role = 'admin'
                    WHERE id = $1
                `, [membership.id]);
                console.log('✅ Promoted to admin!');
            }
        }
        console.log();

        // Step 4: Rename community
        console.log(`📍 Step 4: Renaming community to "${newCommunityName}"...`);
        await query(`
            UPDATE communities
            SET name = $1
            WHERE id = $2
        `, [newCommunityName, community.id]);
        console.log(`✅ Community renamed from "${community.name}" to "${newCommunityName}"`);
        console.log();

        // Step 5: Verify changes
        console.log('📍 Step 5: Verifying changes...');

        const verifyMembership = await query(`
            SELECT
                m.name as member_name,
                m.phone,
                c.name as community_name,
                c.slug,
                cm.role,
                cm.member_type
            FROM community_memberships cm
            JOIN members m ON cm.member_id = m.id
            JOIN communities c ON cm.community_id = c.id
            WHERE m.phone = $1 AND c.slug = 'main-community'
        `, [phoneNumber]);

        if (verifyMembership.rows.length > 0) {
            const v = verifyMembership.rows[0];
            console.log('✅ Verification successful:');
            console.log(`   - Member: ${v.member_name} (${v.phone})`);
            console.log(`   - Community: ${v.community_name} (${v.slug})`);
            console.log(`   - Role: ${v.role}`);
            console.log(`   - Type: ${v.member_type}`);
        }
        console.log();

        // Step 6: Show all admins in the community
        console.log('📍 Step 6: All admins in ABC community:');
        const allAdmins = await query(`
            SELECT
                m.name,
                m.phone,
                m.email,
                cm.role
            FROM community_memberships cm
            JOIN members m ON cm.member_id = m.id
            JOIN communities c ON cm.community_id = c.id
            WHERE c.slug = 'main-community' AND cm.role IN ('admin', 'super_admin')
            ORDER BY cm.role DESC, m.name
        `);

        if (allAdmins.rows.length === 0) {
            console.log('⚠️  No admins found (this should not happen!)');
        } else {
            console.log(`✅ Found ${allAdmins.rows.length} admin(s):\n`);
            allAdmins.rows.forEach((admin: any, idx: number) => {
                console.log(`   ${idx + 1}. ${admin.name} (${admin.role.toUpperCase()})`);
                console.log(`      - Phone: ${admin.phone}`);
                console.log(`      - Email: ${admin.email || 'N/A'}`);
                console.log();
            });
        }

        console.log('='.repeat(70));
        console.log('✅ ALL OPERATIONS COMPLETED SUCCESSFULLY!');
        console.log('='.repeat(70));

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

// Run the script
promoteAdminAndRename()
    .then(() => {
        console.log('\nScript completed.');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\nScript failed:', error);
        process.exit(1);
    });
