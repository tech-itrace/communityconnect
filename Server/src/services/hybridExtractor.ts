/**
 * Hybrid Entity Extraction Service
 * 
 * Combines regex extraction (fast, 80% coverage) with LLM fallback (accurate, 20% coverage)
 * to optimize both speed and accuracy for member search queries.
 * 
 * Decision Flow:
 * 1. Try intent classification (0-2ms)
 * 2. Try regex extraction (5-10ms)
 * 3. If regex confidence < threshold → LLM fallback (2-5s)
 * 4. Merge and return unified result
 * 
 * Performance Targets:
 * - 80% queries: <20ms (regex only)
 * - 20% queries: <3s (regex + LLM)
 * - Overall accuracy: 90-95%
 * 
 * Reference: TODO_queryOptimisation.md (Task 2.3)
 */

import { ParsedQuery, ExtractedEntities } from '../utils/types';
import { extractWithRegex, RegexExtractionResult, ExtractedEntities as RegexEntities } from './regexExtractor';
import { classifyIntent, Intent, IntentResult } from './intentClassifier';
import { parseQuery } from './llmService';

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Confidence threshold for LLM fallback
 * - Below this: trigger LLM extraction
 * - Above this: use regex result only
 */
const LLM_FALLBACK_THRESHOLD = 0.5;

/**
 * Intent confidence threshold
 * - Below this: treat as uncertain, prefer LLM
 */
const INTENT_CONFIDENCE_THRESHOLD = 0.6;

/**
 * Enable/disable caching (for future implementation)
 */
const ENABLE_CACHING = false;

// ============================================================================
// TYPES
// ============================================================================

export type ExtractionMethod = 'regex' | 'llm' | 'hybrid' | 'cached';

export interface HybridExtractionResult {
    intent: Intent;
    entities: ExtractedEntities;
    confidence: number;
    method: ExtractionMethod;
    extractionTime: number;
    metadata: {
        regexResult?: RegexExtractionResult;
        intentResult: IntentResult;
        llmUsed: boolean;
        llmFallbackReason?: string;
        needsLLM?: boolean;
    };
}

// ============================================================================
// MAIN EXTRACTION FUNCTION
// ============================================================================

/**
 * Extract entities from natural language query using hybrid approach
 * 
 * @param query - User's natural language query
 * @param context - Optional conversation context for follow-up queries
 * @returns HybridExtractionResult with intent, entities, and metadata
 */
export async function extractEntities(
    query: string,
    context?: string
): Promise<HybridExtractionResult> {
    const startTime = Date.now();

    console.log(`\n[Hybrid Extractor] ========================================`);
    console.log(`[Hybrid Extractor] Query: "${query}"`);

    try {
        // Step 1: Intent Classification (fast, 0-2ms)
        console.log(`[Hybrid Extractor] Step 1: Intent classification...`);
        const intentResult = classifyIntent(query);
        console.log(`[Hybrid Extractor] ✓ Intent: ${intentResult.primary} (confidence: ${intentResult.confidence})`);

        // Step 2: Regex Extraction (fast, 5-10ms)
        console.log(`[Hybrid Extractor] Step 2: Regex extraction...`);
        const regexResult = extractWithRegex(query);
        console.log(`[Hybrid Extractor] ✓ Regex confidence: ${regexResult.confidence}`);
        console.log(`[Hybrid Extractor] ✓ Matched patterns: [${regexResult.matched_patterns.join(', ')}]`);
        console.log(`[Hybrid Extractor] ✓ Entities:`, JSON.stringify(regexResult.entities, null, 2));

        // Step 3: Decision - Do we need LLM?
        const needsLLM = shouldUseLLM(regexResult, intentResult, query);

        if (!needsLLM) {
            // Fast path: Regex is good enough
            const extractionTime = Date.now() - startTime;
            console.log(`[Hybrid Extractor] ✓ Using regex result only (${extractionTime}ms)`);
            console.log(`[Hybrid Extractor] ========================================\n`);

            return {
                intent: intentResult.primary,
                entities: normalizeRegexEntities(regexResult.entities),
                confidence: regexResult.confidence,
                method: 'regex',
                extractionTime,
                metadata: {
                    regexResult,
                    intentResult,
                    llmUsed: false,
                    needsLLM: false
                }
            };
        }

        // Step 4: LLM Fallback (slow, 2-5s)
        console.log(`[Hybrid Extractor] Step 3: LLM fallback triggered...`);
        console.log(`[Hybrid Extractor] Reason: ${getLLMFallbackReason(regexResult, intentResult)}`);

        const llmResult = await parseQuery(query, context);
        const llmExtractionTime = Date.now() - startTime;
        console.log(`[Hybrid Extractor] ✓ LLM extraction complete (${llmExtractionTime}ms)`);

        // Step 5: Merge results intelligently
        const mergedResult = mergeResults(regexResult, llmResult, intentResult);
        const totalTime = Date.now() - startTime;

        console.log(`[Hybrid Extractor] ✓ Merged result (total: ${totalTime}ms)`);
        console.log(`[Hybrid Extractor] ========================================\n`);

        return {
            intent: mergedResult.intent as Intent,
            entities: mergedResult.entities,
            confidence: mergedResult.confidence,
            method: determineMethod(regexResult, llmResult),
            extractionTime: totalTime,
            metadata: {
                regexResult,
                intentResult,
                llmUsed: true,
                llmFallbackReason: getLLMFallbackReason(regexResult, intentResult),
                needsLLM: true
            }
        };

    } catch (error) {
        const extractionTime = Date.now() - startTime;
        console.error(`[Hybrid Extractor] ✗ Error during extraction:`, error);

        // Fallback to regex result even if LLM fails
        const regexResult = extractWithRegex(query);
        const intentResult = classifyIntent(query);

        return {
            intent: intentResult.primary,
            entities: normalizeRegexEntities(regexResult.entities),
            confidence: Math.max(0.3, regexResult.confidence * 0.8), // Reduce confidence on error
            method: 'regex',
            extractionTime,
            metadata: {
                regexResult,
                intentResult,
                llmUsed: false,
                llmFallbackReason: `LLM error: ${error instanceof Error ? error.message : 'Unknown'}`,
                needsLLM: true
            }
        };
    }
}

