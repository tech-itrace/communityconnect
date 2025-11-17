/**
 * Generate Embeddings Script - Lean Schema Version
 * 
 * This script generates vector embeddings from JSONB profile_data
 * for the lean schema (8 tables with JSONB instead of 12 normalized tables).
 * 
 * Usage: npm run generate:embeddings:lean
 */

import dotenv from 'dotenv';
import pool, { query } from '../config/db';
import axios from 'axios';

dotenv.config();

const DEEPINFRA_API_KEY = process.env.DEEPINFRA_API_KEY;
const EMBEDDING_MODEL = 'BAAI/bge-base-en-v1.5';
const BATCH_SIZE = 10;
const RATE_LIMIT_DELAY = 100; // ms between batches

interface MemberRow {
    member_id: string;
    membership_id: string;  // ID from community_memberships table
    community_id: string;
    name: string;
    email: string | null;
    phone: string | null;
    member_type: string;
    profile_data: any;
}

async function generateEmbedding(text: string): Promise<number[]> {
    try {
        const response = await axios.post(
            `https://api.deepinfra.com/v1/inference/${EMBEDDING_MODEL}`,
            { inputs: [text] },  // DeepInfra expects an array of strings
            {
                headers: {
                    'Authorization': `Bearer ${DEEPINFRA_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );

        return response.data.embeddings[0];
    } catch (error: any) {
        console.error(`   ⚠️  Embedding API error: ${error.message}`);
        throw error;
    }
}

function buildTextFromJSONB(member: MemberRow): string {
    const parts: string[] = [];
    
    // Basic info
    parts.push(`Name: ${member.name}`);
    if (member.email) parts.push(`Email: ${member.email}`);
    if (member.phone) parts.push(`Phone: ${member.phone}`);
    parts.push(`Member Type: ${member.member_type}`);

    // Extract from JSONB based on type
    const profile = member.profile_data || {};

    switch (member.member_type) {
        case 'alumni':
            if (profile.college) parts.push(`College: ${profile.college}`);
            if (profile.graduation_year) parts.push(`Graduation Year: ${profile.graduation_year}`);
            if (profile.degree) parts.push(`Degree: ${profile.degree}`);
            if (profile.department) parts.push(`Department: ${profile.department}`);
            if (profile.current_organization) parts.push(`Organization: ${profile.current_organization}`);
            if (profile.designation) parts.push(`Designation: ${profile.designation}`);
            if (profile.city) parts.push(`City: ${profile.city}`);
            if (profile.skills && Array.isArray(profile.skills)) {
                parts.push(`Skills: ${profile.skills.join(', ')}`);
            }
            break;

        case 'entrepreneur':
            if (profile.company) parts.push(`Company: ${profile.company}`);
            if (profile.industry) parts.push(`Industry: ${profile.industry}`);
            if (profile.company_stage) parts.push(`Company Stage: ${profile.company_stage}`);
            if (profile.services_offered && Array.isArray(profile.services_offered)) {
                parts.push(`Services: ${profile.services_offered.join(', ')}`);
            }
            if (profile.city) parts.push(`City: ${profile.city}`);
            break;

        case 'resident':
            if (profile.apartment_number) parts.push(`Apartment: ${profile.apartment_number}`);
            if (profile.building) parts.push(`Building: ${profile.building}`);
            if (profile.profession) parts.push(`Profession: ${profile.profession}`);
            if (profile.organization) parts.push(`Organization: ${profile.organization}`);
            if (profile.city) parts.push(`City: ${profile.city}`);
            break;

        default:
            // Generic member - include any custom fields
            Object.entries(profile).forEach(([key, value]) => {
                if (value && typeof value === 'string') {
                    parts.push(`${key}: ${value}`);
                } else if (Array.isArray(value)) {
                    parts.push(`${key}: ${value.join(', ')}`);
                }
            });
    }

    return parts.join('. ');
}

function buildSkillsText(member: MemberRow): string {
    const parts: string[] = [];
    const profile = member.profile_data || {};

    switch (member.member_type) {
        case 'alumni':
            if (profile.skills && Array.isArray(profile.skills)) {
                parts.push(...profile.skills);
            }
            if (profile.designation) parts.push(profile.designation);
            if (profile.department) parts.push(profile.department);
            break;

        case 'entrepreneur':
            if (profile.services_offered && Array.isArray(profile.services_offered)) {
                parts.push(...profile.services_offered);
            }
            if (profile.industry) parts.push(profile.industry);
            break;

        case 'resident':
            if (profile.profession) parts.push(profile.profession);
            break;
    }

    return parts.join('. ');
}

async function generateEmbeddingsLeanSchema() {
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║    Generate Embeddings - Lean Schema (JSONB Profiles)    ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log('');

    if (!DEEPINFRA_API_KEY) {
        console.error('❌ DEEPINFRA_API_KEY not found in environment variables');
        console.error('   Add to your .env file: DEEPINFRA_API_KEY=your_key_here');
        process.exit(1);
    }

    try {
        // Get all members with JSONB profiles
        console.log('🔍 Fetching members with JSONB profiles...');
        const membersResult = await query(`
            SELECT
                m.id as member_id,
                cm.id as membership_id,
                cm.community_id,
                m.name,
                m.email,
                m.phone,
                cm.member_type,
                cm.profile_data
            FROM members m
            JOIN community_memberships cm ON m.id = cm.member_id
            WHERE cm.is_active = TRUE
            ORDER BY m.created_at DESC
        `);

        const members: MemberRow[] = membersResult.rows;
        console.log(`✅ Found ${members.length} members to process`);
        console.log('');

        // Show type distribution
        const typeCount = members.reduce((acc, m) => {
            acc[m.member_type] = (acc[m.member_type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        
        console.log('📊 Member types:');
        Object.entries(typeCount).forEach(([type, count]) => {
            console.log(`   - ${type}: ${count}`);
        });
        console.log('');

        // Sample profile data
        if (members.length > 0) {
            console.log('📝 Sample profile data (first member):');
            console.log(`   Name: ${members[0].name}`);
            console.log(`   Type: ${members[0].member_type}`);
            console.log(`   Profile: ${JSON.stringify(members[0].profile_data, null, 2).split('\n').join('\n   ')}`);
            console.log('');
        }

        // Process in batches
        console.log(`🚀 Processing ${members.length} members in batches of ${BATCH_SIZE}...`);
        console.log('');

        let processedCount = 0;
        let errorCount = 0;
        const errors: string[] = [];

        for (let i = 0; i < members.length; i += BATCH_SIZE) {
            const batch = members.slice(i, i + BATCH_SIZE);
            
            console.log(`   Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(members.length / BATCH_SIZE)}: Processing members ${i + 1}-${Math.min(i + BATCH_SIZE, members.length)}...`);

            for (const member of batch) {
                try {
                    // Build text representations
                    const profileText = buildTextFromJSONB(member);
                    const skillsText = buildSkillsText(member);

                    // Generate embeddings
                    const [profileEmbedding, skillsEmbedding] = await Promise.all([
                        generateEmbedding(profileText),
                        skillsText ? generateEmbedding(skillsText) : generateEmbedding(profileText)
                    ]);

                    // Insert or update in member_embeddings table (lean schema uses membership_id)
                    await query(`
                        INSERT INTO member_embeddings
                        (membership_id, profile_embedding, skills_embedding, contextual_embedding,
                         profile_text, skills_text, contextual_text)
                        VALUES ($1, $2, $3, $4, $5, $6, $7)
                        ON CONFLICT (membership_id)
                        DO UPDATE SET
                            profile_embedding = EXCLUDED.profile_embedding,
                            skills_embedding = EXCLUDED.skills_embedding,
                            contextual_embedding = EXCLUDED.contextual_embedding,
                            profile_text = EXCLUDED.profile_text,
                            skills_text = EXCLUDED.skills_text,
                            contextual_text = EXCLUDED.contextual_text,
                            updated_at = now()
                    `, [
                        member.membership_id,
                        JSON.stringify(profileEmbedding),
                        JSON.stringify(skillsEmbedding),
                        JSON.stringify(profileEmbedding),  // Use profile embedding as contextual for now
                        profileText,
                        skillsText || profileText,
                        profileText
                    ]);

                    processedCount++;

                } catch (error: any) {
                    console.error(`      ⚠️  Error with ${member.name}: ${error.message}`);
                    errors.push(`${member.name}: ${error.message}`);
                    errorCount++;
                }
            }

            // Rate limiting
            if (i + BATCH_SIZE < members.length) {
                await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
            }
        }

        console.log('');
        console.log('╔═══════════════════════════════════════════════════════════╗');
        console.log('║              EMBEDDING GENERATION COMPLETE                ║');
        console.log('╚═══════════════════════════════════════════════════════════╝');
        console.log('');
        console.log(`✅ Successfully processed: ${processedCount}/${members.length} members`);
        if (errorCount > 0) {
            console.log(`⚠️  Errors: ${errorCount}`);
        }
        console.log('');

        // Create HNSW index if not exists
        console.log('🔧 Creating vector indexes...');
        
        await query(`
            CREATE INDEX IF NOT EXISTS idx_member_embeddings_profile_hnsw
            ON member_embeddings 
            USING hnsw (profile_embedding vector_cosine_ops)
            WITH (m = 16, ef_construction = 64)
        `);

        await query(`
            CREATE INDEX IF NOT EXISTS idx_member_embeddings_skills_hnsw
            ON member_embeddings 
            USING hnsw (skills_embedding vector_cosine_ops)
            WITH (m = 16, ef_construction = 64)
        `);

        console.log('✅ Vector indexes created');
        console.log('');

        // Statistics
        console.log('📊 Embedding Statistics:');
        const stats = await query(`
            SELECT 
                COUNT(*) as total_embeddings,
                COUNT(*) FILTER (WHERE profile_embedding IS NOT NULL) as with_profile,
                COUNT(*) FILTER (WHERE skills_embedding IS NOT NULL) as with_skills
            FROM member_embeddings
        `);

        console.log(`   Total embeddings: ${stats.rows[0].total_embeddings}`);
        console.log(`   With profile embedding: ${stats.rows[0].with_profile}`);
        console.log(`   With skills embedding: ${stats.rows[0].with_skills}`);
        console.log('');

        // Sample embedding (lean schema uses membership_id)
        const sampleEmbed = await query(`
            SELECT
                m.name,
                cm.member_type,
                vector_dims(me.profile_embedding) as profile_dim,
                vector_dims(me.skills_embedding) as skills_dim
            FROM member_embeddings me
            JOIN community_memberships cm ON me.membership_id = cm.id
            JOIN members m ON cm.member_id = m.id
            LIMIT 3
        `);

        if (sampleEmbed.rows.length > 0) {
            console.log('📐 Sample Embedding Dimensions:');
            sampleEmbed.rows.forEach((row: any) => {
                console.log(`   ${row.name} (${row.member_type}): profile=${row.profile_dim}d, skills=${row.skills_dim}d`);
            });
            console.log('');
        }

        console.log('✅ Next Steps:');
        console.log('   1. Start server: npm run dev');
        console.log('   2. Test search via WhatsApp or API');
        console.log('   3. Monitor search quality and adjust parameters if needed');
        console.log('');

    } catch (error: any) {
        console.error('');
        console.error('❌ Embedding generation failed:', error.message);
        throw error;
    } finally {
        await pool.end();
    }
}

// Run generation
generateEmbeddingsLeanSchema()
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
