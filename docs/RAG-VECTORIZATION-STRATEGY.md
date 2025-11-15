# RAG & Vectorization Strategy for Multi-Community Architecture

**Date**: November 15, 2025  
**Status**: PLANNING  
**Priority**: HIGH (Required for multi-tenant community isolation)

---

## 📋 Executive Summary

This document outlines a comprehensive strategy for implementing Retrieval Augmented Generation (RAG) with vectorization to enable:
1. **Community-based data isolation** (multi-tenancy)
2. **Enhanced semantic search** with context-aware retrieval
3. **Improved query understanding** through conversation history
4. **Better response accuracy** with relevant context injection

---

## 🎯 Business Requirements

### Current System Limitations
- ❌ Single community only (all 51 members in one pool)
- ❌ No community-based access control
- ❌ Members can't belong to multiple communities
- ❌ No cross-community search capability
- ❌ No community-specific rules/preferences
- ❌ Conversations lack context continuity

### Target Multi-Community Architecture
- ✅ Support 100+ communities per deployment
- ✅ Members isolated by community_id
- ✅ Cross-community search for members in multiple communities
- ✅ Community-specific search preferences
- ✅ Conversation history for better follow-up queries
- ✅ Dynamic community onboarding (self-service)

---

## 🗂️ Data Entities to Vectorize

### 1. Member Profiles (Already Implemented ✅)

**Current Implementation**:
```sql
CREATE TABLE member_embeddings (
    id UUID PRIMARY KEY,
    member_id UUID REFERENCES community_members(id),
    profile_embedding VECTOR(768),  -- Full profile text
    skills_embedding VECTOR(768),   -- Skills/expertise only
    embedding_model VARCHAR(100) DEFAULT 'BAAI/bge-base-en-v1.5',
    created_at TIMESTAMP
);
```

**Enhancement Required**: Add `community_id`
```sql
ALTER TABLE member_embeddings 
ADD COLUMN community_id UUID REFERENCES communities(id);

CREATE INDEX idx_embeddings_community 
ON member_embeddings(community_id);
```

**Text Representation** (what gets embedded):
```typescript
// Profile embedding (768-dim vector)
const profileText = `
${member.name}
${member.degree} in ${member.branch} (${member.yearOfGraduation})
Works as ${member.designation} at ${member.organization}
Located in ${member.city}
Skills: ${member.skills}
Products/Services: ${member.productsServices}
Business: ${member.annualTurnover}
`;

// Skills embedding (768-dim vector)
const skillsText = member.skills || '';
```

**Usage**:
- Primary search mechanism
- Find similar members by profile
- Skills-based matching

---

### 2. Community Context (NEW - HIGH PRIORITY)

**Purpose**: Store community-specific information for context-aware responses

**Schema**:
```sql
CREATE TABLE communities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    
    -- Contact
    admin_phone VARCHAR(20),
    admin_email VARCHAR(255),
    whatsapp_number VARCHAR(20),
    
    -- Subscription
    subscription_plan VARCHAR(50) DEFAULT 'free',
    subscription_status VARCHAR(20) DEFAULT 'active',
    member_limit INTEGER DEFAULT 100,
    search_limit INTEGER DEFAULT 1000,
    
    -- Settings
    search_preferences JSONB DEFAULT '{}',
    custom_rules TEXT,
    welcome_message TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE community_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID REFERENCES communities(id),
    
    -- Multiple embeddings for different aspects
    description_embedding VECTOR(768),
    rules_embedding VECTOR(768),
    preferences_embedding VECTOR(768),
    
    -- Context documents
    context_text TEXT,
    
    embedding_model VARCHAR(100) DEFAULT 'BAAI/bge-base-en-v1.5',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_community_embeddings_community 
ON community_embeddings(community_id);
```

**Text Representation**:
```typescript
// Description embedding
const descriptionText = `
Community: ${community.name}
Description: ${community.description}
Type: ${community.type} (e.g., Alumni, Professional, Apartment)
Focus areas: ${community.focusAreas}
`;

// Rules embedding
const rulesText = `
${community.customRules}
Search guidelines: ${community.searchPreferences.guidelines}
Restricted fields: ${community.searchPreferences.restrictedFields}
`;
```

