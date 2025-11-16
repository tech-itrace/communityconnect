import dotenv from 'dotenv';
import pool, { query } from '../config/db';

dotenv.config();

async function showFinalState() {
    try {
        console.log('='.repeat(70));
        console.log('FINAL STATE SUMMARY');
        console.log('='.repeat(70));
        console.log();

        // Communities
        console.log('📊 COMMUNITIES:');
        const communities = await query(`
            SELECT name, slug, type, is_bot_enabled
            FROM communities
            ORDER BY name
        `);

        communities.rows.forEach((c: any) => {
            console.log(`   - ${c.name} (${c.slug})`);
            console.log(`     Type: ${c.type}, Bot: ${c.is_bot_enabled ? 'Enabled' : 'Disabled'}`);
        });
        console.log();

        // Admins
        console.log('📊 ALL ADMINS:');
        const admins = await query(`
            SELECT
                m.name,
                m.phone,
                m.email,
                c.name as community_name,
                cm.role
            FROM community_memberships cm
            JOIN members m ON cm.member_id = m.id
            JOIN communities c ON cm.community_id = c.id
            WHERE cm.role IN ('admin', 'super_admin')
            ORDER BY c.name, cm.role DESC
        `);

        admins.rows.forEach((a: any) => {
            console.log(`   - ${a.name} (${a.role.toUpperCase()})`);
            console.log(`     Community: ${a.community_name}`);
            console.log(`     Phone: ${a.phone}, Email: ${a.email || 'N/A'}`);
            console.log();
        });

        console.log('='.repeat(70));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

showFinalState();
