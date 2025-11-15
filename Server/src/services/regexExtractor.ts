export interface ExtractedEntities {
  graduationYear?: number[];
  location?: string;
  degree?: string | string[];
  branch?: string | string[];
  skills?: string[];
  services?: string[];
  turnoverRequirement?: 'low' | 'medium' | 'high';
}

export interface RegexExtractionResult {
  entities: ExtractedEntities;
  confidence: number; // 0.0 - 1.0
  matched_patterns: string[];
}

/**
 * Primary entry - run lightweight regex+dictionary extraction.
 */
export function extractWithRegex(query: string): RegexExtractionResult {
  const q = query.toLowerCase();
  const matched_patterns: string[] = [];
  const entities: ExtractedEntities = {};

  // Year / passout
  const years = extractYears(q);
  if (years.length) {
    entities.graduationYear = years;
    matched_patterns.push('year');
  }

  // Location
  const city = extractCity(q);
  if (city) {
    entities.location = city;
    matched_patterns.push('location');
  }

  // Degree / Branch
  const deg = extractDegree(q);
  if (deg) {
    entities.degree = deg;
    matched_patterns.push('degree');
  }
  const br = extractBranch(q);
  if (br) {
    entities.branch = br;
    matched_patterns.push('branch');
  }

  // Skills / Services / Industry
  const { skills, services } = extractSkillsAndServices(q);
  if (skills.length) {
    entities.skills = skills;
    matched_patterns.push('skills');
  }
  if (services.length) {
    entities.services = services;
    matched_patterns.push('services');
  }

  // Turnover keywords
  const turnover = extractTurnover(q);
  if (turnover) {
    entities.turnoverRequirement = turnover;
    matched_patterns.push('turnover');
  }

  const confidence = calculateConfidence(entities, matched_patterns);

  return { entities, confidence, matched_patterns };
}

/* ----------------------
   Helper implementations
   ---------------------- */

function extractYears(q: string): number[] {
  const results: number[] = [];
  // full year 1900-2099
  const fullYearRe = /\b(19|20)\d{2}\b/g;
  let m;
  while ((m = fullYearRe.exec(q))) {
    results.push(parseInt(m[0], 10));
  }

  // two-digit year like '95 passout' or '95 batch'
  const twoDigitRe = /\b(\d{2})\b/g;
  while ((m = twoDigitRe.exec(q))) {
    const v = parseInt(m[1], 10);
    // map using current year heuristic (2025). if <= currentYear%100 map to 2000+, else 1900+
    const currentYY = new Date().getFullYear() % 100;
    if (v > 0 && v <= 99) {
      const mapped = v <= currentYY ? 2000 + v : 1900 + v;
      // only accept plausible alumni years (1950-2025)
      if (mapped >= 1950 && mapped <= new Date().getFullYear()) {
        // avoid duplicates
        if (!results.includes(mapped)) results.push(mapped);
      }
    }
  }

  // phrases "passout", "batch of 95", "1995 passout"
  const passoutRe = /\b(passout|batch|graduates|graduated|pass outs)\b/;
  if (results.length && passoutRe.test(q)) {
    return results;
  }
  // also accept standalone year if present
  return results;
}

const CITY_MAP: Record<string, string> = {
  chennai: 'Chennai',
  madras: 'Chennai',
  bangalore: 'Bangalore',
  bengaluru: 'Bangalore',
  bengalore: 'Bangalore',
  hyderabad: 'Hyderabad',
  coimbatore: 'Coimbatore',
  salem: 'Salem',
  tamilnadu: 'Tamil Nadu',
  'tamil nadu': 'Tamil Nadu',
  mumbai: 'Mumbai',
  delhi: 'Delhi',
  'new delhi': 'Delhi',
};

function extractCity(q: string): string | undefined {
  for (const key of Object.keys(CITY_MAP)) {
    if (q.includes(key)) return CITY_MAP[key];
  }
  // common pattern "in <city>"
  const inRe = /\bin\s+([a-z]{3,20}(?:\s[a-z]{3,20})?)/;
  const m = inRe.exec(q);
  if (m && m[1]) {
    const candidate = m[1].trim();
    const clean = candidate.replace(/[^a-z\s]/g, '');
    if (CITY_MAP[clean]) return CITY_MAP[clean];
    // capitalize
    return clean.split(' ').map(cap).join(' ');
  }
  return undefined;
}

