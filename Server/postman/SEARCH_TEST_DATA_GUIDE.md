# Search Test Data & Query Guide

## Overview

This guide describes the test data created for comprehensive search testing across semantic, keyword, hybrid, and natural language search capabilities.

---

## Test Members Profile Summary

### 👩‍💻 Member 1: Priya Sharma - AI/ML Expert
**Location:** Bangalore
**Role:** Senior Machine Learning Engineer @ Google India
**Education:** IIT Madras, B.Tech CSE (2018)

**Key Skills:**
- Python, TensorFlow, PyTorch
- Deep Learning, Computer Vision, NLP
- AI/ML Research

**Services Offered:**
- AI Consulting
- ML Model Development
- Technical Mentorship

**Best for testing:**
- AI/ML keyword searches
- Python + Bangalore combinations
- Mentorship/consulting queries
- Research & publications
- Computer vision/NLP specific queries

---

### 👨‍💼 Member 2: Rahul Verma - Startup CTO
**Location:** Mumbai
**Role:** Co-Founder & CTO @ TechStartup Inc
**Education:** IIT Bombay, B.Tech CSE (2016)

**Key Skills:**
- JavaScript, TypeScript, React, Node.js
- PostgreSQL, AWS, Docker, Kubernetes
- Web Development, System Design

**Services Offered:**
- Web Application Development
- Startup Tech Consulting
- Architecture Review
- Team Building

**Best for testing:**
- Full-stack development searches
- Startup/entrepreneurship queries
- JavaScript/React ecosystem
- Cloud architecture & DevOps
- Consulting for early-stage companies

---

### 👩‍🔒 Member 3: Aisha Khan - Cybersecurity Expert
**Location:** Delhi
**Role:** Chief Security Officer @ SecureTech Solutions
**Education:** IIT Delhi, M.Tech CSE (2015)

**Key Skills:**
- Cybersecurity, Penetration Testing
- Ethical Hacking, Network Security
- Cryptography, SIEM
- Python, C++

**Services Offered:**
- Security Audits
- Penetration Testing
- Security Training
- Incident Response

**Certifications:** CEH, CISSP, OSCP, AWS Security

**Best for testing:**
- Security-related searches
- Certification-based queries
- Ethical hacking/pentesting
- Enterprise security
- Training services

---

### 👨‍💼 Member 4: Vikram Patel - Data Scientist
**Location:** Bangalore
**Role:** Principal Data Scientist @ Amazon
**Education:** IIT Madras, B.Tech Mathematics & Computing (2017)

**Key Skills:**
- Python, R, SQL
- Machine Learning, Statistical Analysis
- Data Visualization (Tableau, Power BI)
- Spark, Hadoop

**Services Offered:**
- Data Analytics Consulting
- Business Intelligence Setup
- Predictive Modeling
- Data Strategy

**Best for testing:**
- Data analytics queries
- BI/visualization tools
- Statistics & modeling
- Business insights searches
- Python + Bangalore (overlaps with Priya)

---

### 👩‍💻 Member 5: Sneha Reddy - Mobile Developer
**Location:** Pune
**Role:** Lead Mobile Developer @ MobileFirst Apps
**Education:** IIT Kanpur, B.Tech CSE (2019)

**Key Skills:**
- Swift, Kotlin, React Native, Flutter
- iOS/Android Development
- Firebase, GraphQL
- UI/UX Design

**Services Offered:**
- Mobile App Development
- App Store Optimization
- Mobile UI/UX Consulting
- App Maintenance

**Portfolio:** 30+ apps, 5M+ downloads

**Best for testing:**
- Mobile development searches
- Cross-platform queries
- iOS/Android specific
- UI/UX design
- App optimization

---

## Search Test Scenarios

### 1. Skill-Based Searches

#### Python Developers
**Query:** `Python developer`
**Expected Results:** Priya (ML), Aisha (Security), Vikram (Data Science)
**Why:** All three have Python as a core skill but in different domains

#### JavaScript/React
**Query:** `React JavaScript`
**Expected Results:** Rahul (Full Stack), Sneha (React Native)
**Why:** Tests both web and mobile development matches

#### Machine Learning
**Query:** `machine learning`
**Expected Results:** Priya (primary), Vikram (secondary)
**Why:** Tests semantic understanding of ML in different contexts

---

### 2. Location-Based Searches

#### Bangalore Developers
**Query:** `developer` + `city=Bangalore`
**Expected Results:** Priya, Vikram
**Why:** Tests location filtering

#### Mumbai Startups
**Query:** `startup` + `city=Mumbai`
**Expected Results:** Rahul
**Why:** Tests location + domain combination

---

### 3. Service-Based Searches

