/**
 * Intent Classification Service
 * 
 * Classifies user query intent to optimize search and response formatting.
 * Uses pattern matching to identify the primary goal of the query.
 * 
 * Intent Types:
 * - find_business: Looking for companies/services/providers
 * - find_peers: Looking for batchmates/alumni/classmates
 * - find_specific_person: Looking for a specific person by name
 * - find_alumni_business: Looking for alumni who provide specific services
 * 
 * Reference: /QUERY-TAXONOMY.md (188 sample queries)
 */

export type Intent = 'find_business' | 'find_peers' | 'find_specific_person' | 'find_alumni_business';

export interface IntentResult {
  primary: Intent;
  secondary?: Intent;
  confidence: number;
  matchedPatterns: string[];
}

// ============================================================================
// INTENT PATTERNS
// ============================================================================

/**
 * find_business: User wants to find companies, services, or providers
 * 
 * Examples:
 * - "Find web development company in Chennai"
 * - "Looking for IT consulting services"
 * - "Who manufactures aluminum products?"
 * - "Find companies with high turnover"
 */
const BUSINESS_PATTERNS = [
  // Explicit business/company/service keywords (lower weight to not override specific person)
  { pattern: /\b(?:find|looking\s+for|need|want|show|list)\s+(?:a\s+)?(?:company|companies|business|businesses|firm|firms)\b/gi, weight: 0.9 },
  { pattern: /\b(?:find|looking\s+for|need|want)\s+(?:service|provider|supplier|manufacturer|consultant|vendor)\b/gi, weight: 0.9 },

  // Industry/domain indicators
  { pattern: /\b(?:IT|manufacturing|consulting|construction|textile|automotive|fintech|educational)\s+(?:company|companies|business|industry)\b/gi, weight: 0.9 },

  // Service-based queries
  { pattern: /\b(?:find|who)\s+(?:provides|offers|does|manufactures)\s+[a-z\s]+?(?:service|solution|product)\b/gi, weight: 0.85 },
  { pattern: /\b(?:web\s+development|IT\s+consulting|digital\s+marketing|HR\s+services|manufacturing|packaging)\b/gi, weight: 0.7 },

  // Business attributes
  { pattern: /\b(?:turnover|revenue|established|successful|startup|SME)\b/gi, weight: 0.75 },

  // Location-based business discovery
  { pattern: /\b(?:entrepreneurs?|companies|businesses)\s+(?:in|at|from|based\s+in)\s+[A-Z][a-z]+\b/gi, weight: 0.8 },
  { pattern: /\b[A-Z][a-z]+(?:-based)?\s+(?:companies|businesses|entrepreneurs?)\b/gi, weight: 0.75 },
  { pattern: /\bbusinesses\s+in\b/gi, weight: 0.7 },

  // "Who is in..." patterns (business context, not person)
  { pattern: /\bwho\s+(?:is|works|are)\s+in\s+(?:the\s+)?(?:industry|sector|field)/gi, weight: 0.85 },
];

/**
 * find_peers: User wants to find batchmates, alumni, classmates
 * 
 * Examples:
 * - "Find my 1995 batchmates"
 * - "Who graduated in mechanical in 1998?"
 * - "Looking for ECE batch of 2010"
 * - "Find classmates from 95 passout"
 */
const PEERS_PATTERNS = [
  // Batch/alumni keywords
  { pattern: /\b(?:batchmate|batchmates|classmate|classmates)\b/gi, weight: 1.0 },
  { pattern: /\b(?:find|show|list|who\s+are)\s+(?:my\s+)?(?:batch|batchmates?|classmates?)\b/gi, weight: 1.0 },

  // Graduation/passout indicators
  { pattern: /\b(?:passout|graduates?|graduated|alumnus|alumni)\b/gi, weight: 0.95 },
  { pattern: /\b\d{2,4}\s+(?:passout|batch|graduated|grad|year)\b/gi, weight: 0.9 },
  { pattern: /\b(?:batch|passout)\s+(?:of)?\s+\d{2,4}\b/gi, weight: 0.9 },

  // Branch + year combinations (strong peer signal)
  { pattern: /\b\d{2,4}\s+(?:mechanical|civil|ECE|EEE|CSE|IT|textile|production)\b/gi, weight: 0.85 },
  { pattern: /\b(?:mechanical|civil|ECE|EEE|CSE|IT)\s+batch\b/gi, weight: 0.85 },

  // Degree indicators (context for alumni search)
  { pattern: /\b(?:B\.E|M\.E|MBA|MCA|B\.Tech|M\.Tech)\s+(?:batch|graduates?|passout)\b/gi, weight: 0.8 },
];

