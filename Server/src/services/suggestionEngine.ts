/**
 * Template-Based Suggestion Engine
 * 
 * Generates follow-up query suggestions using rules instead of LLM calls.
 * Provides intent-specific suggestions based on current results.
 * 
 * Benefits:
 * - 20ms response time (vs 800ms LLM)
 * - No API costs for suggestions
 * - Consistent, relevant output
 * - Context-aware based on results
 * 
 * Reference: TODO_queryOptimisation.md (Task 3.2)
 */

import { MemberSearchResult } from '../utils/types';
import { Intent } from './intentClassifier';

// ============================================================================
// TYPES
// ============================================================================

export interface SuggestionContext {
    query: string;
    intent: Intent;
    entities: {
        graduationYear?: number[];
        location?: string;
        degree?: string;
        branch?: string[];
        skills?: string[];
        services?: string[];
        name?: string;
        organizationName?: string;
    };
    resultCount: number;
    hasResults: boolean;
}

// ============================================================================
// MAIN SUGGESTION GENERATOR
// ============================================================================

/**
 * Generate follow-up query suggestions based on context
 * 
 * @param results - Current search results
 * @param context - Query context (intent, entities, etc.)
 * @returns Array of 3 suggestion strings
 */
export function generateSuggestions(
    results: MemberSearchResult[],
    context: SuggestionContext
): string[] {
    const startTime = Date.now();

    let suggestions: string[];

    if (context.hasResults && results.length > 0) {
        // Generate suggestions based on intent and results
        switch (context.intent) {
            case 'find_business':
                suggestions = generateBusinessSuggestions(results, context);
                break;
            case 'find_peers':
                suggestions = generatePeerSuggestions(results, context);
                break;
            case 'find_specific_person':
                suggestions = generatePersonSuggestions(results, context);
                break;
            case 'find_alumni_business':
                suggestions = generateAlumniBusinessSuggestions(results, context);
                break;
            default:
                suggestions = generateGenericSuggestions(results, context);
        }
    } else {
        // Generate suggestions for empty results
        suggestions = generateEmptyResultSuggestions(context);
    }

    const executionTime = Date.now() - startTime;
    console.log(`[Suggestion Engine] ✓ ${suggestions.length} suggestions in ${executionTime}ms (intent: ${context.intent})`);

    return suggestions.slice(0, 3);
}

// ============================================================================
// INTENT-SPECIFIC SUGGESTION GENERATORS
// ============================================================================

/**
 * Generate suggestions for business queries
 * Focus: location refinement, service exploration, specific businesses
 */
function generateBusinessSuggestions(
    results: MemberSearchResult[],
    context: SuggestionContext
): string[] {
    const suggestions: string[] = [];

    // 1. Location-based refinement
    const cities = extractTopCities(results, 3);
    if (cities.length > 0 && !context.entities.location) {
        suggestions.push(`Show only in ${cities[0]}`);
    } else if (cities.length > 1 && context.entities.location) {
        const otherCity = cities.find(c => c !== context.entities.location);
        if (otherCity) {
            suggestions.push(`Show in ${otherCity} instead`);
        }
    }

    // 2. Service/skill exploration
    const services = extractTopServices(results, 5);
    if (services.length > 0) {
        const newService = services.find(s =>
            !context.entities.services?.some(cs =>
                s.toLowerCase().includes(cs.toLowerCase())
            )
        );
        if (newService) {
            suggestions.push(`Find ${newService} providers`);
        }
    }

    // 3. Alumni filter
    if (!context.entities.graduationYear || context.entities.graduationYear.length === 0) {
        const currentYear = new Date().getFullYear();
        const recentYear = currentYear - 5;
        suggestions.push(`Show only alumni from ${recentYear}`);
    }

    // 4. High-value businesses
    if (hasBusinessesWithTurnover(results)) {
        suggestions.push('Show businesses with high turnover');
    }

    // 5. Specific designation
    const designations = extractTopDesignations(results, 3);
    if (designations.length > 0) {
        suggestions.push(`Find only ${designations[0]}s`);
    }

    // 6. Browse related
    if (context.entities.services && context.entities.services.length > 0) {
        suggestions.push('Browse all service providers');
    } else {
        suggestions.push('Browse all businesses');
    }

    // Ensure we have at least 3 suggestions
    while (suggestions.length < 3) {
        if (suggestions.length === 1) {
            suggestions.push('Search by location');
        } else {
            suggestions.push('Browse all members');
        }
    }

    return suggestions;
}

/**
 * Generate suggestions for peer/alumni queries
 * Focus: batch exploration, branch switching, current roles
 */
