/**
 * Group Controller
 * 
 * Handles group-related API endpoints
 */

import { Request, Response } from 'express';
import {
    getGroupById,
    getAllGroups,
    createGroup,
    updateGroup,
    deleteGroup,
    addMembersToGroup
} from '../services/groupService';
import { ApiErrorResponse } from '../utils/types';

/**
 * GET /api/groups/:id
 * Get a single group by ID
 */
export async function getGroupByIdHandler(req: Request, res: Response) {
    try {
        const { id } = req.params;

        console.log(`[Group Controller] Fetching group: ${id}`);

        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(id)) {
            const errorResponse: ApiErrorResponse = {
                success: false,
                error: {
                    code: 'INVALID_ID',
                    message: 'Invalid group ID format',
                    details: 'Group ID must be a valid UUID'
                }
            };
            return res.status(400).json(errorResponse);
        }

        const group = await getGroupById(id);

        if (!group) {
            const errorResponse: ApiErrorResponse = {
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Group not found',
                    details: `No group exists with ID: ${id}`
                }
            };
            return res.status(404).json(errorResponse);
        }

        res.json({
            success: true,
            group
        });

    } catch (error: any) {
        console.error('[Group Controller] Error fetching group:', error);

        const errorResponse: ApiErrorResponse = {
            success: false,
            error: {
                code: 'SERVER_ERROR',
                message: 'Failed to fetch group',
                details: error.message
            }
        };

        res.status(500).json(errorResponse);
    }
}

/**
 * GET /api/groups
 * List all groups with pagination
 */
export async function getAllGroupsHandler(req: Request, res: Response) {
    try {
        const page = req.query.page ? parseInt(req.query.page as string) : 1;
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

        console.log('[Group Controller] Fetching groups:', { page, limit });

        // Validate parameters
        if (page < 1) {
            const errorResponse: ApiErrorResponse = {
                success: false,
                error: {
                    code: 'INVALID_PARAMETERS',
                    message: 'Invalid parameters',
                    details: { page: 'Page must be a positive integer' }
                }
            };
            return res.status(400).json(errorResponse);
        }

        if (limit < 1 || limit > 100) {
            const errorResponse: ApiErrorResponse = {
                success: false,
                error: {
                    code: 'INVALID_PARAMETERS',
                    message: 'Invalid parameters',
                    details: { limit: 'Limit must be between 1 and 100' }
                }
            };
            return res.status(400).json(errorResponse);
        }

        const result = await getAllGroups({ page, limit });

        res.json({
            success: true,
            ...result
        });

    } catch (error: any) {
        console.error('[Group Controller] Error fetching groups:', error);

        const errorResponse: ApiErrorResponse = {
            success: false,
            error: {
                code: 'SERVER_ERROR',
                message: 'Failed to fetch groups',
                details: error.message
            }
        };

        res.status(500).json(errorResponse);
    }
}

/**
 * POST /api/groups
 * Create a new group
 * Requires: Admin or Super Admin role
 */
export async function createGroupHandler(req: Request, res: Response) {
    try {
        const {
            name,
            description
        } = req.body;

        // Validate required fields
        if (!name) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Group name is required'
                }
            });
        }

        console.log(`[Group Controller] Creating group: ${name}`);

        // Create the group (without members initially)
        const newGroup = await createGroup({
            name,
            description,
            members: []
        });

        res.status(201).json({
            success: true,
            group: newGroup
        });

    } catch (error: any) {
        console.error('[Group Controller] Error creating group:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'SERVER_ERROR',
                message: 'Failed to create group',
                details: error.message
            }
        });
    }
}

/**
 * PUT /api/groups/:id
 * Update an existing group (name and description only)
 * Requires: Admin or Super Admin role
 */
export async function updateGroupHandler(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const {
            name,
            description
        } = req.body;

        console.log(`[Group Controller] Updating group ID: ${id}`);

        // Check if group exists
        const existingGroup = await getGroupById(id);

        if (!existingGroup) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'GROUP_NOT_FOUND',
                    message: 'Group not found'
                }
            });
        }

        // Update the group name and description only
        const updatedGroup = await updateGroup(id, {
            name,
            description
        });

        res.json({
            success: true,
            group: updatedGroup
        });

    } catch (error: any) {
        console.error('[Group Controller] Error updating group:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'SERVER_ERROR',
                message: 'Failed to update group',
                details: error.message
            }
        });
    }
}

/**
 * POST /api/groups/:id/members
 * Add new members to a group
 * Creates members in community_members and adds them to the group
 * Requires: Admin or Super Admin role
 * 
 * Body: {
 *   members: [
 *     { name: string, phone: string, email?: string },
 *     ...
 *   ]
 * }
 */
export async function addMembersToGroupHandler(req: Request, res: Response) {
    console.log(`[Group Controller] Adding members...`);
    try {
        const { id } = req.params;
        const { members } = req.body;

        console.log(`[Group Controller] Adding ${members?.length || 0} members to group ID: ${id}`);

        // Validate members array
        if (!Array.isArray(members) || members.length === 0) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Members array is required and must not be empty'
                }
            });
        }

        // Validate each member has required fields
        for (const member of members) {
            if (!member.name || !member.phone) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Each member must have name and phone'
                    }
                });
            }
        }

        // Check if group exists
        const existingGroup = await getGroupById(id);

        if (!existingGroup) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'GROUP_NOT_FOUND',
                    message: 'Group not found'
                }
            });
        }

        // Add members to group (creates members in DB and adds to group)
        const result = await addMembersToGroup(id, members);

        res.status(201).json({
            success: true,
            message: `Successfully added ${result.successCount} member(s) to group`,
            data: {
                successCount: result.successCount,
                failedCount: result.failedCount,
                duplicates: result.duplicates,
                memberIds: result.memberIds,
                errors: result.errors.slice(0, 10) // Return first 10 errors
            }
        });

    } catch (error: any) {
        console.error('[Group Controller] Error adding members to group:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'SERVER_ERROR',
                message: 'Failed to add members to group',
                details: error.message
            }
        });
    }
}

/**
 * DELETE /api/groups/:id
 * Delete a group
 * Requires: Super Admin role
 */
export async function deleteGroupHandler(req: Request, res: Response) {
    try {
        const { id } = req.params;

        console.log(`[Group Controller] Deleting group ID: ${id}`);

        // Check if group exists
        const existingGroup = await getGroupById(id);

        if (!existingGroup) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'GROUP_NOT_FOUND',
                    message: 'Group not found'
                }
            });
        }

        // Delete the group
        const deleted = await deleteGroup(id);

        if (!deleted) {
            throw new Error('Failed to delete group');
        }

        res.json({
            success: true,
            message: 'Group deleted successfully'
        });

    } catch (error: any) {
        console.error('[Group Controller] Error deleting group:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'SERVER_ERROR',
                message: 'Failed to delete group',
                details: error.message
            }
        });
    }
}