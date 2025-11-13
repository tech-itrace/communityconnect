# TODO: Query Optimization Implementation Plan

**Date**: November 14, 2025  
**Project**: Community Connect - LLM & Search Optimization  
**Status**: 🟡 Planning Phase

---

## 🎯 Project Overview

**Goal**: Optimize member search from current 2.5-4s response time to 0.2-0.8s while improving accuracy from 65-75% to 90-95%.

**Approach**: Implement hybrid extraction (80% regex + 20% LLM) with domain-specific prompts and intent-based response formatting.

**Reference Documents**:
- `/CRITICAL-REVIEW-LLM-FLOW.md` - Detailed analysis of current issues
- `/QUERY-TAXONOMY.md` - 188 sample queries with patterns
- `/Server/src/services/llmService.ts` - Current implementation
- `/Server/src/services/nlSearchService.ts` - Search orchestration

---

## 📋 Implementation Phases

---

## **PHASE 1: Foundation & Validation** (Days 1-2)

### ✅ **Task 1.1: Create Test Suite**
**Priority**: P0 - Critical  
**Estimated Time**: 3-4 hours  
**File**: `Server/src/tests/queryExtraction.test.ts`

**Steps**:
- [ ] Create test file with 188 queries from QUERY-TAXONOMY.md
- [ ] Define expected output for each query (intent + entities)
- [ ] Set up Jest/Mocha test framework
- [ ] Create baseline accuracy measurement
- [ ] Document current LLM extraction accuracy (target: measure 65-75% baseline)

**Acceptance Criteria**:
- Test suite runs successfully with `npm test`
- Baseline accuracy measured and documented
- Each query has expected entity mapping

**Dependencies**: None

---

### ✅ **Task 1.2: Build Regex Entity Extractor**
**Priority**: P0 - Critical  
**Estimated Time**: 4-5 hours  
**File**: `Server/src/services/regexExtractor.ts`

**Steps**:
- [ ] Create `regexExtractor.ts` service file
- [ ] Implement year extraction patterns (handle 1995, 95, "1995 passout", "batch of 95")
- [ ] Implement location extraction with city normalization
- [ ] Implement branch/department extraction
- [ ] Implement degree extraction (B.E, MBA, MCA, etc.)
- [ ] Implement service/skill keyword extraction (basic)
- [ ] Add entity normalization functions
- [ ] Add confidence scoring (0.0-1.0 based on pattern matches)

**Code Structure**:
```typescript
interface RegexExtractionResult {
  entities: {
    year_of_graduation?: number[];
    city?: string;
    branch?: string[];
    degree?: string[];
    working_knowledge?: string[];
  };
  confidence: number;
  matched_patterns: string[];
}

function extractWithRegex(query: string): RegexExtractionResult
function normalizeCity(city: string): string
function normalizeBranch(branch: string): string
function calculateConfidence(entities: object): number
```

**Acceptance Criteria**:
- Extracts year from "1995 passout" → [1995]
- Extracts location from "in Chennai" → "Chennai"
- Extracts branch from "mechanical" → ["Mechanical", "Mechanical Engineering"]
- Handles 90%+ of simple queries (year + branch patterns)
- Returns confidence score accurately

**Dependencies**: None

---

### ✅ **Task 1.3: Test Regex Accuracy**
**Priority**: P0 - Critical  
**Estimated Time**: 2-3 hours  

**Steps**:
- [ ] Run test suite against regex extractor
- [ ] Measure accuracy by query type:
  - Simple (1-2 entities): Target 95%+
  - Medium (2-3 entities): Target 85%+
  - Complex (3+ entities): Target 60%+
- [ ] Document false positives and false negatives
- [ ] Identify patterns that need LLM fallback
- [ ] Create accuracy report

**Acceptance Criteria**:
- Accuracy report generated
- Clear list of queries that need LLM
- 90%+ accuracy on year+branch queries
- Regex handles 80%+ of all queries with >70% confidence

**Dependencies**: Task 1.1, 1.2

---

## **PHASE 2: Hybrid Extraction Engine** (Days 3-4)

### ✅ **Task 2.1: Create Intent Classifier**
**Priority**: P0 - Critical  
**Estimated Time**: 2-3 hours  
**File**: `Server/src/services/intentClassifier.ts`

