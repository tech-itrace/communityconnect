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
    getUniqueServices,
    createMember,
    updateMember,
    deleteMember,
    getMemberByPhone,
    bulkCreateMembers
} from '../services/memberService';
import { ApiErrorResponse } from '../utils/types';
import { parse } from 'csv-parse/sync';
import { PAGINATION } from '../config/constants';

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

        if (limit < PAGINATION.MIN_LIMIT || limit > PAGINATION.MAX_LIMIT) {
            const errorResponse: ApiErrorResponse = {
                success: false,
                error: {
                    code: 'INVALID_PARAMETERS',
                    message: 'Invalid parameters',
                    details: { limit: `Limit must be between ${PAGINATION.MIN_LIMIT} and ${PAGINATION.MAX_LIMIT}` }
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

/**
 * POST /api/members
 * Create a new member
 * Requires: Admin or Super Admin role
 */
export async function createMemberHandler(req: Request, res: Response) {
    try {
        const {
            phone,
            name,
            email,
            city,
            working_knowledge,
            degree,
            branch,
            organization_name,
            designation,
            role = 'member'
        } = req.body;

        // Validate required fields
        if (!phone || !name) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Phone number and name are required'
                }
            });
        }

        console.log(`[Member Controller] Creating member: ${name} (${phone})`);

        // Check if member already exists
        const existingMember = await getMemberByPhone(phone);

        if (existingMember) {
            return res.status(409).json({
                success: false,
                error: {
                    code: 'DUPLICATE_MEMBER',
                    message: 'A member with this phone number already exists'
                }
            });
        }

        // Create the member
        const newMember = await createMember({
            phone,
            name,
            email,
            city,
            working_knowledge,
            degree,
            branch,
            organization_name,
            designation,
            role
        });

        res.status(201).json({
            success: true,
            member: newMember
        });

    } catch (error: any) {
        console.error('[Member Controller] Error creating member:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'SERVER_ERROR',
                message: 'Failed to create member',
                details: error.message
            }
        });
    }
}

/**
 * PUT /api/members/:id
 * Update an existing member
 * Requires: Admin or Super Admin role
 */
export async function updateMemberHandler(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const {
            name,
            email,
            city,
            working_knowledge,
            degree,
            branch,
            organization_name,
            designation,
            role
        } = req.body;

        console.log(`[Member Controller] Updating member ID: ${id}`);

        // Check if member exists
        const existingMember = await getMemberById(id);

        if (!existingMember) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'MEMBER_NOT_FOUND',
                    message: 'Member not found'
                }
            });
        }

        // Update the member
        const updatedMember = await updateMember(id, {
            name,
            email,
            city,
            working_knowledge,
            degree,
            branch,
            organization_name,
            designation,
            role
        });

        res.json({
            success: true,
            member: updatedMember
        });

    } catch (error: any) {
        console.error('[Member Controller] Error updating member:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'SERVER_ERROR',
                message: 'Failed to update member',
                details: error.message
            }
        });
    }
}

/**
 * DELETE /api/members/:id
 * Delete a member
 * Requires: Super Admin role
 */
export async function deleteMemberHandler(req: Request, res: Response) {
    try {
        const { id } = req.params;

        console.log(`[Member Controller] Deleting member ID: ${id}`);

        // Check if member exists
        const existingMember = await getMemberById(id);

        if (!existingMember) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'MEMBER_NOT_FOUND',
                    message: 'Member not found'
                }
            });
        }

        // Delete the member
        const deleted = await deleteMember(id);

        if (!deleted) {
            throw new Error('Failed to delete member');
        }

        res.json({
            success: true,
            message: 'Member deleted successfully'
        });

    } catch (error: any) {
        console.error('[Member Controller] Error deleting member:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'SERVER_ERROR',
                message: 'Failed to delete member',
                details: error.message
            }
        });
    }
}

/**
 * POST /api/members/bulk/import
 * Bulk import members from CSV file
 * Requires: Admin or Super Admin role
 */
export async function bulkImportMembersHandler(req: Request, res: Response) {
    try {
        // Check if file was uploaded
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'NO_FILE',
                    message: 'No file uploaded'
                }
            });
        }

        console.log('[Member Controller] Processing bulk import:', {
            filename: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype
        });

        // Parse CSV file
        const csvContent = req.file.buffer.toString('utf-8');

        let records: any[];
        try {
            records = parse(csvContent, {
                columns: true,
                skip_empty_lines: true,
                trim: true,
                bom: true // Handle UTF-8 BOM
            });
        } catch (parseError: any) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'CSV_PARSE_ERROR',
                    message: 'Failed to parse CSV file',
                    details: parseError.message
                }
            });
        }

        if (records.length === 0) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'EMPTY_FILE',
                    message: 'CSV file is empty or has no valid records'
                }
            });
        }

        console.log(`[Member Controller] Parsed ${records.length} records from CSV`);

        // Transform CSV records to member data
        const membersData = records.map((record: any) => ({
            phone: record.phone || record.Phone || record['Phone number'] || '',
            name: record.name || record.Name || '',
            email: record.email || record.Email || '',
            city: record.city || record.City || record['City / Town of Living'] || '',
            working_knowledge: record.working_knowledge || record['Working Knowledge'] || record.skills || record.Skills || '',
            degree: record.degree || record.Degree || '',
            branch: record.branch || record.Branch || '',
            organization_name: record.organization_name || record['Organization Name'] || record['Organization Name:'] || '',
            designation: record.designation || record.Designation || record['Designation:'] || '',
            role: 'member'
        }));

        // Bulk create members
        const result = await bulkCreateMembers(membersData);

        res.status(201).json({
            success: true,
            message: `Bulk import completed: ${result.successCount} members imported successfully`,
            data: {
                successCount: result.successCount,
                failedCount: result.failedCount,
                duplicates: result.duplicates,
                totalProcessed: records.length,
                errors: result.errors.slice(0, 10) // Return first 10 errors
            }
        });

    } catch (error: any) {
        console.error('[Member Controller] Error in bulk import:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'SERVER_ERROR',
                message: 'Failed to process bulk import',
                details: error.message
            }
        });
    }
}

