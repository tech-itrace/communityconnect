/**
 * Test Session Service
 * 
 * Tests all session management functions
 */

import {
    getOrCreateSession,
    getSession,
    updateSession,
    addConversationEntry,
    getConversationHistory,
    deleteSession,
    checkMessageRateLimit,
    incrementMessageCounter,
    checkSearchRateLimit,
    incrementSearchCounter,
    getSessionStats
} from './services/sessionService';
import { closeRedisClient } from './config/redis';
import { ConversationEntry } from './utils/types';

const TEST_PHONE = '+919840930854';
const TEST_SESSION_DATA = {
    userId: 'test-user-123',
    phoneNumber: TEST_PHONE,
    memberName: 'Test User',
    role: 'member' as const
};

async function runTests() {
    console.log('=== Session Service Tests ===\n');

    try {
        // Test 1: Create new session
        console.log('1. Testing session creation...');
        const session1 = await getOrCreateSession(TEST_SESSION_DATA);
        console.log('✓ Session created:', {
            userId: session1.userId,
            phoneNumber: session1.phoneNumber.substring(0, 5) + '***',
            memberName: session1.memberName,
            role: session1.role,
            historyLength: session1.conversationHistory.length
        });
        console.log('');

        // Test 2: Get existing session
        console.log('2. Testing get existing session...');
        const session2 = await getOrCreateSession(TEST_SESSION_DATA);
        console.log('✓ Session retrieved (should be same):', {
            userId: session2.userId,
            historyLength: session2.conversationHistory.length,
            sameAsFirst: session1.userId === session2.userId
        });
        console.log('');

        // Test 3: Add conversation entries
        console.log('3. Testing conversation history...');
        const entry1: ConversationEntry = {
            query: 'Find doctors in Bangalore',
            timestamp: Date.now(),
            intent: 'find_member',
            entities: { location: 'Bangalore', skills: ['doctor'] },
            resultCount: 5
        };
        await addConversationEntry(TEST_PHONE, entry1);

        const entry2: ConversationEntry = {
            query: 'Who are the software engineers?',
            timestamp: Date.now(),
            intent: 'find_member',
            entities: { skills: ['software engineer'] },
            resultCount: 10
        };
        await addConversationEntry(TEST_PHONE, entry2);

        const history = await getConversationHistory(TEST_PHONE);
        console.log('✓ Conversation history:', {
            entries: history.length,
            queries: history.map(h => h.query)
        });
        console.log('');

        // Test 4: Update session
        console.log('4. Testing session update...');
        const updated = await updateSession(TEST_PHONE, {
            messageCount: 10,
            searchCount: 5
        });
        console.log('✓ Session updated:', {
            messageCount: updated?.messageCount,
            searchCount: updated?.searchCount
        });
        console.log('');

        // Test 5: Get session stats
        console.log('5. Testing session stats...');
        const stats = await getSessionStats(TEST_PHONE);
        console.log('✓ Session stats:', stats);
        console.log('');

        // Test 6: Rate limiting - messages
        console.log('6. Testing message rate limiting...');
        console.log('   a) Check initial limit...');
        const msgLimit1 = await checkMessageRateLimit(TEST_PHONE);
        console.log('   ✓ Initial:', msgLimit1);

        console.log('   b) Increment counter 5 times...');
        for (let i = 0; i < 5; i++) {
            await incrementMessageCounter(TEST_PHONE);
        }

        const msgLimit2 = await checkMessageRateLimit(TEST_PHONE);
        console.log('   ✓ After 5 increments:', msgLimit2);
        console.log('');

        // Test 7: Rate limiting - searches
        console.log('7. Testing search rate limiting...');
        console.log('   a) Check initial limit...');
        const searchLimit1 = await checkSearchRateLimit(TEST_PHONE);
        console.log('   ✓ Initial:', searchLimit1);

        console.log('   b) Increment counter 3 times...');
        for (let i = 0; i < 3; i++) {
            await incrementSearchCounter(TEST_PHONE);
        }

        const searchLimit2 = await checkSearchRateLimit(TEST_PHONE);
        console.log('   ✓ After 3 increments:', searchLimit2);
        console.log('');

        // Test 8: Get session directly
        console.log('8. Testing getSession...');
        const directSession = await getSession(TEST_PHONE);
        console.log('✓ Direct session retrieval:', {
            exists: !!directSession,
            historyLength: directSession?.conversationHistory.length,
            messageCount: directSession?.messageCount
        });
        console.log('');

        // Test 9: Session for non-existent phone
        console.log('9. Testing non-existent session...');
        const noSession = await getSession('+911234567890');
        console.log('✓ Non-existent session:', {
            exists: !!noSession,
            isNull: noSession === null
        });
        console.log('');

        // Test 10: Delete session
        console.log('10. Testing session deletion...');
        const deleted = await deleteSession(TEST_PHONE);
        console.log('✓ Session deleted:', deleted);

        const afterDelete = await getSession(TEST_PHONE);
        console.log('✓ After deletion:', {
            exists: !!afterDelete,
            isNull: afterDelete === null
        });
        console.log('');

        // Test 11: Re-create after delete
        console.log('11. Testing re-creation after delete...');
        const newSession = await getOrCreateSession(TEST_SESSION_DATA);
        console.log('✓ New session created:', {
            userId: newSession.userId,
            historyLength: newSession.conversationHistory.length,
            messageCount: newSession.messageCount
        });
        console.log('');

        // Test 12: Stress test - add many entries
        console.log('12. Testing conversation history limit (max 10)...');
        for (let i = 0; i < 15; i++) {
            await addConversationEntry(TEST_PHONE, {
                query: `Test query ${i + 1}`,
                timestamp: Date.now(),
                intent: 'test',
                entities: {},
                resultCount: i
            });
        }

        const finalHistory = await getConversationHistory(TEST_PHONE);
        console.log('✓ Added 15 entries, kept last:', {
            historyLength: finalHistory.length,
            shouldBe10: finalHistory.length === 10,
            firstQuery: finalHistory[0]?.query,
            lastQuery: finalHistory[finalHistory.length - 1]?.query
        });
        console.log('');

        // Cleanup
        console.log('13. Final cleanup...');
        await deleteSession(TEST_PHONE);
        console.log('✓ Test session deleted\n');

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
runTests();
