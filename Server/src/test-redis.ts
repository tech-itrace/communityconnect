/**
 * Test Redis Connection
 * 
 * Simple script to verify Redis is working correctly
 */

import { getRedisClient, getRedisHealth, closeRedisClient } from './config/redis';

async function testRedis() {
    console.log('=== Redis Connection Test ===\n');

    try {
        // Test 1: Get client and connect
        console.log('1. Testing connection...');
        const client = await getRedisClient();
        console.log('✓ Connected to Redis\n');

        // Test 2: Basic ping
        console.log('2. Testing PING command...');
        const pong = await client.ping();
        console.log(`✓ PING response: ${pong}\n`);

        // Test 3: Set and get value
        console.log('3. Testing SET/GET commands...');
        await client.set('test:key', 'Hello Redis!');
        const value = await client.get('test:key');
        console.log(`✓ SET/GET works: ${value}\n`);

        // Test 4: Set with expiry
        console.log('4. Testing TTL (Time To Live)...');
        await client.setEx('test:expiry', 10, 'This expires in 10 seconds');
        const ttl = await client.ttl('test:expiry');
        console.log(`✓ TTL set: ${ttl} seconds remaining\n`);

        // Test 5: Hash operations (for session storage)
        console.log('5. Testing HASH operations...');
        await client.hSet('test:session', {
            userId: '123',
            phoneNumber: '+919840930854',
            role: 'member',
            lastActivity: new Date().toISOString()
        });
        const session = await client.hGetAll('test:session');
        console.log('✓ Session stored:', session, '\n');

        // Test 6: Increment counter (for rate limiting)
        console.log('6. Testing INCR (rate limiting)...');
        await client.incr('test:counter');
        await client.incr('test:counter');
        await client.incr('test:counter');
        const counter = await client.get('test:counter');
        console.log(`✓ Counter value: ${counter}\n`);

        // Test 7: Health check
        console.log('7. Testing health check...');
        const health = await getRedisHealth();
        console.log(`✓ Health status:`, health, '\n');

        // Cleanup test keys
        console.log('8. Cleaning up test keys...');
        await client.del(['test:key', 'test:expiry', 'test:session', 'test:counter']);
        console.log('✓ Cleanup complete\n');

        console.log('=== All Tests Passed! ✓ ===\n');

    } catch (error) {
        console.error('\n❌ Test failed:', error);
        process.exit(1);
    } finally {
        await closeRedisClient();
        process.exit(0);
    }
}

// Run tests
testRedis();
