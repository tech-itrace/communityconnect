/**
 * Member Embedding Service
 * Handles automatic embedding generation for members
 * Uses the centralized embedding service with fallback support
 */

import pool from '../config/db';
import { generateQueryEmbedding } from './embeddingService';

interface MemberEmbeddingData {
    membership_id: string;
    community_id: string;
    member_id: string;
    name: string;
    email: string | null;
    phone: string | null;
    member_type: string;
    profile_data: any;
}

function buildTextFromProfile(data: MemberEmbeddingData): string {
    const parts: string[] = [];

    parts.push(`Name: ${data.name}`);
    if (data.email) parts.push(`Email: ${data.email}`);
    if (data.phone) parts.push(`Phone: ${data.phone}`);
    parts.push(`Member Type: ${data.member_type}`);

    const profile = data.profile_data || {};

    switch (data.member_type) {
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

function buildSkillsText(data: MemberEmbeddingData): string {
    const parts: string[] = [];
    const profile = data.profile_data || {};

    if (profile.skills && Array.isArray(profile.skills)) {
        parts.push(`Skills: ${profile.skills.join(', ')}`);
    }
    if (profile.services_offered && Array.isArray(profile.services_offered)) {
        parts.push(`Services: ${profile.services_offered.join(', ')}`);
    }
    if (profile.expertise && Array.isArray(profile.expertise)) {
        parts.push(`Expertise: ${profile.expertise.join(', ')}`);
    }

    return parts.length > 0 ? parts.join('. ') : buildTextFromProfile(data);
}

/**
 * Generate and save embeddings for a member
 * This function is called automatically after member creation or profile updates
 */
export async function generateMemberEmbeddings(membershipId: string): Promise<void> {
    const client = await pool.connect();

    try {
        // Get member data
        const result = await client.query<MemberEmbeddingData>(`
            SELECT
                cm.id as membership_id,
                cm.community_id,
                m.id as member_id,
                m.name,
                m.email,
                m.phone,
                cm.member_type,
                cm.profile_data
            FROM community_memberships cm
            INNER JOIN members m ON cm.member_id = m.id
            WHERE cm.id = $1
        `, [membershipId]);

        if (result.rows.length === 0) {
            console.log(`[Member Embedding Service] Membership not found: ${membershipId}`);
            return;
        }

        const memberData = result.rows[0];

        // Build text representations
        const profileText = buildTextFromProfile(memberData);
        const skillsText = buildSkillsText(memberData);

        if (!profileText || profileText.trim() === '') {
            console.log(`[Member Embedding Service] Skipping ${memberData.name} - no profile data`);
            return;
        }

        const contextualText = `${profileText}. ${skillsText}`;

        // Generate embeddings (run in parallel)
        const [profileEmbedding, skillsEmbedding, contextualEmbedding] = await Promise.all([
            generateQueryEmbedding(profileText),
            skillsText ? generateQueryEmbedding(skillsText) : generateQueryEmbedding(profileText),
            generateQueryEmbedding(contextualText)
        ]);

        // Save to database
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
            membershipId,
            `[${profileEmbedding.join(',')}]`,
            `[${skillsEmbedding.join(',')}]`,
            `[${contextualEmbedding.join(',')}]`,
            profileText,
            skillsText,
            contextualText
        ]);

        console.log(`[Member Embedding Service] ✓ Generated embeddings for: ${memberData.name}`);

    } catch (error: any) {
        console.error(`[Member Embedding Service] Error generating embeddings for membership ${membershipId}:`, error.message);
        // Don't throw - we don't want to fail member creation if embedding generation fails
    } finally {
        client.release();
    }
}

/**
 * Generate embeddings in the background (non-blocking)
 * This is the recommended way to call embedding generation
 */
export function generateMemberEmbeddingsAsync(membershipId: string): void {
    // Run in background without awaiting
    generateMemberEmbeddings(membershipId).catch(error => {
        console.error(`[Member Embedding Service] Background generation failed for ${membershipId}:`, error.message);
    });
}