**Usage**:
1. **Context injection**: Add community info to LLM prompts
2. **Rule enforcement**: Check if query violates community rules
3. **Personalized responses**: Tailor responses to community culture
4. **Onboarding**: Generate community-specific welcome messages

---

### 3. Conversation History (NEW - MEDIUM PRIORITY)

**Purpose**: Enable context-aware follow-up queries and multi-turn conversations

**Schema**:
```sql
CREATE TABLE conversation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(255) NOT NULL,
    user_phone VARCHAR(20) NOT NULL,
    community_id UUID REFERENCES communities(id),
    
    -- Message details
    message_type VARCHAR(20), -- 'user_query' | 'bot_response'
    message_text TEXT NOT NULL,
    intent VARCHAR(50),
    
    -- Context
    extracted_entities JSONB,
    search_results JSONB,
    
    -- Metadata
    timestamp TIMESTAMP DEFAULT NOW(),
    sequence_number INTEGER,
    
    FOREIGN KEY (community_id) REFERENCES communities(id)
);

CREATE TABLE conversation_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversation_history(id),
    
    -- Query embedding for similarity search
    query_embedding VECTOR(768),
    
    -- Aggregated context embedding (sliding window)
    context_embedding VECTOR(768),
    
    embedding_model VARCHAR(100) DEFAULT 'BAAI/bge-base-en-v1.5',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_conversation_embeddings_session 
ON conversation_history(session_id);

CREATE INDEX idx_conversation_embeddings_user 
ON conversation_history(user_phone);

CREATE INDEX idx_conversation_embeddings_community 
ON conversation_history(community_id);
```

**Text Representation**:
```typescript
// Single query embedding
const queryText = `
Query: ${message.text}
Intent: ${message.intent}
Entities: ${JSON.stringify(message.entities)}
`;

// Context embedding (last 5 exchanges)
const contextText = conversationHistory
    .slice(-5)
    .map(msg => `${msg.role}: ${msg.text}`)
    .join('\n');
```

**Usage**:
1. **Follow-up resolution**: "Show me more" → retrieves previous query context
2. **Entity carryover**: "What about in Mumbai?" → carries over previous filters
3. **Conversation summarization**: Generate summary for long conversations
4. **Similar query suggestions**: "Users also asked..."

---

### 4. Search Queries Analytics (NEW - LOW PRIORITY)

**Purpose**: Learn from query patterns to improve search quality

**Schema**:
```sql
CREATE TABLE query_analytics_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_text TEXT NOT NULL,
    query_embedding VECTOR(768),
    
    -- Aggregated metadata
    community_id UUID REFERENCES communities(id),
    times_asked INTEGER DEFAULT 1,
    avg_confidence FLOAT,
    avg_result_count INTEGER,
    success_rate FLOAT, -- % of queries with >0 results
    
    -- Clusters
    cluster_id INTEGER,
    similar_queries TEXT[], -- Array of similar query texts
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_query_analytics_community 
ON query_analytics_embeddings(community_id);

CREATE INDEX idx_query_analytics_cluster 
ON query_analytics_embeddings(cluster_id);

-- Vector similarity index
CREATE INDEX idx_query_analytics_embedding 
ON query_analytics_embeddings 
USING ivfflat (query_embedding vector_cosine_ops) 
WITH (lists = 100);
```

**Usage**:
1. **Query clustering**: Group similar queries → identify common patterns
2. **Zero-result detection**: Find queries with no matches → improve data/algo
3. **Autocomplete**: Suggest popular queries as user types
4. **Query expansion**: "AI experts" → also search "Machine Learning", "Artificial Intelligence"

---

### 5. Community Documents/FAQs (NEW - LOW PRIORITY)

**Purpose**: Store community-specific documents for RAG-based Q&A

