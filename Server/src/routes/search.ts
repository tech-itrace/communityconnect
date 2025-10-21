/**
 * Search Routes
 * 
 * Routes for search-related endpoints with rate limiting
 */

import { Router } from 'express';
import { searchMembersHandler } from '../controllers/searchController';
import { getSuggestionsHandler } from '../controllers/memberController';
import { processNLQueryHandler } from '../controllers/nlSearchController';
import { rateLimiters } from '../middlewares/rateLimiter';

const router = Router();

/**
 * POST /api/search/query
 * Process natural language search query
 * Rate limit: 30 searches per hour
 */
router.post('/query', rateLimiters.search, processNLQueryHandler);

/**
 * POST /api/search/members
 * Search for community members (structured search)
 * Rate limit: 30 searches per hour
 */
router.post('/members', rateLimiters.search, searchMembersHandler);

/**
 * GET /api/search/suggestions
 * Get autocomplete suggestions
 * Rate limit: 30 per hour (uses same search limit)
 */
router.get('/suggestions', rateLimiters.search, getSuggestionsHandler);

export default router;
