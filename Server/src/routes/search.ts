/**
 * Search Routes
 * 
 * Routes for search-related endpoints
 */

import { Router } from 'express';
import { searchMembersHandler } from '../controllers/searchController';
import { getSuggestionsHandler } from '../controllers/memberController';
import { processNLQueryHandler } from '../controllers/nlSearchController';

const router = Router();

/**
 * POST /api/search/query
 * Process natural language search query
 */
router.post('/query', processNLQueryHandler);

/**
 * POST /api/search/members
 * Search for community members (structured search)
 */
router.post('/members', searchMembersHandler);

/**
 * GET /api/search/suggestions
 * Get autocomplete suggestions
 */
router.get('/suggestions', getSuggestionsHandler);

export default router;