#### Security Audits
**Query:** `security audit`
**Expected Results:** Aisha
**Why:** Tests service offering matching

#### Consulting/Mentorship
**Query:** `consulting mentor`
**Expected Results:** Priya, Rahul, Vikram
**Why:** Multiple members offer consulting in different domains

#### Mobile App Development
**Query:** `mobile app development`
**Expected Results:** Sneha
**Why:** Specific service offering

---

### 4. Domain/Specialization Searches

#### AI Experts
**Query:** `artificial intelligence AI expert`
**Expected Results:** Priya
**Why:** Tests AI/ML specialization

#### Cybersecurity
**Query:** `cybersecurity ethical hacking`
**Expected Results:** Aisha
**Why:** Tests security domain expertise

#### Startup Founders
**Query:** `startup founder entrepreneur CTO`
**Expected Results:** Rahul
**Why:** Tests entrepreneurial profile

#### Data Analytics
**Query:** `data analytics business intelligence`
**Expected Results:** Vikram
**Why:** Tests analytics/BI specialization

---

### 5. Natural Language Queries

#### "Who can help with my AI project?"
**Expected:** Priya
**Why:** Natural language intent matching for AI expertise

#### "Need someone to build a mobile app"
**Expected:** Sneha
**Why:** Conversational query for mobile development

#### "Our company needs a security audit"
**Expected:** Aisha
**Why:** Business need → service matching

#### "Looking for a technical mentor in Bangalore"
**Expected:** Priya, Vikram
**Why:** Location + mentorship service

#### "Need help creating data visualization dashboards"
**Expected:** Vikram
**Why:** Specific technical need → BI expertise

#### "Starting a tech company, need advice on technology stack"
**Expected:** Rahul
**Why:** Startup consulting expertise

---

### 6. Complex Multi-Filter Searches

#### Python + Bangalore + Consulting
**Query:** `Python consulting` + `city=Bangalore`
**Expected:** Priya, Vikram
**Why:** Tests multiple filter combinations

#### IIT Madras Alumni in Bangalore
**Query:** `IIT Madras` + `city=Bangalore`
**Expected:** Priya, Vikram
**Why:** Tests college + location filtering

#### Recent Graduates with Cloud Skills
**Query:** `AWS cloud` + `yearOfGraduation=2017,2018,2019`
**Expected:** Rahul (2016 - close), Sneha (2019 - Firebase)
**Why:** Tests graduation year filtering with skill matching

---

### 7. Edge Cases & Fuzzy Matching

#### Typo: "Macine Learning"
**Query:** `macine learning`
**Expected:** Priya
**Why:** Tests semantic search's typo tolerance

#### Abbreviations: "ML DL"
**Query:** `ML DL`
**Expected:** Priya
**Why:** Tests understanding of abbreviations

#### Synonyms: "Hacking Security Threats"
**Query:** `hacking security threats`
**Expected:** Aisha
**Why:** Tests semantic understanding of related terms

#### Broad Query: "Expert"
**Query:** `expert`
**Expected:** Multiple members
**Why:** Tests broad matching across profiles

---

## Search Type Comparison

### Semantic Search (`searchType=semantic`)
- Uses vector embeddings
- Best for: Conceptual queries, understanding intent, handling typos/synonyms
- Example: "AI expert" → matches "Machine Learning Engineer"

### Keyword Search (`searchType=keyword`)
- Uses PostgreSQL full-text search
- Best for: Exact term matching, college names, specific skills
- Example: "IIT Madras" → exact match in profile

### Hybrid Search (`searchType=hybrid`, default)
- Combines semantic (70%) + keyword (30%) scoring
- Best for: Balanced results, general queries
- Example: "Python developer in Bangalore" → semantic + filter

---

## Testing Workflow

### Step 1: Setup
1. Run "Create IIT Tech Alumni Community"
2. Save the `community_id` (auto-saved by Postman)

### Step 2: Add Members
1. Run all 5 "Add Test Members" requests in sequence
2. Verify member IDs are saved

### Step 3: Generate Embeddings
Run one of:
- Postman: "Trigger Embedding Generation" (if endpoint exists)
- Terminal: `npm run generate:embeddings:lean`

### Step 4: Test Searches
Run searches in any order from folders:
- **Skill-Based Searches** - Test technical skills
- **Location-Based Searches** - Test geography filters
- **Service-Based Searches** - Test service offerings
- **Domain Searches** - Test specializations
- **Natural Language Queries** - Test conversational AI
- **Complex Searches** - Test multi-filter combinations
- **Edge Cases** - Test fuzzy matching, typos, abbreviations

### Step 5: Verify
Run "Get All Community Members" to confirm data integrity

---

