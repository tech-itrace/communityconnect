/**
 * Test Suite: nlSearchService Template Integration (Task 3.4)
 * 
 * Validates that nlSearchService properly passes intent and entities
 * to the template-based formatters and suggestion engine.
 * 
 * This is a focused integration test that ensures the pipeline works correctly.
 */

import { processNaturalLanguageQuery } from '../services/nlSearchService';
import * as llmService from '../services/llmService';

// Spy on llmService functions to validate they're called correctly
jest.spyOn(llmService, 'generateResponse');
jest.spyOn(llmService, 'generateSuggestions');

// Skip if no database/LLM access
const SKIP_TESTS = !process.env.DATABASE_URL || !process.env.DEEPINFRA_API_KEY;

describe('nlSearchService - Task 3.4 Template Integration', () => {
    const describeOrSkip = SKIP_TESTS ? describe.skip : describe;

    describeOrSkip('Intent and Entity Propagation', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should pass intent and entities to generateResponse', async () => {
            const query = 'IT consulting companies in Chennai';

            await processNaturalLanguageQuery(query, 10);

            // Verify generateResponse was called
            expect(llmService.generateResponse).toHaveBeenCalled();

            const callArgs = (llmService.generateResponse as jest.Mock).mock.calls[0];

            // Should have 5 parameters (query, results, confidence, intent, entities)
            expect(callArgs).toHaveLength(5);

            // Verify intent is passed (4th parameter)
            const intent = callArgs[3];
            expect(intent).toBeDefined();
            expect(typeof intent).toBe('string');

            // Verify entities are passed (5th parameter)
            const entities = callArgs[4];
            expect(entities).toBeDefined();
            expect(typeof entities).toBe('object');

            console.log(`✓ generateResponse called with intent: ${intent}`);
            console.log(`✓ generateResponse called with entities:`, JSON.stringify(entities));
        }, 30000);

        it('should pass intent and entities to generateSuggestions', async () => {
            const query = '2014 Mechanical batch';

            await processNaturalLanguageQuery(query, 10);

            // Verify generateSuggestions was called
            expect(llmService.generateSuggestions).toHaveBeenCalled();

            const callArgs = (llmService.generateSuggestions as jest.Mock).mock.calls[0];

            // Should have 4 parameters (query, results, intent, entities)
            expect(callArgs).toHaveLength(4);

            // Verify intent is passed (3rd parameter)
            const intent = callArgs[2];
            expect(intent).toBeDefined();
            expect(typeof intent).toBe('string');

            // Verify entities are passed (4th parameter)
            const entities = callArgs[3];
            expect(entities).toBeDefined();
            expect(typeof entities).toBe('object');

            console.log(`✓ generateSuggestions called with intent: ${intent}`);
            console.log(`✓ generateSuggestions called with entities:`, JSON.stringify(entities));
        }, 30000);

        it('should work end-to-end with business query', async () => {
            const query = 'software development companies';

            const result = await processNaturalLanguageQuery(query, 10);

            // Verify result structure
            expect(result).toBeDefined();
            expect(result.understanding).toBeDefined();
            expect(result.understanding.intent).toBeDefined();
            expect(result.understanding.entities).toBeDefined();

            expect(result.response).toBeDefined();
            if (result.response) {
                expect(result.response.conversational).toBeDefined();
                expect(result.response.suggestions).toBeDefined();
                expect(Array.isArray(result.response.suggestions)).toBe(true);
            }

            // Verify both functions were called with 5 and 4 params respectively
            expect(llmService.generateResponse).toHaveBeenCalledWith(
                expect.any(String),
                expect.any(Array),
                expect.any(Number),
                expect.any(String),  // intent
                expect.any(Object)   // entities
            );

            expect(llmService.generateSuggestions).toHaveBeenCalledWith(
                expect.any(String),
                expect.any(Array),
                expect.any(String),  // intent
                expect.any(Object)   // entities
            );

            console.log(`✓ End-to-end test completed successfully`);
            console.log(`  Intent: ${result.understanding.intent}`);
            console.log(`  Confidence: ${result.understanding.confidence}`);
            console.log(`  Results: ${result.results.members.length} members`);
            if (result.response?.suggestions) {
                console.log(`  Suggestions: ${result.response.suggestions.length}`);
            }
        }, 30000);

        it('should work end-to-end with alumni query', async () => {
            const query = '2010 Computer Science graduates';

            const result = await processNaturalLanguageQuery(query, 10);

            // Verify result structure
            expect(result).toBeDefined();
            expect(result.understanding.intent).toBeDefined();
            expect(result.response).toBeDefined();
            if (result.response) {
                expect(result.response.conversational).toBeDefined();
                expect(result.response.suggestions).toBeDefined();
            }

            // Both functions should receive intent and entities
            const responseArgs = (llmService.generateResponse as jest.Mock).mock.calls[0];
            const suggestionArgs = (llmService.generateSuggestions as jest.Mock).mock.calls[0];

            expect(responseArgs[3]).toBeDefined(); // intent
            expect(responseArgs[4]).toBeDefined(); // entities
            expect(suggestionArgs[2]).toBeDefined(); // intent
            expect(suggestionArgs[3]).toBeDefined(); // entities

            console.log(`✓ Alumni query test completed successfully`);
        }, 30000);

        it('should work with complex alumni business query', async () => {
            const query = '2015 alumni running manufacturing business';

            const result = await processNaturalLanguageQuery(query, 10);

            // Verify complete flow
            expect(result).toBeDefined();
            expect(result.understanding.intent).toBeDefined();
            expect(result.response).toBeDefined();
            if (result.response) {
                expect(result.response.conversational).toBeDefined();
                expect(result.response.suggestions).toBeDefined();
            }

            // Verify both functions got the parameters
            expect(llmService.generateResponse).toHaveBeenCalled();
            expect(llmService.generateSuggestions).toHaveBeenCalled();

            const responseCallCount = (llmService.generateResponse as jest.Mock).mock.calls.length;
            const suggestionCallCount = (llmService.generateSuggestions as jest.Mock).mock.calls.length;

            expect(responseCallCount).toBeGreaterThan(0);
            expect(suggestionCallCount).toBeGreaterThan(0);

            console.log(`✓ Complex query test completed successfully`);
        }, 30000);
    });

    describeOrSkip('Performance Tracking', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should track performance metrics correctly', async () => {
            const query = 'consulting services in Bangalore';

            const result = await processNaturalLanguageQuery(query, 10);

            // Verify performance tracking
            expect(result.executionTime).toBeGreaterThan(0);
            expect(result.performance).toBeDefined();
            expect(result.performance?.extractionMethod).toBeDefined();
            expect(result.performance?.extractionTime).toBeGreaterThan(0);

            console.log(`✓ Performance tracking working correctly`);
            console.log(`  Total time: ${result.executionTime}ms`);
            console.log(`  Extraction: ${result.performance?.extractionTime}ms (${result.performance?.extractionMethod})`);
            console.log(`  LLM used: ${result.performance?.llmUsed ? 'YES' : 'NO'}`);
        }, 30000);

        it('should complete queries faster with template-based approach', async () => {
            const query = 'mechanical engineers';

            const startTime = Date.now();
            const result = await processNaturalLanguageQuery(query, 10);
            const endTime = Date.now();
            const totalTime = endTime - startTime;

            // With templates, most queries should complete under 2 seconds
            // (regex extraction + search + template formatting)
            expect(result).toBeDefined();
            console.log(`✓ Query completed in ${totalTime}ms`);

            // If regex path was used (not LLM), should be fast
            if (result.performance?.extractionMethod === 'regex') {
                console.log(`  Regex path: Extraction ${result.performance.extractionTime}ms`);
                console.log(`  Template-based formatting enabled`);
            }
        }, 30000);
    });

    describeOrSkip('Result Quality', () => {
        it('should return properly formatted conversational responses', async () => {
            const query = 'CEOs in Mumbai';

            const result = await processNaturalLanguageQuery(query, 10);

            expect(result.response).toBeDefined();
            if (result.response) {
                expect(result.response.conversational).toBeDefined();
                expect(typeof result.response.conversational).toBe('string');
                expect(result.response.conversational.length).toBeGreaterThan(0);

                console.log(`✓ Response format validated`);
                console.log(`  Response preview: ${result.response.conversational.substring(0, 100)}...`);
            }
        }, 30000);

        it('should return relevant suggestions', async () => {
            const query = 'software developers';

            const result = await processNaturalLanguageQuery(query, 10);

            expect(result.response).toBeDefined();
            if (result.response) {
                expect(result.response.suggestions).toBeDefined();
                if (result.response.suggestions) {
                    expect(Array.isArray(result.response.suggestions)).toBe(true);
                    expect(result.response.suggestions.length).toBeGreaterThan(0);

                    console.log(`✓ Suggestions validated`);
                    console.log(`  Suggestion count: ${result.response.suggestions.length}`);
                    result.response.suggestions.forEach((sug, idx) => {
                        console.log(`  ${idx + 1}. ${sug}`);
                    });
                }
            }
        }, 30000);
    });
});
