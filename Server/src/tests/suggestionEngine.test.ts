/**
 * Test Suite for Template-Based Suggestion Engine
 * 
 * Tests all intent-specific suggestion generation without LLM calls
 */

import { generateSuggestions, SuggestionContext } from '../services/suggestionEngine';
import { MemberSearchResult } from '../utils/types';
import { Intent } from '../services/intentClassifier';

// ============================================================================
// TEST DATA
// ============================================================================

const sampleBusinessResults: MemberSearchResult[] = [
    {
        id: '1',
        name: 'John Doe',
        city: 'Chennai',
        productsServices: 'IT infrastructure solutions',
        designation: 'CEO',
        organization: 'Tech Corp',
        annualTurnover: 15000000,
        yearOfGraduation: 2010,
        branch: 'Mechanical',
        relevanceScore: 0.9,
        matchedFields: ['services']
    },
    {
        id: '2',
        name: 'Jane Smith',
        city: 'Bangalore',
        productsServices: 'Software consulting',
        designation: 'Consultant',
        organization: 'Consult Ltd',
        annualTurnover: 5000000,
        yearOfGraduation: 2012,
        branch: 'Computer Science',
        relevanceScore: 0.85,
        matchedFields: ['services']
    },
    {
        id: '3',
        name: 'Bob Wilson',
        city: 'Chennai',
        productsServices: 'Web development',
        designation: 'Director',
        organization: 'WebCo',
        annualTurnover: 8000000,
        yearOfGraduation: 2015,
        branch: 'Electronics',
        relevanceScore: 0.8,
        matchedFields: ['location']
    }
];

const samplePeerResults: MemberSearchResult[] = [
    {
        id: '1',
        name: 'Alice Johnson',
        city: 'Chennai',
        yearOfGraduation: 2014,
        branch: 'Mechanical',
        degree: 'B.E',
        designation: 'Senior Engineer',
        organization: 'ABC Corp',
        relevanceScore: 0.95,
        matchedFields: ['year', 'branch']
    },
    {
        id: '2',
        name: 'Bob Brown',
        city: 'Bangalore',
        yearOfGraduation: 2014,
        branch: 'Mechanical',
        degree: 'B.E',
        designation: 'Manager',
        organization: 'XYZ Ltd',
        relevanceScore: 0.9,
        matchedFields: ['year', 'branch']
    },
    {
        id: '3',
        name: 'Carol White',
        city: 'Chennai',
        yearOfGraduation: 2014,
        branch: 'Electronics',
        degree: 'B.E',
        designation: 'Lead Engineer',
        organization: 'Tech Solutions',
        relevanceScore: 0.85,
        matchedFields: ['year']
    }
];

const samplePersonResult: MemberSearchResult[] = [
    {
        id: '1',
        name: 'Sivakumar',
        city: 'Chennai',
        yearOfGraduation: 1992,
        branch: 'Mechanical',
        degree: 'B.E',
        designation: 'CEO',
        organization: 'USAM Technology',
        productsServices: 'IT infrastructure, CAD solutions',
        annualTurnover: 15000000,
        phone: '919383999901',
        email: 'sivakumar@usam.in',
        relevanceScore: 0.95,
        matchedFields: ['name']
    }
];

// ============================================================================
// BUSINESS INTENT TESTS
// ============================================================================

describe('Suggestion Engine - Business Intent', () => {
    test('should suggest location refinement when no location specified', () => {
        const context: SuggestionContext = {
            query: 'IT consultants',
            intent: 'find_business',
            entities: { services: ['IT consulting'] },
            resultCount: 3,
            hasResults: true
        };

        const suggestions = generateSuggestions(sampleBusinessResults, context);

        expect(suggestions).toHaveLength(3);
        expect(suggestions[0]).toContain('Chennai');
    });

    test('should suggest alternative location when location specified', () => {
        const context: SuggestionContext = {
            query: 'IT consultants in Chennai',
            intent: 'find_business',
            entities: { services: ['IT consulting'], location: 'Chennai' },
            resultCount: 3,
            hasResults: true
        };

        const suggestions = generateSuggestions(sampleBusinessResults, context);

        expect(suggestions).toHaveLength(3);
        expect(suggestions.some(s => s.includes('Bangalore'))).toBe(true);
    });

    test('should suggest service exploration', () => {
        const context: SuggestionContext = {
            query: 'consultants',
            intent: 'find_business',
            entities: {},
            resultCount: 3,
            hasResults: true
        };

        const suggestions = generateSuggestions(sampleBusinessResults, context);

        expect(suggestions).toHaveLength(3);
        expect(suggestions.some(s => s.toLowerCase().includes('provider'))).toBe(true);
    });

    test('should suggest alumni filter when not specified', () => {
        const context: SuggestionContext = {
            query: 'IT companies',
            intent: 'find_business',
            entities: { services: ['IT'] },
            resultCount: 3,
            hasResults: true
        };

        const suggestions = generateSuggestions(sampleBusinessResults, context);

        expect(suggestions).toHaveLength(3);
        expect(suggestions.some(s => s.match(/\d{4}/))).toBe(true); // Contains year
    });

    test('should complete in <20ms', () => {
        const context: SuggestionContext = {
            query: 'consultants',
            intent: 'find_business',
            entities: {},
            resultCount: 3,
            hasResults: true
        };

        const start = Date.now();
        generateSuggestions(sampleBusinessResults, context);
        const duration = Date.now() - start;

        expect(duration).toBeLessThan(20);
    });
});

