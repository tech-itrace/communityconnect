import { parseQuery, generateResponse, generateSuggestions } from './llmService';
import { searchMembers } from './semanticSearch';
import { extractEntities, HybridExtractionResult } from './hybridExtractor';
import { Intent } from './intentClassifier';
import {
    NLSearchResult,
    SearchFilters,
    SearchParams,
    ExtractedEntities,
    ParsedQuery
} from '../utils/types';

/**
 * Convert extracted entities to search filters
 * 
 * @param entities - Extracted entities from query
 * @param intent - Query intent for filter optimization (optional)
 */
function entitiesToFilters(entities: ExtractedEntities, intent?: Intent): SearchFilters {
    const filters: SearchFilters = {};

    // Map location to city filter
    if (entities.location) {
        filters.city = entities.location;
    }

    // Map skills
    if (entities.skills && entities.skills.length > 0) {
        filters.skills = entities.skills;
    }

    // Map services
    if (entities.services && entities.services.length > 0) {
        filters.services = entities.services;
    }

    // Map turnover requirement to numeric range
    if (entities.turnoverRequirement) {
        switch (entities.turnoverRequirement) {
            case 'high':
                filters.minTurnover = 100000000; // > 10 Crores
                break;
            case 'medium':
                filters.minTurnover = 20000000;  // 2 Crores
                filters.maxTurnover = 100000000; // 10 Crores
                break;
            case 'low':
                filters.maxTurnover = 20000000;  // < 2 Crores
                break;
        }
    }

    // Map graduation year
    if (entities.graduationYear && entities.graduationYear.length > 0) {
        filters.yearOfGraduation = entities.graduationYear;
    }

    // Map degree
    if (entities.degree) {
        filters.degree = [entities.degree];
    }

    // Intent-specific filter optimization
    if (intent) {
        switch (intent) {
            case 'find_business':
                // For business queries, prioritize services/skills
                if (!filters.services && !filters.skills) {
                    // If no services specified, might want to filter for members with products/services
                }
                break;
            case 'find_peers':
                // For alumni queries, prioritize year/branch
                break;
            case 'find_specific_person':
                // For specific person, reduce limit to exact matches
                break;
            case 'find_alumni_business':
                // Hybrid - need both alumni info and business info
                break;
        }
    }

    return filters;
}

/**
 * Process natural language query end-to-end
 */
