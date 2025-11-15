/**
 * Test Suite for Updated llmService Integration
 * 
 * Tests that llmService correctly uses template-based formatters and suggestions
 */

import { generateResponse, generateSuggestions } from '../services/llmService';
import { MemberSearchResult, ExtractedEntities } from '../utils/types';
import { Intent } from '../services/intentClassifier';

// ============================================================================
// TEST DATA
// ============================================================================

const sampleResults: MemberSearchResult[] = [
    {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '1234567890',
        city: 'Chennai',
        organization: 'Tech Corp',
        designation: 'CEO',
        yearOfGraduation: 2010,
        branch: 'Mechanical',
        productsServices: 'IT solutions',
        relevanceScore: 0.9
    },
    {
        id: '2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '0987654321',
        city: 'Bangalore',
        organization: 'Consult Ltd',
        designation: 'Consultant',
        yearOfGraduation: 2012,
        branch: 'Computer Science',
        relevanceScore: 0.85
    }
];

const sampleEntities: ExtractedEntities = {
    graduationYear: [2010],
    branch: ['Mechanical'],
    skills: ['IT'],
    location: 'Chennai'
};

// ============================================================================
// RESPONSE GENERATION TESTS
// ============================================================================

describe('llmService - Response Generation (Template Integration)', () => {
    test('should use template formatter when intent and entities provided', async () => {
        const response = await generateResponse(
            'IT companies from 2010',
            sampleResults,
            0.9,
            'find_business',
            sampleEntities
        );

        expect(response).toBeTruthy();
        expect(response.length).toBeGreaterThan(0);
        expect(response).toContain('Tech Corp'); // Business format shows organization
        expect(response).toContain('Chennai'); // Should include location
    });

    test('should handle business intent formatting', async () => {
        const businessEntities: ExtractedEntities = {
            services: ['consulting'],
            location: 'Bangalore'
        };

        const response = await generateResponse(
            'consultants in Bangalore',
            sampleResults,
            0.9,
            'find_business',
            businessEntities
        );

        expect(response).toBeTruthy();
        expect(response.length).toBeGreaterThan(0);
    });

    test('should handle peers intent formatting', async () => {
        const peerEntities: ExtractedEntities = {
            graduationYear: [2010],
            branch: ['Mechanical']
        };

        const response = await generateResponse(
            '2010 Mechanical students',
            sampleResults,
            0.9,
            'find_peers',
            peerEntities
        );

        expect(response).toBeTruthy();
        expect(response.length).toBeGreaterThan(0);
    });

    test('should handle specific person intent formatting', async () => {
        const personEntities: ExtractedEntities = {
            name: 'John Doe'
        };

        const response = await generateResponse(
            'Find John Doe',
            sampleResults,
            0.9,
            'find_specific_person',
            personEntities
        );

        expect(response).toBeTruthy();
        expect(response.length).toBeGreaterThan(0);
    });

    test('should handle empty results', async () => {
        const response = await generateResponse(
            'non-existent query',
            [],
            0.9,
            'find_business',
            {}
        );

        expect(response).toContain('couldn\'t find');
    });

    test('should use LLM fallback when no intent provided', async () => {
        const response = await generateResponse(
            'some query',
            sampleResults,
            0.9
        );

        expect(response).toBeTruthy();
        expect(response.length).toBeGreaterThan(0);
    }, 10000); // Allow time for LLM call

    test('should complete in reasonable time with templates', async () => {
        const start = Date.now();

        await generateResponse(
            'IT companies',
            sampleResults,
            0.9,
            'find_business',
            sampleEntities
        );

        const duration = Date.now() - start;

        // Template-based should be <100ms
        expect(duration).toBeLessThan(100);
    });
});

// ============================================================================
// SUGGESTION GENERATION TESTS
// ============================================================================

