#!/bin/bash

# Community Connect API Testing Script
# Tests the performance improvements from Phase 2 & 3 optimizations
# Usage: ./test-api.sh [phone_number]

set -e

# Configuration
BASE_URL="${API_URL:-http://localhost:3000}"
PHONE_NUMBER="${1:-9876543210}"
OUTPUT_DIR="./test-results"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create output directory
mkdir -p "$OUTPUT_DIR"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       Community Connect - API Performance Test            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Configuration:${NC}"
echo -e "  Base URL:      $BASE_URL"
echo -e "  Phone Number:  $PHONE_NUMBER"
echo -e "  Output Dir:    $OUTPUT_DIR"
echo ""

# Function to make API call and measure time
test_query() {
    local query="$1"
    local intent="$2"
    local description="$3"
    
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}Test: $description${NC}"
    echo -e "${YELLOW}Query: ${NC}\"$query\""
    echo -e "${YELLOW}Expected Intent: ${NC}$intent"
    echo ""
    
    # Prepare request
    local request_body=$(cat <<EOF
{
  "query": "$query",
  "phoneNumber": "$PHONE_NUMBER",
  "includeMetadata": true
}
EOF
)
    
    # Make request and capture timing
    local start_time=$(date +%s%N)
    local response=$(curl -s -w "\n%{http_code}\n%{time_total}" \
        -X POST "$BASE_URL/api/search/query" \
        -H "Content-Type: application/json" \
        -d "$request_body" 2>&1)
    local end_time=$(date +%s%N)
    
    # Parse response
    local http_code=$(echo "$response" | tail -n 2 | head -n 1)
    local curl_time=$(echo "$response" | tail -n 1)
    local body=$(echo "$response" | head -n -2)
    
    # Calculate timings
    local total_ms=$(echo "scale=0; $curl_time * 1000 / 1" | bc)
    
    # Display results
    echo -e "${YELLOW}HTTP Status: ${NC}$http_code"
    echo -e "${YELLOW}Total Time: ${NC}${total_ms}ms"
    
    if [ "$http_code" == "200" ]; then
        # Parse performance metrics from response
        local extraction_time=$(echo "$body" | jq -r '.data.performance.extractionTime // "N/A"' 2>/dev/null || echo "N/A")
        local extraction_method=$(echo "$body" | jq -r '.data.performance.extractionMethod // "N/A"' 2>/dev/null || echo "N/A")
        local llm_used=$(echo "$body" | jq -r '.data.performance.llmUsed // false' 2>/dev/null || echo "false")
        local search_time=$(echo "$body" | jq -r '.data.performance.searchTime // "N/A"' 2>/dev/null || echo "N/A")
        local result_count=$(echo "$body" | jq -r '.data.results | length // 0' 2>/dev/null || echo "0")
        local detected_intent=$(echo "$body" | jq -r '.data.intentMetadata.primary // "N/A"' 2>/dev/null || echo "N/A")
        local confidence=$(echo "$body" | jq -r '.data.intentMetadata.intentConfidence // "N/A"' 2>/dev/null || echo "N/A")
        
        echo ""
        echo -e "${GREEN}✓ SUCCESS${NC}"
        echo -e "${YELLOW}Performance Breakdown:${NC}"
        echo -e "  Extraction:    ${extraction_time}ms (method: $extraction_method, LLM: $llm_used)"
        echo -e "  Search:        ${search_time}ms"
        echo -e "  Total API:     ${total_ms}ms"
        echo ""
        echo -e "${YELLOW}Results:${NC}"
        echo -e "  Intent:        $detected_intent (confidence: $confidence)"
        echo -e "  Match Count:   $result_count"
        
        # Show first result snippet
        local first_result=$(echo "$body" | jq -r '.data.results[0].name // "N/A"' 2>/dev/null || echo "N/A")
        if [ "$first_result" != "N/A" ]; then
            echo -e "  First Match:   $first_result"
        fi
        
        # Log to CSV
        echo "$TIMESTAMP,$query,$intent,$http_code,$total_ms,$extraction_time,$extraction_method,$llm_used,$search_time,$result_count,$detected_intent,$confidence" >> "$OUTPUT_DIR/performance_log.csv"
        
        # Save full response
        echo "$body" | jq '.' > "$OUTPUT_DIR/response_${TIMESTAMP}_${intent}.json" 2>/dev/null || echo "$body" > "$OUTPUT_DIR/response_${TIMESTAMP}_${intent}.txt"
        
    else
        echo -e "${RED}✗ FAILED${NC}"
        echo -e "${YELLOW}Response:${NC}"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
        
        # Log error
        echo "$TIMESTAMP,$query,$intent,$http_code,$total_ms,ERROR,ERROR,ERROR,ERROR,0,ERROR,ERROR" >> "$OUTPUT_DIR/performance_log.csv"
    fi
}

# Initialize CSV log
if [ ! -f "$OUTPUT_DIR/performance_log.csv" ]; then
    echo "timestamp,query,expected_intent,http_code,total_ms,extraction_ms,extraction_method,llm_used,search_ms,result_count,detected_intent,confidence" > "$OUTPUT_DIR/performance_log.csv"
