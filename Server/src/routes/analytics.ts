/**
 * Analytics Routes
 * 
 * Routes for analytics and dashboard statistics
 */

import { Router } from 'express';
import {
    getOverviewHandler,
    getActivityHandler,
    getSearchTrendsHandler,
    getRoleDistributionHandler,
    getUserActivityHandler
} from '../controllers/analyticsController';
import { requireAnyRole, requirePermission } from '../middlewares/authorize';

const router = Router();

/**
 * GET /api/analytics/overview
 * Get overall system statistics
 * Requires: canViewAnalytics permission (admin or super_admin)
 */
router.get('/overview', requirePermission('canViewAnalytics'), getOverviewHandler);

/**
 * GET /api/analytics/activity
 * Get activity trends over time
 * Requires: canViewAnalytics permission (admin or super_admin)
 */
router.get('/activity', requirePermission('canViewAnalytics'), getActivityHandler);

/**
 * GET /api/analytics/search-trends
 * Get search trends and popular queries
 * Requires: canViewAnalytics permission (admin or super_admin)
 */
router.get('/search-trends', requirePermission('canViewAnalytics'), getSearchTrendsHandler);

/**
 * GET /api/analytics/role-distribution
 * Get role distribution and changes over time
 * Requires: canViewAnalytics permission (admin or super_admin)
 */
router.get('/role-distribution', requirePermission('canViewAnalytics'), getRoleDistributionHandler);

/**
 * GET /api/analytics/user-activity/:phone
 * Get detailed activity for a specific user
 * Requires: admin or super_admin role
 */
router.get('/user-activity/:phone', requireAnyRole(['admin', 'super_admin']), getUserActivityHandler);

export default router;
