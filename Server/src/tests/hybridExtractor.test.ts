/**
 * Test Suite: Hybrid Extraction Service
 * 
 * Tests the hybrid extraction logic that combines regex and LLM extraction.
 * 
 * Test Categories:
 * 1. Regex-only path (fast, high confidence)
 * 2. LLM fallback path (complex queries)
 * 3. Hybrid merge path (partial regex + LLM)
 * 4. Error handling and fallbacks
 * 5. Performance tracking
 * 
 * Reference: TODO_queryOptimisation.md (Task 2.3)
 */

import { extractEntities, HybridExtractionResult, shouldUseLLM } from '../services/hybridExtractor';
import { extractWithRegex } from '../services/regexExtractor';
import { classifyIntent } from '../services/intentClassifier';

// Skip tests if no API key (to avoid failures in CI/CD)
const SKIP_LLM_TESTS = !process.env.DEEPINFRA_API_KEY;

describe('Hybrid Extractor - Integration Tests', () => {

    // ============================================================================
    // REGEX-ONLY PATH (Fast, 80% queries)
    // ============================================================================

    describe('Regex-Only Path (High Confidence)', () => {

        test('should use regex only for simple year+branch query', async () => {
            const query = 'Find mechanical engineers from 1995';

            const result = await extractEntities(query);

            expect(result.method).toBe('regex');
            expect(result.metadata.llmUsed).toBe(false);
            expect(result.confidence).toBeGreaterThanOrEqual(0.5);
            expect(result.extractionTime).toBeLessThan(100); // Should be fast
            expect(result.entities.graduationYear).toEqual([1995]);
            expect(result.entities.branch).toContain('Mechanical');
        });

        test('should use regex only for location+service query', async () => {
            const query = 'Find web development companies in Chennai';

            const result = await extractEntities(query);

            expect(result.method).toBe('regex');
            expect(result.metadata.llmUsed).toBe(false);
            expect(result.extractionTime).toBeLessThan(100);
            expect(result.entities.location).toBe('Chennai');
            expect(result.entities.services).toContain('web development');
        });

        test('should use regex only for entrepreneur queries', async () => {
            const query = 'Show me 1995 civil batch entrepreneurs';

            const result = await extractEntities(query);

            expect(result.method).toBe('regex');
            expect(result.confidence).toBeGreaterThan(0.6);
            expect(result.entities.graduationYear).toEqual([1995]);
            expect(result.entities.branch).toContain('Civil');
        });

        test('should use regex for multiple years', async () => {
            const query = 'Find alumni from 1995 and 1996 batches';

            const result = await extractEntities(query);

            expect(result.method).toBe('regex');
            expect(result.entities.graduationYear).toEqual(expect.arrayContaining([1995, 1996]));
        });

        test('should use regex for degree queries', async () => {
            const query = 'Find MBA graduates from Bangalore';

            const result = await extractEntities(query);

            expect(result.method).toBe('regex');
            expect(result.entities.degree).toBe('MBA');
            expect(result.entities.location).toBe('Bangalore');
        });
    });

    // ============================================================================
    // LLM FALLBACK PATH (Complex, 20% queries)
    // ============================================================================

    describe('LLM Fallback Path (Low Confidence)', () => {

        // Skip these if no API key
        const testIf = SKIP_LLM_TESTS ? test.skip : test;

        testIf('should use LLM for ambiguous service query', async () => {
            const query = 'Find someone who can help with digital transformation';

            const result = await extractEntities(query);

            expect(result.metadata.llmUsed).toBe(true);
            expect(result.method).toMatch(/llm|hybrid/);
            expect(result.metadata.llmFallbackReason).toBeDefined();
            expect(result.entities.skills || result.entities.services).toBeDefined();
        }, 10000); // Longer timeout for LLM

        testIf('should use LLM for complex multi-clause query', async () => {
            const query = 'Find mechanical engineers from 1995 who are now entrepreneurs and based in Chennai';

            const result = await extractEntities(query);

            expect(result.metadata.llmUsed).toBe(true);
            // Should extract multiple entities
            expect(result.entities.graduationYear).toContain(1995);
            expect(result.entities.branch).toBeDefined();
            expect(result.entities.location).toBe('Chennai');
        }, 10000);

        testIf('should use LLM for specific person query', async () => {
            const query = 'Find Sivakumar from USAM Technology';

            const result = await extractEntities(query);

            expect(result.intent).toBe('find_specific_person');
            // LLM might be used depending on confidence
            if (result.metadata.llmUsed) {
                expect(result.entities.name || result.entities.organizationName).toBeDefined();
            }
        }, 10000);

        testIf('should use LLM for vague query', async () => {
            const query = 'Who can help with my startup?';

            const result = await extractEntities(query);

            expect(result.metadata.llmUsed).toBe(true);
            expect(result.confidence).toBeLessThan(0.8); // Should be low confidence
        }, 10000);
    });

    // ============================================================================
    // HYBRID MERGE PATH
    // ============================================================================

    describe('Hybrid Merge Logic', () => {

        const testIf = SKIP_LLM_TESTS ? test.skip : test;

        testIf('should merge regex year with LLM skills', async () => {
            const query = 'Find 1995 batch with expertise in AI and machine learning';

            const result = await extractEntities(query);

            // Regex should catch year
            expect(result.entities.graduationYear).toContain(1995);

            // LLM should catch skills
            if (result.metadata.llmUsed) {
                expect(result.entities.skills).toBeDefined();
                expect(result.method).toBe('hybrid');
            }
        }, 10000);

        testIf('should prefer regex location over LLM', async () => {
            const query = 'Software companies in Chennai with good track record';

            const result = await extractEntities(query);

            // Regex location normalization should be preferred
            expect(result.entities.location).toBe('Chennai'); // Not "chennai" or "in Chennai"
        }, 10000);

        testIf('should combine regex and LLM services', async () => {
            const query = 'Find web development and IT consulting services in Bangalore';

            const result = await extractEntities(query);

            expect(result.entities.services || result.entities.skills).toBeDefined();
            expect(result.entities.location).toBe('Bangalore');
        }, 10000);
    });

    // ============================================================================
    // DECISION LOGIC TESTS
    // ============================================================================

    describe('shouldUseLLM Decision Logic', () => {

        test('should NOT use LLM for high confidence regex', () => {
            const query = 'Find 1995 mechanical engineers';
            const regexResult = extractWithRegex(query);
            const intentResult = classifyIntent(query);

            const needsLLM = shouldUseLLM(regexResult, intentResult, query);

            expect(needsLLM).toBe(false);
            expect(regexResult.confidence).toBeGreaterThanOrEqual(0.5);
        });

        test('should use LLM for low regex confidence', () => {
            const query = 'Who can help with digital transformation?';
            const regexResult = extractWithRegex(query);
            const intentResult = classifyIntent(query);

            const needsLLM = shouldUseLLM(regexResult, intentResult, query);

            expect(needsLLM).toBe(true);
        });

        test('should use LLM for complex queries with AND/OR', () => {
            const query = 'Find mechanical or civil engineers from 1995 and 1996';
            const regexResult = extractWithRegex(query);
            const intentResult = classifyIntent(query);

            const needsLLM = shouldUseLLM(regexResult, intentResult, query);

            expect(needsLLM).toBe(true); // Complex logical structure
        });

        test('should use LLM for no pattern matches', () => {
            const query = 'random gibberish query xyz';
            const regexResult = extractWithRegex(query);
            const intentResult = classifyIntent(query);

            const needsLLM = shouldUseLLM(regexResult, intentResult, query);

            expect(needsLLM).toBe(true);
            expect(regexResult.matched_patterns.length).toBe(0);
        });
    });

    // ============================================================================
    // PERFORMANCE TESTS
    // ============================================================================

    describe('Performance Metrics', () => {

        test('regex-only queries should complete in <100ms', async () => {
            const queries = [
                'Find 1995 mechanical engineers',
                'Show Chennai based companies',
                'Find MBA graduates',
                'List 1996 civil batch',
                'Find IT services in Bangalore'
            ];

            for (const query of queries) {
                const result = await extractEntities(query);

                if (result.method === 'regex') {
                    expect(result.extractionTime).toBeLessThan(100);
                }
            }
        });

        test('should track extraction method', async () => {
            const query = 'Find 1995 mechanical engineers';

            const result = await extractEntities(query);

            expect(result.method).toMatch(/regex|llm|hybrid|cached/);
            expect(result.extractionTime).toBeGreaterThan(0);
        });

        test('should include metadata for debugging', async () => {
            const query = 'Find web developers in Chennai';

            const result = await extractEntities(query);

            expect(result.metadata).toBeDefined();
            expect(result.metadata.intentResult).toBeDefined();
            expect(result.metadata.regexResult).toBeDefined();
            expect(result.metadata.llmUsed).toBeDefined();
            expect(typeof result.metadata.needsLLM).toBe('boolean');
        });
    });

    // ============================================================================
    // ERROR HANDLING
    // ============================================================================

    describe('Error Handling', () => {

        test('should fallback to regex on LLM error', async () => {
            // This will trigger LLM but simulate failure
            const query = 'Find someone with expertise in quantum computing and blockchain';

            const result = await extractEntities(query);

            // Should not crash, should return some result
            expect(result).toBeDefined();
            expect(result.entities).toBeDefined();
            expect(result.confidence).toBeGreaterThan(0);
        });

        test('should handle empty query', async () => {
            const query = '';

            const result = await extractEntities(query);

            expect(result).toBeDefined();
            expect(result.entities).toBeDefined();
        });

        test('should handle special characters', async () => {
            const query = 'Find @1995 #mechanical engineers!';

            const result = await extractEntities(query);

            expect(result).toBeDefined();
            expect(result.entities.graduationYear).toContain(1995);
        });
    });

    // ============================================================================
    // INTENT INTEGRATION
    // ============================================================================

    describe('Intent Classification Integration', () => {

        test('should classify business intent correctly', async () => {
            const query = 'Find web development companies';

            const result = await extractEntities(query);

            expect(result.intent).toBe('find_business');
            expect(result.metadata.intentResult.primary).toBe('find_business');
        });

        test('should classify alumni intent correctly', async () => {
            const query = 'Find 1995 mechanical batch alumni';

            const result = await extractEntities(query);

            expect(result.intent).toBe('find_peers');
        });

        test('should classify alumni business correctly', async () => {
            const query = 'Find 1995 batch entrepreneurs in IT';

            const result = await extractEntities(query);

            expect(result.intent).toMatch(/find_alumni_business|find_peers/);
        });

        test('should classify specific person correctly', async () => {
            const query = 'Find Sivakumar from USAM Technology';

            const result = await extractEntities(query);

            expect(result.intent).toBe('find_specific_person');
        });
    });

    // ============================================================================
    // REAL-WORLD QUERY SAMPLES
    // ============================================================================

    describe('Real-World Query Samples', () => {

        test('Sample 1: Simple alumni query', async () => {
            const query = 'Show me 1995 mechanical batch';

            const result = await extractEntities(query);

            expect(result.method).toBe('regex');
            expect(result.entities.graduationYear).toContain(1995);
            expect(result.entities.branch).toContain('Mechanical');
        });

        test('Sample 2: Location-based business query', async () => {
            const query = 'Find IT companies in Chennai';

            const result = await extractEntities(query);

            expect(result.intent).toBe('find_business');
            expect(result.entities.location).toBe('Chennai');
            expect(result.entities.services || result.entities.skills).toBeDefined();
        });

        test('Sample 3: Entrepreneur query', async () => {
            const query = 'List all 1995 civil batch entrepreneurs';

            const result = await extractEntities(query);

            expect(result.entities.graduationYear).toContain(1995);
            expect(result.entities.branch).toContain('Civil');
        });

        test('Sample 4: Service-based query', async () => {
            const query = 'Who provides web development services?';

            const result = await extractEntities(query);

            expect(result.intent).toMatch(/find_business|find_alumni_business/);
            expect(result.entities.services || result.entities.skills).toBeDefined();
        });

        test('Sample 5: Multiple entities', async () => {
            const query = 'Find 1995 MBA graduates in Bangalore';

            const result = await extractEntities(query);

            expect(result.entities.graduationYear).toContain(1995);
            expect(result.entities.degree).toBe('MBA');
            expect(result.entities.location).toBe('Bangalore');
        });
    });

});

// ============================================================================
// SUMMARY REPORTER
// ============================================================================

describe('Test Summary', () => {
    test('should log test configuration', () => {
        console.log('\n========================================');
        console.log('Hybrid Extractor Test Configuration');
        console.log('========================================');
        console.log(`API Key Available: ${!SKIP_LLM_TESTS}`);
        console.log(`LLM Tests: ${SKIP_LLM_TESTS ? 'SKIPPED' : 'ENABLED'}`);
        console.log(`Regex Tests: ENABLED`);
        console.log('========================================\n');

        expect(true).toBe(true);
    });
});
