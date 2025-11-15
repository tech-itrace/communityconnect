import axios from 'axios';
import Ajv from 'ajv';
import { ParsedQuery, ExtractedEntities, Member, MemberSearchResult } from '../utils/types';

const DEEPINFRA_API_URL = 'https://api.deepinfra.com/v1/inference/meta-llama/Meta-Llama-3.1-8B-Instruct';

// =====================================================================
// SCHEMA VALIDATION
// =====================================================================

// JSON schema for parsed query output
const PARSED_QUERY_SCHEMA = {
  type: 'object',
  properties: {
    intent: { type: 'string', enum: ['find_member', 'get_info', 'list_members', 'compare'] },
    entities: {
      type: 'object',
      properties: {
        skills: { type: ['array', 'null'], items: { type: 'string' } },
        location: { type: ['string', 'null'] },
        services: { type: ['array', 'null'], items: { type: 'string' } },
        turnover_requirement: { type: ['string', 'null'], enum: ['high', 'medium', 'low', null] },
        graduation_year: { type: ['array', 'null'], items: { type: 'number' } },
        degree: { type: ['string', 'null'] },
      },
      required: [],
      additionalProperties: false,
    },
    search_query: { type: 'string' },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
  },
  required: ['intent', 'entities', 'search_query', 'confidence'],
  additionalProperties: false,
};

const ajv = new Ajv();
const validateParsedQuery = ajv.compile(PARSED_QUERY_SCHEMA);

// =====================================================================
// DOMAIN-SPECIFIC PROMPT CONSTANT
// =====================================================================

const DOMAIN_SPECIFIC_PROMPT = `
You are an expert search query parser for Community Connect, a professional alumni & business networking platform.
Your task is to parse natural language member search queries and extract structured information.

## DATABASE SCHEMA
The members database has these key fields:
- year_of_graduation: integer (1950-2025)
- degree: string (B.E, M.E, MBA, MCA, Diploma, etc.)
- branch: string (Mechanical, Civil, ECE, Electrical, CSE, IT, Textile, Chemical, EEE)
- working_knowledge: array of strings (skills the member possesses)
- city: string (Chennai, Bangalore, Hyderabad, Coimbatore, etc.)
- organization_name: string (company/business name)
- designation: string (job title/role)
- services_offered: array of strings (consulting, freelance work, etc.)

## EXTRACTION RULES

### 1. Intent Classification
Determine the user's primary goal:
- **find_member**: Looking for people with specific skills, location, or profile
- **get_info**: Asking for details about a specific person or group
- **list_members**: Want to browse or list members (e.g., "show all")
- **compare**: Comparing members or asking for differences

### 2. Entity Extraction Guidelines

**Graduation Year:**
- 4-digit years (2020, 1995): use as-is
- 2-digit years (95, 20): convert using heuristic:
  * If ≤ current_year%100: map to 2000+YY (e.g., 95 → 2095... NO! use 1995)
  * If > current_year%100: map to 1900+YY
  * Range check: only accept 1950-2025
- Keywords: "passout", "batch", "graduated", "year of graduation"
- Examples: "1995 batch" → [1995], "passout 95" → [1995], "2020 graduates" → [2020]

**Degree:**
- Normalize variants: B.E/B.Tech/BE → "B.E", M.E/M.Tech/ME → "M.E", etc.
- Common: B.E, M.E, MBA, MCA, Diploma
- Pick ONE (highest relevant)

**Branch:**
- Normalize: "mech" → "Mechanical", "ece/ece" → "ECE", "it/information technology" → "IT"
- Common: Mechanical, Civil, ECE, Electrical, CSE, IT, Textile, Chemical, EEE
- If multiple branches mentioned, return as array

**Location (City):**
- Normalize synonyms: "madras" → "Chennai", "bengaluru" → "Bangalore"
- Strip location prefixes: "in Chennai" → "Chennai"
- Common: Chennai, Bangalore, Hyderabad, Coimbatore, Madurai, Sivakasi, Pune, Mumbai, Delhi
- Return single normalized city name

**Skills vs Services (CRITICAL - NO DUPLICATION):**
- **Skills** = technical capabilities (software, AI, web development, digital marketing, etc.)
- **Services** = business offerings (consulting, freelancing, manufacturing, investment advisory, etc.)
- RULE: Never put the same term in both fields
- If ambiguous, choose based on context:
  * "consultant" → services: ["consulting"] (NOT skills)
  * "AI expert" → skills: ["AI", "artificial intelligence"] (NOT services)
  * "web developer" → skills: ["web development"] (NOT services)
  * "consulting services" → services: ["consulting"] (NOT skills)

**Turnover Requirement:**
- "high"/"good"/"successful" → "high" (>10Cr)
- "medium"/"average" → "medium" (2-10Cr)
- "low"/"startup"/"small" → "low" (<2Cr)

### 3. Confidence Scoring
- 0.9-1.0: Very clear query with 2+ explicit entities
- 0.7-0.9: Clear intent, 1 main entity or 2 partial entities
- 0.5-0.7: Ambiguous or vague; some context present
- <0.5: Highly ambiguous (almost never use)
- Default: Set ≥0.7 for any reasonable query

### 4. Search Query Optimization
- Expand with synonyms and related terms
- "IT industry" → "IT Information Technology software development technology"
- "consultant" → "consultant consulting advisory professional services"
- Keep query readable and keyword-rich for semantic search

## OUTPUT FORMAT

Return ONLY valid JSON (no markdown, no explanation):

{
  "intent": "find_member | get_info | list_members | compare",
  "entities": {
    "skills": ["skill1", "skill2"] or null,
    "location": "city name" or null,
    "services": ["service1", "service2"] or null,
    "turnover_requirement": "high | medium | low" or null,
    "graduation_year": [year1, year2] or null,
    "degree": "degree name" or null
  },
  "search_query": "expanded search query for semantic search",
  "confidence": 0.0 to 1.0
}

## EXAMPLES

Query: "Find 1995 batch mechanical engineers in Chennai"
→ intent: find_member, entities: { graduation_year: [1995], branch: "Mechanical", location: "Chennai" }, confidence: 0.95

Query: "I need a web developer"
→ intent: find_member, entities: { skills: ["web development"] }, confidence: 0.85

Query: "Show me consultants offering software services"
→ intent: list_members, entities: { services: ["consulting"], skills: ["software"] }, confidence: 0.9

Query: "Anyone from IT industry in Bangalore?"
→ intent: find_member, entities: { skills: ["IT", "software", "technology"], location: "Bangalore" }, confidence: 0.88

Query: "Find someone"
→ intent: find_member, entities: {}, confidence: 0.5
`;

