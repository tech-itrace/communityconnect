/**
 * Admin Controller
 * 
 * Handles admin operations: role management, audit logs, user management
 */

import { Request, Response } from 'express';
import pool from '../config/db';
import { Role } from '../utils/types';
import { logRoleChange } from '../services/auditService';
import { getAuditLogs, getAuditStats, getMostActiveUsers, exportAuditReport, AuditLogFilter } from '../services/auditService';
import { PAGINATION } from '../config/constants';

/**
 * Promote a user to admin or super_admin
 * POST /api/admin/promote
 */
export async function promoteUserHandler(req: Request, res: Response) {
    try {
        const { phone, role } = req.body;

        if (!phone || !role) {
            return res.status(400).json({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Phone and role are required'
                }
            });
        }

        if (!['admin', 'super_admin'].includes(role)) {
            return res.status(400).json({
                error: {
                    code: 'INVALID_ROLE',
                    message: 'Role must be admin or super_admin'
                }
            });
        }

        // Get current user info
        const userQuery = await pool.query(
            'SELECT name, role FROM community_members WHERE phone = $1',
            [phone]
        );

        if (userQuery.rows.length === 0) {
            return res.status(404).json({
                error: {
                    code: 'USER_NOT_FOUND',
                    message: 'User not found'
                }
            });
        }

        const currentUser = userQuery.rows[0];
        const oldRole: Role = currentUser.role || 'member';

        // Prevent demoting super_admin unless requester is super_admin
        if (oldRole === 'super_admin' && req.user?.role !== 'super_admin') {
            return res.status(403).json({
                error: {
                    code: 'FORBIDDEN',
                    message: 'Only super admins can modify super admin roles'
                }
            });
        }

        // Update role
        await pool.query(
            'UPDATE community_members SET role = $1 WHERE phone = $2',
            [role, phone]
        );

        // Log the role change
        await logRoleChange(
            req.user!.phoneNumber,
            req.user!.memberName,
            req.user!.role,
            phone,
            currentUser.name,
            oldRole,
            role as Role,
            req.ip
        );

        res.json({
            success: true,
            message: `User ${currentUser.name} promoted to ${role}`,
            data: {
                phone,
                name: currentUser.name,
                oldRole,
                newRole: role
            }
        });

    } catch (error) {
        console.error('Error promoting user:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to promote user'
            }
        });
    }
}

/**
 * Demote a user to member
 * POST /api/admin/demote
 */
export async function demoteUserHandler(req: Request, res: Response) {
    try {
        const { phone } = req.body;

        if (!phone) {
            return res.status(400).json({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Phone is required'
                }
            });
        }

        // Get current user info
        const userQuery = await pool.query(
            'SELECT name, role FROM community_members WHERE phone = $1',
            [phone]
        );

        if (userQuery.rows.length === 0) {
            return res.status(404).json({
                error: {
                    code: 'USER_NOT_FOUND',
                    message: 'User not found'
                }
            });
        }

        const currentUser = userQuery.rows[0];
        const oldRole: Role = currentUser.role || 'member';

        // Prevent self-demotion
        if (phone === req.user?.phoneNumber) {
            return res.status(400).json({
                error: {
                    code: 'SELF_DEMOTION',
                    message: 'You cannot demote yourself'
                }
            });
        }

        // Prevent demoting super_admin unless requester is super_admin
        if (oldRole === 'super_admin' && req.user?.role !== 'super_admin') {
            return res.status(403).json({
                error: {
                    code: 'FORBIDDEN',
                    message: 'Only super admins can demote super admins'
                }
            });
        }

        // Demote to member
        await pool.query(
            'UPDATE community_members SET role = $1 WHERE phone = $2',
            ['member', phone]
        );

        // Log the role change
        await logRoleChange(
            req.user!.phoneNumber,
            req.user!.memberName,
            req.user!.role,
            phone,
            currentUser.name,
            oldRole,
            'member',
            req.ip
        );

        res.json({
            success: true,
            message: `User ${currentUser.name} demoted to member`,
            data: {
                phone,
                name: currentUser.name,
                oldRole,
                newRole: 'member'
            }
        });

    } catch (error) {
        console.error('Error demoting user:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to demote user'
            }
        });
    }
}

/**
 * List all admins and super admins
 * GET /api/admin/list
 */
export async function listAdminsHandler(req: Request, res: Response) {
    try {
        const result = await pool.query(`
            SELECT 
                phone,
                name,
                role,
                email,
                location
            FROM community_members
            WHERE role IN ('admin', 'super_admin')
            ORDER BY 
                CASE role 
                    WHEN 'super_admin' THEN 1 
                    WHEN 'admin' THEN 2 
                END,
                name
        `);

        res.json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });

    } catch (error) {
        console.error('Error listing admins:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to list admins'
            }
        });
    }
}

/**
 * Get audit logs with filtering
 * GET /api/admin/audit-logs
 */
export async function getAuditLogsHandler(req: Request, res: Response) {
    try {
        const filter: AuditLogFilter = {
            phone: req.query.phone as string,
            action: req.query.action as string,
            resourceType: req.query.resourceType as string,
            status: req.query.status as 'success' | 'failure',
            userRole: req.query.userRole as Role,
            limit: req.query.limit ? parseInt(req.query.limit as string) : PAGINATION.MAX_LIMIT,
            offset: req.query.offset ? parseInt(req.query.offset as string) : 0
        };

        // Parse dates if provided
        if (req.query.startDate) {
            filter.startDate = new Date(req.query.startDate as string);
        }
        if (req.query.endDate) {
            filter.endDate = new Date(req.query.endDate as string);
        }

        const logs = await getAuditLogs(filter);

        res.json({
            success: true,
            count: logs.length,
            filter,
            data: logs
        });

    } catch (error) {
        console.error('Error getting audit logs:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to get audit logs'
            }
        });
    }
}

/**
 * Get audit statistics
 * GET /api/admin/audit-stats
 */
export async function getAuditStatsHandler(req: Request, res: Response) {
    try {
        const days = req.query.days ? parseInt(req.query.days as string) : 7;

        const stats = await getAuditStats(days);
        const activeUsers = await getMostActiveUsers(10, days);

        res.json({
            success: true,
            period: `Last ${days} days`,
            stats,
            mostActiveUsers: activeUsers
        });

    } catch (error) {
        console.error('Error getting audit stats:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to get audit statistics'
            }
        });
    }
}

/**
 * Export audit logs as CSV
 * GET /api/admin/audit-export
 */
export async function exportAuditLogsHandler(req: Request, res: Response) {
    try {
        const filter: AuditLogFilter = {
            phone: req.query.phone as string,
            action: req.query.action as string,
            resourceType: req.query.resourceType as string,
            status: req.query.status as 'success' | 'failure',
            userRole: req.query.userRole as Role
        };

        // Parse dates if provided
        if (req.query.startDate) {
            filter.startDate = new Date(req.query.startDate as string);
        }
        if (req.query.endDate) {
            filter.endDate = new Date(req.query.endDate as string);
        }

        const csv = await exportAuditReport(filter);

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=audit-logs.csv');
        res.send(csv);

    } catch (error) {
        console.error('Error exporting audit logs:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to export audit logs'
            }
        });
    }
}
