/**
 * Session Service
 * 
 * Handles:
 * - WhatsApp session management (Redis-based)
 * - Conversation history storage
 * - Session lifecycle (create, update, delete, expire)
 * - Rate limit tracking
 */

import { getRedisClient } from '../config/redis';
import { WhatsAppSession, SessionData, SessionUpdateData, ConversationEntry } from '../utils/types';
import { RATE_LIMIT_MESSAGES_PER_HOUR, RATE_LIMIT_SEARCHES_PER_HOUR } from '../config';

// Configuration
const SESSION_TTL_SECONDS = 30 * 60; // 30 minutes
const MAX_HISTORY_ENTRIES = 10; // Keep last 10 queries
const RATE_LIMIT_WINDOW_SECONDS = 60 * 60; // 1 hour

/**
 * Generate Redis key for session
 */
function getSessionKey(phoneNumber: string): string {
    return `session:whatsapp:${phoneNumber}`;
}

/**
 * Generate Redis key for rate limiting
 */
function getRateLimitKey(phoneNumber: string, type: 'msg' | 'search'): string {
    return `rate:${type}:${phoneNumber}`;
}

/**
 * Get or create WhatsApp session
 */
export async function getOrCreateSession(data: SessionData): Promise<WhatsAppSession> {
    console.log(`[Session Service] Getting/creating session for: ${data.phoneNumber.substring(0, 5)}***`);

    try {
        const client = await getRedisClient();
        const key = getSessionKey(data.phoneNumber);

        // Try to get existing session
        const sessionJson = await client.get(key);

        if (sessionJson) {
            // Parse and return existing session
            const session: WhatsAppSession = JSON.parse(sessionJson);
            console.log(`[Session Service] ✓ Existing session found (${session.conversationHistory.length} messages)`);

            // Update last activity and reset TTL
            session.lastActivity = new Date();
            await client.setEx(key, SESSION_TTL_SECONDS, JSON.stringify(session));

            return session;
        }

        // Create new session
        const newSession: WhatsAppSession = {
            userId: data.userId,
            phoneNumber: data.phoneNumber,
            memberName: data.memberName,
            role: data.role,
            conversationHistory: [],
            lastActivity: new Date(),
            messageCount: 0,
            searchCount: 0,
            createdAt: new Date()
        };

        // Store in Redis with TTL
        await client.setEx(key, SESSION_TTL_SECONDS, JSON.stringify(newSession));
        console.log(`[Session Service] ✓ New session created`);

        return newSession;

    } catch (error) {
        console.error('[Session Service] Error getting/creating session:', error);
        throw error;
    }
}

/**
 * Get existing session (returns null if not found)
 */
export async function getSession(phoneNumber: string): Promise<WhatsAppSession | null> {
    try {
        const client = await getRedisClient();
        const key = getSessionKey(phoneNumber);
        const sessionJson = await client.get(key);

        if (!sessionJson) {
            return null;
        }

        return JSON.parse(sessionJson);
    } catch (error) {
        console.error('[Session Service] Error getting session:', error);
        throw error;
    }
}

/**
 * Update session data
 */
export async function updateSession(
    phoneNumber: string,
    updates: SessionUpdateData
): Promise<WhatsAppSession | null> {
    console.log(`[Session Service] Updating session for: ${phoneNumber.substring(0, 5)}***`);

    try {
        const client = await getRedisClient();
        const key = getSessionKey(phoneNumber);

        // Get existing session
        const sessionJson = await client.get(key);
        if (!sessionJson) {
            console.log('[Session Service] ✗ Session not found');
            return null;
        }

        const session: WhatsAppSession = JSON.parse(sessionJson);

        // Update fields
        if (updates.messageCount !== undefined) {
            session.messageCount = updates.messageCount;
        }
        if (updates.searchCount !== undefined) {
            session.searchCount = updates.searchCount;
        }
        if (updates.conversationHistory) {
            session.conversationHistory = updates.conversationHistory;
        }

        // Always update last activity
        session.lastActivity = new Date();

        // Save back to Redis with refreshed TTL
        await client.setEx(key, SESSION_TTL_SECONDS, JSON.stringify(session));
        console.log('[Session Service] ✓ Session updated');

        return session;

    } catch (error) {
        console.error('[Session Service] Error updating session:', error);
        throw error;
    }
}

/**
 * Add conversation entry to session history
 */
export async function addConversationEntry(
    phoneNumber: string,
    entry: ConversationEntry
): Promise<WhatsAppSession | null> {
    console.log(`[Session Service] Adding conversation entry for: ${phoneNumber.substring(0, 5)}***`);

    try {
        const client = await getRedisClient();
        const key = getSessionKey(phoneNumber);

        // Get existing session
        const sessionJson = await client.get(key);
        if (!sessionJson) {
            console.log('[Session Service] ✗ Session not found');
            return null;
        }

        const session: WhatsAppSession = JSON.parse(sessionJson);

        // Add to history (keep only last N entries)
        session.conversationHistory.push(entry);
        if (session.conversationHistory.length > MAX_HISTORY_ENTRIES) {
            session.conversationHistory = session.conversationHistory.slice(-MAX_HISTORY_ENTRIES);
        }

        // Update counters
        session.messageCount += 1;
        session.lastActivity = new Date();

        // Save back to Redis
        await client.setEx(key, SESSION_TTL_SECONDS, JSON.stringify(session));
        console.log(`[Session Service] ✓ Entry added (history: ${session.conversationHistory.length})`);

        return session;

    } catch (error) {
        console.error('[Session Service] Error adding conversation entry:', error);
        throw error;
    }
}

