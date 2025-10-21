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
import { requirePermission } from '../middlewares/authorize';

const router = Router();

/**
 * POST /api/search/query
 * Process natural language search query
 * Rate limit: 30 searches per hour
 * Requires: canSearch permission (all authenticated users)
 */
router.post('/query', rateLimiters.search, requirePermission('canSearch'), processNLQueryHandler);

/**
 * POST /api/search/members
 * Search for community members (structured search)
 * Rate limit: 30 searches per hour
 * Requires: canSearch permission (all authenticated users)
 */
router.post('/members', rateLimiters.search, requirePermission('canSearch'), searchMembersHandler);

/**
 * GET /api/search/suggestions
 * Get autocomplete suggestions
 * Rate limit: 30 per hour (uses same search limit)
 * Requires: canSearch permission (all authenticated users)
 */
router.get('/suggestions', rateLimiters.search, requirePermission('canSearch'), getSuggestionsHandler);

export default router;
