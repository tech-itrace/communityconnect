/**
 * Regex Extractor Test Suite
 * 
 * Tests the regex-based entity extraction against the same 15 queries
 * to compare performance vs LLM-based extraction.
 * 
 * Expected improvements:
 * - Response time: <20ms (vs 5000ms with LLM)
 * - Accuracy: 95%+ on simple patterns
 * - Cost: $0 (vs $0.10 for LLM)
 */

import { extractWithRegex, RegexExtractionResult } from '../services/regexExtractor';
import { ExtractedEntities } from '../utils/types';

interface QueryTestCase {
    id: number;
    query: string;
    category: 'entrepreneurs' | 'alumni' | 'alumni_business';
    expected: {
        entities: Partial<ExtractedEntities>;
    };
}

// Same 15 queries from querySample.test.ts
const sampleQueries: QueryTestCase[] = [
    // ENTREPRENEURS (5 queries)
    {
        id: 1,
        query: 'Find web development companies in Chennai',
        category: 'entrepreneurs',
        expected: {
            entities: {
                skills: ['web development'],
                location: 'Chennai',
            },
        },
    },
    {
        id: 2,
        query: 'IT consulting services in Bangalore',
        category: 'entrepreneurs',
        expected: {
            entities: {
                services: ['IT consulting', 'consulting'],
                location: 'Bangalore',
            },
        },
    },
    {
        id: 3,
        query: 'Who provides digital marketing services?',
        category: 'entrepreneurs',
        expected: {
            entities: {
                services: ['digital marketing', 'marketing'],
            },
        },
    },
    {
        id: 6,
        query: 'real estate developers in Coimbatore',
        category: 'entrepreneurs',
        expected: {
            entities: {
                skills: ['real estate'],
                location: 'Coimbatore',
            },
        },
    },
    {
        id: 12,
        query: 'Find healthcare startups',
        category: 'entrepreneurs',
        expected: {
            entities: {
                skills: ['healthcare'],
            },
        },
    },

    // ALUMNI (5 queries)
    {
        id: 31,
        query: 'Find my batchmates from 1995 passout',
        category: 'alumni',
        expected: {
            entities: {
                graduationYear: [1995],
            },
        },
    },
    {
        id: 32,
        query: 'Who has mechanical engineering degree?',
        category: 'alumni',
        expected: {
            entities: {
                degree: 'Mechanical Engineering',
            },
        },
    },
    {
        id: 35,
        query: 'Show me people from 2010 batch',
        category: 'alumni',
        expected: {
            entities: {
                graduationYear: [2010],
            },
        },
    },
    {
        id: 40,
        query: 'Find CSE graduates working in Bangalore',
        category: 'alumni',
        expected: {
            entities: {
                degree: 'Computer Science',
                location: 'Bangalore',
            },
        },
    },
    {
        id: 45,
        query: 'ECE people from 2005 batch',
        category: 'alumni',
        expected: {
            entities: {
                degree: 'ECE',
                graduationYear: [2005],
            },
        },
    },

    // ALUMNI BUSINESS (5 queries)
    {
        id: 61,
        query: 'Find civil engineers doing construction business',
        category: 'alumni_business',
        expected: {
            entities: {
                degree: 'Civil Engineering',
                skills: ['construction'],
            },
        },
    },
    {
        id: 65,
        query: '1998 batch textile engineers in manufacturing',
        category: 'alumni_business',
        expected: {
            entities: {
                graduationYear: [1998],
                degree: 'Textile Engineering',
                skills: ['manufacturing'],
            },
        },
    },
    {
        id: 70,
        query: 'mechanical engineers running companies in Chennai',
        category: 'alumni_business',
        expected: {
            entities: {
                degree: 'Mechanical Engineering',
                location: 'Chennai',
            },
        },
    },
    {
        id: 75,
        query: 'Find IT graduates with software companies in Bangalore',
        category: 'alumni_business',
        expected: {
            entities: {
                degree: 'IT',
                skills: ['software'],
                location: 'Bangalore',
            },
        },
    },
    {
        id: 80,
        query: '2000 passout doing AI ML work',
        category: 'alumni_business',
        expected: {
            entities: {
                graduationYear: [2000],
                skills: ['AI', 'ML'],
            },
        },
    },
];

// Helper function to compare entities (relaxed for regex)
function compareEntities(
    expected: Partial<ExtractedEntities>,
    actual: Partial<ExtractedEntities>
): 'correct' | 'partial' | 'incorrect' {
    let matchedFields = 0;
    let totalFields = 0;

    for (const key in expected) {
        totalFields++;
        const expectedValue = expected[key as keyof ExtractedEntities];
        const actualValue = actual[key as keyof ExtractedEntities];

        // Handle string | string[] types (e.g., degree, branch)
        const expectedArray = Array.isArray(expectedValue) ? expectedValue : (expectedValue ? [expectedValue] : []);
        const actualArray = Array.isArray(actualValue) ? actualValue : (actualValue ? [actualValue] : []);

        if (expectedArray.length > 0 && actualArray.length > 0) {
            // Check for overlap (relaxed matching)
            const hasOverlap = expectedArray.some(ev =>
                actualArray.some(av => {
                    const evStr = String(ev).toLowerCase();
                    const avStr = String(av).toLowerCase();
                    return avStr.includes(evStr) || evStr.includes(avStr);
                })
            );
            if (hasOverlap) matchedFields++;
        } else if (expectedValue === actualValue) {
            matchedFields++;
        }
    }

    const accuracy = totalFields > 0 ? matchedFields / totalFields : 0;
    if (accuracy === 1) return 'correct';
    if (accuracy >= 0.5) return 'partial';
    return 'incorrect';
}

