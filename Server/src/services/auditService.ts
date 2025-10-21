/**
 * Audit Service
 * 
 * Handles logging of all administrative actions, permission denials,
 * and important system events for compliance and security monitoring
 */

import pool from '../config/db';
import { Role } from '../utils/types';

export interface AuditLogEntry {
    userId?: string;
    phone?: string;
    userName?: string;
    userRole?: Role;
    action: string;
    resourceType?: string;
    resourceId?: string;
    oldValue?: any;
    newValue?: any;
    ipAddress?: string;
    userAgent?: string;
    status?: 'success' | 'failure';
    errorMessage?: string;
    metadata?: any;
}

export interface AuditLogFilter {
    phone?: string;
    action?: string;
    resourceType?: string;
    status?: 'success' | 'failure';
    startDate?: Date;
    endDate?: Date;
    userRole?: Role;
    limit?: number;
    offset?: number;
}

/**
 * Log an action to the audit trail
 */
export async function logAction(entry: AuditLogEntry): Promise<void> {
    try {
        const query = `
            INSERT INTO audit_logs (
                user_id, phone, user_name, user_role,
                action, resource_type, resource_id,
                old_value, new_value, ip_address, user_agent,
                status, error_message, metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        `;

        const values = [
            entry.userId || null,
            entry.phone || null,
            entry.userName || null,
            entry.userRole || null,
            entry.action,
            entry.resourceType || null,
            entry.resourceId || null,
            entry.oldValue ? JSON.stringify(entry.oldValue) : null,
            entry.newValue ? JSON.stringify(entry.newValue) : null,
            entry.ipAddress || null,
            entry.userAgent || null,
            entry.status || 'success',
            entry.errorMessage || null,
            entry.metadata ? JSON.stringify(entry.metadata) : null
        ];

        await pool.query(query, values);

        // Log to console for immediate visibility
        const emoji = entry.status === 'failure' ? '❌' : '✓';
        console.log(`[Audit] ${emoji} ${entry.action} by ${entry.phone || 'system'} (${entry.userRole || 'unknown'})`);

    } catch (error) {
        console.error('[Audit] Failed to log action:', error);
        // Don't throw - audit logging should never break the main flow
    }
}

/**
 * Log a role change (promotion/demotion)
 */
export async function logRoleChange(
    adminPhone: string,
    adminName: string,
    adminRole: Role,
    targetPhone: string,
    targetName: string,
    oldRole: Role,
    newRole: Role,
    ipAddress?: string
): Promise<void> {
    await logAction({
        phone: adminPhone,
        userName: adminName,
        userRole: adminRole,
        action: oldRole < newRole ? 'role.promote' : 'role.demote',
        resourceType: 'member',
        resourceId: targetPhone,
        oldValue: { role: oldRole, name: targetName },
        newValue: { role: newRole, name: targetName },
        ipAddress,
        status: 'success',
        metadata: {
            targetPhone,
            targetName,
            roleChange: `${oldRole} → ${newRole}`
        }
    });
}

/**
 * Log a permission denial (403 error)
 */
export async function logPermissionDenial(
    phone: string,
    userName: string,
    userRole: Role,
    action: string,
    resourceType?: string,
    reason?: string,
    ipAddress?: string
): Promise<void> {
    await logAction({
        phone,
        userName,
        userRole,
        action: 'permission.denied',
        resourceType,
        status: 'failure',
        errorMessage: reason || 'Access denied',
        ipAddress,
        metadata: {
            attemptedAction: action,
            denialReason: reason
        }
    });
}

/**
 * Log a member-related action (create, update, delete)
 */
export async function logMemberAction(
    adminPhone: string,
    adminName: string,
    adminRole: Role,
    action: 'member.create' | 'member.update' | 'member.delete',
    memberPhone: string,
    oldData?: any,
    newData?: any,
    ipAddress?: string
): Promise<void> {
    await logAction({
        phone: adminPhone,
        userName: adminName,
        userRole: adminRole,
        action,
        resourceType: 'member',
        resourceId: memberPhone,
        oldValue: oldData,
        newValue: newData,
        ipAddress,
        status: 'success'
    });
}

/**
 * Log a search action
 */
export async function logSearch(
    phone: string,
    userName: string,
    userRole: Role,
    query: string,
    resultCount: number,
    searchType: 'natural' | 'structured',
    ipAddress?: string
): Promise<void> {
    await logAction({
        phone,
        userName,
        userRole,
        action: searchType === 'natural' ? 'search.query' : 'search.members',
        resourceType: 'search',
        status: 'success',
        ipAddress,
        metadata: {
            query,
            resultCount,
            searchType
        }
    });
}

/**
 * Log authentication events
 */
export async function logAuth(
    phone: string,
    userName: string,
    action: 'auth.login' | 'auth.logout' | 'auth.failure',
    ipAddress?: string,
    errorMessage?: string
): Promise<void> {
    await logAction({
        phone,
        userName,
        action,
        resourceType: 'auth',
        status: action === 'auth.failure' ? 'failure' : 'success',
        errorMessage,
        ipAddress
    });
}

/**
 * Get audit logs with filtering
 */