// =====================================================================
// TELEMETRY & LOGGING
// =====================================================================

interface ExtractionMetrics {
  method: 'llm' | 'regex' | 'merge' | 'fallback';
  llmLatencyMs: number;
  validationPassed: boolean;
  retries: number;
  confidence: number;
  matchedPatterns?: string[];
}

const metrics: ExtractionMetrics[] = [];

export function getExtractionMetrics(): ExtractionMetrics[] {
  return metrics;
}

function recordMetric(m: ExtractionMetrics) {
  metrics.push(m);
  if (metrics.length > 1000) metrics.shift(); // Keep last 1000
}

// =====================================================================
// HELPER: NORMALIZERS
// =====================================================================

const CITY_NORMALIZATION: Record<string, string> = {
  'chennai': 'Chennai',
  'madras': 'Chennai',
  'bangalore': 'Bangalore',
  'bengaluru': 'Bangalore',
  'bengalore': 'Bangalore',
  'hyderabad': 'Hyderabad',
  'coimbatore': 'Coimbatore',
  'salem': 'Salem',
  'madurai': 'Madurai',
  'sivakasi': 'Sivakasi',
  'pune': 'Pune',
  'mumbai': 'Mumbai',
  'delhi': 'Delhi',
  'new delhi': 'Delhi',
  'tamilnadu': 'Tamil Nadu',
  'tamil nadu': 'Tamil Nadu',
};

const DEGREE_NORMALIZATION: Record<string, string> = {
  'be': 'B.E',
  'b.e.': 'B.E',
  'btech': 'B.E',
  'b.tech': 'B.E',
  'me': 'M.E',
  'm.e.': 'M.E',
  'mtech': 'M.E',
  'm.tech': 'M.E',
  'mba': 'MBA',
  'mca': 'MCA',
  'diploma': 'Diploma',
};

