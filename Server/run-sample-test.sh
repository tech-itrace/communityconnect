#!/bin/bash

# Run 15-query sample test
# This runs a subset of tests to avoid API credit exhaustion
# 
# Usage: ./run-sample-test.sh

echo "🧪 Running 15-Query Sample Test"
echo "================================"
echo ""
echo "This will test:"
echo "  - Query IDs: 1-5 (entrepreneurs)"
echo "  - Query IDs: 31-35 (alumni)"
echo "  - Query IDs: 61-65 (alumni_business)"
echo ""
echo "Estimated time: 60-75 seconds"
echo "Estimated API cost: ~$0.05-0.10"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

echo ""
echo "Starting tests..."
echo ""

# Run test with grep filter to only run specific query IDs
# This uses Jest's test name matching
npm test -- queryExtraction -t "Query #[1-5]|Query #3[1-5]|Query #6[1-5]" --verbose

echo ""
echo "✅ Sample test complete!"
echo ""
echo "Results saved to: ./test-results-baseline.json"
