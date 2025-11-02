/**
 * Members Routes
 * 
 * Routes for member-related endpoints
 */

import { Router } from 'express';
import multer from 'multer';
import {
    getMemberByIdHandler,
    getAllMembersHandler,
    getMemberStatsHandler,
    createMemberHandler,
    updateMemberHandler,
    deleteMemberHandler,
    bulkImportMembersHandler
} from '../controllers/memberController';
import { requireAnyRole, requirePermission } from '../middlewares/authorize';

// Configure multer for file upload
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
            cb(null, true);
        } else {
            cb(new Error('Only CSV files are allowed'));
        }
    }
});

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
 * POST /api/members/bulk/import
 * Bulk import members from CSV file
 * Requires: Admin or Super Admin role
 */
router.post('/bulk/import', requireAnyRole(['admin', 'super_admin']), upload.single('file'), bulkImportMembersHandler);

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
