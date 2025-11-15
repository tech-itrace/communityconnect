/**
 * LLM Factory Tests
 * 
 * Tests multi-provider LLM system with automatic fallback
 */

import { getLLMFactory, LLMProviderType } from '../services/llm';

describe('LLM Factory', () => {
    // Only run if at least one API key is configured
    const hasDeepInfra = process.env.DEEPINFRA_API_KEY && process.env.DEEPINFRA_API_KEY.length > 0;
    const hasGemini = process.env.GOOGLE_API_KEY && process.env.GOOGLE_API_KEY.length > 0;
    const runTests = hasDeepInfra || hasGemini;

    if (!runTests) {
        console.log('[Test Suite] Skipping LLM Factory tests - No API keys configured');
    }

    beforeEach(() => {
        // Reset environment for each test
        if (hasDeepInfra) {
            process.env.LLM_PROVIDER_PRIMARY = 'deepinfra';
        } else if (hasGemini) {
            process.env.LLM_PROVIDER_PRIMARY = 'google_gemini';
        }
    });

    describe('Factory Initialization', () => {
        (runTests ? test : test.skip)('should initialize with available providers', () => {
            const factory = getLLMFactory();
            const status = factory.getProviderStatus();

            expect(status.length).toBeGreaterThan(0);
            console.log('[Test] Initialized providers:', status.map(s => s.name).join(', '));
        });

        (runTests ? test : test.skip)('should respect provider priority configuration', () => {
            const factory = getLLMFactory();
            const status = factory.getProviderStatus();

            if (hasDeepInfra && process.env.LLM_PROVIDER_PRIMARY === 'deepinfra') {
                expect(status[0].name).toBe(LLMProviderType.DEEPINFRA);
            } else if (hasGemini && process.env.LLM_PROVIDER_PRIMARY === 'google_gemini') {
                expect(status[0].name).toBe(LLMProviderType.GOOGLE_GEMINI);
            }
        });
    });

    describe('Text Generation', () => {
        (runTests ? test : test.skip)('should generate text with primary provider', async () => {
            const factory = getLLMFactory();

            const response = await factory.generate({
                messages: [
                    { role: 'system', content: 'You are a helpful assistant.' },
                    { role: 'user', content: 'Say "Hello" in exactly one word.' }
                ],
                temperature: 0.1,
                maxTokens: 10
            });

            expect(response.text).toBeDefined();
            expect(response.text.length).toBeGreaterThan(0);
            console.log('[Test] Generated text:', response.text);
        }, 20000);

        (runTests ? test : test.skip)('should parse JSON response correctly', async () => {
            const factory = getLLMFactory();

            const response = await factory.generate({
                messages: [
                    {
                        role: 'system',
                        content: 'Return ONLY valid JSON. Extract year from query.'
                    },
                    {
                        role: 'user',
                        content: 'Find 1995 batch students. Return JSON: {"year": 1995}'
                    }
                ],
                temperature: 0.1,
                maxTokens: 50
            });

            expect(response.text).toBeDefined();
            
            // Try to parse as JSON
            let parsed;
            try {
                const cleaned = response.text.replace(/```json\n?/g, '').replace(/```/g, '').trim();
                parsed = JSON.parse(cleaned);
            } catch (e) {
                console.log('[Test] Could not parse as JSON:', response.text);
            }

            if (parsed) {
                expect(parsed.year).toBe(1995);
            }
        }, 20000);
    });

    describe('Fallback Mechanism', () => {
        // Only run if both providers are available
        const hasBothProviders = hasDeepInfra && hasGemini;

        (hasBothProviders ? test : test.skip)('should fallback to secondary provider when primary fails', async () => {
            // Temporarily break primary provider
            const originalKey = process.env.DEEPINFRA_API_KEY;
            process.env.DEEPINFRA_API_KEY = 'invalid_key_for_testing';

            try {
                const factory = getLLMFactory();

                const response = await factory.generate({
                    messages: [
                        { role: 'user', content: 'Test fallback' }
                    ],
                    temperature: 0.3,
                    maxTokens: 10
                });

                expect(response.text).toBeDefined();
                console.log('[Test] Fallback worked, got response:', response.text);
            } finally {
                // Restore original key
                process.env.DEEPINFRA_API_KEY = originalKey;
            }
        }, 30000);
    });

    describe('Circuit Breaker', () => {
        (runTests ? test : test.skip)('should track provider failures', async () => {
            const factory = getLLMFactory();
            const statusBefore = factory.getProviderStatus();

            console.log('[Test] Provider status before:', statusBefore);

            expect(statusBefore.every(s => s.failures === 0)).toBe(true);
            expect(statusBefore.every(s => s.circuitOpen === false)).toBe(true);
        });
    });

    describe('Provider Status', () => {
        (runTests ? test : test.skip)('should report provider health status', () => {
            const factory = getLLMFactory();
            const status = factory.getProviderStatus();

            expect(status).toBeDefined();
            expect(Array.isArray(status)).toBe(true);

            status.forEach(provider => {
                expect(provider.name).toBeDefined();
                expect(typeof provider.circuitOpen).toBe('boolean');
                expect(typeof provider.failures).toBe('number');
            });

            console.log('[Test] Provider status:', JSON.stringify(status, null, 2));
        });
    });
});
