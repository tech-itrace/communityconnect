import { parseQuery } from '../services/llmService';

describe('LLM Prompt - Query Parsing', () => {
  beforeAll(() => {
    // Use mock mode for tests
    process.env.MOCK_LLM = 'true';
  });

  test('parses find_member query with year and location', async () => {
    const result = await parseQuery('Find 1995 batch mechanical engineers in Chennai');
    expect(result.intent).toBe('find_member');
    expect(result.entities.graduationYear).toContain(1995);
    expect(result.entities.location).toBe('Chennai');
    expect(result.confidence).toBeGreaterThan(0.7);
  });

  test('parses skills-based query', async () => {
    const result = await parseQuery('I need a web developer');
    expect(result.intent).toBe('find_member');
    expect(result.entities.skills).toBeDefined();
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  test('parses location-based query', async () => {
    const result = await parseQuery('Find members in Bangalore');
    expect(result.intent).toBe('find_member');
    expect(result.entities.location).toBe('Bangalore');
  });

  test('normalizes two-digit year', async () => {
    const result = await parseQuery('1995 batch');
    expect(result.entities.graduationYear).toContain(1995);
  });

  test('returns confidence score', async () => {
    const result = await parseQuery('Find someone');
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  test('includes search query for semantic search', async () => {
    const result = await parseQuery('mechanical engineers in Chennai');
    expect(result.searchQuery).toBeDefined();
    expect(result.searchQuery.length).toBeGreaterThan(0);
  });
});

// function normalizeEntities(entities: any): ExtractedEntities {
//   const normalized: ExtractedEntities = {};

//   if (entities.skills && Array.isArray(entities.skills)) {
//     normalized.skills = entities.skills;
//   }

//   if (entities.location) {
//     normalized.location = normalizeCity(entities.location) || entities.location;
//   }

//   if (entities.services && Array.isArray(entities.services)) {
//     normalized.services = entities.services;
//   }

//   if (entities.turnover_requirement) {
//     normalized.turnoverRequirement = entities.turnover_requirement as any;
//   }

//   if (entities.graduation_year && Array.isArray(entities.graduation_year)) {
//     normalized.graduationYear = entities.graduation_year
//       .map((y: any) => normalizeYear(String(y)))
//       .filter((year): year is number => year !== null);
//   }

//   if (entities.degree) {
//     normalized.degree = normalizeDegree(entities.degree) || entities.degree;
//   }

//   return normalized;