/**
 * find_specific_person: User wants to find a specific person by name
 * 
 * Examples:
 * - "Find Sivakumar from USAM Technology"
 * - "Who is Nalini Rajesh?"
 * - "Contact information for Sriram"
 * - "Looking for S Mohanraj"
 */
const SPECIFIC_PERSON_PATTERNS = [
  // Name patterns - check for capitalized words that look like names (but not "Who is in...")
  { pattern: /\b(?:find|looking\s+for)\s+[A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z]+)?\b/g, weight: 1.0 },
  { pattern: /\bwho\s+is\s+[A-Z][a-z]+(?:\s+[A-Z]\.?)?\s*(?:[A-Z][a-z]+)?\s*\??$/gi, weight: 1.0 }, // "Who is {Name}?" at end of query

  // "from/at/with {Company}" - strong person indicator
  { pattern: /\b(?:from|at|with)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+(?:Technology|Solutions|Systems|Pvt|Ltd|Company|Marketplace))?\b/g, weight: 0.95 },

  // Contact/details request with name
  { pattern: /\b(?:contact|phone|email|details)\s+(?:of|for|information\s+for)\s+[A-Z]/gi, weight: 0.9 },

  // "Who runs {Company}" pattern
  { pattern: /\bwho\s+runs\s+[A-Z][a-z]+/gi, weight: 0.85 },
];

/**
 * find_alumni_business: Hybrid - alumni who provide specific services
 * 
 * Examples:
 * - "Find 1995 batch in IT services"
 * - "Who from 98 batch does web development?"
 * - "Alumni providing consulting services"
 * - "Find mechanical graduates running manufacturing companies"
 */
const ALUMNI_BUSINESS_PATTERNS = [
  // Batch/alumni + service action verbs (strong signal)
  { pattern: /\b(?:batch|alumni|passout|graduates?|batchmates?)\s+(?:who\s+)?(?:in|doing|running|providing|provides?|offers?|does|runs?)\s+[a-z\s]+\b/gi, weight: 1.2 },
  { pattern: /\b(?:find|who)\s+(?:from\s+)?(?:\d{2,4}\s+)?(?:batch|alumni|graduates?)\s+(?:in|doing|provides?|runs?|running|offering)\b/gi, weight: 1.15 },

  // Alumni + business/service/company keywords
  { pattern: /\b(?:alumni|graduates?|batchmates?)\s+(?:who|with|running|doing|providing)\s+(?:business|company|startup|service|solution)\b/gi, weight: 1.1 },
  { pattern: /\b(?:alumni|graduates?|batchmates?)\s+(?:in|with)\s+(?:IT|manufacturing|consulting|construction|textile|automotive)\b/gi, weight: 1.0 },

  // Branch/year + industry/service
  { pattern: /\b(?:mechanical|civil|ECE|CSE|IT|EEE|textile)\s+(?:batch|alumni|graduates?)\s+(?:in|doing|running)\s+[a-z\s]+?(?:business|company|service)\b/gi, weight: 1.0 },
  { pattern: /\b\d{2,4}\s+(?:batch|passout|alumni)\s+(?:in|doing|running|providing)\s+(?:IT|manufacturing|consulting|construction|services?)\b/gi, weight: 1.0 },

  // "running/runs" is a very strong business indicator with alumni context
  { pattern: /\b(?:alumni|graduates?|batchmates?|batch|passout).*?(?:running|runs)\b/gi, weight: 0.95 },
  { pattern: /\brunning.*?(?:companies?|business)\b/gi, weight: 0.85 },
];

