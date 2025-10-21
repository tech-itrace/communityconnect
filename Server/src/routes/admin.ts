/**
 * Admin Routes
 * 
 * Routes for administrative operations (role management, audit logs)
 */

import { Router } from 'express';
import {
    promoteUserHandler,
    demoteUserHandler,
    listAdminsHandler,
    getAuditLogsHandler,
    getAuditStatsHandler,
    exportAuditLogsHandler
} from '../controllers/adminController';
import { requireRole, requireAnyRole } from '../middlewares/authorize';
import { auditAdminActions } from '../middlewares/auditMiddleware';

const router = Router();

// Apply audit logging to all admin routes
router.use(auditAdminActions);

/**
 * POST /api/admin/promote
 * Promote a user to admin or super_admin
 * Requires: super_admin role only
 */
router.post('/promote', requireRole('super_admin'), promoteUserHandler);

/**
 * POST /api/admin/demote
 * Demote a user to member
 * Requires: super_admin role only
 */
router.post('/demote', requireRole('super_admin'), demoteUserHandler);

/**
 * GET /api/admin/list
 * List all admins and super admins
 * Requires: admin or super_admin role
 */
router.get('/list', requireAnyRole(['admin', 'super_admin']), listAdminsHandler);

/**
 * GET /api/admin/audit-logs
 * Get audit logs with filtering
 * Requires: admin or super_admin role
 */
router.get('/audit-logs', requireAnyRole(['admin', 'super_admin']), getAuditLogsHandler);

/**
 * GET /api/admin/audit-stats
 * Get audit statistics
 * Requires: admin or super_admin role
 */
router.get('/audit-stats', requireAnyRole(['admin', 'super_admin']), getAuditStatsHandler);

/**
 * GET /api/admin/audit-export
 * Export audit logs as CSV
 * Requires: super_admin role only
 */
router.get('/audit-export', requireRole('super_admin'), exportAuditLogsHandler);

export default router;
