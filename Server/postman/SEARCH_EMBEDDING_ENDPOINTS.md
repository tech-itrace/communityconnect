# Search & Embedding Endpoints - Lean Schema

## Overview

This document describes the search and embedding functionality using the lean schema with JSONB profile data.

## Key Features

- **Semantic Search**: Vector similarity search using embeddings
- **Keyword Search**: Full-text search using PostgreSQL tsvector
- **Hybrid Search**: Combines semantic and keyword search with weighted scoring
- **JSONB Profile Data**: All member profiles stored in flexible JSONB format
- **Auto-Indexing**: Automatic search vector generation via triggers
- **Multi-Community Support**: Scoped searches within specific communities

---

## Architecture

### Database Tables

#### `member_embeddings`
Stores vector embeddings for semantic search.

```sql
CREATE TABLE member_embeddings (
    membership_id UUID PRIMARY KEY REFERENCES community_memberships(id),
    profile_embedding VECTOR(768),      -- Profile-based embedding
    skills_embedding VECTOR(768),       -- Skills-focused embedding
    contextual_embedding VECTOR(768),   -- Context-aware embedding
    profile_text TEXT,                  -- Original profile text
    skills_text TEXT,                   -- Skills text
    contextual_text TEXT,               -- Contextual text
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `member_search_index`
Stores full-text search vectors (automatically populated via trigger).

```sql
CREATE TABLE member_search_index (
    membership_id UUID PRIMARY KEY REFERENCES community_memberships(id),
    community_id UUID NOT NULL REFERENCES communities(id),
    search_vector TSVECTOR NOT NULL,   -- Full-text search vector
    indexed_fields JSONB DEFAULT '{}', -- Metadata
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Embedding Generation

Embeddings are generated from JSONB `profile_data` in `community_memberships`:

**For Alumni:**
```json
{
  "college": "IIT Madras",
  "graduation_year": 2020,
  "degree": "B.Tech",
  "department": "Computer Science",
  "city": "Bangalore",
  "current_organization": "Google",
  "designation": "Software Engineer",
  "skills": ["Python", "Machine Learning", "AI"]
}
```

**For Entrepreneurs:**
```json
{
  "company": "Tech Startup Inc",
  "industry": "Software",
  "company_stage": "Series A",
  "city": "Mumbai",
  "services_offered": ["Web Development", "Mobile Apps"],
  "expertise": ["Node.js", "React", "AWS"]
}
```

**For Residents:**
```json
{
  "apartment_number": "301",
  "building": "Tower A",
  "profession": "Software Engineer",
  "organization": "Tech Corp",
  "city": "Bangalore",
  "skills": ["Python", "JavaScript"]
}
```

---

## Search API Endpoints

### 1. Natural Language Search

**POST** `/api/search/nl`

Processes natural language queries and returns conversational responses.

**Request Body:**
```json
{
  "query": "Find Python developers in Bangalore",
  "communityId": "uuid-of-community",
  "maxResults": 10
}
```

**Response:**
```json
{
  "success": true,
  "understanding": {
    "intent": "find_member",
    "entities": {
      "skills": ["Python"],
      "location": "Bangalore"
    },
    "confidence": 0.85,
    "normalizedQuery": "find python developers bangalore"
  },
  "results": {
    "members": [
      {
        "id": "member-uuid",
        "name": "Alice Data Scientist",
        "email": "alice@test.com",
        "phone": "+919900001001",
        "city": "Bangalore",
        "profileData": {
          "degree": "M.Tech",
          "department": "Computer Science",
          "skills": ["Python", "Machine Learning"],
          "designation": "Senior Data Scientist"
        },
        "relevanceScore": 0.92,
        "matchedFields": ["skills", "city"]
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalResults": 5,
      "resultsPerPage": 10
    }
  },
  "response": {
    "conversational": "I found 5 Python developers in Bangalore. Here are the top results:",
    "suggestions": [
      "Search for Machine Learning experts",
      "Find developers in Chennai",
      "Browse all members"
    ]
  },
  "executionTime": 1250
}
```

---

### 2. Semantic Search

**GET** `/api/search/members`

**Query Parameters:**
- `query` (required): Search query
- `communityId` (optional): Filter by community
- `searchType` (optional): `semantic` | `keyword` | `hybrid` (default: `hybrid`)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 10, max: 50)
- `sortBy` (optional): `relevance` | `name` | `year` (default: `relevance`)
- `sortOrder` (optional): `asc` | `desc` (default: `desc`)
- `city` (optional): Filter by city
- `skills` (optional): Filter by skills (comma-separated)
- `yearOfGraduation` (optional): Filter by graduation year (comma-separated)

