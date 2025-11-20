/**
 * Test vector similarity search with real queries
 * Run with: npx ts-node scripts/test-vector-search.ts
 */

import { generateQueryEmbedding } from '../src/services/semanticSearch';
import { query } from '../src/config/db';

interface TestQuery {
    query: string;
    expectedResults?: string[];
}

const TEST_QUERIES: TestQuery[] = [
    {
        query: "machine learning",
        expectedResults: ["data scientist", "AI", "ML"]
    },
    {
        query: "software developer",
        expectedResults: ["developer", "engineer", "software"]
    },
    {
        query: "business consultant",
        expectedResults: ["consultant", "business", "advisory"]
    },
    {
        query: "manufacturing",
        expectedResults: ["manufacturing", "production", "factory"]
    }
];

async function testVectorSearch(testQuery: string): Promise<void> {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Testing Query: "${testQuery}"`);
    console.log('='.repeat(60));

    try {
        // Generate embedding for test query
        console.log('1. Generating embedding...');
        const embedding = await generateQueryEmbedding(testQuery);
        console.log(`   ✓ Generated ${embedding.length}D embedding`);

        // Test semantic search
        console.log('\n2. Running semantic search...');
        const embeddingStr = `[${embedding.join(',')}]`;

        const result = await query(
            `SELECT
                m.name,
                me.skills_text,
                me.profile_text,
                me.skills_embedding <=> $1::vector AS skills_distance,
                me.profile_embedding <=> $1::vector AS profile_distance,
                LEAST(
                    me.skills_embedding <=> $1::vector,
                    me.profile_embedding <=> $1::vector,
                    me.contextual_embedding <=> $1::vector
                ) AS min_distance
            FROM community_memberships cm
            JOIN members m ON cm.member_id = m.id
            JOIN member_embeddings me ON cm.id = me.membership_id
            WHERE cm.is_active = TRUE
              AND m.is_active = TRUE
            ORDER BY min_distance ASC
            LIMIT 10`,
            [embeddingStr]
        );

        console.log(`   ✓ Found ${result.rows.length} results\n`);

        // Display results
        console.log('Top 10 Results:');
        console.log('-'.repeat(60));
        result.rows.forEach((row, idx) => {
            console.log(`${idx + 1}. ${row.name}`);
            console.log(`   Skills: ${row.skills_text || 'N/A'}`);
            console.log(`   Distance: ${parseFloat(row.min_distance).toFixed(4)}`);
            console.log(`   Similarity: ${(1 - parseFloat(row.min_distance)).toFixed(4)}`);
            console.log('');
        });

    } catch (error: any) {
        console.error(`✗ Error testing query:`, error.message);
        console.error(error.stack);
    }
}

async function runAllTests(): Promise<void> {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  VECTOR SIMILARITY SEARCH - DIAGNOSTIC TEST SUITE         ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    for (const test of TEST_QUERIES) {
        await testVectorSearch(test.query);
    }

    console.log('\n' + '='.repeat(60));
    console.log('All tests completed!');
    console.log('='.repeat(60) + '\n');

    process.exit(0);
}

// Run tests
runAllTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
