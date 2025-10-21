/**
 * Analytics Controller
 * 
 * Handles analytics and dashboard statistics
 */

import { Request, Response } from 'express';
import pool from '../config/db';

/**
 * GET /api/analytics/overview
 * Get overall system statistics
 */
export async function getOverviewHandler(req: Request, res: Response) {
    try {
        // Member statistics
        const memberStats = await pool.query(`
            SELECT 
                COUNT(*) as total_members,
                COUNT(CASE WHEN role = 'member' THEN 1 END) as members,
                COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins,
                COUNT(CASE WHEN role = 'super_admin' THEN 1 END) as super_admins,
                COUNT(CASE WHEN location IS NOT NULL AND location != '' THEN 1 END) as members_with_location,
                COUNT(CASE WHEN email IS NOT NULL AND email != '' THEN 1 END) as members_with_email
            FROM community_members
        `);

        // Recent activity (last 24 hours)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentActivity = await pool.query(`
            SELECT 
                COUNT(*) as total_actions,
                COUNT(CASE WHEN action LIKE 'search.%' THEN 1 END) as searches,
                COUNT(CASE WHEN action LIKE 'member.%' THEN 1 END) as member_actions,
                COUNT(CASE WHEN action LIKE 'role.%' THEN 1 END) as role_changes,
                COUNT(DISTINCT phone) as active_users
            FROM audit_logs
            WHERE created_at >= $1
        `, [oneDayAgo]);

        // Skills distribution (top 10)
        const skillsQuery = await pool.query(`
            SELECT 
                skill,
                COUNT(*) as count
            FROM community_members
            WHERE skill IS NOT NULL AND skill != ''
            GROUP BY skill
            ORDER BY count DESC
            LIMIT 10
        `);

        res.json({
            success: true,
            data: {
                members: memberStats.rows[0],
                recentActivity: recentActivity.rows[0],
                topSkills: skillsQuery.rows
            }
        });

    } catch (error) {
        console.error('Error getting overview:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to get overview statistics'
            }
        });
    }
}

/**
 * GET /api/analytics/activity
 * Get activity trends over time
 */
export async function getActivityHandler(req: Request, res: Response) {
    try {
        const days = req.query.days ? parseInt(req.query.days as string) : 7;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // Daily activity breakdown
        const dailyActivity = await pool.query(`
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as total_actions,
                COUNT(CASE WHEN action LIKE 'search.%' THEN 1 END) as searches,
                COUNT(CASE WHEN action LIKE 'member.%' THEN 1 END) as member_actions,
                COUNT(CASE WHEN status = 'failure' THEN 1 END) as failures,
                COUNT(DISTINCT phone) as unique_users
            FROM audit_logs
            WHERE created_at >= $1
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        `, [startDate]);

        // Hourly activity (last 24 hours) for today
        const hourlyActivity = await pool.query(`
            SELECT 
                EXTRACT(HOUR FROM created_at) as hour,
                COUNT(*) as action_count
            FROM audit_logs
            WHERE created_at >= NOW() - INTERVAL '24 hours'
            GROUP BY EXTRACT(HOUR FROM created_at)
            ORDER BY hour
        `);

        res.json({
            success: true,
            period: `Last ${days} days`,
            data: {
                daily: dailyActivity.rows,
                hourly: hourlyActivity.rows
            }
        });

    } catch (error) {
        console.error('Error getting activity:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to get activity data'
            }
        });
    }
}

/**
 * GET /api/analytics/search-trends
 * Get search trends and popular queries
 */
export async function getSearchTrendsHandler(req: Request, res: Response) {
    try {
        const days = req.query.days ? parseInt(req.query.days as string) : 7;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // Search volume over time
        const searchVolume = await pool.query(`
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as search_count,
                COUNT(DISTINCT phone) as unique_searchers,
                COUNT(CASE WHEN action = 'search.query' THEN 1 END) as natural_searches,
                COUNT(CASE WHEN action = 'search.members' THEN 1 END) as structured_searches
            FROM audit_logs
            WHERE created_at >= $1
              AND action LIKE 'search.%'
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        `, [startDate]);

        // Most active searchers
        const topSearchers = await pool.query(`
            SELECT 
                phone,
                user_name,
                COUNT(*) as search_count,
                MAX(created_at) as last_search
            FROM audit_logs
            WHERE created_at >= $1
              AND action LIKE 'search.%'
            GROUP BY phone, user_name
            ORDER BY search_count DESC
            LIMIT 10
        `, [startDate]);

        // Popular search queries (from metadata)
        const popularQueries = await pool.query(`
            SELECT 
                metadata->>'query' as query,
                COUNT(*) as frequency,
                AVG((metadata->>'resultCount')::int) as avg_results
            FROM audit_logs
            WHERE created_at >= $1
              AND action = 'search.query'
              AND metadata IS NOT NULL
              AND metadata->>'query' IS NOT NULL
            GROUP BY metadata->>'query'
            ORDER BY frequency DESC
            LIMIT 20
        `, [startDate]);

        res.json({
            success: true,
            period: `Last ${days} days`,
            data: {
                volume: searchVolume.rows,
                topSearchers: topSearchers.rows,
                popularQueries: popularQueries.rows
            }
        });

    } catch (error) {
        console.error('Error getting search trends:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to get search trends'
            }
        });
    }
}

/**
 * GET /api/analytics/role-distribution
 * Get role distribution and changes over time
 */
export async function getRoleDistributionHandler(req: Request, res: Response) {
    try {
        // Current role distribution
        const distribution = await pool.query(`
            SELECT 
                role,
                COUNT(*) as count
            FROM community_members
            GROUP BY role
            ORDER BY 
                CASE role
                    WHEN 'super_admin' THEN 1
                    WHEN 'admin' THEN 2
                    WHEN 'member' THEN 3
                END
        `);

        // Recent role changes
        const days = req.query.days ? parseInt(req.query.days as string) : 30;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const roleChanges = await pool.query(`
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as change_count,
                COUNT(CASE WHEN action = 'role.promote' THEN 1 END) as promotions,
                COUNT(CASE WHEN action = 'role.demote' THEN 1 END) as demotions
            FROM audit_logs
            WHERE created_at >= $1
              AND action IN ('role.promote', 'role.demote')
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        `, [startDate]);

        res.json({
            success: true,
            data: {
                distribution: distribution.rows,
                recentChanges: roleChanges.rows
            }
        });

    } catch (error) {
        console.error('Error getting role distribution:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to get role distribution'
            }
        });
    }
}

/**
 * GET /api/analytics/user-activity/:phone
 * Get detailed activity for a specific user
 */
export async function getUserActivityHandler(req: Request, res: Response) {
    try {
        const { phone } = req.params;
        const days = req.query.days ? parseInt(req.query.days as string) : 30;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // User info
        const userInfo = await pool.query(
            'SELECT name, role, email, location FROM community_members WHERE phone = $1',
            [phone]
        );

        if (userInfo.rows.length === 0) {
            return res.status(404).json({
                error: {
                    code: 'USER_NOT_FOUND',
                    message: 'User not found'
                }
            });
        }

        // Activity summary
        const activitySummary = await pool.query(`
            SELECT 
                COUNT(*) as total_actions,
                COUNT(CASE WHEN action LIKE 'search.%' THEN 1 END) as searches,
                COUNT(CASE WHEN action LIKE 'member.%' THEN 1 END) as member_actions,
                COUNT(CASE WHEN status = 'failure' THEN 1 END) as failures,
                MIN(created_at) as first_action,
                MAX(created_at) as last_action
            FROM audit_logs
            WHERE phone = $1 AND created_at >= $2
        `, [phone, startDate]);

        // Recent actions
        const recentActions = await pool.query(`
            SELECT 
                action,
                resource_type,
                status,
                created_at
            FROM audit_logs
            WHERE phone = $1
            ORDER BY created_at DESC
            LIMIT 50
        `, [phone]);

        res.json({
            success: true,
            data: {
                user: userInfo.rows[0],
                summary: activitySummary.rows[0],
                recentActions: recentActions.rows
            }
        });

    } catch (error) {
        console.error('Error getting user activity:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to get user activity'
            }
        });
    }
}
