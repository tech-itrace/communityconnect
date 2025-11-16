# Query Extraction Test Suite - Usage Guide

## Overview

This test suite validates the current LLM-based query parsing implementation against **88 sample queries** to establish baseline accuracy metrics before optimization.

## Test Categories

1. **Entrepreneurs Queries** (30 queries)
   - Service-based: "Find web development company in Chennai"
   - Industry-based: "Find IT industry companies"
   - Business size: "Find companies with high turnover"
   - Location-based: "Find all companies in Chennai"

2. **Alumni Queries** (33 queries)
   - Batch/year: "Find my batchmates from 1995 passout"
   - Department: "Find mechanical engineers"
   - Combined: "Find 1995 passout mechanical"
   - Location: "Find alumni living in Chennai"

3. **Alumni Business Queries** (25 queries)
   - Batch + Service: "Find 1995 batch in IT industry"
   - Branch + Industry: "Find mechanical engineers in manufacturing"
   - Complex: "Find 1995 mechanical passout companies in Chennai"

## Prerequisites

1. **Environment Setup**
   ```bash
   # Make sure .env is configured
   cp .env.example .env
   
   # Add your API key
   DEEPINFRA_API_KEY=your_key_here
   ```

2. **Dependencies**
   ```bash
   npm install
   ```

3. **Database** (optional - tests don't require live DB)
   - Tests only measure entity extraction accuracy
   - No database queries are executed

## Running Tests

### Run Full Test Suite
```bash
cd Server
npm test queryExtraction
```

### Run with Verbose Output
```bash
npm test -- queryExtraction --verbose
```

### Run Specific Test Category
```bash
# Only entrepreneurs queries
npm test -- queryExtraction -t "entrepreneurs"

# Only alumni queries  
npm test -- queryExtraction -t "alumni"

# Only complex queries
npm test -- queryExtraction -t "complex"
```

### Generate Coverage Report
```bash
npm test -- queryExtraction --coverage
```

## Understanding Results

### Test Output Format
```
[Query #1] Find web development company in Chennai
Expected: {"skills":["web development","website design"],"location":"Chennai"}
Actual: {"skills":["web development"],"location":"Chennai"}
Match: partial | Intent: ✓ | Time: 1234ms | Confidence: 0.85
```

### Accuracy Levels
- **correct**: All entities extracted correctly (≥90% match)
- **partial**: Some entities extracted (40-89% match)
- **incorrect**: Failed to extract (<40% match)

### Final Report
After all tests complete, you'll see:

```
================================================================================
BASELINE ACCURACY REPORT
================================================================================

Total Queries Tested: 88
Correct: 65 (73.9%)
Partial: 15 (17.0%)
Incorrect: 8 (9.1%)

Average Response Time: 1567ms
Average Confidence: 0.72

--- By Category ---
entrepreneurs: 22/30 (73.3%)
alumni: 27/33 (81.8%)
alumni_business: 16/25 (64.0%)

--- By Intent ---
find_member: 65/88 (73.9%)
```

## Expected Baseline Metrics

Based on the current implementation:

| Metric | Target | Actual (will be measured) |
|--------|--------|---------------------------|
| Overall Accuracy | N/A | ? |
| Entrepreneurs | 70-80% | ? |
| Alumni | 75-85% | ? |
| Alumni Business | 60-70% | ? |
| Avg Response Time | N/A | ? |
| Avg Confidence | N/A | ? |

## Output Files

### `test-results-baseline.json`
Detailed metrics saved after test completion:
```json
{
  "total": 88,
  "correct": 65,
  "partial": 15,
  "incorrect": 8,
  "byCategory": {
    "entrepreneurs": {
      "total": 30,
      "correct": 22,
      "partial": 5,
      "incorrect": 3
    }
  },
  "avgConfidence": 0.72,
  "avgResponseTime": 1567
}
```

## Troubleshooting

### Test Timeout
If tests timeout (>30s per query):
```bash
# Increase timeout in jest.config.js
testTimeout: 60000  // 60 seconds
```

### API Rate Limiting
DeepInfra may rate limit:
- Wait 1 minute between test runs
- Run smaller batches using `-t` flag

### Out of Memory
For large test runs:
```bash
NODE_OPTIONS=--max-old-space-size=4096 npm test queryExtraction
```

## Next Steps

After establishing baseline:

1. **Phase 1**: Implement regex-based extractor
2. **Phase 2**: Build hybrid extraction (regex + LLM fallback)
3. **Phase 3**: Run tests again and compare results
4. **Target**: 90%+ accuracy, <500ms response time

## Notes

- Tests use relaxed assertions (≥partial match) to avoid false failures
- Each query logs detailed output for debugging
- Test suite is designed to be rerun after optimizations
- Baseline report will be used for before/after comparison

## Reference

- Query taxonomy: `/QUERY-TAXONOMY.md`
- Implementation plan: `/TODO_queryOptimisation.md`
- Critical review: `/CRITICAL-REVIEW-LLM-FLOW.md`