## Expected Search Performance

| Search Type | Expected Time | Use Case |
|-------------|--------------|----------|
| Keyword | 10-30ms | Exact matches, names, colleges |
| Semantic | 50-100ms | Conceptual queries, fuzzy matching |
| Hybrid | 100-150ms | General queries (recommended) |
| Natural Language | 200-500ms | Conversational queries with LLM |

---

## Overlap Analysis

These members were designed with intentional overlaps to test ranking:

### Python Skills
- **Priya** (primary) - ML/AI focus
- **Aisha** (secondary) - Security focus
- **Vikram** (primary) - Analytics focus

**Test:** Search "Python" should rank by relevance to query context

### Bangalore Location
- **Priya** - AI/ML at Google
- **Vikram** - Data Science at Amazon

**Test:** Location filtering should return both, ranking by query relevance

### Consulting Services
- **Priya** - AI Consulting
- **Rahul** - Startup Consulting
- **Vikram** - Analytics Consulting

**Test:** Generic "consulting" should return all three

### IIT Madras Alumni
- **Priya** (2018)
- **Vikram** (2017)

**Test:** College search should find both, can filter by year

---

## Diverse Testing Dimensions

The 5 members cover:

✅ **5 Different Cities** - Bangalore (2), Mumbai, Delhi, Pune
✅ **5 Different IITs** - Madras (2), Bombay, Delhi, Kanpur
✅ **5 Different Organizations** - Google, Startup, SecureTech, Amazon, MobileFirst
✅ **5 Different Specializations** - AI/ML, Full-Stack, Security, Data Science, Mobile
✅ **4 Graduation Years** - 2015, 2016, 2017, 2018, 2019
✅ **Multiple Service Offerings** - Consulting, Development, Audits, Training, Mentorship
✅ **Varying Experience Levels** - 5-9 years

---

## Search Quality Metrics

When testing, evaluate:

1. **Precision:** Are the results relevant to the query?
2. **Recall:** Are all relevant members returned?
3. **Ranking:** Are most relevant results at the top?
4. **Latency:** Search completes within expected time?
5. **Fuzzy Matching:** Handles typos and abbreviations?
6. **Semantic Understanding:** Matches intent, not just keywords?

---

## Next Steps for Production

Once testing is complete:

1. **Tune Weights** - Adjust semantic/keyword ratio (currently 70/30)
2. **Add More Filters** - Years of experience, certifications, availability
3. **Implement Caching** - Cache common queries with Redis
4. **Add Analytics** - Track query patterns and popular searches
5. **Optimize Embeddings** - Batch generation, update on profile changes
6. **Faceted Search** - Add aggregations (count by city, skills, etc.)
7. **Query Suggestions** - Auto-complete based on common searches
8. **Relevance Feedback** - Let users rate search results to improve ranking

---

## Troubleshooting

### No Results?
1. Check embeddings exist: `SELECT COUNT(*) FROM member_embeddings;`
2. Regenerate: `npm run generate:embeddings:lean`
3. Verify members exist: Run "Get All Community Members"

### Wrong Results?
1. Check search type (semantic vs keyword vs hybrid)
2. Try different search types to compare
3. Check spelling and query structure
4. Review member profiles for expected keywords

### Slow Searches?
1. Check indexes exist: `SELECT * FROM pg_indexes WHERE tablename = 'member_embeddings';`
2. Use `EXPLAIN ANALYZE` on slow queries
3. Consider reducing embedding dimensions or using HNSW index

---

## API Endpoint Reference

### Structured Search
```
GET /api/search/members
Query Params:
  - query: Search text
  - communityId: UUID
  - searchType: semantic | keyword | hybrid
  - city: Filter by city
  - skills: Filter by skills (comma-separated)
  - yearOfGraduation: Filter by year (comma-separated)
  - page: Page number (default: 1)
  - limit: Results per page (default: 10)
  - sortBy: relevance | name | year
  - sortOrder: asc | desc
```

### Natural Language Search
```
POST /api/search/nl
Body:
{
  "query": "Natural language query",
  "communityId": "uuid",
  "maxResults": 10
}
```

---

## Sample curl Commands

### Skill Search
```bash
curl -X GET "http://localhost:3000/api/search/members?query=Python%20developer&communityId=COMMUNITY_ID&searchType=hybrid"
```

### Location Filter
```bash
curl -X GET "http://localhost:3000/api/search/members?query=developer&city=Bangalore&communityId=COMMUNITY_ID"
```

### Natural Language
```bash
curl -X POST "http://localhost:3000/api/search/nl" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Who can help with my AI project?",
    "communityId": "COMMUNITY_ID"
  }'
```

---

**Happy Testing! 🚀**
