/**
 * Import Members Script - Lean Schema Version
 * 
 * This script imports members using the JSONB profile_data structure
 * for the lean schema (8 tables instead of 12).
 * 
 * Usage: npm run import:members:lean
 */

import dotenv from 'dotenv';
import { parse } from 'csv-parse';
import * as fs from 'fs';
import * as path from 'path';
import pool, { query } from '../config/db';

dotenv.config();

interface CSVRow {
    Name: string;
    'Year of Graduation'?: string;
    Degree?: string;
    Branch?: string;
    'Working Knowledge'?: string;
    Email?: string;
    'Phone number'?: string;
    Address?: string;
    'City / Town of Living'?: string;
    'Organization Name:'?: string;
    'Designation:'?: string;
    // Entrepreneur fields
    Company?: string;
    Industry?: string;
    'Company Stage'?: string;
    'Services Offered'?: string;
    // Resident fields
    'Apartment Number'?: string;
    Building?: string;
    Profession?: string;
}

interface MemberData {
    name: string;
    email: string | null;
    phone: string | null;
    memberType: 'alumni' | 'entrepreneur' | 'resident' | 'generic';
    profileData: any;
}

function normalizePhone(phone: string | null): string | null {
    if (!phone) return null;
    const cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.startsWith('91') && cleaned.length > 10) {
        return '+' + cleaned;
    } else if (cleaned.length === 10) {
        return '+91' + cleaned;
    }
    return cleaned ? '+' + cleaned : null;
}

function detectMemberType(row: CSVRow): 'alumni' | 'entrepreneur' | 'resident' | 'generic' {
    // Alumni: has graduation year or degree
    if (row['Year of Graduation'] || row.Degree) {
        return 'alumni';
    }
    
    // Entrepreneur: has company or industry
    if (row.Company || row.Industry) {
        return 'entrepreneur';
    }
    
    // Resident: has apartment number or building
    if (row['Apartment Number'] || row.Building) {
        return 'resident';
    }
    
    return 'generic';
}

function buildAlumniProfile(row: CSVRow): any {
    const skills = row['Working Knowledge']?.split(',').map(s => s.trim()).filter(s => s) || [];
    
    return {
        college: 'PSG College of Technology', // Default - can be made configurable
        graduation_year: row['Year of Graduation'] ? parseInt(row['Year of Graduation']) : null,
        degree: row.Degree || null,
        department: row.Branch || null,
        current_organization: row['Organization Name:'] || null,
        designation: row['Designation:'] || null,
        city: row['City / Town of Living'] || null,
        skills: skills.length > 0 ? skills : null
    };
}

function buildEntrepreneurProfile(row: CSVRow): any {
    const servicesOffered = row['Services Offered']?.split(',').map(s => s.trim()).filter(s => s) || [];
    
    return {
        company: row.Company || null,
        industry: row.Industry || null,
        company_stage: row['Company Stage'] || null,
        services_offered: servicesOffered.length > 0 ? servicesOffered : null,
        city: row['City / Town of Living'] || null
    };
}

function buildResidentProfile(row: CSVRow): any {
    return {
        apartment_number: row['Apartment Number'] || null,
        building: row.Building || null,
        profession: row.Profession || null,
        organization: row['Organization Name:'] || null,
        city: row['City / Town of Living'] || null
    };
}

function parseCSVRow(row: CSVRow): MemberData | null {
    if (!row.Name || row.Name.trim() === '') {
        return null;
    }

    const memberType = detectMemberType(row);
    let profileData: any = {};

    switch (memberType) {
        case 'alumni':
            profileData = buildAlumniProfile(row);
            break;
        case 'entrepreneur':
            profileData = buildEntrepreneurProfile(row);
            break;
        case 'resident':
            profileData = buildResidentProfile(row);
            break;
        default:
            profileData = { city: row['City / Town of Living'] || null };
    }

    return {
        name: row.Name.trim(),
        email: row.Email?.trim() || null,
        phone: normalizePhone(row['Phone number']?.trim() || null),
        memberType,
        profileData
    };
}

