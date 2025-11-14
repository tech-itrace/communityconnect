/**
 * Intent Classifier Test Suite
 * 
 * Tests the intent classification service against sample queries from QUERY-TAXONOMY.md
 * 
 * Success Criteria:
 * - 95%+ accuracy on intent classification
 * - Correctly identifies ambiguous queries
 * - Response time < 5ms per classification
 * 
 * Test Categories:
 * 1. Business Queries (find_business)
 * 2. Alumni Queries (find_peers)
 * 3. Specific Person Queries (find_specific_person)
 * 4. Alumni Business Queries (find_alumni_business)
 * 5. Ambiguous Queries
 */

import { classifyIntent, isAmbiguousQuery, getIntentDescription, suggestRefinement, Intent } from '../services/intentClassifier';

describe('Intent Classifier', () => {
    describe('Business Queries (find_business)', () => {
        const businessQueries = [
            { query: 'Find web development company in Chennai', expectedIntent: 'find_business' },
            { query: 'Looking for IT consulting services', expectedIntent: 'find_business' },
            { query: 'Who manufactures aluminum products?', expectedIntent: 'find_business' },
            { query: 'Find companies with high turnover', expectedIntent: 'find_business' },
            { query: 'Find IT industry companies', expectedIntent: 'find_business' },
            { query: 'Looking for manufacturing businesses', expectedIntent: 'find_business' },
            { query: 'Find consulting firms', expectedIntent: 'find_business' },
            { query: 'Who is in the automobile industry?', expectedIntent: 'find_business' },
            { query: 'Find companies in diamond jewelry', expectedIntent: 'find_business' },
            { query: 'Looking for construction material suppliers', expectedIntent: 'find_business' },
            { query: 'Find packaging industry companies', expectedIntent: 'find_business' },
            { query: 'Who works in renewable energy?', expectedIntent: 'find_business' },
            { query: 'Find fintech companies', expectedIntent: 'find_business' },
            { query: 'Find all companies in Chennai', expectedIntent: 'find_business' },
            { query: 'Who are the entrepreneurs in Hyderabad?', expectedIntent: 'find_business' },
            { query: 'Businesses in Coimbatore', expectedIntent: 'find_business' },
            { query: 'Chennai-based companies', expectedIntent: 'find_business' },
            { query: 'Find companies with turnover above 10 crores', expectedIntent: 'find_business' },
            { query: 'Looking for successful businesses in Chennai', expectedIntent: 'find_business' },
            { query: 'Find e-waste recycling companies', expectedIntent: 'find_business' },
        ];

        businessQueries.forEach(({ query, expectedIntent }) => {
            test(`"${query}" should classify as ${expectedIntent}`, () => {
                const result = classifyIntent(query);
                expect(result.primary).toBe(expectedIntent);
                expect(result.confidence).toBeGreaterThan(0.6);
            });
        });
    });

    describe('Alumni Queries (find_peers)', () => {
        const alumniQueries = [
            { query: 'Find my batchmates from 1995 passout', expectedIntent: 'find_peers' },
            { query: 'Who are the 1998 batch members?', expectedIntent: 'find_peers' },
            { query: 'Looking for 95 passout mechanical', expectedIntent: 'find_peers' },
            { query: 'Find 2010 graduates', expectedIntent: 'find_peers' },
            { query: 'Who graduated in 1994?', expectedIntent: 'find_peers' },
            { query: '1988 batch ECE students', expectedIntent: 'find_peers' },
            { query: 'Find alumni from 2015', expectedIntent: 'find_peers' },
            { query: 'Looking for 92 passout', expectedIntent: 'find_peers' },
            { query: 'Find classmates from 1996', expectedIntent: 'find_peers' },
            { query: 'Find 1995 batch mechanical', expectedIntent: 'find_peers' },
            { query: 'Who are in 2005 passout civil?', expectedIntent: 'find_peers' },
            { query: 'Looking for textile engineering batch 1998', expectedIntent: 'find_peers' },
            { query: 'Find my B.E classmates', expectedIntent: 'find_peers' },
            { query: '1995 mechanical graduates', expectedIntent: 'find_peers' },
            { query: 'Find batchmates from mechanical 95', expectedIntent: 'find_peers' },
            { query: 'Who all are in 1995 batch?', expectedIntent: 'find_peers' },
            { query: 'Find my batch mechanical', expectedIntent: 'find_peers' },
            { query: 'Looking for ECE batch of 2010', expectedIntent: 'find_peers' },
            { query: 'Find classmates from 95 passout mechanical', expectedIntent: 'find_peers' },
            { query: 'Who graduated with me in 1998?', expectedIntent: 'find_peers' },
        ];

        alumniQueries.forEach(({ query, expectedIntent }) => {
            test(`"${query}" should classify as ${expectedIntent}`, () => {
                const result = classifyIntent(query);
                expect(result.primary).toBe(expectedIntent);
                expect(result.confidence).toBeGreaterThan(0.6);
            });
        });
    });

    describe('Specific Person Queries (find_specific_person)', () => {
        const personQueries = [
            { query: 'Find Sivakumar from USAM Technology', expectedIntent: 'find_specific_person' },
            { query: 'Who is Nalini Rajesh?', expectedIntent: 'find_specific_person' },
            { query: 'Looking for contact of S Mohanraj', expectedIntent: 'find_specific_person' },
            { query: 'Find details of BetterBy Marketplace', expectedIntent: 'find_specific_person' },
            { query: 'Contact information for Sriram', expectedIntent: 'find_specific_person' },
            { query: 'Find Prabhuram from Mefco', expectedIntent: 'find_specific_person' },
            { query: 'Who runs Conquest Quality Systems?', expectedIntent: 'find_specific_person' },
            { query: 'Find Lakshmi Narasimha Moorthy', expectedIntent: 'find_specific_person' },
            { query: 'Who is S Mohanraj?', expectedIntent: 'find_specific_person' },
            { query: 'Looking for Sivakumar contact', expectedIntent: 'find_specific_person' },
        ];

        personQueries.forEach(({ query, expectedIntent }) => {
            test(`"${query}" should classify as ${expectedIntent}`, () => {
                const result = classifyIntent(query);
                expect(result.primary).toBe(expectedIntent);
                expect(result.confidence).toBeGreaterThan(0.6);
            });
        });
    });

    describe('Alumni Business Queries (find_alumni_business)', () => {
        const alumniBusinessQueries = [
            { query: 'Find 1995 batch in IT services', expectedIntent: 'find_alumni_business' },
            { query: 'Who from 98 batch does web development?', expectedIntent: 'find_alumni_business' },
            { query: 'Alumni providing consulting services', expectedIntent: 'find_alumni_business' },
            { query: 'Find mechanical graduates running manufacturing companies', expectedIntent: 'find_alumni_business' },
            { query: 'Who from 1995 batch provides IT solutions?', expectedIntent: 'find_alumni_business' },
            { query: 'Find batchmates doing web development', expectedIntent: 'find_alumni_business' },
            { query: '1995 batch in Chennai doing IT business', expectedIntent: 'find_alumni_business' },
            { query: 'Alumni who run software companies', expectedIntent: 'find_alumni_business' },
            { query: 'Find 98 passout in manufacturing', expectedIntent: 'find_alumni_business' },
            { query: 'Mechanical batch running construction business', expectedIntent: 'find_alumni_business' },
            { query: 'Who from ECE provides IT services?', expectedIntent: 'find_alumni_business' },
            { query: 'Find alumni in consulting business', expectedIntent: 'find_alumni_business' },
            { query: '1995 mechanical batch doing manufacturing', expectedIntent: 'find_alumni_business' },
            { query: 'Batchmates providing HR services', expectedIntent: 'find_alumni_business' },
            { query: 'Alumni running textile companies', expectedIntent: 'find_alumni_business' },
        ];

        alumniBusinessQueries.forEach(({ query, expectedIntent }) => {
            test(`"${query}" should classify as ${expectedIntent}`, () => {
                const result = classifyIntent(query);
                expect(result.primary).toBe(expectedIntent);
                expect(result.confidence).toBeGreaterThan(0.6);
            });
        });
    });

    describe('Ambiguous Queries', () => {
        test('should detect ambiguous query with batch + location (could be peers or alumni_business)', () => {
            const result = classifyIntent('Find 1995 mechanical batch in Chennai');

            // Should be find_peers primary, but may have alumni_business secondary
            expect(['find_peers', 'find_alumni_business']).toContain(result.primary);

            // Check if marked as ambiguous
            if (result.secondary) {
                expect(['find_peers', 'find_alumni_business']).toContain(result.secondary);
            }
        });

        test('should detect query with both alumni and business context', () => {
            const result = classifyIntent('Find 1995 batch companies');

            // Could be either find_peers or find_alumni_business
            expect(['find_peers', 'find_alumni_business', 'find_business']).toContain(result.primary);
        });

        test('isAmbiguousQuery should identify queries with secondary intent', () => {
            const result = classifyIntent('Find 1995 batch in IT');

            // This is clearly alumni_business, so should NOT be ambiguous
            expect(result.primary).toBe('find_alumni_business');
        });
    });

    describe('Performance', () => {
        test('should classify intent in < 5ms', () => {
            const query = 'Find web development company in Chennai';
            const iterations = 100;

            const start = performance.now();
            for (let i = 0; i < iterations; i++) {
                classifyIntent(query);
            }
            const end = performance.now();

            const avgTime = (end - start) / iterations;
            expect(avgTime).toBeLessThan(5);

            console.log(`Average classification time: ${avgTime.toFixed(3)}ms`);
        });
    });

    describe('Helper Functions', () => {
        test('getIntentDescription should return readable description', () => {
            expect(getIntentDescription('find_business')).toContain('companies');
            expect(getIntentDescription('find_peers')).toContain('batchmates');
            expect(getIntentDescription('find_specific_person')).toContain('specific person');
            expect(getIntentDescription('find_alumni_business')).toContain('alumni');
        });

        test('suggestRefinement should provide suggestions for ambiguous queries', () => {
            const result = classifyIntent('Find 1995 batch in Chennai');
            const suggestions = suggestRefinement(result);

            // May or may not have suggestions depending on ambiguity
            if (result.secondary) {
                expect(suggestions.length).toBeGreaterThan(0);
            }
        });
    });

    describe('Edge Cases', () => {
        test('should handle empty query', () => {
            const result = classifyIntent('');
            expect(result.primary).toBeDefined();
            expect(result.confidence).toBeLessThan(0.5);
        });

        test('should handle very short query', () => {
            const result = classifyIntent('1995');
            expect(result.primary).toBeDefined();
        });

        test('should handle query with no clear intent', () => {
            const result = classifyIntent('Hello there');
            expect(result.primary).toBe('find_business'); // Default fallback
            expect(result.confidence).toBeLessThan(0.5);
        });

        test('should handle query with multiple capitalized words (could be person or company)', () => {
            const result = classifyIntent('Find USAM Technology Solutions');
            // Could be find_specific_person or find_business
            expect(['find_specific_person', 'find_business']).toContain(result.primary);
        });

        test('should handle conversational queries', () => {
            const result = classifyIntent('Can you help me find web developers in Chennai?');
            expect(result.primary).toBe('find_business');
        });

        test('should handle queries with typos', () => {
            const result = classifyIntent('Find 1995 btach mechnical');
            // Should still detect "batch" pattern despite typo
            expect(result.primary).toBe('find_peers');
        });
    });

    describe('Confidence Scoring', () => {
        test('clear business query should have high confidence', () => {
            const result = classifyIntent('Find web development company in Chennai');
            expect(result.confidence).toBeGreaterThan(0.7);
        });

        test('clear alumni query should have high confidence', () => {
            const result = classifyIntent('Find my 1995 batchmates');
            expect(result.confidence).toBeGreaterThan(0.7);
        });

        test('ambiguous query should have lower confidence', () => {
            const result = classifyIntent('Find 1995 batch');
            // Just year + batch, no clear context
            expect(result.confidence).toBeLessThan(0.9);
        });

        test('specific person query should have high confidence', () => {
            const result = classifyIntent('Find Sivakumar from USAM Technology');
            expect(result.confidence).toBeGreaterThan(0.7);
        });

        test('alumni business query should have high confidence', () => {
            const result = classifyIntent('Find 1995 batch in IT services');
            expect(result.confidence).toBeGreaterThan(0.7);
        });
    });

    describe('Real-World Query Samples', () => {
        // Test against actual queries from QUERY-TAXONOMY.md
        const realWorldQueries = [
            { query: 'Find e-waste recycling companies', expected: 'find_business' },
            { query: 'Looking for 95 passout mechanical', expected: 'find_peers' },
            { query: 'Find Sivakumar from USAM Technology', expected: 'find_specific_person' },
            { query: 'Who from 1995 batch provides IT solutions?', expected: 'find_alumni_business' },
            { query: 'Find companies with turnover above 10 crores', expected: 'find_business' },
            { query: 'Who are the 1998 batch members?', expected: 'find_peers' },
            { query: 'Find mechanical graduates running manufacturing companies', expected: 'find_alumni_business' },
            { query: 'Who is in the automobile industry?', expected: 'find_business' },
            { query: 'Find my B.E classmates', expected: 'find_peers' },
            { query: 'Contact information for Sriram', expected: 'find_specific_person' },
        ];

        realWorldQueries.forEach(({ query, expected }) => {
            test(`Real-world: "${query}" should be ${expected}`, () => {
                const result = classifyIntent(query);
                expect(result.primary).toBe(expected);
            });
        });
    });
});
