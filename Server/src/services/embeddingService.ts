/**
 * Embedding Service
 *
 * Handles text-to-vector embedding generation using:
 * - Primary: DeepInfra (BAAI/bge-base-en-v1.5)
 * - Fallback: Google Gemini (text-embedding-004)
 *
 * Features:
 * - Automatic fallback on rate limits or timeouts
 * - 768-dimensional embeddings
 * - Normalized vectors for cosine similarity
 */

import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';

// API Configuration
const DEEPINFRA_EMBEDDING_API_URL = 'https://api.deepinfra.com/v1/inference/BAAI/bge-base-en-v1.5';
const DEEPINFRA_API_KEY = process.env.DEEPINFRA_API_KEY;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GEMINI_EMBEDDING_MODEL = 'text-embedding-004';
const EMBEDDING_DIMENSIONS = 768;
const EMBEDDING_TIMEOUT_MS = 10000;

// Initialize Google AI for fallback
const genAI = GOOGLE_API_KEY ? new GoogleGenerativeAI(GOOGLE_API_KEY) : null;

/**
 * Generate embedding using DeepInfra (Primary provider)
 */
async function generateEmbeddingDeepInfra(text: string): Promise<number[]> {
    const response = await axios.post(
        DEEPINFRA_EMBEDDING_API_URL,
        {
            inputs: [text],
            normalize: true
        },
        {
            headers: {
                'Authorization': `Bearer ${DEEPINFRA_API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: EMBEDDING_TIMEOUT_MS
        }
    );

    const embedding = response.data.embeddings[0];

    if (!Array.isArray(embedding) || embedding.length !== EMBEDDING_DIMENSIONS) {
        throw new Error(`Invalid embedding dimensions: expected ${EMBEDDING_DIMENSIONS}, got ${embedding?.length}`);
    }

    return embedding;
}

/**
 * Generate embedding using Gemini (Fallback provider)
 */
async function generateEmbeddingGemini(text: string): Promise<number[]> {
    if (!genAI) {
        throw new Error('Google API key not configured');
    }

    const model = genAI.getGenerativeModel({ model: GEMINI_EMBEDDING_MODEL });
    const result = await model.embedContent(text);

    if (result?.embedding?.values) {
        const embedding = result.embedding.values;

        if (embedding.length !== EMBEDDING_DIMENSIONS) {
            throw new Error(`Invalid Gemini embedding dimensions: expected ${EMBEDDING_DIMENSIONS}, got ${embedding.length}`);
        }

        return embedding;
    }

    throw new Error('Invalid response format from Gemini API');
}

/**
 * Generate embedding with automatic fallback support
 *
 * @param text - Text to generate embedding for
 * @returns 768-dimensional normalized embedding vector
 * @throws Error if both providers fail
 */
export async function generateQueryEmbedding(text: string): Promise<number[]> {
    if (!DEEPINFRA_API_KEY) {
        throw new Error('DEEPINFRA_API_KEY not configured');
    }

    try {
        console.log(`[Embedding Service] Generating embedding for: "${text.substring(0, 50)}..."`);

        const embedding = await generateEmbeddingDeepInfra(text);
        console.log(`[Embedding Service] ✓ Generated ${EMBEDDING_DIMENSIONS}D embedding (DeepInfra)`);
        return embedding;

    } catch (error: any) {
        const isRateLimit = error.response?.status === 429;
        const isTimeout = error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED';

        if ((isRateLimit || isTimeout) && GOOGLE_API_KEY) {
            console.log(`[Embedding Service] DeepInfra failed, trying Gemini fallback...`);
            try {
                const embedding = await generateEmbeddingGemini(text);
                console.log(`[Embedding Service] ✓ Generated ${EMBEDDING_DIMENSIONS}D embedding (Gemini)`);
                return embedding;
            } catch (geminiError: any) {
                console.error('[Embedding Service] Gemini fallback also failed:', geminiError.message);
                throw new Error(`Both embedding providers failed: ${error.message}`);
            }
        }

        console.error('[Embedding Service] Error generating embedding:', error.message);
        throw new Error(`Failed to generate embedding: ${error.message}`);
    }
}

/**
 * Get embedding dimensions
 */
export function getEmbeddingDimensions(): number {
    return EMBEDDING_DIMENSIONS;
}
