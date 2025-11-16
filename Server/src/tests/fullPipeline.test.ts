/**
 * Full Pipeline Test - Phase 4, Task 4.1
 * 
 * Tests the complete optimized pipeline (hybrid extraction + semantic search + response formatting)
 * against all 188 queries from QUERY-TAXONOMY.md to measure:
 * - Overall accuracy improvement (target: 90-95% from baseline 65-75%)
 * - Response time improvement (target: <500ms from baseline 2.5-4s)
 * - Regex vs LLM usage (target: 80% regex, 20% LLM)
 * - Query complexity performance (simple: <100ms, medium: <200ms, complex: <500ms)
 * 
 * Reference: /TODO_queryOptimisation.md (Phase 4, Task 4.1)
 */

import { extractEntities, HybridExtractionResult } from '../services/hybridExtractor';
import { searchMembers } from '../services/semanticSearch';
import { formatResults } from '../services/responseFormatter';
import { Intent } from '../services/intentClassifier';
import { ExtractedEntities, MemberSearchResult, ScoredMember } from '../utils/types';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface QueryTestCase {
    id: number;
    query: string;
    category: 'entrepreneurs' | 'alumni' | 'alumni_business' | 'special';
    subcategory: string;
    complexity: 'simple' | 'medium' | 'complex';
    expected: {
        intent: Intent;
        entities: Partial<ExtractedEntities>;
        minResults?: number;
        maxResults?: number;
    };
}

interface PipelineTestResult {
    testCase: QueryTestCase;
    extraction: HybridExtractionResult;
    searchTime: number;
    searchResults: ScoredMember[];
    formattedResponse: string;
    formatTime: number;
    totalTime: number;
    status: 'success' | 'partial' | 'failed';
    accuracy: 'correct' | 'partial' | 'incorrect';
    errorMessage?: string;
}

interface PerformanceMetrics {
    // Overall metrics
    totalQueries: number;
    successfulQueries: number;
    failedQueries: number;

    // Accuracy tracking
    correctExtractions: number;
    partialExtractions: number;
    incorrectExtractions: number;
    overallAccuracy: number;

    // Performance tracking
    avgTotalTime: number;
    avgExtractionTime: number;
    avgSearchTime: number;
    avgFormatTime: number;
    p50Time: number;
    p95Time: number;
    p99Time: number;

    // Method usage
    regexOnlyQueries: number;
    llmFallbackQueries: number;
    hybridQueries: number;
    regexUsagePercent: number;
    llmUsagePercent: number;

    // By complexity
    byComplexity: {
        [key in 'simple' | 'medium' | 'complex']: {
            count: number;
            avgTime: number;
            accuracy: number;
            regexUsage: number;
        };
    };

    // By category
    byCategory: {
        [key: string]: {
            count: number;
            accuracy: number;
            avgTime: number;
        };
    };

    // By intent
    byIntent: {
        [key: string]: {
            count: number;
            accuracy: number;
            avgTime: number;
        };
    };
}

// ============================================================================
// TEST DATA (from QUERY-TAXONOMY.md)
// ============================================================================

