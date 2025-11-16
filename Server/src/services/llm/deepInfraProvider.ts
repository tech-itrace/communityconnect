/**
 * DeepInfra LLM Provider
 * 
 * Implements LLM provider interface for DeepInfra API
 * Uses Meta-Llama-3.1-8B-Instruct for inference
 * Uses BAAI/bge-base-en-v1.5 for embeddings (768 dimensions)
 */

import axios, { AxiosError } from 'axios';
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

export class DeepInfraProvider implements ILLMProvider {
    readonly name = LLMProviderType.DEEPINFRA;
    readonly config: LLMConfig;
    
    private readonly inferenceUrl: string;
    private readonly embeddingUrl: string;
    
    constructor(config: LLMConfig) {
        this.config = {
            maxRetries: 3,
            timeout: 15000,
            temperature: 0.3,
            enableRetryBackoff: true, // Default: enable backoff
            retryDelayMs: 1000, // Default: 1 second base delay
            ...config
        };
        
        this.inferenceUrl = `https://api.deepinfra.com/v1/inference/${config.model}`;
        this.embeddingUrl = config.embeddingModel 
            ? `https://api.deepinfra.com/v1/inference/${config.embeddingModel}`
            : 'https://api.deepinfra.com/v1/inference/BAAI/bge-base-en-v1.5';
    }
    
    /**
     * Generate text completion with Llama 3.1 chat template
     */
    async generate(request: LLMGenerateRequest): Promise<LLMGenerateResponse> {
        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
        const maxRetries = this.config.maxRetries || 3;
        
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                // Format with Llama 3.1 chat template
                const formattedInput = this.formatChatTemplate(request.messages);
                
                const payload = {
                    input: formattedInput,
                    temperature: request.temperature ?? this.config.temperature,
                    max_tokens: request.maxTokens || 1000,
                    stop: request.stopSequences || [
                        "<|eot_id|>",
                        "<|end_of_text|>",
                        "<|eom_id|>"
                    ]
                };
                
                const response = await axios.post(this.inferenceUrl, payload, {
                    headers: {
                        'Authorization': `Bearer ${this.config.apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: this.config.timeout
                });
                
                const generatedText = response.data?.results?.[0]?.generated_text || '';
                
                return {
                    text: generatedText.trim(),
                    usage: {
                        promptTokens: 0, // DeepInfra doesn't provide token counts
                        completionTokens: 0,
                        totalTokens: 0
                    }
                };
                
            } catch (error) {
                const axiosError = error as AxiosError;
                const isRateLimitOrBusy = axiosError.response?.status === 429 || 
                                         (axiosError.response?.data as any)?.detail?.includes('busy');
                const isTimeout = axiosError.code === 'ECONNABORTED' || axiosError.message?.includes('timeout');
                const isLastAttempt = attempt === maxRetries;
                
                // Retry on rate limit or model busy
                if (isRateLimitOrBusy && !isLastAttempt) {
                    const waitTime = this.config.enableRetryBackoff 
                        ? Math.pow(2, attempt) * (this.config.retryDelayMs || 1000) // Exponential: 1s, 2s, 4s
                        : (this.config.retryDelayMs || 100); // Fixed delay (fast for tests)
                    
                    console.log(`[DeepInfra] Rate limited/busy, retrying in ${waitTime}ms (attempt ${attempt + 1}/${maxRetries})`);
                    await delay(waitTime);
                    continue;
                }
                
                // Throw error on last attempt
                throw new LLMProviderError(
                    axiosError.message || 'DeepInfra API call failed',
                    LLMProviderType.DEEPINFRA,
                    axiosError.response?.status,
                    isRateLimitOrBusy,
                    isTimeout
                );
            }
        }
        
        throw new LLMProviderError(
            'DeepInfra API call failed after retries',
            LLMProviderType.DEEPINFRA,
            undefined,
            false,
            false
        );
    }
    
    /**
     * Generate embeddings using BAAI/bge-base-en-v1.5 (768 dimensions)
     */
    async getEmbedding(request: EmbeddingRequest): Promise<EmbeddingResponse> {
        try {
            const texts = Array.isArray(request.text) ? request.text : [request.text];
            
            const payload = {
                inputs: texts
            };
            
            const response = await axios.post(this.embeddingUrl, payload, {
                headers: {
                    'Authorization': `Bearer ${this.config.apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: this.config.timeout
            });
            
            // DeepInfra returns embeddings array directly
            const embeddings = response.data.embeddings || response.data;
            
            return {
                embeddings: Array.isArray(embeddings[0]) ? embeddings : [embeddings],
                dimensions: 768 // BAAI/bge-base-en-v1.5 produces 768-dim vectors
            };
            
        } catch (error) {
            const axiosError = error as AxiosError;
            throw new LLMProviderError(
                axiosError.message || 'DeepInfra embedding generation failed',
                LLMProviderType.DEEPINFRA,
                axiosError.response?.status
            );
        }
    }
    
    /**
     * Check if DeepInfra API is accessible
     */
    async healthCheck(): Promise<boolean> {
        try {
            // Try a minimal inference request
            const response = await axios.post(
                this.inferenceUrl,
                {
                    input: "test",
                    max_tokens: 1
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.config.apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 5000
                }
            );
            
            return response.status === 200;
        } catch (error) {
            return false;
        }
    }
    
    /**
     * Format messages using Llama 3.1 chat template
     */
    private formatChatTemplate(messages: Array<{ role: string; content: string }>): string {
        let formatted = '<|begin_of_text|>';
        
        for (const message of messages) {
            formatted += `<|start_header_id|>${message.role}<|end_header_id|>\n\n${message.content}<|eot_id|>`;
        }
        
        formatted += '<|start_header_id|>assistant<|end_header_id|>\n\n';
        
        return formatted;
    }
}
