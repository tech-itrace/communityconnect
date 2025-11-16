/**
 * LLM Factory with Automatic Fallback
 * 
 * Manages multiple LLM providers with automatic fallback
 * Implements circuit breaker pattern to avoid hammering failed providers
 */

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
import { DeepInfraProvider } from './deepInfraProvider';
import { GeminiProvider } from './geminiProvider';

interface CircuitBreakerState {
    failures: number;
    lastFailureTime: number;
    isOpen: boolean;
}

export class LLMFactory {
    private providers: ILLMProvider[] = [];
    private circuitBreakers: Map<LLMProviderType, CircuitBreakerState> = new Map();
    
    // Circuit breaker thresholds
    private readonly FAILURE_THRESHOLD = 5;
    private readonly RESET_TIMEOUT = 60000; // 1 minute
    
    constructor() {
        this.initializeProviders();
    }
    
    /**
     * Initialize providers from environment variables
     */
    private initializeProviders(): void {
        const primaryProvider = process.env.LLM_PROVIDER_PRIMARY || 'deepinfra';
        const fallbackProvider = process.env.LLM_PROVIDER_FALLBACK || 'google_gemini';
        
        // Retry configuration from environment
        const enableRetryBackoff = process.env.LLM_ENABLE_RETRY_BACKOFF !== 'false'; // Default: true
        const retryDelayMs = parseInt(process.env.LLM_RETRY_DELAY_MS || '1000', 10);
        const maxRetries = parseInt(process.env.LLM_MAX_RETRIES || '3', 10);
        
        const providers: Array<{ type: string; config: LLMConfig }> = [];
        
        // Primary provider
        if (primaryProvider === 'deepinfra' && process.env.DEEPINFRA_API_KEY) {
            providers.push({
                type: 'deepinfra',
                config: {
                    apiKey: process.env.DEEPINFRA_API_KEY,
                    model: 'meta-llama/Meta-Llama-3.1-8B-Instruct',
                    embeddingModel: 'BAAI/bge-base-en-v1.5',
                    enableRetryBackoff,
                    retryDelayMs,
                    maxRetries
                }
            });
        } else if (primaryProvider === 'google_gemini' && process.env.GOOGLE_API_KEY) {
            providers.push({
                type: 'google_gemini',
                config: {
                    apiKey: process.env.GOOGLE_API_KEY,
                    model: 'gemini-2.0-flash-exp',
                    embeddingModel: 'text-embedding-004',
                    enableRetryBackoff,
                    retryDelayMs,
                    maxRetries
                }
            });
        }
        
        // Fallback provider (if different from primary)
        if (fallbackProvider !== primaryProvider) {
            if (fallbackProvider === 'deepinfra' && process.env.DEEPINFRA_API_KEY) {
                providers.push({
                    type: 'deepinfra',
                    config: {
                        apiKey: process.env.DEEPINFRA_API_KEY,
                        model: 'meta-llama/Meta-Llama-3.1-8B-Instruct',
                        embeddingModel: 'BAAI/bge-base-en-v1.5',
                        enableRetryBackoff,
                        retryDelayMs,
                        maxRetries
                    }
                });
            } else if (fallbackProvider === 'google_gemini' && process.env.GOOGLE_API_KEY) {
                providers.push({
                    type: 'google_gemini',
                    config: {
                        apiKey: process.env.GOOGLE_API_KEY,
                        model: 'gemini-2.0-flash-exp',
                        embeddingModel: 'text-embedding-004',
                        enableRetryBackoff,
                        retryDelayMs,
                        maxRetries
                    }
                });
            }
        }
        
        // Initialize provider instances
        for (const { type, config } of providers) {
            try {
                if (type === 'deepinfra') {
                    this.providers.push(new DeepInfraProvider(config));
                    this.circuitBreakers.set(LLMProviderType.DEEPINFRA, {
                        failures: 0,
                        lastFailureTime: 0,
                        isOpen: false
                    });
                } else if (type === 'google_gemini') {
                    this.providers.push(new GeminiProvider(config));
                    this.circuitBreakers.set(LLMProviderType.GOOGLE_GEMINI, {
                        failures: 0,
                        lastFailureTime: 0,
                        isOpen: false
                    });
                }
            } catch (error) {
                console.error(`[LLM Factory] Failed to initialize ${type} provider:`, error);
            }
        }
        
        if (this.providers.length === 0) {
            throw new Error('No LLM providers configured. Set DEEPINFRA_API_KEY or GOOGLE_API_KEY');
        }
        
        console.log(`[LLM Factory] Initialized ${this.providers.length} provider(s): ${this.providers.map(p => p.name).join(', ')}`);
    }
    
