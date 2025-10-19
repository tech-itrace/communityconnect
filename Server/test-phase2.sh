#!/bin/bash

# Phase 2 API Test Script
# Tests all Phase 2 endpoints

BASE_URL="http://localhost:3000/api"
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   Phase 2 API Endpoint Tests${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to test endpoint
test_endpoint() {
    local name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    
    echo -e "${BLUE}Testing: ${name}${NC}"
    echo -e "Request: ${method} ${endpoint}"
    
    if [ "$method" = "POST" ]; then
        response=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}${endpoint}" \
            -H "Content-Type: application/json" \
            -d "${data}")
    else
        response=$(curl -s -w "\n%{http_code}" "${BASE_URL}${endpoint}")
    fi
    
    http_code=$(echo "$response" | tail -n 1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -eq 200 ]; then
        echo -e "${GREEN}✓ Success (HTTP $http_code)${NC}"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
    else
        echo -e "${RED}✗ Failed (HTTP $http_code)${NC}"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
    fi
    echo ""
    echo "----------------------------------------"
    echo ""
}

# Test 1: Basic search
test_endpoint "Basic Search - Software Development" \
    "POST" \
    "/search/members" \
    '{"query": "software development", "limit": 3}'

# Test 2: Filtered search
test_endpoint "Filtered Search - Chennai Location" \
    "POST" \
    "/search/members" \
    '{"query": "consulting", "filters": {"city": "Chennai"}, "limit": 5}'

# Test 3: Semantic search
test_endpoint "Semantic Search - Cloud Infrastructure" \
    "POST" \
    "/search/members" \
    '{"query": "someone who can help with cloud infrastructure", "searchType": "semantic", "limit": 3}'

# Test 4: Search with turnover filter
test_endpoint "Search with Turnover Filter" \
    "POST" \
    "/search/members" \
    '{"query": "business", "filters": {"minTurnover": 5000000}, "limit": 3}'

# Test 5: List all members
test_endpoint "List All Members (Page 1)" \
    "GET" \
    "/members?page=1&limit=5&sortBy=name"

# Test 6: Member statistics
test_endpoint "Get Member Statistics" \
    "GET" \
    "/members/stats"

# Test 7: Get suggestions
test_endpoint "Get Autocomplete Suggestions" \
    "GET" \
    "/search/suggestions"

# Test 8: Search without query (filter only)
test_endpoint "Filter-Only Search (No Query)" \
    "POST" \
    "/search/members" \
    '{"filters": {"city": "Chennai"}, "limit": 5}'

# Test 9: Keyword search
test_endpoint "Keyword Search Mode" \
    "POST" \
    "/search/members" \
    '{"query": "software engineer", "searchType": "keyword", "limit": 3}'

# Test 10: Hybrid search (default)
test_endpoint "Hybrid Search Mode" \
    "POST" \
    "/search/members" \
    '{"query": "AI machine learning", "searchType": "hybrid", "limit": 3}'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   Tests Complete!${NC}"
echo -e "${BLUE}========================================${NC}"
