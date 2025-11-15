/**
 * Test Suite: Response Formatter (Task 3.1)
 * 
 * Tests intent-based response formatting without LLM calls.
 * Validates template-based formatting for all intent types.
 * 
 * Test Categories:
 * 1. Business results formatting
 * 2. Peer/alumni results formatting
 * 3. Specific person formatting
 * 4. Alumni business formatting
 * 5. Empty results handling
 * 6. Performance metrics
 * 
 * Reference: TODO_queryOptimisation.md (Task 3.1)
 */

import {
    formatResults,
    formatBusinessResults,
    formatPeerResults,
    formatSpecificPersonResults,
    formatAlumniBusinessResults,
    formatGenericResults,
    formatEmptyResults,
    formatTurnover,
    highlightMatchedFields,
    FormatterContext
} from '../services/responseFormatter';
import { MemberSearchResult } from '../utils/types';

// ============================================================================
// TEST DATA
// ============================================================================

const sampleBusinessResults: MemberSearchResult[] = [
    {
        id: '1',
        name: 'Sivakumar',
        organization: 'USAM Technology Solutions Pvt Ltd',
        city: 'Chennai',
        productsServices: 'IT infrastructure solutions, CAD Engineering',
        phone: '919383999901',
        email: 'sivakumar@usam.in',
        annualTurnover: 150000000, // 15 Cr
        matchedFields: ['services', 'location']
    },
    {
        id: '2',
        name: 'Rajesh Kumar',
        organization: 'WebTech Solutions',
        city: 'Bangalore',
        productsServices: 'Web development, Mobile apps',
        phone: '919876543210',
        email: 'rajesh@webtech.com',
        annualTurnover: 50000000 // 5 Cr
    }
];

const sampleAlumniResults: MemberSearchResult[] = [
    {
        id: '1',
        name: 'John Doe',
        yearOfGraduation: 1995,
        degree: 'B.E',
        branch: 'Mechanical',
        organization: 'ABC Corp',
        designation: 'Senior Engineer',
        city: 'Chennai',
        phone: '919876543210',
        email: 'john@example.com'
    },
    {
        id: '2',
        name: 'Jane Smith',
        yearOfGraduation: 1995,
        degree: 'B.E',
        branch: 'Mechanical',
        organization: 'XYZ Ltd',
        designation: 'Manager',
        city: 'Bangalore',
        phone: '919876543211',
        email: 'jane@example.com'
    }
];

const samplePersonResult: MemberSearchResult[] = [
    {
        id: '1',
        name: 'Sivakumar',
        organization: 'USAM Technology Solutions',
        designation: 'CEO',
        yearOfGraduation: 1992,
        degree: 'B.E',
        branch: 'Mechanical',
        city: 'Chennai',
        skills: 'CAD, Engineering, Management',
        productsServices: 'IT infrastructure, CAD solutions',
        phone: '919383999901',
        email: 'sivakumar@usam.in',
        annualTurnover: 150000000
    }
];