    /**
     * Generate text with automatic fallback
     */
    async generate(request: LLMGenerateRequest): Promise<LLMGenerateResponse> {
        const errors: Error[] = [];
        
        for (const provider of this.providers) {
            // Check circuit breaker
            if (this.isCircuitOpen(provider.name)) {
                console.log(`[LLM Factory] Circuit breaker open for ${provider.name}, skipping`);
                continue;
            }
            
            try {
                console.log(`[LLM Factory] Attempting generation with ${provider.name}`);
                const response = await provider.generate(request);
                
                // Reset circuit breaker on success
                this.recordSuccess(provider.name);
                
                return response;
            } catch (error) {
                console.error(`[LLM Factory] ${provider.name} failed:`, error);
                
                // Record failure for circuit breaker
                if (error instanceof LLMProviderError) {
                    this.recordFailure(provider.name, error.isRateLimitError || error.isTimeout);
                }
                
                errors.push(error as Error);
                
                // Continue to next provider
                continue;
            }
        }
        
        // All providers failed
        throw new LLMProviderError(
            `All LLM providers failed. Errors: ${errors.map(e => e.message).join('; ')}`,
            this.providers[0]?.name || LLMProviderType.DEEPINFRA,
            undefined,
            false,
            false
        );
    }
    
    /**
     * Generate embeddings with automatic fallback
     */
    async getEmbedding(request: EmbeddingRequest): Promise<EmbeddingResponse> {
        const errors: Error[] = [];
        
        for (const provider of this.providers) {
            // Check circuit breaker
            if (this.isCircuitOpen(provider.name)) {
                console.log(`[LLM Factory] Circuit breaker open for ${provider.name}, skipping`);
                continue;
            }
            
            try {
                console.log(`[LLM Factory] Attempting embedding with ${provider.name}`);
                const response = await provider.getEmbedding(request);
                
                // Reset circuit breaker on success
                this.recordSuccess(provider.name);
                
                return response;
            } catch (error) {
                console.error(`[LLM Factory] ${provider.name} embedding failed:`, error);
                
                // Record failure for circuit breaker
                if (error instanceof LLMProviderError) {
                    this.recordFailure(provider.name, false);
                }
                
                errors.push(error as Error);
                
                // Continue to next provider
                continue;
            }
        }
        
        // All providers failed
        throw new LLMProviderError(
            `All LLM providers failed for embedding. Errors: ${errors.map(e => e.message).join('; ')}`,
            this.providers[0]?.name || LLMProviderType.DEEPINFRA,
            undefined,
            false,
            false
        );
    }
    
    /**
     * Check if circuit breaker is open for a provider
     */
    private isCircuitOpen(providerType: LLMProviderType): boolean {
        const state = this.circuitBreakers.get(providerType);
        if (!state) return false;
        
        // Circuit is open if failure threshold exceeded
        if (state.failures >= this.FAILURE_THRESHOLD) {
            const timeSinceLastFailure = Date.now() - state.lastFailureTime;
            
            // Reset circuit after timeout
            if (timeSinceLastFailure > this.RESET_TIMEOUT) {
                state.isOpen = false;
                state.failures = 0;
                console.log(`[LLM Factory] Circuit breaker reset for ${providerType}`);
                return false;
            }
            
            state.isOpen = true;
            return true;
        }
        
        return false;
    }
    
    /**
     * Record a provider failure
     */
    private recordFailure(providerType: LLMProviderType, isTransient: boolean): void {
        const state = this.circuitBreakers.get(providerType);
        if (!state) return;
        
        // Only count non-transient failures towards circuit breaker
        if (!isTransient) {
            state.failures++;
            state.lastFailureTime = Date.now();
            
            if (state.failures >= this.FAILURE_THRESHOLD) {
                console.warn(`[LLM Factory] Circuit breaker opened for ${providerType} after ${state.failures} failures`);
            }
        }
    }
    
    /**
     * Record a provider success
     */
    private recordSuccess(providerType: LLMProviderType): void {
        const state = this.circuitBreakers.get(providerType);
        if (!state) return;
        
        // Reset failure count on success
        if (state.failures > 0) {
            console.log(`[LLM Factory] Resetting failure count for ${providerType}`);
            state.failures = 0;
            state.isOpen = false;
        }
    }
    
    /**
     * Get status of all providers
     */
    getProviderStatus(): Array<{ name: string; circuitOpen: boolean; failures: number }> {
        return this.providers.map(provider => {
            const state = this.circuitBreakers.get(provider.name);
            return {
                name: provider.name,
                circuitOpen: state?.isOpen || false,
                failures: state?.failures || 0
            };
        });
    }
}

// Singleton instance
let factoryInstance: LLMFactory | null = null;

/**
 * Get or create LLM factory singleton
 */
export function getLLMFactory(): LLMFactory {
    if (!factoryInstance) {
        factoryInstance = new LLMFactory();
    }
    return factoryInstance;
}