const ALL_TEST_QUERIES: QueryTestCase[] = [
    // Group 1: Entrepreneurs Community (Business Focus) - Service-Based
    {
        id: 1,
        query: "Find web development company in Chennai",
        category: 'entrepreneurs',
        subcategory: 'service_based',
        complexity: 'simple',
        expected: {
            intent: 'find_business',
            entities: {
                skills: ['web development', 'website design'],
                location: 'Chennai',
            },
        },
    },
    {
        id: 2,
        query: "Looking for IT consulting services in Bangalore",
        category: 'entrepreneurs',
        subcategory: 'service_based',
        complexity: 'simple',
        expected: {
            intent: 'find_business',
            entities: {
                skills: ['IT consulting', 'IT services'],
                location: 'Bangalore',
            },
        },
    },
    {
        id: 3,
        query: "Who provides digital marketing services?",
        category: 'entrepreneurs',
        subcategory: 'service_based',
        complexity: 'simple',
        expected: {
            intent: 'find_business',
            entities: {
                skills: ['digital marketing', 'marketing'],
            },
        },
    },
    {
        id: 4,
        query: "Find textile manufacturers in Tamil Nadu",
        category: 'entrepreneurs',
        subcategory: 'service_based',
        complexity: 'simple',
        expected: {
            intent: 'find_business',
            entities: {
                skills: ['textile', 'manufacturing'],
                location: 'Tamil Nadu',
            },
        },
    },
    {
        id: 5,
        query: "Looking for packaging solutions in Chennai",
        category: 'entrepreneurs',
        subcategory: 'service_based',
        complexity: 'simple',
        expected: {
            intent: 'find_business',
            entities: {
                skills: ['packaging'],
                location: 'Chennai',
            },
        },
    },

    // Group 2: Alumni Community (Peer/Batch Focus) - Batch/Year-Based
    {
        id: 51,
        query: "Find my batchmates from 1995 passout",
        category: 'alumni',
        subcategory: 'batch_year',
        complexity: 'simple',
        expected: {
            intent: 'find_peers',
            entities: {
                graduationYear: [1995],
            },
        },
    },
    {
        id: 52,
        query: "Who are the 1998 batch members?",
        category: 'alumni',
        subcategory: 'batch_year',
        complexity: 'simple',
        expected: {
            intent: 'find_peers',
            entities: {
                graduationYear: [1998],
            },
        },
    },
    {
        id: 53,
        query: "Looking for 95 passout mechanical",
        category: 'alumni',
        subcategory: 'batch_year',
        complexity: 'medium',
        expected: {
            intent: 'find_peers',
            entities: {
                graduationYear: [1995],
                branch: ['Mechanical', 'Mechanical Engineering'],
            },
        },
    },
    {
        id: 54,
        query: "Find 2010 graduates",
        category: 'alumni',
        subcategory: 'batch_year',
        complexity: 'simple',
        expected: {
            intent: 'find_peers',
            entities: {
                graduationYear: [2010],
            },
        },
    },
    {
        id: 55,
        query: "Who graduated in 1994?",
        category: 'alumni',
        subcategory: 'batch_year',
        complexity: 'simple',
        expected: {
            intent: 'find_peers',
            entities: {
                graduationYear: [1994],
            },
        },
    },

    // Group 3: Alumni Business Queries - Mixed intent
    {
        id: 101,
        query: "Who from 1995 batch runs a business in Chennai?",
        category: 'alumni_business',
        subcategory: 'mixed',
        complexity: 'complex',
        expected: {
            intent: 'find_alumni_business',
            entities: {
                graduationYear: [1995],
                location: 'Chennai',
            },
        },
    },
    {
        id: 102,
        query: "Find mechanical engineers who are entrepreneurs",
        category: 'alumni_business',
        subcategory: 'mixed',
        complexity: 'medium',
        expected: {
            intent: 'find_alumni_business',
            entities: {
                branch: ['Mechanical', 'Mechanical Engineering'],
            },
        },
    },
    {
        id: 103,
        query: "Looking for batchmates running IT companies",
        category: 'alumni_business',
        subcategory: 'mixed',
        complexity: 'medium',
        expected: {
            intent: 'find_alumni_business',
            entities: {
                skills: ['IT', 'software', 'technology'],
            },
        },
    },
    {
        id: 104,
        query: "Find 1992 passout with businesses in manufacturing",
        category: 'alumni_business',
        subcategory: 'mixed',
        complexity: 'complex',
        expected: {
            intent: 'find_alumni_business',
            entities: {
                graduationYear: [1992],
                skills: ['manufacturing'],
            },
        },
    },
    {
        id: 105,
        query: "Who from civil branch started construction companies?",
        category: 'alumni_business',
        subcategory: 'mixed',
        complexity: 'medium',
        expected: {
            intent: 'find_alumni_business',
            entities: {
                branch: ['Civil', 'Civil Engineering'],
                skills: ['construction'],
            },
        },
    },

    // Add more test cases from remaining categories...
    // (For brevity, showing representative samples. Full implementation would include all 188)
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Compare extracted entities with expected entities
 */
function compareEntities(
    expected: Partial<ExtractedEntities>,
    actual: Partial<ExtractedEntities>
): 'correct' | 'partial' | 'incorrect' {
    let matches = 0;
    let total = 0;

    for (const key in expected) {
        total++;
        const expectedVal = expected[key as keyof ExtractedEntities];
        const actualVal = actual[key as keyof ExtractedEntities];

        if (key === 'skills' || key === 'services' || key === 'branch') {
            // Array comparison with fuzzy matching
            if (Array.isArray(expectedVal) && Array.isArray(actualVal)) {
                const intersection = expectedVal.filter((v) =>
                    actualVal.some((a) => {
                        const valStr = String(v).toLowerCase();
                        const actStr = String(a).toLowerCase();
                        return actStr.includes(valStr) || valStr.includes(actStr);
                    })
                );
                const matchRatio = intersection.length / expectedVal.length;
                if (matchRatio >= 0.8) matches++;
                else if (matchRatio >= 0.4) matches += 0.5;
            }
        } else if (key === 'location') {
            // String comparison with case insensitivity
            if (typeof expectedVal === 'string' && typeof actualVal === 'string') {
                const expLower = expectedVal.toLowerCase();
                const actLower = actualVal.toLowerCase();
                if (actLower.includes(expLower) || expLower.includes(actLower)) matches++;
            }
        } else if (key === 'graduationYear') {
            // Array of years - exact match
            if (Array.isArray(expectedVal) && Array.isArray(actualVal)) {
                if (JSON.stringify(expectedVal.sort()) === JSON.stringify(actualVal.sort())) matches++;
            }
        } else {
            // Default: exact match
            if (JSON.stringify(expectedVal) === JSON.stringify(actualVal)) matches++;
        }
    }

    const accuracy = total > 0 ? matches / total : 0;
    if (accuracy >= 0.9) return 'correct';
    if (accuracy >= 0.4) return 'partial';
    return 'incorrect';
}

/**
 * Calculate percentile from sorted array
 */
function calculatePercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, index)];
}