// ============================================================================
// DECISION LOGIC
// ============================================================================

/**
 * Determine if LLM extraction is needed
 * 
 * LLM is used when:
 * - Regex confidence < threshold (0.5)
 * - Intent confidence < threshold (0.6) 
 * - Query contains complex language patterns
 * - Query has ambiguous entities
 */
function shouldUseLLM(
    regexResult: RegexExtractionResult,
    intentResult: IntentResult,
    query: string
): boolean {
    // Rule 1: Low regex confidence → needs LLM
    if (regexResult.confidence < LLM_FALLBACK_THRESHOLD) {
        console.log(`[Decision] LLM needed: Regex confidence ${regexResult.confidence} < ${LLM_FALLBACK_THRESHOLD}`);
        return true;
    }

    // Rule 2: Low intent confidence → needs LLM
    if (intentResult.confidence < INTENT_CONFIDENCE_THRESHOLD) {
        console.log(`[Decision] LLM needed: Intent confidence ${intentResult.confidence} < ${INTENT_CONFIDENCE_THRESHOLD}`);
        return true;
    }

    // Rule 3: Specific person queries with no name extracted → needs LLM
    if (intentResult.primary === 'find_specific_person' && !query.match(/\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/)) {
        console.log(`[Decision] LLM needed: Specific person query but no name pattern found`);
        return true;
    }

    // Rule 4: Complex queries with multiple clauses → needs LLM
    if (query.includes(' and ') || query.includes(' or ') || query.includes(' but ')) {
        console.log(`[Decision] LLM needed: Complex query with logical operators`);
        return true;
    }

    // Rule 5: Very few entities extracted → might be ambiguous
    if (regexResult.matched_patterns.length === 0) {
        console.log(`[Decision] LLM needed: No patterns matched`);
        return true;
    }

    console.log(`[Decision] Regex sufficient: confidence ${regexResult.confidence}, ${regexResult.matched_patterns.length} patterns`);
    return false;
}

/**
 * Get human-readable reason for LLM fallback
 */
function getLLMFallbackReason(
    regexResult: RegexExtractionResult,
    intentResult: IntentResult
): string {
    if (regexResult.confidence < LLM_FALLBACK_THRESHOLD) {
        return `Low regex confidence (${regexResult.confidence.toFixed(2)})`;
    }
    if (intentResult.confidence < INTENT_CONFIDENCE_THRESHOLD) {
        return `Uncertain intent (${intentResult.confidence.toFixed(2)})`;
    }
    if (regexResult.matched_patterns.length === 0) {
        return 'No patterns matched';
    }
    return 'Complex query structure';
}

// ============================================================================
// RESULT MERGING
// ============================================================================

/**
 * Intelligently merge regex and LLM results
 * 
 * Strategy:
 * - Prefer regex for structured data (years, locations)
 * - Prefer LLM for ambiguous text (skills, services)
 * - Take higher confidence values
 * - Deduplicate arrays
 */