**Example:**
```
GET /api/search/members?query=AI+expert&communityId=<uuid>&city=Bangalore&searchType=semantic
```

**Response:**
```json
{
  "success": true,
  "members": [
    {
      "id": "member-uuid",
      "name": "David ML Engineer",
      "email": "david@test.com",
      "phone": "+919900001004",
      "city": "Bangalore",
      "profileData": {
        "degree": "PhD",
        "department": "Artificial Intelligence",
        "skills": ["Python", "Deep Learning", "PyTorch"],
        "designation": "ML Engineer"
      },
      "relevanceScore": 0.89,
      "semanticScore": 0.89,
      "matchedFields": ["skills", "department", "city"]
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "totalResults": 1
  }
}
```

---

## Embedding Generation

### Script: Generate Embeddings

**Command:**
```bash
npm run generate:embeddings:lean
```

**What it does:**
1. Fetches all active community memberships
2. Extracts profile data from JSONB
3. Builds searchable text from type-specific fields
4. Generates 768-dimensional embeddings using DeepInfra API
5. Stores embeddings in `member_embeddings` table
6. Creates HNSW indexes for fast vector similarity search

**Output:**
```
╔═══════════════════════════════════════════════════════════╗
║    Generate Embeddings - Lean Schema (JSONB Profiles)    ║
╚═══════════════════════════════════════════════════════════╝

🔍 Fetching members with JSONB profiles...
✅ Found 5 members to process

📊 Member types:
   - alumni: 4
   - entrepreneur: 1

📝 Sample profile data (first member):
   Name: Admin User
   Type: alumni
   Profile: {
     "city": "Bangalore",
     "degree": "B.Tech",
     "college": "Test College",
     "department": "Computer Science",
     "graduation_year": 2020
   }

🚀 Processing 5 members in batches of 10...

✅ Successfully processed: 5/5 members

🔧 Creating vector indexes...
✅ Vector indexes created

📊 Embedding Statistics:
   Total embeddings: 5
   With profile embedding: 5
   With skills embedding: 5

📐 Sample Embedding Dimensions:
   Admin User (alumni): profile=768d, skills=768d
   Alice Data Scientist (alumni): profile=768d, skills=768d
```

---

## Search Workflow

### 1. Semantic Search Flow

```
User Query
    ↓
Generate Query Embedding (768 dimensions)
    ↓
Vector Similarity Search (pgvector)
    - Compare query embedding with member embeddings
    - Use cosine distance metric
    - Filter by JSONB profile fields (city, skills, etc.)
    ↓
Rank Results by Similarity Score
    ↓
Return Top N Results
```

### 2. Keyword Search Flow

```
User Query
    ↓
Clean Query (remove stop words)
    ↓
Full-Text Search (tsvector)
    - Search across all indexed fields
    - Use ts_rank for scoring
    - Filter by JSONB profile fields
    ↓
Rank Results by Text Relevance
    ↓
Return Top N Results
```

### 3. Hybrid Search Flow

```
User Query
    ↓
Run Semantic + Keyword Search in Parallel
    ↓
Merge Results with Weighted Scoring
    - Semantic Weight: 0.7
    - Keyword Weight: 0.3
    ↓
Check for Exact Matches
    - Name matching
    - Email matching
    - Phone matching
    ↓
Filter Results (person search detection)
    ↓
Sort by Combined Score
    ↓
Return Top N Results
```

---

## Testing

### Run Tests

```bash
npm run test:search
```

### Test Cases

1. **Create Community with Members** ✅
2. **Generate Embeddings from JSONB Profiles** ✅
3. **Populate Search Index** ✅
4. **Semantic Search** ✅
   - Query: "Find Python developers"
   - Expected: Members with Python skills ranked by relevance

5. **Keyword Search** ✅
   - Query: "Machine Learning"
   - Expected: Exact text matches

6. **Hybrid Search** ✅
   - Query: "AI expert in Bangalore"
   - Expected: Combined semantic + keyword results filtered by city

