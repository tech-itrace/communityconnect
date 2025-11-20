#!/bin/bash

# Test embedding cache performance
# This script runs the same queries multiple times to verify caching works

API_URL="http://localhost:3000/api/search/query"
PHONE_NUMBER="+919900000000"

echo "========================================"
echo "Cache Performance Test"
echo "========================================"
echo ""

# Test query
QUERY="machine learning"

echo "Running query 3 times to test cache performance..."
echo "Query: \"$QUERY\""
echo ""

for i in {1..3}; do
    echo "-------------------------------------------"
    echo "Iteration $i/3"
    echo "-------------------------------------------"

    response=$(curl -s -X POST "$API_URL" \
        -H "Content-Type: application/json" \
        -d "{
            \"phoneNumber\": \"$PHONE_NUMBER\",
            \"query\": \"$QUERY\",
            \"options\": {
                \"maxResults\": 5,
                \"debug\": true
            }
        }")

    # Extract timing and cache info
    exec_time=$(echo "$response" | jq -r '.executionTime')
    cached=$(echo "$response" | jq -r '.debug.embeddingCached')
    cache_size=$(echo "$response" | jq -r '.debug.embeddingCacheStats.size')
    results=$(echo "$response" | jq -r '.results.members | length')

    echo "  Execution time: ${exec_time}ms"
    echo "  Embedding cached: $cached"
    echo "  Cache size: $cache_size entries"
    echo "  Results: $results members"
    echo ""

    # Small delay between requests
    sleep 1
done

echo "========================================"
echo "Expected behavior:"
echo "  - Iteration 1: embeddingCached = false (cache miss)"
echo "  - Iteration 2: embeddingCached = true (cache hit)"
echo "  - Iteration 3: embeddingCached = true (cache hit)"
echo "  - Execution time should decrease in iterations 2-3"
echo "========================================"