**Steps**:
- [ ] Create intent classification patterns
- [ ] Implement `find_business` detection (company, service, provider)
- [ ] Implement `find_peers` detection (batchmates, alumni, passout)
- [ ] Implement `find_specific_person` detection (name patterns)
- [ ] Implement `find_alumni_business` detection (batch + service)
- [ ] Add intent confidence scoring
- [ ] Handle ambiguous queries (return multiple intents)

**Code Structure**:
```typescript
type Intent = 'find_business' | 'find_peers' | 'find_specific_person' | 'find_alumni_business';

interface IntentResult {
  primary: Intent;
  secondary?: Intent;
  confidence: number;
}

function classifyIntent(query: string): IntentResult
```

**Acceptance Criteria**:
- Correctly classifies "Find web dev in Chennai" → `find_business`
- Correctly classifies "1995 batch mechanical" → `find_peers`
- Correctly classifies "Find 1995 batch in IT" → `find_alumni_business`
- 95%+ accuracy on intent classification

**Dependencies**: Task 1.2

---

### ✅ **Task 2.2: Improve LLM Parsing Prompt**
**Priority**: P0 - Critical  
**Estimated Time**: 3-4 hours  
**File**: `Server/src/services/llmService.ts`

**Steps**:
- [ ] Update `parseQuery()` system prompt with domain-specific examples
- [ ] Add few-shot examples from QUERY-TAXONOMY.md
- [ ] Add explicit field mapping (working_knowledge, year_of_graduation, etc.)
- [ ] Add "passout" → year_of_graduation instruction
- [ ] Add branch normalization rules
- [ ] Add service/industry mapping rules
- [ ] Lower temperature to 0.1 for consistency
- [ ] Add better JSON parsing with error handling

**New Prompt Structure**:
```typescript
const DOMAIN_SPECIFIC_PROMPT = `
You are an entity extractor for an ALUMNI/BUSINESS DIRECTORY.

**Database Schema**:
- year_of_graduation (INTEGER)
- degree (VARCHAR): B.E, MBA, MCA, M.E
- branch (VARCHAR): Mechanical, ECE, Civil, etc.
- working_knowledge (TEXT): skills, services, products
- city (VARCHAR)
- organization_name (TEXT)
- designation (VARCHAR)

**Extraction Rules**:
[Include rules from CRITICAL-REVIEW doc]

**Few-Shot Examples**:
[Include 5 examples from QUERY-TAXONOMY]
`;
```

**Acceptance Criteria**:
- LLM correctly extracts entities from complex queries
- Handles "passout" → year_of_graduation mapping
- JSON output is always valid
- Improves accuracy on complex queries to 85%+

**Dependencies**: None (can run parallel)

---

### ✅ **Task 2.3: Build Hybrid Extraction Service**
**Priority**: P0 - Critical  
**Estimated Time**: 4-5 hours  
**File**: `Server/src/services/hybridExtractor.ts`

**Steps**:
- [ ] Create `hybridExtractor.ts` combining regex + LLM
- [ ] Implement decision logic (when to use regex vs LLM)
- [ ] Add confidence threshold for LLM fallback (< 0.7)
- [ ] Merge regex and LLM results intelligently
- [ ] Add performance logging (track regex vs LLM usage)
- [ ] Implement caching for common queries
- [ ] Add fallback handling if LLM fails

**Code Structure**:
```typescript
interface HybridExtractionResult {
  intent: Intent;
  entities: ExtractedEntities;
  confidence: number;
  method: 'regex' | 'llm' | 'hybrid';
  extractionTime: number;
}

async function extractEntities(query: string, context?: string): Promise<HybridExtractionResult> {
  // 1. Try intent classification
  const intent = classifyIntent(query);
  
  // 2. Try regex extraction
  const regexResult = extractWithRegex(query);
  
  // 3. Use LLM only if regex confidence < 0.7
  if (regexResult.confidence < 0.7) {
    const llmResult = await llmExtract(query, regexResult, context);
    return mergeResults(regexResult, llmResult);
  }
  
  return regexResult;
}
```

**Acceptance Criteria**:
- 80%+ queries use regex only (fast path)
- 20% queries use LLM fallback
- Average extraction time < 150ms
- Maintains 90%+ accuracy overall
- Logs usage statistics

**Dependencies**: Task 1.2, 2.1, 2.2

---

### ✅ **Task 2.4: Update nlSearchService Integration**
**Priority**: P0 - Critical  
**Estimated Time**: 2-3 hours  
**File**: `Server/src/services/nlSearchService.ts`