const BRANCH_NORMALIZATION: Record<string, string> = {
  'mechanical': 'Mechanical',
  'mech': 'Mechanical',
  'civil': 'Civil',
  'ece': 'ECE',
  'electrical': 'Electrical',
  'eee': 'EEE',
  'cse': 'CSE',
  'cs': 'CSE',
  'computer science': 'CSE',
  'it': 'IT',
  'information technology': 'IT',
  'textile': 'Textile',
  'chemical': 'Chemical',
};

function normalizeYear(yearStr: string): number | null {
  const year = parseInt(yearStr, 10);
  if (isNaN(year)) return null;

  if (year >= 1950 && year <= 2025) return year;

  // 2-digit year conversion
  if (year >= 0 && year <= 99) {
    const currentYY = new Date().getFullYear() % 100;
    const mapped = year <= currentYY ? 2000 + year : 1900 + year;
    if (mapped >= 1950 && mapped <= 2025) return mapped;
  }

  return null;
}

function normalizeCity(city: string): string | null {
  const lower = city.toLowerCase().trim();
  const normalized = CITY_NORMALIZATION[lower];
  if (normalized) return normalized;

  // If not in map, capitalize
  if (lower.length >= 2) {
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }

  return null;
}

function normalizeDegree(degree: string): string | null {
  const lower = degree.toLowerCase().trim();
  return DEGREE_NORMALIZATION[lower] || null;
}

function normalizeBranch(branch: string): string | null {
  const lower = branch.toLowerCase().trim();
  return BRANCH_NORMALIZATION[lower] || null;
}

// =====================================================================
// LLM CALL
// =====================================================================

