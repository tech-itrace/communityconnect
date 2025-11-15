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