**Steps**:
- [ ] Replace `parseQuery()` call with `extractEntities()` from hybrid service
- [ ] Pass intent to search optimization
- [ ] Update entity to filter conversion logic
- [ ] Add performance metrics logging
- [ ] Handle new confidence scoring
- [ ] Update error handling

**Changes**:
```typescript
// OLD
const parsed = await parseQuery(naturalQuery, conversationContext);

// NEW
const extracted = await extractEntities(naturalQuery, conversationContext);
const filters = entitiesToFilters(extracted.entities, extracted.intent);
```

**Acceptance Criteria**:
- nlSearchService uses hybrid extractor
- No regression in existing functionality
- Improved response times measured
- Intent passed through to response formatter

**Dependencies**: Task 2.3

---

## **PHASE 3: Response Optimization** (Days 5-6)

### ✅ **Task 3.1: Create Intent-Based Response Formatters**
**Priority**: P1 - High  
**Estimated Time**: 4-5 hours  
**File**: `Server/src/services/responseFormatter.ts`

**Steps**:
- [ ] Create `responseFormatter.ts` service
- [ ] Implement `formatBusinessResults()` - show org, services, turnover
- [ ] Implement `formatPeerResults()` - show name, batch, current role
- [ ] Implement `formatAlumniBusinessResults()` - hybrid format
- [ ] Implement `formatSpecificPersonResults()` - detailed profile
- [ ] Add relevance highlighting (show WHY matched)
- [ ] Add matched fields indicator
- [ ] Add contextual headers based on query
- [ ] Remove LLM call for formatting (use templates)

**Code Structure**:
```typescript
interface FormatterContext {
  query: string;
  intent: Intent;
  entities: ExtractedEntities;
  resultCount: number;
}

function formatBusinessResults(results: Member[], context: FormatterContext): string
function formatPeerResults(results: Member[], context: FormatterContext): string
function formatAlumniBusinessResults(results: Member[], context: FormatterContext): string
function highlightMatchedFields(member: Member, entities: ExtractedEntities): string
```

**Example Output**:
```
Query: "Find web development company in Chennai"

Found 2 web development companies in Chennai:

1. **USAM Technology Solutions Pvt Ltd**
   📍 Chennai
   💼 IT infrastructure solutions, CAD Engineering
   📞 919383999901 | ✉️ sivakumar@usam.in
   💰 Turnover: Above 10 Crores
   ✓ Matched: services (IT, CAD), location (Chennai)
```

**Acceptance Criteria**:
- No LLM calls for response formatting
- Response time < 50ms
- Shows relevant context for each result type
- Highlights matched criteria
- User-friendly formatting with emojis

**Dependencies**: Task 2.1

---

### ✅ **Task 3.2: Create Template-Based Suggestions**
**Priority**: P2 - Medium  
**Estimated Time**: 2-3 hours  
**File**: `Server/src/services/suggestionEngine.ts`

**Steps**:
- [ ] Create rule-based suggestion engine
- [ ] Generate suggestions based on search results (locations, skills found)
- [ ] Create intent-specific suggestion templates
- [ ] Add contextual suggestions (refine by filters)
- [ ] Remove LLM `generateSuggestions()` call
- [ ] Add fallback suggestions for edge cases

**Code Structure**:
```typescript
function generateSuggestions(
  query: string,
  intent: Intent,
  results: Member[],
  entities: ExtractedEntities
): string[] {
  // Extract unique attributes from results
  const cities = extractUniqueCities(results);
  const skills = extractUniqueSkills(results);
  
  // Generate based on intent
  switch(intent) {
    case 'find_business':
      return [
        `Find ${skills[0]} services in ${cities[1]}`,
        `Show companies with turnover above 10cr`,
        `Filter by ${cities[0]} location`
      ];
    // ... other intents
  }
}
```

**Acceptance Criteria**:
- No LLM calls for suggestions
- Suggestions < 20ms generation time
- Contextual and relevant to search
- Based on actual result data

**Dependencies**: Task 3.1

---

### ✅ **Task 3.3: Update Response Generation in llmService**
**Priority**: P1 - High  
**Estimated Time**: 2-3 hours  
**File**: `Server/src/services/llmService.ts`

**Steps**:
- [ ] Replace `generateResponse()` LLM call with template formatter
- [ ] Keep LLM fallback for very complex queries only
- [ ] Update function signature to use responseFormatter
- [ ] Remove rigid comma-separated format prompt
- [ ] Add performance logging
- [ ] Update error handling

