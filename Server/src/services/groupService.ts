import { query, getClient } from '../config/db';
import { PaginationInfo } from '../utils/types';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

export interface GroupMember {
    id: string;
    name: string;
    phone: string;
    email?: string;
}

export interface Group {
    id: string;
    name: string;
    description?: string;
    members: GroupMember[]; // Full member objects
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
 * Get a single group by ID with full member details
 */
export async function getGroupById(id: string): Promise<Group | null> {
    console.log(`[Group Service] Fetching group with ID: ${id}`);

    const queryText = `
        SELECT 
            g.id,
            g.name,
            g.description,
            g.is_active,
            g.created_at,
            g.updated_at,
            COALESCE(
                json_agg(
                    json_build_object(
                        'id', m.id,
                        'name', m.name,
                        'phone', m.phone,
                        'email', m.email
                    ) ORDER BY m.name
                ) FILTER (WHERE m.id IS NOT NULL),
                '[]'::json
            ) as members
        FROM community_groups g
        LEFT JOIN unnest(g.members) member_id ON TRUE
        LEFT JOIN community_members m ON m.id = member_id AND m.is_active = TRUE
        WHERE g.id = $1 AND g.is_active = TRUE
        GROUP BY g.id, g.name, g.description, g.is_active, g.created_at, g.updated_at
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
        totalMembers: row.members ? row.members.length : 0,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

/**
 * Get all groups with pagination and full member details
 */
export async function getAllGroups(request: GetGroupsRequest = {}): Promise<PaginatedGroups> {
    const page = request.page || DEFAULT_PAGE;
    const limit = Math.min(request.limit || DEFAULT_LIMIT, MAX_LIMIT);
    const offset = (page - 1) * limit;

    console.log(`[Group Service] Fetching groups - Page: ${page}, Limit: ${limit}`);

    const queryText = `
        SELECT 
            g.id,
            g.name,
            g.description,
            g.is_active,
            g.created_at,
            g.updated_at,
            COALESCE(
                json_agg(
                    json_build_object(
                        'id', m.id,
                        'name', m.name,
                        'phone', m.phone,
                        'email', m.email
                    ) ORDER BY m.name
                ) FILTER (WHERE m.id IS NOT NULL),
                '[]'::json
            ) as members
        FROM community_groups g
        LEFT JOIN unnest(g.members) member_id ON TRUE
        LEFT JOIN community_members m ON m.id = member_id AND m.is_active = TRUE
        WHERE g.is_active = TRUE
        GROUP BY g.id, g.name, g.description, g.is_active, g.created_at, g.updated_at
        ORDER BY g.name ASC
        LIMIT $1 OFFSET $2
    `;

    const result = await query(queryText, [limit, offset]);

    const groups: Group[] = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        members: row.members || [],
        totalMembers: row.members ? row.members.length : 0,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    }));

    // Get total count
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
        RETURNING id
    `;

    const values = [name, description || null, members];
    const result = await query(queryText, values);

    const groupId = result.rows[0].id;

    // Fetch the created group with full member details
    const createdGroup = await getGroupById(groupId);
    
    if (!createdGroup) {
        throw new Error('Failed to retrieve created group');
    }

    return createdGroup;
}

/**
 * Update an existing group
 */
export async function updateGroup(
    id: string,
    groupData: Partial<{
        name: string;
        description: string;
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
        RETURNING id
    `;

    const result = await query(queryText, values);

    if (result.rows.length === 0) {
        return null;
    }

    // Fetch the updated group with full member details
    return getGroupById(id);
}

/**
 * Add new members to a group
 * Creates members in community_members table and adds their IDs to the group
 * Now properly appends to existing members without duplicates
 */
export async function addMembersToGroup(
    groupId: string,
    members: Array<{ name: string; phone: string; email?: string }>
): Promise<{
    successCount: number;
    failedCount: number;
    duplicates: number;
    memberIds: string[];
    errors: Array<{ index: number; error: string; data: any }>;
}> {
    console.log(`[Group Service] Adding ${members.length} members to group: ${groupId}`);

    const client = await getClient();
    
    try {
        await client.query('BEGIN');

        // Get current group members
        const groupQuery = 'SELECT members FROM community_groups WHERE id = $1 AND is_active = TRUE';
        const groupResult = await client.query(groupQuery, [groupId]);
        
        if (groupResult.rows.length === 0) {
            throw new Error('Group not found');
        }

        const existingMemberIds = groupResult.rows[0].members || [];
        console.log(`[Group Service] Group has ${existingMemberIds.length} existing members`);

        let successCount = 0;
        let failedCount = 0;
        let duplicates = 0;
        const newMemberIds: string[] = [];
        const errors: Array<{ index: number; error: string; data: any }> = [];

        // Process each member
        for (let i = 0; i < members.length; i++) {
            const member = members[i];

            try {
                // Check if member already exists by phone
                const checkQuery = `
                    SELECT id FROM community_members
                    WHERE phone = $1 AND is_active = TRUE
                `;
                const existingMember = await client.query(checkQuery, [member.phone]);

                let memberId: string;

                if (existingMember.rows.length > 0) {
                    // Member exists, use existing ID
                    memberId = existingMember.rows[0].id;
                    
                    // Check if already in group
                    if (existingMemberIds.includes(memberId)) {
                        duplicates++;
                        console.log(`[Group Service] Member already in group: ${member.name} (${member.phone})`);
                        continue; // Skip this member
                    }
                    
                    console.log(`[Group Service] Using existing member: ${member.name} (${member.phone})`);
                } else {
                    // Create new member
                    const insertQuery = `
                        INSERT INTO community_members 
                        (phone, name, email, role, is_active, created_at, updated_at)
                        VALUES ($1, $2, $3, 'member', TRUE, NOW(), NOW())
                        RETURNING id
                    `;
                    
                    const newMember = await client.query(insertQuery, [
                        member.phone,
                        member.name,
                        member.email || null
                    ]);

                    memberId = newMember.rows[0].id;
                    console.log(`[Group Service] Created new member: ${member.name} (ID: ${memberId})`);
                }

                newMemberIds.push(memberId);
                successCount++;

            } catch (error: any) {
                failedCount++;
                errors.push({
                    index: i,
                    error: error.message || 'Unknown error',
                    data: member
                });
                console.error(`[Group Service] Error processing member ${i}:`, error);
            }
        }

        // Update group to append new member IDs to existing ones
        if (newMemberIds.length > 0) {
            const updateGroupQuery = `
                UPDATE community_groups
                SET members = array_cat(
                    COALESCE(members, ARRAY[]::UUID[]),
                    $1::UUID[]
                ),
                updated_at = NOW()
                WHERE id = $2 AND is_active = TRUE
            `;

            await client.query(updateGroupQuery, [newMemberIds, groupId]);
            console.log(`[Group Service] Appended ${newMemberIds.length} member IDs to group ${groupId}`);
        }

        await client.query('COMMIT');

        console.log(`[Group Service] Members added: ${successCount} success, ${failedCount} failed, ${duplicates} duplicates`);

        return {
            successCount,
            failedCount,
            duplicates,
            memberIds: newMemberIds,
            errors
        };

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('[Group Service] Transaction failed, rolling back:', error);
        throw error;
    } finally {
        client.release();
    }
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