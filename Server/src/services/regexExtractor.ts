/**
 * Regex-based Entity Extractor
 * 
 * Fast, deterministic entity extraction without LLM calls.
 * Targets 95%+ accuracy on simple patterns with <20ms response time.
 * 
 * This is the core optimization to reduce LLM dependency from 100% to ~5%.
 * 
 * Reference: /CRITICAL-REVIEW-LLM-FLOW.md, /QUERY-TAXONOMY.md
 */

import { ExtractedEntities } from '../utils/types';

export interface RegexExtractionResult {
    entities: Partial<ExtractedEntities>;
    confidence: number;
    matchedPatterns: string[];
    needsLLM: boolean; // true if query is too complex for regex
}

// ============================================================================
// GRADUATION YEAR PATTERNS
// ============================================================================

const YEAR_PATTERNS = [
    // "1995 passout", "1995 batch", "batch of 1995"
    /\b(19\d{2}|20[0-2]\d)\s*(?:passout|batch|grad|year|graduated)\b/gi,
    /\b(?:batch|passout|grad|year)\s*(?:of)?\s*(19\d{2}|20[0-2]\d)\b/gi,

    // "95 passout", "batch of 95" (handle 2-digit years)
    /\b(\d{2})\s*(?:passout|batch)\b/gi,
    /\b(?:batch|passout)\s*(?:of)?\s*(\d{2})\b/gi,

    // Year ranges: "2005-2009", "2005 to 2009"
    /\b(19\d{2}|20[0-2]\d)\s*(?:-|to)\s*(19\d{2}|20[0-2]\d)\b/gi,
];

function extractYears(query: string): number[] {
    const years = new Set<number>();
    const currentYear = new Date().getFullYear();

    for (const pattern of YEAR_PATTERNS) {
        const matches = query.matchAll(pattern);
        for (const match of matches) {
            // Handle range patterns
            if (match[2]) {
                const year1 = normalizeYear(parseInt(match[1]));
                const year2 = normalizeYear(parseInt(match[2]));
                if (year1 && year2) {
                    const start = Math.min(year1, year2);
                    const end = Math.max(year1, year2);
                    for (let y = start; y <= end; y++) {
                        if (y >= 1950 && y <= currentYear) {
                            years.add(y);
                        }
                    }
                }
            } else {
                const year = normalizeYear(parseInt(match[1]));
                if (year && year >= 1950 && year <= currentYear) {
                    years.add(year);
                }
            }
        }
    }

    return Array.from(years).sort();
}

function normalizeYear(year: number): number | null {
    // Convert 2-digit to 4-digit year
    if (year >= 0 && year <= 30) {
        return 2000 + year;
    } else if (year >= 50 && year <= 99) {
        return 1900 + year;
    } else if (year >= 1950 && year <= 2030) {
        return year;
    }
    return null;
}

// ============================================================================
// LOCATION PATTERNS
// ============================================================================

const LOCATION_KEYWORDS = [
    'Chennai', 'Bangalore', 'Bengaluru', 'Hyderabad', 'Mumbai',
    'Delhi', 'Pune', 'Kolkata', 'Coimbatore', 'Madurai',
    'Tamil Nadu', 'Karnataka', 'Telangana', 'Maharashtra',
    'Kerala', 'Andhra Pradesh', 'India'
];

const LOCATION_PATTERNS = [
    // "in Chennai", "at Bangalore", "from Mumbai"
    /\b(?:in|at|from|located|based|working)\s+(Chennai|Bangalore|Bengaluru|Hyderabad|Mumbai|Delhi|Pune|Kolkata|Coimbatore|Madurai|Tamil\s+Nadu|Karnataka|Telangana|Maharashtra|Kerala|Andhra\s+Pradesh)\b/gi,

    // "Chennai based", "Bangalore people"
    /\b(Chennai|Bangalore|Bengaluru|Hyderabad|Mumbai|Delhi|Pune|Kolkata|Coimbatore|Madurai)\s+(?:based|people|members|graduates)\b/gi,

    // Standalone city names (lower confidence)
    /\b(Chennai|Bangalore|Bengaluru|Hyderabad|Mumbai|Delhi|Pune|Kolkata|Coimbatore|Madurai)\b/gi,
];

function extractLocation(query: string): string | undefined {
    // Try patterns in order of confidence
    for (const pattern of LOCATION_PATTERNS) {
        const match = query.match(pattern);
        if (match) {
            const location = match[1] || match[0];
            return normalizeLocation(location);
        }
    }
    return undefined;
}

