/**
 * Members Routes
 * 
 * Routes for member-related endpoints
 */

import { Router } from 'express';
import {
    getMemberByIdHandler,
    getAllMembersHandler,
    getMemberStatsHandler
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
 * GET /api/members/:id
 * Get a single member by ID
 * Requires: Any authenticated user (member, admin, super_admin)
 */
router.get('/:id', requirePermission('canViewProfile'), getMemberByIdHandler);

/**
 * GET /api/members
 * List all members with pagination
 * Requires: Admin or Super Admin role
 */
router.get('/', requireAnyRole(['admin', 'super_admin']), getAllMembersHandler);

export default router;
