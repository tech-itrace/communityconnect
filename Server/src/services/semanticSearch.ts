/**
 * Semantic Search Service
 *
 * Core search engine for Community Connect platform implementing hybrid search
 * that combines semantic understanding with keyword matching for optimal results.
 *
 * Architecture:
 * 1. Embedding Generation:
 *    - Primary: Google Gemini (text-embedding-004) - stable, consistent
 *    - Fallback: DeepInfra (BAAI/bge-base-en-v1.5) - fast alternative
 *    - LRU cache (1000 queries, 5min TTL) to reduce API calls
 *    - All embeddings: 768 dimensions, L2 normalized
 *
 * 2. Search Strategies:
 *    - Semantic Search: Vector similarity using pgvector (<=> operator)
 *    - Keyword Search: PostgreSQL full-text search (tsvector)
 *    - Hybrid Search: Merges both with weighted scoring (70% semantic + 30% keyword)
 *
 * 3. Filtering:
 *    - Structural filters: City, graduation year, degree (applied in SQL)
 *    - Semantic filters: Skills, services (handled by embeddings, not SQL)
 *    - Community scoping: Multi-community support via community_id
 *
 * 4. Performance Optimizations:
 *    - Parallel execution of semantic + keyword searches
 *    - HNSW indexes on embedding vectors for fast similarity search
 *    - Query embedding caching (prevents redundant API calls)
 *    - Smart result merging with deduplication
 *
 * Multi-Community Support:
 * - Searches within specific community context
 * - Uses community_memberships table for member association
 * - Supports different member types: alumni, entrepreneur, resident
 *
 * @see Phase 8: Code Cleanup (QUERY_ENDPOINT_REFACTORING_PLAN.md)
 */

import dotenv from 'dotenv';
import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { query } from '../config/db';
import { embeddingCache } from '../utils/embeddingCache';
import {
    SearchParams,
    SearchFilters,
    SearchOptions,
    ScoredMember
} from '../utils/types';

dotenv.config();

// Embedding API configuration
const DEEPINFRA_EMBEDDING_API_URL = 'https://api.deepinfra.com/v1/inference/BAAI/bge-base-en-v1.5';
const DEEPINFRA_API_KEY = process.env.DEEPINFRA_API_KEY;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GEMINI_EMBEDDING_MODEL = 'text-embedding-004';
const EMBEDDING_DIMENSIONS = 768;

// Initialize Google AI for fallback
const genAI = GOOGLE_API_KEY ? new GoogleGenerativeAI(GOOGLE_API_KEY) : null;

// Search configuration
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const SEMANTIC_WEIGHT = 0.7;
const KEYWORD_WEIGHT = 0.3;

// Default community slug for backward compatibility
const DEFAULT_COMMUNITY_SLUG = 'main-community';

/**
 * Helper function to build common filter conditions for search queries
 * Consolidates filter logic used across semantic and keyword searches
 *
 * @param filters - Search filters to apply
 * @param communityId - Optional community ID for scoping
 * @param baseParamIndex - Starting parameter index for SQL placeholders
 * @returns Object containing SQL conditions array and parameters array
 */
function buildFilterConditions(
    filters: SearchFilters,
    communityId: string | undefined,
    baseParamIndex: number
): { conditions: string[]; params: any[]; nextParamIndex: number } {
    const conditions: string[] = ['cm.is_active = TRUE', 'm.is_active = TRUE'];
    const params: any[] = [];
    let paramIndex = baseParamIndex;

    // Community filter
    if (communityId) {
        conditions.push(`cm.community_id = $${paramIndex}::uuid`);
        params.push(communityId);
        paramIndex++;
    } else {
        conditions.push(`c.slug = $${paramIndex}`);
        params.push(DEFAULT_COMMUNITY_SLUG);
        paramIndex++;
    }

    // City filter
    if (filters.city) {
        conditions.push(`(cm.profile_data->>'city' ILIKE $${paramIndex})`);
        params.push(`%${filters.city}%`);
        paramIndex++;
    }

    // Year of graduation filter (alumni only)
    if (filters.yearOfGraduation && filters.yearOfGraduation.length > 0) {
        conditions.push(`(
            cm.member_type = 'alumni'
            AND (cm.profile_data->>'graduation_year')::int = ANY($${paramIndex}::int[])
        )`);
        params.push(filters.yearOfGraduation);
        paramIndex++;
    }

    // Degree filter (alumni only)
    if (filters.degree && filters.degree.length > 0) {
        const degreeConditions = filters.degree.map(() => {
            const cond = `(cm.profile_data->>'degree' ILIKE $${paramIndex})`;
            paramIndex++;
            return cond;
        });
        conditions.push(`(cm.member_type = 'alumni' AND (${degreeConditions.join(' OR ')}))`);
        params.push(...filters.degree.map(d => `%${d}%`));
    }

    return { conditions, params, nextParamIndex: paramIndex };
}

