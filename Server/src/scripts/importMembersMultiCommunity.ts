import dotenv from 'dotenv';
import { parse } from 'csv-parse';
import * as fs from 'fs';
import * as path from 'path';
import pool, { query } from '../config/db';

// Load environment variables
dotenv.config();

interface CSVRow {
    Name: string;
    'Year of Graduation': string;
    Degree: string;
    Branch: string;
    'Working Knowledge': string;
    Email: string;
    'Phone number': string;
    Address: string;
    'City / Town of Living': string;
    'Organization Name:': string;
    'Designation:': string;
}

interface MemberData {
    name: string;
    email: string | null;
    phone: string | null;
    yearOfGraduation: number | null;
    degree: string | null;
    branch: string | null;
    skills: string | null;
    address: string | null;
    city: string | null;
    organizationName: string | null;
    designation: string | null;
}

function normalizePhone(phone: string | null): string | null {
    if (!phone) return null;

    // Remove all non-numeric characters
    const cleaned = phone.replace(/\D/g, '');

    // If it starts with 91, return as is
    // If it's 10 digits, prepend 91
    // Otherwise return as is
    if (cleaned.startsWith('91') && cleaned.length > 10) {
        return cleaned;
    } else if (cleaned.length === 10) {
        return '91' + cleaned;
    }
    return cleaned || null;
}

function parseCSVRow(row: CSVRow): MemberData | null {
    // Skip empty rows
    if (!row.Name || row.Name.trim() === '') {
        return null;
    }

    // Clean and parse data
    const name = row.Name.trim();
    const yearStr = row['Year of Graduation']?.trim();
    const yearOfGraduation = yearStr && !isNaN(parseInt(yearStr)) ? parseInt(yearStr) : null;

    // Parse phone
    const rawPhone = row['Phone number']?.trim();
    const phone = normalizePhone(rawPhone);

    return {
        name,
        email: row.Email?.trim() || null,
        phone,
        yearOfGraduation,
        degree: row.Degree?.trim() || null,
        branch: row.Branch?.trim() || null,
        skills: row['Working Knowledge']?.trim() || null, // Map Working Knowledge to skills
        address: row.Address?.trim() || null,
        city: row['City / Town of Living']?.trim() || null,
        organizationName: row['Organization Name:']?.trim() || null,
        designation: row['Designation:']?.trim() || null,
    };
}

