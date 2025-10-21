import { Router, Request, Response } from 'express';
import { processNaturalLanguageQuery } from '../services/nlSearchService';
import { validateMember, getOrCreateSession, addToHistory, buildConversationContext } from '../services/conversationService';

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
        const phoneNumber = From?.replace('whatsapp:+91', '').replace('whatsapp:+', '');

        console.log(`[WhatsApp] Message from ${ProfileName} (${phoneNumber}): "${Body}"`);

        // Validate member
        const memberValidation = await validateMember(phoneNumber);
        if (!memberValidation.isValid) {
            return res.status(200).send(
                `Sorry, this service is only available to community members. Please contact the administrator.`
            );
        }

        // Get conversation context
        const session = getOrCreateSession(phoneNumber, memberValidation.memberName || ProfileName);
        const conversationContext = buildConversationContext(phoneNumber);

        // Process query
        const result = await processNaturalLanguageQuery(Body, 5, conversationContext);

        // Add to history
        addToHistory(
            phoneNumber,
            Body,
            result.understanding.intent,
            result.understanding.entities,
            result.results.members.length
        );

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