describe('llmService - Suggestion Generation (Template Integration)', () => {
    test('should use template suggestions when intent and entities provided', async () => {
        const suggestions = await generateSuggestions(
            'IT companies from 2010',
            sampleResults,
            'find_business',
            sampleEntities
        );

        expect(suggestions).toHaveLength(3);
        expect(suggestions.every(s => s.length > 0)).toBe(true);
    });

    test('should generate business intent suggestions', async () => {
        const businessEntities: ExtractedEntities = {
            services: ['consulting']
        };

        const suggestions = await generateSuggestions(
            'consultants',
            sampleResults,
            'find_business',
            businessEntities
        );

        expect(suggestions).toHaveLength(3);
        expect(suggestions.every(s => s.length > 0)).toBe(true);
    });

    test('should generate peer intent suggestions', async () => {
        const peerEntities: ExtractedEntities = {
            graduationYear: [2010],
            branch: ['Mechanical']
        };

        const suggestions = await generateSuggestions(
            '2010 Mechanical students',
            sampleResults,
            'find_peers',
            peerEntities
        );

        expect(suggestions).toHaveLength(3);
        expect(suggestions.every(s => s.length > 0)).toBe(true);
    });

    test('should generate person intent suggestions', async () => {
        const personEntities: ExtractedEntities = {
            name: 'John Doe'
        };

        const suggestions = await generateSuggestions(
            'Find John Doe',
            sampleResults,
            'find_specific_person',
            personEntities
        );

        expect(suggestions).toHaveLength(3);
        expect(suggestions.every(s => s.length > 0)).toBe(true);
    });

    test('should handle empty results', async () => {
        const suggestions = await generateSuggestions(
            'non-existent query',
            [],
            'find_business',
            {}
        );

        expect(suggestions).toHaveLength(3);
        expect(suggestions.every(s => s.length > 0)).toBe(true);
    });

    test('should use LLM fallback when no intent provided', async () => {
        const suggestions = await generateSuggestions(
            'some query',
            sampleResults
        );

        expect(suggestions).toHaveLength(3);
        expect(suggestions.every(s => s.length > 0)).toBe(true);
    }, 10000); // Allow time for LLM call

    test('should complete in reasonable time with templates', async () => {
        const start = Date.now();

        await generateSuggestions(
            'IT companies',
            sampleResults,
            'find_business',
            sampleEntities
        );

        const duration = Date.now() - start;

        // Template-based should be <50ms
        expect(duration).toBeLessThan(50);
    });
});

// ============================================================================
// BACKWARD COMPATIBILITY TESTS
// ============================================================================

describe('llmService - Backward Compatibility', () => {
    test('generateResponse should work with old signature (no intent/entities)', async () => {
        const response = await generateResponse(
            'test query',
            sampleResults,
            0.9
        );

        expect(response).toBeTruthy();
        expect(response.length).toBeGreaterThan(0);
    }, 10000);

    test('generateSuggestions should work with old signature (no intent/entities)', async () => {
        const suggestions = await generateSuggestions(
            'test query',
            sampleResults
        );

        expect(suggestions).toHaveLength(3);
        expect(suggestions.every(s => s.length > 0)).toBe(true);
    }, 10000);
});

// ============================================================================
// PERFORMANCE TESTS
// ============================================================================

describe('llmService - Performance', () => {
    test('template response should be significantly faster than LLM', async () => {
        // Template-based
        const templateStart = Date.now();
        await generateResponse(
            'IT companies',
            sampleResults,
            0.9,
            'find_business',
            sampleEntities
        );
        const templateDuration = Date.now() - templateStart;

        // Should be very fast (<100ms)
        expect(templateDuration).toBeLessThan(100);
    });

    test('template suggestions should be significantly faster than LLM', async () => {
        // Template-based
        const templateStart = Date.now();
        await generateSuggestions(
            'IT companies',
            sampleResults,
            'find_business',
            sampleEntities
        );
        const templateDuration = Date.now() - templateStart;

        // Should be very fast (<50ms)
        expect(templateDuration).toBeLessThan(50);
    });

    test('should handle multiple concurrent requests efficiently', async () => {
        const promises = Array(5).fill(null).map(() =>
            generateResponse(
                'IT companies',
                sampleResults,
                0.9,
                'find_business',
                sampleEntities
            )
        );

        const start = Date.now();
        const results = await Promise.all(promises);
        const duration = Date.now() - start;

        expect(results).toHaveLength(5);
        expect(results.every(r => r.length > 0)).toBe(true);
        // Should complete all in <500ms
        expect(duration).toBeLessThan(500);
    });
});
