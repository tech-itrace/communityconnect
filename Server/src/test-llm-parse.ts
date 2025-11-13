/**
 * Simple test to debug LLM parseQuery function
 */

import { parseQuery } from './services/llmService';
import dotenv from 'dotenv';

// Load environment
dotenv.config();

async function testLLM() {
    console.log('Testing LLM parseQuery function...\n');

    // Check environment
    console.log('Environment check:');
    console.log('- DEEPINFRA_API_KEY set:', !!process.env.DEEPINFRA_API_KEY);
    console.log('- Key length:', process.env.DEEPINFRA_API_KEY?.length || 0);
    console.log('');

    const testQueries = [
        'Find web development company in Chennai',
        'Find my batchmates from 1995 passout mechanical',
        'Who are the 1998 batch members?'
    ];

    for (const query of testQueries) {
        try {
            console.log(`Testing: "${query}"`);
            const startTime = Date.now();

            const result = await parseQuery(query);

            const duration = Date.now() - startTime;

            console.log(`  Duration: ${duration}ms`);
            console.log(`  Intent: ${result.intent}`);
            console.log(`  Confidence: ${result.confidence}`);
            console.log(`  Entities:`, JSON.stringify(result.entities, null, 2));
            console.log(`  Search Query: ${result.searchQuery}`);
            console.log('');

            if (duration < 100) {
                console.log('  ⚠️  WARNING: Response too fast - LLM probably not being called!');
                console.log('');
            }

        } catch (error: any) {
            console.error(`  ❌ ERROR: ${error.message}`);
            console.error(`  Stack: ${error.stack}`);
            console.log('');
        }
    }
}

// Run test
testLLM().then(() => {
    console.log('Test complete');
    process.exit(0);
}).catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
