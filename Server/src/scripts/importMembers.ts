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
    'Annual Turnover': string;
}

interface Member {
    name: string;
    yearOfGraduation: number | null;
    degree: string | null;
    branch: string | null;
    workingKnowledge: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    organizationName: string | null;
    designation: string | null;
    annualTurnover: string | null;
}

function parseCSVRow(row: CSVRow): Member | null {
    // Skip empty rows
    if (!row.Name || row.Name.trim() === '') {
        return null;
    }

    // Clean and parse data
    const name = row.Name.trim();
    const yearStr = row['Year of Graduation']?.trim();
    const yearOfGraduation = yearStr && !isNaN(parseInt(yearStr)) ? parseInt(yearStr) : null;

    return {
        name,
        yearOfGraduation,
        degree: row.Degree?.trim() || null,
        branch: row.Branch?.trim() || null,
        workingKnowledge: row['Working Knowledge']?.trim() || null,
        email: row.Email?.trim() || null,
        phone: row['Phone number']?.trim() || null,
        address: row.Address?.trim() || null,
        city: row['City / Town of Living']?.trim() || null,
        organizationName: row['Organization Name:']?.trim() || null,
        designation: row['Designation:']?.trim() || null,
        annualTurnover: row['Annual Turnover']?.trim() || null,
    };
}

async function importMembers() {
    console.log('[Import] Starting member import...');

    const csvFilePath = path.join(__dirname, '../../data/CommunityMemberDetails.csv');

    if (!fs.existsSync(csvFilePath)) {
        console.error(`[Import] ❌ CSV file not found at: ${csvFilePath}`);
        process.exit(1);
    }

    console.log(`[Import] Reading CSV from: ${csvFilePath}`);

    const members: Member[] = [];
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
            members.push(member);
        }
    }

    console.log(`[Import] Parsed ${members.length} members from CSV`);

    try {
        // Clear existing data
        console.log('[Import] Clearing existing members...');
        await query('DELETE FROM community_members');

        // Insert members
        console.log('[Import] Inserting members into database...');
        let insertedCount = 0;

        for (const member of members) {
            try {
                await query(
                    `INSERT INTO community_members (
                        name, year_of_graduation, degree, branch, working_knowledge,
                        email, phone, address, city, organization_name, designation, annual_turnover
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
                    [
                        member.name,
                        member.yearOfGraduation,
                        member.degree,
                        member.branch,
                        member.workingKnowledge,
                        member.email,
                        member.phone,
                        member.address,
                        member.city,
                        member.organizationName,
                        member.designation,
                        member.annualTurnover,
                    ]
                );
                insertedCount++;

                if (insertedCount % 10 === 0) {
                    console.log(`[Import] Inserted ${insertedCount}/${members.length} members...`);
                }
            } catch (error) {
                console.error(`[Import] Error inserting member ${member.name}:`, error);
            }
        }

        console.log(`\n[Import] ✅ Successfully imported ${insertedCount} members!`);

        // Show some stats
        const statsResult = await query(`
            SELECT 
                COUNT(*) as total_members,
                COUNT(DISTINCT city) as unique_cities,
                COUNT(DISTINCT degree) as unique_degrees,
                COUNT(*) FILTER (WHERE email IS NOT NULL) as members_with_email
            FROM community_members
        `);

        console.log('[Import] Database statistics:');
        console.log(`  - Total members: ${statsResult.rows[0].total_members}`);
        console.log(`  - Unique cities: ${statsResult.rows[0].unique_cities}`);
        console.log(`  - Unique degrees: ${statsResult.rows[0].unique_degrees}`);
        console.log(`  - Members with email: ${statsResult.rows[0].members_with_email}`);

        // Show sample cities
        const citiesResult = await query(`
            SELECT city, COUNT(*) as count 
            FROM community_members 
            WHERE city IS NOT NULL AND city != ''
            GROUP BY city 
            ORDER BY count DESC 
            LIMIT 5
        `);

        console.log('[Import] Top cities:');
        citiesResult.rows.forEach((row: any) => {
            console.log(`  - ${row.city}: ${row.count} members`);
        });

    } catch (error) {
        console.error('[Import] ❌ Error importing members:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

// Run import
importMembers()
    .then(() => {
        console.log('[Import] Exiting...');
        process.exit(0);
    })
    .catch((error) => {
        console.error('[Import] Fatal error:', error);
        process.exit(1);
    });