/**
 * Generate embedding using DeepInfra API
 * Uses BAAI/bge-base-en-v1.5 model for consistent 768-dimensional embeddings
 *
 * @param query - Text to generate embedding for
 * @returns 768-dimensional normalized embedding vector
 * @throws Error if API call fails or response is invalid
 */
async function generateEmbeddingDeepInfra(query: string): Promise<number[]> {
    const response = await axios.post(
        DEEPINFRA_EMBEDDING_API_URL,
        {
            inputs: [query],
            normalize: true
        },
        {
            headers: {
                'Authorization': `Bearer ${DEEPINFRA_API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        }
    );

    const embedding = response.data.embeddings[0];

    if (!Array.isArray(embedding) || embedding.length !== EMBEDDING_DIMENSIONS) {
        throw new Error(`Invalid embedding dimensions: expected ${EMBEDDING_DIMENSIONS}, got ${embedding?.length}`);
    }

    return embedding;
}

/**
 * Generate embedding using Google Gemini API (fallback provider)
 * Uses text-embedding-004 model for 768-dimensional embeddings
 *
 * @param query - Text to generate embedding for
 * @returns 768-dimensional embedding vector
 * @throws Error if API call fails, API key not configured, or response is invalid
 */
async function generateEmbeddingGemini(query: string): Promise<number[]> {
    if (!genAI) {
        throw new Error('Google API key not configured');
    }

    const model = genAI.getGenerativeModel({ model: GEMINI_EMBEDDING_MODEL });
    const result = await model.embedContent(query);

    if (result?.embedding?.values) {
        const embedding = result.embedding.values;

        if (embedding.length !== EMBEDDING_DIMENSIONS) {
            throw new Error(`Invalid Gemini embedding dimensions: expected ${EMBEDDING_DIMENSIONS}, got ${embedding.length}`);
        }

        return embedding;
    }

    throw new Error('Invalid response format from Gemini API');
}

/**
 * Validate embedding quality and dimensions
 * Checks for correct dimensions, valid values, and normalization
 *
 * @param embedding - Embedding vector to validate
 * @param queryText - Original query text (for logging purposes)
 * @throws Error if embedding is invalid
 */
function validateEmbedding(embedding: number[], queryText: string): void {
    // Check dimensions
    if (embedding.length !== EMBEDDING_DIMENSIONS) {
        throw new Error(`Invalid embedding dimensions: expected ${EMBEDDING_DIMENSIONS}, got ${embedding.length}`);
    }

    // Check for NaN or Infinity values
    const hasInvalidValues = embedding.some(val => !isFinite(val));
    if (hasInvalidValues) {
        throw new Error('Embedding contains NaN or Infinity values');
    }

    // Check L2 norm (should be close to 1 if normalized)
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    console.log(`[Semantic Search] Embedding norm: ${norm.toFixed(3)}`);

    // Warn if norm is far from 1 (indicates non-normalized embedding)
    if (Math.abs(norm - 1.0) > 0.1) {
        console.warn(`[Semantic Search] ⚠ Warning: Embedding norm is ${norm.toFixed(3)}, expected ~1.0 (normalized)`);
    }
}

/**
 * Generate embedding for a search query with fallback support
 * Primary: Gemini (more stable)
 * Fallback: DeepInfra
 * Includes caching to reduce API calls
 */
export async function generateQueryEmbedding(queryText: string): Promise<number[]> {
    if (!GOOGLE_API_KEY && !DEEPINFRA_API_KEY) {
        throw new Error('Neither GOOGLE_API_KEY nor DEEPINFRA_API_KEY configured');
    }

    // Check cache first
    const cachedEmbedding = embeddingCache.get(queryText);
    if (cachedEmbedding) {
        console.log(`[Semantic Search] ✓ Using cached embedding (${cachedEmbedding.length}D)`);
        return cachedEmbedding;
    }

    const startTime = Date.now();

    // Try Gemini first (primary provider for stability)
    if (GOOGLE_API_KEY) {
        try {
            console.log(`[Semantic Search] Generating embedding for: "${queryText.substring(0, 50)}${queryText.length > 50 ? '...' : ''}"`);

            const embedding = await generateEmbeddingGemini(queryText);
            const duration = Date.now() - startTime;

            // Validate embedding quality
            validateEmbedding(embedding, queryText);

            // Cache the embedding
            embeddingCache.set(queryText, embedding);

            console.log(`[Semantic Search] ✓ Generated ${EMBEDDING_DIMENSIONS}D embedding in ${duration}ms (Gemini)`);
            return embedding;

        } catch (error: any) {
            const isRateLimit = error.response?.status === 429 || error.message?.includes('quota');
            const isTimeout = error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED';

            if ((isRateLimit || isTimeout) && DEEPINFRA_API_KEY) {
                console.log(`[Semantic Search] Gemini failed (${error.message}), trying DeepInfra fallback...`);
                try {
                    const embedding = await generateEmbeddingDeepInfra(queryText);
                    const duration = Date.now() - startTime;

                    // Validate embedding quality
                    validateEmbedding(embedding, queryText);

                    // Cache the fallback embedding
                    embeddingCache.set(queryText, embedding);

                    console.log(`[Semantic Search] ✓ Generated ${EMBEDDING_DIMENSIONS}D embedding in ${duration}ms (DeepInfra)`);
                    console.warn(`[Semantic Search] ⚠ Using fallback model - results may differ from stored embeddings`);
                    return embedding;
                } catch (deepInfraError: any) {
                    console.error('[Semantic Search] ✗ DeepInfra fallback failed:', deepInfraError.message);
                    throw new Error(`Both embedding providers failed: ${error.message}`);
                }
            }

            console.error('[Semantic Search] ✗ Error generating embedding:', error.message);
            throw new Error(`Failed to generate embedding: ${error.message}`);
        }
    }

    // If Gemini not configured, try DeepInfra
    if (DEEPINFRA_API_KEY) {
        console.log(`[Semantic Search] Gemini not configured, using DeepInfra...`);
        try {
            const embedding = await generateEmbeddingDeepInfra(queryText);
            const duration = Date.now() - startTime;

            validateEmbedding(embedding, queryText);

            // Cache the embedding
            embeddingCache.set(queryText, embedding);

            console.log(`[Semantic Search] ✓ Generated ${EMBEDDING_DIMENSIONS}D embedding in ${duration}ms (DeepInfra)`);
            return embedding;
        } catch (error: any) {
            console.error('[Semantic Search] ✗ Error generating embedding:', error.message);
            throw new Error(`Failed to generate embedding: ${error.message}`);
        }
    }

    throw new Error('No embedding provider configured');
}

/**
 * Execute semantic (vector similarity) search
 * Uses vector embeddings to find semantically similar members
 *
 * @param embedding - Query embedding vector (768 dimensions)
 * @param filters - Search filters to apply
 * @param limit - Maximum number of results
 * @param offset - Pagination offset
 * @param communityId - Optional community ID for scoping
 */
async function semanticSearchOnly(
    embedding: number[],
    filters: SearchFilters,
    limit: number,
    offset: number,
    communityId?: string
): Promise<ScoredMember[]> {
    console.log('[Semantic Search] Executing vector similarity search...');

    // Build common filter conditions
    const embeddingVector = `[${embedding.join(',')}]`;
    const params: any[] = [embeddingVector]; // $1 - embedding vector

    const filterResult = buildFilterConditions(filters, communityId, 2);
    const conditions = filterResult.conditions;
    params.push(...filterResult.params);

    // Add limit and offset
    const limitParam = `$${filterResult.nextParamIndex}`;
    const offsetParam = `$${filterResult.nextParamIndex + 1}`;
    params.push(limit, offset);

    const queryText = `
        SELECT
            m.id,
            m.name,
            m.phone,
            m.email,
            cm.member_type,
            cm.role,
            cm.joined_at,
            cm.profile_data,
            me.profile_embedding <=> $1::vector AS profile_distance,
            me.skills_embedding <=> $1::vector AS skills_distance,
            me.contextual_embedding <=> $1::vector AS contextual_distance,
            LEAST(
                me.profile_embedding <=> $1::vector,
                me.skills_embedding <=> $1::vector,
                me.contextual_embedding <=> $1::vector
            ) AS min_distance,
            1 - LEAST(
                me.profile_embedding <=> $1::vector,
                me.skills_embedding <=> $1::vector,
                me.contextual_embedding <=> $1::vector
            ) AS similarity_score
        FROM community_memberships cm
        JOIN members m ON cm.member_id = m.id
        JOIN member_embeddings me ON cm.id = me.membership_id
        LEFT JOIN communities c ON cm.community_id = c.id
        WHERE ${conditions.join(' AND ')}
        ORDER BY min_distance ASC
        LIMIT ${limitParam} OFFSET ${offsetParam}
    `;

    const result = await query(queryText, params);

    return result.rows.map(row => {
        const profileData = row.profile_data || {};

        return {
            id: row.id,
            name: row.name,
            phone: row.phone,
            email: row.email,
            memberType: row.member_type,
            role: row.role,
            // Map alumni fields for backward compatibility
            yearOfGraduation: profileData.graduation_year,
            degree: profileData.degree,
            branch: profileData.department,
            workingAs: profileData.designation,
            organization: profileData.current_organization || profileData.organization || profileData.company,
            designation: profileData.designation || profileData.profession,
            city: profileData.city,
            skills: profileData.skills || [],
            productsServices: profileData.services_offered || [],
            annualTurnover: null, // Not in new schema
            isActive: true,
            createdAt: row.joined_at,
            updatedAt: row.joined_at,
            relevanceScore: parseFloat(row.similarity_score) || 0,
            semanticScore: parseFloat(row.similarity_score) || 0,
            matchedFields: identifyMatchedFields(row, filters),
            profileData: profileData // Include full profile data
        };
    });
}

/**
 * Execute keyword (full-text) search
 * Uses PostgreSQL full-text search for keyword matching
 *
 * @param searchQuery - Text query for full-text search
 * @param filters - Search filters to apply
 * @param limit - Maximum number of results
 * @param offset - Pagination offset
 * @param communityId - Optional community ID for scoping
 */
async function keywordSearchOnly(
    searchQuery: string,
    filters: SearchFilters,
    limit: number,
    offset: number,
    communityId?: string
): Promise<ScoredMember[]> {
    console.log('[Semantic Search] Executing full-text search...');

    // Build filter conditions with full-text search condition
    const params: any[] = [searchQuery]; // $1 - search query

    const filterResult = buildFilterConditions(filters, communityId, 2);
    const conditions = [
        ...filterResult.conditions,
        'msi.search_vector @@ plainto_tsquery($1)'
    ];
    params.push(...filterResult.params);

    const limitParam = `$${filterResult.nextParamIndex}`;
    const offsetParam = `$${filterResult.nextParamIndex + 1}`;
    params.push(limit, offset);

    const queryText = `
        SELECT
            m.id,
            m.name,
            m.phone,
            m.email,
            cm.member_type,
            cm.role,
            cm.joined_at,
            cm.profile_data,
            ts_rank(msi.search_vector, plainto_tsquery($1)) AS rank
        FROM community_memberships cm
        JOIN members m ON cm.member_id = m.id
        JOIN member_search_index msi ON cm.id = msi.membership_id
        LEFT JOIN communities c ON cm.community_id = c.id
        WHERE ${conditions.join(' AND ')}
        ORDER BY rank DESC
        LIMIT ${limitParam} OFFSET ${offsetParam}
    `;

    const result = await query(queryText, params);

    // Normalize rank scores to 0-1 range
    const maxRank = result.rows[0]?.rank || 1;

    return result.rows.map(row => {
        const profileData = row.profile_data || {};

        return {
            id: row.id,
            name: row.name,
            phone: row.phone,
            email: row.email,
            memberType: row.member_type,
            role: row.role,
            yearOfGraduation: profileData.graduation_year,
            degree: profileData.degree,
            branch: profileData.department,
            workingAs: profileData.designation,
            organization: profileData.current_organization || profileData.organization || profileData.company,
            designation: profileData.designation || profileData.profession,
            city: profileData.city,
            skills: profileData.skills || [],
            productsServices: profileData.services_offered || [],
            annualTurnover: null,
            isActive: true,
            createdAt: row.joined_at,
            updatedAt: row.joined_at,
            relevanceScore: parseFloat(row.rank) / maxRank,
            keywordScore: parseFloat(row.rank) / maxRank,
            matchedFields: identifyMatchedFields(row, filters),
            profileData: profileData
        };
    });
}

/**
 * Hybrid search: Combines semantic and keyword search with multi-community support
 */
export async function hybridSearch(
    searchQuery: string,
    filters: SearchFilters = {},
    options: SearchOptions = {},
    communityId?: string
): Promise<{ members: ScoredMember[]; totalCount: number; debug?: any }> {
    const startTime = Date.now();

    const page = options.page || DEFAULT_PAGE;
    const limit = Math.min(options.limit || DEFAULT_LIMIT, MAX_LIMIT);
    const offset = (page - 1) * limit;

    console.log(`[Semantic Search] ========== SEARCH START ==========`);
    console.log(`[Semantic Search] Query: "${searchQuery}"`);
    console.log(`[Semantic Search] Community: ${communityId || DEFAULT_COMMUNITY_SLUG}`);
    console.log(`[Semantic Search] Filters:`, JSON.stringify(filters, null, 2));

    // Light query cleaning - preserve semantic meaning, remove only punctuation
    // We don't do aggressive cleaning as it can destroy semantic context
    const cleanedQuery = searchQuery
        .replace(/[?!.,;:]/g, '') // Remove punctuation only
        .trim()
        .replace(/\s+/g, ' ');

    console.log(`[Semantic Search] Cleaned query: "${cleanedQuery}"`);

    // Track if embedding was cached (for debug info)
    const wasCached = embeddingCache.get(cleanedQuery) !== null;

    // Generate embedding for the cleaned query (uses cache if available)
    const embedding = await generateQueryEmbedding(cleanedQuery);

    // Execute both search strategies in parallel for optimal performance
    // Get 2x results from each to allow for better merging and ranking
    const [semanticResults, keywordResults] = await Promise.all([
        semanticSearchOnly(embedding, filters, limit * 2, 0, communityId),
        keywordSearchOnly(cleanedQuery, filters, limit * 2, 0, communityId)
    ]);

    console.log(`[Semantic Search] Results: Semantic=${semanticResults.length}, Keyword=${keywordResults.length}`);

    // Merge and deduplicate results with weighted scoring (70% semantic + 30% keyword)
    const mergedResults = mergeResults(semanticResults, keywordResults);

    console.log(`[Semantic Search] Merged: ${mergedResults.length} total results`);
    if (mergedResults.length > 0) {
        console.log(`[Semantic Search] Top 3 results:`);
        mergedResults.slice(0, 3).forEach((m, i) => {
            console.log(`  ${i + 1}. ${m.name} (score: ${m.relevanceScore.toFixed(3)})`);
        });
    }

    // Sort by requested criteria (default: relevance descending)
    const sortedResults = sortResults(mergedResults, options.sortBy, options.sortOrder);

    // Apply pagination to final results
    const paginatedResults = sortedResults.slice(0, limit);
    const totalCount = mergedResults.length;

    const duration = Date.now() - startTime;
    console.log(`[Semantic Search] ✓ Completed in ${duration}ms - returning ${paginatedResults.length} of ${totalCount}`);
    console.log(`[Semantic Search] ========================================\n`);

    // Prepare debug info if needed
    const debugInfo = {
        embeddingCached: wasCached,
        embeddingCacheStats: embeddingCache.getStats(),
        searchStats: {
            semanticResults: semanticResults.length,
            keywordResults: keywordResults.length,
            mergedResults: mergedResults.length,
            finalResults: paginatedResults.length
        },
        filtersApplied: filters,
        cleanedQuery: cleanedQuery
    };

    return {
        members: paginatedResults,
        totalCount,
        debug: debugInfo
    };
}
/**
 * Merge and score results from semantic and keyword searches
 * Uses weighted scoring: 70% semantic + 30% keyword
 * Deduplicates members found in both searches
 *
 * @param semanticResults - Results from vector similarity search
 * @param keywordResults - Results from full-text search
 * @returns Merged and deduplicated results with combined relevance scores
 */
function mergeResults(
    semanticResults: ScoredMember[],
    keywordResults: ScoredMember[]
): ScoredMember[] {
    const memberMap = new Map<string, ScoredMember>();

    // Add semantic results with weighted score
    for (const member of semanticResults) {
        memberMap.set(member.id, {
            ...member,
            relevanceScore: (member.semanticScore || 0) * SEMANTIC_WEIGHT
        });
    }

    // Merge keyword results with weighted score
    for (const member of keywordResults) {
        const existing = memberMap.get(member.id);
        if (existing) {
            // Combine scores from both searches
            existing.relevanceScore =
                (existing.semanticScore || 0) * SEMANTIC_WEIGHT +
                (member.keywordScore || 0) * KEYWORD_WEIGHT;
            existing.keywordScore = member.keywordScore;
            // Merge matched fields
            existing.matchedFields = Array.from(new Set([
                ...existing.matchedFields,
                ...member.matchedFields
            ]));
        } else {
            // Add new member from keyword search only
            memberMap.set(member.id, {
                ...member,
                relevanceScore: (member.keywordScore || 0) * KEYWORD_WEIGHT
            });
        }
    }

    return Array.from(memberMap.values());
}


/**
 * Sort results based on specified criteria
 * Supports sorting by relevance, name, turnover, or graduation year
 *
 * @param members - Members to sort
 * @param sortBy - Field to sort by (default: 'relevance')
 * @param sortOrder - Sort direction (default: 'desc')
 * @returns Sorted array of members
 */
function sortResults(
    members: ScoredMember[],
    sortBy: 'relevance' | 'name' | 'turnover' | 'year' = 'relevance',
    sortOrder: 'asc' | 'desc' = 'desc'
): ScoredMember[] {
    const sorted = [...members];

    sorted.sort((a, b) => {
        let comparison = 0;

        switch (sortBy) {
            case 'name':
                comparison = (a.name || '').localeCompare(b.name || '');
                break;
            case 'turnover':
                comparison = (a.annualTurnover || 0) - (b.annualTurnover || 0);
                break;
            case 'year':
                comparison = (a.yearOfGraduation || 0) - (b.yearOfGraduation || 0);
                break;
            case 'relevance':
            default:
                comparison = a.relevanceScore - b.relevanceScore;
                break;
        }

        return sortOrder === 'asc' ? comparison : -comparison;
    });

    return sorted;
}

/**
 * Get total count of results for pagination
 */
async function getTotalCount(
    searchQuery: string,
    embedding: number[],
    filters: SearchFilters,
    communityId?: string
): Promise<number> {
    // For simplicity, return a count based on filtered results
    // In production, this should be optimized with a COUNT query
    return 100; // Placeholder - implement proper count query later
}

/**
 * Identify which fields matched the search criteria
 * Used for highlighting and explaining search results to users
 *
 * @param row - Database row containing member data
 * @param filters - Applied search filters
 * @returns Array of field names that matched the criteria
 */
function identifyMatchedFields(row: any, filters: SearchFilters): string[] {
    const matched: string[] = [];

    if (filters.city && row.city?.toLowerCase().includes(filters.city.toLowerCase())) {
        matched.push('city');
    }

    if (filters.skills && filters.skills.some(s =>
        row.working_knowledge?.toLowerCase().includes(s.toLowerCase())
    )) {
        matched.push('skills');
    }

    if (filters.services && filters.services.some(s =>
        row.working_knowledge?.toLowerCase().includes(s.toLowerCase())
    )) {
        matched.push('services');
    }

    if (filters.degree && filters.degree.some(d =>
        row.degree?.toLowerCase().includes(d.toLowerCase())
    )) {
        matched.push('degree');
    }

    return matched;
}

/**
 * Main search function - routes to appropriate search method based on search type
 * Supports hybrid (default), semantic-only, and keyword-only searches
 *
 * @param params - Search parameters including query, filters, options, and community scope
 * @returns Object containing matched members and total count
 */
export async function searchMembers(params: SearchParams): Promise<{ members: ScoredMember[]; totalCount: number }> {
    const { query: searchQuery, filters = {}, options = {}, communityId } = params;
    const searchType = options.searchType || 'hybrid';

    if (!searchQuery || searchQuery.trim() === '') {
        // No query - return all with filters only
        return await getAllWithFilters(filters, options, communityId);
    }

    switch (searchType) {
        case 'semantic': {
            const embedding = await generateQueryEmbedding(searchQuery);
            const page = options.page || DEFAULT_PAGE;
            const limit = Math.min(options.limit || DEFAULT_LIMIT, MAX_LIMIT);
            const offset = (page - 1) * limit;
            const members = await semanticSearchOnly(embedding, filters, limit, offset, communityId);
            const totalCount = await getTotalCount(searchQuery, embedding, filters, communityId);
            return { members, totalCount };
        }
        case 'keyword': {
            const page = options.page || DEFAULT_PAGE;
            const limit = Math.min(options.limit || DEFAULT_LIMIT, MAX_LIMIT);
            const offset = (page - 1) * limit;
            const members = await keywordSearchOnly(searchQuery, filters, limit, offset, communityId);
            const totalCount = await getTotalCount(searchQuery, [], filters, communityId);
            return { members, totalCount };
        }
        case 'hybrid':
        default:
            return await hybridSearch(searchQuery, filters, options, communityId);
    }
}

/**
 * Get all members with filters (no search query)
 */
async function getAllWithFilters(
    filters: SearchFilters,
    options: SearchOptions,
    communityId?: string
): Promise<{ members: ScoredMember[]; totalCount: number }> {
    const page = options.page || DEFAULT_PAGE;
    const limit = Math.min(options.limit || DEFAULT_LIMIT, MAX_LIMIT);
    const offset = (page - 1) * limit;

    const conditions: string[] = ['cm.is_active = TRUE', 'm.is_active = TRUE'];
    const params: any[] = [];
    let paramIndex = 1;

    // Add community filter
    if (communityId) {
        conditions.push(`cm.community_id = $${paramIndex}::uuid`);
        params.push(communityId);
        paramIndex++;
    } else {
        conditions.push(`c.slug = $${paramIndex}`);
        params.push(DEFAULT_COMMUNITY_SLUG);
        paramIndex++;
    }

    // For now, return a simple query - implement full filtering later
    const queryText = `
        SELECT 
            m.id,
            m.name,
            m.phone,
            m.email,
            cm.member_type,
            cm.role
        FROM community_memberships cm
        JOIN members m ON cm.member_id = m.id
        LEFT JOIN communities c ON cm.community_id = c.id
        WHERE ${conditions.join(' AND ')}
        ORDER BY m.name
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);

    const result = await query(queryText, params);

    const members: ScoredMember[] = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        phone: row.phone,
        email: row.email,
        memberType: row.member_type,
        role: row.role,
        yearOfGraduation: null,
        degree: null,
        branch: null,
        workingAs: null,
        organization: null,
        designation: null,
        city: null,
        skills: '', // Changed from [] to empty string to match ScoredMember type
        productsServices: '', // Changed from [] to empty string
        annualTurnover: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        relevanceScore: 0,
        matchedFields: []
    }));

    return {
        members,
        totalCount: 100 // Placeholder
    };
}