describe('Response Formatter - Task 3.1', () => {

    // ============================================================================
    // BUSINESS RESULTS FORMATTING
    // ============================================================================

    describe('Business Results Formatting', () => {

        test('should format business results with all fields', () => {
            const context: FormatterContext = {
                query: 'Find IT companies in Chennai',
                intent: 'find_business',
                entities: {
                    services: ['IT infrastructure'],
                    location: 'Chennai'
                },
                resultCount: 2
            };

            const result = formatBusinessResults(sampleBusinessResults, context);

            expect(result).toContain('USAM Technology Solutions');
            expect(result).toContain('Chennai');
            expect(result).toContain('IT infrastructure solutions');
            expect(result).toContain('919383999901');
            expect(result).toContain('sivakumar@usam.in');
            expect(result).toContain('₹15.0 Cr'); // Turnover formatted
            expect(result).toContain('Matched: services, location');
        });

        test('should format business header with context', () => {
            const context: FormatterContext = {
                query: 'Find web development companies in Bangalore',
                intent: 'find_business',
                entities: {
                    services: ['web development'],
                    location: 'Bangalore'
                },
                resultCount: 2
            };

            const result = formatBusinessResults(sampleBusinessResults, context);

            expect(result).toContain('web development');
            expect(result).toContain('companies');
            expect(result).toContain('Bangalore');
            expect(result).toContain('(2 results)');
        });

        test('should handle business results without turnover', () => {
            const results: MemberSearchResult[] = [{
                id: '1',
                name: 'Test Company',
                organization: 'Test Org',
                city: 'Mumbai',
                productsServices: 'Consulting'
            }];

            const context: FormatterContext = {
                query: 'Find consulting companies',
                intent: 'find_business',
                entities: {},
                resultCount: 1
            };

            const result = formatBusinessResults(results, context);

            expect(result).toContain('Test Org'); // Uses organization name, not member name
            expect(result).not.toContain('Turnover');
        });

        test('should limit to 10 results', () => {
            const manyResults = Array(20).fill(null).map((_, i) => ({
                id: String(i),
                name: `Company ${i}`,
                city: 'Chennai'
            }));

            const context: FormatterContext = {
                query: 'Find companies',
                intent: 'find_business',
                entities: {},
                resultCount: 20
            };

            const result = formatBusinessResults(manyResults, context);

            // Should contain 1-10 but not 11
            expect(result).toContain('1. **Company 0**');
            expect(result).toContain('10. **Company 9**');
            expect(result).not.toContain('11. **Company 10**');
            expect(result).toContain('Found 20 results');
        });
    });

    // ============================================================================
    // PEER/ALUMNI RESULTS FORMATTING
    // ============================================================================

    describe('Alumni Results Formatting', () => {

        test('should format alumni results with batch info', () => {
            const context: FormatterContext = {
                query: 'Find 1995 mechanical batch',
                intent: 'find_peers',
                entities: {
                    graduationYear: [1995],
                    branch: ['Mechanical']
                },
                resultCount: 2
            };

            const result = formatPeerResults(sampleAlumniResults, context);

            expect(result).toContain('John Doe');
            expect(result).toContain("'95"); // Short year format
            expect(result).toContain('B.E');
            expect(result).toContain('Mechanical');
            expect(result).toContain('Senior Engineer at ABC Corp');
            expect(result).toContain('Chennai');
        });

        test('should format alumni header with batch and branch', () => {
            const context: FormatterContext = {
                query: 'Find 1995 mechanical alumni',
                intent: 'find_peers',
                entities: {
                    graduationYear: [1995],
                    branch: ['Mechanical']
                },
                resultCount: 2
            };

            const result = formatPeerResults(sampleAlumniResults, context);

            expect(result).toContain('**1995 batch**');
            expect(result).toContain('**Mechanical**');
            expect(result).toContain('alumni');
            expect(result).toContain('(2 results)');
        });

        test('should handle alumni without organization', () => {
            const results: MemberSearchResult[] = [{
                id: '1',
                name: 'Test Alumni',
                yearOfGraduation: 1995,
                branch: 'Civil',
                city: 'Delhi',
                phone: '919876543210'
            }];

            const context: FormatterContext = {
                query: 'Find alumni',
                intent: 'find_peers',
                entities: {},
                resultCount: 1
            };

            const result = formatPeerResults(results, context);

            expect(result).toContain('Test Alumni');
            expect(result).toContain('Civil');
            expect(result).not.toContain('at'); // No organization
        });
    });

    // ============================================================================
    // SPECIFIC PERSON FORMATTING
    // ============================================================================

    describe('Specific Person Formatting', () => {

        test('should format detailed person profile', () => {
            const context: FormatterContext = {
                query: 'Find Sivakumar from USAM',
                intent: 'find_specific_person',
                entities: {
                    name: 'Sivakumar',
                    organizationName: 'USAM'
                },
                resultCount: 1
            };

            const result = formatSpecificPersonResults(samplePersonResult, context);

            expect(result).toContain('Sivakumar');
            expect(result).toContain('CEO at USAM Technology Solutions');
            expect(result).toContain('Batch of 1992');
            expect(result).toContain('B.E');
            expect(result).toContain('Mechanical');
            expect(result).toContain('Chennai');
            expect(result).toContain('Skills: CAD, Engineering, Management');
            expect(result).toContain('Services: IT infrastructure, CAD solutions');
            expect(result).toContain('919383999901');
            expect(result).toContain('sivakumar@usam.in');
            expect(result).toContain('₹15.0 Cr');
        });

        test('should format person header with name', () => {
            const context: FormatterContext = {
                query: 'Find Sivakumar',
                intent: 'find_specific_person',
                entities: {
                    name: 'Sivakumar'
                },
                resultCount: 1
            };

            const result = formatSpecificPersonResults(samplePersonResult, context);

            expect(result).toContain('Found matches for **Sivakumar**');
        });

        test('should limit to 5 results for person search', () => {
            const manyResults = Array(10).fill(samplePersonResult[0]);

            const context: FormatterContext = {
                query: 'Find people',
                intent: 'find_specific_person',
                entities: {},
                resultCount: 10
            };

            const result = formatSpecificPersonResults(manyResults, context);

            expect(result).toContain('Showing top 5 of 10 matches');
        });
    });

    // ============================================================================
    // ALUMNI BUSINESS FORMATTING
    // ============================================================================

    describe('Alumni Business Formatting', () => {

        test('should format alumni entrepreneurs', () => {
            const results: MemberSearchResult[] = [{
                id: '1',
                name: 'John Entrepreneur',
                organization: 'StartupCo',
                yearOfGraduation: 1995,
                branch: 'Civil',
                productsServices: 'Construction, Real Estate',
                city: 'Mumbai',
                annualTurnover: 100000000,
                phone: '919876543210',
                email: 'john@startup.com'
            }];

            const context: FormatterContext = {
                query: 'Find 1995 batch entrepreneurs',
                intent: 'find_alumni_business',
                entities: {
                    graduationYear: [1995]
                },
                resultCount: 1
            };

            const result = formatAlumniBusinessResults(results, context);

            expect(result).toContain('**John Entrepreneur** - StartupCo'); // Has ** around name
            expect(result).toContain("'95");
            expect(result).toContain('Civil');
            expect(result).toContain('Construction, Real Estate');
            expect(result).toContain('Mumbai');
            expect(result).toContain('₹10.0 Cr');
        });
    });

    // ============================================================================
    // EMPTY RESULTS HANDLING
    // ============================================================================

    describe('Empty Results Handling', () => {

        test('should format empty results with context', () => {
            const context: FormatterContext = {
                query: 'Find 1999 batch in Antarctica',
                intent: 'find_peers',
                entities: {
                    graduationYear: [1999],
                    location: 'Antarctica'
                },
                resultCount: 0
            };

            const result = formatEmptyResults(context);

            expect(result).toContain("couldn't find any members");
            expect(result).toContain('**1999 batch**');
            expect(result).toContain('**Antarctica**');
            expect(result).toContain('Try different keywords');
        });

        test('should handle empty results for business query', () => {
            const context: FormatterContext = {
                query: 'Find unicorn companies',
                intent: 'find_business',
                entities: {
                    services: ['unicorn farming']
                },
                resultCount: 0
            };

            const result = formatEmptyResults(context);

            expect(result).toContain("couldn't find");
            expect(result).toContain('**unicorn farming**');
        });
    });

    // ============================================================================
    // MAIN FORMATTER ROUTING
    // ============================================================================

    describe('Main Formatter Routing', () => {

        test('should route to business formatter', () => {
            const context: FormatterContext = {
                query: 'Find IT companies',
                intent: 'find_business',
                entities: {},
                resultCount: 2
            };

            const result = formatResults(sampleBusinessResults, context);

            expect(result).toContain('companies');
            expect(result).toContain('USAM Technology');
        });

        test('should route to peer formatter', () => {
            const context: FormatterContext = {
                query: 'Find 1995 batch',
                intent: 'find_peers',
                entities: {},
                resultCount: 2
            };

            const result = formatResults(sampleAlumniResults, context);

            expect(result).toContain('alumni');
            expect(result).toContain('John Doe');
        });

        test('should handle empty results', () => {
            const context: FormatterContext = {
                query: 'Find nothing',
                intent: 'find_business',
                entities: {},
                resultCount: 0
            };

            const result = formatResults([], context);

            expect(result).toContain("couldn't find");
        });
    });

    // ============================================================================
    // HELPER FUNCTIONS
    // ============================================================================

    describe('Helper Functions', () => {

        test('should format turnover correctly', () => {
            expect(formatTurnover(150000000)).toBe('₹15.0 Cr');
            expect(formatTurnover(50000000)).toBe('₹5.0 Cr');
            expect(formatTurnover(500000)).toBe('₹5.0 L');
            expect(formatTurnover(50000)).toBe('₹50K');
        });

        test('should highlight matched fields', () => {
            const member: MemberSearchResult = {
                id: '1',
                name: 'Test',
                city: 'Chennai',
                yearOfGraduation: 1995,
                branch: 'Mechanical',
                skills: 'Web development'
            };

            const entities = {
                location: 'Chennai',
                graduationYear: [1995],
                branch: ['Mechanical'],
                skills: ['web development']
            };

            const matched = highlightMatchedFields(member, entities);

            expect(matched).toContain('location');
            expect(matched).toContain('batch year');
            expect(matched).toContain('branch');
            expect(matched).toContain('skills');
        });
    });

    // ============================================================================
    // PERFORMANCE TESTS
    // ============================================================================

    describe('Performance Metrics', () => {

        test('should format results in < 50ms', () => {
            const context: FormatterContext = {
                query: 'Find companies',
                intent: 'find_business',
                entities: {},
                resultCount: 2
            };

            const startTime = Date.now();
            formatResults(sampleBusinessResults, context);
            const duration = Date.now() - startTime;

            expect(duration).toBeLessThan(50);
        });

        test('should be faster than LLM (< 100ms vs ~2000ms)', () => {
            const context: FormatterContext = {
                query: 'Find alumni',
                intent: 'find_peers',
                entities: {},
                resultCount: 10
            };

            const largeResults = Array(10).fill(sampleAlumniResults[0]);

            const startTime = Date.now();
            formatResults(largeResults, context);
            const duration = Date.now() - startTime;

            expect(duration).toBeLessThan(100); // vs LLM ~2000ms
        });
    });

    // ============================================================================
    // EDGE CASES
    // ============================================================================

    describe('Edge Cases', () => {

        test('should handle missing fields gracefully', () => {
            const minimalResult: MemberSearchResult[] = [{
                id: '1',
                name: 'Minimal Member'
            }];

            const context: FormatterContext = {
                query: 'Find anyone',
                intent: 'find_peers',
                entities: {},
                resultCount: 1
            };

            const result = formatResults(minimalResult, context);

            expect(result).toContain('Minimal Member');
            expect(result).toBeDefined();
        });

        test('should handle special characters in names', () => {
            const results: MemberSearchResult[] = [{
                id: '1',
                name: "O'Brien & Sons",
                organization: 'Test & Co.'
            }];

            const context: FormatterContext = {
                query: 'Find',
                intent: 'find_business',
                entities: {},
                resultCount: 1
            };

            const result = formatResults(results, context);

            expect(result).toContain("Test & Co."); // Uses organization name for business
        });
    });

});

// ============================================================================
// TEST SUMMARY
// ============================================================================

describe('Response Formatter Test Summary', () => {
    test('should log test statistics', () => {
        console.log('\n========================================');
        console.log('Response Formatter Test Summary');
        console.log('========================================');
        console.log('Intent types tested: 4');
        console.log('Test categories: 10');
        console.log('Performance target: < 50ms (vs LLM 2000ms)');
        console.log('Expected improvement: 40x faster');
        console.log('========================================\n');

        expect(true).toBe(true);
    });
});
