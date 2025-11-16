/**
 * LLM Provider Interface and Types
 * 
 * Defines the contract for all LLM providers (DeepInfra, Google Gemini, etc.)
 * Enables easy swapping and fallback between different LLM services
 */

export interface LLMConfig {
    apiKey: string;
    model: string;
    embeddingModel?: string;
    maxRetries?: number;
    timeout?: number;
    temperature?: number;
    enableRetryBackoff?: boolean; // Enable exponential backoff (default: true)
    retryDelayMs?: number; // Base delay in ms (default: 1000)
}

export interface LLMMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface LLMGenerateRequest {
    messages: LLMMessage[];
    temperature?: number;
    maxTokens?: number;
    stopSequences?: string[];
}

export interface LLMGenerateResponse {
    text: string;
    finishReason?: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}

export interface EmbeddingRequest {
    text: string | string[];
    model?: string;
}

export interface EmbeddingResponse {
    embeddings: number[][];
    dimensions: number;
}

export enum LLMProviderType {
    DEEPINFRA = 'deepinfra',
    GOOGLE_GEMINI = 'google_gemini',
}

/**
 * Base interface that all LLM providers must implement
 */
export interface ILLMProvider {
    readonly name: LLMProviderType;
    readonly config: LLMConfig;
    
    /**
     * Generate text completion from messages
     */
    generate(request: LLMGenerateRequest): Promise<LLMGenerateResponse>;
    
    /**
     * Generate embeddings for text
     */
    getEmbedding(request: EmbeddingRequest): Promise<EmbeddingResponse>;
    
    /**
     * Check if provider is healthy and available
     */
    healthCheck(): Promise<boolean>;
}

/**
 * Error thrown when LLM provider fails
 */
export class LLMProviderError extends Error {
    constructor(
        message: string,
        public provider: LLMProviderType,
        public statusCode?: number,
        public isRateLimitError: boolean = false,
        public isTimeout: boolean = false
    ) {
        super(message);
        this.name = 'LLMProviderError';
    }
}
