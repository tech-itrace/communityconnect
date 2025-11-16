/**
 * Database Row Mappers
 *
 * Centralizes conversion from database rows to TypeScript objects
 * Eliminates code duplication across services
 */

import { Member } from './types';

/**
 * Map database row to Member object
 * Used in: memberService, searchService, etc.
 */
export function mapRowToMember(row: any): Member {
    if (!row) return null as any;

    return {
        id: row.id,
        name: row.name,
        yearOfGraduation: row.year_of_graduation,
        degree: row.degree,
        branch: row.branch,
        workingAs: row.working_as,
        organization: row.organization,
        designation: row.designation,
        city: row.city,
        phone: row.phone,
        email: row.email,
        skills: row.skills,
        productsServices: row.products_services,
        annualTurnover: row.annual_turnover,
        role: row.role,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

/**
 * Map multiple rows to Member array
 */
export function mapRowsToMembers(rows: any[]): Member[] {
    return rows.map(mapRowToMember);
}

/**
 * Map community database row
 */
export function mapRowToCommunity(row: any) {
    if (!row) return null;

    return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        description: row.description,
        type: row.type,
        rules: row.rules,
        admins: row.admins,
        isBotEnabled: row.is_bot_enabled,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        isActive: row.is_active,
        createdBy: row.created_by
    };
}

/**
 * Map community membership row
 */
export function mapRowToMembership(row: any) {
    if (!row) return null;

    return {
        id: row.id,
        memberId: row.member_id,
        communityId: row.community_id,
        memberType: row.member_type,
        role: row.role,
        isActive: row.is_active,
        joinedAt: row.joined_at,
        createdAt: row.created_at
    };
}

/**
 * Map alumni profile row
 */
export function mapRowToAlumniProfile(row: any) {
    if (!row) return null;

    return {
        id: row.id,
        membershipId: row.membership_id,
        college: row.college,
        graduationYear: row.graduation_year,
        degree: row.degree,
        department: row.department,
        skills: row.skills,
        domains: row.domains,
        currentOrganization: row.current_organization,
        designation: row.designation,
        city: row.city,
        linkedinUrl: row.linkedin_url,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

/**
 * Map entrepreneur profile row
 */
export function mapRowToEntrepreneurProfile(row: any) {
    if (!row) return null;

    return {
        id: row.id,
        membershipId: row.membership_id,
        company: row.company,
        industry: row.industry,
        servicesOffered: row.services_offered,
        products: row.products,
        expertise: row.expertise,
        city: row.city,
        website: row.website,
        linkedinUrl: row.linkedin_url,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

/**
 * Map resident profile row
 */
export function mapRowToResidentProfile(row: any) {
    if (!row) return null;

    return {
        id: row.id,
        membershipId: row.membership_id,
        apartmentNumber: row.apartment_number,
        building: row.building,
        profession: row.profession,
        skills: row.skills,
        canHelpWith: row.can_help_with,
        emergencyContact: row.emergency_contact,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

/**
 * Map search query log row
 */
export function mapRowToSearchQuery(row: any) {
    if (!row) return null;

    return {
        id: row.id,
        userId: row.user_id,
        conversationId: row.conversation_id,
        queryText: row.query_text,
        queryType: row.query_type,
        resultsCount: row.results_count,
        responseTimeMs: row.response_time_ms,
        success: row.success,
        createdAt: row.created_at
    };
}

/**
 * Generic mapper for simple objects
 * Converts snake_case to camelCase
 */
export function mapRowGeneric(row: any): any {
    if (!row) return null;

    const result: any = {};

    for (const key in row) {
        if (row.hasOwnProperty(key)) {
            // Convert snake_case to camelCase
            const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
            result[camelKey] = row[key];
        }
    }

    return result;
}

/**
 * Map member with profile data (for detailed views)
 */
export function mapRowToMemberWithProfile(memberRow: any, profileRow: any) {
    const member = mapRowToMember(memberRow);

    if (!member) return null;

    // Add profile data based on member type
    const memberType = memberRow.member_type || profileRow?.member_type;

    switch (memberType) {
        case 'alumni':
            return {
                ...member,
                profile: mapRowToAlumniProfile(profileRow)
            };

        case 'entrepreneur':
            return {
                ...member,
                profile: mapRowToEntrepreneurProfile(profileRow)
            };

        case 'resident':
            return {
                ...member,
                profile: mapRowToResidentProfile(profileRow)
            };

        default:
            return member;
    }
}

/**
 * Map embedding row
 */
export function mapRowToEmbedding(row: any) {
    if (!row) return null;

    return {
        id: row.id,
        memberId: row.member_id,
        profileEmbedding: row.profile_embedding,
        skillsEmbedding: row.skills_embedding,
        contextualEmbedding: row.contextual_embedding,
        embeddingModel: row.embedding_model,
        createdAt: row.created_at
    };
}
