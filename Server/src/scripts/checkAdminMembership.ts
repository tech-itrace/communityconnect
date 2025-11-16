import dotenv from 'dotenv';
import pool, { query } from '../config/db';

dotenv.config();

async function checkAdminMembership() {
    try {
        console.log('Checking admin user membership...\n');

        // Find the admin user
        const adminPhone = '919840061561';

        const result = await query(`
            SELECT
                m.id as member_id,
                m.name,
                m.phone,
                m.email,
                c.id as community_id,
                c.name as community_name,
                c.slug as community_slug,
                cm.member_type,
                cm.role,
                cm.is_active
            FROM members m
            JOIN community_memberships cm ON m.id = cm.member_id
            JOIN communities c ON cm.community_id = c.id
            WHERE m.phone = $1
            ORDER BY m.created_at
        `, [adminPhone]);

        if (result.rows.length === 0) {
            console.log(`No memberships found for phone: ${adminPhone}`);
        } else {
            console.log(`Found ${result.rows.length} membership(s) for ${adminPhone}:\n`);
            result.rows.forEach((row: any, idx: number) => {
                console.log(`${idx + 1}. Community: ${row.community_name} (${row.community_slug})`);
                console.log(`   - Member Type: ${row.member_type}`);
                console.log(`   - Role: ${row.role}`);
                console.log(`   - Active: ${row.is_active}`);
                console.log(`   - Community ID: ${row.community_id}`);
                console.log();
            });
        }

        // Check all members in main-community
        console.log('\n' + '='.repeat(70));
        console.log('ALL MEMBERS IN MAIN-COMMUNITY:');
        console.log('='.repeat(70) + '\n');

        const mainCommunityMembers = await query(`
            SELECT
                m.name,
                m.phone,
                cm.member_type,
                cm.role,
                c.name as community_name
            FROM community_memberships cm
            JOIN members m ON cm.member_id = m.id
            JOIN communities c ON cm.community_id = c.id
            WHERE c.slug = 'main-community'
            ORDER BY cm.role DESC, m.name
            LIMIT 10
        `);

        console.log(`Total in main-community: ${mainCommunityMembers.rows.length}`);
        mainCommunityMembers.rows.forEach((row: any, idx: number) => {
            console.log(`${idx + 1}. ${row.name} - ${row.phone} (${row.role})`);
        });

        // Check IIT Delhi Alumni Network
        console.log('\n' + '='.repeat(70));
        console.log('ALL MEMBERS IN IIT-DELHI-ALUMNI:');
        console.log('='.repeat(70) + '\n');

        const iitMembers = await query(`
            SELECT
                m.name,
                m.phone,
                cm.member_type,
                cm.role,
                c.name as community_name
            FROM community_memberships cm
            JOIN members m ON cm.member_id = m.id
            JOIN communities c ON cm.community_id = c.id
            WHERE c.slug = 'iit-delhi-alumni'
            ORDER BY cm.role DESC, m.name
        `);

        console.log(`Total in iit-delhi-alumni: ${iitMembers.rows.length}`);
        iitMembers.rows.forEach((row: any, idx: number) => {
            console.log(`${idx + 1}. ${row.name} - ${row.phone} (${row.role})`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

checkAdminMembership();
