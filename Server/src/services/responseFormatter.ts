/**
 * Intent-Based Response Formatter Service
 * 
 * Formats search results using templates instead of LLM calls.
 * Provides intent-specific formatting optimized for each query type.
 * 
 * Benefits:
 * - 50ms response time (vs 2000ms LLM)
 * - No API costs for formatting
 * - Consistent, predictable output
 * - Highlights matched fields
 * 
 * Reference: TODO_queryOptimisation.md (Task 3.1)
 */

import { MemberSearchResult } from '../utils/types';
import { Intent } from './intentClassifier';

// ============================================================================
// TYPES
// ============================================================================

export interface FormatterContext {
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
}

// ============================================================================
// MAIN FORMATTER
// ============================================================================

/**
 * Format search results based on intent
 * 
 * @param results - Search results to format
 * @param context - Query context (intent, entities, etc.)
 * @returns Formatted response string
 */
export function formatResults(
    results: MemberSearchResult[],
    context: FormatterContext
): string {
    const startTime = Date.now();

    // Handle empty results
    if (results.length === 0) {
        const emptyResponse = formatEmptyResults(context);
        console.log(`[Response Formatter] ✓ Empty result formatted in ${Date.now() - startTime}ms`);
        return emptyResponse;
    }

    // Route to intent-specific formatter
    let formatted: string;
    switch (context.intent) {
        case 'find_business':
            formatted = formatBusinessResults(results, context);
            break;
        case 'find_peers':
            formatted = formatPeerResults(results, context);
            break;
        case 'find_specific_person':
            formatted = formatSpecificPersonResults(results, context);
            break;
        case 'find_alumni_business':
            formatted = formatAlumniBusinessResults(results, context);
            break;
        default:
            formatted = formatGenericResults(results, context);
    }

    const executionTime = Date.now() - startTime;
    console.log(`[Response Formatter] ✓ ${results.length} results formatted in ${executionTime}ms (intent: ${context.intent})`);

    return formatted;
}

// ============================================================================
// INTENT-SPECIFIC FORMATTERS
// ============================================================================

/**
 * Format business/service provider results
 * Focus: organization, services, turnover, contact
 */
function formatBusinessResults(
    results: MemberSearchResult[],
    context: FormatterContext
): string {
    const header = createBusinessHeader(context);
    const items = results.slice(0, 10).map((member, index) => {
        const lines: string[] = [];

        // Name and organization
        const orgName = member.organization || member.name || 'Unknown';
        lines.push(`${index + 1}. **${orgName}**`);

        // Location
        if (member.city) {
            lines.push(`   📍 ${member.city}`);
        }

        // Services/Products
        if (member.productsServices) {
            lines.push(`   💼 ${member.productsServices}`);
        } else if (member.skills) {
            lines.push(`   💼 ${member.skills}`);
        }

        // Contact
        const contacts: string[] = [];
        if (member.phone) contacts.push(`📞 ${member.phone}`);
        if (member.email) contacts.push(`✉️ ${member.email}`);
        if (contacts.length > 0) {
            lines.push(`   ${contacts.join(' | ')}`);
        }

        // Turnover (if available)
        if (member.annualTurnover && member.annualTurnover > 0) {
            const turnover = formatTurnover(member.annualTurnover);
            lines.push(`   💰 Turnover: ${turnover}`);
        }

        // Matched fields
        if (member.matchedFields && member.matchedFields.length > 0) {
            lines.push(`   ✓ Matched: ${member.matchedFields.join(', ')}`);
        }

        return lines.join('\n');
    });

    const footer = `\n_Found ${results.length} ${results.length === 1 ? 'result' : 'results'}_`;

    return [header, ...items, footer].join('\n\n');
}

/**
 * Format alumni/peer results
 * Focus: name, batch, branch, current role
 */
function formatPeerResults(
    results: MemberSearchResult[],
    context: FormatterContext
): string {
    const header = createPeerHeader(context);
    const items = results.slice(0, 10).map((member, index) => {
        const lines: string[] = [];

        // Name
        lines.push(`${index + 1}. **${member.name || 'Unknown'}**`);

        // Alumni info (year, degree, branch)
        const alumniInfo: string[] = [];
        if (member.yearOfGraduation) alumniInfo.push(`'${String(member.yearOfGraduation).slice(-2)}`);
        if (member.degree) alumniInfo.push(member.degree);
        if (member.branch) alumniInfo.push(member.branch);
        if (alumniInfo.length > 0) {
            lines.push(`   🎓 ${alumniInfo.join(' • ')}`);
        }

        // Current role
        if (member.organization || member.designation) {
            const role = member.designation || 'Working';
            const org = member.organization || '';
            lines.push(`   💼 ${role}${org ? ` at ${org}` : ''}`);
        }

        // Location
        if (member.city) {
            lines.push(`   📍 ${member.city}`);
        }

        // Contact
        const contacts: string[] = [];
        if (member.phone) contacts.push(`📞 ${member.phone}`);
        if (member.email) contacts.push(`✉️ ${member.email}`);
        if (contacts.length > 0) {
            lines.push(`   ${contacts.join(' | ')}`);
        }

        return lines.join('\n');
    });

    const footer = `\n_Found ${results.length} alumni_`;

    return [header, ...items, footer].join('\n\n');
}