export async function processNaturalLanguageQuery(
    naturalQuery: string,
    maxResults: number = 10,
    conversationContext?: string
): Promise<NLSearchResult> {
    const startTime = Date.now();
    console.log(`\n[NL Search] ========================================`);
    console.log(`[NL Search] Processing query: "${naturalQuery}"`);

    try {
        // Step 1: Extract entities using hybrid approach (regex + LLM)
        console.log(`[NL Search] Step 1: Extracting entities (hybrid)...`);
        const extracted: HybridExtractionResult = await extractEntities(naturalQuery, conversationContext);

        console.log(`[NL Search] ✓ Extracted - Intent: ${extracted.intent}, Method: ${extracted.method}`);
        console.log(`[NL Search] ✓ Extraction time: ${extracted.extractionTime}ms, Confidence: ${extracted.confidence}`);
        console.log(`[NL Search] ✓ Entities:`, JSON.stringify(extracted.entities, null, 2));
        console.log(`[NL Search] ✓ Used LLM: ${extracted.metadata.llmUsed ? 'YES' : 'NO'}`);

        // Step 2: Convert entities to search filters
        const filters = entitiesToFilters(extracted.entities, extracted.intent);
        console.log(`[NL Search] ✓ Filters:`, JSON.stringify(filters, null, 2));

        // Step 3: Execute search with hybrid mode
        console.log(`[NL Search] Step 2: Executing semantic search...`);
        const searchParams: SearchParams = {
            query: naturalQuery, // Use original query for semantic search
            filters: filters,
            options: {
                searchType: 'hybrid',
                page: 1,
                limit: maxResults,
                sortBy: 'relevance',
                sortOrder: 'desc'
            }
        };

        const searchResponse = await searchMembers(searchParams);
        console.log(`[NL Search] ✓ Search completed - ${searchResponse.members.length} results found`);

        // Step 4: Generate conversational response
        console.log(`[NL Search] Step 3: Generating conversational response...`);

        // Convert ScoredMember to MemberSearchResult
        const memberResults = searchResponse.members.map(member => ({
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

        const conversationalResponse = await generateResponse(
            naturalQuery,
            memberResults,
            extracted.confidence,
            extracted.intent,      // Pass intent for template-based formatting
            extracted.entities     // Pass entities for template-based formatting
        );
        console.log(`[NL Search] ✓ Response generated (template-based)`);

        // Step 5: Generate follow-up suggestions
        console.log(`[NL Search] Step 4: Generating suggestions...`);
        const suggestions = await generateSuggestions(
            naturalQuery,
            memberResults,
            extracted.intent,      // Pass intent for template-based suggestions
            extracted.entities     // Pass entities for template-based suggestions
        );
        console.log(`[NL Search] ✓ ${suggestions.length} suggestions generated (template-based)`);

        // Build pagination info
        const pagination = {
            currentPage: searchParams.options?.page || 1,
            totalPages: Math.ceil(searchResponse.totalCount / (searchParams.options?.limit || maxResults)),
            totalResults: searchResponse.totalCount,
            resultsPerPage: searchParams.options?.limit || maxResults,
            hasNextPage: (searchParams.options?.page || 1) < Math.ceil(searchResponse.totalCount / (searchParams.options?.limit || maxResults)),
            hasPreviousPage: (searchParams.options?.page || 1) > 1
        };

        // Build result
        const executionTime = Date.now() - startTime;
        const result: NLSearchResult = {
            understanding: {
                intent: extracted.intent as any, // Map Intent to ParsedQuery intent
                entities: extracted.entities,
                confidence: extracted.confidence,
                normalizedQuery: naturalQuery,
                intentMetadata: {
                    primary: extracted.metadata.intentResult.primary,
                    secondary: extracted.metadata.intentResult.secondary,
                    intentConfidence: extracted.metadata.intentResult.confidence,
                    matchedPatterns: extracted.metadata.intentResult.matchedPatterns
                }
            },
            results: {
                members: memberResults,
                pagination: pagination
            },
            response: {
                conversational: conversationalResponse,
                suggestions: suggestions
            },
            executionTime: executionTime,
            performance: {
                extractionTime: extracted.extractionTime,
                extractionMethod: extracted.method,
                llmUsed: extracted.metadata.llmUsed,
                searchTime: executionTime - extracted.extractionTime
            }
        };

        console.log(`[NL Search] ========================================`);
        console.log(`[NL Search] ✓ COMPLETED in ${executionTime}ms`);
        console.log(`[NL Search] Performance: Extraction ${extracted.extractionTime}ms (${extracted.method}), Total ${executionTime}ms`);
        console.log(`[NL Search] Results: ${result.results.members.length}, Confidence: ${result.understanding.confidence}`);
        console.log(`[NL Search] ========================================\n`);

        return result;

    } catch (error: any) {
        const executionTime = Date.now() - startTime;
        console.error(`[NL Search] ✗ ERROR after ${executionTime}ms:`, error.message);
        console.error(`[NL Search] Stack:`, error.stack);
        console.error(`[NL Search] ========================================\n`);

        // Return error result with fallback
        return {
            understanding: {
                intent: 'find_member',
                entities: {},
                confidence: 0.0,
                normalizedQuery: naturalQuery
            },
            results: {
                members: [],
                pagination: {
                    currentPage: 1,
                    totalPages: 0,
                    totalResults: 0,
                    resultsPerPage: maxResults,
                    hasNextPage: false,
                    hasPreviousPage: false
                }
            },
            response: {
                conversational: `I encountered an error while processing your query "${naturalQuery}". Please try rephrasing your question or searching with specific keywords.`,
                suggestions: [
                    'Try searching with specific skills (e.g., "AI", "consulting")',
                    'Search by location (e.g., "Chennai", "Bangalore")',
                    'Browse all members'
                ]
            },
            executionTime: executionTime
        };
    }
}

/**
 * Process query with low confidence - ask for clarification
 */
export function createClarificationResponse(
    naturalQuery: string,
    parsed: ParsedQuery
): NLSearchResult {
    return {
        understanding: {
            intent: parsed.intent,
            entities: parsed.entities,
            confidence: parsed.confidence,
            normalizedQuery: parsed.searchQuery
        },
        results: {
            members: [],
            pagination: {
                currentPage: 1,
                totalPages: 0,
                totalResults: 0,
                resultsPerPage: 10,
                hasNextPage: false,
                hasPreviousPage: false
            }
        },
        response: {
            conversational: `I'm not quite sure what you're looking for with "${naturalQuery}". Could you be more specific? For example, are you looking for someone with particular skills, in a specific location, or with certain services?`,
            suggestions: [
                'Find members with specific skills (e.g., "AI expert", "software developer")',
                'Search by location (e.g., "members in Chennai")',
                'Look for members with consulting services',
                'Find members with high annual turnover'
            ]
        },
        executionTime: 0
    };
}
