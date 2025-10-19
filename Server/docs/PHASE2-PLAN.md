# Phase 2 Implementation Plan: Search Endpoints

## Overview
Phase 2 implements the core search functionality with both structured filtering and semantic search capabilities. This phase builds on the database and embeddings created in Phase 1.

**Status**: Ready to Implement  
**Dependencies**: Phase 1 Complete ✅  
**Estimated Time**: 4-6 hours  
**Priority**: High

---

## Goals

### Primary Objectives
1. ✅ Enable structured search with filters (skills, location, services, turnover, year)
2. ✅ Implement semantic search using pgvector embeddings
3. ✅ Provide member detail and listing endpoints
4. ✅ Support hybrid search (keyword + semantic)
5. ✅ Add pagination, sorting, and result ranking

### Success Criteria
- [ ] POST /api/search/members returns relevant results with filters
- [ ] Semantic search finds members even with paraphrased queries
- [ ] Search results are ranked by relevance score
- [ ] Pagination works correctly for large result sets
- [ ] GET endpoints return properly formatted member data
- [ ] Response times under 500ms for typical queries

---

## Architecture

### Technology Stack
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with pgvector extension
- **Search Strategy**: Hybrid (full-text search + vector similarity)
- **Similarity Metric**: Cosine similarity for embeddings
- **Caching**: Optional query result caching

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    API Layer (Routes)                        │
│  /api/search/members  /api/members/:id  /api/members        │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                  Controller Layer                            │
│  searchController.ts  -  memberController.ts                 │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   Service Layer                              │
│  semanticSearch.ts  -  memberService.ts                      │
│  - Hybrid search logic                                       │
│  - Vector similarity calculation                             │
│  - Result ranking & aggregation                              │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                  Database Layer                              │
│  PostgreSQL + pgvector                                       │
│  - Full-text search (tsvector)                               │
│  - Vector similarity (cosine distance)                       │
│  - Filtered queries with indexes                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Tasks

### Task 1: Semantic Search Service ⭐ PRIORITY
**File**: `src/services/semanticSearch.ts`  
**Status**: Not Started

**Responsibilities**:
- Generate embeddings for search queries (using DeepInfra)
- Execute vector similarity search using pgvector
- Combine full-text search with semantic search
- Rank and score results
- Apply filters (skills, location, services, etc.)

**Key Functions**:
```typescript
// Core search function
async function searchMembers(params: SearchParams): Promise<SearchResult[]>

// Generate query embedding
async function generateQueryEmbedding(query: string): Promise<number[]>

// Hybrid search (combines keyword + semantic)
async function hybridSearch(
  query: string,
  filters: SearchFilters,
  options: SearchOptions
): Promise<RankedResult[]>

// Vector similarity search only
async function semanticSearchOnly(
  embedding: number[],
  filters: SearchFilters,
  limit: number
): Promise<Member[]>

// Full-text search only
async function keywordSearchOnly(
  query: string,
  filters: SearchFilters,
  limit: number
): Promise<Member[]>
```

**Search Strategy**:
1. **Hybrid Approach** (Default):
   - Generate embedding for query
   - Execute semantic search (cosine similarity)
   - Execute full-text search (tsvector)
   - Merge results with weighted scoring:
     - Semantic score: 70% weight
     - Keyword score: 30% weight
   - De-duplicate and rank

2. **Semantic-Only** (For descriptive queries):
   - Use when query is conversational/descriptive
   - Pure vector similarity search
   - Better for "find someone who can help with..."

3. **Keyword-Only** (For exact matches):
   - Use for specific terms/names
   - Pure full-text search
   - Better for "find John" or "software engineer"