/**
 * Format specific person search results
 * Focus: detailed profile, all available info
 */
function formatSpecificPersonResults(
    results: MemberSearchResult[],
    context: FormatterContext
): string {
    const header = createPersonHeader(context);
    const items = results.slice(0, 5).map((member, index) => {
        const lines: string[] = [];

        // Name (prominent)
        lines.push(`${index + 1}. **${member.name || 'Unknown'}**`);

        // Organization and role
        if (member.organization || member.designation) {
            const parts: string[] = [];
            if (member.designation) parts.push(member.designation);
            if (member.organization) parts.push(member.organization);
            lines.push(`   💼 ${parts.join(' at ')}`);
        }

        // Alumni background
        const alumniInfo: string[] = [];
        if (member.yearOfGraduation) alumniInfo.push(`Batch of ${member.yearOfGraduation}`);
        if (member.degree) alumniInfo.push(member.degree);
        if (member.branch) alumniInfo.push(member.branch);
        if (alumniInfo.length > 0) {
            lines.push(`   🎓 ${alumniInfo.join(' • ')}`);
        }

        // Location
        if (member.city) {
            lines.push(`   📍 ${member.city}`);
        }

        // Skills/Services
        if (member.skills) {
            lines.push(`   🛠️ Skills: ${member.skills}`);
        }
        if (member.productsServices) {
            lines.push(`   💼 Services: ${member.productsServices}`);
        }

        // Contact (all available)
        if (member.phone) lines.push(`   📞 ${member.phone}`);
        if (member.email) lines.push(`   ✉️ ${member.email}`);

        // Turnover
        if (member.annualTurnover && member.annualTurnover > 0) {
            lines.push(`   💰 Annual Turnover: ${formatTurnover(member.annualTurnover)}`);
        }

        return lines.join('\n');
    });

    const footer = results.length > 5
        ? `\n_Showing top 5 of ${results.length} matches_`
        : `\n_Found ${results.length} ${results.length === 1 ? 'match' : 'matches'}_`;

    return [header, ...items, footer].join('\n\n');
}

/**
 * Format alumni who are business owners
 * Focus: hybrid of peer + business info
 */
function formatAlumniBusinessResults(
    results: MemberSearchResult[],
    context: FormatterContext
): string {
    const header = createAlumniBusinessHeader(context);
    const items = results.slice(0, 10).map((member, index) => {
        const lines: string[] = [];

        // Name and org
        const name = member.name || 'Unknown';
        const org = member.organization || '';
        lines.push(`${index + 1}. **${name}**${org ? ` - ${org}` : ''}`);

        // Alumni info
        const alumniInfo: string[] = [];
        if (member.yearOfGraduation) alumniInfo.push(`'${String(member.yearOfGraduation).slice(-2)}`);
        if (member.branch) alumniInfo.push(member.branch);
        if (alumniInfo.length > 0) {
            lines.push(`   🎓 ${alumniInfo.join(' • ')}`);
        }

        // Business info
        if (member.productsServices) {
            lines.push(`   💼 ${member.productsServices}`);
        }

        // Location
        if (member.city) {
            lines.push(`   📍 ${member.city}`);
        }

        // Turnover
        if (member.annualTurnover && member.annualTurnover > 0) {
            lines.push(`   💰 ${formatTurnover(member.annualTurnover)}`);
        }

        // Contact
        const contacts: string[] = [];
        if (member.phone) contacts.push(`📞 ${member.phone}`);
        if (member.email) contacts.push(`✉️ ${member.email}`);
        if (contacts.length > 0) {
            lines.push(`   ${contacts.join(' | ')}`);
        }

        return lines.join('\n');
    });

    const footer = `\n_Found ${results.length} alumni entrepreneurs_`;

    return [header, ...items, footer].join('\n\n');
}

/**
 * Generic formatter (fallback)
 */