**Changes**:
```typescript
// OLD: Always uses LLM
export async function generateResponse(
  originalQuery: string,
  results: MemberSearchResult[],
  confidence: number
): Promise<string> {
  // ... LLM call (800-2000ms)
}

// NEW: Templates first, LLM fallback
export async function generateResponse(
  originalQuery: string,
  results: MemberSearchResult[],
  intent: Intent,
  entities: ExtractedEntities
): Promise<string> {
  // Use template formatter (10-50ms)
  return formatResponse(results, { query: originalQuery, intent, entities });
}
```

**Acceptance Criteria**:
- 95%+ queries use templates
- Response generation < 50ms
- LLM only for ambiguous queries
- No regression in quality

**Dependencies**: Task 3.1

---

### ✅ **Task 3.4: Update nlSearchService Response Flow**
**Priority**: P1 - High  
**Estimated Time**: 2 hours  
**File**: `Server/src/services/nlSearchService.ts`

**Steps**:
- [ ] Replace `generateResponse()` with new formatter
- [ ] Replace `generateSuggestions()` with template engine
- [ ] Pass intent and entities to formatters
- [ ] Update response structure
- [ ] Add performance metrics
- [ ] Update error messages

**Acceptance Criteria**:
- End-to-end flow uses new formatters
- Total response time < 500ms for simple queries
- < 800ms for complex queries
- Maintains all existing functionality

**Dependencies**: Task 3.1, 3.2, 3.3

---

## **PHASE 4: Testing & Optimization** (Days 7-8)

### ✅ **Task 4.1: Run Full Test Suite**
**Priority**: P0 - Critical  
**Estimated Time**: 3-4 hours  

**Steps**:
- [ ] Run all 188 queries through new pipeline
- [ ] Measure accuracy by query type
- [ ] Measure response times (p50, p95, p99)
- [ ] Compare with baseline metrics
- [ ] Document regression issues
- [ ] Fix critical bugs

**Metrics to Track**:
```
- Overall accuracy: Target 90-95% (baseline 65-75%)
- Simple queries: Target 95%+ accuracy, <100ms
- Medium queries: Target 90%+ accuracy, <200ms
- Complex queries: Target 85%+ accuracy, <500ms
- Regex usage: Target 80%+
- LLM usage: Target <20%
```

**Acceptance Criteria**:
- All targets met or documented exceptions
- Regression report generated
- Bug fixes implemented

**Dependencies**: All Phase 1-3 tasks

---

### ✅ **Task 4.2: Add Performance Monitoring**
**Priority**: P1 - High  
**Estimated Time**: 2-3 hours  
**File**: `Server/src/middlewares/performanceMonitor.ts`

**Steps**:
- [ ] Create performance monitoring middleware
- [ ] Track extraction method (regex vs LLM)
- [ ] Track response times by query type
- [ ] Log accuracy confidence scores
- [ ] Create performance dashboard data
- [ ] Add Redis metrics tracking
- [ ] Create daily performance report

**Code Structure**:
```typescript
interface PerformanceMetrics {
  query: string;
  intent: Intent;
  extractionMethod: 'regex' | 'llm' | 'hybrid';
  extractionTime: number;
  searchTime: number;
  formatTime: number;
  totalTime: number;
  resultCount: number;
  confidence: number;
  timestamp: Date;
}

function logPerformance(metrics: PerformanceMetrics)
function generateDailyReport(): PerformanceReport
```

**Acceptance Criteria**:
- All queries logged with metrics
- Daily report generation working
- Performance data visible in analytics
- Alerts for slow queries (>1s)

**Dependencies**: Task 4.1

---

### ✅ **Task 4.3: Implement Query Caching**
**Priority**: P2 - Medium  
**Estimated Time**: 3-4 hours  
**File**: `Server/src/services/queryCache.ts`

**Steps**:
- [ ] Create Redis-based query cache
- [ ] Cache extraction results (regex/LLM)
- [ ] Cache search results for common queries
- [ ] Set appropriate TTL (1 hour for search, 24h for extraction)
- [ ] Add cache hit/miss metrics
- [ ] Implement cache invalidation on member updates
- [ ] Add cache warming for popular queries

**Code Structure**:
```typescript
async function getCachedExtraction(query: string): Promise<ExtractionResult | null>
async function setCachedExtraction(query: string, result: ExtractionResult): Promise<void>
async function getCachedSearch(queryHash: string): Promise<SearchResult | null>
async function invalidateCache(memberId: string): Promise<void>
```