// ============================================================================
// PEERS INTENT TESTS
// ============================================================================

describe('Suggestion Engine - Peers Intent', () => {
    test('should suggest nearby batch years', () => {
        const context: SuggestionContext = {
            query: '2014 Mechanical students',
            intent: 'find_peers',
            entities: { graduationYear: [2014], branch: ['Mechanical'] },
            resultCount: 3,
            hasResults: true
        };

        const suggestions = generateSuggestions(samplePeerResults, context);

        expect(suggestions).toHaveLength(3);
        expect(suggestions[0]).toMatch(/201[35]/); // 2013 or 2015
    });

    test('should suggest branch filter when not specified', () => {
        const context: SuggestionContext = {
            query: '2014 alumni',
            intent: 'find_peers',
            entities: { graduationYear: [2014] },
            resultCount: 3,
            hasResults: true
        };

        const suggestions = generateSuggestions(samplePeerResults, context);

        expect(suggestions).toHaveLength(3);
        expect(suggestions.some(s => s.includes('Mechanical') || s.includes('Electronics'))).toBe(true);
    });

    test('should suggest alternative branch when branch specified', () => {
        const context: SuggestionContext = {
            query: '2014 Mechanical students',
            intent: 'find_peers',
            entities: { graduationYear: [2014], branch: ['Mechanical'] },
            resultCount: 3,
            hasResults: true
        };

        const suggestions = generateSuggestions(samplePeerResults, context);

        expect(suggestions).toHaveLength(3);
        expect(suggestions.some(s => s.includes('Electronics'))).toBe(true);
    });

    test('should suggest current role filter or business', () => {
        const context: SuggestionContext = {
            query: '2014 alumni',
            intent: 'find_peers',
            entities: { graduationYear: [2014] },
            resultCount: 3,
            hasResults: true
        };

        const suggestions = generateSuggestions(samplePeerResults, context);

        expect(suggestions).toHaveLength(3);
        // Should contain either role filter or business suggestion
        expect(
            suggestions.some(s =>
                s.toLowerCase().includes('manager') ||
                s.toLowerCase().includes('engineer') ||
                s.toLowerCase().includes('business')
            )
        ).toBe(true);
    });

    test('should suggest business conversion', () => {
        const context: SuggestionContext = {
            query: '2014 Mechanical alumni',
            intent: 'find_peers',
            entities: { graduationYear: [2014], branch: ['Mechanical'] },
            resultCount: 3,
            hasResults: true
        };

        const suggestions = generateSuggestions(samplePeerResults, context);

        expect(suggestions).toHaveLength(3);
        expect(suggestions.some(s => s.toLowerCase().includes('business'))).toBe(true);
    });
});

// ============================================================================
// SPECIFIC PERSON TESTS
// ============================================================================

