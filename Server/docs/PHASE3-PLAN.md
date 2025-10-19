# Phase 3 Implementation Plan: Natural Language Query Processing

## Overview
Phase 3 adds intelligent natural language understanding to the search system using Llama 3.1. Users can ask questions in conversational language, and the system will understand intent, extract entities, and provide natural responses.

**Status**: Ready to Implement  
**Dependencies**: Phase 1 ✅, Phase 2 ✅  
**Estimated Time**: 3-4 hours  
**Priority**: High

---

## Goals

### Primary Objectives
1. ✅ Process natural language queries with Llama 3.1
2. ✅ Detect user intent (find member, get info, compare, etc.)
3. ✅ Extract entities (skills, locations, services, requirements)
4. ✅ Generate conversational responses
5. ✅ Provide query refinement suggestions

### Success Criteria
- [ ] Natural language queries understood correctly (>80% accuracy)
- [ ] Entities extracted properly (skills, cities, requirements)
- [ ] Responses are conversational and helpful
- [ ] Follow-up suggestions are relevant
- [ ] Response time < 5 seconds end-to-end

---

## Architecture

### System Flow

```
User Query (Natural Language)
    ↓
POST /api/search/query
    ↓
Query Parser Service (Llama 3.1)
    ├─→ Intent Detection
    ├─→ Entity Extraction
    └─→ Query Normalization
    ↓
Semantic Search Service (Phase 2)
    ├─→ Generate Embeddings
    ├─→ Execute Search
    └─→ Return Results
    ↓
Response Generator Service (Llama 3.1)
    ├─→ Format Results
    ├─→ Generate Natural Response
    └─→ Create Follow-up Suggestions
    ↓
JSON Response
```

---

## Implementation Tasks

### Task 1: Update LLM Service ⭐ PRIORITY
**File**: `src/services/llmService.ts`  
**Status**: Needs Update (currently basic)

**New Functions Needed**:
```typescript
// Parse natural language query
async function parseQuery(naturalQuery: string): Promise<ParsedQuery>

// Extract structured data from text
async function extractEntities(text: string): Promise<ExtractedEntities>

// Generate conversational response
async function generateResponse(
  query: string,
  results: Member[],
  context: any
): Promise<string>

// Generate follow-up suggestions
async function generateSuggestions(
  query: string,
  results: Member[]
): Promise<string[]>
```

**LLM Prompts**:

1. **Query Parsing Prompt**:
```
You are a search query parser for a business community network. Parse the following natural language query and extract structured information.

User Query: "{user_query}"

Extract the following in JSON format:
{
  "intent": "find_member | get_info | list_members | compare",
  "entities": {
    "skills": ["skill1", "skill2"],
    "location": "city name or null",
    "services": ["service1", "service2"],
    "turnover_requirement": "high | medium | low | null",
    "graduation_year": [year1, year2] or null,
    "degree": "degree name or null"
  },
  "search_query": "simplified search query for semantic search",
  "confidence": 0.0 to 1.0
}

Rules:
- Extract only explicitly mentioned information
- For turnover: "good"/"high" = high (>10Cr), "medium" = medium (2-10Cr), "low" = low (<2Cr)
- Normalize city names (e.g., "chennai" → "Chennai")
- Keep skills and services as specific as possible
- If ambiguous, set confidence < 0.7

Return only valid JSON, no explanation.
```

2. **Response Generation Prompt**:
```
You are a helpful assistant for a business community network. Generate a natural, conversational response based on the search results.

Original Query: "{user_query}"
Number of Results: {count}
Results: {results_summary}

Generate a response that:
1. Acknowledges the user's request
2. Summarizes what was found
3. Highlights key matches (names, skills, locations)
4. Is friendly and professional
5. Is 2-3 sentences long

Example: "I found 5 members in Chennai with AI expertise. The top matches are John Doe (CEO with 10+ years in ML), Jane Smith (AI Consultant), and Mike Johnson (Data Scientist). Would you like more details about any of them?"

Response:
```

3. **Suggestions Prompt**:
```
Based on this search query and results, suggest 3 follow-up questions the user might ask.

Query: "{query}"
Results Found: {count}

Generate 3 natural follow-up questions in JSON array format:
["suggestion 1", "suggestion 2", "suggestion 3"]

Examples:
- "Show me members with higher annual turnover"
- "Find similar members in Bangalore"
- "Who has experience in both AI and consulting?"

Return only JSON array, no explanation.
```

---

### Task 2: Natural Language Search Service
**File**: `src/services/nlSearchService.ts`  
**Status**: New File

**Purpose**: Coordinate NL query processing

