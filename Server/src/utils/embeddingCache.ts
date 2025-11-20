/**
 * Simple LRU Cache for Query Embeddings
 * Reduces embedding generation API calls for common queries
 */

interface CacheEntry {
    embedding: number[];
    timestamp: number;
    hits: number;
}

class EmbeddingCache {
    private cache: Map<string, CacheEntry>;
    private maxSize: number;
    private ttlMs: number;

    constructor(maxSize: number = 1000, ttlMinutes: number = 5) {
        this.cache = new Map();
        this.maxSize = maxSize;
        this.ttlMs = ttlMinutes * 60 * 1000;
    }

    /**
     * Normalize query for consistent cache keys
     */
    private normalizeQuery(query: string): string {
        return query
            .toLowerCase()
            .trim()
            .replace(/\s+/g, ' ')
            .replace(/[?!.,;:]/g, '');
    }

    /**
     * Get embedding from cache if available and not expired
     */
    get(query: string): number[] | null {
        if (!query) {
            return null;
        }

        const key = this.normalizeQuery(query);
        const entry = this.cache.get(key);

        if (!entry) {
            return null;
        }

        // Check if expired
        const age = Date.now() - entry.timestamp;
        if (age > this.ttlMs) {
            this.cache.delete(key);
            const displayQuery = query.substring(0, Math.min(30, query.length));
            console.log(`[Embedding Cache] ✗ Cache expired for: "${displayQuery}..."`);
            return null;
        }

        // Update hit count
        entry.hits++;
        const displayQuery = query.substring(0, Math.min(30, query.length));
        console.log(`[Embedding Cache] ✓ Cache hit (${entry.hits} hits) for: "${displayQuery}..."`);

        return entry.embedding;
    }

    /**
     * Store embedding in cache
     */
    set(query: string, embedding: number[]): void {
        if (!query || !embedding || embedding.length === 0) {
            console.warn('[Embedding Cache] Skipping cache - invalid query or embedding');
            return;
        }

        const key = this.normalizeQuery(query);

        // Evict oldest entry if cache is full
        if (this.cache.size >= this.maxSize) {
            const oldestKey = this.cache.keys().next().value;
            if (oldestKey !== undefined) {
                this.cache.delete(oldestKey);
                console.log(`[Embedding Cache] Evicted oldest entry (cache full)`);
            }
        }

        this.cache.set(key, {
            embedding,
            timestamp: Date.now(),
            hits: 0
        });

        const displayQuery = query.substring(0, Math.min(30, query.length));
        console.log(`[Embedding Cache] ✓ Cached embedding for: "${displayQuery}..."`);
    }

    /**
     * Clear all cache entries
     */
    clear(): void {
        const size = this.cache.size;
        this.cache.clear();
        if (size > 0) {
            console.log(`[Embedding Cache] Cleared ${size} entries`);
        }
    }

    /**
     * Get cache statistics
     */
    getStats(): {
        size: number;
        maxSize: number;
        ttlMinutes: number;
        entries: Array<{ query: string; hits: number; age: number }>;
    } {
        const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
            query: key,
            hits: entry.hits,
            age: Math.floor((Date.now() - entry.timestamp) / 1000 / 60) // minutes
        }));

        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            ttlMinutes: this.ttlMs / 1000 / 60,
            entries: entries.sort((a, b) => b.hits - a.hits) // Sort by hits
        };
    }

    /**
     * Remove expired entries (cleanup)
     */
    cleanup(): number {
        const now = Date.now();
        let removed = 0;

        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > this.ttlMs) {
                this.cache.delete(key);
                removed++;
            }
        }

        if (removed > 0) {
            console.log(`[Embedding Cache] Cleaned up ${removed} expired entries`);
        }

        return removed;
    }
}

// Singleton instance
// Configuration:
// - Max 1000 queries cached
// - 5 minute TTL (embeddings are stable, can cache longer)
export const embeddingCache = new EmbeddingCache(1000, 5);

// Run cleanup every 2 minutes
setInterval(() => {
    embeddingCache.cleanup();
}, 2 * 60 * 1000);
