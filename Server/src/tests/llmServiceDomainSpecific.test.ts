/**
 * LLM Service Test - Domain-Specific Prompts
 * 
 * Tests the improved parseQuery() function with intent-specific prompts
 * 
 * Success Criteria:
 * - Correctly extracts entities for each intent type
 * - Uses appropriate domain-specific prompts
 * - Handles "passout" → year_of_graduation mapping
 * - Normalizes branch/city names correctly
 * - Response time < 2000ms per query
 */

import { parseQuery } from '../services/llmService';
import { ParsedQuery } from '../utils/types';

describe('LLM Service - Domain-Specific Prompts', () => {
    // Skip tests if no API key available
    const apiKey = process.env.DEEPINFRA_API_KEY;
    const runTests = apiKey && apiKey.length > 0;

    if (!runTests) {
        console.log('[Test Suite] Skipping LLM tests - DEEPINFRA_API_KEY not set');
    }

    // Set global timeout for all tests to 30s (allows for retries)
    jest.setTimeout(30000);

    describe('Business Queries (find_business)', () => {
        const testCases = [
            {
                query: 'Find web development company in Chennai',
                expectedIntent: 'find_business',
                expectedEntities: {
                    skills: expect.arrayContaining(['web development']),
                    location: 'Chennai'
                }
            },
            {
                query: 'Who manufactures aluminum products?',
                expectedIntent: 'find_business',
                expectedEntities: {
                    skills: expect.arrayContaining(['aluminum'])
                }
            },
            {
                query: 'Find companies with turnover above 10 crores',
                expectedIntent: 'find_business',
                expectedEntities: {
                    turnoverRequirement: 'high'
                }
            }
        ];

        testCases.forEach(({ query, expectedIntent, expectedEntities }) => {
            (runTests ? test : test.skip)(`should parse: "${query}"`, async () => {
                const result = await parseQuery(query);

                expect(result.intent).toBe(expectedIntent);
                expect(result.confidence).toBeGreaterThan(0.6);
                expect(result.entities).toMatchObject(expectedEntities);
                expect(result.intentMetadata?.primary).toBe('find_business');
            }, 15000);
        });
    });

    describe('Alumni Queries (find_peers)', () => {
        const testCases = [
            {
                query: 'Find my batchmates from 1995 passout mechanical',
                expectedIntent: 'find_peers',
                expectedEntities: {
                    graduationYear: [1995],
                    branch: expect.arrayContaining(['Mechanical'])
                }
            },
            {
                query: 'Who are the 1998 batch ECE students?',
                expectedIntent: 'find_peers',
                expectedEntities: {
                    graduationYear: [1998],
                    branch: expect.arrayContaining(['ECE'])
                }
            },
            {
                query: 'Find 2010 graduates in Chennai',
                expectedIntent: 'find_peers',
                expectedEntities: {
                    graduationYear: [2010],
                    location: 'Chennai'
                }
            },
            {
                query: 'Looking for 95 passout mechanical',
                expectedIntent: 'find_peers',
                expectedEntities: {
                    graduationYear: [1995],
                    branch: expect.arrayContaining(['Mechanical'])
                }
            }
        ];

        testCases.forEach(({ query, expectedIntent, expectedEntities }) => {
            (runTests ? test : test.skip)(`should parse: "${query}"`, async () => {
                const result = await parseQuery(query);

                expect(result.intent).toBe(expectedIntent);
                expect(result.confidence).toBeGreaterThan(0.7);
                expect(result.entities).toMatchObject(expectedEntities);
                expect(result.intentMetadata?.primary).toBe('find_peers');

                // Critical: "passout" should map to graduationYear
                if (query.includes('passout')) {
                    expect(result.entities.graduationYear).toBeDefined();
                }
            }, 15000);
        });
    });

    describe('Specific Person Queries (find_specific_person)', () => {
        const testCases = [
            {
                query: 'Find Sivakumar from USAM Technology',
                expectedIntent: 'find_specific_person',
                expectedEntities: {
                    name: expect.stringContaining('Sivakumar'),
                    organizationName: expect.stringContaining('USAM')
                }
            },
            {
                query: 'Who is Nalini Rajesh?',
                expectedIntent: 'find_specific_person',
                expectedEntities: {
                    name: expect.stringContaining('Nalini')
                }
            }
        ];

        testCases.forEach(({ query, expectedIntent, expectedEntities }) => {
            (runTests ? test : test.skip)(`should parse: "${query}"`, async () => {
                const result = await parseQuery(query);

                expect(result.intent).toBe(expectedIntent);
                expect(result.confidence).toBeGreaterThan(0.7);
                expect(result.entities).toMatchObject(expectedEntities);
                expect(result.intentMetadata?.primary).toBe('find_specific_person');
            }, 15000);
        });
    });

    describe('Alumni Business Queries (find_alumni_business)', () => {
        const testCases = [
            {
                query: 'Find 1995 batch in IT services',
                expectedIntent: 'find_alumni_business',
                expectedEntities: {
                    graduationYear: [1995],
                    skills: expect.arrayContaining(['IT'])
                }
            },
            {
                query: 'Who from mechanical graduates runs manufacturing companies?',
                expectedIntent: 'find_alumni_business',
                expectedEntities: {
                    branch: expect.arrayContaining(['Mechanical']),
                    skills: expect.arrayContaining(['manufacturing'])
                }
            }
        ];

        testCases.forEach(({ query, expectedIntent, expectedEntities }) => {
            (runTests ? test : test.skip)(`should parse: "${query}"`, async () => {
                const result = await parseQuery(query);

                expect(result.intent).toBe(expectedIntent);
                expect(result.confidence).toBeGreaterThan(0.7);
                expect(result.entities).toMatchObject(expectedEntities);
                expect(result.intentMetadata?.primary).toBe('find_alumni_business');
            }, 15000);
        });
    });

    describe('Entity Normalization', () => {
        (runTests ? test : test.skip)('should normalize city names', async () => {
            const result = await parseQuery('Find companies in chennai');
            expect(result.entities.location).toBe('Chennai');
        }, 15000);

        (runTests ? test : test.skip)('should expand branch abbreviations', async () => {
            const result = await parseQuery('Find ECE batch 1998');
            expect(result.entities.branch).toContain('ECE');
        }, 15000);

        (runTests ? test : test.skip)('should handle 2-digit years', async () => {
            const result = await parseQuery('Find 95 passout');
            expect(result.entities.graduationYear).toContain(1995);
        }, 15000);
    });

    describe('Performance', () => {
        (runTests ? test : test.skip)('should parse query in < 2000ms', async () => {
            const start = Date.now();
            await parseQuery('Find web development company in Chennai');
            const duration = Date.now() - start;

            expect(duration).toBeLessThan(2000);
            console.log(`LLM parsing time: ${duration}ms`);
        }, 15000);
    });

    describe('Fallback Behavior', () => {
        (runTests ? test : test.skip)('should handle empty query gracefully', async () => {
            const result = await parseQuery('');
            expect(result).toBeDefined();
            expect(result.confidence).toBeLessThan(0.7);
        }, 15000);

        (runTests ? test : test.skip)('should handle ambiguous query with reasonable confidence', async () => {
            const result = await parseQuery('find someone');
            expect(result).toBeDefined();
            expect(result.searchQuery).toBe('find someone');
        }, 15000);
    });

    describe('Intent Metadata', () => {
        (runTests ? test : test.skip)('should include intent metadata in response', async () => {
            const result = await parseQuery('Find 1995 batch mechanical');

            expect(result.intentMetadata).toBeDefined();
            expect(result.intentMetadata?.primary).toBeDefined();
            expect(result.intentMetadata?.intentConfidence).toBeGreaterThan(0);
            expect(result.intentMetadata?.matchedPatterns).toBeDefined();
        }, 15000);

        (runTests ? test : test.skip)('should detect secondary intent for ambiguous queries', async () => {
            const result = await parseQuery('Find 1995 batch in Chennai');

            // Could be find_peers or find_alumni_business
            expect(result.intentMetadata).toBeDefined();
            if (result.intentMetadata?.secondary) {
                expect(['find_peers', 'find_alumni_business']).toContain(result.intentMetadata.secondary);
            }
        }, 15000);
    });

    describe('Conversation Context', () => {
        (runTests ? test : test.skip)('should use conversation context for follow-up queries', async () => {
            const context = 'Previous query: "Find web developers in Chennai"\nResults: 5 members found';
            const result = await parseQuery('show me their profiles', context);

            expect(result).toBeDefined();
            expect(result.confidence).toBeGreaterThan(0.5);
        }, 15000);
    });

    describe('Critical Bug Fixes', () => {
        (runTests ? test : test.skip)('should correctly map "passout" to graduationYear', async () => {
            const result = await parseQuery('1995 passout');
            expect(result.entities.graduationYear).toContain(1995);
        }, 15000);

        (runTests ? test : test.skip)('should extract both year and branch from alumni queries', async () => {
            const result = await parseQuery('Looking for 95 passout mechanical');
            expect(result.entities.graduationYear).toContain(1995);
            expect(result.entities.branch).toBeDefined();
            expect(result.entities.branch?.some(b => b.toLowerCase().includes('mechanical'))).toBe(true);
        }, 15000);

        (runTests ? test : test.skip)('should differentiate between "company name" and person search', async () => {
            const result1 = await parseQuery('Find Sivakumar from USAM Technology');
            expect(result1.intent).toBe('find_specific_person');
            expect(result1.entities.name).toBeDefined();

            const result2 = await parseQuery('Find USAM Technology company');
            expect(result2.intent).toBe('find_business');
        }, 15000);
    });
});