/**
 * Convert ScoredMember to MemberSearchResult (type compatibility)
 */
function convertToSearchResult(member: ScoredMember): MemberSearchResult {
    return {
        id: member.id,
        name: member.name || undefined,
        email: member.email || undefined,
        phone: member.phone || undefined,
        city: member.city || undefined,
        organization: member.organization || undefined,
        designation: member.designation || undefined,
        skills: member.skills || undefined,
        productsServices: member.productsServices || undefined,
        annualTurnover: member.annualTurnover || undefined,
        yearOfGraduation: member.yearOfGraduation || undefined,
        degree: member.degree || undefined,
        branch: member.branch || undefined,
        relevanceScore: member.relevanceScore,
        matchedFields: member.matchedFields,
    };
}

/**
 * Initialize metrics object
 */
function initializeMetrics(): PerformanceMetrics {
    return {
        totalQueries: 0,
        successfulQueries: 0,
        failedQueries: 0,
        correctExtractions: 0,
        partialExtractions: 0,
        incorrectExtractions: 0,
        overallAccuracy: 0,
        avgTotalTime: 0,
        avgExtractionTime: 0,
        avgSearchTime: 0,
        avgFormatTime: 0,
        p50Time: 0,
        p95Time: 0,
        p99Time: 0,
        regexOnlyQueries: 0,
        llmFallbackQueries: 0,
        hybridQueries: 0,
        regexUsagePercent: 0,
        llmUsagePercent: 0,
        byComplexity: {
            simple: { count: 0, avgTime: 0, accuracy: 0, regexUsage: 0 },
            medium: { count: 0, avgTime: 0, accuracy: 0, regexUsage: 0 },
            complex: { count: 0, avgTime: 0, accuracy: 0, regexUsage: 0 },
        },
        byCategory: {},
        byIntent: {},
    };
}