```typescript
import { parseQuery, generateResponse, generateSuggestions } from './llmService';
import { searchMembers } from './semanticSearch';

interface NLSearchResult {
  understanding: {
    intent: string;
    entities: any;
    confidence: number;
    normalizedQuery: string;
  };
  results: {
    members: Member[];
    totalCount: number;
  };
  response: {
    conversational: string;
    suggestions: string[];
  };
  executionTime: number;
}

async function processNaturalLanguageQuery(
  naturalQuery: string
): Promise<NLSearchResult>
```

**Flow**:
1. Parse query with LLM
2. Convert entities to search filters
3. Execute semantic search
4. Generate conversational response
5. Create follow-up suggestions
6. Return comprehensive result

---

### Task 3: Natural Language Controller
**File**: `src/controllers/nlSearchController.ts`  
**Status**: New File

**Endpoint**: `POST /api/search/query`

**Request Schema**:
```typescript
interface NLSearchRequest {
  query: string;              // Required: natural language query
  context?: {                 // Optional: conversation context
    previousQuery?: string;
    previousResults?: string[];
  };
  options?: {
    includeResponse?: boolean;  // Default: true
    includeSuggestions?: boolean; // Default: true
    maxResults?: number;        // Default: 10
  };
}
```

**Response Schema**:
```typescript
interface NLSearchResponse {
  success: boolean;
  query: string;
  understanding: {
    intent: string;
    entities: {
      skills?: string[];
      location?: string;
      services?: string[];
      turnoverRequirement?: string;
      graduationYear?: number[];
      degree?: string;
    };
    confidence: number;
    normalizedQuery: string;
  };
  results: {
    members: MemberSearchResult[];
    pagination: PaginationInfo;
  };
  response?: {
    conversational: string;
    suggestions?: string[];
  };
  executionTime: number;
}
```

---

### Task 4: Update Types
**File**: `src/utils/types.ts`  
**Status**: Needs Update

**New Types**:
```typescript
export interface ParsedQuery {
  intent: 'find_member' | 'get_info' | 'list_members' | 'compare';
  entities: ExtractedEntities;
  searchQuery: string;
  confidence: number;
}

export interface ExtractedEntities {
  skills?: string[];
  location?: string;
  services?: string[];
  turnoverRequirement?: 'high' | 'medium' | 'low';
  graduationYear?: number[];
  degree?: string;
}

export interface NLSearchRequest {
  query: string;
  context?: {
    previousQuery?: string;
    previousResults?: string[];
  };
  options?: {
    includeResponse?: boolean;
    includeSuggestions?: boolean;
    maxResults?: number;
  };
}

export interface NLSearchResult {
  understanding: {
    intent: string;
    entities: ExtractedEntities;
    confidence: number;
    normalizedQuery: string;
  };
  results: {
    members: MemberSearchResult[];
    pagination: PaginationInfo;
  };
  response?: {
    conversational: string;
    suggestions?: string[];
  };
  executionTime: number;
}
```

---

### Task 5: Update Routes
**File**: `src/routes/search.ts`  
**Status**: Needs Update

Add new route:
```typescript
import { processNLQueryHandler } from '../controllers/nlSearchController';

router.post('/query', processNLQueryHandler);
```

---

## Example Queries & Expected Behavior

### Example 1: Skill + Location Query
**Input**: "I need someone who knows AI and is based in Chennai"

**Expected Parsing**:
```json
{
  "intent": "find_member",
  "entities": {
    "skills": ["AI", "artificial intelligence"],
    "location": "Chennai"
  },
  "searchQuery": "AI artificial intelligence",
  "confidence": 0.95
}
```

**Search Filters**:
```json
{
  "query": "AI artificial intelligence",
  "filters": {
    "city": "Chennai"
  }
}
```

**Expected Response**:
```json
{
  "conversational": "I found 5 members in Chennai with AI expertise. Top matches include Udhayakumar (Lead Consultant with MCA), Sathyamurthi (Sr Software Manager), and Thirunavukarasu (Founder & CEO). Would you like to know more about any of them?",
  "suggestions": [
    "Show me members with consulting services",
    "Find AI experts in other cities",
    "Who has the highest annual turnover?"
  ]
}
```

### Example 2: Service + Turnover Query
**Input**: "find a consultant with good turnover"

**Expected Parsing**:
```json
{
  "intent": "find_member",
  "entities": {
    "services": ["consulting"],
    "turnoverRequirement": "high"
  },
  "searchQuery": "consultant consulting",
  "confidence": 0.85
}
```

**Search Filters**:
```json
{
  "query": "consultant consulting",
  "filters": {
    "minTurnover": 100000000
  }
}
```

### Example 3: Complex Multi-Criteria
**Input**: "software developer with cloud experience in Chennai, preferably with high revenue"

**Expected Parsing**:
```json
{
  "intent": "find_member",
  "entities": {
    "skills": ["software development", "cloud"],
    "location": "Chennai",
    "turnoverRequirement": "high"
  },
  "searchQuery": "software developer cloud computing",
  "confidence": 0.90
}
```

