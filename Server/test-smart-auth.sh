#!/bin/bash

# Test Smart Auth Middleware
# This script tests the new phone-based authentication

echo "🧪 Testing Smart Auth Middleware"
echo "================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:3000"

# Test phone numbers (update these based on your database)
ADMIN_PHONE="9876543210"
MEMBER_PHONE="1111111111"
INVALID_PHONE="0000000000"

echo "📋 Prerequisites:"
echo "1. Backend server running on $BASE_URL"
echo "2. Database has test users with roles"
echo ""

# Test 1: Admin can access members list
echo "Test 1: Admin accessing members list"
echo "------------------------------------"
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/members?phoneNumber=$ADMIN_PHONE")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ PASS${NC} - Admin can access members list"
    echo "Response: $(echo "$BODY" | head -c 100)..."
else
    echo -e "${RED}✗ FAIL${NC} - Expected 200, got $HTTP_CODE"
    echo "Response: $BODY"
fi
echo ""

# Test 2: Member cannot access members list (should get 403)
echo "Test 2: Member accessing members list (should fail)"
echo "----------------------------------------------------"
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/members?phoneNumber=$MEMBER_PHONE")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "403" ]; then
    echo -e "${GREEN}✓ PASS${NC} - Member correctly denied access"
    echo "Response: $(echo "$BODY" | head -c 100)..."
else
    echo -e "${RED}✗ FAIL${NC} - Expected 403, got $HTTP_CODE"
    echo "Response: $BODY"
fi
echo ""

# Test 3: Invalid phone number (should get 401)
echo "Test 3: Invalid phone number (should fail)"
echo "-------------------------------------------"
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/members?phoneNumber=$INVALID_PHONE")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "401" ]; then
    echo -e "${GREEN}✓ PASS${NC} - Invalid phone correctly rejected"
    echo "Response: $(echo "$BODY" | head -c 100)..."
else
    echo -e "${YELLOW}⚠ WARN${NC} - Expected 401, got $HTTP_CODE"
    echo "Response: $BODY"
    echo "(User might exist in DB - not necessarily a failure)"
fi
echo ""

# Test 4: No phone number provided (should get 401)
echo "Test 4: No phone number provided (should fail)"
echo "-----------------------------------------------"
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/members")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "401" ]; then
    echo -e "${GREEN}✓ PASS${NC} - No phone correctly rejected"
    echo "Response: $(echo "$BODY" | head -c 100)..."
else
    echo -e "${RED}✗ FAIL${NC} - Expected 401, got $HTTP_CODE"
    echo "Response: $BODY"
fi
echo ""

# Test 5: Phone in body (POST request simulation)
echo "Test 5: Phone in request body"
echo "------------------------------"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/members" \
    -H "Content-Type: application/json" \
    -d "{\"phoneNumber\": \"$ADMIN_PHONE\", \"name\": \"Test User\", \"email\": \"test@example.com\"}")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    echo -e "${GREEN}✓ PASS${NC} - Admin can create member"
    echo "Response: $(echo "$BODY" | head -c 100)..."
elif [ "$HTTP_CODE" = "400" ]; then
    echo -e "${YELLOW}⚠ WARN${NC} - Got 400 (might be validation error, not auth)"
    echo "Response: $(echo "$BODY" | head -c 100)..."
else
    echo -e "${RED}✗ FAIL${NC} - Expected 200/201, got $HTTP_CODE"
    echo "Response: $BODY"
fi
echo ""

# Test 6: Analytics endpoint (admin only)
echo "Test 6: Admin accessing analytics"
echo "----------------------------------"
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/analytics/overview?phoneNumber=$ADMIN_PHONE")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ PASS${NC} - Admin can access analytics"
    echo "Response: $(echo "$BODY" | head -c 100)..."
else
    echo -e "${RED}✗ FAIL${NC} - Expected 200, got $HTTP_CODE"
    echo "Response: $BODY"
fi
echo ""

echo "================================"
echo "🏁 Test Suite Complete!"
echo ""
echo "💡 Tips:"
echo "- If tests fail, check server logs for details"
echo "- Verify test phone numbers exist in database"
echo "- Check roles: ADMIN_PHONE should have 'admin' role"
echo "- Check roles: MEMBER_PHONE should have 'member' role"
echo ""
echo "📝 To check database:"
echo "SELECT phone, name, role FROM community_members WHERE phone IN ('$ADMIN_PHONE', '$MEMBER_PHONE');"