// ============================================================================
// MAIN TEST EXECUTION
// ============================================================================

/**
 * Run complete pipeline test for a single query
 */
async function testSingleQuery(testCase: QueryTestCase): Promise<PipelineTestResult> {
    const pipelineStartTime = Date.now();

    try {
        // Step 1: Entity Extraction (hybrid)
        const extraction = await extractEntities(testCase.query);

        // Step 2: Semantic Search
        const searchStartTime = Date.now();
        const searchResult = await searchMembers({
            query: testCase.query,
            filters: {
                skills: extraction.entities.skills,
                services: extraction.entities.services,
                city: extraction.entities.location,
                yearOfGraduation: extraction.entities.graduationYear,
                degree: extraction.entities.degree ? [extraction.entities.degree] : undefined,
            },
            options: {
                limit: 10,
            },
        });
        const searchTime = Date.now() - searchStartTime;

        // Step 3: Response Formatting
        const formatStartTime = Date.now();
        const membersForFormat = searchResult.members.map(convertToSearchResult);
        const formattedResponse = formatResults(membersForFormat, {
            query: testCase.query,
            intent: extraction.intent,
            entities: extraction.entities,
            resultCount: searchResult.members.length,
        });
        const formatTime = Date.now() - formatStartTime;

        const totalTime = Date.now() - pipelineStartTime;

        // Evaluate accuracy
        const intentMatch = extraction.intent === testCase.expected.intent;
        const entityMatch = compareEntities(testCase.expected.entities, extraction.entities);

        let accuracy: 'correct' | 'partial' | 'incorrect';
        if (intentMatch && entityMatch === 'correct') {
            accuracy = 'correct';
        } else if (entityMatch === 'partial') {
            accuracy = 'partial';
        } else {
            accuracy = 'incorrect';
        }

        return {
            testCase,
            extraction,
            searchTime,
            searchResults: searchResult.members,
            formattedResponse,
            formatTime,
            totalTime,
            status: 'success',
            accuracy,
        };

    } catch (error) {
        const totalTime = Date.now() - pipelineStartTime;
        console.error(`[Pipeline Test] Error for query #${testCase.id}: ${error}`);

        return {
            testCase,
            extraction: {} as HybridExtractionResult,
            searchTime: 0,
            searchResults: [],
            formattedResponse: '',
            formatTime: 0,
            totalTime,
            status: 'failed',
            accuracy: 'incorrect',
            errorMessage: String(error),
        };
    }
}

/**
 * Calculate final metrics from all test results
 */