function generatePeerSuggestions(
    results: MemberSearchResult[],
    context: SuggestionContext
): string[] {
    const suggestions: string[] = [];

    // 1. Different batch year
    if (context.entities.graduationYear && context.entities.graduationYear.length > 0) {
        const currentYear = context.entities.graduationYear[0];
        const nearbyYears = [currentYear - 1, currentYear + 1].filter(y => y >= 2000 && y <= new Date().getFullYear());
        if (nearbyYears.length > 0) {
            suggestions.push(`Show ${nearbyYears[0]} batch instead`);
        }
    } else {
        const commonYear = findMostCommonYear(results);
        if (commonYear) {
            suggestions.push(`Show only ${commonYear} batch`);
        }
    }

    // 2. Different branch
    const branches = extractTopBranches(results, 3);
    if (branches.length > 0 && !context.entities.branch?.length) {
        suggestions.push(`Show only ${branches[0]} branch`);
    } else if (branches.length > 1 && context.entities.branch?.length) {
        const otherBranch = branches.find(b => !context.entities.branch?.includes(b));
        if (otherBranch) {
            suggestions.push(`Show ${otherBranch} instead`);
        }
    }

    // 3. Convert to business query (prioritize this for diversity)
    if (context.entities.graduationYear && context.entities.graduationYear.length > 0) {
        suggestions.push(`Find ${context.entities.graduationYear[0]} alumni with businesses`);
    } else {
        suggestions.push('Find batchmates with businesses');
    }

    // 4. Current role filter (if we need more)
    if (suggestions.length < 3) {
        const designations = extractTopDesignations(results, 3);
        if (designations.length > 0) {
            suggestions.push(`Find who are ${designations[0]}s now`);
        }
    }

    // 5. Location-based (if we need more)
    if (suggestions.length < 3) {
        const cities = extractTopCities(results, 3);
        if (cities.length > 0 && !context.entities.location) {
            suggestions.push(`Show who are in ${cities[0]}`);
        }
    }

    // Ensure we have 3 suggestions
    if (suggestions.length < 3) {
        suggestions.push('Browse all alumni');
    }

    return suggestions.slice(0, 3);
}

/**
 * Generate suggestions for specific person queries
 * Focus: related people, role-based, similar profiles
 */
function generatePersonSuggestions(
    results: MemberSearchResult[],
    context: SuggestionContext
): string[] {
    const suggestions: string[] = [];

    if (results.length === 0) {
        return generateEmptyResultSuggestions(context);
    }

    const firstResult = results[0];

    // 1. Same batch
    if (firstResult.yearOfGraduation) {
        suggestions.push(`Find other ${firstResult.yearOfGraduation} alumni`);
    }

    // 2. Same organization
    if (firstResult.organization) {
        suggestions.push(`Find others at ${firstResult.organization}`);
    }

    // 3. Same role
    if (firstResult.designation) {
        suggestions.push(`Find other ${firstResult.designation}s`);
    }

    // 4. Same location
    if (firstResult.city) {
        suggestions.push(`Find members in ${firstResult.city}`);
    }

    // 5. Same branch
    if (firstResult.branch) {
        suggestions.push(`Browse ${firstResult.branch} alumni`);
    }

    // 6. Browse all
    suggestions.push('Browse all members');

    return suggestions;
}

/**
 * Generate suggestions for alumni business queries
 * Focus: batch refinement, service expansion, location
 */
function generateAlumniBusinessSuggestions(
    results: MemberSearchResult[],
    context: SuggestionContext
): string[] {
    const suggestions: string[] = [];

    // 1. Specific batch
    if (!context.entities.graduationYear || context.entities.graduationYear.length === 0) {
        const commonYear = findMostCommonYear(results);
        if (commonYear) {
            suggestions.push(`Show only ${commonYear} batch entrepreneurs`);
        }
    } else {
        const currentYear = context.entities.graduationYear[0];
        const olderYear = currentYear - 5;
        if (olderYear >= 2000) {
            suggestions.push(`Show ${olderYear} batch instead`);
        }
    }

    // 2. Different service
    const services = extractTopServices(results, 5);
    if (services.length > 0) {
        const newService = services.find(s =>
            !context.entities.services?.some(cs =>
                s.toLowerCase().includes(cs.toLowerCase())
            )
        );
        if (newService) {
            suggestions.push(`Find alumni in ${newService}`);
        }
    }

    // 3. Location filter
    const cities = extractTopCities(results, 3);
    if (cities.length > 0 && !context.entities.location) {
        suggestions.push(`Show businesses in ${cities[0]}`);
    }

    // 4. High turnover filter
    if (hasBusinessesWithTurnover(results)) {
        suggestions.push('Show high-turnover businesses');
    }

    // 5. Convert to pure alumni query
    if (context.entities.graduationYear && context.entities.graduationYear.length > 0) {
        suggestions.push(`Show all ${context.entities.graduationYear[0]} alumni`);
    } else {
        suggestions.push('Browse all alumni businesses');
    }

    return suggestions;
}

/**
 * Generate generic suggestions when intent is unclear
 */
