#!/bin/bash

# Phase 3 Testing Script: Natural Language Query Processing
# Tests the POST /api/search/query endpoint with various natural language queries

BASE_URL="http://localhost:3000"
ENDPOINT="${BASE_URL}/api/search/query"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counter for tests
TOTAL_TESTS=0
PASSED_TESTS=0

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Phase 3: Natural Language Query Testing${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Function to run a test
run_test() {
    local test_num=$1
    local test_name=$2
    local query=$3
    local expected_intent=$4
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    echo -e "${YELLOW}Test $test_num: $test_name${NC}"
    echo -e "Query: \"$query\""
    
    # use node to get milliseconds timestamp (cross-platform)
    local start_time=$(node -e "console.log(Date.now())")
    
    # Make the request
    response=$(curl -s -w "\n%{http_code}" -X POST "$ENDPOINT" \
        -H "Content-Type: application/json" \
        -d "{\"query\": \"$query\", \"options\": {\"maxResults\": 5}}")
    
    local end_time=$(node -e "console.log(Date.now())")
    local duration=$((end_time - start_time))
    
    # Extract HTTP code and body
    http_code=$(echo "$response" | tail -n 1)
    # remove the last line (http code) in a portable way
    body=$(echo "$response" | sed '$d')
    
    # Check HTTP status
    if [ "$http_code" -eq 200 ]; then
        echo -e "${GREEN}✓ HTTP 200 OK${NC}"
        
        # Parse JSON response
        success=$(echo "$body" | jq -r '.success')
        intent=$(echo "$body" | jq -r '.understanding.intent')
        confidence=$(echo "$body" | jq -r '.understanding.confidence')
        result_count=$(echo "$body" | jq -r '.results.members | length')
        conversational=$(echo "$body" | jq -r '.response.conversational')
        
        echo -e "Intent: $intent (confidence: $confidence)"
        echo -e "Results: $result_count members found"
        echo -e "Response: \"$conversational\""
        echo -e "Duration: ${duration}ms"
        
        # Check if intent matches expected (if provided)
        if [ -n "$expected_intent" ] && [ "$intent" != "$expected_intent" ]; then
            echo -e "${RED}✗ Expected intent: $expected_intent, got: $intent${NC}"
        else
            PASSED_TESTS=$((PASSED_TESTS + 1))
            echo -e "${GREEN}✓ Test passed${NC}"
        fi
        
        # Show suggestions
        suggestions=$(echo "$body" | jq -r '.response.suggestions[]' 2>/dev/null)
        if [ -n "$suggestions" ]; then
            echo -e "Suggestions:"
            echo "$suggestions" | while read -r line; do
                echo -e "  - $line"
            done
        fi
    else
        echo -e "${RED}✗ HTTP $http_code${NC}"
        echo -e "Response: $body" | jq '.' 2>/dev/null || echo "$body"
    fi
    
    echo -e "\n"
}

# ============================================================================
# Test 1: Simple Skill-Based Query
# ============================================================================
run_test 1 "Simple Skill Query" \
    "I need someone who knows AI" \
    "find_member"

# ============================================================================
# Test 2: Location-Based Query
# ============================================================================
run_test 2 "Location Query" \
    "find members in Chennai" \
    "find_member"

# ============================================================================
# Test 3: Combined Skill + Location
# ============================================================================
run_test 3 "Skill + Location" \
    "I need a software developer in Bangalore" \
    "find_member"

# ============================================================================
# Test 4: Service-Based Query
# ============================================================================
run_test 4 "Service Query" \
    "find a consultant" \
    "find_member"

# ============================================================================
# Test 5: Turnover Requirement
# ============================================================================
run_test 5 "High Turnover Query" \
    "find someone with good revenue" \
    "find_member"

# ============================================================================
# Test 6: Complex Multi-Criteria
# ============================================================================
run_test 6 "Complex Query" \
    "I'm looking for an AI expert in Chennai with high turnover who provides consulting services" \
    "find_member"

# ============================================================================
# Test 7: Conversational Style
# ============================================================================
run_test 7 "Conversational Query" \
    "Can you help me find someone who can help with my cloud infrastructure project in Hyderabad?" \
    "find_member"

# ============================================================================
# Test 8: Skill with Experience
# ============================================================================
run_test 8 "Skill with Context" \
    "software engineer with cloud computing experience" \
    "find_member"

# ============================================================================
# Test 9: Multiple Skills
# ============================================================================
run_test 9 "Multiple Skills" \
    "find someone who knows both AI and machine learning" \
    "find_member"

# ============================================================================
# Test 10: Education-Based Query
# ============================================================================
run_test 10 "Education Query" \
    "find an MCA graduate in Chennai" \
    "find_member"

# ============================================================================
# Test 11: Ambiguous Query (Low Confidence Expected)
# ============================================================================
run_test 11 "Ambiguous Query" \
    "find someone good" \
    ""

# ============================================================================
# Test 12: Very Specific Query
# ============================================================================
run_test 12 "Very Specific Query" \
    "I need a senior software architect with 10+ years experience in AI/ML, based in Chennai, working for a company with annual turnover above 10 crores" \
    "find_member"

# ============================================================================
# Test 13: Question Format
# ============================================================================
run_test 13 "Question Format" \
    "Who can provide IT consulting services in Bangalore?" \
    "find_member"

# ============================================================================
# Test 14: Industry-Specific
# ============================================================================
run_test 14 "Industry Query" \
    "find members in the IT industry" \
    "find_member"

# ============================================================================
# Test 15: Empty Response Options
# ============================================================================
echo -e "${YELLOW}Test 15: Without Response Generation${NC}"
echo -e "Query: \"find AI expert\""

response=$(curl -s -w "\n%{http_code}" -X POST "$ENDPOINT" \
    -H "Content-Type: application/json" \
    -d '{"query": "find AI expert", "options": {"includeResponse": false, "includeSuggestions": false}}')

http_code=$(echo "$response" | tail -n 1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" -eq 200 ]; then
    echo -e "${GREEN}✓ HTTP 200 OK${NC}"
    has_response=$(echo "$body" | jq -r '.response // "null"')
    echo -e "Response field: $has_response"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}✗ HTTP $http_code${NC}"
fi

echo -e "\n"

# ============================================================================
# Test Summary
# ============================================================================
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Total Tests: $TOTAL_TESTS"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$((TOTAL_TESTS - PASSED_TESTS))${NC}"

if [ $PASSED_TESTS -eq $TOTAL_TESTS ]; then
    echo -e "\n${GREEN}✓ All tests passed!${NC}\n"
    exit 0
else
    echo -e "\n${RED}✗ Some tests failed${NC}\n"
    exit 1
fi