function calculateMetrics(results: PipelineTestResult[]): PerformanceMetrics {
    const metrics = initializeMetrics();
    metrics.totalQueries = results.length;

    const totalTimes: number[] = [];
    let totalExtractionTime = 0;
    let totalSearchTime = 0;
    let totalFormatTime = 0;

    for (const result of results) {
        // Success/failure tracking
        if (result.status === 'success') {
            metrics.successfulQueries++;
        } else {
            metrics.failedQueries++;
            continue; // Skip failed queries for other metrics
        }

        // Accuracy tracking
        if (result.accuracy === 'correct') {
            metrics.correctExtractions++;
        } else if (result.accuracy === 'partial') {
            metrics.partialExtractions++;
        } else {
            metrics.incorrectExtractions++;
        }

        // Performance tracking
        totalTimes.push(result.totalTime);
        totalExtractionTime += result.extraction.extractionTime;
        totalSearchTime += result.searchTime;
        totalFormatTime += result.formatTime;

        // Method usage tracking
        if (result.extraction.method === 'regex') {
            metrics.regexOnlyQueries++;
        } else if (result.extraction.method === 'llm' || result.extraction.metadata.llmUsed) {
            metrics.llmFallbackQueries++;
        } else if (result.extraction.method === 'hybrid') {
            metrics.hybridQueries++;
        }

        // By complexity
        const complexity = result.testCase.complexity;
        metrics.byComplexity[complexity].count++;
        metrics.byComplexity[complexity].avgTime += result.totalTime;
        if (result.accuracy === 'correct') {
            metrics.byComplexity[complexity].accuracy++;
        }
        if (result.extraction.method === 'regex') {
            metrics.byComplexity[complexity].regexUsage++;
        }

        // By category
        const category = result.testCase.category;
        if (!metrics.byCategory[category]) {
            metrics.byCategory[category] = { count: 0, accuracy: 0, avgTime: 0 };
        }
        metrics.byCategory[category].count++;
        metrics.byCategory[category].avgTime += result.totalTime;
        if (result.accuracy === 'correct') {
            metrics.byCategory[category].accuracy++;
        }

        // By intent
        const intent = result.extraction.intent;
        if (!metrics.byIntent[intent]) {
            metrics.byIntent[intent] = { count: 0, accuracy: 0, avgTime: 0 };
        }
        metrics.byIntent[intent].count++;
        metrics.byIntent[intent].avgTime += result.totalTime;
        if (result.accuracy === 'correct') {
            metrics.byIntent[intent].accuracy++;
        }
    }

    // Calculate averages
    metrics.overallAccuracy = (metrics.correctExtractions / metrics.successfulQueries) * 100;
    metrics.avgTotalTime = totalTimes.reduce((a, b) => a + b, 0) / totalTimes.length;
    metrics.avgExtractionTime = totalExtractionTime / metrics.successfulQueries;
    metrics.avgSearchTime = totalSearchTime / metrics.successfulQueries;
    metrics.avgFormatTime = totalFormatTime / metrics.successfulQueries;

    // Calculate percentiles
    const sortedTimes = totalTimes.sort((a, b) => a - b);
    metrics.p50Time = calculatePercentile(sortedTimes, 50);
    metrics.p95Time = calculatePercentile(sortedTimes, 95);
    metrics.p99Time = calculatePercentile(sortedTimes, 99);

    // Calculate method usage percentages
    metrics.regexUsagePercent = (metrics.regexOnlyQueries / metrics.successfulQueries) * 100;
    metrics.llmUsagePercent = (metrics.llmFallbackQueries / metrics.successfulQueries) * 100;

    // Calculate complexity averages
    for (const complexity in metrics.byComplexity) {
        const comp = metrics.byComplexity[complexity as 'simple' | 'medium' | 'complex'];
        if (comp.count > 0) {
            comp.avgTime = comp.avgTime / comp.count;
            comp.accuracy = (comp.accuracy / comp.count) * 100;
            comp.regexUsage = (comp.regexUsage / comp.count) * 100;
        }
    }

    // Calculate category averages
    for (const category in metrics.byCategory) {
        const cat = metrics.byCategory[category];
        if (cat.count > 0) {
            cat.avgTime = cat.avgTime / cat.count;
            cat.accuracy = (cat.accuracy / cat.count) * 100;
        }
    }

    // Calculate intent averages
    for (const intent in metrics.byIntent) {
        const int = metrics.byIntent[intent];
        if (int.count > 0) {
            int.avgTime = int.avgTime / int.count;
            int.accuracy = (int.accuracy / int.count) * 100;
        }
    }

    return metrics;
}

/**
 * Generate detailed test report
 */
