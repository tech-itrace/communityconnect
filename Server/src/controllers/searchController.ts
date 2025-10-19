/**
 * Search Controller
 * 
 * Handles search-related API endpoints
 */

import { Request, Response } from 'express';
import { searchMembers } from '../services/semanticSearch';
import {
    SearchMembersRequest,
    SearchResponse,
    MemberSearchResult,
    PaginationInfo,
    ApiErrorResponse
} from '../utils/types';

/**
 * POST /api/search/members
 * Search for members using natural language queries with optional filters
 */
export async function searchMembersHandler(req: Request, res: Response) {
    const startTime = Date.now();
    
    try {
        const requestBody: SearchMembersRequest = req.body;
        
        console.log('[Search Controller] Received search request:', {
            query: requestBody.query,
            filters: requestBody.filters,
            searchType: requestBody.searchType,
            page: requestBody.page,
            limit: requestBody.limit
        });
        
        // Validate request
        const validation = validateSearchRequest(requestBody);
        if (!validation.valid) {
            const errorResponse: ApiErrorResponse = {
                success: false,
                error: {
                    code: 'INVALID_PARAMETERS',
                    message: 'Invalid search parameters',
                    details: validation.errors
                }
            };
            return res.status(400).json(errorResponse);
        }
        
        // Prepare search parameters
        const searchParams = {
            query: requestBody.query,
            filters: requestBody.filters || {},
            options: {
                searchType: requestBody.searchType || 'hybrid',
                page: requestBody.page || 1,
                limit: requestBody.limit || 10,
                sortBy: requestBody.sortBy || 'relevance',
                sortOrder: requestBody.sortOrder || 'desc'
            }
        };
        
        // Execute search
        const { members, totalCount } = await searchMembers(searchParams);
        
        // Format results
        const formattedMembers: MemberSearchResult[] = members.map(member => ({
            id: member.id,
            name: member.name,
            email: member.email || '',
            phone: member.phone || '',
            city: member.city || '',
            organization: member.organization || '',
            designation: member.designation || '',
            skills: member.skills || '',
            productsServices: member.productsServices || '',
            annualTurnover: member.annualTurnover || 0,
            yearOfGraduation: member.yearOfGraduation || 0,
            degree: member.degree || '',
            branch: member.branch || '',
            relevanceScore: member.relevanceScore,
            matchedFields: member.matchedFields
        }));
        
        // Calculate pagination
        const page = searchParams.options.page!;
        const limit = searchParams.options.limit!;
        const totalPages = Math.ceil(totalCount / limit);
        
        const pagination: PaginationInfo = {
            currentPage: page,
            totalPages,
            totalResults: totalCount,
            resultsPerPage: limit,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1
        };
        
        const executionTime = Date.now() - startTime;
        
        // Build response
        const response: SearchResponse = {
            success: true,
            query: requestBody.query,
            searchType: searchParams.options.searchType!,
            results: {
                members: formattedMembers,
                pagination,
                executionTime
            }
        };
        
        console.log(`[Search Controller] Search completed in ${executionTime}ms - ${formattedMembers.length} results`);
        
        res.json(response);
        
    } catch (error: any) {
        console.error('[Search Controller] Error processing search:', error);
        
        const errorResponse: ApiErrorResponse = {
            success: false,
            error: {
                code: 'SEARCH_ERROR',
                message: 'Failed to execute search',
                details: error.message
            }
        };
        
        res.status(500).json(errorResponse);
    }
}

/**
 * Validate search request parameters
 */
function validateSearchRequest(request: SearchMembersRequest): { valid: boolean; errors?: any } {
    const errors: any = {};
    
    // Validate page
    if (request.page !== undefined) {
        if (!Number.isInteger(request.page) || request.page < 1) {
            errors.page = 'Page must be a positive integer';
        }
    }
    
    // Validate limit
    if (request.limit !== undefined) {
        if (!Number.isInteger(request.limit) || request.limit < 1 || request.limit > 50) {
            errors.limit = 'Limit must be between 1 and 50';
        }
    }
    
    // Validate search type
    if (request.searchType !== undefined) {
        if (!['hybrid', 'semantic', 'keyword'].includes(request.searchType)) {
            errors.searchType = 'Search type must be one of: hybrid, semantic, keyword';
        }
    }
    
    // Validate sortBy
    if (request.sortBy !== undefined) {
        if (!['relevance', 'name', 'turnover', 'year'].includes(request.sortBy)) {
            errors.sortBy = 'Sort by must be one of: relevance, name, turnover, year';
        }
    }
    
    // Validate sortOrder
    if (request.sortOrder !== undefined) {
        if (!['asc', 'desc'].includes(request.sortOrder)) {
            errors.sortOrder = 'Sort order must be one of: asc, desc';
        }
    }
    
    // Validate filters
    if (request.filters) {
        const { filters } = request;
        
        if (filters.minTurnover !== undefined && filters.minTurnover < 0) {
            errors.minTurnover = 'Minimum turnover must be non-negative';
        }
        
        if (filters.maxTurnover !== undefined && filters.maxTurnover < 0) {
            errors.maxTurnover = 'Maximum turnover must be non-negative';
        }
        
        if (filters.minTurnover !== undefined && filters.maxTurnover !== undefined) {
            if (filters.minTurnover > filters.maxTurnover) {
                errors.turnover = 'Minimum turnover cannot exceed maximum turnover';
            }
        }
        
        if (filters.yearOfGraduation !== undefined) {
            if (!Array.isArray(filters.yearOfGraduation)) {
                errors.yearOfGraduation = 'Year of graduation must be an array';
            } else {
                const invalidYears = filters.yearOfGraduation.filter(
                    year => !Number.isInteger(year) || year < 1950 || year > new Date().getFullYear()
                );
                if (invalidYears.length > 0) {
                    errors.yearOfGraduation = `Invalid years: ${invalidYears.join(', ')}`;
                }
            }
        }
    }
    
    const valid = Object.keys(errors).length === 0;
    
    return valid ? { valid: true } : { valid: false, errors };
}
