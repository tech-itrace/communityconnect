/**
 * Rate Limiter Middleware
 * 
 * Provides flexible rate limiting for different routes:
 * - WhatsApp messages: 50/hour per phone
 * - Search API: 30/hour per user
 * - Auth endpoints: 10/15min per IP
 * - Global: 1000/hour per IP
 */

import { Request, Response, NextFunction } from 'express';
import { getRedisClient } from '../config/redis';

// Rate limit configurations
export interface RateLimitConfig {
    windowMs: number;      // Time window in milliseconds
    maxRequests: number;   // Max requests in window
    keyGenerator: (req: Request) => string;  // How to identify the user
    message?: string;      // Custom error message
    skipFailedRequests?: boolean;  // Don't count failed requests
    skipSuccessfulRequests?: boolean;  // Don't count successful requests
}

// Predefined rate limit configurations
export const RateLimitConfigs = {
    // WhatsApp messages: 50 per hour per phone number
    whatsapp: {
        windowMs: 60 * 60 * 1000, // 1 hour
        maxRequests: 50,
        keyGenerator: (req: Request) => {
            const phone = req.body.From?.replace('whatsapp:+', '') || 'unknown';
            return `rate:whatsapp:${phone}`;
        },
        message: "⚠️ You've reached the hourly message limit (50 messages). Please try again later. 🙏"
    },

    // Search API: 30 per hour per authenticated user
    search: {
        windowMs: 60 * 60 * 1000, // 1 hour
        maxRequests: 30,
        keyGenerator: (req: Request) => {
            const phone = req.body.phoneNumber || req.query.phoneNumber || 'unknown';
            return `rate:search:${phone}`;
        },
        message: "⚠️ You've reached the hourly search limit (30 searches). Please try again later. 🙏"
    },

    // Auth endpoints: 10 per 15 minutes per IP
    auth: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 10,
        keyGenerator: (req: Request) => {
            const ip = req.ip || req.socket.remoteAddress || 'unknown';
            return `rate:auth:${ip}`;
        },
        message: "Too many authentication attempts. Please try again in 15 minutes."
    },

    // Global: 1000 per hour per IP (prevent abuse)
    global: {
        windowMs: 60 * 60 * 1000, // 1 hour
        maxRequests: 1000,
        keyGenerator: (req: Request) => {
            const ip = req.ip || req.socket.remoteAddress || 'unknown';
            return `rate:global:${ip}`;
        },
        message: "Too many requests. Please try again later."
    }
};

/**
 * Create rate limiter middleware
 */
export function createRateLimiter(config: RateLimitConfig) {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const client = await getRedisClient();
            const key = config.keyGenerator(req);
            const windowSeconds = Math.floor(config.windowMs / 1000);

            // Get current count
            const currentStr = await client.get(key);
            const current = currentStr ? parseInt(currentStr, 10) : 0;

            // Check if limit exceeded
            if (current >= config.maxRequests) {
                // Get TTL for retry-after header
                const ttl = await client.ttl(key);
                const retryAfter = Math.ceil(ttl);

                console.log(`[Rate Limit] Blocked: ${key} (${current}/${config.maxRequests})`);

                // Set rate limit headers
                res.set({
                    'X-RateLimit-Limit': config.maxRequests.toString(),
                    'X-RateLimit-Remaining': '0',
                    'X-RateLimit-Reset': new Date(Date.now() + ttl * 1000).toISOString(),
                    'Retry-After': retryAfter.toString()
                });

                // Return 429 Too Many Requests
                return res.status(429).json({
                    success: false,
                    error: {
                        code: 'RATE_LIMIT_EXCEEDED',
                        message: config.message || 'Too many requests. Please try again later.',
                        retryAfter: retryAfter,
                        limit: config.maxRequests,
                        windowMs: config.windowMs
                    }
                });
            }

            // Increment counter
            const newCount = await client.incr(key);

            // Set expiry on first request
            if (newCount === 1) {
                await client.expire(key, windowSeconds);
            }

            // Set rate limit headers
            res.set({
                'X-RateLimit-Limit': config.maxRequests.toString(),
                'X-RateLimit-Remaining': Math.max(0, config.maxRequests - newCount).toString(),
                'X-RateLimit-Reset': new Date(Date.now() + windowSeconds * 1000).toISOString()
            });

            console.log(`[Rate Limit] Allowed: ${key} (${newCount}/${config.maxRequests})`);

            next();

        } catch (error) {
            console.error('[Rate Limit] Error checking rate limit:', error);
            // On error, allow the request (fail open)
            next();
        }
    };
}

/**
 * Predefined rate limiters (ready to use)
 */
export const rateLimiters = {
    whatsapp: createRateLimiter(RateLimitConfigs.whatsapp),
    search: createRateLimiter(RateLimitConfigs.search),
    auth: createRateLimiter(RateLimitConfigs.auth),
    global: createRateLimiter(RateLimitConfigs.global)
};

/**
 * Rate limit info endpoint helper
 */
export async function getRateLimitInfo(key: string): Promise<{
    limit: number;
    remaining: number;
    reset: Date;
    current: number;
} | null> {
    try {
        const client = await getRedisClient();
        const currentStr = await client.get(key);
        const current = currentStr ? parseInt(currentStr, 10) : 0;
        const ttl = await client.ttl(key);

        // Determine limit based on key prefix
        let limit = 100; // default
        if (key.includes(':whatsapp:')) limit = 50;
        else if (key.includes(':search:')) limit = 30;
        else if (key.includes(':auth:')) limit = 10;
        else if (key.includes(':global:')) limit = 1000;

        return {
            limit,
            current,
            remaining: Math.max(0, limit - current),
            reset: new Date(Date.now() + ttl * 1000)
        };
    } catch (error) {
        console.error('[Rate Limit] Error getting rate limit info:', error);
        return null;
    }
}

/**
 * Custom rate limiter for specific needs
 */
export function customRateLimit(
    maxRequests: number,
    windowMs: number,
    keyPrefix: string,
    message?: string
) {
    return createRateLimiter({
        windowMs,
        maxRequests,
        keyGenerator: (req: Request) => {
            const identifier = req.body.phoneNumber || req.ip || 'unknown';
            return `rate:${keyPrefix}:${identifier}`;
        },
        message
    });
}