function formatGenericResults(
    results: MemberSearchResult[],
    context: FormatterContext
): string {
    const header = `Found ${results.length} members:\n`;
    const items = results.slice(0, 10).map((member, index) => {
        const parts: string[] = [member.name || 'Unknown'];
        if (member.email) parts.push(member.email);
        if (member.phone) parts.push(member.phone);
        if (member.city) parts.push(member.city);
        return `${index + 1}. ${parts.join(', ')}`;
    });

    return header + items.join('\n');
}

// ============================================================================
// HEADER GENERATORS
// ============================================================================

function createBusinessHeader(context: FormatterContext): string {
    const parts: string[] = ['Found'];

    if (context.entities.services && context.entities.services.length > 0) {
        parts.push(`**${context.entities.services[0]}**`);
    }

    parts.push('companies');

    if (context.entities.location) {
        parts.push(`in **${context.entities.location}**`);
    }

    parts.push(`(${context.resultCount} results):\n`);

    return parts.join(' ');
}

function createPeerHeader(context: FormatterContext): string {
    const parts: string[] = [];

    if (context.entities.graduationYear && context.entities.graduationYear.length > 0) {
        parts.push(`**${context.entities.graduationYear[0]} batch**`);
    }

    if (context.entities.branch && context.entities.branch.length > 0) {
        parts.push(`**${context.entities.branch[0]}**`);
    }

    parts.push('alumni');

    if (parts.length === 1) parts.unshift('Found');

    parts.push(`(${context.resultCount} results):\n`);

    return parts.join(' ');
}

function createPersonHeader(context: FormatterContext): string {
    if (context.entities.name) {
        return `Found matches for **${context.entities.name}**:\n`;
    }
    return `Found ${context.resultCount} members:\n`;
}

function createAlumniBusinessHeader(context: FormatterContext): string {
    const parts: string[] = [];

    if (context.entities.graduationYear && context.entities.graduationYear.length > 0) {
        parts.push(`**${context.entities.graduationYear[0]} batch**`);
    }

    parts.push('entrepreneurs');

    if (context.entities.services && context.entities.services.length > 0) {
        parts.push(`in **${context.entities.services[0]}**`);
    }

    if (context.entities.location) {
        parts.push(`from **${context.entities.location}**`);
    }

    parts.push(`(${context.resultCount} results):\n`);

    return parts.join(' ');
}

function formatEmptyResults(context: FormatterContext): string {
    const parts: string[] = ["I couldn't find any members matching"];

    // Add context-specific details
    if (context.entities.graduationYear && context.entities.graduationYear.length > 0) {
        parts.push(`from **${context.entities.graduationYear[0]} batch**`);
    }

    if (context.entities.branch && context.entities.branch.length > 0) {
        parts.push(`in **${context.entities.branch[0]}**`);
    }

    if (context.entities.location) {
        parts.push(`from **${context.entities.location}**`);
    }

    if (context.entities.services && context.entities.services.length > 0) {
        parts.push(`offering **${context.entities.services[0]}**`);
    }

    parts.push('.');

    return parts.join(' ') + '\n\nTry different keywords, locations, or time periods.';
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format turnover in readable format
 */
function formatTurnover(amount: number): string {
    if (amount >= 10000000) {
        // >= 1 Crore
        const crores = amount / 10000000;
        return `₹${crores.toFixed(1)} Cr`;
    } else if (amount >= 100000) {
        // >= 1 Lakh
        const lakhs = amount / 100000;
        return `₹${lakhs.toFixed(1)} L`;
    } else {
        return `₹${(amount / 1000).toFixed(0)}K`;
    }
}

/**
 * Highlight matched fields in results
 */
export function highlightMatchedFields(
    member: MemberSearchResult,
    entities: FormatterContext['entities']
): string[] {
    const matched: string[] = [];

    if (entities.location && member.city === entities.location) {
        matched.push('location');
    }

    if (entities.graduationYear && entities.graduationYear.includes(member.yearOfGraduation || 0)) {
        matched.push('batch year');
    }

    if (entities.branch && member.branch && entities.branch.includes(member.branch)) {
        matched.push('branch');
    }

    if (entities.skills && member.skills) {
        const hasSkill = entities.skills.some(skill =>
            member.skills?.toLowerCase().includes(skill.toLowerCase())
        );
        if (hasSkill) matched.push('skills');
    }

    if (entities.services && member.productsServices) {
        const hasService = entities.services.some(service =>
            member.productsServices?.toLowerCase().includes(service.toLowerCase())
        );
        if (hasService) matched.push('services');
    }

    return matched;
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
    formatBusinessResults,
    formatPeerResults,
    formatSpecificPersonResults,
    formatAlumniBusinessResults,
    formatGenericResults,
    formatEmptyResults,
    formatTurnover
};