// ============================================================================
// AMBIGUITY RESOLUTION
// ============================================================================

/**
 * Some queries can have multiple intents. For example:
 * "Find 1995 mechanical batch in Chennai" could be:
 * - find_peers (primary): Looking for batchmates
 * - find_alumni_business (secondary): If Chennai has business context
 * 
 * We resolve by checking pattern strength and context.
 */
interface PatternMatch {
  intent: Intent;
  confidence: number;
  matchedPatterns: string[];
}

function calculatePatternScore(query: string, patterns: Array<{ pattern: RegExp; weight: number }>): { score: number; matched: string[] } {
  let totalScore = 0;
  const matched: string[] = [];

  for (const { pattern, weight } of patterns) {
    const matches = query.match(pattern);
    if (matches) {
      totalScore += weight * matches.length;
      matched.push(pattern.source);
    }
  }

  return { score: totalScore, matched };
}

// ============================================================================
// MAIN CLASSIFICATION FUNCTION
// ============================================================================

/**
 * Classify query intent with confidence scoring
 * 
 * Algorithm:
 * 1. Run query against all intent patterns
 * 2. Calculate weighted scores for each intent
 * 3. Normalize scores to 0-1 confidence range
 * 4. Return primary intent (highest) and secondary (if close)
 * 
 * @param query - User's natural language query
 * @returns IntentResult with primary/secondary intent and confidence
 */