function extractDegree(q: string): string | undefined {
  const degreeMap: [RegExp, string][] = [
    [/\b(b\.?e\.?|be|btech|b\.?tech|bachelor of engineering)\b/, 'B.E/B.Tech'],
    [/\b(m\.?e\.?|me|mtech|m\.?tech|master of engineering)\b/, 'M.E/M.Tech'],
    [/\b(mba|master of business administration)\b/, 'MBA'],
    [/\b(mca|master of computer applications)\b/, 'MCA'],
    [/\b(diploma)\b/, 'Diploma'],
  ];
  for (const [re, label] of degreeMap) {
    if (re.test(q)) return label;
  }
  return undefined;
}

const BRANCH_MAP: Record<string, string[]> = {
  mechanical: ['Mechanical', 'Mechanical Engineering'],
  ece: ['ECE', 'Electronics and Communication'],
  'electrical': ['Electrical', 'Electrical Engineering'],
  civil: ['Civil', 'Civil Engineering'],
  textile: ['Textile', 'Textile Engineering'],
  'computer': ['Computer Science', 'Computer Science Engineering'],
  'it': ['IT', 'Information Technology'],
};

function extractBranch(q: string): string[] | undefined {
  for (const key of Object.keys(BRANCH_MAP)) {
    if (q.includes(key)) return BRANCH_MAP[key];
  }
  // fuzzy checks
  const re = /\b(mechanical|civil|textile|ece|electrical|computer|it)\b/;
  const m = re.exec(q);
  if (m && m[1]) {
    const key = m[1];
    return BRANCH_MAP[key] || [cap(key)];
  }
  return undefined;
}

const SKILLS_KEYWORDS = [
  'web development',
  'website design',
  'software development',
  'digital marketing',
  'it consulting',
  'packaging',
  'hr',
  'textile',
  'manufacturing',
  'investment',
  'insurance',
  'civil engineering',
  'cad',
];

const SERVICES_KEYWORDS = [
  'consulting',
  'advisory',
  'services',
  'broker',
  'turnover',
  'revenue',
];

function extractSkillsAndServices(q: string): { skills: string[]; services: string[] } {
  const foundSkills: string[] = [];
  const foundServices: string[] = [];

  for (const s of SKILLS_KEYWORDS) {
    if (q.includes(s)) foundSkills.push(capEach(s));
  }
  for (const s of SERVICES_KEYWORDS) {
    if (q.includes(s)) foundServices.push(capEach(s));
  }

  // handle "IT" uppercase tokens
  if (/\bit\b/.test(q) && !foundSkills.includes('IT')) foundSkills.unshift('IT');

  return { skills: dedupe(foundSkills), services: dedupe(foundServices) };
}

function extractTurnover(q: string): 'low' | 'medium' | 'high' | undefined {
  if (/\b(above|greater than|>).*10\s*(crore|cr|cr\.)|\b10\s*crore\b/.test(q)) return 'high';
  if (/\b(good revenue|good turnover|medium|above 1 crore|1 crore)\b/.test(q)) return 'medium';
  if (/\b(small|startup|below 1 crore|less than 1 crore)\b/.test(q)) return 'low';
  return undefined;
}

/* ----------------------
   Utility helpers
   ---------------------- */
function calculateConfidence(entities: ExtractedEntities, matched_patterns: string[]): number {
  // base score from number of entity groups found
  const possibleGroups = ['graduationYear', 'location', 'degree', 'branch', 'skills', 'services', 'turnoverRequirement'];
  let found = 0;
  for (const g of possibleGroups) {
    if ((entities as any)[g]) found++;
  }
  // weighted: at least 1 strong match -> 0.6, 2 -> 0.75, 3+ -> 0.9
  let score = 0.0;
  if (found === 0) score = 0.0;
  else if (found === 1) score = 0.6;
  else if (found === 2) score = 0.75;
  else score = Math.min(0.95, 0.75 + (found - 2) * 0.1);

  // if 'year' found increase slightly
  if (matched_patterns.includes('year')) score = Math.min(1, score + 0.05);
  // if only vague matches (services/skills only) lower a bit
  if (found === 1 && (matched_patterns.includes('skills') || matched_patterns.includes('services'))) score -= 0.05;

  return Math.max(0, Math.min(1, +score.toFixed(2)));
}

function dedupe(arr: string[]) {
  return Array.from(new Set(arr));
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function capEach(s: string) {
  return s.split(' ').map(cap).join(' ');
}

/* Export default helpers for other services (intent classifier / hybrid extractor) */
export default {
  extractWithRegex,
  extractYears,
  extractCity,
  extractDegree,
  extractBranch,
  extractSkillsAndServices,
  extractTurnover,
};