---

## Implementation Order

### Step 1: Foundation (30 mins)
1. ✅ Update types.ts with NL types
2. ✅ Review and test existing llmService.ts

### Step 2: LLM Service Enhancement (1-1.5 hours)
1. ✅ Implement parseQuery() with Llama 3.1
2. ✅ Implement extractEntities()
3. ✅ Implement generateResponse()
4. ✅ Implement generateSuggestions()
5. ✅ Test each function individually

### Step 3: NL Search Service (45 mins)
1. ✅ Create nlSearchService.ts
2. ✅ Implement processNaturalLanguageQuery()
3. ✅ Entity to filter conversion logic
4. ✅ Integration with Phase 2 search

### Step 4: Controller & Routes (30 mins)
1. ✅ Create nlSearchController.ts
2. ✅ Implement POST /api/search/query handler
3. ✅ Add validation and error handling
4. ✅ Update routes configuration

### Step 5: Testing (1 hour)
1. ✅ Test simple queries
2. ✅ Test complex queries
3. ✅ Test edge cases
4. ✅ Measure performance
5. ✅ Validate response quality

---

## Testing Plan

### Test Queries

1. **Basic Skill Search**:
   - "find someone who knows software development"
   - "I need an AI expert"
   - "who has experience in cloud computing"

2. **Location-Based**:
   - "find members in Chennai"
   - "show me developers in Bangalore"
   - "who is based in Hyderabad"

3. **Service-Based**:
   - "find a consultant"
   - "I need consulting services"
   - "who provides IT consulting"

4. **Combined Criteria**:
   - "AI expert in Chennai with good turnover"
   - "software consultant in Bangalore"
   - "find a high-revenue member with cloud skills"

5. **Conversational**:
   - "I'm looking for someone to help with my AI project in Chennai"
   - "Can you find me a successful consultant?"
   - "Who can help with cloud infrastructure?"

6. **Ambiguous Queries**:
   - "find someone good" (low confidence expected)
   - "I need help" (should ask for clarification)
   - "show me people" (too vague)

---

## Performance Targets

- **Query Parsing**: < 1 second
- **Entity Extraction**: < 500ms
- **Search Execution**: < 3 seconds (from Phase 2)
- **Response Generation**: < 1 second
- **Total End-to-End**: < 5 seconds

---

## Error Handling

### Low Confidence Queries
If confidence < 0.7:
```json
{
  "success": true,
  "understanding": {
    "confidence": 0.6,
    "clarification_needed": true
  },
  "response": {
    "conversational": "I'm not quite sure what you're looking for. Could you be more specific? For example, are you looking for someone with particular skills, in a specific location, or with certain services?",
    "suggestions": [
      "Find members with specific skills (e.g., AI, software development)",
      "Search by location (e.g., Chennai, Bangalore)",
      "Look for members with consulting services"
    ]
  }
}
```

### Empty Results
```json
{
  "response": {
    "conversational": "I couldn't find any members matching '{query}'. You might want to try searching for related skills or different locations.",
    "suggestions": [
      "Try broader search terms",
      "Search in different cities",
      "Browse all members"
    ]
  }
}
```

---

## Success Metrics

### Functional Requirements
- ✅ Parse natural language queries correctly
- ✅ Extract entities with >80% accuracy
- ✅ Generate helpful conversational responses
- ✅ Provide relevant follow-up suggestions
- ✅ Handle ambiguous queries gracefully

### Quality Requirements
- ✅ Response language is natural and friendly
- ✅ Suggestions are contextually relevant
- ✅ Confidence scores are accurate
- ✅ Error messages are helpful

### Performance Requirements
- ✅ End-to-end response < 5 seconds
- ✅ LLM calls < 2 seconds each
- ✅ Memory usage reasonable
- ✅ Can handle concurrent requests

---

## Checklist

### Before Starting
- [x] Phase 2 complete and tested
- [x] LLM service accessible
- [x] Llama 3.1 API key configured
- [x] Understanding of Phase 2 search API

### Implementation Checklist
- [ ] Types updated with NL structures
- [ ] LLM service enhanced with 4 functions
- [ ] NL search service created
- [ ] Controller implemented
- [ ] Routes updated
- [ ] Error handling added
- [ ] Validation implemented

### Testing Checklist
- [ ] Basic queries tested
- [ ] Complex queries tested
- [ ] Edge cases tested
- [ ] Performance measured
- [ ] Response quality validated
- [ ] Suggestions relevance checked

### Ready for Production When
- [ ] All test queries working
- [ ] Confidence scoring accurate
- [ ] Responses are helpful
- [ ] Performance acceptable
- [ ] Error handling verified

---

**Document Version**: 1.0  
**Last Updated**: October 20, 2025  
**Status**: Ready for Implementation  
**Next Step**: Update types and enhance LLM service