async function callLLM(systemPrompt: string, userMessage: string, temperature: number = 0.3): Promise<string> {
  const DEEPINFRA_API_KEY = process.env.DEEPINFRA_API_KEY;

  if (!DEEPINFRA_API_KEY) {
    throw new Error('DEEPINFRA_API_KEY is not configured');
  }

  const formattedInput = `<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n${systemPrompt}<|eot_id|><|start_header_id|>user<|end_header_id|>\n\n${userMessage}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n`;

  const payload = {
    input: formattedInput,
    temperature: temperature,
    max_tokens: 1000,
    stop: ['<|eot_id|>', '<|end_of_text|>', '<|eom_id|>'],
  };

  try {
    const response = await axios.post(DEEPINFRA_API_URL, payload, {
      headers: {
        'Authorization': `Bearer ${DEEPINFRA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    const generatedText = response.data?.results?.[0]?.generated_text || '';
    return generatedText.trim();
  } catch (error: any) {
    console.error('[LLM Service] API error:', error.message);
    if (error.response) {
      console.error('[LLM Service] Error status:', error.response.status);
    }
    throw new Error('LLM API call failed');
  }
}

// =====================================================================
// JSON PARSING WITH RECOVERY
// =====================================================================

function extractJSON(text: string): any {
  // Try direct parse
  try {
    return JSON.parse(text);
  } catch {}

  // Try extracting JSON from markdown code blocks
  const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1]);
    } catch {}
  }

  // Try extracting first {...} object
  const objectMatch = text.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    try {
      return JSON.parse(objectMatch[0]);
    } catch {}
  }

  throw new Error('Could not extract valid JSON from response');
}

async function retryWithCorrection(query: string, previousResponse: string, retryCount: number): Promise<any> {
  if (retryCount >= 2) {
    console.log('[LLM Service] Max retries reached, falling back');
    return null;
  }

  console.log(`[LLM Service] Retrying with correction (attempt ${retryCount + 1})`);

  const correctionPrompt = `The previous response was not valid JSON. Please try again and return ONLY valid JSON matching this exact schema:
{
  "intent": "find_member | get_info | list_members | compare",
  "entities": {
    "skills": ["skill1", "skill2"] or null,
    "location": "city name" or null,
    "services": ["service1", "service2"] or null,
    "turnover_requirement": "high | medium | low" or null,
    "graduation_year": [year1, year2] or null,
    "degree": "degree name" or null
  },
  "search_query": "expanded search query",
  "confidence": 0.0 to 1.0
}

Original query: "${query}"
Previous invalid response: ${previousResponse}

Return ONLY valid JSON, no explanation.`;

  try {
    const retryResponse = await callLLM(DOMAIN_SPECIFIC_PROMPT, correctionPrompt, 0.1);
    return extractJSON(retryResponse);
  } catch (error) {
    console.error('[LLM Service] Retry failed:', error);
    return null;
  }
}

// =====================================================================
// MAIN: PARSE QUERY
// =====================================================================

export async function parseQuery(naturalQuery: string, conversationContext?: string): Promise<ParsedQuery> {
  const startTime = Date.now();
  console.log(`[LLM Service] Parsing query: "${naturalQuery}"`);

  if (isMockMode()) {
    console.log('[LLM Service] MOCK mode active');
    return mockParse(naturalQuery);
  }

  let systemPrompt = DOMAIN_SPECIFIC_PROMPT;

  if (conversationContext) {
    systemPrompt += `\n\nConversation Context:\n${conversationContext}\n\nUse context to understand follow-up queries.`;
  }

  let retries = 0;
  let parsed: any = null;

  try {
    const response = await callLLM(systemPrompt, naturalQuery, 0.1);
    parsed = extractJSON(response);
  } catch (parseError: any) {
    console.log('[LLM Service] JSON parsing failed, attempting recovery...');
    parsed = await retryWithCorrection(naturalQuery, parseError.message, retries++);
  }

  const llmLatency = Date.now() - startTime;

  if (!parsed) {
    console.error('[LLM Service] All parsing attempts failed, falling back to mock');
    recordMetric({
      method: 'fallback',
      llmLatencyMs: llmLatency,
      validationPassed: false,
      retries,
      confidence: 0.5,
    });
    return mockParse(naturalQuery);
  }

  // Validate schema
  const valid = validateParsedQuery(parsed);
  if (!valid) {
    console.warn('[LLM Service] Schema validation failed:', validateParsedQuery.errors);
    recordMetric({
      method: 'llm',
      llmLatencyMs: llmLatency,
      validationPassed: false,
      retries,
      confidence: parsed.confidence || 0.5,
    });
    return mockParse(naturalQuery);
  }

  // Normalize entities
  const normalized = normalizeEntities(parsed.entities);

  const result: ParsedQuery = {
    intent: parsed.intent || 'find_member',
    entities: normalized,
    searchQuery: parsed.search_query || naturalQuery,
    confidence: parsed.confidence || 0.7,
  };

  recordMetric({
    method: 'llm',
    llmLatencyMs: llmLatency,
    validationPassed: true,
    retries,
    confidence: result.confidence,
  });

  console.log(`[LLM Service] ✓ Parsed in ${llmLatency}ms, confidence: ${result.confidence}`);
  return result;
}

function normalizeEntities(entities: any): ExtractedEntities {
  const normalized: ExtractedEntities = {};

  if (entities.skills && Array.isArray(entities.skills)) {
    normalized.skills = entities.skills;
  }

  if (entities.location) {
    normalized.location = normalizeCity(entities.location) || entities.location;
  }

  if (entities.services && Array.isArray(entities.services)) {
    normalized.services = entities.services;
  }

  if (entities.turnover_requirement) {
    normalized.turnoverRequirement = entities.turnover_requirement as any;
  }

  if (entities.graduation_year && Array.isArray(entities.graduation_year)) {
    normalized.graduationYear = entities.graduation_year
      .map((y: any) => normalizeYear(String(y)))
      .filter((year: any): year is number => year !== null);
  }

  if (entities.degree) {
    normalized.degree = normalizeDegree(entities.degree) || entities.degree;
  }

  return normalized;
}

// =====================================================================
// RESPONSE GENERATION
// =====================================================================

export async function generateResponse(
  originalQuery: string,
  results: MemberSearchResult[],
  confidence: number
): Promise<string> {
  const startTime = Date.now();

  if (results.length === 0) {
    return `I couldn't find any members matching "${originalQuery}". Try different keywords or locations.`;
  }

  const systemPrompt = `
You are a member search assistant. Format results as simple comma-separated lines.
Each line: Number. Name, Email, Phone, City
Show ALL members provided. No bold, no markdown, no extra text.`;

  const safeResults = results.slice(0, 50).map((r, i) => ({
    id: i + 1,
    name: r.name || '',
    email: r.email || '',
    phone: r.phone || '',
    city: r.city || '',
  }));

  const userMessage = `Format these ${safeResults.length} members as simple lines:\n${JSON.stringify(safeResults)}`;

  try {
    const response = await callLLM(systemPrompt, userMessage, 0.2);
    console.log(`[LLM Service] ✓ Response generated in ${Date.now() - startTime}ms`);
    return response.trim();
  } catch (error: any) {
    console.error('[LLM Service] Response generation failed:', error.message);
    // Fallback
    return safeResults
      .map(r => `${r.id}. ${r.name}, ${r.email}, ${r.phone}, ${r.city}`)
      .join('\n');
  }
}

// =====================================================================
// SUGGESTIONS
// =====================================================================

export async function generateSuggestions(originalQuery: string, results: MemberSearchResult[]): Promise<string[]> {
  const startTime = Date.now();

  const systemPrompt = `Generate 3 relevant follow-up search suggestions based on results. Return JSON array only: ["...", "...", "..."]`;

  const userMessage = `Query: "${originalQuery}", Found: ${results.length} members. Suggestions?`;

  try {
    const response = await callLLM(systemPrompt, userMessage, 0.7);
    const suggestions = extractJSON(response);
    console.log(`[LLM Service] ✓ Suggestions in ${Date.now() - startTime}ms`);
    return Array.isArray(suggestions) ? suggestions.slice(0, 3) : getFallbackSuggestions(results);
  } catch {
    return getFallbackSuggestions(results);
  }
}

function getFallbackSuggestions(results: MemberSearchResult[]): string[] {
  return [
    'Search by location',
    'Find members with specific skills',
    'Browse by company',
  ];
}

// =====================================================================
// LEGACY & MOCK
// =====================================================================

export async function getLLMResponse(message: string): Promise<string> {
  const DEEPINFRA_API_KEY = process.env.DEEPINFRA_API_KEY;
  if (!DEEPINFRA_API_KEY) {
    return 'API key not configured.';
  }

  const formattedInput = `<|begin_of_text|><|start_header_id|>user<|end_header_id|>\n\n${message}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n`;

  try {
    const response = await axios.post(DEEPINFRA_API_URL, { input: formattedInput }, {
      headers: { 'Authorization': `Bearer ${DEEPINFRA_API_KEY}` },
    });
    return response.data?.results?.[0]?.generated_text || '';
  } catch (error: any) {
    console.error('[getLLMResponse] Error:', error.message);
    return 'Error processing request.';
  }
}

function isMockMode() {
  return process.env.MOCK_LLM === 'true' || process.env.NODE_ENV === 'test';
}

function mockParse(naturalQuery: string): ParsedQuery {
  const q = naturalQuery.toLowerCase();
  const result: ParsedQuery = {
    intent: 'find_member',
    entities: {},
    searchQuery: naturalQuery,
    confidence: 0.8,
  };

  // Extract graduation year
  const yearMatch = q.match(/\b(19|20)\d{2}\b/);
  if (yearMatch) {
    result.entities.graduationYear = [parseInt(yearMatch[0], 10)];
  }

  // Extract city FIRST (before branch, to avoid conflicts)
  for (const [key, val] of Object.entries(CITY_NORMALIZATION)) {
    if (q.includes(key)) {
      result.entities.location = val;
      break;
    }
  }

  // Extract degree/branch
  for (const [key, val] of Object.entries(BRANCH_NORMALIZATION)) {
    if (q.includes(key)) {
      result.entities.degree = val;
      break;
    }
  }

  // Extract skills
  const skillKeywords = ['web developer', 'developer', 'coder', 'designer', 'consultant', 'engineer', 'architect', 'ai', 'software'];
  const foundSkills: string[] = [];
  for (const skill of skillKeywords) {
    if (q.includes(skill)) {
      foundSkills.push(skill.charAt(0).toUpperCase() + skill.slice(1));
    }
  }
  if (foundSkills.length > 0) {
    result.entities.skills = foundSkills;
  }

  // Update confidence based on entities found
  const entityCount = Object.keys(result.entities).length;
  if (entityCount === 0) {
    result.confidence = 0.5;
  } else if (entityCount === 1) {
    result.confidence = 0.7;
  } else if (entityCount >= 2) {
    result.confidence = 0.85;
  }

  return result;
}