**SQL Queries**:
```sql
-- Semantic search with filters
SELECT 
  m.*, 
  e.profile_embedding <=> $1 AS profile_distance,
  e.skills_embedding <=> $1 AS skills_distance,
  LEAST(
    e.profile_embedding <=> $1,
    e.skills_embedding <=> $1
  ) AS min_distance,
  1 - LEAST(
    e.profile_embedding <=> $1,
    e.skills_embedding <=> $1
  ) AS similarity_score
FROM community_members m
JOIN member_embeddings e ON m.id = e.member_id
WHERE m.is_active = TRUE
  AND ($2::TEXT IS NULL OR m.city ILIKE $2)
  AND ($3::TEXT IS NULL OR m.skills ILIKE $3)
  AND ($4::TEXT IS NULL OR m.products_services ILIKE $4)
ORDER BY min_distance ASC
LIMIT $5 OFFSET $6;

-- Full-text search with ranking
SELECT 
  m.*,
  ts_rank(m.full_text_search, plainto_tsquery($1)) AS rank
FROM community_members m
WHERE m.full_text_search @@ plainto_tsquery($1)
  AND m.is_active = TRUE
  AND ($2::TEXT IS NULL OR m.city ILIKE $2)
ORDER BY rank DESC
LIMIT $3 OFFSET $4;
```

---

### Task 2: Member Service
**File**: `src/services/memberService.ts`  
**Status**: Not Started

**Responsibilities**:
- Fetch single member by ID
- List all members with pagination
- Get member statistics
- Format member data for responses

**Key Functions**:
```typescript
async function getMemberById(id: string): Promise<Member | null>
async function getAllMembers(page: number, limit: number): Promise<PaginatedMembers>
async function getMemberStats(): Promise<MemberStats>
```

---

### Task 3: Search Controller
**File**: `src/controllers/searchController.ts`  
**Status**: Not Started

**Responsibilities**:
- Handle POST /api/search/members requests
- Validate search parameters
- Call semantic search service
- Format and return results

**Request Schema**:
```typescript
interface SearchMembersRequest {
  query?: string;                    // Natural language or keyword query
  filters?: {
    skills?: string[];               // e.g., ["software", "AI"]
    services?: string[];             // e.g., ["consulting", "development"]
    city?: string;                   // e.g., "Chennai"
    minTurnover?: number;            // e.g., 1000000
    maxTurnover?: number;            // e.g., 50000000
    yearOfGraduation?: number[];     // e.g., [2010, 2015]
    degree?: string[];               // e.g., ["B.E", "MBA"]
  };
  searchType?: 'hybrid' | 'semantic' | 'keyword';  // Default: 'hybrid'
  page?: number;                     // Default: 1
  limit?: number;                    // Default: 10, Max: 50
  sortBy?: 'relevance' | 'name' | 'turnover' | 'year';  // Default: 'relevance'
  sortOrder?: 'asc' | 'desc';        // Default: 'desc'
}
```

**Response Schema**:
```typescript
interface SearchMembersResponse {
  success: boolean;
  query: string;
  searchType: string;
  results: {
    members: Array<{
      id: string;
      name: string;
      email: string;
      phone: string;
      city: string;
      organization: string;
      designation: string;
      skills: string;
      productsServices: string;
      annualTurnover: number;
      yearOfGraduation: number;
      degree: string;
      branch: string;
      relevanceScore: number;        // 0-1 score
      matchedFields: string[];       // Which fields matched
    }>;
    pagination: {
      currentPage: number;
      totalPages: number;
      totalResults: number;
      resultsPerPage: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
    executionTime: number;           // milliseconds
  };
}
```

**Example Requests**:

1. **Skill-based search**:
```json
{
  "query": "software development and AI",
  "searchType": "hybrid",
  "page": 1,
  "limit": 10
}
```

2. **Location + Service search**:
```json
{
  "filters": {
    "city": "Chennai",
    "services": ["consulting", "software"]
  },
  "sortBy": "turnover",
  "sortOrder": "desc"
}
```

3. **Complex filtered search**:
```json
{
  "query": "cloud infrastructure",
  "filters": {
    "city": "Chennai",
    "minTurnover": 5000000,
    "yearOfGraduation": [2005, 2010, 2015]
  },
  "searchType": "semantic",
  "limit": 20
}
```

---

### Task 4: Member Controller
**File**: `src/controllers/memberController.ts`  
**Status**: Not Started

**Endpoints**:

