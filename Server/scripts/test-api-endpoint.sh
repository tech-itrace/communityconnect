#!/bin/bash

# Test the refactored query endpoint with real queries
# Usage: ./scripts/test-api-endpoint.sh

API_URL="http://localhost:3000/api/search/query"
PHONE_NUMBER="+919900000000"  # Test phone number from database

echo "========================================"
echo "API Endpoint Test Suite"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test function
test_query() {
    local query="$1"
    local test_name="$2"

    echo "${YELLOW}Test: $test_name${NC}"
    echo "Query: \"$query\""
    echo "----------------------------------------"

    response=$(curl -s -X POST "$API_URL" \
        -H "Content-Type: application/json" \
        -d "{
            \"phoneNumber\": \"$PHONE_NUMBER\",
            \"query\": \"$query\",
            \"options\": {
                \"maxResults\": 5,
                \"includeResponse\": true
            }
        }")

    # Check if request was successful
    success=$(echo "$response" | jq -r '.success')
    result_count=$(echo "$response" | jq -r '.results.members | length')
    exec_time=$(echo "$response" | jq -r '.executionTime')
    confidence=$(echo "$response" | jq -r '.understanding.confidence')

    if [ "$success" = "true" ]; then
        echo "${GREEN}✓ Success${NC}"
        echo "  Results: $result_count members"
        echo "  Confidence: $confidence"
        echo "  Execution time: ${exec_time}ms"

        # Show top 3 results
        echo ""
        echo "  Top results:"
        echo "$response" | jq -r '.results.members[0:3] | .[] | "    - \(.name) (score: \(.relevanceScore | tostring))"'
    else
        echo "✗ Failed"
        error=$(echo "$response" | jq -r '.error.message')
        echo "  Error: $error"
    fi

    echo ""
    echo ""
}

# Run tests
echo "Starting API tests..."
echo ""

test_query "machine learning" "Machine Learning Search"
test_query "software developer in Bangalore" "Location-based Search"
test_query "business consultant" "Business Consultant Search"
test_query "manufacturing" "Manufacturing Search"
test_query "data scientist with Python" "Skill-based Search"

echo "========================================"
echo "All tests completed!"
echo "========================================"