// Metrics tracking
const metrics = {
    total: 0,
    correct: 0,
    partial: 0,
    incorrect: 0,
    needsLLM: 0,
    byCategory: {
        entrepreneurs: { total: 0, correct: 0, partial: 0, incorrect: 0 },
        alumni: { total: 0, correct: 0, partial: 0, incorrect: 0 },
        alumni_business: { total: 0, correct: 0, partial: 0, incorrect: 0 },
    },
    avgResponseTime: 0,
    avgConfidence: 0,
};

let totalTime = 0;
let totalConfidence = 0;

describe('Regex Entity Extraction Tests (15 queries)', () => {
    sampleQueries.forEach((testCase) => {
        it(`Query #${testCase.id}: ${testCase.query}`, () => {
            metrics.total++;
            metrics.byCategory[testCase.category].total++;

            const startTime = Date.now();
            const result = extractWithRegex(testCase.query);
            const responseTime = Date.now() - startTime;

            totalTime += responseTime;
            totalConfidence += result.confidence;
            if (result.needsLLM) metrics.needsLLM++;

            // Compare results
            const entityMatch = compareEntities(testCase.expected.entities, result.entities as Partial<ExtractedEntities>);

            // Update metrics
            if (entityMatch === 'correct') {
                metrics.correct++;
                metrics.byCategory[testCase.category].correct++;
            } else if (entityMatch === 'partial') {
                metrics.partial++;
                metrics.byCategory[testCase.category].partial++;
            } else {
                metrics.incorrect++;
                metrics.byCategory[testCase.category].incorrect++;
            }

            // Log results
            console.log(`\n[Query #${testCase.id}] ${testCase.query}`);
            console.log(`Expected: ${JSON.stringify(testCase.expected.entities)}`);
            console.log(`Actual: ${JSON.stringify(result.entities)}`);
            console.log(`Match: ${entityMatch} | Time: ${responseTime}ms | Confidence: ${result.confidence.toFixed(2)} | Needs LLM: ${result.needsLLM}`);

            // Expect at least partial match
            expect(entityMatch).not.toBe('incorrect');

            // Expect response time < 50ms
            expect(responseTime).toBeLessThan(50);
        });
    });

    afterAll(() => {
        metrics.avgResponseTime = metrics.total > 0 ? totalTime / metrics.total : 0;
        metrics.avgConfidence = metrics.total > 0 ? totalConfidence / metrics.total : 0;

        console.log('\n' + '='.repeat(80));
        console.log('REGEX EXTRACTION REPORT (15 queries)');
        console.log('='.repeat(80));
        console.log(`\nTotal Queries: ${metrics.total}`);
        console.log(`Correct: ${metrics.correct} (${((metrics.correct / metrics.total) * 100).toFixed(1)}%)`);
        console.log(`Partial: ${metrics.partial} (${((metrics.partial / metrics.total) * 100).toFixed(1)}%)`);
        console.log(`Incorrect: ${metrics.incorrect} (${((metrics.incorrect / metrics.total) * 100).toFixed(1)}%)`);
        console.log(`Needs LLM Fallback: ${metrics.needsLLM} (${((metrics.needsLLM / metrics.total) * 100).toFixed(1)}%)`);
        console.log(`\nAvg Response Time: ${metrics.avgResponseTime.toFixed(0)}ms`);
        console.log(`Avg Confidence: ${metrics.avgConfidence.toFixed(2)}`);

        console.log('\n--- By Category ---');
        for (const category in metrics.byCategory) {
            const cat = metrics.byCategory[category as keyof typeof metrics.byCategory];
            const accuracy = cat.total > 0 ? ((cat.correct / cat.total) * 100).toFixed(1) : '0.0';
            console.log(`${category}: ${cat.correct}/${cat.total} (${accuracy}%)`);
        }

        console.log('\n--- Performance Comparison ---');
        console.log(`LLM Baseline: 5134ms avg, 66.7% accuracy, $0.10 cost`);
        console.log(`Regex: ${metrics.avgResponseTime.toFixed(0)}ms avg, ${((metrics.correct / metrics.total) * 100).toFixed(1)}% accuracy, $0 cost`);
        console.log(`Speedup: ${(5134 / metrics.avgResponseTime).toFixed(0)}x faster`);

        console.log('\n' + '='.repeat(80));

        // Save metrics to file
        const fs = require('fs');
        const reportPath = './test-results-regex.json';
        fs.writeFileSync(reportPath, JSON.stringify(metrics, null, 2));
        console.log(`\nReport saved to: ${reportPath}`);
    });
});