fi

echo -e "\n${YELLOW}Starting test suite...${NC}"
echo -e "${YELLOW}Testing all 4 intent types with Task 3.1 response formatters${NC}"

# Test 1: Business Intent (Designation/Role Search)
test_query "CEO or founders" \
    "business" \
    "Business Intent - Designation/Role Search"

# Test 2: Peers Intent (Year + Branch)
test_query "Mechanical Engineering students from 2014" \
    "peers" \
    "Peers Intent - Year and Branch Filter"

# Test 3: Specific Person Intent (Name Search)
test_query "Find Sriram Natarajan" \
    "specific_person" \
    "Specific Person Intent - Name Search"

# Test 4: Alumni Business Intent (Alumni + Role)
test_query "alumni who are consultants" \
    "alumni_business" \
    "Alumni Business Intent - Alumni Status with Role"

# Test 5: Complex Business Intent (Multiple Roles)
test_query "looking for directors or general managers" \
    "business" \
    "Complex Business Intent - Multiple Roles"

# Test 6: Simple Peers Intent (Just Year)
test_query "who graduated in 2018?" \
    "peers" \
    "Simple Peers Intent - Year Only"

# Test 7: Ambiguous Query (Should trigger LLM fallback)
test_query "anyone working on sustainability projects?" \
    "business" \
    "Ambiguous Query - LLM Fallback Expected"

# Test 8: Edge Case - Very Specific
test_query "2013 Business Administration graduates who are CEOs" \
    "business" \
    "Edge Case - Year + Branch + Role Combination"

# Summary
echo -e "\n${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    Test Summary                            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Calculate averages from CSV
if command -v awk &> /dev/null; then
    echo -e "${YELLOW}Performance Metrics:${NC}"
    
    # Get successful tests only
    successful_tests=$(tail -n +2 "$OUTPUT_DIR/performance_log.csv" | grep ",200," | wc -l | tr -d ' ')
    total_tests=$(tail -n +2 "$OUTPUT_DIR/performance_log.csv" | wc -l | tr -d ' ')
    
    echo -e "  Total Tests:      $total_tests"
    echo -e "  Successful:       $successful_tests"
    echo -e "  Failed:           $((total_tests - successful_tests))"
    echo ""
    
    if [ "$successful_tests" -gt 0 ]; then
        # Calculate average times
        avg_total=$(tail -n +2 "$OUTPUT_DIR/performance_log.csv" | grep ",200," | awk -F',' '{sum+=$5; count++} END {if(count>0) printf "%.0f", sum/count; else print "N/A"}')
        avg_extraction=$(tail -n +2 "$OUTPUT_DIR/performance_log.csv" | grep ",200," | awk -F',' '{if($6!="ERROR" && $6!="N/A") {sum+=$6; count++}} END {if(count>0) printf "%.0f", sum/count; else print "N/A"}')
        avg_search=$(tail -n +2 "$OUTPUT_DIR/performance_log.csv" | grep ",200," | awk -F',' '{if($9!="ERROR" && $9!="N/A") {sum+=$9; count++}} END {if(count>0) printf "%.0f", sum/count; else print "N/A"}')
        
        # Count LLM usage
        llm_count=$(tail -n +2 "$OUTPUT_DIR/performance_log.csv" | grep ",200," | awk -F',' '{if($8=="true") count++} END {print count+0}')
        regex_count=$((successful_tests - llm_count))
        
        echo -e "${YELLOW}Average Timings:${NC}"
        echo -e "  Total Response:   ${avg_total}ms"
        echo -e "  Extraction:       ${avg_extraction}ms"
        echo -e "  Search:           ${avg_search}ms"
        echo ""
        echo -e "${YELLOW}Extraction Methods:${NC}"
        echo -e "  Regex:            $regex_count tests ($((regex_count * 100 / successful_tests))%)"
        echo -e "  LLM Fallback:     $llm_count tests ($((llm_count * 100 / successful_tests))%)"
        echo ""
        
        # Expected improvements (from Phase 2 & 3 work)
        echo -e "${GREEN}Expected Performance Improvements:${NC}"
        echo -e "  ✓ Extraction: 6ms avg (regex), ~3000ms (LLM fallback)"
        echo -e "  ✓ Formatting: ~50ms (40x faster than 2000ms LLM)"
        echo -e "  ✓ End-to-end: 54% faster than baseline"
        echo -e "  ✓ LLM Usage: 80% reduction (20% of queries)"
    fi
fi

echo ""
echo -e "${YELLOW}Results saved to:${NC}"
echo -e "  CSV Log:      $OUTPUT_DIR/performance_log.csv"
echo -e "  JSON Files:   $OUTPUT_DIR/response_*.json"
echo ""
echo -e "${GREEN}Test complete!${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo -e "  1. Review performance breakdown in CSV"
echo -e "  2. Compare extraction times: regex (~6ms) vs LLM (~3000ms)"
echo -e "  3. Verify intent detection accuracy"
echo -e "  4. Check response formatting quality in JSON files"
echo ""
