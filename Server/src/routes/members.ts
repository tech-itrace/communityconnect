/**
 * Members Routes
 * 
 * Routes for member-related endpoints
 */

import { Router } from 'express';
import {
    getMemberByIdHandler,
    getAllMembersHandler,
    getMemberStatsHandler,
    createMemberHandler,
    updateMemberHandler,
    deleteMemberHandler
} from '../controllers/memberController';
import { requireAnyRole, requirePermission } from '../middlewares/authorize';

const router = Router();

/**
 * GET /api/members/stats
 * Get member statistics
 * Note: This must come before /:id to avoid treating 'stats' as an ID
 * Requires: Admin or Super Admin role
 */
router.get('/stats', requireAnyRole(['admin', 'super_admin']), getMemberStatsHandler);

/**
 * GET /api/members
 * List all members with pagination
 * Requires: Admin or Super Admin role
 */
router.get('/', requireAnyRole(['admin', 'super_admin']), getAllMembersHandler);

/**
 * POST /api/members
 * Create a new member
 * Requires: Admin or Super Admin role
 */
router.post('/', requireAnyRole(['admin', 'super_admin']), createMemberHandler);

/**
 * GET /api/members/:id
 * Get a single member by ID
 * Requires: Any authenticated user (member, admin, super_admin)
 */
router.get('/:id', requirePermission('canViewProfile'), getMemberByIdHandler);

/**
 * PUT /api/members/:id
 * Update a member
 * Requires: Admin or Super Admin role
 */
router.put('/:id', requireAnyRole(['admin', 'super_admin']), updateMemberHandler);

/**
 * DELETE /api/members/:id
 * Delete a member
 * Requires: Super Admin role
 */
router.delete('/:id', requireAnyRole(['super_admin']), deleteMemberHandler);

export default router;