**Acceptance Criteria**:
- Cache hit rate >40% for extractions
- Cache hit rate >25% for searches
- Response time <50ms for cached queries
- Cache invalidation works correctly

**Dependencies**: Task 4.1

---

### ✅ **Task 4.4: Load Testing**
**Priority**: P2 - Medium  
**Estimated Time**: 2-3 hours  
**File**: `Server/src/tests/loadTest.ts`

**Steps**:
- [ ] Create load testing script (Artillery/k6)
- [ ] Test with 10 concurrent users
- [ ] Test with 50 concurrent users
- [ ] Test with 100 concurrent users
- [ ] Measure response times under load
- [ ] Identify bottlenecks
- [ ] Document scaling recommendations

**Acceptance Criteria**:
- Handles 50 concurrent users with <1s p95
- No crashes or errors under load
- Clear bottleneck identification
- Scaling plan documented

**Dependencies**: Task 4.1, 4.2, 4.3

---

## **PHASE 5: Production Deployment** (Days 9-10)

### ✅ **Task 5.1: Feature Flag Implementation**
**Priority**: P0 - Critical  
**Estimated Time**: 2-3 hours  
**File**: `Server/src/config/featureFlags.ts`

**Steps**:
- [ ] Create feature flag system
- [ ] Add `USE_HYBRID_EXTRACTION` flag (default: false)
- [ ] Add `USE_TEMPLATE_RESPONSES` flag (default: false)
- [ ] Add gradual rollout capability (10%, 25%, 50%, 100%)
- [ ] Add user-based override (for testing)
- [ ] Add admin toggle endpoint

**Code Structure**:
```typescript
const FEATURE_FLAGS = {
  USE_HYBRID_EXTRACTION: process.env.USE_HYBRID_EXTRACTION === 'true',
  USE_TEMPLATE_RESPONSES: process.env.USE_TEMPLATE_RESPONSES === 'true',
  ROLLOUT_PERCENTAGE: parseInt(process.env.ROLLOUT_PERCENTAGE || '0')
};

function shouldUseNewPipeline(userId: string): boolean
```

**Acceptance Criteria**:
- Feature flags work correctly
- Gradual rollout functional
- Can switch back to old implementation instantly
- No downtime during toggle

**Dependencies**: All Phase 4 tasks

---

### ✅ **Task 5.2: A/B Testing Setup**
**Priority**: P1 - High  
**Estimated Time**: 3-4 hours  
**File**: `Server/src/services/abTesting.ts`

**Steps**:
- [ ] Create A/B test framework
- [ ] Split users 50/50 (old vs new pipeline)
- [ ] Track metrics for both groups
- [ ] Log results to separate analytics tables
- [ ] Create comparison dashboard
- [ ] Set success criteria (accuracy, latency, satisfaction)

**Metrics to Compare**:
```
- Average response time (old vs new)
- Accuracy rate (old vs new)
- User satisfaction (if available)
- API cost per query
- Error rate
```

**Acceptance Criteria**:
- A/B test runs correctly
- Metrics collected for both groups
- Comparison report available
- Decision criteria documented

**Dependencies**: Task 5.1

---

### ✅ **Task 5.3: Documentation & Training**
**Priority**: P1 - High  
**Estimated Time**: 4-5 hours  

**Steps**:
- [ ] Update API documentation
- [ ] Create architecture diagram (new flow)
- [ ] Document regex patterns and when they're used
- [ ] Document LLM prompt design
- [ ] Create troubleshooting guide
- [ ] Update README.md with new approach
- [ ] Create migration guide for developers
- [ ] Document performance characteristics

**Deliverables**:
- `docs/HYBRID-EXTRACTION-GUIDE.md`
- `docs/QUERY-OPTIMIZATION-RESULTS.md`
- Updated `README.md`
- Updated `openapi.yaml`

**Acceptance Criteria**:
- All documentation complete and reviewed
- Architecture diagrams updated
- Troubleshooting guide tested
- Developer migration guide clear

**Dependencies**: All previous tasks

---

### ✅ **Task 5.4: Production Deployment**
**Priority**: P0 - Critical  
**Estimated Time**: 2-3 hours  

