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

const router = Router();

/**
 * GET /api/members/stats
 * Get member statistics
 * Note: This must come before /:id to avoid treating 'stats' as an ID
 */
router.get('/stats', getMemberStatsHandler);

/**
 * GET /api/members/:id
 * Get a single member by ID
 */
router.get('/:id', getMemberByIdHandler);

/**
 * GET /api/members
 * List all members with pagination
 */
router.get('/', getAllMembersHandler);

export default router;
