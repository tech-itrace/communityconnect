# Running the 15-Query Sample Test

## Quick Start

Run the sample test (15 queries instead of 88):

```bash
cd Server
npm test querySample
```

**Estimated time**: 60-75 seconds  
**Estimated API cost**: ~$0.05-0.10

## What It Tests

The sample includes **5 queries from each category**:

### Entrepreneurs (5)
- Web development companies in Chennai
- IT consulting in Bangalore  
- Digital marketing services
- Real estate developers in Coimbatore
- Healthcare startups

### Alumni (5)
- Batchmates from 1995
- Mechanical Engineering graduates
- 2010 batch members
- CSE graduates in Bangalore
- ECE people from 2005

### Alumni Business (5)
- Civil engineers in construction
- 1998 textile engineers in manufacturing
- Mechanical engineers with companies in Chennai
- IT graduates with software companies in Bangalore
- 2000 passout doing AI/ML work

## Expected Output

```
SAMPLE TEST REPORT (15 queries)
===============================================================================

Total Queries: 15
Correct: X (XX.X%)
Partial: X (XX.X%)
Incorrect: X (XX.X%)

Avg Response Time: XXXXms
Avg Confidence: X.XX

--- By Category ---
entrepreneurs: X/5 (XX.X%)
alumni: X/5 (XX.X%)
alumni_business: X/5 (XX.X%)
```

## Results File

Results saved to: `Server/test-results-sample.json`

## Why 15 Queries?

- **Fast**: ~1 minute vs 3+ hours for full suite
- **Affordable**: ~$0.10 vs potential API limits
- **Representative**: Covers all query types
- **Repeatable**: Can test multiple times during optimization

## After Running

Use these results to:
1. Validate current LLM baseline (~66% accuracy expected)
2. Test regex optimization impact (after Task 1.2)
3. Compare before/after metrics

## Alternative: Run Just One Category

Test only entrepreneurs (5 queries):
```bash
npm test querySample -- -t "entrepreneurs"
```

Test only alumni (5 queries):
```bash
npm test querySample -- -t "alumni"
```

Note: The `-t` flag won't filter by category perfectly, but will run fewer tests if query text matches.
