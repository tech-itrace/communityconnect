// Quick test of LLM parseQuery function
import { parseQuery } from './src/services/llmService';
import dotenv from 'dotenv';

dotenv.config();

async function test() {
    console.log('Testing parseQuery with improved prompts...\n');
    
    const queries = [
        "find members in the IT industry",
        "Who can provide IT consulting services in Bangalore?",
        "I'm looking for an AI expert in Chennai with high turnover who provides consulting services",
        "Can you help me find someone who can help with my cloud infrastructure project in Hyderabad?"
    ];
    
    for (const query of queries) {
        console.log(`\n${'='.repeat(80)}`);
        console.log(`Query: "${query}"`);
        console.log('='.repeat(80));
        try {
            const result = await parseQuery(query);
            console.log('Result:');
            console.log('  Intent:', result.intent);
            console.log('  Confidence:', result.confidence);
            console.log('  Entities:', JSON.stringify(result.entities, null, 4));
            console.log('  Search Query:', result.searchQuery);
        } catch (error: any) {
            console.error('Error:', error.message);
        }
    }
}

test().then(() => {
    console.log('\n\nAll tests done!');
    process.exit(0);
}).catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});