**Schema**:
```sql
CREATE TABLE community_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID REFERENCES communities(id),
    
    -- Document metadata
    title VARCHAR(255) NOT NULL,
    document_type VARCHAR(50), -- 'faq' | 'policy' | 'announcement' | 'guide'
    content TEXT NOT NULL,
    
    -- Chunking for RAG (split long docs)
    chunk_index INTEGER DEFAULT 0,
    total_chunks INTEGER DEFAULT 1,
    
    -- Tags for filtering
    tags TEXT[],
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE document_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES community_documents(id),
    community_id UUID REFERENCES communities(id),
    
    -- Chunk embedding
    chunk_embedding VECTOR(768),
    chunk_text TEXT,
    
    embedding_model VARCHAR(100) DEFAULT 'BAAI/bge-base-en-v1.5',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_document_embeddings_community 
ON document_embeddings(community_id);

CREATE INDEX idx_document_embeddings_doc 
ON document_embeddings(document_id);

-- Vector similarity index
CREATE INDEX idx_document_embeddings_vector 
ON document_embeddings 
USING ivfflat (chunk_embedding vector_cosine_ops) 
WITH (lists = 100);
```

**Text Representation**:
```typescript
// Chunk size: ~500 tokens (~375 words)
// Overlap: 50 tokens to maintain context continuity

function chunkDocument(content: string): string[] {
    const maxChunkSize = 375; // words
    const overlap = 50; // words
    
    const words = content.split(/\s+/);
    const chunks: string[] = [];
    
    for (let i = 0; i < words.length; i += maxChunkSize - overlap) {
        const chunk = words.slice(i, i + maxChunkSize).join(' ');
        chunks.push(chunk);
    }
    
    return chunks;
}
```

**Usage**:
1. **Q&A**: "What's the visitor policy?" → RAG retrieves relevant doc chunks
2. **Announcements**: "Any upcoming events?" → Search event docs
3. **Onboarding**: New members ask questions → auto-answer from FAQ

---

## 🔄 RAG Implementation Architecture

### Flow 1: Member Search with Community Isolation

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. User Query (WhatsApp/API)                                    │
│    "Find AI experts in Chennai"                                 │
│    + user_phone: +919876543210                                  │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. Resolve Community Context                                    │
│    - Lookup: community_members WHERE phone = user_phone         │
│    - Get: community_id = 'abc-123'                              │
│    - Retrieve: community_embeddings for context                 │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. Check Conversation History (Redis)                           │
│    - session_id = 'whatsapp:+919876543210'                      │
│    - Retrieve last 5 exchanges                                  │
│    - Generate context_embedding from history                    │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. Hybrid Entity Extraction (Current System)                    │
│    - Regex patterns: city="Chennai", skills=["AI"]             │
│    - LLM fallback if regex fails                                │
│    - Output: ExtractedEntities                                  │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. Generate Query Embedding                                     │
│    - DeepInfra BAAI/bge-base-en-v1.5                            │
│    - Input: query + context from history                        │
│    - Output: query_embedding (768-dim)                          │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. Vector Search with Community Filter                          │
│                                                                  │
│    SELECT m.*, e.profile_embedding,                             │
│           (e.profile_embedding <=> $1) AS similarity            │
│    FROM community_members m                                     │
│    JOIN member_embeddings e ON m.id = e.member_id              │
│    WHERE m.community_id = $2                -- COMMUNITY FILTER │
│      AND m.city ILIKE $3                    -- Entity filter    │
│      AND m.is_active = TRUE                                     │
│    ORDER BY similarity ASC                                      │
│    LIMIT 10;                                                    │
│                                                                  │
│    $1 = query_embedding                                         │
│    $2 = user's community_id                                     │
│    $3 = '%Chennai%'                                             │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────────────┐
│ 7. Inject Community Context into LLM Response                   │
│                                                                  │
│    System Prompt:                                               │
│    "You are a search assistant for ${community.name}.           │
│     Community guidelines: ${community.customRules}              │
│     Response style: ${community.preferences.responseStyle}      │
│                                                                  │
│     Conversation history:                                       │
│     ${conversationHistory}"                                     │
│                                                                  │
│    User Query: "Find AI experts in Chennai"                     │
│                                                                  │
│    Retrieved Members: [...]                                     │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────────────┐
│ 8. Format Response with Community Branding                      │
│    - Add community-specific greeting                            │
│    - Apply formatting preferences                               │
│    - Include community disclaimers                              │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────────────┐
│ 9. Store Conversation + Embedding                               │
│    - conversation_history table                                 │
│    - conversation_embeddings table                              │
│    - Update Redis session                                       │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ↓
                  Return Response