describe('Suggestion Engine - Specific Person Intent', () => {
    test('should suggest same batch search', () => {
        const context: SuggestionContext = {
            query: 'Find Sivakumar',
            intent: 'find_specific_person',
            entities: { name: 'Sivakumar' },
            resultCount: 1,
            hasResults: true
        };

        const suggestions = generateSuggestions(samplePersonResult, context);

        expect(suggestions).toHaveLength(3);
        expect(suggestions[0]).toContain('1992');
    });

    test('should suggest same organization search', () => {
        const context: SuggestionContext = {
            query: 'Find Sivakumar',
            intent: 'find_specific_person',
            entities: { name: 'Sivakumar' },
            resultCount: 1,
            hasResults: true
        };

        const suggestions = generateSuggestions(samplePersonResult, context);

        expect(suggestions).toHaveLength(3);
        expect(suggestions.some(s => s.includes('USAM Technology'))).toBe(true);
    });

    test('should suggest same role search', () => {
        const context: SuggestionContext = {
            query: 'Find Sivakumar',
            intent: 'find_specific_person',
            entities: { name: 'Sivakumar' },
            resultCount: 1,
            hasResults: true
        };

        const suggestions = generateSuggestions(samplePersonResult, context);

        expect(suggestions).toHaveLength(3);
        expect(suggestions.some(s => s.includes('CEO'))).toBe(true);
    });

    test('should handle no results gracefully', () => {
        const context: SuggestionContext = {
            query: 'Find Unknown Person',
            intent: 'find_specific_person',
            entities: { name: 'Unknown Person' },
            resultCount: 0,
            hasResults: false
        };

        const suggestions = generateSuggestions([], context);

        expect(suggestions).toHaveLength(3);
        expect(suggestions[0]).toBeTruthy();
    });
});

// ============================================================================
// ALUMNI BUSINESS TESTS
// ============================================================================

describe('Suggestion Engine - Alumni Business Intent', () => {
    test('should suggest batch-specific search when no year', () => {
        const context: SuggestionContext = {
            query: 'alumni with businesses',
            intent: 'find_alumni_business',
            entities: {},
            resultCount: 3,
            hasResults: true
        };

        const suggestions = generateSuggestions(sampleBusinessResults, context);

        expect(suggestions).toHaveLength(3);
        expect(suggestions.some(s => s.match(/\d{4}/))).toBe(true);
    });

    test('should suggest different batch when year specified', () => {
        const context: SuggestionContext = {
            query: '2010 alumni businesses',
            intent: 'find_alumni_business',
            entities: { graduationYear: [2010] },
            resultCount: 3,
            hasResults: true
        };

        const suggestions = generateSuggestions(sampleBusinessResults, context);

        expect(suggestions).toHaveLength(3);
        expect(suggestions[0]).toMatch(/200[5-9]/); // Older batch
    });

    test('should suggest service exploration', () => {
        const context: SuggestionContext = {
            query: 'alumni businesses',
            intent: 'find_alumni_business',
            entities: {},
            resultCount: 3,
            hasResults: true
        };

        const suggestions = generateSuggestions(sampleBusinessResults, context);

        expect(suggestions).toHaveLength(3);
        expect(suggestions.some(s => s.toLowerCase().includes('it infrastructure') || s.toLowerCase().includes('software'))).toBe(true);
    });
});

// ============================================================================
// EMPTY RESULTS TESTS
// ============================================================================

describe('Suggestion Engine - Empty Results', () => {
    test('should suggest removing location filter', () => {
        const context: SuggestionContext = {
            query: 'consultants in Mumbai',
            intent: 'find_business',
            entities: { services: ['consulting'], location: 'Mumbai' },
            resultCount: 0,
            hasResults: false
        };

        const suggestions = generateSuggestions([], context);

        expect(suggestions).toHaveLength(3);
        expect(suggestions[0]).toContain('without location');
    });

    test('should suggest removing year filter', () => {
        const context: SuggestionContext = {
            query: '2025 alumni',
            intent: 'find_peers',
            entities: { graduationYear: [2025] },
            resultCount: 0,
            hasResults: false
        };

        const suggestions = generateSuggestions([], context);

        expect(suggestions).toHaveLength(3);
        expect(suggestions[0]).toContain('without year');
    });

    test('should suggest broader search for services', () => {
        const context: SuggestionContext = {
            query: 'quantum computing services',
            intent: 'find_business',
            entities: { services: ['quantum computing'] },
            resultCount: 0,
            hasResults: false
        };

        const suggestions = generateSuggestions([], context);

        expect(suggestions).toHaveLength(3);
        expect(suggestions.some(s => s.toLowerCase().includes('related') || s.toLowerCase().includes('broader'))).toBe(true);
    });

    test('should suggest browse all for business queries', () => {
        const context: SuggestionContext = {
            query: 'rare service',
            intent: 'find_business',
            entities: {},
            resultCount: 0,
            hasResults: false
        };

        const suggestions = generateSuggestions([], context);

        expect(suggestions).toHaveLength(3);
        expect(suggestions.some(s => s.toLowerCase().includes('browse'))).toBe(true);
    });
});

