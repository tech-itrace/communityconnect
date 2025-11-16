/**
 * Generate Contextual Embeddings for Multi-Community Platform
 * 
 * This script generates three types of embeddings for each member:
 * 1. profile_embedding - Full profile (name, education, company, role)
 * 2. skills_embedding - Skills, expertise, services only
 * 3. contextual_embedding - Interests, networking needs, aspirations
 * 
 * Uses BAAI/bge-base-en-v1.5 model via DeepInfra API
 */

import { Pool } from 'pg';
import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const DEEPINFRA_API_KEY = process.env.DEEPINFRA_API_KEY;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const DEEPINFRA_EMBEDDING_MODEL = 'BAAI/bge-base-en-v1.5';
const GEMINI_EMBEDDING_MODEL = 'text-embedding-004';
const EMBEDDING_API_URL = `https://api.deepinfra.com/v1/inference/${DEEPINFRA_EMBEDDING_MODEL}`;
const EXPECTED_DIMENSIONS = 768;

// Initialize Google AI for fallback
const genAI = GOOGLE_API_KEY ? new GoogleGenerativeAI(GOOGLE_API_KEY) : null;

interface MemberData {
    membership_id: string;
    member_name: string;
    member_email: string | null;
    member_type: string;
    profile_data: any;
}

async function generateEmbeddingDeepInfra(text: string): Promise<number[]> {
    const response = await axios.post(
        EMBEDDING_API_URL,
        { inputs: [text] },
        {
            headers: {
                'Authorization': `Bearer ${DEEPINFRA_API_KEY}`,
                'Content-Type': 'application/json',
            },
            timeout: 30000,
        }
    );

    if (response.data?.embeddings?.[0]) {
        const embedding = response.data.embeddings[0];

        // Validate dimensions
        if (embedding.length !== EXPECTED_DIMENSIONS) {
            throw new Error(`DeepInfra returned ${embedding.length} dimensions, expected ${EXPECTED_DIMENSIONS}`);
        }

        return embedding;
    }

    throw new Error('Invalid response format from DeepInfra API');
}

async function generateEmbeddingGemini(text: string): Promise<number[]> {
    if (!genAI) {
        throw new Error('Google API key not configured');
    }

    const model = genAI.getGenerativeModel({ model: GEMINI_EMBEDDING_MODEL });
    const result = await model.embedContent(text);

    if (result?.embedding?.values) {
        const embedding = result.embedding.values;

        // Validate dimensions
        if (embedding.length !== EXPECTED_DIMENSIONS) {
            throw new Error(`Gemini returned ${embedding.length} dimensions, expected ${EXPECTED_DIMENSIONS}`);
        }

        return embedding;
    }

    throw new Error('Invalid response format from Gemini API');
}

async function generateEmbedding(text: string, memberName: string): Promise<{ embedding: number[], provider: string }> {
    // Try DeepInfra first
    try {
        const embedding = await generateEmbeddingDeepInfra(text);
        return { embedding, provider: 'deepinfra' };
    } catch (error: any) {
        const isRateLimit = error.response?.status === 429;
        const isTimeout = error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED';

        console.log(`    ⚠️  DeepInfra failed: ${error.message}`);

        if (isRateLimit || isTimeout) {
            console.log(`    🔄 Falling back to Gemini...`);

            // Try Gemini as fallback
            try {
                const embedding = await generateEmbeddingGemini(text);
                return { embedding, provider: 'gemini' };
            } catch (geminiError: any) {
                console.error(`    ❌ Gemini also failed: ${geminiError.message}`);
                throw new Error(`Both providers failed for ${memberName}`);
            }
        }

        // If not rate limit or timeout, throw original error
        throw error;
    }
}