```

---

### Flow 2: Cross-Community Search (Optional Feature)

**Use Case**: User belongs to multiple communities (e.g., both alumni + apartment)

```sql
-- Get user's communities
SELECT community_id 
FROM community_members 
WHERE phone = '+919876543210';

-- Returns: ['alumni-abc', 'apartment-xyz']

-- Search across both communities
SELECT m.*, e.profile_embedding,
       (e.profile_embedding <=> $1) AS similarity,
       c.name AS community_name
FROM community_members m
JOIN member_embeddings e ON m.id = e.member_id
JOIN communities c ON m.community_id = c.id
WHERE m.community_id IN ('alumni-abc', 'apartment-xyz')
  AND m.city ILIKE '%Chennai%'
  AND m.is_active = TRUE
ORDER BY similarity ASC
LIMIT 20;

-- Group results by community in response
```

---

### Flow 3: Document-Based Q&A (RAG for FAQs)

```
User Query: "What's the visitor parking policy?"
            + community_id = 'apartment-xyz'
                        │
                        ↓
Generate query_embedding (768-dim)
                        │
                        ↓
Vector search in document_embeddings:
    WHERE community_id = 'apartment-xyz'
    ORDER BY chunk_embedding <=> query_embedding
    LIMIT 5
                        │
                        ↓
Retrieved chunks:
    1. "Visitor parking is available in Zone B..."
    2. "Visitors must register at security gate..."
    3. "Maximum parking duration is 4 hours..."
                        │
                        ↓
Inject into LLM prompt:
    System: "Answer using ONLY this context: ${chunks}"
    User: "What's the visitor parking policy?"
                        │
                        ↓
LLM Response:
    "Based on your community's policy, visitor parking 
     is available in Zone B. Visitors must register at 
     the security gate, and the maximum parking 
     duration is 4 hours."
```

---

## 🛠️ Implementation Plan

### Phase 1: Multi-Community Foundation (Week 1-2, 40 hours)

**Task 1.1: Database Schema Updates** (8 hours)
```sql
-- Create communities table
-- Create community_embeddings table
-- Add community_id to member_embeddings
-- Add community_id to community_members
-- Create indexes
-- Migrate existing data (create default community)
```

**Task 1.2: Community Service** (8 hours)
```typescript
// src/services/communityService.ts
- createCommunity()
- getCommunity()
- updateCommunity()
- deleteCommunity()
- generateCommunityEmbeddings()
- getCommunityContext()
```

**Task 1.3: Update Search Service** (8 hours)
```typescript
// src/services/semanticSearch.ts
- Add community_id filter to all queries
- Update vector search SQL
- Add community context retrieval
- Update response formatting
```

**Task 1.4: Community-Aware Auth** (8 hours)
```typescript
// src/middlewares/authorize.ts
- Resolve community_id from phone number
- Add community context to req object
- Validate user belongs to community
- Check cross-community permissions
```

**Task 1.5: Testing & Migration** (8 hours)
```bash
# Migration script
npm run db:migrate:communities

