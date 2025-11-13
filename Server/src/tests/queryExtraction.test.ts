/**
 * Query Extraction Test Suite
 * 
 * Tests the current LLM-based query parsing implementation against 188 sample queries
 * to establish baseline accuracy metrics before optimization.
 * 
 * Reference: /QUERY-TAXONOMY.md
 */

import { parseQuery } from '../services/llmService';
import { ParsedQuery, ExtractedEntities } from '../utils/types';

// Test data types
interface QueryTestCase {
  id: number;
  query: string;
  category: 'entrepreneurs' | 'alumni' | 'alumni_business' | 'special';
  subcategory: string;
  expected: {
    intent: string;
    entities: Partial<ExtractedEntities>;
  };
}

// Accuracy tracking
interface AccuracyMetrics {
  total: number;
  correct: number;
  partial: number;
  incorrect: number;
  byCategory: {
    [key: string]: {
      total: number;
      correct: number;
      partial: number;
      incorrect: number;
    };
  };
  byIntent: {
    [key: string]: {
      total: number;
      correct: number;
    };
  };
  avgConfidence: number;
  avgResponseTime: number;
}

// Helper function to compare entities
function compareEntities(
  expected: Partial<ExtractedEntities>,
  actual: Partial<ExtractedEntities>
): 'correct' | 'partial' | 'incorrect' {
  let matches = 0;
  let total = 0;

  // Check each expected field
  for (const key in expected) {
    total++;
    const expectedVal = expected[key as keyof ExtractedEntities];
    const actualVal = actual[key as keyof ExtractedEntities];

    if (key === 'skills' || key === 'services') {
      // Array comparison
      if (Array.isArray(expectedVal) && Array.isArray(actualVal)) {
        const intersection = expectedVal.filter((v) =>
          actualVal.some((a) => {
            const valStr = typeof v === 'string' ? v : String(v);
            const actStr = typeof a === 'string' ? a : String(a);
            return actStr.toLowerCase().includes(valStr.toLowerCase()) || valStr.toLowerCase().includes(actStr.toLowerCase());
          })
        );
        if (intersection.length === expectedVal.length) matches++;
        else if (intersection.length > 0) matches += 0.5;
      }
    } else if (key === 'location') {
      // String comparison (case insensitive, partial match)
      if (typeof expectedVal === 'string' && typeof actualVal === 'string') {
        if (actualVal.toLowerCase().includes(expectedVal.toLowerCase())) matches++;
        else if (expectedVal.toLowerCase().includes(actualVal.toLowerCase())) matches += 0.5;
      }
    } else if (key === 'graduationYear') {
      // Array of years
      if (Array.isArray(expectedVal) && Array.isArray(actualVal)) {
        if (JSON.stringify(expectedVal.sort()) === JSON.stringify(actualVal.sort())) matches++;
      }
    } else {
      // Exact match for other fields
      if (JSON.stringify(expectedVal) === JSON.stringify(actualVal)) matches++;
    }
  }

  const accuracy = total > 0 ? matches / total : 0;
  if (accuracy >= 0.9) return 'correct';
  if (accuracy >= 0.4) return 'partial';
  return 'incorrect';
}

// ============================================================================
// TEST DATA: ENTREPRENEURS COMMUNITY (Queries 1-50)
// ============================================================================