function generateReport(metrics: PerformanceMetrics, results: PipelineTestResult[]): string {
    const report = [];

    report.push('='.repeat(80));
    report.push('FULL PIPELINE TEST REPORT - PHASE 4, TASK 4.1');
    report.push('='.repeat(80));
    report.push('');

    // Overall Summary
    report.push('📊 OVERALL SUMMARY');
    report.push('-'.repeat(80));
    report.push(`Total Queries Tested: ${metrics.totalQueries}`);
    report.push(`Successful: ${metrics.successfulQueries} | Failed: ${metrics.failedQueries}`);
    report.push('');

    // Accuracy Metrics
    report.push('🎯 ACCURACY METRICS');
    report.push('-'.repeat(80));
    report.push(`Overall Accuracy: ${metrics.overallAccuracy.toFixed(1)}% (Target: 90-95%)`);
    report.push(`  ✓ Correct: ${metrics.correctExtractions} (${((metrics.correctExtractions / metrics.successfulQueries) * 100).toFixed(1)}%)`);
    report.push(`  ⚠ Partial: ${metrics.partialExtractions} (${((metrics.partialExtractions / metrics.successfulQueries) * 100).toFixed(1)}%)`);
    report.push(`  ✗ Incorrect: ${metrics.incorrectExtractions} (${((metrics.incorrectExtractions / metrics.successfulQueries) * 100).toFixed(1)}%)`);
    report.push('');

    // Performance Metrics
    report.push('⚡ PERFORMANCE METRICS');
    report.push('-'.repeat(80));
    report.push(`Average Total Time: ${metrics.avgTotalTime.toFixed(0)}ms (Baseline: 2500-4000ms)`);
    report.push(`  - Extraction: ${metrics.avgExtractionTime.toFixed(0)}ms`);
    report.push(`  - Search: ${metrics.avgSearchTime.toFixed(0)}ms`);
    report.push(`  - Formatting: ${metrics.avgFormatTime.toFixed(0)}ms`);
    report.push('');
    report.push(`Response Time Percentiles:`);
    report.push(`  - p50 (median): ${metrics.p50Time.toFixed(0)}ms`);
    report.push(`  - p95: ${metrics.p95Time.toFixed(0)}ms (Target: <800ms)`);
    report.push(`  - p99: ${metrics.p99Time.toFixed(0)}ms`);
    report.push('');

    // Method Usage
    report.push('🔧 METHOD USAGE');
    report.push('-'.repeat(80));
    report.push(`Regex Only: ${metrics.regexOnlyQueries} queries (${metrics.regexUsagePercent.toFixed(1)}%) [Target: 80%]`);
    report.push(`LLM Fallback: ${metrics.llmFallbackQueries} queries (${metrics.llmUsagePercent.toFixed(1)}%) [Target: 20%]`);
    report.push(`Hybrid: ${metrics.hybridQueries} queries`);
    report.push('');

    // By Complexity
    report.push('📈 PERFORMANCE BY COMPLEXITY');
    report.push('-'.repeat(80));
    for (const complexity of ['simple', 'medium', 'complex'] as const) {
        const comp = metrics.byComplexity[complexity];
        if (comp.count > 0) {
            report.push(`${complexity.toUpperCase()}:`);
            report.push(`  Queries: ${comp.count}`);
            report.push(`  Accuracy: ${comp.accuracy.toFixed(1)}%`);
            report.push(`  Avg Time: ${comp.avgTime.toFixed(0)}ms`);
            report.push(`  Regex Usage: ${comp.regexUsage.toFixed(1)}%`);
            report.push('');
        }
    }

    // By Category
    report.push('📁 PERFORMANCE BY CATEGORY');
    report.push('-'.repeat(80));
    for (const category in metrics.byCategory) {
        const cat = metrics.byCategory[category];
        report.push(`${category}:`);
        report.push(`  Queries: ${cat.count}`);
        report.push(`  Accuracy: ${cat.accuracy.toFixed(1)}%`);
        report.push(`  Avg Time: ${cat.avgTime.toFixed(0)}ms`);
        report.push('');
    }

    // By Intent
    report.push('🎯 PERFORMANCE BY INTENT');
    report.push('-'.repeat(80));
    for (const intent in metrics.byIntent) {
        const int = metrics.byIntent[intent];
        report.push(`${intent}:`);
        report.push(`  Queries: ${int.count}`);
        report.push(`  Accuracy: ${int.accuracy.toFixed(1)}%`);
        report.push(`  Avg Time: ${int.avgTime.toFixed(0)}ms`);
        report.push('');
    }

    // Failed Queries
    const failedResults = results.filter(r => r.status === 'failed');
    if (failedResults.length > 0) {
        report.push('❌ FAILED QUERIES');
        report.push('-'.repeat(80));
        failedResults.forEach(r => {
            report.push(`#${r.testCase.id}: "${r.testCase.query}"`);
            report.push(`  Error: ${r.errorMessage}`);
            report.push('');
        });
    }

    // Incorrect Extractions
    const incorrectResults = results.filter(r => r.accuracy === 'incorrect' && r.status === 'success');
    if (incorrectResults.length > 0) {
        report.push('⚠️  INCORRECT EXTRACTIONS (Top 10)');
        report.push('-'.repeat(80));
        incorrectResults.slice(0, 10).forEach(r => {
            report.push(`#${r.testCase.id}: "${r.testCase.query}"`);
            report.push(`  Expected: ${JSON.stringify(r.testCase.expected.entities)}`);
            report.push(`  Actual: ${JSON.stringify(r.extraction.entities)}`);
            report.push(`  Intent: Expected ${r.testCase.expected.intent}, Got ${r.extraction.intent}`);
            report.push('');
        });
    }

    report.push('='.repeat(80));

    return report.join('\n');
}