1. **GET /api/members/:id**
   - Get single member details by ID
   - Returns 404 if not found
   - Includes all member fields

2. **GET /api/members**
   - List all members with pagination
   - Optional filters: city, degree, year
   - Sortable by name, turnover, year

3. **GET /api/search/suggestions** (Optional - Nice to have)
   - Autocomplete for skills/services
   - Returns top N unique values
   - Used for frontend typeahead

---

### Task 5: Routes Configuration
**File**: `src/routes/search.ts`  
**Status**: Not Started

**Routes to Add**:
```typescript
POST   /api/search/members              // Main search endpoint
GET    /api/members                     // List all members
GET    /api/members/:id                 // Get single member
GET    /api/search/suggestions          // Autocomplete (optional)
```

**Middleware**:
- Request validation
- Error handling
- Response formatting
- Optional: Rate limiting
- Optional: Caching

---

### Task 6: Type Definitions
**File**: `src/utils/types.ts`  
**Status**: Needs Update

**New Types to Add**:
```typescript
// Search request types
export interface SearchFilters {
  skills?: string[];
  services?: string[];
  city?: string;
  minTurnover?: number;
  maxTurnover?: number;
  yearOfGraduation?: number[];
  degree?: string[];
}

export interface SearchOptions {
  searchType?: 'hybrid' | 'semantic' | 'keyword';
  page?: number;
  limit?: number;
  sortBy?: 'relevance' | 'name' | 'turnover' | 'year';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchParams {
  query?: string;
  filters?: SearchFilters;
  options?: SearchOptions;
}

// Search result types
export interface MemberSearchResult {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  organization: string;
  designation: string;
  skills: string;
  productsServices: string;
  annualTurnover: number;
  yearOfGraduation: number;
  degree: string;
  branch: string;
  relevanceScore: number;
  matchedFields: string[];
}

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalResults: number;
  resultsPerPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface SearchResponse {
  success: boolean;
  query?: string;
  searchType: string;
  results: {
    members: MemberSearchResult[];
    pagination: PaginationInfo;
    executionTime: number;
  };
}

// Member service types
export interface Member {
  id: string;
  name: string;
  yearOfGraduation: number | null;
  degree: string | null;
  branch: string | null;
  workingAs: string | null;
  organization: string | null;
  designation: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  skills: string | null;
  productsServices: string | null;
  annualTurnover: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedMembers {
  members: Member[];
  pagination: PaginationInfo;
}

export interface MemberStats {
  totalMembers: number;
  activemembers: number;
  uniqueCities: number;
  uniqueDegrees: number;
  averageTurnover: number;
  topSkills: Array<{ skill: string; count: number }>;
  topCities: Array<{ city: string; count: number }>;
}
```

---

## Implementation Order

### Step 1: Foundation (30 mins)
1. ✅ Update `src/utils/types.ts` with new type definitions
2. ✅ Review existing database schema and indexes

### Step 2: Core Services (2-3 hours)
1. ✅ Implement `semanticSearch.ts`:
   - Start with simple vector search
   - Add full-text search
   - Implement hybrid search
   - Add filtering logic
   - Test with sample queries

2. ✅ Implement `memberService.ts`:
   - Basic CRUD operations
   - Pagination logic
   - Statistics functions

### Step 3: Controllers (1-2 hours)
1. ✅ Implement `searchController.ts`:
   - Request validation
   - Call semantic search service
   - Format responses
   - Error handling

2. ✅ Implement `memberController.ts`:
   - GET /members/:id
   - GET /members
   - GET /search/suggestions (optional)

### Step 4: Routes & Integration (1 hour)
1. ✅ Create/update route files
2. ✅ Register routes in main app
3. ✅ Add middleware
4. ✅ Test all endpoints

### Step 5: Testing & Refinement (1 hour)
1. ✅ Manual testing with curl/Postman
2. ✅ Test edge cases (no results, invalid filters, etc.)
3. ✅ Performance testing
4. ✅ Optimize queries if needed

---

## Search Algorithm Details

### Hybrid Search Scoring

