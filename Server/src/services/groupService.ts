/**
 * Group Service
 * 
 * Handles group-related operations:
 * - Get single group by ID
 * - List all groups with pagination
 * - Create new group
 * - Update existing group
 * - Delete group
 */

import { query } from '../config/db';
import {
    PaginationInfo
} from '../utils/types';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

export interface Group {
    id: string;
    name: string;
    description?: string;
    members: string[];
    totalMembers?: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface PaginatedGroups {
    groups: Group[];
    pagination: PaginationInfo;
}

export interface GetGroupsRequest {
    page?: number;
    limit?: number;
}

/**
 * Get a single group by ID
 */
export async function getGroupById(id: string): Promise<Group | null> {
    console.log(`[Group Service] Fetching group with ID: ${id}`);

    const queryText = `
        SELECT 
            id,
            name,
            description,
            members,
            is_active,
            created_at,
            updated_at,
            COALESCE(array_length(members, 1), 0) as total_members
        FROM community_groups
        WHERE id = $1 AND is_active = TRUE
    `;

    const result = await query(queryText, [id]);

    if (result.rows.length === 0) {
        console.log(`[Group Service] Group not found: ${id}`);
        return null;
    }

    const row = result.rows[0];

    return {
        id: row.id,
        name: row.name,
        description: row.description,
        members: row.members || [],
        totalMembers: parseInt(row.total_members) || 0,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

/**
 * Get all groups with pagination
 */
export async function getAllGroups(request: GetGroupsRequest = {}): Promise<PaginatedGroups> {
    const page = request.page || DEFAULT_PAGE;
    const limit = Math.min(request.limit || DEFAULT_LIMIT, MAX_LIMIT);
    const offset = (page - 1) * limit;

    console.log(`[Group Service] Fetching groups - Page: ${page}, Limit: ${limit}`);

    // Build query with member count
    const queryText = `
        SELECT 
            id,
            name,
            description,
            members,
            is_active,
            created_at,
            updated_at,
            COALESCE(array_length(members, 1), 0) as total_members
        FROM community_groups
        WHERE is_active = TRUE
        ORDER BY name ASC
        LIMIT $1 OFFSET $2
    `;

    const result = await query(queryText, [limit, offset]);

    // Map results to Group objects
    const groups: Group[] = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        members: row.members || [],
        totalMembers: parseInt(row.total_members) || 0,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    }));

    // Get total count for pagination
    const countQuery = `
        SELECT COUNT(*) as count
        FROM community_groups
        WHERE is_active = TRUE
    `;

    const countResult = await query(countQuery);
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

    console.log(`[Group Service] Returned ${groups.length} groups (total: ${totalResults})`);

    return {
        groups,
        pagination
    };
}

/**
 * Create a new group
 */
export async function createGroup(groupData: {
    name: string;
    description?: string;
    members?: string[];
}): Promise<Group> {
    console.log(`[Group Service] Creating group: ${groupData.name}`);

    const {
        name,
        description,
        members = []
    } = groupData;

    const queryText = `
        INSERT INTO community_groups 
        (name, description, members, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, TRUE, NOW(), NOW())
        RETURNING 
            id,
            name,
            description,
            members,
            is_active,
            created_at,
            updated_at,
            COALESCE(array_length(members, 1), 0) as total_members
    `;

    const values = [name, description || null, members];
    const result = await query(queryText, values);

    const row = result.rows[0];

    return {
        id: row.id,
        name: row.name,
        description: row.description,
        members: row.members || [],
        totalMembers: parseInt(row.total_members) || 0,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

/**
 * Update an existing group
 */
export async function updateGroup(
    id: string,
    groupData: Partial<{
        name: string;
        description: string;
        members: string[];
    }>
): Promise<Group | null> {
    console.log(`[Group Service] Updating group ID: ${id}`);

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (groupData.name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(groupData.name);
    }
    if (groupData.description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        values.push(groupData.description);
    }
    if (groupData.members !== undefined) {
        updates.push(`members = $${paramIndex++}`);
        values.push(groupData.members);
    }

    if (updates.length === 0) {
        // No updates to perform, just return the existing group
        return getGroupById(id);
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const queryText = `
        UPDATE community_groups 
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex} AND is_active = TRUE
        RETURNING 
            id,
            name,
            description,
            members,
            is_active,
            created_at,
            updated_at,
            COALESCE(array_length(members, 1), 0) as total_members
    `;

    const result = await query(queryText, values);

    if (result.rows.length === 0) {
        return null;
    }

    const row = result.rows[0];

    return {
        id: row.id,
        name: row.name,
        description: row.description,
        members: row.members || [],
        totalMembers: parseInt(row.total_members) || 0,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

/**
 * Delete a group (soft delete by setting is_active to FALSE)
 */
export async function deleteGroup(id: string): Promise<boolean> {
    console.log(`[Group Service] Deleting group ID: ${id}`);

    const queryText = `
        UPDATE community_groups 
        SET is_active = FALSE, updated_at = NOW()
        WHERE id = $1 AND is_active = TRUE
        RETURNING id
    `;
    
    const result = await query(queryText, [id]);

    return result.rows.length > 0;
}

/**
 * Hard delete a group (permanently remove from database)
 * Use with caution - this cannot be undone
 */
export async function hardDeleteGroup(id: string): Promise<boolean> {
    console.log(`[Group Service] Hard deleting group ID: ${id}`);

    const queryText = 'DELETE FROM community_groups WHERE id = $1 RETURNING id';
    const result = await query(queryText, [id]);

    return result.rows.length > 0;
}