async function importMembersMultiCommunity() {
    console.log('[Import] Starting multi-community member import...');

    const csvFilePath = path.join(__dirname, '../../data/CommunityMemberDetails.csv');

    if (!fs.existsSync(csvFilePath)) {
        console.error(`[Import] ❌ CSV file not found at: ${csvFilePath}`);
        process.exit(1);
    }

    console.log(`[Import] Reading CSV from: ${csvFilePath}`);

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

    console.log(`[Import] Parsed ${membersData.length} members from CSV`);

    try {
        // Get the main-community ID
        console.log('[Import] Getting main-community ID...');
        const communityResult = await query(
            `SELECT id FROM communities WHERE slug = $1`,
            ['main-community']
        );

        if (communityResult.rows.length === 0) {
            console.error('[Import] ❌ main-community not found. Please create it first.');
            process.exit(1);
        }

        const communityId = communityResult.rows[0].id;
        console.log(`[Import] Using community: ${communityId}`);

        // Import members with transaction
        console.log('[Import] Starting database transaction...');
        await query('BEGIN');

        let insertedCount = 0;
        let skippedCount = 0;

        for (const memberData of membersData) {
            try {
                // 1. Insert into members table
                const memberResult = await query(
                    `INSERT INTO members (name, email, phone, is_active)
                     VALUES ($1, $2, $3, TRUE)
                     RETURNING id`,
                    [memberData.name, memberData.email, memberData.phone]
                );

                const memberId = memberResult.rows[0].id;

                // 2. Create community membership (default: alumni type)
                const membershipResult = await query(
                    `INSERT INTO community_memberships 
                     (member_id, community_id, member_type, is_active)
                     VALUES ($1, $2, $3, TRUE)
                     RETURNING id`,
                    [memberId, communityId, 'alumni']
                );

                const membershipId = membershipResult.rows[0].id;

                // 3. Create alumni profile with all the data
                // Note: skills is TEXT[] array in DB, so we need to parse it
                const skillsArray = memberData.skills ? [memberData.skills] : null;

                // Default college - appears to be PSG based on community context
                const college = 'PSG College of Technology';

                await query(
                    `INSERT INTO alumni_profiles 
                     (membership_id, college, graduation_year, degree, department, skills, 
                      current_organization, designation, city)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                    [
                        membershipId,
                        college,
                        memberData.yearOfGraduation,
                        memberData.degree,
                        memberData.branch, // Maps to department
                        skillsArray,  // Array format for TEXT[]
                        memberData.organizationName,
                        memberData.designation,
                        memberData.city
                    ]
                );

                insertedCount++;

                if (insertedCount % 10 === 0) {
                    console.log(`[Import] Inserted ${insertedCount}/${membersData.length} members...`);
                }
            } catch (error: any) {
                console.error(`[Import] Error inserting member ${memberData.name}:`, error.message);
                skippedCount++;
            }
        }

        await query('COMMIT');
        console.log(`\n[Import] ✅ Successfully imported ${insertedCount} members!`);
        if (skippedCount > 0) {
            console.log(`[Import] ⚠️  Skipped ${skippedCount} members due to errors`);
        }

        // Show statistics
        console.log('\n[Import] Database statistics:');

        const memberStats = await query(`
            SELECT 
                COUNT(*) as total_members,
                COUNT(DISTINCT email) FILTER (WHERE email IS NOT NULL) as unique_emails,
                COUNT(*) FILTER (WHERE phone IS NOT NULL) as members_with_phone
            FROM members
        `);

        const membershipStats = await query(`
            SELECT 
                COUNT(*) as total_memberships,
                member_type,
                COUNT(*) as count
            FROM community_memberships
            GROUP BY member_type
        `);

        const alumniStats = await query(`
            SELECT 
                COUNT(*) as total_alumni,
                COUNT(DISTINCT city) FILTER (WHERE city IS NOT NULL) as unique_cities,
                COUNT(DISTINCT degree) FILTER (WHERE degree IS NOT NULL) as unique_degrees,
                COUNT(*) FILTER (WHERE skills IS NOT NULL AND array_length(skills, 1) > 0) as with_skills,
                COUNT(*) FILTER (WHERE current_organization IS NOT NULL AND current_organization != '') as with_company
            FROM alumni_profiles
        `);

        console.log(`  Members:`);
        console.log(`    - Total: ${memberStats.rows[0].total_members}`);
        console.log(`    - With email: ${memberStats.rows[0].unique_emails}`);
        console.log(`    - With phone: ${memberStats.rows[0].members_with_phone}`);

        console.log(`  Memberships:`);
        membershipStats.rows.forEach((row: any) => {
            console.log(`    - ${row.member_type}: ${row.count}`);
        });

        console.log(`  Alumni Profiles:`);
        console.log(`    - Total: ${alumniStats.rows[0].total_alumni}`);
        console.log(`    - Unique cities: ${alumniStats.rows[0].unique_cities}`);
        console.log(`    - Unique degrees: ${alumniStats.rows[0].unique_degrees}`);
        console.log(`    - With skills: ${alumniStats.rows[0].with_skills}`);
        console.log(`    - With company: ${alumniStats.rows[0].with_company}`);

        // Show top cities
        const citiesResult = await query(`
            SELECT ap.city, COUNT(*) as count 
            FROM alumni_profiles ap
            WHERE ap.city IS NOT NULL AND ap.city != ''
            GROUP BY ap.city 
            ORDER BY count DESC 
            LIMIT 5
        `);

        console.log('  Top cities:');
        citiesResult.rows.forEach((row: any) => {
            console.log(`    - ${row.city}: ${row.count} members`);
        });

        // Show top skills
        const skillsResult = await query(`
            SELECT unnest(skills) as skill, COUNT(*) as count 
            FROM alumni_profiles
            WHERE skills IS NOT NULL AND array_length(skills, 1) > 0
            GROUP BY skill 
            ORDER BY count DESC 
            LIMIT 10
        `);

        console.log('  Top skills/domains:');
        skillsResult.rows.forEach((row: any) => {
            const shortSkill = row.skill.substring(0, 60) + (row.skill.length > 60 ? '...' : '');
            console.log(`    - ${shortSkill}: ${row.count}`);
        });

    } catch (error) {
        await query('ROLLBACK');
        console.error('[Import] ❌ Error importing members:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

// Run import
importMembersMultiCommunity()
    .then(() => {
        console.log('[Import] Exiting...');
        process.exit(0);
    })
    .catch((error) => {
        console.error('[Import] Fatal error:', error);
        process.exit(1);
    });