# Test multi-community isolation
npm run test:communities
```

**Deliverables**:
- ✅ communities table with embeddings
- ✅ All searches filtered by community_id
- ✅ Community context in LLM prompts
- ✅ Migration script for existing data

---

### Phase 2: Conversation History RAG (Week 3, 20 hours)

**Task 2.1: Conversation Schema** (4 hours)
```sql
CREATE TABLE conversation_history
CREATE TABLE conversation_embeddings
```

**Task 2.2: Conversation Service** (8 hours)
```typescript
// src/services/conversationService.ts (replace existing)
- storeMessage()
- getConversationHistory()
- generateConversationEmbedding()
- resolveFollowUpContext()
```

**Task 2.3: Integration** (8 hours)
```typescript
// src/services/nlSearchService.ts
- Retrieve conversation history before query
- Inject context into LLM prompt
- Store query + response in history
```

**Deliverables**:
- ✅ Conversation history stored in DB
- ✅ Follow-up queries resolve context
- ✅ Context embeddings for similarity

---

### Phase 3: Document RAG (Week 4, 20 hours)

**Task 3.1: Document Schema** (4 hours)
```sql
CREATE TABLE community_documents
CREATE TABLE document_embeddings
```

**Task 3.2: Document Service** (8 hours)
```typescript
// src/services/documentService.ts
- uploadDocument()
- chunkDocument()
- generateDocumentEmbeddings()
- searchDocuments()
```

**Task 3.3: Q&A Endpoint** (8 hours)
```typescript
// src/controllers/qaController.ts
POST /api/qa/ask
- Detect question intent
- Search document embeddings
- RAG-based response
```

**Deliverables**:
- ✅ Document upload + chunking
- ✅ FAQ answering endpoint
- ✅ RAG-based Q&A

---

### Phase 4: Query Analytics (Week 5, 16 hours)

**Task 4.1: Analytics Schema** (4 hours)
```sql
CREATE TABLE query_analytics_embeddings
```

**Task 4.2: Analytics Service** (8 hours)
```typescript
// src/services/queryAnalytics.ts
- trackQuery()
- clusterQueries()
- generateInsights()
```

**Task 4.3: Dashboard Integration** (4 hours)
```typescript
GET /api/analytics/query-clusters
GET /api/analytics/zero-results
GET /api/analytics/trending
```

**Deliverables**:
- ✅ Query clustering
- ✅ Zero-result detection
- ✅ Analytics dashboard

---

## 💾 Storage & Performance

### Vector Index Strategy

**Current**: IVFFlat (Inverted File Flat)
```sql
CREATE INDEX idx_embeddings_profile 
ON member_embeddings 
USING ivfflat (profile_embedding vector_cosine_ops) 
WITH (lists = 100);
```

**Recommendation**: Keep IVFFlat for now
- Works well for <100K vectors
- Low memory overhead
- Good for our scale (50-5000 members per community)

**Future**: Consider HNSW for >100K vectors
```sql
-- When scale exceeds 100K vectors
CREATE INDEX idx_embeddings_profile_hnsw 
ON member_embeddings 
USING hnsw (profile_embedding vector_cosine_ops) 
WITH (m = 16, ef_construction = 64);
```

---

### Embedding Generation Cost

**Model**: BAAI/bge-base-en-v1.5 (DeepInfra)
**Cost**: $0.0001 per 1K tokens

**Per Member**:
- Profile text: ~200 tokens = $0.00002
- Skills text: ~50 tokens = $0.000005
- **Total per member**: $0.000025

**Per Community** (100 members):
- Members: 100 × $0.000025 = $0.0025
- Community context: ~500 tokens = $0.00005
- **Total per community**: $0.003

**Per Conversation Turn**:
- Query embedding: ~20 tokens = $0.000002
- Context embedding: ~200 tokens = $0.00002
- **Total per query**: $0.000022

**Monthly Cost** (100 communities, 1000 queries/day):
- Initial embeddings: 100 × $0.003 = $0.30 (one-time)
- Query embeddings: 1000 × $0.000022 × 30 = $0.66
- **Total monthly**: ~$1

**Conclusion**: Extremely affordable! 🎉

---

### Database Storage

**Per Community** (100 members):
- member_embeddings: 100 rows × 2 vectors × 768 × 4 bytes = 614 KB
- community_embeddings: 3 vectors × 768 × 4 bytes = 9 KB
- conversation_embeddings: ~100 queries/month × 768 × 4 bytes = 307 KB
- **Total per community**: ~1 MB/month

**100 Communities**:
- Total vectors: ~100 MB
- With overhead: ~200 MB
- PostgreSQL: <1 GB total

**Supabase Free Tier**: 500 MB (sufficient for 200+ communities!)

---

## 🎨 Advanced RAG Techniques

### 1. Hybrid Search (Already Implemented ✅)

```typescript
// Combine vector + keyword search
const semanticScore = vectorSimilarity(queryEmbedding, memberEmbedding);
const keywordScore = fullTextSearch(query, memberProfile);

