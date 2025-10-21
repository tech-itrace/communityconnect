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
        role: row.role,
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
        role: row.role,
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

/**
 * Create a new member
 */
export async function createMember(memberData: {
    phone: string;
    name: string;
    email?: string;
    city?: string;
    working_knowledge?: string;
    degree?: string;
    branch?: string;
    organization_name?: string;
    designation?: string;
    role?: string;
}): Promise<Member> {
    console.log(`[Member Service] Creating member: ${memberData.name}`);

    const {
        phone,
        name,
        email,
        city,
        working_knowledge,
        degree,
        branch,
        organization_name,
        designation,
        role = 'member'
    } = memberData;

    const queryText = `
        INSERT INTO community_members 
        (phone, name, email, city, working_knowledge, degree, branch, organization_name, designation, role, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        RETURNING *
    `;

    const values = [phone, name, email, city, working_knowledge, degree, branch, organization_name, designation, role];
    const result = await query(queryText, values);

    return result.rows[0];
}

/**
 * Update an existing member
 */
export async function updateMember(
    id: string,
    memberData: Partial<{
        name: string;
        email: string;
        city: string;
        working_knowledge: string;
        degree: string;
        branch: string;
        organization_name: string;
        designation: string;
        role: string;
    }>
): Promise<Member | null> {
    console.log(`[Member Service] Updating member ID: ${id}`);

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (memberData.name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(memberData.name);
    }
    if (memberData.email !== undefined) {
        updates.push(`email = $${paramIndex++}`);
        values.push(memberData.email);
    }
    if (memberData.city !== undefined) {
        updates.push(`city = $${paramIndex++}`);
        values.push(memberData.city);
    }
    if (memberData.working_knowledge !== undefined) {
        updates.push(`working_knowledge = $${paramIndex++}`);
        values.push(memberData.working_knowledge);
    }
    if (memberData.degree !== undefined) {
        updates.push(`degree = $${paramIndex++}`);
        values.push(memberData.degree);
    }
    if (memberData.branch !== undefined) {
        updates.push(`branch = $${paramIndex++}`);
        values.push(memberData.branch);
    }
    if (memberData.organization_name !== undefined) {
        updates.push(`organization_name = $${paramIndex++}`);
        values.push(memberData.organization_name);
    }
    if (memberData.designation !== undefined) {
        updates.push(`designation = $${paramIndex++}`);
        values.push(memberData.designation);
    }
    if (memberData.role !== undefined) {
        updates.push(`role = $${paramIndex++}`);
        values.push(memberData.role);
    }

    if (updates.length === 0) {
        // No updates to perform, just return the existing member
        return getMemberById(id);
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const queryText = `
        UPDATE community_members 
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
    `;

    const result = await query(queryText, values);
    
    if (result.rows.length === 0) {
        return null;
    }

    return result.rows[0];
}

/**
 * Delete a member
 */
export async function deleteMember(id: string): Promise<boolean> {
    console.log(`[Member Service] Deleting member ID: ${id}`);

    const queryText = 'DELETE FROM community_members WHERE id = $1 RETURNING id';
    const result = await query(queryText, [id]);

    return result.rows.length > 0;
}

/**
 * Check if a member exists by phone number
 */
export async function getMemberByPhone(phoneNumber: string): Promise<Member | null> {
    console.log(`[Member Service] Fetching member by phone: ${phoneNumber}`);

    const queryText = `
        SELECT * FROM community_members
        WHERE phone = $1
    `;

    const result = await query(queryText, [phoneNumber]);

    if (result.rows.length === 0) {
        return null;
    }

    return result.rows[0];
}

