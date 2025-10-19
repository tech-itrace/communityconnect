/**
 * Member Service
 * 
 * Handles member-related operations:
 * - Get single member by ID
 * - List all members with pagination
 * - Get member statistics
 */

import { query } from '../config/db';
import {
    Member,
    PaginatedMembers,
    MemberStats,
    PaginationInfo,
    GetMembersRequest
} from '../utils/types';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

/**
 * Get a single member by ID
 */
export async function getMemberById(id: string): Promise<Member | null> {
    console.log(`[Member Service] Fetching member with ID: ${id}`);

    const queryText = `
        SELECT * FROM community_members
        WHERE id = $1 AND is_active = TRUE
    `;

    const result = await query(queryText, [id]);

    if (result.rows.length === 0) {
        console.log(`[Member Service] Member not found: ${id}`);
        return null;
    }

    const row = result.rows[0];

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
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

/**
 * Get all members with pagination and optional filters
 */
export async function getAllMembers(request: GetMembersRequest = {}): Promise<PaginatedMembers> {
    const page = request.page || DEFAULT_PAGE;
    const limit = Math.min(request.limit || DEFAULT_LIMIT, MAX_LIMIT);
    const offset = (page - 1) * limit;

    console.log(`[Member Service] Fetching members - Page: ${page}, Limit: ${limit}`);

    // Build WHERE conditions
    const conditions: string[] = ['is_active = TRUE'];
    const params: any[] = [];
    let paramIndex = 1;

    if (request.city) {
        conditions.push(`city ILIKE $${paramIndex}`);
        params.push(`%${request.city}%`);
        paramIndex++;
    }

    if (request.degree) {
        conditions.push(`degree ILIKE $${paramIndex}`);
        params.push(`%${request.degree}%`);
        paramIndex++;
    }

    if (request.yearOfGraduation) {
        conditions.push(`year_of_graduation = $${paramIndex}`);
        params.push(request.yearOfGraduation);
        paramIndex++;
    }

    // Determine sort field and order
    let sortField = 'name';
    switch (request.sortBy) {
        case 'turnover':
            sortField = 'annual_turnover';
            break;
        case 'year':
            sortField = 'year_of_graduation';
            break;
        case 'name':
        default:
            sortField = 'name';
            break;
    }

    const sortOrder = request.sortOrder === 'asc' ? 'ASC' : 'DESC';

    // Add limit and offset parameters
    const limitParam = `$${paramIndex}`;
    const offsetParam = `$${paramIndex + 1}`;
    params.push(limit, offset);

    // Build and execute query
    const queryText = `
        SELECT * FROM community_members
        WHERE ${conditions.join(' AND ')}
        ORDER BY ${sortField} ${sortOrder}
        LIMIT ${limitParam} OFFSET ${offsetParam}
    `;

    const result = await query(queryText, params);

    // Map results to Member objects
    const members: Member[] = result.rows.map(row => ({
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
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    }));

    // Get total count for pagination
    const countQuery = `
        SELECT COUNT(*) as count
        FROM community_members
        WHERE ${conditions.join(' AND ')}
    `;

    const countResult = await query(countQuery, params.slice(0, -2)); // Remove limit and offset
    const totalResults = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalResults / limit);

    const pagination: PaginationInfo = {
        currentPage: page,
        totalPages,
        totalResults,
        resultsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
    };

    console.log(`[Member Service] Returned ${members.length} members (total: ${totalResults})`);

    return {
        members,
        pagination
    };
}

/**
 * Get member statistics
 */
export async function getMemberStats(): Promise<MemberStats> {
    console.log('[Member Service] Calculating member statistics...');

    // Get basic stats - annual_turnover is VARCHAR so we can't use AVG
    const statsQuery = `
        SELECT 
            COUNT(*) as total_members,
            COUNT(*) FILTER (WHERE is_active = TRUE) as active_members,
            COUNT(DISTINCT city) FILTER (WHERE city IS NOT NULL) as unique_cities,
            COUNT(DISTINCT degree) FILTER (WHERE degree IS NOT NULL) as unique_degrees
        FROM community_members
    `;

    const statsResult = await query(statsQuery);
    const stats = statsResult.rows[0];

    // Get top skills (extract from working_knowledge field)
    const topSkillsQuery = `
        WITH skills_split AS (
            SELECT 
                TRIM(unnest(string_to_array(working_knowledge, ','))) as skill
            FROM community_members
            WHERE working_knowledge IS NOT NULL AND working_knowledge != ''
        )
        SELECT 
            skill,
            COUNT(*) as count
        FROM skills_split
        WHERE skill != ''
        GROUP BY skill
        ORDER BY count DESC
        LIMIT 10
    `;

    const skillsResult = await query(topSkillsQuery);
    const topSkills = skillsResult.rows.map(row => ({
        skill: row.skill,
        count: parseInt(row.count)
    }));

    // Get top cities
    const topCitiesQuery = `
        SELECT 
            city,
            COUNT(*) as count
        FROM community_members
        WHERE city IS NOT NULL AND city != ''
        GROUP BY city
        ORDER BY count DESC
        LIMIT 10
    `;

    const citiesResult = await query(topCitiesQuery);
    const topCities = citiesResult.rows.map(row => ({
        city: row.city,
        count: parseInt(row.count)
    }));

    const memberStats: MemberStats = {
        totalMembers: parseInt(stats.total_members),
        activeMembers: parseInt(stats.active_members),
        uniqueCities: parseInt(stats.unique_cities),
        uniqueDegrees: parseInt(stats.unique_degrees),
        averageTurnover: 0, // annual_turnover is text, not numeric
        topSkills,
        topCities
    };

    console.log('[Member Service] Statistics calculated:', memberStats);

    return memberStats;
}

/**
 * Get unique values for autocomplete/suggestions
 */
export async function getUniqueCities(): Promise<string[]> {
    const queryText = `
        SELECT DISTINCT city
        FROM community_members
        WHERE city IS NOT NULL AND city != ''
        ORDER BY city
    `;

    const result = await query(queryText);
    return result.rows.map(row => row.city);
}

export async function getUniqueSkills(): Promise<string[]> {
    const queryText = `
        WITH skills_split AS (
            SELECT TRIM(unnest(string_to_array(working_knowledge, ','))) as skill
            FROM community_members
            WHERE working_knowledge IS NOT NULL AND working_knowledge != ''
        )
        SELECT DISTINCT skill
        FROM skills_split
        WHERE skill != ''
        ORDER BY skill
    `;

    const result = await query(queryText);
    return result.rows.map(row => row.skill);
}

export async function getUniqueServices(): Promise<string[]> {
    // There is no products_services column, return empty array for now
    return [];
}