function mergeResults(
    regexResult: RegexExtractionResult,
    llmResult: ParsedQuery,
    intentResult: IntentResult
): ParsedQuery {
    const merged: ExtractedEntities = {};

    // Merge graduation year (prefer regex - more reliable)
    if (regexResult.entities.graduationYear && regexResult.entities.graduationYear.length > 0) {
        merged.graduationYear = regexResult.entities.graduationYear;
    } else if (llmResult.entities.graduationYear) {
        merged.graduationYear = llmResult.entities.graduationYear;
    }

    // Merge location (prefer regex normalization)
    if (regexResult.entities.location) {
        merged.location = regexResult.entities.location;
    } else if (llmResult.entities.location) {
        merged.location = llmResult.entities.location;
    }

    // Merge degree (combine both)
    const regexDegree = Array.isArray(regexResult.entities.degree)
        ? regexResult.entities.degree
        : regexResult.entities.degree ? [regexResult.entities.degree] : [];
    const llmDegree = llmResult.entities.degree ? [llmResult.entities.degree] : [];
    const combinedDegree = [...new Set([...regexDegree, ...llmDegree])];
    if (combinedDegree.length > 0) {
        merged.degree = combinedDegree[0]; // Take first
    }

    // Merge branch (prefer regex normalization)
    if (regexResult.entities.branch) {
        merged.branch = Array.isArray(regexResult.entities.branch)
            ? regexResult.entities.branch
            : [regexResult.entities.branch];
    } else if (llmResult.entities.branch) {
        merged.branch = llmResult.entities.branch;
    }

    // Merge skills (combine both, deduplicate)
    const regexSkills = regexResult.entities.skills || [];
    const llmSkills = llmResult.entities.skills || [];
    const combinedSkills = [...new Set([...regexSkills, ...llmSkills])];
    if (combinedSkills.length > 0) {
        merged.skills = combinedSkills;
    }

    // Merge services (combine both, deduplicate)
    const regexServices = regexResult.entities.services || [];
    const llmServices = llmResult.entities.services || [];
    const combinedServices = [...new Set([...regexServices, ...llmServices])];
    if (combinedServices.length > 0) {
        merged.services = combinedServices;
    }

    // Merge turnover (prefer regex)
    if (regexResult.entities.turnoverRequirement) {
        merged.turnoverRequirement = regexResult.entities.turnoverRequirement;
    } else if (llmResult.entities.turnoverRequirement) {
        merged.turnoverRequirement = llmResult.entities.turnoverRequirement;
    }

    // Merge name (LLM is better at extracting names)
    if (llmResult.entities.name) {
        merged.name = llmResult.entities.name;
    }

    // Merge organization (LLM is better)
    if (llmResult.entities.organizationName) {
        merged.organizationName = llmResult.entities.organizationName;
    }

    // Calculate merged confidence (weighted average)
    const mergedConfidence = (regexResult.confidence * 0.4) + (llmResult.confidence * 0.6);

    return {
        intent: llmResult.intent, // Prefer LLM intent (more nuanced)
        entities: merged,
        searchQuery: llmResult.searchQuery,
        confidence: mergedConfidence,
        intentMetadata: {
            primary: intentResult.primary,
            secondary: intentResult.secondary,
            intentConfidence: intentResult.confidence,
            matchedPatterns: intentResult.matchedPatterns
        }
    };
}

/**
 * Determine final extraction method used
 */
function determineMethod(
    regexResult: RegexExtractionResult,
    llmResult: ParsedQuery
): ExtractionMethod {
    const regexHasData = regexResult.matched_patterns.length > 0;
    const llmHasData = Object.keys(llmResult.entities).length > 0;

    if (regexHasData && llmHasData) {
        return 'hybrid';
    } else if (llmHasData) {
        return 'llm';
    } else if (regexHasData) {
        return 'regex';
    } else {
        return 'regex'; // Default
    }
}

// ============================================================================
// ENTITY NORMALIZATION
// ============================================================================

/**
 * Normalize regex entities to match ExtractedEntities type
 */
function normalizeRegexEntities(regexEntities: RegexEntities): ExtractedEntities {
    const normalized: ExtractedEntities = {};

    if (regexEntities.graduationYear) {
        normalized.graduationYear = regexEntities.graduationYear;
    }

    if (regexEntities.location) {
        normalized.location = regexEntities.location;
    }

    if (regexEntities.degree) {
        normalized.degree = Array.isArray(regexEntities.degree)
            ? regexEntities.degree[0]
            : regexEntities.degree;
    }

    if (regexEntities.branch) {
        normalized.branch = Array.isArray(regexEntities.branch)
            ? regexEntities.branch
            : [regexEntities.branch];
    }

    if (regexEntities.skills) {
        normalized.skills = regexEntities.skills;
    }

    if (regexEntities.services) {
        normalized.services = regexEntities.services;
    }

    if (regexEntities.turnoverRequirement) {
        normalized.turnoverRequirement = regexEntities.turnoverRequirement;
    }

    return normalized;
}

// ============================================================================
// PERFORMANCE TRACKING
// ============================================================================

/**
 * Log extraction performance for monitoring
 */
export function logExtractionPerformance(result: HybridExtractionResult): void {
    const method = result.method;
    const time = result.extractionTime;
    const confidence = result.confidence;

    // Log for monitoring/analytics
    console.log(`[Performance] Method: ${method}, Time: ${time}ms, Confidence: ${confidence.toFixed(2)}`);

    // Future: Send to monitoring service (DataDog, New Relic, etc.)
    // trackMetric('extraction.time', time, { method, confidence });
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
    LLM_FALLBACK_THRESHOLD,
    INTENT_CONFIDENCE_THRESHOLD,
    shouldUseLLM,
    mergeResults,
    normalizeRegexEntities
};
