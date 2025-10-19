/**
 * Search Routes
 * 
 * Routes for search-related endpoints
 */

import { Router } from 'express';
import { searchMembersHandler } from '../controllers/searchController';
import { getSuggestionsHandler } from '../controllers/memberController';

const router = Router();

/**
 * POST /api/search/members
 * Search for community members
 */
router.post('/members', searchMembersHandler);

/**
 * GET /api/search/suggestions
 * Get autocomplete suggestions
 */
router.get('/suggestions', getSuggestionsHandler);

export default router;