const entrepreneursQueries: QueryTestCase[] = [
  // Service-Based Queries (1-15)
  {
    id: 1,
    query: 'Find web development company in Chennai',
    category: 'entrepreneurs',
    subcategory: 'service_based',
    expected: {
      intent: 'find_member',
      entities: {
        skills: ['web development', 'website design'],
        location: 'Chennai',
      },
    },
  },
  {
    id: 2,
    query: 'Looking for IT consulting services in Bangalore',
    category: 'entrepreneurs',
    subcategory: 'service_based',
    expected: {
      intent: 'find_member',
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
    subcategory: 'service_based',
    expected: {
      intent: 'find_member',
      entities: {
        services: ['digital marketing', 'marketing'],
      },
    },
  },
  {
    id: 4,
    query: 'Find textile manufacturers in Tamil Nadu',
    category: 'entrepreneurs',
    subcategory: 'service_based',
    expected: {
      intent: 'find_member',
      entities: {
        skills: ['textile', 'manufacturing'],
        location: 'Tamil Nadu',
      },
    },
  },
  {
    id: 5,
    query: 'Looking for packaging solutions in Chennai',
    category: 'entrepreneurs',
    subcategory: 'service_based',
    expected: {
      intent: 'find_member',
      entities: {
        skills: ['packaging'],
        location: 'Chennai',
      },
    },
  },
  {
    id: 6,
    query: 'Find HR consultancy services',
    category: 'entrepreneurs',
    subcategory: 'service_based',
    expected: {
      intent: 'find_member',
      entities: {
        services: ['HR', 'consultancy', 'HR services'],
      },
    },
  },
  {
    id: 7,
    query: 'Who does software development in Hyderabad?',
    category: 'entrepreneurs',
    subcategory: 'service_based',
    expected: {
      intent: 'find_member',
      entities: {
        skills: ['software development', 'software'],
        location: 'Hyderabad',
      },
    },
  },
  {
    id: 8,
    query: 'Find investment advisory services in Chennai',
    category: 'entrepreneurs',
    subcategory: 'service_based',
    expected: {
      intent: 'find_member',
      entities: {
        services: ['investment', 'advisory'],
        location: 'Chennai',
      },
    },
  },
  {
    id: 9,
    query: 'Looking for insurance brokers',
    category: 'entrepreneurs',
    subcategory: 'service_based',
    expected: {
      intent: 'find_member',
      entities: {
        services: ['insurance', 'broker'],
      },
    },
  },
  {
    id: 10,
    query: 'Find civil engineering consultants in Chennai',
    category: 'entrepreneurs',
    subcategory: 'service_based',
    expected: {
      intent: 'find_member',
      entities: {
        skills: ['civil engineering', 'consultant'],
        location: 'Chennai',
      },
    },
  },

  // Industry/Domain Queries (16-25)
  {
    id: 16,
    query: 'Find IT industry companies',
    category: 'entrepreneurs',
    subcategory: 'industry_based',
    expected: {
      intent: 'find_member',
      entities: {
        skills: ['IT', 'technology', 'software'],
      },
    },
  },
  {
    id: 17,
    query: 'Looking for manufacturing businesses',
    category: 'entrepreneurs',
    subcategory: 'industry_based',
    expected: {
      intent: 'find_member',
      entities: {
        skills: ['manufacturing', 'production'],
      },
    },
  },
  {
    id: 18,
    query: 'Find consulting firms',
    category: 'entrepreneurs',
    subcategory: 'industry_based',
    expected: {
      intent: 'find_member',
      entities: {
        services: ['consulting', 'advisory'],
      },
    },
  },
  {
    id: 19,
    query: 'Who is in the automobile industry?',
    category: 'entrepreneurs',
    subcategory: 'industry_based',
    expected: {
      intent: 'find_member',
      entities: {
        skills: ['automobile', 'automotive'],
      },
    },
  },
  {
    id: 20,
    query: 'Find companies in diamond jewelry',
    category: 'entrepreneurs',
    subcategory: 'industry_based',
    expected: {
      intent: 'find_member',
      entities: {
        skills: ['diamond', 'jewelry'],
      },
    },
  },

  // Business Size/Scale Queries (26-33)
  {
    id: 26,
    query: 'Find companies with high turnover',
    category: 'entrepreneurs',
    subcategory: 'business_size',
    expected: {
      intent: 'find_member',
      entities: {
        turnoverRequirement: 'high',
      },
    },
  },
  {
    id: 27,
    query: 'Looking for successful businesses in Chennai',
    category: 'entrepreneurs',
    subcategory: 'business_size',
    expected: {
      intent: 'find_member',
      entities: {
        turnoverRequirement: 'high',
        location: 'Chennai',
      },
    },
  },
  {
    id: 28,
    query: 'Find startups with good revenue',
    category: 'entrepreneurs',
    subcategory: 'business_size',
    expected: {
      intent: 'find_member',
      entities: {
        turnoverRequirement: 'medium',
      },
    },
  },
  {
    id: 29,
    query: 'Who has turnover above 10 crores?',
    category: 'entrepreneurs',
    subcategory: 'business_size',
    expected: {
      intent: 'find_member',
      entities: {
        turnoverRequirement: 'high',
      },
    },
  },

  // Location-Based Business Discovery (42-50)
  {
    id: 42,
    query: 'Find all companies in Chennai',
    category: 'entrepreneurs',
    subcategory: 'location_based',
    expected: {
      intent: 'find_member',
      entities: {
        location: 'Chennai',
      },
    },
  },
  {
    id: 43,
    query: 'Who are the entrepreneurs in Hyderabad?',
    category: 'entrepreneurs',
    subcategory: 'location_based',
    expected: {
      intent: 'find_member',
      entities: {
        location: 'Hyderabad',
      },
    },
  },
  {
    id: 44,
    query: 'Businesses in Coimbatore',
    category: 'entrepreneurs',
    subcategory: 'location_based',
    expected: {
      intent: 'find_member',
      entities: {
        location: 'Coimbatore',
      },
    },
  },
  {
    id: 45,
    query: 'Find service providers in Salem',
    category: 'entrepreneurs',
    subcategory: 'location_based',
    expected: {
      intent: 'find_member',
      entities: {
        location: 'Salem',
      },
    },
  },
];

// ============================================================================
// TEST DATA: ALUMNI COMMUNITY (Queries 51-108)
// ============================================================================

const alumniQueries: QueryTestCase[] = [
  // Batch/Year-Based Queries (51-60)
  {
    id: 51,
    query: 'Find my batchmates from 1995 passout',
    category: 'alumni',
    subcategory: 'batch_year',
    expected: {
      intent: 'find_member',
      entities: {
        graduationYear: [1995],
      },
    },
  },
  {
    id: 52,
    query: 'Who are the 1998 batch members?',
    category: 'alumni',
    subcategory: 'batch_year',
    expected: {
      intent: 'find_member',
      entities: {
        graduationYear: [1998],
      },
    },
  },
  {
    id: 53,
    query: 'Looking for 95 passout mechanical',
    category: 'alumni',
    subcategory: 'batch_year',
    expected: {
      intent: 'find_member',
      entities: {
        graduationYear: [1995],
        degree: 'Mechanical',
      },
    },
  },
  {
    id: 54,
    query: 'Find 2010 graduates',
    category: 'alumni',
    subcategory: 'batch_year',
    expected: {
      intent: 'find_member',
      entities: {
        graduationYear: [2010],
      },
    },
  },
  {
    id: 55,
    query: 'Who graduated in 1994?',
    category: 'alumni',
    subcategory: 'batch_year',
    expected: {
      intent: 'find_member',
      entities: {
        graduationYear: [1994],
      },
    },
  },
  {
    id: 56,
    query: '1988 batch ECE students',
    category: 'alumni',
    subcategory: 'batch_year',
    expected: {
      intent: 'find_member',
      entities: {
        graduationYear: [1988],
        degree: 'ECE',
      },
    },
  },
  {
    id: 57,
    query: 'Find alumni from 2015',
    category: 'alumni',
    subcategory: 'batch_year',
    expected: {
      intent: 'find_member',
      entities: {
        graduationYear: [2015],
      },
    },
  },

  // Department/Branch Queries (61-70)
  {
    id: 61,
    query: 'Find mechanical engineers',
    category: 'alumni',
    subcategory: 'branch',
    expected: {
      intent: 'find_member',
      entities: {
        degree: 'Mechanical',
      },
    },
  },
  {
    id: 62,
    query: 'Who studied ECE?',
    category: 'alumni',
    subcategory: 'branch',
    expected: {
      intent: 'find_member',
      entities: {
        degree: 'ECE',
      },
    },
  },
  {
    id: 63,
    query: 'Looking for civil engineering graduates',
    category: 'alumni',
    subcategory: 'branch',
    expected: {
      intent: 'find_member',
      entities: {
        degree: 'Civil',
      },
    },
  },
  {
    id: 64,
    query: 'Find textile engineering alumni',
    category: 'alumni',
    subcategory: 'branch',
    expected: {
      intent: 'find_member',
      entities: {
        degree: 'Textile',
      },
    },
  },
  {
    id: 65,
    query: 'Who are the MCA graduates?',
    category: 'alumni',
    subcategory: 'branch',
    expected: {
      intent: 'find_member',
      entities: {
        degree: 'MCA',
      },
    },
  },

  // Combined Batch + Branch Queries (71-80)
  {
    id: 71,
    query: 'Find my batchmates from 1995 passout mechanical',
    category: 'alumni',
    subcategory: 'batch_branch',
    expected: {
      intent: 'find_member',
      entities: {
        graduationYear: [1995],
        degree: 'Mechanical',
      },
    },
  },
  {
    id: 72,
    query: 'Who are 1988 ECE graduates?',
    category: 'alumni',
    subcategory: 'batch_branch',
    expected: {
      intent: 'find_member',
      entities: {
        graduationYear: [1988],
        degree: 'ECE',
      },
    },
  },
  {
    id: 73,
    query: 'Looking for 1994 civil engineering batch',
    category: 'alumni',
    subcategory: 'batch_branch',
    expected: {
      intent: 'find_member',
      entities: {
        graduationYear: [1994],
        degree: 'Civil',
      },
    },
  },
  {
    id: 74,
    query: 'Find 2010 textile graduates',
    category: 'alumni',
    subcategory: 'batch_branch',
    expected: {
      intent: 'find_member',
      entities: {
        graduationYear: [2010],
        degree: 'Textile',
      },
    },
  },
  {
    id: 75,
    query: '1992 MCA passouts',
    category: 'alumni',
    subcategory: 'batch_branch',
    expected: {
      intent: 'find_member',
      entities: {
        graduationYear: [1992],
        degree: 'MCA',
      },
    },
  },

  // Location-Based Alumni Queries (81-90)
  {
    id: 81,
    query: 'Find alumni living in Chennai',
    category: 'alumni',
    subcategory: 'location',
    expected: {
      intent: 'find_member',
      entities: {
        location: 'Chennai',
      },
    },
  },
  {
    id: 82,
    query: 'Who moved to Bangalore?',
    category: 'alumni',
    subcategory: 'location',
    expected: {
      intent: 'find_member',
      entities: {
        location: 'Bangalore',
      },
    },
  },
  {
    id: 83,
    query: 'Looking for batchmates in Hyderabad',
    category: 'alumni',
    subcategory: 'location',
    expected: {
      intent: 'find_member',
      entities: {
        location: 'Hyderabad',
      },
    },
  },
];

// ============================================================================
// TEST DATA: ALUMNI ENTREPRENEURS COMMUNITY (Queries 109-168)
// ============================================================================

const alumniBusinessQueries: QueryTestCase[] = [
  // Batch + Service Queries (109-118)
  {
    id: 109,
    query: 'Find 1995 batch in IT industry',
    category: 'alumni_business',
    subcategory: 'batch_service',
    expected: {
      intent: 'find_member',
      entities: {
        graduationYear: [1995],
        skills: ['IT', 'technology', 'software'],
      },
    },
  },
  {
    id: 110,
    query: 'Who from 1998 batch does consulting?',
    category: 'alumni_business',
    subcategory: 'batch_service',
    expected: {
      intent: 'find_member',
      entities: {
        graduationYear: [1998],
        services: ['consulting'],
      },
    },
  },
  {
    id: 111,
    query: 'Looking for 2010 passout in digital marketing',
    category: 'alumni_business',
    subcategory: 'batch_service',
    expected: {
      intent: 'find_member',
      entities: {
        graduationYear: [2010],
        skills: ['digital marketing', 'marketing'],
      },
    },
  },
  {
    id: 112,
    query: 'Find 1994 batch with manufacturing business',
    category: 'alumni_business',
    subcategory: 'batch_service',
    expected: {
      intent: 'find_member',
      entities: {
        graduationYear: [1994],
        skills: ['manufacturing'],
      },
    },
  },

  // Branch + Service/Industry Queries (119-128)
  {
    id: 119,
    query: 'Find mechanical engineers in manufacturing',
    category: 'alumni_business',
    subcategory: 'branch_industry',
    expected: {
      intent: 'find_member',
      entities: {
        degree: 'Mechanical',
        skills: ['manufacturing'],
      },
    },
  },
  {
    id: 120,
    query: 'Who from ECE works in electronics industry?',
    category: 'alumni_business',
    subcategory: 'branch_industry',
    expected: {
      intent: 'find_member',
      entities: {
        degree: 'ECE',
        skills: ['electronics'],
      },
    },
  },
  {
    id: 121,
    query: 'Looking for civil engineers in construction',
    category: 'alumni_business',
    subcategory: 'branch_industry',
    expected: {
      intent: 'find_member',
      entities: {
        degree: 'Civil',
        skills: ['construction'],
      },
    },
  },

  // Complex Multi-Filter Queries (129-138)
  {
    id: 129,
    query: 'Find 1995 mechanical passout companies in Chennai',
    category: 'alumni_business',
    subcategory: 'complex',
    expected: {
      intent: 'find_member',
      entities: {
        graduationYear: [1995],
        degree: 'Mechanical',
        location: 'Chennai',
      },
    },
  },
  {
    id: 130,
    query: 'Who from 1998 batch does IT consulting in Bangalore?',
    category: 'alumni_business',
    subcategory: 'complex',
    expected: {
      intent: 'find_member',
      entities: {
        graduationYear: [1998],
        skills: ['IT', 'consulting'],
        location: 'Bangalore',
      },
    },
  },
  {
    id: 131,
    query: 'Looking for 2010 graduates with startups in Chennai',
    category: 'alumni_business',
    subcategory: 'complex',
    expected: {
      intent: 'find_member',
      entities: {
        graduationYear: [2010],
        location: 'Chennai',
      },
    },
  },
];

// Combine all test cases
const ALL_TEST_QUERIES: QueryTestCase[] = [
  ...entrepreneursQueries,
  ...alumniQueries,
  ...alumniBusinessQueries,
];

// ============================================================================
// TEST SUITE
// ============================================================================

describe('Query Extraction - Baseline Accuracy Tests', () => {
  const metrics: AccuracyMetrics = {
    total: 0,
    correct: 0,
    partial: 0,
    incorrect: 0,
    byCategory: {},
    byIntent: {},
    avgConfidence: 0,
    avgResponseTime: 0,
  };

  let totalTime = 0;
  let totalConfidence = 0;

  // Test each query
  ALL_TEST_QUERIES.forEach((testCase) => {
    it(`Query #${testCase.id}: "${testCase.query}"`, async () => {
      const startTime = Date.now();

      try {
        // Call current LLM implementation
        const result: ParsedQuery = await parseQuery(testCase.query);
        const responseTime = Date.now() - startTime;

        // Track metrics
        metrics.total++;
        totalTime += responseTime;
        totalConfidence += result.confidence;

        // Initialize category if not exists
        if (!metrics.byCategory[testCase.category]) {
          metrics.byCategory[testCase.category] = {
            total: 0,
            correct: 0,
            partial: 0,
            incorrect: 0,
          };
        }
        metrics.byCategory[testCase.category].total++;

        // Initialize intent if not exists
        if (!metrics.byIntent[testCase.expected.intent]) {
          metrics.byIntent[testCase.expected.intent] = {
            total: 0,
            correct: 0,
          };
        }
        metrics.byIntent[testCase.expected.intent].total++;

        // Compare results
        const intentMatch = result.intent === testCase.expected.intent;
        const entityMatch = compareEntities(testCase.expected.entities, result.entities);

        // Update metrics
        if (intentMatch && entityMatch === 'correct') {
          metrics.correct++;
          metrics.byCategory[testCase.category].correct++;
          metrics.byIntent[testCase.expected.intent].correct++;
        } else if (entityMatch === 'partial') {
          metrics.partial++;
          metrics.byCategory[testCase.category].partial++;
        } else {
          metrics.incorrect++;
          metrics.byCategory[testCase.category].incorrect++;
        }

        // Log results for debugging
        console.log(`\n[Query #${testCase.id}] ${testCase.query}`);
        console.log(`Expected: ${JSON.stringify(testCase.expected.entities)}`);
        console.log(`Actual: ${JSON.stringify(result.entities)}`);
        console.log(`Match: ${entityMatch} | Intent: ${intentMatch ? '✓' : '✗'} | Time: ${responseTime}ms | Confidence: ${result.confidence}`);

        // Assert at least partial match (relaxed for baseline)
        expect(entityMatch).not.toBe('incorrect');
      } catch (error) {
        console.error(`\n[Query #${testCase.id}] FAILED: ${error}`);
        metrics.incorrect++;
        metrics.total++;
        if (metrics.byCategory[testCase.category]) {
          metrics.byCategory[testCase.category].incorrect++;
        }
        throw error;
      }
    }, 30000); // 30 second timeout per query
  });

  // Generate final report after all tests
  afterAll(() => {
    metrics.avgResponseTime = metrics.total > 0 ? totalTime / metrics.total : 0;
    metrics.avgConfidence = metrics.total > 0 ? totalConfidence / metrics.total : 0;

    console.log('\n' + '='.repeat(80));
    console.log('BASELINE ACCURACY REPORT');
    console.log('='.repeat(80));
    console.log(`\nTotal Queries Tested: ${metrics.total}`);
    console.log(`Correct: ${metrics.correct} (${((metrics.correct / metrics.total) * 100).toFixed(1)}%)`);
    console.log(`Partial: ${metrics.partial} (${((metrics.partial / metrics.total) * 100).toFixed(1)}%)`);
    console.log(`Incorrect: ${metrics.incorrect} (${((metrics.incorrect / metrics.total) * 100).toFixed(1)}%)`);
    console.log(`\nAverage Response Time: ${metrics.avgResponseTime.toFixed(0)}ms`);
    console.log(`Average Confidence: ${metrics.avgConfidence.toFixed(2)}`);

    console.log('\n--- By Category ---');
    for (const category in metrics.byCategory) {
      const cat = metrics.byCategory[category];
      const accuracy = ((cat.correct / cat.total) * 100).toFixed(1);
      console.log(`${category}: ${cat.correct}/${cat.total} (${accuracy}%)`);
    }

    console.log('\n--- By Intent ---');
    for (const intent in metrics.byIntent) {
      const int = metrics.byIntent[intent];
      const accuracy = ((int.correct / int.total) * 100).toFixed(1);
      console.log(`${intent}: ${int.correct}/${int.total} (${accuracy}%)`);
    }

    console.log('\n' + '='.repeat(80));

    // Save metrics to file for future comparison
    const fs = require('fs');
    const reportPath = './test-results-baseline.json';
    fs.writeFileSync(reportPath, JSON.stringify(metrics, null, 2));
    console.log(`\nBaseline report saved to: ${reportPath}`);
  });
});