**Formula**:
```
final_score = (semantic_score * 0.7) + (keyword_score * 0.3)

where:
  semantic_score = 1 - cosine_distance  (0 to 1)
  keyword_score = ts_rank / max_rank    (0 to 1, normalized)
```

**Weights Justification**:
- **70% Semantic**: Captures intent and context better
- **30% Keyword**: Ensures exact term matches are not missed

**Alternative Strategies**:
- **Query Type Detection**: Adjust weights based on query characteristics
  - Short queries (< 5 words): 50/50 split
  - Long descriptive queries: 80/20 (favor semantic)
  - Exact names/terms: 20/80 (favor keyword)

### Filtering Strategy

**Filter Application**:
1. Apply filters at SQL level (WHERE clauses)
2. Use indexes for performance
3. Combine with search results using AND logic

**Supported Filters**:
```typescript
// String filters (ILIKE for case-insensitive)
city: "Chennai" → WHERE city ILIKE '%Chennai%'
skills: ["AI", "ML"] → WHERE skills ILIKE '%AI%' OR skills ILIKE '%ML%'

// Numeric filters
minTurnover: 1000000 → WHERE annual_turnover >= 1000000
maxTurnover: 50000000 → WHERE annual_turnover <= 50000000

// Array filters
yearOfGraduation: [2010, 2015] → WHERE year_of_graduation IN (2010, 2015)
```

### Ranking Strategy

**Relevance Score Calculation**:
```typescript
relevanceScore = (
  semantic_similarity * 0.7 +
  keyword_rank * 0.3 +
  field_match_bonus * 0.1 +
  exact_match_bonus * 0.2
)

// Field match bonus: +0.1 for each matched field (max 0.5)
// Exact match bonus: +0.2 if query exactly matches a field value
```

**Sort Options**:
- `relevance`: Use calculated relevance score (default)
- `name`: Alphabetical by member name
- `turnover`: By annual turnover (desc)
- `year`: By graduation year (desc/asc)

---

## Performance Considerations

### Query Optimization
- ✅ Use prepared statements (parameterized queries)
- ✅ Leverage existing indexes (GIN for full-text, IVFFlat for vectors)
- ✅ Limit result set size (max 50 per page)
- ⏳ Add query result caching for popular searches
- ⏳ Implement query timeout (5 seconds max)

### Expected Performance
- **Simple keyword search**: < 100ms
- **Semantic search**: < 200ms
- **Hybrid search**: < 300ms
- **Complex filtered search**: < 500ms

### Caching Strategy (Optional)
```typescript
// Cache key format
cache_key = hash(query + filters + options)

// Cache duration
- Popular queries: 1 hour
- Filtered queries: 15 minutes
- Member details: 5 minutes

// Cache invalidation
- On new member added
- On member updated
- On member deleted
```

---

## Testing Plan

### Manual Testing Scenarios

1. **Basic Search**:
```bash
curl -X POST http://localhost:3000/api/search/members \
  -H "Content-Type: application/json" \
  -d '{"query": "software development"}'
```

2. **Filtered Search**:
```bash
curl -X POST http://localhost:3000/api/search/members \
  -H "Content-Type: application/json" \
  -d '{
    "query": "consulting",
    "filters": {
      "city": "Chennai",
      "minTurnover": 5000000
    },
    "limit": 5
  }'
```

3. **Semantic Search**:
```bash
curl -X POST http://localhost:3000/api/search/members \
  -H "Content-Type: application/json" \
  -d '{
    "query": "someone who can help with cloud infrastructure and DevOps",
    "searchType": "semantic",
    "limit": 10
  }'
```

4. **Get Member**:
```bash
curl http://localhost:3000/api/members/{member_id}
```

5. **List Members**:
```bash
curl "http://localhost:3000/api/members?page=1&limit=20&sortBy=name"
```

### Test Cases
- ✅ Empty query returns all members
- ✅ Invalid filters return error
- ✅ Pagination works correctly
- ✅ No results scenario handled gracefully
- ✅ Special characters in query handled
- ✅ Case-insensitive search works
- ✅ Multiple filters combined correctly
- ✅ Sort options work as expected