export function classifyIntent(query: string): IntentResult {
  const normalizedQuery = query.toLowerCase().trim();

  // Calculate scores for each intent
  const businessMatch = calculatePatternScore(normalizedQuery, BUSINESS_PATTERNS);
  const peersMatch = calculatePatternScore(normalizedQuery, PEERS_PATTERNS);
  const specificPersonMatch = calculatePatternScore(normalizedQuery, SPECIFIC_PERSON_PATTERNS);
  const alumniBusinessMatch = calculatePatternScore(normalizedQuery, ALUMNI_BUSINESS_PATTERNS);

  // Create scored intents
  const scores: PatternMatch[] = [
    { intent: 'find_business', confidence: businessMatch.score, matchedPatterns: businessMatch.matched },
    { intent: 'find_peers', confidence: peersMatch.score, matchedPatterns: peersMatch.matched },
    { intent: 'find_specific_person', confidence: specificPersonMatch.score, matchedPatterns: specificPersonMatch.matched },
    { intent: 'find_alumni_business', confidence: alumniBusinessMatch.score, matchedPatterns: alumniBusinessMatch.matched },
  ];

  // Sort by confidence (descending)
  scores.sort((a, b) => b.confidence - a.confidence);

  // No clear intent detected
  if (scores[0].confidence === 0) {
    return {
      primary: 'find_business', // Default fallback
      confidence: 0.3,
      matchedPatterns: []
    };
  }

  // Normalize confidence to 0-1 range (adjusted for better scores)
  const maxScore = scores[0].confidence;
  const normalizedPrimary = Math.min(scores[0].confidence / (maxScore * 0.35 + 0.7), 1.0);

  // Check for secondary intent (within 50% of primary)
  let secondary: Intent | undefined;
  if (scores[1].confidence > 0) {
    const ratio = scores[1].confidence / scores[0].confidence;
    if (ratio >= 0.5) {
      secondary = scores[1].intent;
    }
  }

  return {
    primary: scores[0].intent,
    secondary,
    confidence: parseFloat(normalizedPrimary.toFixed(2)),
    matchedPatterns: scores[0].matchedPatterns.slice(0, 3) // Top 3 patterns
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if query is ambiguous (multiple strong intents)
 */
export function isAmbiguousQuery(result: IntentResult): boolean {
  return result.secondary !== undefined && result.confidence < 0.85;
}

/**
 * Get human-readable intent description
 */
export function getIntentDescription(intent: Intent): string {
  const descriptions: Record<Intent, string> = {
    find_business: 'Finding companies, services, or providers',
    find_peers: 'Finding batchmates, alumni, or classmates',
    find_specific_person: 'Finding a specific person by name',
    find_alumni_business: 'Finding alumni who provide specific services'
  };
  return descriptions[intent];
}

/**
 * Suggest query refinement for ambiguous queries
 */
export function suggestRefinement(result: IntentResult): string[] {
  if (!result.secondary) return [];

  const suggestions: string[] = [];

  if (result.primary === 'find_peers' && result.secondary === 'find_alumni_business') {
    suggestions.push('To find batchmates: Remove service/business keywords');
    suggestions.push('To find alumni businesses: Add "who provides" or "running company"');
  } else if (result.primary === 'find_business' && result.secondary === 'find_alumni_business') {
    suggestions.push('To find any business: Remove batch/alumni keywords');
    suggestions.push('To find alumni businesses: Add "from our batch" or graduation year');
  }

  return suggestions;
}
export type Intent = 'find_business' | 'find_peers' | 'find_specific_person' | 'find_alumni_business';

export interface IntentResult {
  primary: Intent;
  secondary?: Intent;
  confidence: number;
}

/**
 * Lightweight intent classification using regex + keyword patterns.
 * Designed for fast, deterministic routing before LLM fallback.
 */
export function classifyIntent(query: string): IntentResult {
  const q = query.toLowerCase();

  // Score each intent type
  const scores = {
    find_business: scoreBusinessIntent(q),
    find_peers: scorePeersIntent(q),
    find_specific_person: scoreSpecificPersonIntent(q),
    find_alumni_business: scoreAlumniBusiness(q),
  };

  // Find primary (highest score)
  let primary: Intent = 'find_peers'; // default fallback
  let maxScore = 0;
  for (const [intent, score] of Object.entries(scores) as [Intent, number][]) {
    if (score > maxScore) {
      maxScore = score;
      primary = intent;
    }
  }

  // Find secondary if close enough (within 0.1)
  let secondary: Intent | undefined;
  for (const [intent, score] of Object.entries(scores) as [Intent, number][]) {
    if (intent !== primary && score > maxScore - 0.1 && score > 0) {
      secondary = intent;
      break;
    }
  }

  return {
    primary,
    secondary,
    confidence: Math.min(1, maxScore),
  };
}

/* =====================
   Intent Scoring Helpers
   ===================== */

/**
 * find_business: looking for services/companies/providers
 * Keywords: "web dev", "consultant", "provider", "company", "business", "service", "startup", "freelancer"
 * Patterns: "need XYZ service", "find a developer", "anyone doing..."
 */
function scoreBusinessIntent(q: string): number {
  let score = 0;

  const businessKeywords = [
    'web dev',
    'developer',
    'consultant',
    'provider',
    'company',
    'business',
    'service',
    'startup',
    'freelancer',
    'coder',
    'designer',
    'architect',
    'engineer',
    'agency',
    'vendor',
    'supplier',
    'mechanic',
    'plumber',
    'electrician',
    'contractor',
  ];

  for (const kw of businessKeywords) {
    if (q.includes(kw)) score += 0.2;
  }

  // Phrases: "anyone doing", "find a", "need someone for", "looking for someone who", "need help with"
  if (/\b(anyone doing|find a|need someone|looking for someone|need help with|do you know|who (can|does))\b/.test(q)) {
    score += 0.3;
  }

  // "in <city>" + service keyword = boost
  if (/\bin\s+[a-z]{3,}/i.test(q) && businessKeywords.some(kw => q.includes(kw))) {
    score += 0.2;
  }

  return Math.min(1, score);
}

/**
 * find_peers: looking for batchmates, alumni, classmates
 * Keywords: "batch", "passout", "alumni", "classmate", "batchmate", "same year", "1995 batch"
 * Patterns: "find 1995 batch", "anyone from mechanical 95", "who graduated in..."
 */
function scorePeersIntent(q: string): number {
  let score = 0;

  const peerKeywords = ['batch', 'passout', 'alumni', 'classmate', 'batchmate', 'graduated', 'same year', 'year of passout'];

  for (const kw of peerKeywords) {
    if (q.includes(kw)) score += 0.25;
  }

  // Year patterns: 4-digit year or 2-digit "95"
  if (/\b(19|20)\d{2}\b|\b(passout|batch|year)\b.*\d{2}\b/i.test(q)) {
    score += 0.3;
  }

  // Branch + batch combo is STRONG signal for find_peers
  const branches = ['mechanical', 'civil', 'ece', 'electrical', 'cse', 'it', 'textile'];
  if (branches.some(b => q.includes(b)) && (q.includes('batch') || q.includes('passout'))) {
    score += 0.4; // Strong boost for "mechanical batch" style queries
  }

  // ONLY reduce if there's an explicit service ACTION word (not just a job title)
  const serviceActions = ['need', 'looking for', 'find a', 'find someone', 'anyone who can', 'anyone doing', 'hire', 'consult'];
  if (serviceActions.some(s => q.includes(s))) {
    score -= 0.2;
  }

  return Math.max(0, Math.min(1, score));
}

/**
 * find_specific_person: looking for a named individual
 * Keywords: name patterns, "find X", "where is", "contact of"
 * Patterns: "Find Rahul", "Where is Priya", "Contact number of..."
 */
function scoreSpecificPersonIntent(q: string): number {
  let score = 0;

  // Explicit person-search phrases
  if (/\b(find|where is|contact|phone|call|reach|get|name of|anyone named)\b/i.test(q)) {
    score += 0.2;
  }

  // Capitalized name tokens (heuristic)
  const capitalTokens = q.match(/\b[A-Z][a-z]{2,}\b/g);
  if (capitalTokens && capitalTokens.length > 0) {
    score += 0.25 * Math.min(capitalTokens.length, 2); // max 0.5
  }

  // "Find X in Y" pattern
  if (/\bfind\s+[a-z]+\s+in\s+[a-z]+/i.test(q)) {
    score += 0.1;
  }

  return Math.min(1, score);
}

/**
 * find_alumni_business: looking for alumni who offer services
 * Keywords: "1995 batch" + service ACTION words, "batch of 95 who are consultants", etc.
 * Patterns: batch + service verb, year + professional offering
 */
function scoreAlumniBusiness(q: string): number {
  let score = 0;

  // Require EXPLICIT service action words, not just job titles
  const serviceActions = ['need', 'looking for', 'find a', 'find someone', 'anyone who can', 'anyone doing', 'hire', 'consult', 'offering', 'providing'];
  const hasServiceAction = serviceActions.some(s => q.includes(s));

  // Batch/year detection
  const hasBatch = /\b(batch|passout|alumni|year|graduated)\b/.test(q) || /\b(19|20)\d{2}\b/.test(q);

  // Service skill keywords (developer, consultant, etc.)
  const serviceSkills = ['developer', 'consultant', 'service', 'business', 'startup', 'freelancer', 'coder', 'designer'];
  const hasServiceSkill = serviceSkills.some(s => q.includes(s));

  // Both batch AND (service action OR explicit offer pattern) = alumni_business
  if (hasBatch && (hasServiceAction || /\b(who are|who is|offer|provide|run|manage)\b/.test(q))) {
    score += 0.6;
  }

  // Batch + service skill + explicit action verb = strong alumni_business signal
  if (hasBatch && hasServiceSkill && hasServiceAction) {
    score += 0.4;
  }

  // Pattern: "batch who are doing X service"
  if (/\b(batch|year|alumni).*\b(who|and)\b.*\b(doing|offering|providing|run|manage|have|do)\b.*\b(service|business|consulting|startup|development)\b/i.test(q)) {
    score += 0.3;
  }

  return Math.min(1, score);
}

/**
 * Default export for convenience
 */
export default {
  classifyIntent,
};