function generateGenericSuggestions(
    results: MemberSearchResult[],
    context: SuggestionContext
): string[] {
    const suggestions: string[] = [];

    // Location-based
    const cities = extractTopCities(results, 3);
    if (cities.length > 0) {
        suggestions.push(`Show members in ${cities[0]}`);
    }

    // Year-based
    const commonYear = findMostCommonYear(results);
    if (commonYear) {
        suggestions.push(`Find ${commonYear} alumni`);
    }

    // Service-based
    const services = extractTopServices(results, 3);
    if (services.length > 0) {
        suggestions.push(`Find ${services[0]} providers`);
    }

    // Fallback
    if (suggestions.length < 3) {
        suggestions.push('Search by graduation year');
        suggestions.push('Search by location');
        suggestions.push('Browse all members');
    }

    return suggestions;
}

/**
 * Generate suggestions when no results found
 * Focus: query relaxation, alternatives, exploration
 */
function generateEmptyResultSuggestions(context: SuggestionContext): string[] {
    const suggestions: string[] = [];

    // 1. Remove filters
    if (context.entities.location) {
        suggestions.push('Search without location filter');
    } else if (context.entities.graduationYear && context.entities.graduationYear.length > 0) {
        suggestions.push('Search without year filter');
    } else if (context.entities.branch && context.entities.branch.length > 0) {
        suggestions.push('Search without branch filter');
    }

    // 2. Broaden search
    if (context.entities.services && context.entities.services.length > 0) {
        suggestions.push('Try related services');
    } else if (context.entities.skills && context.entities.skills.length > 0) {
        suggestions.push('Try related skills');
    } else {
        suggestions.push('Try broader keywords');
    }

    // 3. Explore alternatives
    if (context.intent === 'find_business') {
        suggestions.push('Browse all businesses');
    } else if (context.intent === 'find_peers') {
        suggestions.push('Browse all alumni');
    } else {
        suggestions.push('Browse all members');
    }

    // 4. Popular searches
    if (suggestions.length < 3) {
        suggestions.push('Search by graduation year');
        suggestions.push('Search by location');
        suggestions.push('Find businesses by service');
    }

    return suggestions.slice(0, 3);
}

// ============================================================================
// HELPER FUNCTIONS - DATA EXTRACTION
// ============================================================================

/**
 * Extract most common cities from results
 */
function extractTopCities(results: MemberSearchResult[], limit: number): string[] {
    const cityCount = new Map<string, number>();

    results.forEach(r => {
        if (r.city && r.city.trim()) {
            const city = r.city.trim();
            cityCount.set(city, (cityCount.get(city) || 0) + 1);
        }
    });

    return Array.from(cityCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([city]) => city);
}

/**
 * Extract most common services/products from results
 */
function extractTopServices(results: MemberSearchResult[], limit: number): string[] {
    const serviceCount = new Map<string, number>();

    results.forEach(r => {
        if (r.productsServices && r.productsServices.trim()) {
            // Split by common delimiters and take first item
            const services = r.productsServices.split(/[,;\/]/);
            const mainService = services[0]?.trim();
            if (mainService && mainService.length > 3) {
                serviceCount.set(mainService, (serviceCount.get(mainService) || 0) + 1);
            }
        }
    });

    return Array.from(serviceCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([service]) => service);
}

/**
 * Extract most common designations from results
 */
function extractTopDesignations(results: MemberSearchResult[], limit: number): string[] {
    const designationCount = new Map<string, number>();

    results.forEach(r => {
        if (r.designation && r.designation.trim()) {
            const designation = r.designation.trim();
            // Normalize common titles
            const normalized = designation
                .replace(/^(Mr\.|Mrs\.|Ms\.|Dr\.)?\s*/i, '')
                .replace(/\s+(Pvt\.?|Ltd\.?|Limited|Inc\.?)$/i, '')
                .trim();

            if (normalized.length > 2) {
                designationCount.set(normalized, (designationCount.get(normalized) || 0) + 1);
            }
        }
    });

    return Array.from(designationCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([designation]) => designation);
}

/**
 * Extract most common branches from results
 */
function extractTopBranches(results: MemberSearchResult[], limit: number): string[] {
    const branchCount = new Map<string, number>();

    results.forEach(r => {
        if (r.branch && r.branch.trim()) {
            const branch = r.branch.trim();
            branchCount.set(branch, (branchCount.get(branch) || 0) + 1);
        }
    });

    return Array.from(branchCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([branch]) => branch);
}

/**
 * Find most common graduation year
 */
function findMostCommonYear(results: MemberSearchResult[]): number | null {
    const yearCount = new Map<number, number>();

    results.forEach(r => {
        if (r.yearOfGraduation) {
            yearCount.set(r.yearOfGraduation, (yearCount.get(r.yearOfGraduation) || 0) + 1);
        }
    });

    if (yearCount.size === 0) return null;

    return Array.from(yearCount.entries())
        .sort((a, b) => b[1] - a[1])[0][0];
}

/**
 * Check if results contain businesses with turnover data
 */
function hasBusinessesWithTurnover(results: MemberSearchResult[]): boolean {
    return results.some(r => r.annualTurnover && r.annualTurnover > 0);
}