**Steps**:
- [ ] Deploy to staging environment
- [ ] Run smoke tests on staging
- [ ] Enable feature flag at 10% rollout
- [ ] Monitor metrics for 24 hours
- [ ] Increase to 25% if stable
- [ ] Monitor for 48 hours
- [ ] Increase to 50% if stable
- [ ] Monitor for 72 hours
- [ ] Full rollout (100%) if successful
- [ ] Post-deployment monitoring

**Rollback Plan**:
- Toggle feature flag to 0%
- Switch to old pipeline
- Investigate issues
- Fix and redeploy

**Acceptance Criteria**:
- Staged rollout successful
- No critical errors
- Metrics show improvement
- Rollback plan tested
- Production stable

**Dependencies**: Task 5.1, 5.2, 5.3

---

## 📊 Success Metrics

### **Performance Targets**

| Metric | Baseline | Phase 1 | Phase 2 | Phase 4 | Production |
|--------|----------|---------|---------|---------|------------|
| **Avg Response Time** | 2.5-4s | - | 1.5-2.5s | 0.3-0.8s | <0.5s |
| **P95 Response Time** | 4-6s | - | 2.5-3.5s | 0.8-1.2s | <1s |
| **Entity Accuracy** | 65-75% | 65-75% | 80-85% | 90-95% | >90% |
| **Regex Usage** | 0% | 0% | 70-80% | 80-90% | >80% |
| **LLM Usage** | 100% | 100% | 20-30% | 10-20% | <20% |
| **API Cost/Query** | $0.003 | $0.003 | $0.002 | $0.0008 | <$0.001 |

### **Quality Metrics**

- ✅ **Simple Queries** (45%): 95%+ accuracy, <100ms
- ✅ **Medium Queries** (35%): 90%+ accuracy, <200ms
- ✅ **Complex Queries** (15%): 85%+ accuracy, <500ms
- ✅ **Conversational** (5%): 80%+ accuracy, <300ms

---

## 🚨 Risk Mitigation

### **Technical Risks**

| Risk | Impact | Mitigation |
|------|--------|------------|
| Regex doesn't cover enough queries | High | Comprehensive test suite, measure coverage |
| LLM fallback too slow | Medium | Cache extraction results, async processing |
| Response quality degrades | High | Template quality review, user feedback |
| Production bugs | High | Feature flags, gradual rollout, rollback plan |

### **Business Risks**

| Risk | Impact | Mitigation |
|------|--------|------------|
| Users prefer old format | Medium | A/B testing, user surveys |
| Cost doesn't reduce enough | Low | Monitor API usage, optimize LLM calls |
| Deployment issues | High | Staging environment, careful rollout |

---

## 📅 Timeline Summary

| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| **Phase 1** | 2 days | Test suite, regex extractor, baseline metrics |
| **Phase 2** | 2 days | Hybrid extractor, improved LLM prompt, integration |
| **Phase 3** | 2 days | Template formatters, suggestion engine, response optimization |
| **Phase 4** | 2 days | Full testing, performance monitoring, caching |
| **Phase 5** | 2 days | Feature flags, A/B testing, production deployment |
| **TOTAL** | **10 days** | Production-ready optimized search |

---

## 🎯 Next Immediate Actions

### **Start Today** (Priority Order)

1. ✅ **Review and validate** this TODO plan
2. ✅ **Set up development branch** (`feature/query-optimization`)
3. ✅ **Begin Task 1.1** - Create test suite with 188 queries
4. ✅ **Begin Task 1.2** - Build regex entity extractor
5. ✅ **Daily standups** - Track progress against timeline

### **Dependencies Check**

- [ ] Access to test environment
- [ ] Redis available for caching
- [ ] DeepInfra API key active
- [ ] Test data populated in database
- [ ] Monitoring tools set up

---

## 📞 Support & Resources

**Reference Documents**:
- Architecture: `/CRITICAL-REVIEW-LLM-FLOW.md`
- Query Patterns: `/QUERY-TAXONOMY.md`
- Current Code: `/Server/src/services/llmService.ts`

**Key Files to Modify**:
- `Server/src/services/llmService.ts` (LLM prompts)
- `Server/src/services/nlSearchService.ts` (orchestration)
- New: `Server/src/services/regexExtractor.ts`
- New: `Server/src/services/hybridExtractor.ts`
- New: `Server/src/services/responseFormatter.ts`

**Testing**:
- Test suite: `Server/src/tests/queryExtraction.test.ts`
- Load testing: `Server/src/tests/loadTest.ts`

---

**Document Version**: 1.0  
**Last Updated**: November 14, 2025  
**Status**: Ready for Implementation ✅
