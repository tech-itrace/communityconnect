/**
 * Test Suite: nlSearchService Integration (Task 2.4)
 * 
 * Tests the integration of hybrid extractor into nlSearchService.
 * Validates end-to-end query processing with performance tracking.
 * 
 * Test Categories:
 * 1. Simple queries (should use regex, <150ms)
 * 2. Complex queries (may use LLM, <3s)
 * 3. Performance metrics tracking
 * 4. Intent-based filter optimization
 * 5. Error handling
 * 
 * Reference: TODO_queryOptimisation.md (Task 2.4)
 */

import { processNaturalLanguageQuery } from '../services/nlSearchService';
import { NLSearchResult } from '../utils/types';

// Skip tests if no database connection
const SKIP_DB_TESTS = !process.env.DATABASE_URL;
const SKIP_LLM_TESTS = !process.env.DEEPINFRA_API_KEY;

describe('nlSearchService Integration - Task 2.4', () => {

    // ============================================================================
    // SIMPLE QUERIES (Regex Path, Fast)
    // ============================================================================

    describe('Simple Queries (Regex-Only Path)', () => {

        const testIf = SKIP_DB_TESTS ? test.skip : test;

        testIf('should process simple year+branch query quickly', async () => {
            const query = 'Find 1995 mechanical engineers';

            const result = await processNaturalLanguageQuery(query);

            // Validate result structure
            expect(result).toBeDefined();
            expect(result.understanding).toBeDefined();
            expect(result.results).toBeDefined();
            expect(result.executionTime).toBeGreaterThan(0);

            // Validate performance
            if (result.performance) {
                expect(result.performance.extractionMethod).toBe('regex');
                expect(result.performance.llmUsed).toBe(false);
                expect(result.performance.extractionTime).toBeLessThan(100); // Fast extraction
                expect(result.executionTime).toBeLessThan(1000); // Total under 1s
            }

            // Validate extraction
            expect(result.understanding.entities.graduationYear).toContain(1995);
            expect(result.understanding.entities.branch).toBeDefined();
        }, 10000);

        testIf('should process location+service query quickly', async () => {
            const query = 'Find web development companies in Chennai';

            const result = await processNaturalLanguageQuery(query);

            expect(result.understanding.intent).toMatch(/find_business|find_alumni_business/);
            expect(result.understanding.entities.location).toBe('Chennai');

            if (result.performance) {
                expect(result.performance.extractionMethod).toBe('regex');
                expect(result.performance.extractionTime).toBeLessThan(100);
            }
        }, 10000);

        testIf('should process entrepreneur query quickly', async () => {
            const query = 'Show me 1995 civil batch entrepreneurs';

            const result = await processNaturalLanguageQuery(query);

            expect(result.understanding.entities.graduationYear).toContain(1995);
            expect(result.understanding.entities.branch).toContain('Civil');

            if (result.performance) {
                expect(result.performance.extractionMethod).toBe('regex');
            }
        }, 10000);
    });

    // ============================================================================
    // COMPLEX QUERIES (May Use LLM)
    // ============================================================================

    describe('Complex Queries (LLM Fallback Path)', () => {

        const testIf = SKIP_DB_TESTS || SKIP_LLM_TESTS ? test.skip : test;

        testIf('should handle complex multi-clause query', async () => {
            const query = 'Find mechanical engineers from 1995 who are entrepreneurs in Chennai';

            const result = await processNaturalLanguageQuery(query);

            expect(result.understanding.entities.graduationYear).toContain(1995);
            expect(result.understanding.entities.branch).toBeDefined();
            expect(result.understanding.entities.location).toBe('Chennai');

            if (result.performance) {
                // May use hybrid or LLM
                expect(['hybrid', 'llm', 'regex']).toContain(result.performance.extractionMethod);
            }
        }, 15000);

        testIf('should handle ambiguous service query', async () => {
            const query = 'Who can help with digital transformation?';

            const result = await processNaturalLanguageQuery(query);

            expect(result.understanding.intent).toBeDefined();

            if (result.performance?.llmUsed) {
                expect(result.performance.extractionTime).toBeLessThan(10000); // LLM timeout
            }
        }, 15000);
    });

    // ============================================================================
    // PERFORMANCE TRACKING
    // ============================================================================

    describe('Performance Metrics', () => {

        const testIf = SKIP_DB_TESTS ? test.skip : test;

        testIf('should track extraction performance', async () => {
            const query = 'Find 1995 mechanical engineers';

            const result = await processNaturalLanguageQuery(query);

            expect(result.performance).toBeDefined();
            expect(result.performance?.extractionTime).toBeGreaterThan(0);
            expect(result.performance?.extractionMethod).toMatch(/regex|llm|hybrid|cached/);
            expect(typeof result.performance?.llmUsed).toBe('boolean');
            expect(result.performance?.searchTime).toBeGreaterThan(0);
        }, 10000);

        testIf('should track total execution time', async () => {
            const query = 'Find IT companies in Bangalore';

            const result = await processNaturalLanguageQuery(query);

            expect(result.executionTime).toBeGreaterThan(0);

            if (result.performance) {
                // Extraction + search should equal total (roughly)
                const tracked = result.performance.extractionTime + result.performance.searchTime;
                expect(Math.abs(tracked - result.executionTime)).toBeLessThan(100); // Allow 100ms variance
            }
        }, 10000);

        testIf('should log performance breakdown', async () => {
            const query = 'Find MBA graduates in Chennai';

            const consoleSpy = jest.spyOn(console, 'log');

            const result = await processNaturalLanguageQuery(query);

            // Check that performance logs were written
            const perfLogs = consoleSpy.mock.calls.filter(call =>
                call[0]?.includes('Performance:') || call[0]?.includes('Extraction time:')
            );

            expect(perfLogs.length).toBeGreaterThan(0);

            consoleSpy.mockRestore();
        }, 10000);
    });

    // ============================================================================
    // INTENT-BASED OPTIMIZATION
    // ============================================================================

    describe('Intent-Based Filter Optimization', () => {

        const testIf = SKIP_DB_TESTS ? test.skip : test;

        testIf('should classify business intent correctly', async () => {
            const query = 'Find web development companies';

            const result = await processNaturalLanguageQuery(query);

            expect(result.understanding.intent).toBe('find_business');
            expect(result.understanding.intentMetadata).toBeDefined();
            expect(result.understanding.intentMetadata?.primary).toBe('find_business');
        }, 10000);

        testIf('should classify alumni intent correctly', async () => {
            const query = 'Find 1995 mechanical batch alumni';

            const result = await processNaturalLanguageQuery(query);

            expect(result.understanding.intent).toBe('find_peers');
            expect(result.understanding.intentMetadata?.primary).toBe('find_peers');
        }, 10000);

        testIf('should pass intent to filter conversion', async () => {
            const query = 'Find 1995 batch entrepreneurs';

            const result = await processNaturalLanguageQuery(query);

            // Should classify as alumni_business or peers
            expect(result.understanding.intent).toMatch(/find_alumni_business|find_peers|find_business/);
            expect(result.understanding.entities.graduationYear).toContain(1995);
        }, 10000);
    });

    // ============================================================================
    // RESPONSE STRUCTURE
    // ============================================================================

    describe('Response Structure Validation', () => {

        const testIf = SKIP_DB_TESTS ? test.skip : test;

        testIf('should return complete NLSearchResult', async () => {
            const query = 'Find IT services in Chennai';

            const result = await processNaturalLanguageQuery(query);

            // Validate understanding section
            expect(result.understanding).toBeDefined();
            expect(result.understanding.intent).toBeDefined();
            expect(result.understanding.entities).toBeDefined();
            expect(result.understanding.confidence).toBeGreaterThanOrEqual(0);
            expect(result.understanding.normalizedQuery).toBeDefined();

            // Validate results section
            expect(result.results).toBeDefined();
            expect(Array.isArray(result.results.members)).toBe(true);
            expect(result.results.pagination).toBeDefined();
            expect(result.results.pagination.totalResults).toBeGreaterThanOrEqual(0);

            // Validate response section
            expect(result.response).toBeDefined();
            expect(result.response?.conversational).toBeDefined();
            expect(Array.isArray(result.response?.suggestions)).toBe(true);

            // Validate performance section
            expect(result.performance).toBeDefined();
        }, 10000);

        testIf('should include intent metadata', async () => {
            const query = 'Find 1995 mechanical engineers';

            const result = await processNaturalLanguageQuery(query);

            expect(result.understanding.intentMetadata).toBeDefined();
            expect(result.understanding.intentMetadata?.primary).toBeDefined();
            expect(result.understanding.intentMetadata?.intentConfidence).toBeGreaterThan(0);
            expect(Array.isArray(result.understanding.intentMetadata?.matchedPatterns)).toBe(true);
        }, 10000);
    });

    // ============================================================================
    // ERROR HANDLING
    // ============================================================================

    describe('Error Handling', () => {

        test('should handle empty query gracefully', async () => {
            const query = '';

            const result = await processNaturalLanguageQuery(query);

            expect(result).toBeDefined();
            expect(result.understanding).toBeDefined();
            expect(result.results).toBeDefined();
        });

        test('should handle special characters', async () => {
            const query = 'Find @1995 #mechanical engineers!';

            const result = await processNaturalLanguageQuery(query);

            expect(result).toBeDefined();
            if (result.understanding.entities.graduationYear) {
                expect(result.understanding.entities.graduationYear).toContain(1995);
            }
        });

        test('should return error result on exception', async () => {
            // This will likely fail if no DB connection
            if (SKIP_DB_TESTS) {
                return; // Skip if no DB
            }

            const query = 'Test query';

            const result = await processNaturalLanguageQuery(query);

            expect(result).toBeDefined();
            expect(result.executionTime).toBeGreaterThan(0);
        });
    });

    // ============================================================================
    // CONVERSATION CONTEXT
    // ============================================================================

    describe('Conversation Context', () => {

        const testIf = SKIP_DB_TESTS ? test.skip : test;

        testIf('should accept conversation context', async () => {
            const query = 'Find IT companies';
            const context = 'Previous query was about Chennai location';

            const result = await processNaturalLanguageQuery(query, 10, context);

            expect(result).toBeDefined();
            expect(result.understanding).toBeDefined();
        }, 10000);

        testIf('should work without conversation context', async () => {
            const query = 'Find 1995 mechanical engineers';

            const result = await processNaturalLanguageQuery(query, 10);

            expect(result).toBeDefined();
            expect(result.understanding.entities.graduationYear).toContain(1995);
        }, 10000);
    });

    // ============================================================================
    // REAL-WORLD SCENARIOS
    // ============================================================================

    describe('Real-World Query Scenarios', () => {

        const testIf = SKIP_DB_TESTS ? test.skip : test;

        testIf('Scenario 1: Simple alumni lookup', async () => {
            const query = 'Show me 1995 mechanical batch';

            const result = await processNaturalLanguageQuery(query);

            expect(result.understanding.entities.graduationYear).toContain(1995);
            expect(result.understanding.entities.branch).toContain('Mechanical');

            if (result.performance) {
                expect(result.performance.extractionMethod).toBe('regex');
                expect(result.executionTime).toBeLessThan(1000); // Fast
            }
        }, 10000);

        testIf('Scenario 2: Business service search', async () => {
            const query = 'Find IT consulting services in Bangalore';

            const result = await processNaturalLanguageQuery(query);

            expect(result.understanding.intent).toMatch(/find_business|find_alumni_business/);
            expect(result.understanding.entities.location).toBe('Bangalore');
            expect(result.understanding.entities.services || result.understanding.entities.skills).toBeDefined();
        }, 10000);

        testIf('Scenario 3: Entrepreneur discovery', async () => {
            const query = 'List all 1995 civil batch entrepreneurs';

            const result = await processNaturalLanguageQuery(query);

            expect(result.understanding.entities.graduationYear).toContain(1995);
            expect(result.understanding.entities.branch).toContain('Civil');
            expect(result.results.members).toBeDefined();
        }, 10000);
    });

});

// ============================================================================
// TEST SUMMARY
// ============================================================================

describe('Integration Test Summary', () => {
    test('should log test configuration', () => {
        console.log('\n========================================');
        console.log('nlSearchService Integration Test Config');
        console.log('========================================');
        console.log(`Database Available: ${!SKIP_DB_TESTS}`);
        console.log(`API Key Available: ${!SKIP_LLM_TESTS}`);
        console.log(`DB Tests: ${SKIP_DB_TESTS ? 'SKIPPED' : 'ENABLED'}`);
        console.log(`LLM Tests: ${SKIP_LLM_TESTS ? 'SKIPPED' : 'ENABLED'}`);
        console.log('========================================\n');

        expect(true).toBe(true);
    });
});