async function importMembersLeanSchema() {
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║     Import Members - Lean Schema (JSONB Profiles)        ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log('');

    const csvFilePath = path.join(__dirname, '../../data/CommunityMemberDetails.csv');

    if (!fs.existsSync(csvFilePath)) {
        console.error(`❌ CSV file not found at: ${csvFilePath}`);
        console.error('   Please ensure the CSV file exists at this location.');
        process.exit(1);
    }

    console.log(`📄 Reading CSV from: ${csvFilePath}`);

    const membersData: MemberData[] = [];
    const parser = fs
        .createReadStream(csvFilePath)
        .pipe(parse({
            columns: true,
            skip_empty_lines: true,
            trim: true,
        }));

    for await (const row of parser) {
        const member = parseCSVRow(row as CSVRow);
        if (member) {
            membersData.push(member);
        }
    }

    console.log(`✅ Parsed ${membersData.length} members from CSV`);
    
    // Show type distribution
    const typeCount = membersData.reduce((acc, m) => {
        acc[m.memberType] = (acc[m.memberType] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    
    console.log('📊 Member types detected:');
    Object.entries(typeCount).forEach(([type, count]) => {
        console.log(`   - ${type}: ${count}`);
    });
    console.log('');

    try {
        // Get community ID
        console.log('🔍 Getting community ID...');
        const communityResult = await query(
            `SELECT id, name, type FROM communities WHERE slug = $1`,
            ['main-community']
        );

        if (communityResult.rows.length === 0) {
            console.error('❌ Community not found: main-community');
            console.error('   Please create a community first:');
            console.error(`   INSERT INTO communities (name, slug, type) VALUES ('Main Community', 'main-community', 'mixed');`);
            process.exit(1);
        }

        const community = communityResult.rows[0];
        console.log(`✅ Using community: ${community.name} (${community.type})`);
        console.log('');

        // Start transaction
        console.log('💾 Starting database transaction...');
        await query('BEGIN');

        let insertedCount = 0;
        let skippedCount = 0;
        const errors: string[] = [];

        for (const memberData of membersData) {
            try {
                // 1. Insert or get member
                const memberResult = await query(
                    `INSERT INTO members (name, email, phone, is_active)
                     VALUES ($1, $2, $3, TRUE)
                     ON CONFLICT (phone) DO UPDATE 
                     SET name = EXCLUDED.name, email = EXCLUDED.email
                     RETURNING id`,
                    [memberData.name, memberData.email, memberData.phone]
                );

                const memberId = memberResult.rows[0].id;

                // 2. Insert community membership WITH JSONB profile_data
                await query(
                    `INSERT INTO community_memberships 
                     (member_id, community_id, member_type, profile_data, is_active)
                     VALUES ($1, $2, $3, $4::jsonb, TRUE)
                     ON CONFLICT (community_id, member_id) 
                     DO UPDATE SET 
                        member_type = EXCLUDED.member_type,
                        profile_data = EXCLUDED.profile_data,
                        updated_at = now()`,
                    [memberId, community.id, memberData.memberType, JSON.stringify(memberData.profileData)]
                );

                insertedCount++;

                if (insertedCount % 10 === 0) {
                    console.log(`   Processed ${insertedCount}/${membersData.length} members...`);
                }

            } catch (error: any) {
                console.error(`   ⚠️  Error with ${memberData.name}: ${error.message}`);
                errors.push(`${memberData.name}: ${error.message}`);
                skippedCount++;
            }
        }

        await query('COMMIT');
        
        console.log('');
        console.log('╔═══════════════════════════════════════════════════════════╗');
        console.log('║                  IMPORT COMPLETE                          ║');
        console.log('╚═══════════════════════════════════════════════════════════╝');
        console.log('');
        console.log(`✅ Successfully imported: ${insertedCount} members`);
        if (skippedCount > 0) {
            console.log(`⚠️  Skipped: ${skippedCount} members`);
        }
        console.log('');

        // Statistics
        console.log('📊 Database Statistics:');
        console.log('');

        const memberStats = await query(`
            SELECT 
                COUNT(*) as total_members,
                COUNT(*) FILTER (WHERE email IS NOT NULL) as with_email,
                COUNT(*) FILTER (WHERE phone IS NOT NULL) as with_phone
            FROM members
        `);

        const membershipStats = await query(`
            SELECT 
                member_type,
                COUNT(*) as count,
                COUNT(*) FILTER (WHERE profile_data != '{}'::jsonb) as with_profile_data
            FROM community_memberships
            WHERE community_id = $1
            GROUP BY member_type
            ORDER BY count DESC
        `, [community.id]);

        console.log('Members Table:');
        console.log(`  Total: ${memberStats.rows[0].total_members}`);
        console.log(`  With Email: ${memberStats.rows[0].with_email}`);
        console.log(`  With Phone: ${memberStats.rows[0].with_phone}`);
        console.log('');

        console.log('Community Memberships:');
        membershipStats.rows.forEach((row: any) => {
            console.log(`  ${row.member_type}: ${row.count} (${row.with_profile_data} with profile data)`);
        });
        console.log('');

        // Sample JSONB data
        const sampleResult = await query(`
            SELECT 
                m.name,
                cm.member_type,
                cm.profile_data
            FROM members m
            JOIN community_memberships cm ON m.id = cm.member_id
            WHERE cm.community_id = $1
            AND cm.profile_data != '{}'::jsonb
            LIMIT 3
        `, [community.id]);

        if (sampleResult.rows.length > 0) {
            console.log('📝 Sample Profile Data (JSONB):');
            sampleResult.rows.forEach((row: any) => {
                console.log(`  ${row.name} (${row.member_type}):`);
                console.log(`    ${JSON.stringify(row.profile_data, null, 2).split('\n').join('\n    ')}`);
            });
            console.log('');
        }

        console.log('✅ Next Steps:');
        console.log('   1. Generate embeddings: npm run generate:embeddings:lean');
        console.log('   2. Start server: npm run dev');
        console.log('   3. Test search: npm run test:whatsapp');
        console.log('');

    } catch (error: any) {
        await query('ROLLBACK');
        console.error('');
        console.error('❌ Import failed:', error.message);
        console.error('   Transaction rolled back. No data was imported.');
        throw error;
    } finally {
        await pool.end();
    }
}

// Run import
importMembersLeanSchema()
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
