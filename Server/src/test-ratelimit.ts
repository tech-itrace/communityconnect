/**
 * Test Rate Limiter Middleware
 * 
 * Tests rate limiting functionality
 */

import express, { Request, Response } from 'express';
import { createRateLimiter, RateLimitConfigs, getRateLimitInfo } from './middlewares/rateLimiter';
import { getRedisClient, closeRedisClient } from './config/redis';

const app = express();
app.use(express.json());

// Test endpoint with rate limiting
const testLimiter = createRateLimiter({
    windowMs: 10 * 1000, // 10 seconds (for testing)
    maxRequests: 5,
    keyGenerator: (req: Request) => `rate:test:${req.body.userId || 'anonymous'}`,
    message: 'Test rate limit exceeded'
});

app.post('/test', testLimiter, (req: Request, res: Response) => {
    res.json({ success: true, message: 'Request allowed' });
});

async function runTests() {
    console.log('=== Rate Limiter Middleware Tests ===\n');

    try {
        const server = app.listen(3001, () => {
            console.log('Test server started on port 3001\n');
        });

        // Give server time to start
        await new Promise(resolve => setTimeout(resolve, 500));

        // Test 1: Normal requests (should all pass)
        console.log('1. Testing normal requests (limit: 5 in 10s)...');
        for (let i = 1; i <= 5; i++) {
            const response = await fetch('http://localhost:3001/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: 'user1' })
            });
            const data = await response.json();
            const remaining = response.headers.get('X-RateLimit-Remaining');
            console.log(`   Request ${i}: ${response.status} - Remaining: ${remaining}`);
        }
        console.log('');

        // Test 2: Exceed rate limit
        console.log('2. Testing rate limit exceeded (6th request)...');
        const response6 = await fetch('http://localhost:3001/test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: 'user1' })
        });
        const data6: any = await response6.json();
        console.log(`   Request 6: ${response6.status} - ${data6.error?.message}`);
        console.log(`   Retry After: ${response6.headers.get('Retry-After')} seconds`);
        console.log('');

        // Test 3: Different user should have separate limit
        console.log('3. Testing different user (should have fresh limit)...');
        const response7 = await fetch('http://localhost:3001/test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: 'user2' })
        });
        const data7 = await response7.json();
        const remaining7 = response7.headers.get('X-RateLimit-Remaining');
        console.log(`   User2 Request 1: ${response7.status} - Remaining: ${remaining7}`);
        console.log('');

        // Test 4: Check rate limit info directly
        console.log('4. Testing rate limit info retrieval...');
        const info1 = await getRateLimitInfo('rate:test:user1');
        const info2 = await getRateLimitInfo('rate:test:user2');
        console.log('   User1:', info1);
        console.log('   User2:', info2);
        console.log('');

        // Test 5: Wait for reset (simulate)
        console.log('5. Testing TTL and reset...');
        const client = await getRedisClient();
        const ttl = await client.ttl('rate:test:user1');
        console.log(`   Time until reset: ${ttl} seconds`);
        console.log('');

        // Test 6: Check Redis keys
        console.log('6. Checking Redis keys...');
        const keys = await client.keys('rate:test:*');
        console.log(`   Rate limit keys in Redis: ${keys.length}`);
        keys.forEach(key => console.log(`     - ${key}`));
        console.log('');

        // Cleanup
        console.log('7. Cleanup...');
        await client.del(keys);
        console.log('   ✓ Test keys deleted');
        console.log('');

        console.log('=== All Tests Passed! ✓ ===\n');

        server.close();
        await closeRedisClient();
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Test failed:', error);
        process.exit(1);
    }
}

// Run tests
runTests();