export async function getAuditLogs(filter: AuditLogFilter = {}): Promise<any[]> {
    try {
        let query = `
            SELECT 
                id,
                phone,
                user_name,
                user_role,
                action,
                resource_type,
                resource_id,
                old_value,
                new_value,
                ip_address,
                status,
                error_message,
                metadata,
                created_at
            FROM audit_logs
            WHERE 1=1
        `;

        const params: any[] = [];
        let paramCount = 1;

        if (filter.phone) {
            query += ` AND phone = $${paramCount}`;
            params.push(filter.phone);
            paramCount++;
        }

        if (filter.action) {
            query += ` AND action = $${paramCount}`;
            params.push(filter.action);
            paramCount++;
        }

        if (filter.resourceType) {
            query += ` AND resource_type = $${paramCount}`;
            params.push(filter.resourceType);
            paramCount++;
        }

        if (filter.status) {
            query += ` AND status = $${paramCount}`;
            params.push(filter.status);
            paramCount++;
        }

        if (filter.userRole) {
            query += ` AND user_role = $${paramCount}`;
            params.push(filter.userRole);
            paramCount++;
        }

        if (filter.startDate) {
            query += ` AND created_at >= $${paramCount}`;
            params.push(filter.startDate);
            paramCount++;
        }

        if (filter.endDate) {
            query += ` AND created_at <= $${paramCount}`;
            params.push(filter.endDate);
            paramCount++;
        }

        query += ` ORDER BY created_at DESC`;

        if (filter.limit) {
            query += ` LIMIT $${paramCount}`;
            params.push(filter.limit);
            paramCount++;
        }

        if (filter.offset) {
            query += ` OFFSET $${paramCount}`;
            params.push(filter.offset);
            paramCount++;
        }

        const result = await pool.query(query, params);
        return result.rows;

    } catch (error) {
        console.error('[Audit] Failed to get audit logs:', error);
        return [];
    }
}

/**
 * Get audit statistics
 */
export async function getAuditStats(days: number = 7): Promise<any> {
    try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const statsQuery = `
            SELECT 
                COUNT(*) as total_actions,
                COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_actions,
                COUNT(CASE WHEN status = 'failure' THEN 1 END) as failed_actions,
                COUNT(DISTINCT phone) as unique_users,
                COUNT(CASE WHEN action LIKE 'role.%' THEN 1 END) as role_changes,
                COUNT(CASE WHEN action = 'permission.denied' THEN 1 END) as permission_denials,
                COUNT(CASE WHEN action LIKE 'search.%' THEN 1 END) as searches,
                COUNT(CASE WHEN action LIKE 'member.%' THEN 1 END) as member_actions
            FROM audit_logs
            WHERE created_at >= $1
        `;

        const result = await pool.query(statsQuery, [startDate]);
        return result.rows[0];

    } catch (error) {
        console.error('[Audit] Failed to get stats:', error);
        return null;
    }
}

/**
 * Get most active users
 */
export async function getMostActiveUsers(limit: number = 10, days: number = 7): Promise<any[]> {
    try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const query = `
            SELECT 
                phone,
                user_name,
                user_role,
                COUNT(*) as action_count,
                COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_actions,
                COUNT(CASE WHEN status = 'failure' THEN 1 END) as failed_actions,
                MAX(created_at) as last_action
            FROM audit_logs
            WHERE created_at >= $1
            GROUP BY phone, user_name, user_role
            ORDER BY action_count DESC
            LIMIT $2
        `;

        const result = await pool.query(query, [startDate, limit]);
        return result.rows;

    } catch (error) {
        console.error('[Audit] Failed to get active users:', error);
        return [];
    }
}

/**
 * Export audit logs as CSV
 */
export async function exportAuditReport(filter: AuditLogFilter = {}): Promise<string> {
    try {
        const logs = await getAuditLogs(filter);

        if (logs.length === 0) {
            return 'No audit logs found for the specified criteria';
        }

        // CSV header
        let csv = 'ID,Phone,User Name,Role,Action,Resource Type,Resource ID,Status,Error,IP Address,Timestamp\n';

        // CSV rows
        for (const log of logs) {
            const row = [
                log.id,
                log.phone || '',
                log.user_name || '',
                log.user_role || '',
                log.action,
                log.resource_type || '',
                log.resource_id || '',
                log.status,
                log.error_message || '',
                log.ip_address || '',
                log.created_at
            ];

            // Escape quotes and wrap in quotes
            const escapedRow = row.map(field => {
                const str = String(field);
                if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                    return `"${str.replace(/"/g, '""')}"`;
                }
                return str;
            });

            csv += escapedRow.join(',') + '\n';
        }

        return csv;

    } catch (error) {
        console.error('[Audit] Failed to export report:', error);
        throw error;
    }
}

/**
 * Clean up old audit logs (retention policy)
 */
export async function cleanOldLogs(retentionDays: number = 90): Promise<number> {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

        const result = await pool.query(
            'DELETE FROM audit_logs WHERE created_at < $1',
            [cutoffDate]
        );

        const deletedCount = result.rowCount || 0;
        console.log(`[Audit] Cleaned ${deletedCount} logs older than ${retentionDays} days`);

        return deletedCount;

    } catch (error) {
        console.error('[Audit] Failed to clean old logs:', error);
        return 0;
    }
}
