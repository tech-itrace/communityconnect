import { Request, Response, NextFunction } from 'express';
import { getLLMResponse } from '../services/llmService';
import { MessageRequest } from '../models/message';

export async function handleBotMessage(req: Request, res: Response, next: NextFunction) {
    try {
        console.log("[handleBotMessage] Incoming request body:", req.body);
        const { message } = req.body as MessageRequest;
        if (!message) {
            console.warn("[handleBotMessage] No message provided in request body.");
            return res.status(400).json({ error: 'Message is required' });
        }
        console.log("[handleBotMessage] Message received:", message);
        const response = await getLLMResponse(message);
        console.log("[handleBotMessage] LLM response:", response);
        res.json({ response });
    } catch (err) {
        console.error("[handleBotMessage] Error:", err);
        next(err);
    }
}