// ============================================================================
// PERFORMANCE TESTS
// ============================================================================

describe('Suggestion Engine - Performance', () => {
    test('should generate suggestions in <20ms', () => {
        const context: SuggestionContext = {
            query: 'IT consultants in Chennai',
            intent: 'find_business',
            entities: { services: ['IT'], location: 'Chennai' },
            resultCount: 3,
            hasResults: true
        };

        const start = Date.now();
        generateSuggestions(sampleBusinessResults, context);
        const duration = Date.now() - start;

        expect(duration).toBeLessThan(20);
    });

    test('should handle large result sets efficiently', () => {
        const largeResults: MemberSearchResult[] = Array(100).fill(null).map((_, i) => ({
            id: `${i}`,
            name: `Member ${i}`,
            city: i % 3 === 0 ? 'Chennai' : i % 3 === 1 ? 'Bangalore' : 'Mumbai',
            yearOfGraduation: 2010 + (i % 15),
            branch: i % 2 === 0 ? 'Mechanical' : 'Computer Science',
            designation: 'Engineer',
            relevanceScore: 0.8
        }));

        const context: SuggestionContext = {
            query: '2014 alumni',
            intent: 'find_peers',
            entities: { graduationYear: [2014] },
            resultCount: 100,
            hasResults: true
        };

        const start = Date.now();
        const suggestions = generateSuggestions(largeResults, context);
        const duration = Date.now() - start;

        expect(suggestions).toHaveLength(3);
        expect(duration).toBeLessThan(50);
    });

    test('should be 40x faster than LLM baseline (800ms)', () => {
        const context: SuggestionContext = {
            query: 'consultants',
            intent: 'find_business',
            entities: {},
            resultCount: 3,
            hasResults: true
        };

        const start = Date.now();
        generateSuggestions(sampleBusinessResults, context);
        const duration = Date.now() - start;

        const llmBaseline = 800; // ms
        const speedup = llmBaseline / duration;

        expect(speedup).toBeGreaterThan(40);
    });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe('Suggestion Engine - Edge Cases', () => {
    test('should handle empty results array', () => {
        const context: SuggestionContext = {
            query: 'test query',
            intent: 'find_business',
            entities: {},
            resultCount: 0,
            hasResults: false
        };

        const suggestions = generateSuggestions([], context);

        expect(suggestions).toHaveLength(3);
        expect(suggestions.every(s => s.length > 0)).toBe(true);
    });

    test('should handle results with missing fields', () => {
        const incompleteResults: MemberSearchResult[] = [
            {
                id: '1',
                name: 'John Doe',
                relevanceScore: 0.8
                // Missing most fields
            }
        ];

        const context: SuggestionContext = {
            query: 'find members',
            intent: 'find_business',
            entities: {},
            resultCount: 1,
            hasResults: true
        };

        const suggestions = generateSuggestions(incompleteResults, context);

        expect(suggestions).toHaveLength(3);
        expect(suggestions.every(s => s.length > 0)).toBe(true);
    });

    test('should handle special characters in data', () => {
        const specialResults: MemberSearchResult[] = [
            {
                id: '1',
                name: 'O\'Brien & Sons',
                city: 'Coimbatore',
                productsServices: 'IT solutions & consulting',
                designation: 'CEO/Director',
                relevanceScore: 0.9
            }
        ];

        const context: SuggestionContext = {
            query: 'IT companies',
            intent: 'find_business',
            entities: {},
            resultCount: 1,
            hasResults: true
        };

        const suggestions = generateSuggestions(specialResults, context);

        expect(suggestions).toHaveLength(3);
        expect(suggestions.every(s => s.length > 0)).toBe(true);
    });

    test('should always return exactly 3 suggestions', () => {
        const contexts: SuggestionContext[] = [
            {
                query: 'test1',
                intent: 'find_business',
                entities: {},
                resultCount: 0,
                hasResults: false
            },
            {
                query: 'test2',
                intent: 'find_peers',
                entities: { graduationYear: [2014] },
                resultCount: 10,
                hasResults: true
            },
            {
                query: 'test3',
                intent: 'find_specific_person',
                entities: { name: 'Test' },
                resultCount: 1,
                hasResults: true
            }
        ];

        contexts.forEach(context => {
            const suggestions = generateSuggestions(sampleBusinessResults, context);
            expect(suggestions).toHaveLength(3);
        });
    });
});