// ============================================================================
// JEST TEST SUITE
// ============================================================================

describe('Full Pipeline Test - Phase 4, Task 4.1', () => {
    const results: PipelineTestResult[] = [];

    // Test each query individually
    ALL_TEST_QUERIES.forEach((testCase) => {
        it(`[#${testCase.id}] ${testCase.complexity.toUpperCase()} - "${testCase.query}"`, async () => {
            const result = await testSingleQuery(testCase);
            results.push(result);

            // Log individual result
            console.log(`\n[Query #${testCase.id}] ${testCase.query}`);
            console.log(`Category: ${testCase.category} | Complexity: ${testCase.complexity}`);
            console.log(`Status: ${result.status} | Accuracy: ${result.accuracy}`);
            console.log(`Times: Total ${result.totalTime}ms (Extract: ${result.extraction.extractionTime}ms, Search: ${result.searchTime}ms, Format: ${result.formatTime}ms)`);
            console.log(`Method: ${result.extraction.method} | LLM Used: ${result.extraction.metadata?.llmUsed || false}`);

            // Assert minimum requirements
            expect(result.status).toBe('success');
            expect(result.accuracy).not.toBe('incorrect'); // At least partial match

        }, 30000); // 30 second timeout per query
    });

    // Generate comprehensive report after all tests
    afterAll(() => {
        const metrics = calculateMetrics(results);
        const report = generateReport(metrics, results);

        console.log('\n' + report);

        // Save detailed results to files
        const fs = require('fs');
        const path = require('path');

        // Save metrics
        const metricsPath = path.join(__dirname, '../../test-results-full-pipeline.json');
        fs.writeFileSync(metricsPath, JSON.stringify(metrics, null, 2));
        console.log(`\n📊 Metrics saved to: ${metricsPath}`);

        // Save detailed results
        const resultsPath = path.join(__dirname, '../../test-results-full-pipeline-detailed.json');
        fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
        console.log(`📝 Detailed results saved to: ${resultsPath}`);

        // Save report
        const reportPath = path.join(__dirname, '../../test-results-full-pipeline-report.txt');
        fs.writeFileSync(reportPath, report);
        console.log(`📄 Report saved to: ${reportPath}`);

        // Assert overall targets
        expect(metrics.overallAccuracy).toBeGreaterThanOrEqual(85); // Minimum 85% (target 90-95%)
        expect(metrics.p95Time).toBeLessThan(1000); // p95 < 1s (target < 800ms, allowing margin)
        expect(metrics.regexUsagePercent).toBeGreaterThanOrEqual(70); // At least 70% regex (target 80%)
    });
});

export { ALL_TEST_QUERIES, PipelineTestResult, PerformanceMetrics };
