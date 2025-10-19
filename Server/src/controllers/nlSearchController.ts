import { Request, Response } from 'express';
import { processNaturalLanguageQuery, createClarificationResponse } from '../services/nlSearchService';
import { NLSearchRequest, NLSearchResponse, ApiErrorResponse } from '../utils/types';

/**
 * Process natural language search query
 * POST /api/search/query
 */
export async function processNLQueryHandler(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();

    try {
        const body: NLSearchRequest = req.body;

        // Validate required fields
        if (!body.query || typeof body.query !== 'string' || body.query.trim().length === 0) {
            const errorResponse: ApiErrorResponse = {
                success: false,
                error: {
                    code: 'INVALID_QUERY',
                    message: 'Query is required and must be a non-empty string',
                    details: { query: body.query }
                }
            };
            res.status(400).json(errorResponse);
            return;
        }

        // Validate query length
        if (body.query.length > 500) {
            const errorResponse: ApiErrorResponse = {
                success: false,
                error: {
                    code: 'QUERY_TOO_LONG',
                    message: 'Query must be less than 500 characters',
                    details: { length: body.query.length, maxLength: 500 }
                }
            };
            res.status(400).json(errorResponse);
            return;
        }

        // Extract options
        const includeResponse = body.options?.includeResponse !== false; // Default: true
        const includeSuggestions = body.options?.includeSuggestions !== false; // Default: true
        const maxResults = body.options?.maxResults || 10;

        // Validate maxResults
        if (maxResults < 1 || maxResults > 50) {
            const errorResponse: ApiErrorResponse = {
                success: false,
                error: {
                    code: 'INVALID_MAX_RESULTS',
                    message: 'maxResults must be between 1 and 50',
                    details: { maxResults }
                }
            };
            res.status(400).json(errorResponse);
            return;
        }

        console.log(`\n[NL Controller] ========================================`);
        console.log(`[NL Controller] Received natural language query`);
        console.log(`[NL Controller] Query: "${body.query}"`);
        console.log(`[NL Controller] Options:`, { includeResponse, includeSuggestions, maxResults });

        // Process the natural language query
        const result = await processNaturalLanguageQuery(body.query, maxResults);

        // Check if confidence is too low - ask for clarification
        // Lower threshold to 0.3 - only ask for clarification if truly ambiguous
        if (result.understanding.confidence < 0.3) {
            console.log(`[NL Controller] ⚠ Low confidence (${result.understanding.confidence}), asking for clarification`);

            const response: NLSearchResponse = {
                success: true,
                query: body.query,
                understanding: {
                    intent: result.understanding.intent,
                    entities: result.understanding.entities,
                    confidence: result.understanding.confidence,
                    normalizedQuery: result.understanding.normalizedQuery
                },
                results: {
                    members: [],
                    pagination: result.results.pagination
                },
                response: {
                    conversational: `I'm not quite sure what you're looking for with "${body.query}". Could you be more specific? For example, are you looking for someone with particular skills, in a specific location, or with certain services?`,
                    suggestions: [
                        'Find members with specific skills (e.g., "AI expert", "software developer")',
                        'Search by location (e.g., "members in Chennai")',
                        'Look for members with consulting services',
                        'Find members with high annual turnover'
                    ]
                },
                executionTime: Date.now() - startTime
            };

            console.log(`[NL Controller] ✓ Clarification response sent`);
            console.log(`[NL Controller] ========================================\n`);
            res.status(200).json(response);
            return;
        }

        // Build successful response
        const response: NLSearchResponse = {
            success: true,
            query: body.query,
            understanding: result.understanding,
            results: result.results,
            executionTime: result.executionTime
        };

        // Conditionally include conversational response and suggestions
        if (includeResponse || includeSuggestions) {
            const responseObj: { conversational?: string; suggestions?: string[] } = {};

            if (includeResponse && result.response?.conversational) {
                responseObj.conversational = result.response.conversational;
            }
            if (includeSuggestions && result.response?.suggestions) {
                responseObj.suggestions = result.response.suggestions;
            }

            // Only add response if we have something to show
            if (responseObj.conversational || responseObj.suggestions) {
                response.response = {
                    conversational: responseObj.conversational || '',
                    suggestions: responseObj.suggestions
                };
            }
        }

        const totalTime = Date.now() - startTime;
        console.log(`[NL Controller] ✓ Request completed in ${totalTime}ms`);
        console.log(`[NL Controller] Results: ${result.results.members.length}, Confidence: ${result.understanding.confidence}`);
        console.log(`[NL Controller] ========================================\n`);

        res.status(200).json(response);

    } catch (error: any) {
        const totalTime = Date.now() - startTime;
        console.error(`[NL Controller] ✗ Error after ${totalTime}ms:`, error.message);
        console.error(`[NL Controller] Stack:`, error.stack);
        console.error(`[NL Controller] ========================================\n`);

        const errorResponse: ApiErrorResponse = {
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'An error occurred while processing your query',
                details: process.env.NODE_ENV === 'development' ? {
                    error: error.message,
                    stack: error.stack
                } : undefined
            }
        };

        res.status(500).json(errorResponse);
    }
}