---

## Error Handling

### Common Errors

1. **Invalid Query Parameters**:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_PARAMETERS",
    "message": "Invalid search parameters",
    "details": {
      "limit": "Must be between 1 and 50"
    }
  }
}
```

2. **Database Error**:
```json
{
  "success": false,
  "error": {
    "code": "DATABASE_ERROR",
    "message": "Failed to execute search query",
    "details": "Connection timeout"
  }
}
```

3. **Not Found**:
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Member not found",
    "details": "No member exists with the provided ID"
  }
}
```

---

## API Documentation Updates

### OpenAPI Spec Updates Needed

```yaml
/api/search/members:
  post:
    summary: Search community members
    description: Search members using natural language queries with optional filters
    tags:
      - Search
    requestBody:
      required: false
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/SearchMembersRequest'
    responses:
      200:
        description: Search results
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/SearchMembersResponse'
      400:
        description: Invalid parameters
      500:
        description: Server error

/api/members/{id}:
  get:
    summary: Get member details
    tags:
      - Members
    parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
          format: uuid
    responses:
      200:
        description: Member details
      404:
        description: Member not found

/api/members:
  get:
    summary: List all members
    tags:
      - Members
    parameters:
      - name: page
        in: query
        schema:
          type: integer
          default: 1
      - name: limit
        in: query
        schema:
          type: integer
          default: 10
    responses:
      200:
        description: List of members
```

---

## Success Metrics

### Functional Requirements
- ✅ All endpoints respond correctly
- ✅ Search returns relevant results
- ✅ Filters work as expected
- ✅ Pagination works correctly
- ✅ Errors are handled gracefully

### Performance Requirements
- ✅ Average response time < 500ms
- ✅ Can handle 100 concurrent requests
- ✅ Memory usage < 512MB under load
- ✅ Database connection pool stable

### Quality Requirements
- ✅ TypeScript types for all interfaces
- ✅ Proper error handling and logging
- ✅ Input validation on all endpoints
- ✅ Consistent response formats
- ✅ Code follows project conventions

---

## Next Phase Preview

**Phase 3: Natural Language Query Processing**
- Use Llama 3.1 for intent detection
- Extract entities from conversational queries
- Generate natural language responses
- Implement query refinement suggestions
- Add conversation context tracking

**Dependencies**:
- Phase 2 search endpoints working ✅
- LLM service configured (already done ✅)
- Understanding of typical user queries

---

## Checklist

### Before Starting
- [x] Phase 1 completed (database, imports, embeddings)
- [x] Database connection verified
- [x] 51 members with embeddings in database
- [x] DeepInfra API key configured
- [x] Development environment ready

### Implementation Checklist
- [ ] Type definitions updated
- [ ] Semantic search service implemented
- [ ] Member service implemented
- [ ] Search controller implemented
- [ ] Member controller implemented
- [ ] Routes configured
- [ ] Endpoints registered in app
- [ ] Manual testing completed
- [ ] Error cases tested
- [ ] Performance validated
- [ ] Documentation updated

### Ready for Phase 3 When
- [ ] All Phase 2 endpoints working
- [ ] Search returning accurate results
- [ ] Performance targets met
- [ ] Error handling verified
- [ ] Code reviewed and tested

---

## Notes & Assumptions

1. **Search Query Language**: Assumes English language queries
2. **Embedding Model**: Using BAAI/bge-base-en-v1.5 (same as Phase 1)
3. **Rate Limiting**: Not implemented in Phase 2 (add in production)
4. **Authentication**: Not required for Phase 2 (public endpoints)
5. **Caching**: Optional for Phase 2, recommended for production
6. **Logging**: Use existing logger middleware
7. **Database**: Assumes PostgreSQL 15+ with pgvector extension
8. **Similarity Metric**: Cosine distance (operator `<=>`)

---

**Document Version**: 1.0  
**Last Updated**: October 19, 2025  
**Status**: Ready for Implementation