function buildProfileText(member: MemberData): string {
    const parts: string[] = [member.member_name];

    if (member.member_email) {
        parts.push(member.member_email);
    }

    const profile = member.profile_data;

    if (member.member_type === 'alumni' && profile) {
        parts.push(`College: ${profile.college}`);
        parts.push(`Degree: ${profile.degree}, ${profile.department}`);
        if (profile.graduation_year) parts.push(`Graduated: ${profile.graduation_year}`);
        if (profile.specialization) parts.push(`Specialization: ${profile.specialization}`);
        if (profile.current_organization) parts.push(`Works at: ${profile.current_organization}`);
        if (profile.designation) parts.push(`Role: ${profile.designation}`);
        if (profile.city) parts.push(`Location: ${profile.city}`);
    } else if (member.member_type === 'entrepreneur' && profile) {
        parts.push(`Company: ${profile.company}`);
        parts.push(`Industry: ${profile.industry}`);
        if (profile.company_stage) parts.push(`Stage: ${profile.company_stage}`);
        if (profile.city) parts.push(`Location: ${profile.city}`);
    } else if (member.member_type === 'resident' && profile) {
        parts.push(`Apartment: ${profile.apartment_number}`);
        if (profile.building) parts.push(`Building: ${profile.building}`);
        if (profile.profession) parts.push(`Profession: ${profile.profession}`);
        if (profile.organization) parts.push(`Organization: ${profile.organization}`);
    }

    return parts.filter(Boolean).join('. ');
}

function buildSkillsText(member: MemberData): string {
    const parts: string[] = [];
    const profile = member.profile_data;

    if (member.member_type === 'alumni' && profile) {
        if (profile.skills?.length) {
            parts.push(`Skills: ${profile.skills.join(', ')}`);
        }
        if (profile.domains?.length) {
            parts.push(`Domains: ${profile.domains.join(', ')}`);
        }
        if (profile.willing_to_help_with?.length) {
            parts.push(`Can help with: ${profile.willing_to_help_with.join(', ')}`);
        }
    } else if (member.member_type === 'entrepreneur' && profile) {
        if (profile.services_offered?.length) {
            parts.push(`Services: ${profile.services_offered.join(', ')}`);
        }
        if (profile.products?.length) {
            parts.push(`Products: ${profile.products.join(', ')}`);
        }
        if (profile.expertise?.length) {
            parts.push(`Expertise: ${profile.expertise.join(', ')}`);
        }
        if (profile.can_offer?.length) {
            parts.push(`Can offer: ${profile.can_offer.join(', ')}`);
        }
    } else if (member.member_type === 'resident' && profile) {
        if (profile.skills?.length) {
            parts.push(`Skills: ${profile.skills.join(', ')}`);
        }
        if (profile.can_help_with?.length) {
            parts.push(`Can help with: ${profile.can_help_with.join(', ')}`);
        }
        if (profile.services_offered?.length) {
            parts.push(`Services: ${profile.services_offered.join(', ')}`);
        }
    }

    return parts.filter(Boolean).join('. ') || 'No specific skills listed';
}

function buildContextualText(member: MemberData): string {
    const parts: string[] = [];
    const profile = member.profile_data;

    if (member.member_type === 'alumni' && profile) {
        if (profile.interests?.length) {
            parts.push(`Interested in: ${profile.interests.join(', ')}`);
        }
        if (profile.looking_for) {
            parts.push(`Looking for: ${profile.looking_for}`);
        }
    } else if (member.member_type === 'entrepreneur' && profile) {
        if (profile.looking_for?.length) {
            parts.push(`Seeking: ${profile.looking_for.join(', ')}`);
        }
        if (profile.target_customers?.length) {
            parts.push(`Target customers: ${profile.target_customers.join(', ')}`);
        }
        if (profile.markets_served?.length) {
            parts.push(`Markets: ${profile.markets_served.join(', ')}`);
        }
    } else if (member.member_type === 'resident' && profile) {
        if (profile.interested_in?.length) {
            parts.push(`Interested in: ${profile.interested_in.join(', ')}`);
        }
        if (profile.community_roles?.length) {
            parts.push(`Community roles: ${profile.community_roles.join(', ')}`);
        }
    }

    return parts.filter(Boolean).join('. ') || 'Open to networking and community connections';
}