const finalScore = (SEMANTIC_WEIGHT * semanticScore) + 
                   (KEYWORD_WEIGHT * keywordScore);

// Current: 70% semantic, 30% keyword
```

---

### 2. Contextual Compression (NEW)

**Problem**: Retrieved context may contain irrelevant information

**Solution**: Use LLM to compress/filter retrieved documents

```typescript
// Step 1: Retrieve top 10 documents
const retrievedDocs = await vectorSearch(query, limit: 10);

// Step 2: Compress using LLM
const compressedContext = await llmCompress(retrievedDocs, query);
// LLM extracts only relevant sentences

// Step 3: Use compressed context in final prompt
const response = await llmRespond(query, compressedContext);
```

**Implementation**:
```typescript
async function compressContext(
    docs: Document[],
    query: string
): Promise<string> {
    const prompt = `
Given this query: "${query}"

And these documents:
${docs.map((d, i) => `[${i}] ${d.text}`).join('\n')}

Extract ONLY the sentences directly relevant to answering the query.
Return as a JSON array of strings.
`;

    const response = await callLLM(prompt);
    const relevantSentences = JSON.parse(response);
    return relevantSentences.join('\n');
}
```

---

### 3. Query Expansion (NEW)

**Problem**: User query may not match document vocabulary

**Solution**: Expand query with synonyms/related terms

```typescript
// Step 1: Expand query
const expandedQueries = await expandQuery("AI experts");
// Returns: ["AI experts", "Machine Learning specialists", 
//           "Artificial Intelligence professionals", 
//           "Data Scientists with AI experience"]

// Step 2: Generate embeddings for all expansions
const embeddings = await Promise.all(
    expandedQueries.map(q => generateEmbedding(q))
);

// Step 3: Average embeddings for comprehensive search
const avgEmbedding = averageVectors(embeddings);

// Step 4: Search with averaged embedding
const results = await vectorSearch(avgEmbedding);
```

---

### 4. Re-ranking (NEW)

**Problem**: Initial vector search may not capture nuanced relevance

**Solution**: Two-stage retrieval → re-ranking

```typescript
// Stage 1: Fast vector search (retrieve 50)
const candidates = await vectorSearch(query, limit: 50);

// Stage 2: Re-rank with cross-encoder
const rerankedResults = await rerank(query, candidates);
// Cross-encoder: more accurate but slower
// Only run on top 50 candidates

// Return top 10 after re-ranking
return rerankedResults.slice(0, 10);
```

**Re-ranking Models**:
- `cross-encoder/ms-marco-MiniLM-L-6-v2` (fast)
- `BAAI/bge-reranker-large` (accurate)

---

### 5. Metadata Filtering (Current + Enhancement)

**Current**: Filter by city, skills, degree
**Enhancement**: Filter by community tags, preferences

```typescript
// Enhanced filtering
const results = await vectorSearch(query, {
    communityId: 'abc-123',
    filters: {
        city: 'Chennai',
        skills: ['AI', 'ML'],
        tags: ['active', 'verified'],
        minConfidence: 0.7,
        excludeFields: ['phone'], // Privacy
        customRules: community.searchPreferences
    }
});
```

---

## 📊 Evaluation Metrics

### RAG Quality Metrics

**1. Retrieval Metrics**:
```typescript
// Precision@K: % of retrieved docs that are relevant
const precisionAt10 = relevantDocs / 10;

// Recall@K: % of relevant docs that were retrieved
const recallAt10 = retrievedRelevantDocs / totalRelevantDocs;

