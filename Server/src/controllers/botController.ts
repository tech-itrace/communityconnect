import { Request, Response, NextFunction } from 'express';
import { processNaturalLanguageQuery } from '../services/nlSearchService';

export async function handleBotMessage(req: Request, res: Response, next: NextFunction) {
    try {
        console.log("[handleBotMessage] Incoming request body:", req.body);
        const { message } = req.body;
        if (!message) {
            console.warn("[handleBotMessage] No message provided in request body.");
            return res.status(400).json({ error: 'Message is required' });
        }
        console.log("[handleBotMessage] Message received:", message);
        
        // Use natural language search to query the database
        console.log("[handleBotMessage] Processing query with database search...");
        const searchResult = await processNaturalLanguageQuery(message, 10);
        
        // Return the conversational response from the search result
        const response = searchResult.response?.conversational || 'I could not process your request at this time.';
        console.log("[handleBotMessage] Search response:", response);
        console.log("[handleBotMessage] Found", searchResult.results.members.length, "members");
        
        res.json({ 
            response,
            // Optionally include additional data
            resultsCount: searchResult.results.members.length,
            suggestions: searchResult.response?.suggestions || []
        });
    } catch (err) {
        console.error("[handleBotMessage] Error:", err);
        next(err);
    }
}
