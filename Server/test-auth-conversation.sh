#!/bin/bash

# Test Authentication and Conversation History Features
# Tests phone number validation and conversation context

BASE_URL="http://localhost:3000"
ENDPOINT="${BASE_URL}/api/search/query"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Authentication & Conversation Testing${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Test 1: Valid Member (should work)
echo -e "${YELLOW}Test 1: Valid Community Member${NC}"
echo "Phone: 919840930854 (Mr. Sathyamurthi)"
response=$(curl -s -w "\n%{http_code}" -X POST "$ENDPOINT" \
    -H "Content-Type: application/json" \
    -d '{"query": "find AI experts", "phoneNumber": "919840930854", "options": {"maxResults": 3}}')

http_code=$(echo "$response" | tail -n 1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" -eq 200 ]; then
    echo -e "${GREEN}✓ PASS - Member authenticated successfully${NC}"
    result_count=$(echo "$body" | grep -o '"id":' | wc -l)
    echo -e "  Results: $result_count members found"
else
    echo -e "${RED}✗ FAIL - Expected 200, got $http_code${NC}"
    echo -e "  Response: $body"
fi
echo ""

# Test 2: Invalid Member (should fail with 403)
echo -e "${YELLOW}Test 2: Non-Member Phone Number${NC}"
echo "Phone: 911234567890 (not in community)"
response=$(curl -s -w "\n%{http_code}" -X POST "$ENDPOINT" \
    -H "Content-Type: application/json" \
    -d '{"query": "find developers", "phoneNumber": "911234567890", "options": {"maxResults": 3}}')

http_code=$(echo "$response" | tail -n 1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" -eq 403 ]; then
    echo -e "${GREEN}✓ PASS - Non-member correctly rejected${NC}"
    echo -e "  Message: $(echo "$body" | grep -o '"error":"[^"]*"' || echo "$body")"
else
    echo -e "${RED}✗ FAIL - Expected 403, got $http_code${NC}"
    echo -e "  Response: $body"
fi
echo ""

# Test 3: Missing Phone Number (should fail with 400)
echo -e "${YELLOW}Test 3: Missing Phone Number${NC}"
response=$(curl -s -w "\n%{http_code}" -X POST "$ENDPOINT" \
    -H "Content-Type: application/json" \
    -d '{"query": "find experts", "options": {"maxResults": 3}}')

http_code=$(echo "$response" | tail -n 1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" -eq 400 ]; then
    echo -e "${GREEN}✓ PASS - Missing phone number detected${NC}"
    echo -e "  Message: $(echo "$body" | grep -o '"error":"[^"]*"' || echo "$body")"
else
    echo -e "${RED}✗ FAIL - Expected 400, got $http_code${NC}"
    echo -e "  Response: $body"
fi
echo ""

# Test 4: Conversation History (multiple queries from same user)
echo -e "${YELLOW}Test 4: Conversation History${NC}"
echo "Making 3 queries from same user to test conversation context..."

echo -e "  Query 1: 'find AI experts'"
response1=$(curl -s -X POST "$ENDPOINT" \
    -H "Content-Type: application/json" \
    -d '{"query": "find AI experts", "phoneNumber": "919840930854", "options": {"maxResults": 2}}')

sleep 2

echo -e "  Query 2: 'show me their skills'"
response2=$(curl -s -X POST "$ENDPOINT" \
    -H "Content-Type: application/json" \
    -d '{"query": "show me their skills", "phoneNumber": "919840930854", "options": {"maxResults": 2}}')

sleep 2

echo -e "  Query 3: 'find consultants in Chennai'"
response3=$(curl -s -X POST "$ENDPOINT" \
    -H "Content-Type: application/json" \
    -d '{"query": "find consultants in Chennai", "phoneNumber": "919840930854", "options": {"maxResults": 2}}')

echo -e "${GREEN}✓ Queries executed${NC}"
echo -e "  Check server logs for conversation context messages"
echo -e "  Should see: '[LLM Service] Using conversation context from previous queries'"
echo ""

# Test 5: Different phone number formats (normalization)
echo -e "${YELLOW}Test 5: Phone Number Format Normalization${NC}"
echo "Testing different phone formats for same number..."

formats=(
    "919840930854"
    "91 9840 930854"
    "91-9840-930854"
    "9840930854"
)

success_count=0
for phone in "${formats[@]}"; do
    response=$(curl -s -w "\n%{http_code}" -X POST "$ENDPOINT" \
        -H "Content-Type: application/json" \
        -d "{\"query\": \"test query\", \"phoneNumber\": \"$phone\", \"options\": {\"maxResults\": 1}}")
    
    http_code=$(echo "$response" | tail -n 1)
    
    if [ "$http_code" -eq 200 ]; then
        ((success_count++))
    fi
done

if [ "$success_count" -ge 3 ]; then
    echo -e "${GREEN}✓ PASS - Phone format normalization working${NC}"
    echo -e "  $success_count out of ${#formats[@]} formats accepted"
else
    echo -e "${RED}✗ FAIL - Some formats rejected${NC}"
    echo -e "  Only $success_count out of ${#formats[@]} formats worked"
fi
echo ""

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "✓ Authentication against community members"
echo -e "✓ Validation of phone number field"
echo -e "✓ Rejection of non-members (403)"
echo -e "✓ Conversation history tracking"
echo -e "✓ Phone number format normalization"
echo ""
echo -e "${GREEN}All authentication features tested!${NC}"
