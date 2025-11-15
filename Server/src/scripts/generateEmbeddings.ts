import dotenv from 'dotenv';
import pool, { query } from '../config/db';
import { getLLMFactory } from '../services/llm';

// Load environment variables
dotenv.config();

interface Member {
    id: string;
    name: string;
    working_knowledge: string | null;
    degree: string | null;
    branch: string | null;
    city: string | null;
    organization_name: string | null;
    designation: string | null;
    annual_turnover: string | null;
}

function buildProfileText(member: Member): string {
    const parts: string[] = [];

    parts.push(`Name: ${member.name}`);

    if (member.working_knowledge) {
        parts.push(`Skills/Services: ${member.working_knowledge}`);
    }

    if (member.organization_name) {
        parts.push(`Organization: ${member.organization_name}`);
    }

    if (member.designation) {
        parts.push(`Role: ${member.designation}`);
    }

    if (member.city) {
        parts.push(`Location: ${member.city}`);
    }

    if (member.degree) {
        parts.push(`Education: ${member.degree}${member.branch ? ` in ${member.branch}` : ''}`);
    }

    if (member.annual_turnover) {
        parts.push(`Business Size: ${member.annual_turnover}`);
    }

    return parts.join('. ');
}

function buildSkillsText(member: Member): string {
    const parts: string[] = [];

    if (member.working_knowledge) {
        parts.push(member.working_knowledge);
    }

    if (member.degree && member.branch) {
        parts.push(`${member.degree} ${member.branch}`);
    }

    if (member.designation) {
        parts.push(member.designation);
    }

    return parts.join('. ') || 'General business';
}

async function generateEmbedding(text: string): Promise<number[]> {
    try {
        const llmFactory = getLLMFactory();
        
        const response = await llmFactory.getEmbedding({
            text: text
        });

        if (!response.embeddings || response.embeddings.length === 0) {
            throw new Error('Invalid embedding response from LLM provider');
        }

        // Return the first embedding (single text input)
        return response.embeddings[0];
    } catch (error: any) {
        console.error('[Embeddings] Error generating embedding:', error.message);
        throw error;
    }
}

async function generateEmbeddings() {
    console.log('[Embeddings] Starting embeddings generation...');
    console.log('[Embeddings] Using LLM Factory with automatic provider fallback');
    console.log('[Embeddings] Providers: DeepInfra (BAAI/bge-base-en-v1.5) → Gemini (text-embedding-004)');
    console.log('[Embeddings] Both models produce 768-dimensional embeddings');

    // Verify at least one API key is set
    if (!process.env.DEEPINFRA_API_KEY && !process.env.GOOGLE_API_KEY) {
        console.error('[Embeddings] ❌ No API keys configured. Set DEEPINFRA_API_KEY or GOOGLE_API_KEY');
        process.exit(1);
    }

    try {
        // Get all members
        console.log('[Embeddings] Fetching members from database...');
        const membersResult = await query('SELECT * FROM community_members ORDER BY name');
        const members = membersResult.rows as Member[];

        console.log(`[Embeddings] Found ${members.length} members to process`);

        // Clear existing embeddings
        console.log('[Embeddings] Clearing existing embeddings...');
        await query('DELETE FROM member_embeddings');

        let processedCount = 0;
        let errorCount = 0;

        for (const member of members) {
            try {
                // Build text representations
                const profileText = buildProfileText(member);
                const skillsText = buildSkillsText(member);

                console.log(`[Embeddings] Processing: ${member.name}...`);

                // Generate embeddings
                const profileEmbedding = await generateEmbedding(profileText);
                const skillsEmbedding = await generateEmbedding(skillsText);

                // Store embeddings
                await query(
                    `INSERT INTO member_embeddings (
                        member_id, profile_embedding, skills_embedding
                    ) VALUES ($1, $2, $3)`,
                    [
                        member.id,
                        `[${profileEmbedding.join(',')}]`,
                        `[${skillsEmbedding.join(',')}]`,
                    ]
                );

                processedCount++;

                if (processedCount % 5 === 0) {
                    console.log(`[Embeddings] Processed ${processedCount}/${members.length} members...`);
                }

                // Rate limiting - brief pause between requests
                await new Promise(resolve => setTimeout(resolve, 200));

            } catch (error) {
                console.error(`[Embeddings] Error processing member ${member.name}:`, error);
                errorCount++;
                
                // If we hit too many errors, check if it's a provider issue
                if (errorCount > 5 && errorCount > processedCount * 0.3) {
                    console.error('[Embeddings] Too many errors, stopping to prevent wasted API calls');
                    throw new Error('High error rate detected');
                }
            }
        }

        console.log(`\n[Embeddings] ✅ Generation completed!`);
        console.log(`  - Successfully processed: ${processedCount}/${members.length}`);
        console.log(`  - Errors: ${errorCount}`);

        // Verify embeddings
        const embeddingsCount = await query('SELECT COUNT(*) as count FROM member_embeddings');
        console.log(`  - Embeddings in database: ${embeddingsCount.rows[0].count}`);

    } catch (error) {
        console.error('[Embeddings] ❌ Error generating embeddings:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

// Run embeddings generation
generateEmbeddings()
    .then(() => {
        console.log('[Embeddings] Exiting...');
        process.exit(0);
    })
    .catch((error) => {
        console.error('[Embeddings] Fatal error:', error);
        process.exit(1);
    });