async function generateContextualEmbeddings() {
    const client = await pool.connect();

    try {
        console.log('🚀 Starting contextual embeddings generation...\n');

        // Check API keys
        if (!DEEPINFRA_API_KEY) {
            throw new Error('DEEPINFRA_API_KEY not found in environment variables');
        }

        if (!GOOGLE_API_KEY) {
            console.warn('⚠️  WARNING: GOOGLE_API_KEY not found. Gemini fallback unavailable.');
            console.warn('⚠️  If DeepInfra rate limits are hit, embedding generation will fail.\n');
        } else {
            console.log('✅ Both DeepInfra and Gemini APIs configured (fallback available)\n');
        }

        // Step 1: Get all memberships with profile data
        console.log('📍 Step 1: Fetching memberships...');
        const result = await client.query<MemberData>(`
      SELECT 
        cm.id as membership_id,
        m.name as member_name,
        m.email as member_email,
        cm.member_type,
        CASE 
          WHEN cm.member_type = 'alumni' THEN
            jsonb_build_object(
              'college', ap.college,
              'graduation_year', ap.graduation_year,
              'degree', ap.degree,
              'department', ap.department,
              'specialization', ap.specialization,
              'current_organization', ap.current_organization,
              'designation', ap.designation,
              'city', ap.city,
              'skills', ap.skills,
              'domains', ap.domains,
              'interests', ap.interests,
              'looking_for', ap.looking_for,
              'willing_to_help_with', ap.willing_to_help_with
            )
          WHEN cm.member_type = 'entrepreneur' THEN
            jsonb_build_object(
              'company', ep.company,
              'industry', ep.industry,
              'company_stage', ep.company_stage,
              'city', ep.city,
              'services_offered', ep.services_offered,
              'products', ep.products,
              'expertise', ep.expertise,
              'looking_for', ep.looking_for,
              'can_offer', ep.can_offer,
              'target_customers', ep.target_customers,
              'markets_served', ep.markets_served
            )
          WHEN cm.member_type = 'resident' THEN
            jsonb_build_object(
              'apartment_number', rp.apartment_number,
              'building', rp.building,
              'profession', rp.profession,
              'organization', rp.organization,
              'skills', rp.skills,
              'can_help_with', rp.can_help_with,
              'services_offered', rp.services_offered,
              'interested_in', rp.interested_in,
              'community_roles', rp.community_roles
            )
          ELSE NULL
        END as profile_data
      FROM community_memberships cm
      JOIN members m ON cm.member_id = m.id
      LEFT JOIN alumni_profiles ap ON cm.id = ap.membership_id AND cm.member_type = 'alumni'
      LEFT JOIN entrepreneur_profiles ep ON cm.id = ep.membership_id AND cm.member_type = 'entrepreneur'
      LEFT JOIN resident_profiles rp ON cm.id = rp.membership_id AND cm.member_type = 'resident'
      WHERE cm.is_active = true
      ORDER BY m.name
    `);

        const memberships = result.rows;
        console.log(`✅ Found ${memberships.length} active memberships\n`);

        if (memberships.length === 0) {
            console.log('ℹ️  No memberships to process. Exiting.');
            return;
        }

        // Step 2: Process each membership
        console.log('📍 Step 2: Generating embeddings...\n');

        let processed = 0;
        let updated = 0;
        let errors = 0;

        for (const member of memberships) {
            try {
                console.log(`Processing: ${member.member_name} (${member.member_type})...`);

                // Build three types of text
                const profileText = buildProfileText(member);
                const skillsText = buildSkillsText(member);
                const contextualText = buildContextualText(member);

                console.log(`  Profile text (${profileText.length} chars)`);
                console.log(`  Skills text (${skillsText.length} chars)`);
                console.log(`  Contextual text (${contextualText.length} chars)`);

                // Generate embeddings
                console.log('  Generating embeddings...');
                const [profileResult, skillsResult, contextualResult] = await Promise.all([
                    generateEmbedding(profileText, member.member_name),
                    generateEmbedding(skillsText, member.member_name),
                    generateEmbedding(contextualText, member.member_name),
                ]);

                const profileEmb = profileResult.embedding;
                const skillsEmb = skillsResult.embedding;
                const contextualEmb = contextualResult.embedding;

                // Track which provider was used
                const providers = [profileResult.provider, skillsResult.provider, contextualResult.provider];
                const usedGemini = providers.some(p => p === 'gemini');
                if (usedGemini) {
                    console.log(`  ℹ️  Used Gemini for ${providers.filter(p => p === 'gemini').length}/3 embeddings`);
                }

                // Determine embedding model to store (prefer DeepInfra if any were used)
                const embeddingModel = providers.includes('deepinfra') ? DEEPINFRA_EMBEDDING_MODEL : GEMINI_EMBEDDING_MODEL;

                // Insert or update embeddings
                await client.query(`
          INSERT INTO member_embeddings (
            membership_id,
            profile_embedding,
            skills_embedding,
            contextual_embedding,
            embedding_model,
            embedding_version,
            profile_text,
            skills_text,
            contextual_text,
            profile_text_length,
            skills_text_length,
            contextual_text_length,
            created_at,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
          ON CONFLICT (membership_id) DO UPDATE SET
            profile_embedding = EXCLUDED.profile_embedding,
            skills_embedding = EXCLUDED.skills_embedding,
            contextual_embedding = EXCLUDED.contextual_embedding,
            embedding_model = EXCLUDED.embedding_model,
            embedding_version = member_embeddings.embedding_version + 1,
            profile_text = EXCLUDED.profile_text,
            skills_text = EXCLUDED.skills_text,
            contextual_text = EXCLUDED.contextual_text,
            profile_text_length = EXCLUDED.profile_text_length,
            skills_text_length = EXCLUDED.skills_text_length,
            contextual_text_length = EXCLUDED.contextual_text_length,
            updated_at = NOW()
        `, [
                    member.membership_id,
                    JSON.stringify(profileEmb),
                    JSON.stringify(skillsEmb),
                    JSON.stringify(contextualEmb),
                    embeddingModel,
                    1,
                    profileText,
                    skillsText,
                    contextualText,
                    profileText.length,
                    skillsText.length,
                    contextualText.length,
                ]);

                console.log(`  ✅ Embeddings saved\n`);
                updated++;

                // Rate limiting: delay between API calls to avoid hitting limits
                await new Promise(resolve => setTimeout(resolve, 500));

            } catch (error: any) {
                console.error(`  ❌ Error: ${error.message}`);
                if (error.response?.data) {
                    console.error(`  API details:`, JSON.stringify(error.response.data).substring(0, 200));
                }
                console.log('');
                errors++;

                // Continue with next member even if one fails
            }

            processed++;
        }

        // Step 3: Summary
        console.log('\n' + '='.repeat(60));
        console.log('📊 Embedding Generation Summary:');
        console.log('='.repeat(60));
        console.log(`Total memberships:   ${memberships.length}`);
        console.log(`✅ Processed:        ${processed}`);
        console.log(`✅ Updated:          ${updated}`);
        console.log(`❌ Errors:           ${errors}`);
        console.log('='.repeat(60));

        // Step 4: Verify embeddings
        console.log('\n📍 Step 3: Verifying embeddings...');
        const verifyResult = await client.query(`
      SELECT 
        COUNT(*) as total_embeddings,
        AVG(profile_text_length) as avg_profile_length,
        AVG(skills_text_length) as avg_skills_length,
        AVG(contextual_text_length) as avg_contextual_length
      FROM member_embeddings
    `);

        const stats = verifyResult.rows[0];
        console.log(`✅ Total embeddings: ${stats.total_embeddings}`);
        console.log(`📊 Avg profile text length: ${Math.round(stats.avg_profile_length)} chars`);
        console.log(`📊 Avg skills text length: ${Math.round(stats.avg_skills_length)} chars`);
        console.log(`📊 Avg contextual text length: ${Math.round(stats.avg_contextual_length)} chars\n`);

        if (errors === 0 && updated > 0) {
            console.log('🎉 Embeddings generated successfully!');
            console.log('\n📝 Next steps:');
            console.log('1. Test WhatsApp search: npm run test:whatsapp');
            console.log('2. Test dashboard search functionality');
            console.log('3. Monitor search quality and adjust if needed\n');
        } else if (errors > 0) {
            console.log('⚠️  Generation completed with errors. Please review the errors above.');
        }

    } catch (error) {
        console.error('❌ Embedding generation failed:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Run script
if (require.main === module) {
    generateContextualEmbeddings()
        .then(() => {
            console.log('✅ Script completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Script failed:', error);
            process.exit(1);
        });
}

export { generateContextualEmbeddings };
