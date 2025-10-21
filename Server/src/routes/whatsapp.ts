import { Router, Request, Response } from 'express';
import { processNaturalLanguageQuery } from '../services/nlSearchService';
import { validateMember } from '../services/conversationService';
import { 
    getOrCreateSession, 
    addConversationEntry,
    checkMessageRateLimit,
    incrementMessageCounter,
    checkSearchRateLimit,
    incrementSearchCounter
} from '../services/sessionService';
import { ConversationEntry } from '../utils/types';

const router = Router();

// WhatsApp webhook verification (required by Twilio)
router.get('/webhook', (req: Request, res: Response) => {
    console.log('[WhatsApp] Webhook verification request');
    res.status(200).send('Webhook is active');
});

// WhatsApp message handler
router.post('/webhook', async (req: Request, res: Response) => {
    try {
        const { From, Body, ProfileName } = req.body;

        // Log raw request for debugging
        console.log('[WhatsApp] Raw request body:', req.body);

        // Validate required fields
        if (!From || !Body) {
            console.error('[WhatsApp] Missing required fields:', { From, Body });
            return res.status(200).send('Missing required fields: From or Body');
        }

        // Extract phone number (format: whatsapp:+919876543210)
        // Remove 'whatsapp:+' prefix but keep the country code (91)
        const phoneNumber = From?.replace('whatsapp:+', '');

        console.log(`[WhatsApp] Message from ${ProfileName} (${phoneNumber}): "${Body}"`);

        // 1. Validate member
        const memberValidation = await validateMember(phoneNumber);
        if (!memberValidation.isValid) {
            return res.status(200).send(
                `Sorry, this service is only available to community members. Please contact the administrator.`
            );
        }

        // 2. Check message rate limit
        const messageRateLimit = await checkMessageRateLimit(phoneNumber);
        if (!messageRateLimit.allowed) {
            console.log(`[WhatsApp] Rate limit exceeded for ${phoneNumber}`);
            return res.status(200).send(
                `⚠️ You've reached the hourly limit (${messageRateLimit.limit} messages). ` +
                `Please try again in ${messageRateLimit.retryAfter} minutes. 🙏`
            );
        }

        // 3. Get or create session (Redis-based)
        const session = await getOrCreateSession({
            userId: memberValidation.memberId || phoneNumber,
            phoneNumber: phoneNumber,
            memberName: memberValidation.memberName || ProfileName || 'User',
            role: 'member' // TODO: Get role from database
        });

        console.log(`[WhatsApp] Session: ${session.conversationHistory.length} messages in history`);

        // 4. Check search rate limit (if this is a search query)
        const searchRateLimit = await checkSearchRateLimit(phoneNumber);
        if (!searchRateLimit.allowed) {
            console.log(`[WhatsApp] Search rate limit exceeded for ${phoneNumber}`);
            return res.status(200).send(
                `⚠️ You've reached the hourly search limit (${searchRateLimit.limit} searches). ` +
                `Please try again in ${searchRateLimit.retryAfter} minutes. 🙏`
            );
        }

        // 5. Build conversation context from history
        const conversationContext = session.conversationHistory.length > 0 ? {
            previousQuery: session.conversationHistory[session.conversationHistory.length - 1]?.query,
            previousResults: [] // Could add member IDs from previous results if needed
        } : undefined;

        // 6. Process query with NL search
        const result = await processNaturalLanguageQuery(Body, 5, conversationContext);

        // 7. Increment rate limit counters
        await incrementMessageCounter(phoneNumber);
        await incrementSearchCounter(phoneNumber);

        // 8. Add to conversation history (Redis)
        const conversationEntry: ConversationEntry = {
            query: Body,
            timestamp: Date.now(),
            intent: result.understanding.intent,
            entities: result.understanding.entities,
            resultCount: result.results.members.length
        };
        await addConversationEntry(phoneNumber, conversationEntry);

        // Format response for WhatsApp
        const conversationalResponse = result.response?.conversational || 'Here are the results:';
        let response = `🔍 *${conversationalResponse}*\n\n`;

        if (result.results.members.length > 0) {
            response += `Found ${result.results.members.length} members:\n\n`;
            result.results.members.slice(0, 3).forEach((member, idx) => {
                response += `${idx + 1}. *${member.name}*\n`;
                if (member.city) response += `   📍 ${member.city}\n`;
                if (member.designation) response += `   💼 ${member.designation}\n`;
                if (member.organization) response += `   🏢 ${member.organization}\n`;
                response += '\n';
            });

            if (result.results.members.length > 3) {
                response += `... and ${result.results.members.length - 3} more\n\n`;
            }
        }

        // Add suggestions
        if (result.response?.suggestions && result.response.suggestions.length > 0) {
            response += `\n💡 *Try asking:*\n`;
            result.response.suggestions.slice(0, 2).forEach(s => {
                response += `- ${s}\n`;
            });
        }

        // Send response (Twilio automatically sends this as reply)
        res.status(200).type('text/plain').send(response);

    } catch (error: any) {
        console.error('[WhatsApp] Error processing message:', error);
        res.status(200).send('Sorry, I encountered an error processing your request. Please try again.');
    }
});

export default router;
