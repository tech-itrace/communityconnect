/**
 * Semantic Search Service
 * 
 * Implements hybrid search combining:
 * - Vector similarity search (pgvector with embeddings)
 * - Full-text search (PostgreSQL tsvector)
 * - Filtering and ranking
 * 
 * Multi-Community Support:
 * - Searches within a specific community context
 * - Uses community_memberships for member association
 * - Supports type-specific profiles (alumni, entrepreneur, resident)
 */

import dotenv from 'dotenv';
import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';
import pool, { query } from '../config/db';
import {
    SearchParams,
    SearchFilters,
    SearchOptions,
    MemberSearchResult,
    ScoredMember,
    Member,
    EmbeddingResult
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
 * Generate embedding using DeepInfra
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
 * Generate embedding using Gemini (fallback)
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
 */
export async function generateQueryEmbedding(queryText: string): Promise<number[]> {
    if (!DEEPINFRA_API_KEY) {
        throw new Error('DEEPINFRA_API_KEY not configured');
    }

    const startTime = Date.now();

    try {
        console.log(`[Semantic Search] Generating embedding for: "${queryText.substring(0, 50)}${queryText.length > 50 ? '...' : ''}"`);

        const embedding = await generateEmbeddingDeepInfra(queryText);
        const duration = Date.now() - startTime;

        // Validate embedding quality
        validateEmbedding(embedding, queryText);

        console.log(`[Semantic Search] ✓ Generated ${EMBEDDING_DIMENSIONS}D embedding in ${duration}ms (DeepInfra)`);
        return embedding;

    } catch (error: any) {
        const isRateLimit = error.response?.status === 429;
        const isTimeout = error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED';

        if ((isRateLimit || isTimeout) && GOOGLE_API_KEY) {
            console.log(`[Semantic Search] DeepInfra failed (${error.message}), trying Gemini fallback...`);
            try {
                const embedding = await generateEmbeddingGemini(queryText);
                const duration = Date.now() - startTime;

                // Validate embedding quality
                validateEmbedding(embedding, queryText);

                console.log(`[Semantic Search] ✓ Generated ${EMBEDDING_DIMENSIONS}D embedding in ${duration}ms (Gemini)`);
                console.warn(`[Semantic Search] ⚠ Using fallback model - results may differ from stored embeddings`);
                return embedding;
            } catch (geminiError: any) {
                console.error('[Semantic Search] ✗ Gemini fallback failed:', geminiError.message);
                throw new Error(`Both embedding providers failed: ${error.message}`);
            }
        }

        console.error('[Semantic Search] ✗ Error generating embedding:', error.message);
        throw new Error(`Failed to generate embedding: ${error.message}`);
    }
}

/**
 * Execute semantic (vector similarity) search
 * Updated for multi-community schema
 */
async function semanticSearchOnly(
    embedding: number[],
    filters: SearchFilters,
    limit: number,
    offset: number,
    communityId?: string
): Promise<ScoredMember[]> {
    console.log('[Semantic Search] Executing vector similarity search...');

    // Build filter conditions
    const conditions: string[] = ['cm.is_active = TRUE', 'm.is_active = TRUE'];
    const params: any[] = [`[${embedding.join(',')}]`]; // $1 - embedding vector
    let paramIndex = 2;

    // Add community filter
    if (communityId) {
        conditions.push(`cm.community_id = $${paramIndex}::uuid`);
        params.push(communityId);
        paramIndex++;
    } else {
        // Default to main community for backward compatibility
        conditions.push(`c.slug = $${paramIndex}`);
        params.push(DEFAULT_COMMUNITY_SLUG);
        paramIndex++;
    }

    // City filter - check in JSONB profile_data
    if (filters.city) {
        conditions.push(`(cm.profile_data->>'city' ILIKE $${paramIndex})`);
        params.push(`%${filters.city}%`);
        paramIndex++;
    }

    // Skills filter - use case-insensitive JSONB text search instead of exact match
    // Note: Don't apply skill filters to semantic search - embeddings already encode this
    // The filters are too restrictive and cause false negatives due to case sensitivity
    // if (filters.skills && filters.skills.length > 0) {
    //     const skillConditions = filters.skills.map(() => {
    //         const cond = `(cm.profile_data->'skills' ? $${paramIndex})`;
    //         paramIndex++;
    //         return cond;
    //     });
    //     conditions.push(`(${skillConditions.join(' OR ')})`);
    //     params.push(...filters.skills);
    // }

    // Services filter - use case-insensitive JSONB text search instead of exact match
    // Note: Don't apply service filters to semantic search - embeddings already encode this
    // if (filters.services && filters.services.length > 0) {
    //     const serviceConditions = filters.services.map(() => {
    //         const cond = `(cm.profile_data->'services_offered' ? $${paramIndex})`;
    //         paramIndex++;
    //         return cond;
    //     });
    //     conditions.push(`(${serviceConditions.join(' OR ')})`);
    //     params.push(...filters.services);
    // }

    // Year of graduation filter - for alumni only
    if (filters.yearOfGraduation && filters.yearOfGraduation.length > 0) {
        conditions.push(`(
            cm.member_type = 'alumni'
            AND (cm.profile_data->>'graduation_year')::int = ANY($${paramIndex}::int[])
        )`);
        params.push(filters.yearOfGraduation);
        paramIndex++;
    }

    // Degree filter - for alumni only
    if (filters.degree && filters.degree.length > 0) {
        const degreeConditions = filters.degree.map(() => {
            const cond = `(cm.profile_data->>'degree' ILIKE $${paramIndex})`;
            paramIndex++;
            return cond;
        });
        conditions.push(`(cm.member_type = 'alumni' AND (${degreeConditions.join(' OR ')}))`);
        params.push(...filters.degree.map(d => `%${d}%`));
    }

    // Add limit and offset
    const limitParam = `$${paramIndex}`;
    const offsetParam = `$${paramIndex + 1}`;
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
 * Updated for multi-community schema
 */
async function keywordSearchOnly(
    searchQuery: string,
    filters: SearchFilters,
    limit: number,
    offset: number,
    communityId?: string
): Promise<ScoredMember[]> {
    console.log('[Semantic Search] Executing full-text search...');

    // Build filter conditions
    const conditions: string[] = [
        'cm.is_active = TRUE',
        'm.is_active = TRUE',
        'msi.search_vector @@ plainto_tsquery($1)'
    ];
    const params: any[] = [searchQuery];
    let paramIndex = 2;

    // Add community filter
    if (communityId) {
        conditions.push(`cm.community_id = $${paramIndex}::uuid`);
        params.push(communityId);
        paramIndex++;
    } else {
        // Default to main community for backward compatibility
        conditions.push(`c.slug = $${paramIndex}`);
        params.push(DEFAULT_COMMUNITY_SLUG);
        paramIndex++;
    }

    // Apply same filters as semantic search - using JSONB profile_data
    if (filters.city) {
        conditions.push(`(cm.profile_data->>'city' ILIKE $${paramIndex})`);
        params.push(`%${filters.city}%`);
        paramIndex++;
    }

    // DISABLED: Case-sensitive JSONB filters cause false negatives
    // The keyword search already searches profile text, so these filters are redundant
    // if (filters.skills && filters.skills.length > 0) {
    //     const skillConditions = filters.skills.map(() => {
    //         const cond = `(cm.profile_data->'skills' ? $${paramIndex})`;
    //         paramIndex++;
    //         return cond;
    //     });
    //     conditions.push(`(${skillConditions.join(' OR ')})`);
    //     params.push(...filters.skills);
    // }

    // if (filters.services && filters.services.length > 0) {
    //     const serviceConditions = filters.services.map(() => {
    //         const cond = `(cm.profile_data->'services_offered' ? $${paramIndex})`;
    //         paramIndex++;
    //         return cond;
    //     });
    //     conditions.push(`(${serviceConditions.join(' OR ')})`);
    //     params.push(...filters.services);
    // }

    if (filters.yearOfGraduation && filters.yearOfGraduation.length > 0) {
        conditions.push(`(
            cm.member_type = 'alumni'
            AND (cm.profile_data->>'graduation_year')::int = ANY($${paramIndex}::int[])
        )`);
        params.push(filters.yearOfGraduation);
        paramIndex++;
    }

    if (filters.degree && filters.degree.length > 0) {
        const degreeConditions = filters.degree.map(() => {
            const cond = `(cm.profile_data->>'degree' ILIKE $${paramIndex})`;
            paramIndex++;
            return cond;
        });
        conditions.push(`(cm.member_type = 'alumni' AND (${degreeConditions.join(' OR ')}))`);
        params.push(...filters.degree.map(d => `%${d}%`));
    }

    const limitParam = `$${paramIndex}`;
    const offsetParam = `$${paramIndex + 1}`;
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
 * Hybrid search: Combines semantic and keyword search
 */
// export async function hybridSearch(
//     searchQuery: string,
//     filters: SearchFilters = {},
//     options: SearchOptions = {}
// ): Promise<{ members: ScoredMember[]; totalCount: number }> {
//     const startTime = Date.now();

//     const page = options.page || DEFAULT_PAGE;
//     const limit = Math.min(options.limit || DEFAULT_LIMIT, MAX_LIMIT);
//     const offset = (page - 1) * limit;

//     console.log(`[Semantic Search] Starting hybrid search for: "${searchQuery}"`);
//     console.log(`[Semantic Search] Filters:`, filters);
//     console.log(`[Semantic Search] Page: ${page}, Limit: ${limit}`);

//     // Generate embedding for the query
//     const embedding = await generateQueryEmbedding(searchQuery);

//     // Execute both searches in parallel
//     const [semanticResults, keywordResults] = await Promise.all([
//         semanticSearchOnly(embedding, filters, limit * 2, 0), // Get more results for merging
//         keywordSearchOnly(searchQuery, filters, limit * 2, 0)
//     ]);

//     console.log(`[Semantic Search] Semantic results: ${semanticResults.length}`);
//     console.log(`[Semantic Search] Keyword results: ${keywordResults.length}`);

//     // Merge and score results
//     const mergedResults = mergeResults(semanticResults, keywordResults);

//     // Get total count for pagination
//     const totalCount = await getTotalCount(searchQuery, embedding, filters);

//     // Apply sorting
//     const sortedResults = sortResults(mergedResults, options.sortBy, options.sortOrder);

//     // Apply pagination
//     const paginatedResults = sortedResults.slice(0, limit);

//     const duration = Date.now() - startTime;
//     console.log(`[Semantic Search] Hybrid search completed in ${duration}ms`);
//     console.log(`[Semantic Search] Returning ${paginatedResults.length} results (total: ${totalCount})`);

//     return {
//         members: paginatedResults,
//         totalCount
//     };
// }

export async function hybridSearch(
    searchQuery: string,
    filters: SearchFilters = {},
    options: SearchOptions = {},
    communityId?: string
): Promise<{ members: ScoredMember[]; totalCount: number }> {
    const startTime = Date.now();

    const page = options.page || DEFAULT_PAGE;
    const limit = Math.min(options.limit || DEFAULT_LIMIT, MAX_LIMIT);
    const offset = (page - 1) * limit;

    console.log(`[Semantic Search] ========== SEARCH START ==========`);
    console.log(`[Semantic Search] Query: "${searchQuery}"`);
    console.log(`[Semantic Search] Community: ${communityId || DEFAULT_COMMUNITY_SLUG}`);
    console.log(`[Semantic Search] Filters:`, JSON.stringify(filters, null, 2));

    // Light query cleaning - remove only punctuation, keep semantic meaning
    const cleanedQuery = searchQuery
        .replace(/[?!.,;:]/g, '') // Remove punctuation only
        .trim()
        .replace(/\s+/g, ' ');

    console.log(`[Semantic Search] Cleaned query: "${cleanedQuery}"`);

    // Generate embedding for the cleaned query
    const embedding = await generateQueryEmbedding(cleanedQuery);

    // Execute searches in parallel
    const [semanticResults, keywordResults] = await Promise.all([
        semanticSearchOnly(embedding, filters, limit * 2, 0, communityId),
        keywordSearchOnly(cleanedQuery, filters, limit * 2, 0, communityId)
    ]);

    console.log(`[Semantic Search] Results: Semantic=${semanticResults.length}, Keyword=${keywordResults.length}`);

    // Merge results with simple scoring
    const mergedResults = mergeResults(semanticResults, keywordResults);

    console.log(`[Semantic Search] Merged: ${mergedResults.length} total results`);
    if (mergedResults.length > 0) {
        console.log(`[Semantic Search] Top 3 results:`);
        mergedResults.slice(0, 3).forEach((m, i) => {
            console.log(`  ${i + 1}. ${m.name} (score: ${m.relevanceScore.toFixed(3)})`);
        });
    }

    // Sort by relevance
    const sortedResults = sortResults(mergedResults, options.sortBy, options.sortOrder);
    const paginatedResults = sortedResults.slice(0, limit);
    const totalCount = mergedResults.length;

    const duration = Date.now() - startTime;
    console.log(`[Semantic Search] ✓ Completed in ${duration}ms - returning ${paginatedResults.length} of ${totalCount}`);
    console.log(`[Semantic Search] ========================================\n`);

    return {
        members: paginatedResults,
        totalCount
    };
}
/**
 * Simplified merge results with weighted scoring
 * No complex exact matching - let the embeddings and ranking do their job
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
 */
function sortResults(
    members: ScoredMember[],
    sortBy: string = 'relevance',
    sortOrder: string = 'desc'
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
 * Main search function - routes to appropriate search method
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