function normalizeLocation(location: string): string {
    let normalized = location.trim();

    // Remove prepositions (in, at, from)
    normalized = normalized.replace(/^(in|at|from)\s+/i, '');

    // Normalize common variations
    if (normalized.toLowerCase() === 'bengaluru') {
        return 'Bangalore';
    }

    // Title case
    return normalized
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

// ============================================================================
// DEGREE/BRANCH PATTERNS
// ============================================================================

const DEGREE_KEYWORDS = {
    'mechanical': ['Mechanical Engineering', 'Mechanical'],
    'civil': ['Civil Engineering', 'Civil'],
    'ece': ['Electronics and Communication Engineering', 'ECE', 'Electronics'],
    'eee': ['Electrical and Electronics Engineering', 'EEE', 'Electrical'],
    'cse': ['Computer Science Engineering', 'CSE', 'Computer Science'],
    'it': ['Information Technology', 'IT'],
    'textile': ['Textile Engineering', 'Textile Technology'],
    'chemical': ['Chemical Engineering', 'Chemical'],
    'biotechnology': ['Biotechnology', 'Biotech'],
    'mba': ['MBA', 'Master of Business Administration'],
    'mca': ['MCA', 'Master of Computer Applications'],
};

const DEGREE_PATTERNS = [
    // "mechanical engineering", "mechanical engineers"
    /\b(mechanical|civil|textile|chemical|biotechnology)\s*(?:engineering|engineers?|department|dept|branch|stream)?\b/gi,

    // "ECE", "CSE", "EEE" - standalone abbreviations
    /\b(ECE|EEE|CSE|IT|MBA|MCA)\b/g,

    // "computer science", "information technology"
    /\b(computer\s+science|information\s+technology|electronics?\s+(?:and|&)?\s+communication)\b/gi,

    // "B.E", "B.Tech", "M.E", "M.Tech"
    /\b(B\.?E\.?|B\.?Tech|M\.?E\.?|M\.?Tech)\s*(?:in)?\s*([A-Za-z\s]+?)(?:\s|$|,)/gi,
];

function extractDegree(query: string): string | undefined {
    for (const pattern of DEGREE_PATTERNS) {
        const matches = query.matchAll(pattern);
        for (const match of matches) {
            const key = match[1].toLowerCase().replace(/\s+/g, '');

            // Check if it's a known degree keyword
            for (const [degreeKey, variations] of Object.entries(DEGREE_KEYWORDS)) {
                if (key.includes(degreeKey) || degreeKey.includes(key)) {
                    return variations[0]; // Return primary variation
                }
            }

            // Return the matched text if not in dictionary
            return match[1].trim();
        }
    }

    return undefined;
}

// ============================================================================
// SKILLS/SERVICES PATTERNS
// ============================================================================

const SKILL_KEYWORDS = [
    // Technical skills
    'web development', 'web design', 'software development', 'software', 'app development',
    'digital marketing', 'marketing', 'SEO', 'content marketing',
    'consulting', 'IT consulting', 'business consulting',
    'manufacturing', 'construction', 'architecture',
    'real estate', 'packaging', 'logistics',
    'AI', 'ML', 'artificial intelligence', 'machine learning', 'data science',
    'cloud', 'AWS', 'Azure', 'devops',
    'mobile development', 'android', 'iOS',
    'UI/UX', 'design', 'graphic design',
    'testing', 'QA', 'quality assurance',
    'blockchain', 'cryptocurrency',
    'healthcare', 'medical', 'pharma',
    'education', 'training', 'e-learning',
    'finance', 'fintech', 'accounting',
    'HR', 'recruitment', 'talent acquisition',
];

const SKILL_PATTERNS = [
    // "web development services", "IT consulting"
    /\b(web\s+development|software\s+development|app\s+development|digital\s+marketing|IT\s+consulting)\b/gi,

    // "software companies", "tech firms", "IT startups" - company type patterns
    /\b(software|mobile|web|tech|IT|AI|ML|data|cloud)\s+(?:companies?|firms?|startups?|businesses?)\b/gi,

    // Skills with context: "provides X", "doing X", "in X", "with X"
    /\b(?:provides?|doing|working\s+in|experts?\s+in|specializ\w+\s+in|with)\s+([a-z\s]+?)(?:\s+(?:services?|business|work|companies?))/gi,

    // Standalone skill keywords (lower confidence)
    new RegExp(`\\b(${SKILL_KEYWORDS.join('|')})\\b`, 'gi'),
];

function extractSkills(query: string): string[] {
    const skills = new Set<string>();

    for (const pattern of SKILL_PATTERNS) {
        const matches = query.matchAll(pattern);
        for (const match of matches) {
            const skill = match[1].trim().toLowerCase();

            // Check if it's a known skill
            const matchedKeyword = SKILL_KEYWORDS.find(k =>
                skill.includes(k.toLowerCase()) || k.toLowerCase().includes(skill)
            );

            if (matchedKeyword) {
                skills.add(matchedKeyword);
            } else if (skill.length >= 3 && skill.length <= 50) {
                // Add unknown skills if reasonable length
                skills.add(skill);
            }
        }
    }

    return Array.from(skills);
}

// ============================================================================
// SERVICES PATTERNS (similar to skills but for business services)
// ============================================================================

function extractServices(query: string): string[] {
    const services = new Set<string>();

    const SERVICE_PATTERNS = [
        /\b([a-z\s]+?)\s+(?:services?|solutions?|providers?)\b/gi,
        /\bprovides?\s+([a-z\s]+?)(?:\s+(?:to|for|in)|\b)/gi,
    ];

    for (const pattern of SERVICE_PATTERNS) {
        const matches = query.matchAll(pattern);
        for (const match of matches) {
            const service = match[1].trim().toLowerCase();
            if (service.length >= 3 && service.length <= 50) {
                services.add(service);
            }
        }
    }

    return Array.from(services);
}

// ============================================================================
// MAIN EXTRACTION FUNCTION
// ============================================================================

export function extractEntitiesWithRegex(query: string): RegexExtractionResult {
    const startTime = Date.now();
    const matchedPatterns: string[] = [];
    const entities: Partial<ExtractedEntities> = {};

    // Extract graduation years
    const years = extractYears(query);
    if (years.length > 0) {
        entities.graduationYear = years;
        matchedPatterns.push('graduation_year');
    }

    // Extract location
    const location = extractLocation(query);
    if (location) {
        entities.location = location;
        matchedPatterns.push('location');
    }

    // Extract degree/branch
    const degree = extractDegree(query);
    if (degree) {
        entities.degree = degree;
        matchedPatterns.push('degree');
    }

    // Extract skills
    const skills = extractSkills(query);
    if (skills.length > 0) {
        entities.skills = skills;
        matchedPatterns.push('skills');
    }

    // Extract services
    const services = extractServices(query);
    if (services.length > 0) {
        entities.services = services;
        matchedPatterns.push('services');
    }

    // Calculate confidence based on matches
    const confidence = calculateConfidence(matchedPatterns, query);

    // Determine if LLM fallback is needed
    const needsLLM = shouldUseLLMFallback(matchedPatterns, query, confidence);

    const extractionTime = Date.now() - startTime;

    console.log(`[Regex Extractor] Extracted in ${extractionTime}ms`);
    console.log(`[Regex Extractor] Patterns matched: ${matchedPatterns.join(', ')}`);
    console.log(`[Regex Extractor] Confidence: ${confidence.toFixed(2)}`);
    console.log(`[Regex Extractor] Needs LLM: ${needsLLM}`);

    return {
        entities,
        confidence,
        matchedPatterns,
        needsLLM,
    };
}

// ============================================================================
// CONFIDENCE CALCULATION
// ============================================================================

function calculateConfidence(matchedPatterns: string[], query: string): number {
    let confidence = 0.0;

    // Base confidence from number of patterns matched
    const patternScore = Math.min(matchedPatterns.length * 0.25, 0.75);
    confidence += patternScore;

    // Bonus for high-confidence patterns
    if (matchedPatterns.includes('graduation_year')) confidence += 0.1;
    if (matchedPatterns.includes('location')) confidence += 0.05;
    if (matchedPatterns.includes('degree')) confidence += 0.1;

    // Penalty for very short or ambiguous queries
    if (query.length < 15) confidence -= 0.1;
    if (query.split(' ').length < 3) confidence -= 0.1;

    // Ensure confidence is in range [0, 1]
    return Math.max(0.0, Math.min(1.0, confidence));
}

// ============================================================================
// LLM FALLBACK DECISION
// ============================================================================

function shouldUseLLMFallback(
    matchedPatterns: string[],
    query: string,
    confidence: number
): boolean {
    // Use LLM if confidence is too low
    if (confidence < 0.5) return true;

    // Use LLM if no patterns matched
    if (matchedPatterns.length === 0) return true;

    // Use LLM for complex queries (conversational, multi-clause)
    const conversationalKeywords = [
        'can you', 'could you', 'please', 'i want', 'i need', 'help me',
        'looking for', 'interested in', 'recommend', 'suggest'
    ];

    const hasConversational = conversationalKeywords.some(keyword =>
        query.toLowerCase().includes(keyword)
    );

    if (hasConversational) return true;

    // Use LLM for comparison queries
    if (query.toLowerCase().includes('compare') || query.toLowerCase().includes('versus')) {
        return true;
    }

    // Use LLM for complex boolean logic
    if (query.includes(' or ') || query.includes(' either ') || query.includes(' neither ')) {
        return true;
    }

    // Regex is confident - no LLM needed
    return false;
}

// ============================================================================
// TESTING UTILITIES
// ============================================================================

/**
 * Test the regex extractor with a query and print detailed results
 */
export function testRegexExtraction(query: string): void {
    console.log('\n' + '='.repeat(80));
    console.log('REGEX EXTRACTION TEST');
    console.log('='.repeat(80));
    console.log(`Query: "${query}"`);
    console.log('');

    const result = extractEntitiesWithRegex(query);

    console.log('Entities:', JSON.stringify(result.entities, null, 2));
    console.log('Confidence:', result.confidence.toFixed(2));
    console.log('Matched Patterns:', result.matchedPatterns.join(', '));
    console.log('Needs LLM:', result.needsLLM ? 'YES' : 'NO');
    console.log('='.repeat(80) + '\n');
}
