/**
 * Performance Metrics API Routes
 * 
 * Provides endpoints to access performance metrics, daily reports, and analytics.
 * 
 * Endpoints:
 * - GET /api/performance/report - Get daily performance report
 * - GET /api/performance/metrics - Get aggregated metrics for date range
 * - POST /api/performance/clear - Clear metrics for testing (dev only)
 * 
 * Reference: TODO_queryOptimisation.md (Phase 4, Task 4.2)
 */

import express, { Request, Response } from 'express';
import {
    generateDailyReport,
    getAggregatedMetrics,
    formatDailyReport,
    getMetricsForDateRange,
    clearMetrics,
} from '../middlewares/performanceMonitor';

const router = express.Router();

// ============================================================================
// GET /api/performance/report - Daily Performance Report
// ============================================================================

/**
 * GET /api/performance/report?date=YYYY-MM-DD
 * 
 * Get daily performance report with aggregated metrics, top queries, and slow queries.
 * Defaults to today if date is not specified.
 * 
 * Query Parameters:
 * - date (optional): Date in YYYY-MM-DD format
 * - format (optional): 'json' or 'text' (default: 'json')
 * 
 * Example: GET /api/performance/report?date=2025-11-15&format=text
 */
router.get('/report', async (req: Request, res: Response) => {
    try {
        const date = req.query.date as string | undefined;
        const format = (req.query.format as string) || 'json';

        // Validate date format if provided
        if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid date format. Use YYYY-MM-DD',
            });
        }

        // Generate report
        const report = await generateDailyReport(date);

        if (!report) {
            return res.status(404).json({
                success: false,
                error: `No metrics found for ${date || 'today'}`,
            });
        }

        // Format response
        if (format === 'text') {
            const textReport = formatDailyReport(report);
            return res.type('text/plain').send(textReport);
        }

        return res.json({
            success: true,
            report,
        });

    } catch (error: any) {
        console.error('[Performance API] Error generating report:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to generate performance report',
            message: error.message,
        });
    }
});

// ============================================================================
// GET /api/performance/metrics - Aggregated Metrics
// ============================================================================

/**
 * GET /api/performance/metrics?date=YYYY-MM-DD
 * 
 * Get aggregated metrics for a specific date or date range.
 * 
 * Query Parameters:
 * - date (optional): Single date in YYYY-MM-DD format
 * - startDate (optional): Start of date range
 * - endDate (optional): End of date range
 * 
 * Example: GET /api/performance/metrics?startDate=2025-11-01&endDate=2025-11-15
 */
router.get('/metrics', async (req: Request, res: Response) => {
    try {
        const date = req.query.date as string | undefined;
        const startDate = req.query.startDate as string | undefined;
        const endDate = req.query.endDate as string | undefined;

        // Single date query
        if (date) {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid date format. Use YYYY-MM-DD',
                });
            }

            const metrics = await getAggregatedMetrics(date);

            if (!metrics) {
                return res.status(404).json({
                    success: false,
                    error: `No metrics found for ${date}`,
                });
            }

            return res.json({
                success: true,
                date,
                metrics,
            });
        }

        // Date range query
        if (startDate && endDate) {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid date format. Use YYYY-MM-DD',
                });
            }

            const reports = await getMetricsForDateRange(startDate, endDate);

            return res.json({
                success: true,
                dateRange: { startDate, endDate },
                reports,
                totalReports: reports.length,
            });
        }

        // Default: today
        const metrics = await getAggregatedMetrics();

        if (!metrics) {
            return res.status(404).json({
                success: false,
                error: 'No metrics found for today',
            });
        }

        return res.json({
            success: true,
            date: new Date().toISOString().split('T')[0],
            metrics,
        });

    } catch (error: any) {
        console.error('[Performance API] Error fetching metrics:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch metrics',
            message: error.message,
        });
    }
});

// ============================================================================
// POST /api/performance/clear - Clear Metrics (Dev/Testing Only)
// ============================================================================

/**
 * POST /api/performance/clear
 * 
 * Clear metrics for a specific date. USE WITH CAUTION - for testing only!
 * 
 * Body:
 * {
 *   "date": "YYYY-MM-DD"
 * }
 */
router.post('/clear', async (req: Request, res: Response) => {
    try {
        // Only allow in development environment
        if (process.env.NODE_ENV === 'production') {
            return res.status(403).json({
                success: false,
                error: 'Metric clearing is not allowed in production',
            });
        }

        const { date } = req.body;

        if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid or missing date. Use YYYY-MM-DD format',
            });
        }

        await clearMetrics(date);

        return res.json({
            success: true,
            message: `Metrics cleared for ${date}`,
        });

    } catch (error: any) {
        console.error('[Performance API] Error clearing metrics:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to clear metrics',
            message: error.message,
        });
    }
});

// ============================================================================
// GET /api/performance/health - Performance Monitoring Health Check
// ============================================================================

/**
 * GET /api/performance/health
 * 
 * Check if performance monitoring is working and Redis is available.
 */
router.get('/health', async (req: Request, res: Response) => {
    try {
        // Try to get today's metrics as a health check
        const metrics = await getAggregatedMetrics();

        return res.json({
            success: true,
            status: 'healthy',
            redisAvailable: true,
            hasMetrics: metrics !== null,
            metricsCount: metrics?.totalQueries || 0,
        });

    } catch (error: any) {
        return res.json({
            success: false,
            status: 'unhealthy',
            redisAvailable: false,
            error: error.message,
        });
    }
});

export default router;