7. **City Filter** ✅
   - Query: "developer" + city="Bangalore"
   - Expected: Only Bangalore developers

8. **Skills Filter** ✅
   - Filter: skills=["React"]
   - Expected: Members with React in profile_data skills array

---

## JSONB Query Examples

### Search by City
```sql
SELECT * FROM community_memberships
WHERE profile_data->>'city' ILIKE '%Bangalore%';
```

### Search by Skills
```sql
SELECT * FROM community_memberships
WHERE profile_data->'skills' ? 'Python';
```

### Search by Graduation Year
```sql
SELECT * FROM community_memberships
WHERE member_type = 'alumni'
AND (profile_data->>'graduation_year')::int = 2020;
```

### Search by Company
```sql
SELECT * FROM community_memberships
WHERE member_type = 'entrepreneur'
AND profile_data->>'company' ILIKE '%Tech Startup%';
```

---

## Performance Optimization

### Indexes

1. **Vector Indexes (HNSW)**
   ```sql
   CREATE INDEX idx_member_embeddings_profile_hnsw
   ON member_embeddings
   USING hnsw (profile_embedding vector_cosine_ops)
   WITH (m = 16, ef_construction = 64);
   ```

2. **JSONB Indexes**
   ```sql
   CREATE INDEX idx_cm_profile_data_gin
   ON community_memberships
   USING GIN (profile_data);

   CREATE INDEX idx_cm_profile_skills_gin
   ON community_memberships
   USING GIN ((profile_data->'skills'));
   ```

3. **Full-Text Search Index**
   ```sql
   CREATE INDEX idx_search_vector
   ON member_search_index
   USING GIN(search_vector);
   ```

### Query Performance

- **Semantic Search**: ~50-100ms (with HNSW index)
- **Keyword Search**: ~10-30ms (with GIN index)
- **Hybrid Search**: ~100-150ms (parallel execution)
- **Embedding Generation**: ~200-500ms per member (API latency)

---

## Migration from Old Schema

### Key Changes

1. **Removed Tables:**
   - `alumni_profiles` → Merged into `profile_data` JSONB
   - `entrepreneur_profiles` → Merged into `profile_data` JSONB
   - `resident_profiles` → Merged into `profile_data` JSONB

2. **Updated Queries:**
   - Old: `JOIN alumni_profiles ap ON cm.id = ap.membership_id`
   - New: `cm.profile_data->>'college'` (direct JSONB access)

3. **Search Index:**
   - Old: Separate columns for each field
   - New: Single tsvector generated from JSONB via trigger

### Migration Script

```bash
# Run migration to create search index table
psql -d community_connect -f src/migrations/006_create_member_search_index.sql

# Generate embeddings for existing members
npm run generate:embeddings:lean
```

---

## Troubleshooting

### No Search Results

1. **Check if embeddings exist:**
   ```sql
   SELECT COUNT(*) FROM member_embeddings;
   ```

2. **Check if search index is populated:**
   ```sql
   SELECT COUNT(*) FROM member_search_index;
   ```

3. **Regenerate embeddings:**
   ```bash
   npm run generate:embeddings:lean
   ```

### Slow Search Queries

1. **Check if indexes exist:**
   ```sql
   SELECT indexname FROM pg_indexes
   WHERE tablename IN ('member_embeddings', 'member_search_index', 'community_memberships');
   ```

2. **Analyze query performance:**
   ```sql
   EXPLAIN ANALYZE
   SELECT * FROM member_embeddings
   WHERE profile_embedding <=> '[0.1, 0.2, ...]'::vector
   ORDER BY profile_embedding <=> '[0.1, 0.2, ...]'::vector
   LIMIT 10;
   ```

### JSONB Query Issues

1. **Check if field exists:**
   ```sql
   SELECT profile_data ? 'skills' FROM community_memberships;
   ```

2. **Check data type:**
   ```sql
   SELECT jsonb_typeof(profile_data->'skills') FROM community_memberships;
   ```

---

## Next Steps

1. **Implement Caching**: Add Redis caching for frequent searches
2. **Add Filters**: Support more JSONB field filters (company, designation, etc.)
3. **Improve Relevance**: Tune semantic/keyword weight ratios
4. **Add Analytics**: Track search queries and popular filters
5. **Optimize Embeddings**: Use batch embedding generation for performance