/**
 * Get conversation history for a phone number
 */
export async function getConversationHistory(phoneNumber: string): Promise<ConversationEntry[]> {
    try {
        const session = await getSession(phoneNumber);
        return session ? session.conversationHistory : [];
    } catch (error) {
        console.error('[Session Service] Error getting conversation history:', error);
        return [];
    }
}

/**
 * Delete session
 */
export async function deleteSession(phoneNumber: string): Promise<boolean> {
    console.log(`[Session Service] Deleting session for: ${phoneNumber.substring(0, 5)}***`);

    try {
        const client = await getRedisClient();
        const key = getSessionKey(phoneNumber);
        const result = await client.del(key);

        if (result > 0) {
            console.log('[Session Service] ✓ Session deleted');
            return true;
        } else {
            console.log('[Session Service] ✗ Session not found');
            return false;
        }
    } catch (error) {
        console.error('[Session Service] Error deleting session:', error);
        throw error;
    }
}

/**
 * Check message rate limit
 */
export async function checkMessageRateLimit(phoneNumber: string): Promise<{
    allowed: boolean;
    current: number;
    limit: number;
    retryAfter?: number;
}> {
    try {
        const client = await getRedisClient();
        const key = getRateLimitKey(phoneNumber, 'msg');

        // Get current count
        const currentStr = await client.get(key);
        const current = currentStr ? parseInt(currentStr, 10) : 0;

        if (current >= RATE_LIMIT_MESSAGES_PER_HOUR) {
            // Get TTL to inform when they can retry
            const ttl = await client.ttl(key);
            return {
                allowed: false,
                current,
                limit: RATE_LIMIT_MESSAGES_PER_HOUR,
                retryAfter: Math.ceil(ttl / 60) // Convert to minutes
            };
        }

        return {
            allowed: true,
            current,
            limit: RATE_LIMIT_MESSAGES_PER_HOUR
        };
    } catch (error) {
        console.error('[Session Service] Error checking rate limit:', error);
        // On error, allow the request (fail open)
        return {
            allowed: true,
            current: 0,
            limit: RATE_LIMIT_MESSAGES_PER_HOUR
        };
    }
}

/**
 * Increment message rate limit counter
 */
export async function incrementMessageCounter(phoneNumber: string): Promise<void> {
    try {
        const client = await getRedisClient();
        const key = getRateLimitKey(phoneNumber, 'msg');

        // Increment counter
        const count = await client.incr(key);

        // Set expiry only on first increment
        if (count === 1) {
            await client.expire(key, RATE_LIMIT_WINDOW_SECONDS);
        }
    } catch (error) {
        console.error('[Session Service] Error incrementing message counter:', error);
        // Don't throw - rate limiting is not critical
    }
}

/**
 * Check search rate limit
 */
export async function checkSearchRateLimit(phoneNumber: string): Promise<{
    allowed: boolean;
    current: number;
    limit: number;
    retryAfter?: number;
}> {
    try {
        const client = await getRedisClient();
        const key = getRateLimitKey(phoneNumber, 'search');

        const currentStr = await client.get(key);
        const current = currentStr ? parseInt(currentStr, 10) : 0;

        if (current >= RATE_LIMIT_SEARCHES_PER_HOUR) {
            const ttl = await client.ttl(key);
            return {
                allowed: false,
                current,
                limit: RATE_LIMIT_SEARCHES_PER_HOUR,
                retryAfter: Math.ceil(ttl / 60)
            };
        }

        return {
            allowed: true,
            current,
            limit: RATE_LIMIT_SEARCHES_PER_HOUR
        };
    } catch (error) {
        console.error('[Session Service] Error checking search rate limit:', error);
        return {
            allowed: true,
            current: 0,
            limit: RATE_LIMIT_SEARCHES_PER_HOUR
        };
    }
}

/**
 * Increment search rate limit counter
 */
export async function incrementSearchCounter(phoneNumber: string): Promise<void> {
    try {
        const client = await getRedisClient();
        const key = getRateLimitKey(phoneNumber, 'search');

        const count = await client.incr(key);

        if (count === 1) {
            await client.expire(key, RATE_LIMIT_WINDOW_SECONDS);
        }
    } catch (error) {
        console.error('[Session Service] Error incrementing search counter:', error);
    }
}

/**
 * Get session statistics
 */
export async function getSessionStats(phoneNumber: string): Promise<{
    exists: boolean;
    messageCount?: number;
    searchCount?: number;
    historyLength?: number;
    createdAt?: Date;
    lastActivity?: Date;
    ttl?: number;
} | null> {
    try {
        const client = await getRedisClient();
        const key = getSessionKey(phoneNumber);

        const sessionJson = await client.get(key);
        if (!sessionJson) {
            return { exists: false };
        }

        const session: WhatsAppSession = JSON.parse(sessionJson);
        const ttl = await client.ttl(key);

        return {
            exists: true,
            messageCount: session.messageCount,
            searchCount: session.searchCount,
            historyLength: session.conversationHistory.length,
            createdAt: session.createdAt,
            lastActivity: session.lastActivity,
            ttl
        };
    } catch (error) {
        console.error('[Session Service] Error getting session stats:', error);
        return null;
    }
}
