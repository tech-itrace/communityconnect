/**
 * Redis Client Configuration
 * 
 * Handles:
 * - Redis connection management
 * - Reconnection logic
 * - Error handling
 * - Health checks
 */

import { createClient, RedisClientType } from 'redis';

let redisClient: RedisClientType | null = null;

// Configuration
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || '';
const REDIS_TLS = process.env.REDIS_TLS === 'true';

/**
 * Get Redis client instance (singleton pattern)
 */
export async function getRedisClient(): Promise<RedisClientType> {
    if (redisClient && redisClient.isOpen) {
        return redisClient;
    }

    console.log('[Redis] Connecting to Redis...');

    try {
        redisClient = createClient({
            url: REDIS_URL,
            password: REDIS_PASSWORD || undefined,
            socket: {
                reconnectStrategy: (retries) => {
                    if (retries > 10) {
                        console.error('[Redis] Max reconnection attempts reached');
                        return new Error('Max reconnection attempts reached');
                    }
                    // Exponential backoff: 100ms, 200ms, 400ms, 800ms, ...
                    const delay = Math.min(100 * Math.pow(2, retries), 3000);
                    console.log(`[Redis] Reconnecting in ${delay}ms (attempt ${retries + 1})`);
                    return delay;
                }
            }
        });

        // Event handlers
        redisClient.on('error', (err) => {
            console.error('[Redis] Error:', err);
        });

        redisClient.on('connect', () => {
            console.log('[Redis] Connected');
        });

        redisClient.on('reconnecting', () => {
            console.log('[Redis] Reconnecting...');
        });

        redisClient.on('ready', () => {
            console.log('[Redis] ✓ Ready');
        });

        // Connect
        await redisClient.connect();

        return redisClient;
    } catch (error) {
        console.error('[Redis] Failed to connect:', error);
        throw error;
    }
}

/**
 * Close Redis connection
 */
export async function closeRedisClient(): Promise<void> {
    if (redisClient && redisClient.isOpen) {
        console.log('[Redis] Closing connection...');
        await redisClient.quit();
        redisClient = null;
        console.log('[Redis] Connection closed');
    }
}

/**
 * Check if Redis is connected
 */
export async function isRedisConnected(): Promise<boolean> {
    try {
        if (!redisClient || !redisClient.isOpen) {
            return false;
        }
        const pong = await redisClient.ping();
        return pong === 'PONG';
    } catch (error) {
        console.error('[Redis] Health check failed:', error);
        return false;
    }
}

/**
 * Redis health check for monitoring
 */
export async function getRedisHealth(): Promise<{
    connected: boolean;
    latency?: number;
    error?: string;
}> {
    try {
        const client = await getRedisClient();
        const startTime = Date.now();
        await client.ping();
        const latency = Date.now() - startTime;

        return {
            connected: true,
            latency
        };
    } catch (error) {
        return {
            connected: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Graceful shutdown handler
 */
export async function handleShutdown(): Promise<void> {
    console.log('[Redis] Graceful shutdown initiated');
    await closeRedisClient();
}

// Handle process termination
process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown);