// MRR (Mean Reciprocal Rank): Position of first relevant doc
const mrr = 1 / positionOfFirstRelevant;
```

**2. Response Metrics**:
```typescript
// Faithfulness: Response grounded in retrieved context?
const faithfulness = llmJudge(response, retrievedContext);

// Relevance: Response answers the query?
const relevance = llmJudge(response, query);

// Coherence: Response is logically consistent?
const coherence = llmJudge(response);
```

**3. Community Isolation**:
```typescript
// Test: User from Community A should NEVER see 
// members from Community B

const crossContamination = await testCrossContaminationRate();
// Target: 0% cross-contamination
```

---

## 🚀 Quick Start (Minimal Implementation)

For immediate multi-community support with minimal changes:

### Step 1: Add Community Table (2 hours)
```sql
CREATE TABLE communities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- Default community for existing members
INSERT INTO communities (id, name, slug) 
VALUES (gen_random_uuid(), 'Default Community', 'default');

-- Add community_id to members
ALTER TABLE community_members 
ADD COLUMN community_id UUID REFERENCES communities(id);

-- Migrate existing members
UPDATE community_members 
SET community_id = (SELECT id FROM communities WHERE slug = 'default');

-- Add index
CREATE INDEX idx_members_community ON community_members(community_id);
```

### Step 2: Update Search Query (1 hour)
```typescript
// src/services/semanticSearch.ts

// Get user's community
const userCommunity = await query(
    'SELECT community_id FROM community_members WHERE phone = $1',
    [userPhone]
);

// Add community filter to search
const results = await query(`
    SELECT m.*, e.profile_embedding,
           (e.profile_embedding <=> $1) AS similarity
    FROM community_members m
    JOIN member_embeddings e ON m.id = e.member_id
    WHERE m.community_id = $2  -- NEW: Community filter
      AND m.city ILIKE $3
      AND m.is_active = TRUE
    ORDER BY similarity ASC
    LIMIT 10
`, [embedding, userCommunity.rows[0].community_id, '%Chennai%']);
```

### Step 3: Test Isolation (1 hour)
```typescript
// Test: Create 2 communities, ensure search isolation
npm run test:community-isolation
```

**Total Time**: 4 hours for basic multi-community support! ✅

---

## 📝 Summary

### Data to Vectorize (Priority Order)

1. **✅ Member Profiles** (Already done)
   - profile_embedding, skills_embedding
   - 768-dim vectors

2. **🔴 Community Context** (HIGH - Required for isolation)
   - description_embedding, rules_embedding
   - Enable community-specific responses

3. **🟡 Conversation History** (MEDIUM - Better UX)
   - query_embedding, context_embedding
   - Follow-up query resolution

4. **🟡 Search Analytics** (MEDIUM - Optimization)
   - query_embedding with clustering
   - Learn from patterns

5. **🟢 Documents/FAQs** (LOW - Nice to have)
   - chunk_embedding for Q&A
   - RAG-based FAQ answering

### RAG Techniques to Implement

1. **✅ Hybrid Search** (Already done)
2. **🔴 Community Filtering** (Critical for multi-tenancy)
3. **🟡 Conversation Context** (Better follow-ups)
4. **🟡 Query Expansion** (Better recall)
5. **🟢 Re-ranking** (Better precision)
6. **🟢 Contextual Compression** (Cleaner responses)

### Immediate Next Steps

**Sprint 1** (This week):
1. Add `communities` table
2. Add `community_id` to `community_members`
3. Update search queries with community filter
4. Test isolation

**Sprint 2** (Next week):
1. Create `community_embeddings` table
2. Generate community context embeddings
3. Inject community context into LLM prompts
4. Community-specific response formatting

**Sprint 3** (Week 3):
1. Implement conversation history storage
2. Add conversation embeddings
3. Resolve follow-up queries with context

---

**Questions? Discuss in Slack #rag-implementation**

**Author**: AI Development Team  
**Reviewed**: Pending  
**Last Updated**: November 15, 2025
