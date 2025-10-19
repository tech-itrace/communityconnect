/**
 * Member Controller
 * 
 * Handles member-related API endpoints
 */

import { Request, Response } from 'express';
import {
    getMemberById,
    getAllMembers,
    getMemberStats,
    getUniqueCities,
    getUniqueSkills,
    getUniqueServices
} from '../services/memberService';
import { ApiErrorResponse } from '../utils/types';

/**
 * GET /api/members/:id
 * Get a single member by ID
 */
export async function getMemberByIdHandler(req: Request, res: Response) {
    try {
        const { id } = req.params;
        
        console.log(`[Member Controller] Fetching member: ${id}`);
        
        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(id)) {
            const errorResponse: ApiErrorResponse = {
                success: false,
                error: {
                    code: 'INVALID_ID',
                    message: 'Invalid member ID format',
                    details: 'Member ID must be a valid UUID'
                }
            };
            return res.status(400).json(errorResponse);
        }
        
        const member = await getMemberById(id);
        
        if (!member) {
            const errorResponse: ApiErrorResponse = {
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Member not found',
                    details: `No member exists with ID: ${id}`
                }
            };
            return res.status(404).json(errorResponse);
        }
        
        res.json({
            success: true,
            member
        });
        
    } catch (error: any) {
        console.error('[Member Controller] Error fetching member:', error);
        
        const errorResponse: ApiErrorResponse = {
            success: false,
            error: {
                code: 'SERVER_ERROR',
                message: 'Failed to fetch member',
                details: error.message
            }
        };
        
        res.status(500).json(errorResponse);
    }
}

/**
 * GET /api/members
 * List all members with pagination and optional filters
 */
export async function getAllMembersHandler(req: Request, res: Response) {
    try {
        const page = req.query.page ? parseInt(req.query.page as string) : 1;
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
        const sortBy = req.query.sortBy as string || 'name';
        const sortOrder = req.query.sortOrder as string || 'asc';
        const city = req.query.city as string;
        const degree = req.query.degree as string;
        const yearOfGraduation = req.query.year ? parseInt(req.query.year as string) : undefined;
        
        console.log('[Member Controller] Fetching members:', {
            page,
            limit,
            sortBy,
            sortOrder,
            city,
            degree,
            yearOfGraduation
        });
        
        // Validate parameters
        if (page < 1) {
            const errorResponse: ApiErrorResponse = {
                success: false,
                error: {
                    code: 'INVALID_PARAMETERS',
                    message: 'Invalid parameters',
                    details: { page: 'Page must be a positive integer' }
                }
            };
            return res.status(400).json(errorResponse);
        }
        
        if (limit < 1 || limit > 100) {
            const errorResponse: ApiErrorResponse = {
                success: false,
                error: {
                    code: 'INVALID_PARAMETERS',
                    message: 'Invalid parameters',
                    details: { limit: 'Limit must be between 1 and 100' }
                }
            };
            return res.status(400).json(errorResponse);
        }
        
        if (!['name', 'turnover', 'year'].includes(sortBy)) {
            const errorResponse: ApiErrorResponse = {
                success: false,
                error: {
                    code: 'INVALID_PARAMETERS',
                    message: 'Invalid parameters',
                    details: { sortBy: 'Sort by must be one of: name, turnover, year' }
                }
            };
            return res.status(400).json(errorResponse);
        }
        
        const result = await getAllMembers({
            page,
            limit,
            sortBy: sortBy as 'name' | 'turnover' | 'year',
            sortOrder: sortOrder as 'asc' | 'desc',
            city,
            degree,
            yearOfGraduation
        });
        
        res.json({
            success: true,
            ...result
        });
        
    } catch (error: any) {
        console.error('[Member Controller] Error fetching members:', error);
        
        const errorResponse: ApiErrorResponse = {
            success: false,
            error: {
                code: 'SERVER_ERROR',
                message: 'Failed to fetch members',
                details: error.message
            }
        };
        
        res.status(500).json(errorResponse);
    }
}

/**
 * GET /api/members/stats
 * Get member statistics
 */
export async function getMemberStatsHandler(req: Request, res: Response) {
    try {
        console.log('[Member Controller] Fetching member statistics');
        
        const stats = await getMemberStats();
        
        res.json({
            success: true,
            stats
        });
        
    } catch (error: any) {
        console.error('[Member Controller] Error fetching stats:', error);
        
        const errorResponse: ApiErrorResponse = {
            success: false,
            error: {
                code: 'SERVER_ERROR',
                message: 'Failed to fetch statistics',
                details: error.message
            }
        };
        
        res.status(500).json(errorResponse);
    }
}

/**
 * GET /api/search/suggestions
 * Get autocomplete suggestions for skills, services, and cities
 */
export async function getSuggestionsHandler(req: Request, res: Response) {
    try {
        const type = req.query.type as string;
        
        console.log(`[Member Controller] Fetching suggestions for: ${type}`);
        
        let suggestions: string[] = [];
        
        switch (type) {
            case 'cities':
                suggestions = await getUniqueCities();
                break;
            case 'skills':
                suggestions = await getUniqueSkills();
                break;
            case 'services':
                suggestions = await getUniqueServices();
                break;
            default:
                // Return all types
                const [cities, skills, services] = await Promise.all([
                    getUniqueCities(),
                    getUniqueSkills(),
                    getUniqueServices()
                ]);
                
                return res.json({
                    success: true,
                    suggestions: {
                        cities,
                        skills,
                        services
                    }
                });
        }
        
        res.json({
            success: true,
            type,
            suggestions
        });
        
    } catch (error: any) {
        console.error('[Member Controller] Error fetching suggestions:', error);
        
        const errorResponse: ApiErrorResponse = {
            success: false,
            error: {
                code: 'SERVER_ERROR',
                message: 'Failed to fetch suggestions',
                details: error.message
            }
        };
        
        res.status(500).json(errorResponse);
    }
}
