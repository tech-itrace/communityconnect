# Community Search Implementation Plan

**Project**: Community Connect - Business Community Search  
**Created**: October 19, 2025  
**Status**: Planning Phase 📋

---

## Table of Contents
1. [Overview](#overview)
2. [Data Analysis](#data-analysis)
3. [Search Requirements](#search-requirements)
4. [Technical Architecture](#technical-architecture)
5. [API Endpoints Design](#api-endpoints-design)
6. [Implementation Phases](#implementation-phases)
7. [Database Schema](#database-schema)
8. [Natural Language Processing Strategy](#natural-language-processing-strategy)
9. [Example Queries & Responses](#example-queries--responses)
10. [Testing Strategy](#testing-strategy)
11. [Cost Estimation](#cost-estimation)

---

## Overview

Implement a natural language chatbot interface to search the business community database. The chatbot should understand conversational queries and return relevant member information based on skills, services, location, and other criteria.

### Goals
- Enable natural language search across community member data
- Support skill-based, service-based, and location-based queries
- Provide conversational responses with member details
- Handle complex multi-criteria searches
- Maintain privacy and data security

---

## Data Analysis

### Available Data Fields (from CommunityMemberDetails.csv)
| Field | Example | Search Relevance |
|-------|---------|------------------|
| Name | "Mr. Udhayakumar Ulaganathan" | ✅ High - Direct search |
| Year of Graduation | 2009 | ✅ Medium - Experience level |
| Degree | MCA, B.E, MBA | ✅ Medium - Qualification |
| Branch | Mechanical, ECE, Production | ✅ High - Technical domain |
| Working Knowledge | "IT Consulting", "Product" | ✅ **CRITICAL** - Skills/Services |
| Email | udhayapsg@gmail.com | ✅ High - Contact info |
| Phone number | 919943549835 | ✅ High - Contact info |
| Address | "14, kakkan street, chitlapakkam" | ✅ Medium - Exact location |
| City / Town of Living | Chennai, Salem, Madurai | ✅ **CRITICAL** - Location search |
| Organization Name | "Thoughtworks Technologies" | ✅ High - Business/Company |
| Designation | "Lead Consultant", "CEO" | ✅ High - Role/Level |
| Annual Turnover | "Above 10 Crores", "2 to 5 Crores" | ✅ Medium - Business size |

### Key Insights
1. **Working Knowledge** field is the primary indicator of skills/services
2. **City/Town** is critical for location-based searches
3. **Organization Name** helps identify business owners vs employees
4. **Annual Turnover** indicates business scale
5. Data has 48 members (rows 2-49 in CSV)

---

## Search Requirements

### 1. Skill-Based Search
**User Intent**: Find members with specific technical or business skills

**Example Queries**:
- "Who knows about software development?"
- "Find someone with manufacturing experience"
- "I need a consultant for my startup"
- "Show me people with textile expertise"
- "Who can help with IT infrastructure?"

**Search Fields**: Working Knowledge, Degree, Branch, Designation

---

### 2. Service-Based Search
**User Intent**: Find members who provide specific services or run businesses

**Example Queries**:
- "Who provides HR services?"
- "Find someone who does insurance broking"
- "I need a waterproofing contractor"
- "Who offers digital marketing services?"
- "Find manufacturers of aluminium products"

**Search Fields**: Working Knowledge, Organization Name, Annual Turnover

---

### 3. Location-Based Search
**User Intent**: Find members in specific cities or regions

**Example Queries**:
- "Who is based in Chennai?"
- "Find members in Salem"
- "Show me businesses in Madurai"
- "Any consultants near me in Hyderabad?"
- "IT services in Chennai"

**Search Fields**: City/Town of Living, Address

---

### 4. Multi-Criteria Search (Advanced)
**User Intent**: Combine multiple filters

**Example Queries**:
- "Find a software consultant in Chennai"
- "Who provides manufacturing services in Coimbatore with turnover above 5 crores?"
- "B.E Mechanical graduates working in Chennai"
- "Show me startup founders in IT"
- "Diamond jewelry businesses with high turnover"

**Search Fields**: Combination of all relevant fields

---

### 5. Network/Referral Search
**User Intent**: Get recommendations and contextual information

**Example Queries**:
- "Who can I talk to about e-waste recycling?"
- "Recommend someone for industrial automation"
- "Who is the best contact for investment advisory?"
- "Tell me about members working in automobile industry"

**Search Fields**: All fields + contextual matching

---

## Technical Architecture

### Components

```
┌─────────────────────────────────────────────────────────┐
│                    User (WhatsApp/Web)                   │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ Natural Language Query
                     ↓
┌─────────────────────────────────────────────────────────┐
│              API Gateway (Express.js)                    │
│  - /api/search/query (Natural Language)                 │
│  - /api/search/members (Structured)                     │
│  - /api/search/suggestions (Autocomplete)               │
└────────────────────┬────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         ↓                       ↓
┌─────────────────┐     ┌─────────────────┐
│  Query Parser   │     │  LLM Service    │
│  & Intent       │────→│  (DeepInfra)    │
│  Detection      │     │  Llama 3.1 8B   │
└────────┬────────┘     └─────────────────┘
         │
         │ Structured Query
         ↓
┌─────────────────────────────────────────────────────────┐
│           Semantic Search Engine                         │
│  - Embedding Generation (text-embedding-ada-002)        │
│  - Vector Search (pgvector)                             │
│  - Hybrid Search (Vector + Keyword)                     │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│         PostgreSQL Database (Supabase)                   │
│  - community_members (member data)                      │
│  - member_embeddings (vector search)                    │
│  - search_cache (performance)                           │
└─────────────────────────────────────────────────────────┘
```

### Technology Stack Additions

| Component | Technology | Purpose |
|-----------|-----------|---------|
| CSV Parser | `csv-parse` | Import member data |
| Vector Embeddings | OpenAI `text-embedding-ada-002` | Semantic similarity |
| Vector Database | `pgvector` extension | Fast similarity search |
| NLP Enhancement | DeepInfra Llama 3.1 8B | Intent detection & query understanding |
| Caching | Redis or in-memory | Performance optimization |

---

## API Endpoints Design

### 1. Natural Language Search Endpoint

```yaml
POST /api/search/query
```

**Purpose**: Main chatbot endpoint - accepts natural language queries

**Request Body**:
```json
{
  "message": "Find someone who provides IT consulting in Chennai",
  "userId": "user_123",           // Optional: for personalization
  "conversationId": "conv_456",   // Optional: for context
  "limit": 10                     // Optional: max results (default: 10)
}
```

**Response**:
```json
{
  "response": "I found 3 IT consultants in Chennai:\n\n1. **Udhayakumar Ulaganathan** - Lead Consultant at Thoughtworks Technologies...",
  "members": [
    {
      "id": "mem_001",
      "name": "Mr. Udhayakumar, Ulaganathan",
      "workingKnowledge": "Service",
      "organization": "Thoughtworks Technologies",
      "designation": "Lead Consultant - Software Architect",
      "city": "Chennai",
      "email": "udhayapsg@gmail.com",
      "phone": "919943549835",
      "yearOfGraduation": 2009,
      "degree": "MCA",
      "branch": "Computer Application",
      "relevanceScore": 0.95
    }
    // ... more members
  ],
  "metadata": {
    "totalResults": 3,
    "searchType": "service+location",
    "processingTime": "245ms",
    "confidence": 0.92
  }
}
```

**Status Codes**:
- `200`: Success
- `400`: Invalid query
- `500`: Server error

---

### 2. Structured Search Endpoint

```yaml
POST /api/search/members
```

**Purpose**: Structured search with explicit filters (for advanced UI)

**Request Body**:
```json
{
  "filters": {
    "workingKnowledge": "IT consulting",
    "city": ["Chennai", "Bangalore"],
    "degree": ["B.E", "MCA"],
    "turnoverMin": "5 Crores",
    "yearOfGraduationRange": {
      "min": 2000,
      "max": 2015
    }
  },
  "sortBy": "relevance",  // or "name", "yearOfGraduation", "turnover"
  "limit": 20,
  "offset": 0
}
```

**Response**:
```json
{
  "members": [/* array of member objects */],
  "pagination": {
    "total": 45,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

---

### 3. Member Detail Endpoint

```yaml
GET /api/members/:id
```

**Purpose**: Get full details of a specific member

**Response**:
```json
{
  "id": "mem_001",
  "name": "Mr. Udhayakumar, Ulaganathan",
  "contactInfo": {
    "email": "udhayapsg@gmail.com",
    "phone": "919943549835",
    "address": "14, kakkan street, chitlapakkam, KG Snacks, Chennai, Tamilnadu, 600064, India"
  },
  "professional": {
    "organization": "Thoughtworks Technologies",
    "designation": "Lead Consultant - Software Architect",
    "workingKnowledge": "Service",
    "turnover": "Less than 2 Crores"
  },
  "education": {
    "degree": "MCA",
    "branch": "Computer Application",
    "yearOfGraduation": 2009
  },
  "location": {
    "city": "Chennai",
    "state": "Tamil Nadu",
    "country": "India"
  }
}
```

---

### 4. Search Suggestions Endpoint

```yaml
GET /api/search/suggestions?q={query}
```

**Purpose**: Autocomplete/suggestions as user types

**Example**: `GET /api/search/suggestions?q=IT cons`

**Response**:
```json
{
  "suggestions": [
    {
      "text": "IT consulting",
      "type": "service",
      "count": 5
    },
    {
      "text": "IT infrastructure",
      "type": "service",
      "count": 3
    },
    {
      "text": "IT services",
      "type": "service",
      "count": 7
    }
  ]
}
```

---

### 5. Search Analytics Endpoint (Admin)

```yaml
GET /api/admin/search/analytics
```

**Purpose**: Track popular searches, conversion rates

**Response**:
```json
{
  "topSearches": [
    {"query": "IT consulting", "count": 145},
    {"query": "Chennai", "count": 98}
  ],
  "searchesByType": {
    "skill": 345,
    "service": 234,
    "location": 189,
    "multiCriteria": 87
  },
  "avgResponseTime": "187ms",
  "totalSearches": 855
}
```

---

## Implementation Phases

### Phase 1: Data Ingestion & Setup (Day 1-2)
**Goal**: Import CSV data and set up database

**Tasks**:
1. ✅ Create PostgreSQL schema for members
2. ✅ Install `pgvector` extension
3. ✅ Write CSV import script
4. ✅ Validate and clean data
5. ✅ Generate embeddings for all member profiles
6. ✅ Store embeddings in vector table
7. ✅ Create indexes for performance

**Deliverables**:
- `community_members` table populated
- `member_embeddings` table with vectors
- Data import scripts

---

### Phase 2: Basic Search Implementation (Day 3-4)
**Goal**: Implement keyword and filter-based search

**Tasks**:
1. ✅ Implement structured search endpoint (`/api/search/members`)
2. ✅ Add filter logic for all fields
3. ✅ Implement sorting and pagination
4. ✅ Write unit tests
5. ✅ Test with sample queries

**Deliverables**:
- Working `/api/search/members` endpoint
- Test coverage >80%

---

### Phase 3: Semantic Search & Embeddings (Day 5-6)
**Goal**: Add vector-based semantic search

**Tasks**:
1. ✅ Integrate OpenAI embeddings API
2. ✅ Implement query embedding generation
3. ✅ Add vector similarity search
4. ✅ Implement hybrid search (keyword + vector)
5. ✅ Tune relevance scoring
6. ✅ Add caching for common queries

**Deliverables**:
- Semantic search functionality
- Performance benchmarks

---

### Phase 4: NLP Query Parser (Day 7-9)
**Goal**: Understand natural language queries using LLM

**Tasks**:
1. ✅ Design intent detection prompt
2. ✅ Implement query parser with Llama 3.1
3. ✅ Extract entities (skills, locations, etc.)
4. ✅ Convert NL query to structured search
5. ✅ Handle ambiguous queries
6. ✅ Add conversation context support

**Deliverables**:
- `/api/search/query` endpoint
- Intent classification system
- Entity extraction

---

### Phase 5: Response Generation (Day 10-11)
**Goal**: Generate natural, conversational responses

**Tasks**:
1. ✅ Design response templates
2. ✅ Implement LLM-based response generation
3. ✅ Format member data for readability
4. ✅ Handle "no results" gracefully
5. ✅ Add follow-up question suggestions

**Deliverables**:
- Natural language responses
- Response templates

---

### Phase 6: WhatsApp Integration (Day 12-13)
**Goal**: Connect to WhatsApp Business API

**Tasks**:
1. ✅ Set up WhatsApp Business Account
2. ✅ Implement webhook handlers
3. ✅ Format responses for WhatsApp
4. ✅ Handle media messages
5. ✅ Add conversation state management

**Deliverables**:
- WhatsApp bot integration
- Message formatting

---

### Phase 7: Testing & Optimization (Day 14-15)
**Goal**: Ensure reliability and performance

**Tasks**:
1. ✅ End-to-end testing
2. ✅ Load testing (1000+ queries/min)
3. ✅ Optimize database queries
4. ✅ Add monitoring and logging
5. ✅ Fix bugs and edge cases
6. ✅ Documentation

**Deliverables**:
- Test reports
- Performance metrics
- Documentation

---

## Database Schema

### Table: `community_members`

```sql
CREATE TABLE community_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  year_of_graduation INTEGER,
  degree VARCHAR(100),
  branch VARCHAR(100),
  working_knowledge TEXT,
  email VARCHAR(255),
  phone VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100) DEFAULT 'India',
  organization_name TEXT,
  designation VARCHAR(255),
  annual_turnover VARCHAR(50),
  
  -- Computed fields for search
  full_text_search TSVECTOR,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- Full text search index
CREATE INDEX idx_members_fts ON community_members USING GIN(full_text_search);

-- Regular indexes
CREATE INDEX idx_members_city ON community_members(city);
CREATE INDEX idx_members_turnover ON community_members(annual_turnover);
CREATE INDEX idx_members_year ON community_members(year_of_graduation);
CREATE INDEX idx_members_email ON community_members(email);
```

---

### Table: `member_embeddings`

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE member_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES community_members(id) ON DELETE CASCADE,
  
  -- Embeddings for different fields
  profile_embedding VECTOR(1536),  -- Full profile embedding
  skills_embedding VECTOR(1536),   -- Working knowledge only
  
  -- Metadata
  embedding_model VARCHAR(100) DEFAULT 'text-embedding-ada-002',
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(member_id)
);

-- Vector similarity search indexes
CREATE INDEX idx_embeddings_profile ON member_embeddings 
  USING ivfflat (profile_embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX idx_embeddings_skills ON member_embeddings 
  USING ivfflat (skills_embedding vector_cosine_ops)
  WITH (lists = 100);
```

---

### Table: `search_queries` (Analytics)

```sql
CREATE TABLE search_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255),
  conversation_id VARCHAR(255),
  query_text TEXT NOT NULL,
  query_type VARCHAR(50), -- 'skill', 'service', 'location', 'multi'
  results_count INTEGER,
  response_time_ms INTEGER,
  success BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_queries_user ON search_queries(user_id);
CREATE INDEX idx_queries_created ON search_queries(created_at);
```

---

### Table: `search_cache`

```sql
CREATE TABLE search_cache (
  query_hash VARCHAR(64) PRIMARY KEY,
  query_text TEXT NOT NULL,
  response JSONB NOT NULL,
  hit_count INTEGER DEFAULT 1,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  last_accessed TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_cache_expires ON search_cache(expires_at);
```

---

## Natural Language Processing Strategy

### Intent Classification

**Using Llama 3.1 8B to classify user intent**

```typescript
// Prompt template for intent detection
const INTENT_DETECTION_PROMPT = `
You are an expert at understanding search queries for a business community directory.

Analyze the following user query and extract:
1. Primary intent (skill, service, location, person, multi-criteria)
2. Key entities (skills, locations, names, industries)
3. Filters (turnover, year, degree, etc.)

User Query: "{query}"

Respond in JSON format:
{
  "intent": "skill|service|location|person|multi-criteria",
  "entities": {
    "skills": [],
    "services": [],
    "locations": [],
    "names": [],
    "industries": [],
    "degrees": [],
    "turnoverRange": null
  },
  "confidence": 0.95
}
`;
```

### Entity Extraction Examples

| Query | Intent | Entities |
|-------|--------|----------|
| "Find IT consultants in Chennai" | multi-criteria | skills: ["IT consulting"], locations: ["Chennai"] |
| "Who provides waterproofing services?" | service | services: ["waterproofing"] |
| "Show me manufacturing businesses" | service | industries: ["manufacturing"] |
| "B.E Mechanical graduates" | skill | degrees: ["B.E"], branches: ["Mechanical"] |

---

### Hybrid Search Algorithm

```typescript
function hybridSearch(query, filters) {
  // 1. Generate embedding for query
  const queryEmbedding = await generateEmbedding(query);
  
  // 2. Vector similarity search
  const vectorResults = await vectorSearch(queryEmbedding, limit: 50);
  
  // 3. Keyword/Filter search
  const keywordResults = await keywordSearch(filters, limit: 50);
  
  // 4. Combine and re-rank
  const combined = mergeResults(vectorResults, keywordResults);
  
  // 5. Apply relevance scoring
  const scored = scoreResults(combined, query, filters);
  
  // 6. Return top N
  return scored.slice(0, limit);
}
```

**Relevance Scoring Formula**:
```
relevance_score = 
  (0.5 × vector_similarity) + 
  (0.3 × keyword_match_score) + 
  (0.1 × profile_completeness) + 
  (0.1 × recency_factor)
```

---

## Example Queries & Responses

### Example 1: Skill-Based Search

**User Query**: "Who knows about IT consulting?"

**API Call**:
```json
POST /api/search/query
{
  "message": "Who knows about IT consulting?"
}
```

**Bot Response**:
```
I found 4 members with IT consulting expertise:

1. **Udhayakumar Ulaganathan** - Lead Consultant at Thoughtworks Technologies
   📍 Chennai | 📞 +91 99435 49835
   🎓 MCA (2009) | 💼 Service

2. **Dhandapani Ammasai** - Independent Consultant
   📍 Consultant | 📞 +91 95660 82226
   🎓 MCA (1993) | 💼 IT Consulting, Advisory

3. **Venkatagiri Nagarajan** - IT Consulting
   📍 Jains Inseli Park | 📞 +91 95000 12291
   🎓 B.E SW Mechanical (2002)

4. **S Sivakumar** - CEO at USAM Technology Solutions
   📍 IT infrastructure solutions provider
   📞 +91 93839 99901 | 💰 Above 10 Crores

Would you like more details about any of these members?
```

---

### Example 2: Location-Based Search

**User Query**: "Show me businesses in Madurai"

**Bot Response**:
```
I found 1 business in Madurai:

**Thirunavukarasu Chellappa** - Founder & CEO
🏢 AgamWorks Tech Solutions Private Limited
📍 Madurai, Tamil Nadu
💼 Software solutions and Industry automation
📞 +91 87544 39288
📧 thirunavu.c@gmail.com
🎓 MCA (2009)
💰 Less than 2 Crores

Need help connecting with them?
```

---

### Example 3: Service-Based Search

**User Query**: "I need someone for waterproofing services"

**Bot Response**:
```
Perfect! I found 2 waterproofing specialists:

1. **Natarajan Subbramaniam** - Specification Engineer
   🏢 Alchimica India Pvt Ltd
   📍 Chennai | 💰 Above 10 Crores
   📞 +91 73584 58859
   🎓 B.E Civil (2024)

2. **Mrs. Fatima Mary** - Specification Engineer
   🏢 Alchimica India Pvt Ltd
   📍 Sivakasi | 💰 Above 10 Crores
   📞 +91 81100 73877
   🎓 M.E Civil (2015)

Both work for a large construction waterproofing company. Would you like their email addresses?
```

---

### Example 4: Multi-Criteria Search

**User Query**: "Find manufacturing businesses in Chennai with turnover above 5 crores"

**Bot Response**:
```
I found 3 manufacturing businesses matching your criteria:

1. **Prabhuram Shanmugam** - MEFCO Engineers Pvt Ltd
   💼 Stainless steel & mild steel fabrication
   💰 5 to 10 Crores | 📍 Chennai
   📞 +91 98410 12699

2. **V S Karunakaran** - Integral Component Manufacturers
   💼 Auto components
   💰 Above 10 Crores | 📍 Chennai
   📞 +91 98404 45558

3. **Suresh K.G** - Autoprint Machinery
   💼 Machinery for print and packaging industry
   💰 Above 10 Crores | 📍 Chennai
   📞 +91 98430 16961

Would you like to filter by specific industry?
```

---

## Testing Strategy

### Unit Tests

```typescript
describe('Search API', () => {
  test('should find members by skill', async () => {
    const response = await request(app)
      .post('/api/search/query')
      .send({ message: 'IT consulting' });
    
    expect(response.status).toBe(200);
    expect(response.body.members.length).toBeGreaterThan(0);
  });
  
  test('should handle location queries', async () => {
    const response = await request(app)
      .post('/api/search/query')
      .send({ message: 'businesses in Chennai' });
    
    expect(response.body.members[0].city).toBe('Chennai');
  });
});
```

### Integration Tests

```typescript
describe('End-to-End Search', () => {
  test('should complete full search workflow', async () => {
    // 1. Parse query
    const parsed = await parseQuery('IT consultant in Chennai');
    
    // 2. Generate embeddings
    const embedding = await generateEmbedding(parsed);
    
    // 3. Search database
    const results = await searchMembers(embedding, parsed.filters);
    
    // 4. Generate response
    const response = await generateResponse(results, parsed);
    
    expect(response).toContain('Chennai');
  });
});
```

### Performance Tests

```typescript
describe('Performance', () => {
  test('should handle 100 concurrent searches', async () => {
    const queries = Array(100).fill('IT consulting');
    const start = Date.now();
    
    await Promise.all(
      queries.map(q => searchAPI(q))
    );
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(5000); // 5 seconds for 100 queries
  });
});
```

---

## Cost Estimation

### API Costs (Monthly for 10,000 queries)

| Service | Usage | Cost |
|---------|-------|------|
| **OpenAI Embeddings** | 10,000 queries × 100 tokens | $0.01 per 1M tokens = **$0.01** |
| **DeepInfra LLM** | 10,000 queries × 500 tokens (avg) | $0.055 per 1M = **$0.28** |
| **DeepInfra LLM (Output)** | 10,000 responses × 200 tokens | $0.055 per 1M = **$0.11** |
| **Supabase** | 500MB storage + queries | **Free tier** (or $25/mo Pro) |
| **WhatsApp Business** | 10,000 messages | Free tier: 1000, then $0.005 = **$45** |
| **Total** | | **~$45.40/month** or **~$70/month** with Supabase Pro |

### Scaling Estimates

| Users | Queries/Month | Estimated Cost |
|-------|---------------|----------------|
| 50 members | 1,000 | **$5-10** |
| 100 members | 5,000 | **$25-35** |
| 500 members | 25,000 | **$120-150** |
| 1000 members | 50,000 | **$250-300** |

---

## Implementation Checklist

### Prerequisites
- [ ] Supabase account with PostgreSQL database
- [ ] OpenAI API key for embeddings
- [ ] DeepInfra API key (already configured)
- [ ] WhatsApp Business API access
- [ ] Node.js dependencies installed

### Phase 1: Foundation
- [ ] Create database schema
- [ ] Install pgvector extension
- [ ] Import CSV data
- [ ] Generate embeddings
- [ ] Create indexes

### Phase 2: Core Search
- [ ] Implement `/api/search/members` endpoint
- [ ] Add filtering logic
- [ ] Add pagination
- [ ] Write tests

### Phase 3: Semantic Search
- [ ] Integrate OpenAI embeddings
- [ ] Implement vector search
- [ ] Add hybrid search
- [ ] Optimize performance

### Phase 4: NLP
- [ ] Implement intent detection
- [ ] Add entity extraction
- [ ] Create query parser
- [ ] Test with sample queries

### Phase 5: Response Generation
- [ ] Design response templates
- [ ] Implement LLM response generation
- [ ] Format member data
- [ ] Handle edge cases

### Phase 6: Integration
- [ ] WhatsApp webhook setup
- [ ] Message formatting
- [ ] Conversation state
- [ ] Testing

### Phase 7: Polish
- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] Documentation
- [ ] Deployment

---

## Next Steps

1. **Review & Approve Plan** - Get stakeholder sign-off
2. **Set Up Development Environment** - Configure all services
3. **Start Phase 1** - Begin with data ingestion
4. **Weekly Demos** - Show progress every week
5. **Iterate Based on Feedback** - Refine search quality

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Search Accuracy | >85% | User satisfaction surveys |
| Response Time | <2 seconds | API monitoring |
| Coverage | 100% | All 48 members searchable |
| Uptime | >99% | Server monitoring |
| User Engagement | 50% monthly active | Usage analytics |

---

**Status**: ✅ Plan Complete - Ready for Review  
**Next Action**: Stakeholder approval to begin Phase 1
