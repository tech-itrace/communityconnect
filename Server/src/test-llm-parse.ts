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
        'Who are the 1998 batch members?',
        'find IT consultants' // ADD THIS TEST CASE
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

            // Check for over-extraction
            const hasSkills = result.entities.skills && result.entities.skills.length > 0;
            const hasServices = result.entities.services && result.entities.services.length > 0;
            
            if (hasSkills && hasServices) {
                const skillsLower = result.entities.skills!.map(s => s.toLowerCase());
                const servicesLower = result.entities.services!.map(s => s.toLowerCase());
                const overlap = skillsLower.filter(s => servicesLower.includes(s));
                
                if (overlap.length > 0) {
                    console.log(`  ⚠️  WARNING: Over-extraction detected!`);
                    console.log(`  Overlapping terms: ${overlap.join(', ')}`);
                    console.log(`  ❌ TEST FAILED: Should not duplicate terms in skills AND services`);
                } else {
                    console.log(`  ✅ No overlap between skills and services`);
                }
            } else {
                console.log(`  ✅ No overlap - only one category populated`);
            }
            
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
    
    console.log('\n========================================');
    console.log('OVER-EXTRACTION TEST SUMMARY');
    console.log('========================================');
    console.log('Testing query: "find IT consultants"');
    
    try {
        const result = await parseQuery('find IT consultants');
        const hasSkills = result.entities.skills && result.entities.skills.length > 0;
        const hasServices = result.entities.services && result.entities.services.length > 0;
        
        console.log(`Skills: ${hasSkills ? result.entities.skills?.join(', ') : 'none'}`);
        console.log(`Services: ${hasServices ? result.entities.services?.join(', ') : 'none'}`);
        
        if (hasSkills && hasServices) {
            const skillsLower = result.entities.skills!.map(s => s.toLowerCase());
            const servicesLower = result.entities.services!.map(s => s.toLowerCase());
            const overlap = skillsLower.filter(s => servicesLower.includes(s));
            
            if (overlap.length > 0) {
                console.log(`\n❌ TEST FAILED: Over-extraction detected`);
                console.log(`Overlapping terms: ${overlap.join(', ')}`);
                console.log(`\nExpected: Either skills OR services (or no overlap)`);
                console.log(`Got: Both skills AND services with duplicates`);
                process.exit(1);
            } else {
                console.log(`\n✅ TEST PASSED: No overlapping terms`);
            }
        } else {
            console.log(`\n✅ TEST PASSED: Only one category populated`);
        }
    } catch (error: any) {
        console.error(`\n❌ TEST ERROR: ${error.message}`);
        process.exit(1);
    }
}

// Run test
testLLM().then(() => {
    console.log('\n✅ All tests complete');
    process.exit(0);
}).catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});