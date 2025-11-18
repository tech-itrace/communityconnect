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
 * Generate embedding for a search query with fallback support
 */
export async function generateQueryEmbedding(queryText: string): Promise<number[]> {
    if (!DEEPINFRA_API_KEY) {
        throw new Error('DEEPINFRA_API_KEY not configured');
    }

    try {
        console.log(`[Semantic Search] Generating embedding for query: "${queryText.substring(0, 50)}..."`);

        const embedding = await generateEmbeddingDeepInfra(queryText);
        console.log(`[Semantic Search] ✓ Generated ${EMBEDDING_DIMENSIONS}-dimensional embedding (DeepInfra)`);
        return embedding;

    } catch (error: any) {
        const isRateLimit = error.response?.status === 429;
        const isTimeout = error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED';

        if ((isRateLimit || isTimeout) && GOOGLE_API_KEY) {
            console.log(`[Semantic Search] DeepInfra failed, trying Gemini fallback...`);
            try {
                const embedding = await generateEmbeddingGemini(queryText);
                console.log(`[Semantic Search] ✓ Generated ${EMBEDDING_DIMENSIONS}-dimensional embedding (Gemini)`);
                return embedding;
            } catch (geminiError: any) {
                console.error('[Semantic Search] Gemini fallback also failed:', geminiError.message);
                throw new Error(`Both embedding providers failed: ${error.message}`);
            }
        }

        console.error('[Semantic Search] Error generating embedding:', error.message);
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

    // Skills filter - check in JSONB profile_data
    if (filters.skills && filters.skills.length > 0) {
        const skillConditions = filters.skills.map(() => {
            const cond = `(cm.profile_data->'skills' ? $${paramIndex})`;
            paramIndex++;
            return cond;
        });
        conditions.push(`(${skillConditions.join(' OR ')})`);
        params.push(...filters.skills);
    }

    // Services filter - check in JSONB profile_data
    if (filters.services && filters.services.length > 0) {
        const serviceConditions = filters.services.map(() => {
            const cond = `(cm.profile_data->'services_offered' ? $${paramIndex})`;
            paramIndex++;
            return cond;
        });
        conditions.push(`(${serviceConditions.join(' OR ')})`);
        params.push(...filters.services);
    }

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

    if (filters.skills && filters.skills.length > 0) {
        const skillConditions = filters.skills.map(() => {
            const cond = `(cm.profile_data->'skills' ? $${paramIndex})`;
            paramIndex++;
            return cond;
        });
        conditions.push(`(${skillConditions.join(' OR ')})`);
        params.push(...filters.skills);
    }

    if (filters.services && filters.services.length > 0) {
        const serviceConditions = filters.services.map(() => {
            const cond = `(cm.profile_data->'services_offered' ? $${paramIndex})`;
            paramIndex++;
            return cond;
        });
        conditions.push(`(${serviceConditions.join(' OR ')})`);
        params.push(...filters.services);
    }

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

    // Log community context
    if (communityId) {
        console.log(`[Semantic Search] Community context: ${communityId}`);
    } else {
        console.log(`[Semantic Search] Using default community: ${DEFAULT_COMMUNITY_SLUG}`);
    }

    // AGGRESSIVE query cleaning
    const cleanedQuery = searchQuery
        .toLowerCase()
        .replace(/\b(who|what|where|when|why|how|whose)\b/gi, '')
        .replace(/\b(is|are|was|were|am|be|been|being|do|does|did|have|has|had)\b/gi, '')
        .replace(/\b(i|me|my|you|your|we|our|they|their)\b/gi, '')
        .replace(/\b(need|want|looking|search|find|show|give|get|tell|know)\b/gi, '')
        .replace(/\b(details?|info|information|about|of|the|and|profile|contact|data|record)\b/gi, '')
        .replace(/\b(a|an|the|in|on|at|to|for|with|from|by)\b/gi, '')
        .replace(/[?!.,;:]/g, '') // Remove punctuation
        .trim()
        .replace(/\s+/g, ' ');

    const finalQuery = cleanedQuery.length >= 2 ? cleanedQuery : searchQuery.trim();

    console.log(`[Semantic Search] ========== SEARCH START ==========`);
    console.log(`[Semantic Search] Original: "${searchQuery}"`);
    console.log(`[Semantic Search] Cleaned: "${cleanedQuery}"`);
    console.log(`[Semantic Search] Final: "${finalQuery}"`);
    console.log(`[Semantic Search] ==================================`);

    const embedding = await generateQueryEmbedding(finalQuery);

    const [semanticResults, keywordResults] = await Promise.all([
        semanticSearchOnly(embedding, filters, limit * 2, 0, communityId),
        keywordSearchOnly(finalQuery, filters, limit * 2, 0, communityId)
    ]);

    console.log(`[Semantic Search] Semantic: ${semanticResults.length}, Keyword: ${keywordResults.length}`);

    const mergedResults = mergeResults(semanticResults, keywordResults, finalQuery);

    console.log(`[Semantic Search] ========== MERGED (top 5) ==========`);
    mergedResults.slice(0, 5).forEach((m, i) => {
        console.log(`${i + 1}. ${m.name} | Exact: ${m.isExactMatch} | Score: ${m.relevanceScore.toFixed(3)}`);
    });

    // STRICT FILTERING: For person name searches, ONLY return exact matches
    let filteredResults = filterForPersonSearch(mergedResults, finalQuery);

    console.log(`[Semantic Search] ========== AFTER FILTER ==========`);
    console.log(`[Semantic Search] Filtered to ${filteredResults.length} results`);
    filteredResults.slice(0, 5).forEach((m, i) => {
        console.log(`${i + 1}. ${m.name} | Exact: ${m.isExactMatch}`);
    });

    const sortedResults = sortResults(filteredResults, options.sortBy, options.sortOrder);
    const paginatedResults = sortedResults.slice(0, limit);
    const totalCount = filteredResults.length;

    const duration = Date.now() - startTime;
    console.log(`[Semantic Search] ========== FINAL ==========`);
    console.log(`[Semantic Search] Completed in ${duration}ms`);
    console.log(`[Semantic Search] Returning ${paginatedResults.length} of ${totalCount}`);
    console.log(`[Semantic Search] ============================`);

    return {
        members: paginatedResults,
        totalCount
    };
}
/**
 * Check if a member is an exact match for the search query
 */
function isExactMatch(member: any, searchQuery: string): boolean {
    const query = searchQuery.toLowerCase().trim();
    const searchTerms = query.split(/\s+/).filter((t: string) => t.length > 0);
    const memberName = member.name?.toLowerCase().trim() || '';

    // Split name into words and remove titles
    const nameWords = memberName
        .split(/\s+/)
        .map((w: string) => w.replace(/[.,]/g, ''))
        .filter((w: string) => w.length > 0);

    // Remove common titles
    const cleanNameWords = nameWords.filter((word: string) =>
        !['mr', 'mrs', 'ms', 'dr', 'prof'].includes(word)
    );

    const cleanFullName = cleanNameWords.join(' ');

    console.log(`[isExactMatch] Comparing "${query}" with "${memberName}" (cleaned: "${cleanFullName}")`);

    // 1. Exact full name match (with or without titles)
    if (cleanFullName === query || memberName === query) {
        console.log(`[isExactMatch] ✓ Full name match`);
        return true;
    }

    // 2. For single word searches
    if (searchTerms.length === 1) {
        const searchTerm = searchTerms[0];
        const firstWord = cleanNameWords[0];
        const lastWord = cleanNameWords[cleanNameWords.length - 1];

        const isMatch = firstWord === searchTerm || lastWord === searchTerm;
        console.log(`[isExactMatch] Single word "${searchTerm}" - first:"${firstWord}" last:"${lastWord}" - Match: ${isMatch}`);
        return isMatch;
    }

    // 3. For multi-word searches (e.g., "fatima mary")
    if (searchTerms.length >= 2) {
        // Check if search terms form a consecutive sequence in the name
        const cleanNameString = cleanNameWords.join(' ');
        const searchString = searchTerms.join(' ');

        if (cleanNameString === searchString) {
            console.log(`[isExactMatch] ✓ Exact consecutive match`);
            return true;
        }

        // Check if name contains the search terms consecutively
        if (cleanNameString.includes(searchString)) {
            console.log(`[isExactMatch] ✓ Contains consecutive match`);
            return true;
        }

        // Check if all search terms exist in name (for "fatima mary" matching "Fatima Mary Smith")
        const allTermsExist = searchTerms.every((term: string) =>
            cleanNameWords.includes(term)
        );

        if (allTermsExist && searchTerms.length >= 2) {
            // Additional validation: first 2 search terms should match first 2 name words
            const firstTwoMatch = searchTerms.slice(0, 2).every((term: string, idx: number) =>
                cleanNameWords[idx] === term
            );

            console.log(`[isExactMatch] All terms exist: ${allTermsExist}, First two match: ${firstTwoMatch}`);

            if (firstTwoMatch) {
                console.log(`[isExactMatch] ✓ Multi-word match (first names match)`);
                return true;
            }
        }
    }

    // 4. Email exact match
    if (member.email?.toLowerCase().trim() === query) {
        console.log(`[isExactMatch] ✓ Email match`);
        return true;
    }

    // 5. Phone exact match
    const cleanPhone = member.phone?.replace(/[\s\-\(\)+]/g, '');
    const cleanQuery = query.replace(/[\s\-\(\)+]/g, '');
    if (cleanPhone && cleanPhone === cleanQuery) {
        console.log(`[isExactMatch] ✓ Phone match`);
        return true;
    }

    console.log(`[isExactMatch] ✗ No match`);
    return false;
}

/**
 * Merge results from semantic and keyword searches with weighted scoring
 */
// function mergeResults(semanticResults: ScoredMember[], keywordResults: ScoredMember[]): ScoredMember[] {
//     const memberMap = new Map<string, ScoredMember>();

//     // Add semantic results
//     for (const member of semanticResults) {
//         memberMap.set(member.id, {
//             ...member,
//             relevanceScore: (member.semanticScore || 0) * SEMANTIC_WEIGHT
//         });
//     }

//     // Merge keyword results
//     for (const member of keywordResults) {
//         const existing = memberMap.get(member.id);
//         if (existing) {
//             // Combine scores
//             existing.relevanceScore =
//                 (existing.semanticScore || 0) * SEMANTIC_WEIGHT +
//                 (member.keywordScore || 0) * KEYWORD_WEIGHT;
//             existing.keywordScore = member.keywordScore;
//             // Merge matched fields
//             existing.matchedFields = Array.from(new Set([
//                 ...existing.matchedFields,
//                 ...member.matchedFields
//             ]));
//         } else {
//             // Add new member with keyword score only
//             memberMap.set(member.id, {
//                 ...member,
//                 relevanceScore: (member.keywordScore || 0) * KEYWORD_WEIGHT
//             });
//         }
//     }

//     return Array.from(memberMap.values());
// }

function mergeResults(
    semanticResults: ScoredMember[],
    keywordResults: ScoredMember[],
    searchQuery: string
): ScoredMember[] {
    const memberMap = new Map<string, ScoredMember>();

    // Add semantic results
    for (const member of semanticResults) {
        const isExact = isExactMatch(member, searchQuery);
        if (isExact) {
            console.log(`[Semantic Search] Exact match found: ${member.name}`);
        }
        memberMap.set(member.id, {
            ...member,
            relevanceScore: isExact ? 1.0 : (member.semanticScore || 0) * SEMANTIC_WEIGHT,
            isExactMatch: isExact
        });
    }

    // Merge keyword results
    for (const member of keywordResults) {
        const existing = memberMap.get(member.id);
        const isExact = isExactMatch(member, searchQuery);

        if (isExact) {
            console.log(`[Semantic Search] Exact match found in keyword results: ${member.name}`);
        }

        if (existing) {
            if (isExact || existing.isExactMatch) {
                existing.relevanceScore = 1.0;
                existing.isExactMatch = true;
            } else {
                existing.relevanceScore =
                    (existing.semanticScore || 0) * SEMANTIC_WEIGHT +
                    (member.keywordScore || 0) * KEYWORD_WEIGHT;
            }
            existing.keywordScore = member.keywordScore;
            existing.matchedFields = Array.from(new Set([
                ...existing.matchedFields,
                ...member.matchedFields
            ]));
        } else {
            memberMap.set(member.id, {
                ...member,
                relevanceScore: isExact ? 1.0 : (member.keywordScore || 0) * KEYWORD_WEIGHT,
                isExactMatch: isExact
            });
        }
    }

    return Array.from(memberMap.values());
}

function filterForPersonSearch(
    members: ScoredMember[],
    searchQuery: string
): ScoredMember[] {
    const trimmedQuery = searchQuery.trim().toLowerCase();
    const words = trimmedQuery.split(/\s+/).filter(w => w.length > 0);

    console.log(`[Filter] Query: "${trimmedQuery}" (${words.length} words)`);
    console.log(`[Filter] Total members before filter: ${members.length}`);

    // Check if this looks like a person name search
    const hasEmailChars = /@/.test(trimmedQuery);
    const isPhoneNumber = /^\+?[\d\s\-\(\)]+$/.test(trimmedQuery);
    const hasNumbers = /\d/.test(trimmedQuery);
    const hasSpecialChars = /[!@#$%^&*()_+=\[\]{};:'",.<>?\/\\|`~]/.test(trimmedQuery);

    // If it has technical/search indicators, don't treat as person search
    const technicalKeywords = ['skill', 'skills', 'work', 'experience', 'organization', 'company', 'location', 'city'];
    const hasTechnicalWords = technicalKeywords.some(kw => trimmedQuery.includes(kw));

    const looksLikePersonName = !hasEmailChars &&
        !isPhoneNumber &&
        !hasNumbers &&
        !hasSpecialChars &&
        !hasTechnicalWords &&
        words.length >= 1 &&
        words.length <= 3;

    console.log(`[Filter] Looks like person name: ${looksLikePersonName}`);

    if (!looksLikePersonName) {
        console.log(`[Filter] Not a person search → returning all ${members.length}`);
        return members;
    }

    // Count exact matches
    const exactMatches = members.filter(m => m.isExactMatch === true);

    console.log(`[Filter] Found ${exactMatches.length} exact matches`);

    if (exactMatches.length > 0) {
        console.log(`[Filter] ✓ Returning ONLY ${exactMatches.length} exact match(es):`);
        exactMatches.forEach((m, i) => {
            console.log(`  ${i + 1}. ${m.name}`);
        });
        return exactMatches;
    }

    // NO EXACT MATCHES - Be very strict for single-word name searches
    if (words.length === 1) {
        const searchWord = words[0];
        console.log(`[Filter] Single word "${searchWord}" - applying strict matching`);

        // Only keep if the word appears as FIRST or LAST name (not middle/title)
        const veryStrictMatches = members.filter(m => {
            const nameLower = (m.name || '').toLowerCase();
            const nameWords = nameLower
                .split(/\s+/)
                .map(w => w.replace(/[.,]/g, ''))
                .filter(w => w.length > 0 && !['mr', 'mrs', 'ms', 'dr', 'prof'].includes(w));

            if (nameWords.length === 0) return false;

            const firstName = nameWords[0];
            const lastName = nameWords[nameWords.length - 1];

            return firstName === searchWord || lastName === searchWord;
        });

        if (veryStrictMatches.length > 0) {
            console.log(`[Filter] ${veryStrictMatches.length} very strict matches (first/last name only)`);

            // Limit to top 1 by relevance score
            const topMatch = veryStrictMatches.sort((a, b) => b.relevanceScore - a.relevanceScore)[0];
            console.log(`[Filter] Returning top 1: ${topMatch.name}`);
            return [topMatch];
        }
    }

    // Multi-word: keep top 1 by relevance
    console.log(`[Filter] No exact matches, returning top 1 by relevance`);
    const topOne = members.sort((a, b) => b.relevanceScore - a.relevanceScore)[0];
    return topOne ? [topOne] : [];
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
        // CRITICAL: Always put exact matches first, regardless of sort criteria
        if (a.isExactMatch && !b.isExactMatch) return -1;
        if (!a.isExactMatch && b.isExactMatch) return 1;

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
