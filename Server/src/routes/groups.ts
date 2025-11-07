/**
 * Groups Routes - COMPLETE VERSION
 * 
 * Routes for group-related endpoints
 */

import { Router } from 'express';
import {
    getGroupByIdHandler,
    getAllGroupsHandler,
    createGroupHandler,
    updateGroupHandler,
    deleteGroupHandler,
    addMembersToGroupHandler
} from '../controllers/groupController';
import { requireAnyRole } from '../middlewares/authorize';

const router = Router();

/**
 * GET /api/groups
 * List all groups with pagination
 * Requires: Admin or Super Admin role
 */
router.get('/', requireAnyRole(['admin', 'super_admin']), getAllGroupsHandler);

/**
 * POST /api/groups
 * Create a new group
 * Requires: Admin or Super Admin role
 */
router.post('/', requireAnyRole(['admin', 'super_admin']), createGroupHandler);

/**
 * GET /api/groups/:id
 * Get a single group by ID
 * Requires: Admin or Super Admin role
 */
router.get('/:id', requireAnyRole(['admin', 'super_admin']), getGroupByIdHandler);

/**
 * PUT /api/groups/:id
 * Update a group (name and description)
 * Requires: Admin or Super Admin role
 */
router.put('/:id', requireAnyRole(['admin', 'super_admin']), updateGroupHandler);

/**
 * POST /api/groups/:id/members
 * Add new members to a group
 * Creates members in community_members and adds them to the group
 * Requires: Admin or Super Admin role
 */
router.post('/:id/members', requireAnyRole(['admin', 'super_admin']), addMembersToGroupHandler);

/**
 * DELETE /api/groups/:id
 * Delete a group
 * Requires: Super Admin role
 */
router.delete('/:id', requireAnyRole(['super_admin']), deleteGroupHandler);

export default router;