import { Router, Request, Response } from 'express';
import { requireAnyRole } from '../middlewares/authorize';
import pool from '../config/db';
import { generateQueryEmbedding } from '../services/embeddingService';

const router = Router();

const BATCH_SIZE = 10;
const RATE_LIMIT_DELAY = 100; // ms between batches

interface MemberRow {
    member_id: string;
    membership_id: string;
    community_id: string;
    name: string;
    email: string | null;
    phone: string | null;
    member_type: string;
    profile_data: any;
}

function buildTextFromJSONB(member: MemberRow): string {
    const parts: string[] = [];

    parts.push(`Name: ${member.name}`);
    if (member.email) parts.push(`Email: ${member.email}`);
    if (member.phone) parts.push(`Phone: ${member.phone}`);
    parts.push(`Member Type: ${member.member_type}`);

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

    if (profile.skills && Array.isArray(profile.skills)) {
        parts.push(`Skills: ${profile.skills.join(', ')}`);
    }
    if (profile.services_offered && Array.isArray(profile.services_offered)) {
        parts.push(`Services: ${profile.services_offered.join(', ')}`);
    }
    if (profile.expertise && Array.isArray(profile.expertise)) {
        parts.push(`Expertise: ${profile.expertise.join(', ')}`);
    }

    return parts.length > 0 ? parts.join('. ') : buildTextFromJSONB(member);
}

/**
 * POST /api/embeddings/generate
 * Generate embeddings for all members in the database
 * Requires admin or super_admin role
 */
router.post('/generate', requireAnyRole(['admin', 'super_admin']), async (_req: Request, res: Response) => {
    const client = await pool.connect();

    try {
        console.log('[Embeddings] Starting embedding generation...');

        // Get all members with their community memberships
        const result = await client.query<MemberRow>(`
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
            INNER JOIN community_memberships cm ON m.id = cm.member_id
            WHERE m.is_active = true
            ORDER BY m.created_at DESC
        `);

        const members = result.rows;
        console.log(`[Embeddings] Found ${members.length} members to process`);

        if (members.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'No members found to generate embeddings for',
                stats: {
                    totalMembers: 0,
                    processed: 0,
                    skipped: 0,
                    errors: 0
                }
            });
        }

        let processed = 0;
        let skipped = 0;
        let errors = 0;

        // Process in batches
        for (let i = 0; i < members.length; i += BATCH_SIZE) {
            const batch = members.slice(i, i + BATCH_SIZE);

            console.log(`[Embeddings] Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(members.length / BATCH_SIZE)}`);

            for (const member of batch) {
                try {
                    // Build text representations
                    const profileText = buildTextFromJSONB(member);
                    const skillsText = buildSkillsText(member);

                    if (!profileText || profileText.trim() === '') {
                        console.log(`[Embeddings] Skipping ${member.name} - no profile data`);
                        skipped++;
                        continue;
                    }

                    // Build contextual text (combines profile and skills)
                    const contextualText = `${profileText}. ${skillsText}`;

                    // Generate embeddings
                    const [profileEmbedding, skillsEmbedding, contextualEmbedding] = await Promise.all([
                        generateQueryEmbedding(profileText),
                        skillsText ? generateQueryEmbedding(skillsText) : generateQueryEmbedding(profileText),
                        generateQueryEmbedding(contextualText)
                    ]);

                    // Insert or update embeddings using membership_id
                    await client.query(`
                        INSERT INTO member_embeddings (
                            membership_id,
                            profile_embedding,
                            skills_embedding,
                            contextual_embedding,
                            profile_text,
                            skills_text,
                            contextual_text
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                        ON CONFLICT (membership_id)
                        DO UPDATE SET
                            profile_embedding = EXCLUDED.profile_embedding,
                            skills_embedding = EXCLUDED.skills_embedding,
                            contextual_embedding = EXCLUDED.contextual_embedding,
                            profile_text = EXCLUDED.profile_text,
                            skills_text = EXCLUDED.skills_text,
                            contextual_text = EXCLUDED.contextual_text,
                            updated_at = CURRENT_TIMESTAMP
                    `, [
                        member.membership_id,
                        `[${profileEmbedding.join(',')}]`,
                        `[${skillsEmbedding.join(',')}]`,
                        `[${contextualEmbedding.join(',')}]`,
                        profileText,
                        skillsText,
                        contextualText
                    ]);

                    processed++;
                    console.log(`[Embeddings] ✓ Generated embeddings for: ${member.name} (${member.member_type})`);

                } catch (error: any) {
                    console.error(`[Embeddings] ✗ Failed for ${member.name}: ${error.message}`);
                    errors++;
                }
            }

            // Rate limiting delay between batches
            if (i + BATCH_SIZE < members.length) {
                await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
            }
        }

        const stats = {
            totalMembers: members.length,
            processed,
            skipped,
            errors
        };

        console.log('[Embeddings] Generation complete!');
        console.log(`[Embeddings] Stats: ${JSON.stringify(stats)}`);

        return res.status(200).json({
            success: true,
            message: 'Embedding generation completed',
            stats
        });

    } catch (error: any) {
        console.error('[Embeddings] Error:', error);
        return res.status(500).json({
            success: false,
            error: {
                code: 'EMBEDDING_GENERATION_FAILED',
                message: error.message
            }
        });
    } finally {
        client.release();
    }
});

