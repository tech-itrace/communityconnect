/**
 * Google Gemini LLM Provider
 * 
 * Implements LLM provider interface for Google Gemini API
 * Uses gemini-2.0-flash-exp for inference (fast, cost-effective, equivalent to Llama 8B)
 * Uses text-embedding-004 for embeddings (768 dimensions)
 */

import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import {
    ILLMProvider,
    LLMConfig,
    LLMGenerateRequest,
    LLMGenerateResponse,
    EmbeddingRequest,
    EmbeddingResponse,
    LLMProviderType,
    LLMProviderError
} from './types';

export class GeminiProvider implements ILLMProvider {
    readonly name = LLMProviderType.GOOGLE_GEMINI;
    readonly config: LLMConfig;
    
    private readonly genAI: GoogleGenerativeAI;
    private readonly inferenceModel: GenerativeModel;
    private readonly embeddingModel: GenerativeModel;
    
    constructor(config: LLMConfig) {
        this.config = {
            maxRetries: 3,
            timeout: 15000,
            temperature: 0.3,
            enableRetryBackoff: true, // Default: enable backoff
            retryDelayMs: 1000, // Default: 1 second base delay
            ...config,
            model: config.model || 'gemini-2.0-flash-exp',
            embeddingModel: config.embeddingModel || 'text-embedding-004'
        };
        
        this.genAI = new GoogleGenerativeAI(config.apiKey);
        
        // Initialize inference model (gemini-2.0-flash-exp)
        this.inferenceModel = this.genAI.getGenerativeModel({
            model: this.config.model,
            generationConfig: {
                temperature: this.config.temperature,
                maxOutputTokens: 1000,
            }
        });
        
        // Initialize embedding model (text-embedding-004)
        this.embeddingModel = this.genAI.getGenerativeModel({
            model: this.config.embeddingModel!
        });
    }
    
    /**
     * Generate text completion with Gemini
     */
    async generate(request: LLMGenerateRequest): Promise<LLMGenerateResponse> {
        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
        const maxRetries = this.config.maxRetries || 3;
        
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                // Convert messages to Gemini format
                const prompt = this.formatMessages(request.messages);
                
                // Configure generation
                const generationConfig = {
                    temperature: request.temperature ?? this.config.temperature,
                    maxOutputTokens: request.maxTokens || 1000,
                    stopSequences: request.stopSequences,
                };
                
                // Generate content
                const result = await this.inferenceModel.generateContent({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    generationConfig
                });
                
                const response = result.response;
                const text = response.text();
                
                return {
                    text: text.trim(),
                    finishReason: response.candidates?.[0]?.finishReason,
                    usage: {
                        promptTokens: response.usageMetadata?.promptTokenCount || 0,
                        completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
                        totalTokens: response.usageMetadata?.totalTokenCount || 0
                    }
                };
                
            } catch (error: any) {
                const isRateLimitError = error.message?.includes('429') || 
                                        error.message?.includes('RESOURCE_EXHAUSTED') ||
                                        error.message?.includes('quota');
                const isTimeout = error.message?.includes('timeout') || 
                                 error.message?.includes('DEADLINE_EXCEEDED');
                const isLastAttempt = attempt === maxRetries;
                
                // Retry on rate limit
                if (isRateLimitError && !isLastAttempt) {
                    const waitTime = this.config.enableRetryBackoff 
                        ? Math.pow(2, attempt) * (this.config.retryDelayMs || 1000) // Exponential: 1s, 2s, 4s
                        : (this.config.retryDelayMs || 100); // Fixed delay (fast for tests)
                    
                    console.log(`[Gemini] Rate limited, retrying in ${waitTime}ms (attempt ${attempt + 1}/${maxRetries})`);
                    await delay(waitTime);
                    continue;
                }
                
                // Throw error on last attempt
                throw new LLMProviderError(
                    error.message || 'Gemini API call failed',
                    LLMProviderType.GOOGLE_GEMINI,
                    error.status,
                    isRateLimitError,
                    isTimeout
                );
            }
        }
        
        throw new LLMProviderError(
            'Gemini API call failed after retries',
            LLMProviderType.GOOGLE_GEMINI,
            undefined,
            false,
            false
        );
    }
    
    /**
     * Generate embeddings using text-embedding-004 (768 dimensions)
     */
    async getEmbedding(request: EmbeddingRequest): Promise<EmbeddingResponse> {
        try {
            const texts = Array.isArray(request.text) ? request.text : [request.text];
            
            // Gemini embedding API processes one text at a time
            const embeddings: number[][] = [];
            
            for (const text of texts) {
                const result = await this.embeddingModel.embedContent(text);
                embeddings.push(result.embedding.values);
            }
            
            return {
                embeddings,
                dimensions: 768 // text-embedding-004 produces 768-dim vectors
            };
            
        } catch (error: any) {
            throw new LLMProviderError(
                error.message || 'Gemini embedding generation failed',
                LLMProviderType.GOOGLE_GEMINI,
                error.status
            );
        }
    }
    
    /**
     * Check if Gemini API is accessible
     */
    async healthCheck(): Promise<boolean> {
        try {
            // Try a minimal generation request
            const result = await this.inferenceModel.generateContent({
                contents: [{ role: 'user', parts: [{ text: 'test' }] }],
                generationConfig: { maxOutputTokens: 1 }
            });
            
            return result.response.text().length >= 0;
        } catch (error) {
            return false;
        }
    }
    
    /**
     * Format messages for Gemini (combine system + user messages)
     * Gemini doesn't have explicit system role, so we prepend system message to first user message
     */
    private formatMessages(messages: Array<{ role: string; content: string }>): string {
        const systemMessages = messages.filter(m => m.role === 'system');
        const userMessages = messages.filter(m => m.role === 'user');
        
        let prompt = '';
        
        // Add system messages as context
        if (systemMessages.length > 0) {
            prompt += systemMessages.map(m => m.content).join('\n\n') + '\n\n';
        }
        
        // Add user messages
        prompt += userMessages.map(m => m.content).join('\n\n');
        
        return prompt;
    }
}
