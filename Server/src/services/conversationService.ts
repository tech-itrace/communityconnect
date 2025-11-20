/**
 * Conversation Service
 * 
 * Handles:
 * - Member phone number validation
 * - Conversation history tracking (in-memory)
 * - Context building for follow-up queries
 */

import { query } from '../config/db';
import { ConversationSession, ConversationEntry, ExtractedEntities } from '../utils/types';

// In-memory conversation store
// Key: phone number, Value: conversation session
const conversationStore = new Map<string, ConversationSession>();

// Configuration
const MAX_HISTORY_ENTRIES = 5;
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Validate if phone number belongs to an active community member
 * Updated for multi-community schema
 */
export async function validateMember(phoneNumber: string): Promise<{
    isValid: boolean;
    memberName?: string;
    memberId?: string;
    role?: 'member' | 'admin' | 'super_admin';
    communityId?: string;
}> {
    console.log(`[Conversation Service] Validating phone number: ${phoneNumber.substring(0, 3)}***`);

    try {
        // Normalize phone number (remove spaces, dashes, etc.)
        const normalizedPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');

        // Query database for member with this phone number
        // For now, we'll get their first active membership (main-community)
        const result = await query(
            `SELECT
                m.id,
                m.name,
                m.phone,
                cm.role,
                cm.community_id,
                c.slug as community_slug,
                cm.is_active
             FROM members m
             JOIN community_memberships cm ON m.id = cm.member_id
             JOIN communities c ON cm.community_id = c.id
             WHERE m.phone ILIKE $1
               AND cm.is_active = TRUE
               AND m.is_active = TRUE
             ORDER BY c.slug = 'main-community' DESC, cm.joined_at DESC
             LIMIT 1`,
            [normalizedPhone]
        );

        if (result.rows.length === 0) {
            console.log(`[Conversation Service] ✗ Phone number not found or member inactive`);
            return { isValid: false };
        }

        const member = result.rows[0];
        console.log(`[Conversation Service] ✓ Valid member: ${member.name} (${member.role}) in ${member.community_slug}`);

        return {
            isValid: true,
            memberName: member.name,
            memberId: member.id,
            role: member.role || 'member',
            communityId: member.community_id
        };
    } catch (error: any) {
        console.error(`[Conversation Service] Error validating member:`, error.message);
        return { isValid: false };
    }
}

/**
 * Get or create conversation session for a phone number
 */
export function getOrCreateSession(phoneNumber: string, memberName: string): ConversationSession {
    // Check if session exists
    let session = conversationStore.get(phoneNumber);

    if (session) {
        // Check if session has expired
        const timeSinceLastActivity = Date.now() - session.lastActivity;
        if (timeSinceLastActivity > SESSION_TIMEOUT_MS) {
            console.log(`[Conversation Service] Session expired for ${memberName}, creating new session`);
            session = undefined;
        }
    }

    // Create new session if needed
    if (!session) {
        console.log(`[Conversation Service] Creating new session for ${memberName}`);
        session = {
            phoneNumber,
            memberName,
            history: [],
            lastActivity: Date.now()
        };
        conversationStore.set(phoneNumber, session);
    }

    return session;
}

/**
 * Add query to conversation history
 */
export function addToHistory(
    phoneNumber: string,
    query: string,
    intent: string,
    entities: ExtractedEntities,
    resultCount: number
): void {
    const session = conversationStore.get(phoneNumber);
    if (!session) {
        console.warn(`[Conversation Service] No session found for phone number when adding to history`);
        return;
    }

    const entry: ConversationEntry = {
        query,
        timestamp: Date.now(),
        intent,
        entities,
        resultCount
    };

    // Add to history (keep only last MAX_HISTORY_ENTRIES)
    session.history.push(entry);
    if (session.history.length > MAX_HISTORY_ENTRIES) {
        session.history.shift(); // Remove oldest entry
    }

    // Update last activity
    session.lastActivity = Date.now();

    console.log(`[Conversation Service] Added to history. Total entries: ${session.history.length}`);
}

/**
 * Get conversation history for a phone number
 */
export function getHistory(phoneNumber: string): ConversationEntry[] {
    const session = conversationStore.get(phoneNumber);
    return session ? session.history : [];
}

/**
 * Build context string from conversation history for LLM
 */
export function buildConversationContext(phoneNumber: string): string {
    const history = getHistory(phoneNumber);

    if (history.length === 0) {
        return '';
    }

    // Build context summary
    const contextLines: string[] = [
        'Previous conversation:',
    ];

    history.forEach((entry, index) => {
        const timeAgo = Math.floor((Date.now() - entry.timestamp) / 1000); // seconds ago
        let timeStr = '';
        if (timeAgo < 60) {
            timeStr = 'just now';
        } else if (timeAgo < 3600) {
            timeStr = `${Math.floor(timeAgo / 60)} minutes ago`;
        } else {
            timeStr = `${Math.floor(timeAgo / 3600)} hours ago`;
        }

        contextLines.push(`${index + 1}. "${entry.query}" (${timeStr}, ${entry.resultCount} results)`);
    });

    return contextLines.join('\n');
}

/**
 * Clear old sessions (cleanup task - can be called periodically)
 */
export function cleanupExpiredSessions(): number {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [phoneNumber, session] of conversationStore.entries()) {
        if (now - session.lastActivity > SESSION_TIMEOUT_MS) {
            conversationStore.delete(phoneNumber);
            cleanedCount++;
        }
    }

    if (cleanedCount > 0) {
        console.log(`[Conversation Service] Cleaned up ${cleanedCount} expired sessions`);
    }

    return cleanedCount;
}

/**
 * Get total active sessions (for monitoring)
 */
export function getActiveSessionCount(): number {
    return conversationStore.size;
}

// Run cleanup every 10 minutes
setInterval(() => {
    cleanupExpiredSessions();
}, 10 * 60 * 1000);