/**
 * POST /api/embeddings/generate/:communityId
 * Generate embeddings for members of a specific community
 * Requires admin or super_admin role
 */
router.post('/generate/:communityId', requireAnyRole(['admin', 'super_admin']), async (req: Request, res: Response) => {
    const { communityId } = req.params;
    const client = await pool.connect();

    try {
        console.log(`[Embeddings] Starting embedding generation for community: ${communityId}`);

        // Get all members for this community
        const result = await client.query<MemberRow>(`
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
            INNER JOIN community_memberships cm ON m.id = cm.member_id
            WHERE cm.community_id = $1 AND m.is_active = true
            ORDER BY m.created_at DESC
        `, [communityId]);

        const members = result.rows;
        console.log(`[Embeddings] Found ${members.length} members in community`);

        if (members.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'No members found in this community',
                stats: {
                    totalMembers: 0,
                    processed: 0,
                    skipped: 0,
                    errors: 0
                }
            });
        }

        let processed = 0;
        let skipped = 0;
        let errors = 0;

        // Process in batches
        for (let i = 0; i < members.length; i += BATCH_SIZE) {
            const batch = members.slice(i, i + BATCH_SIZE);

            console.log(`[Embeddings] Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(members.length / BATCH_SIZE)}`);

            for (const member of batch) {
                try {
                    const profileText = buildTextFromJSONB(member);
                    const skillsText = buildSkillsText(member);

                    if (!profileText || profileText.trim() === '') {
                        skipped++;
                        continue;
                    }

                    const contextualText = `${profileText}. ${skillsText}`;

                    const [profileEmbedding, skillsEmbedding, contextualEmbedding] = await Promise.all([
                        generateQueryEmbedding(profileText),
                        skillsText ? generateQueryEmbedding(skillsText) : generateQueryEmbedding(profileText),
                        generateQueryEmbedding(contextualText)
                    ]);

                    await client.query(`
                        INSERT INTO member_embeddings (
                            membership_id,
                            profile_embedding,
                            skills_embedding,
                            contextual_embedding,
                            profile_text,
                            skills_text,
                            contextual_text
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                        ON CONFLICT (membership_id)
                        DO UPDATE SET
                            profile_embedding = EXCLUDED.profile_embedding,
                            skills_embedding = EXCLUDED.skills_embedding,
                            contextual_embedding = EXCLUDED.contextual_embedding,
                            profile_text = EXCLUDED.profile_text,
                            skills_text = EXCLUDED.skills_text,
                            contextual_text = EXCLUDED.contextual_text,
                            updated_at = CURRENT_TIMESTAMP
                    `, [
                        member.membership_id,
                        `[${profileEmbedding.join(',')}]`,
                        `[${skillsEmbedding.join(',')}]`,
                        `[${contextualEmbedding.join(',')}]`,
                        profileText,
                        skillsText,
                        contextualText
                    ]);

                    processed++;

                } catch (error: any) {
                    errors++;
                }
            }

            if (i + BATCH_SIZE < members.length) {
                await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
            }
        }

        const stats = {
            communityId,
            totalMembers: members.length,
            processed,
            skipped,
            errors
        };

        return res.status(200).json({
            success: true,
            message: 'Embedding generation completed for community',
            stats
        });

    } catch (error: any) {
        console.error('[Embeddings] Error:', error);
        return res.status(500).json({
            success: false,
            error: {
                code: 'EMBEDDING_GENERATION_FAILED',
                message: error.message
            }
        });
    } finally {
        client.release();
    }
});

/**
 * GET /api/embeddings/status
 * Get embedding generation status
 */
router.get('/status', requireAnyRole(['admin', 'super_admin']), async (_req: Request, res: Response) => {
    try {
        const result = await pool.query(`
            SELECT
                COUNT(DISTINCT cm.id) as total_memberships,
                COUNT(DISTINCT e.membership_id) as memberships_with_embeddings,
                COUNT(DISTINCT cm.community_id) as total_communities,
                COUNT(DISTINCT CASE WHEN e.membership_id IS NOT NULL THEN cm.community_id END) as communities_with_embeddings
            FROM community_memberships cm
            LEFT JOIN member_embeddings e ON cm.id = e.membership_id
            INNER JOIN members m ON cm.member_id = m.id
            WHERE m.is_active = true
        `);

        const stats = result.rows[0];

        return res.status(200).json({
            success: true,
            stats: {
                totalMemberships: parseInt(stats.total_memberships),
                membershipsWithEmbeddings: parseInt(stats.memberships_with_embeddings),
                totalCommunities: parseInt(stats.total_communities),
                communitiesWithEmbeddings: parseInt(stats.communities_with_embeddings),
                coveragePercentage: stats.total_memberships > 0
                    ? ((stats.memberships_with_embeddings / stats.total_memberships) * 100).toFixed(2) + '%'
                    : '0%'
            }
        });

    } catch (error: any) {
        console.error('[Embeddings] Status error:', error);
        return res.status(500).json({
            success: false,
            error: {
                code: 'STATUS_CHECK_FAILED',
                message: error.message
            }
        });
    }
});

export default router;
