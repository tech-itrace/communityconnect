#!/bin/bash

# Quick curl test examples for Community Connect API
# Usage: Run individual commands to test specific intents

# Configuration
BASE_URL="${API_URL:-http://localhost:3000}"
PHONE="${PHONE_NUMBER:-9876543210}"

echo "Testing Community Connect API"
echo "Base URL: $BASE_URL"
echo "Phone: $PHONE"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Test 1: Business Intent (Fast - regex extraction expected)
echo -e "${GREEN}Test 1: Business Intent - CEO or founders${NC}"
curl -X POST "$BASE_URL/api/search/query" \
  -H "Content-Type: application/json" \
  -d "{
    \"query\": \"CEO or founders\",
    \"phoneNumber\": \"$PHONE\",
    \"includeMetadata\": true
  }" | jq '.data.performance, .data.intentMetadata, (.data.results | length) as $count | {result_count: $count}'
echo ""
echo ""

# Test 2: Peers Intent (Fast - regex extraction expected)
echo -e "${GREEN}Test 2: Peers Intent - Mechanical Engineering 2014${NC}"
curl -X POST "$BASE_URL/api/search/query" \
  -H "Content-Type: application/json" \
  -d "{
    \"query\": \"Mechanical Engineering students from 2014\",
    \"phoneNumber\": \"$PHONE\",
    \"includeMetadata\": true
  }" | jq '.data.performance, .data.intentMetadata, (.data.results | length) as $count | {result_count: $count}'
echo ""
echo ""

# Test 3: Specific Person (Fast - regex extraction expected)
echo -e "${GREEN}Test 3: Specific Person - Find Sriram Natarajan${NC}"
curl -X POST "$BASE_URL/api/search/query" \
  -H "Content-Type: application/json" \
  -d "{
    \"query\": \"Find Sriram Natarajan\",
    \"phoneNumber\": \"$PHONE\",
    \"includeMetadata\": true
  }" | jq '.data.performance, .data.intentMetadata, (.data.results | length) as $count | {result_count: $count}'
echo ""
echo ""

# Test 4: Alumni Business (Fast - regex extraction expected)
echo -e "${GREEN}Test 4: Alumni Business - alumni consultants${NC}"
curl -X POST "$BASE_URL/api/search/query" \
  -H "Content-Type: application/json" \
  -d "{
    \"query\": \"alumni who are consultants\",
    \"phoneNumber\": \"$PHONE\",
    \"includeMetadata\": true
  }" | jq '.data.performance, .data.intentMetadata, (.data.results | length) as $count | {result_count: $count}'
echo ""
echo ""

# Test 5: Ambiguous Query (Slow - LLM fallback expected)
echo -e "${YELLOW}Test 5: Ambiguous Query - LLM fallback expected (3-5s)${NC}"
curl -X POST "$BASE_URL/api/search/query" \
  -H "Content-Type: application/json" \
  -d "{
    \"query\": \"anyone working on sustainability projects?\",
    \"phoneNumber\": \"$PHONE\",
    \"includeMetadata\": true
  }" | jq '.data.performance, .data.intentMetadata, (.data.results | length) as $count | {result_count: $count}'
echo ""
echo ""

echo -e "${GREEN}Tests complete!${NC}"
echo ""
echo -e "${YELLOW}Key Metrics to Check:${NC}"
echo "  • extractionTime: Should be ~6ms for regex, ~3000ms for LLM"
echo "  • extractionMethod: Should be 'regex' for simple queries"
echo "  • llmUsed: Should be false for 80% of queries"
echo "  • intentConfidence: Should be > 0.8 for well-structured queries"
echo ""
