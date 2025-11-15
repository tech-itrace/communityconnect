# Embedding & Vectorization Strategy for Community Connect

## Executive Summary

This guide outlines the complete strategy for collecting, processing, and vectorizing member data to enable effective semantic search across different community types (alumni, entrepreneurs, residents). The goal is to answer natural language queries like "Who can help with React development?" or "Find IIT graduates in fintech" with high accuracy.

---

## 1. Understanding Embeddings in Community Context

### What Are Embeddings?
Embeddings are dense vector representations (numerical arrays) that capture semantic meaning of text. Similar concepts have similar vectors, enabling:
- **Semantic search**: "React developer" matches "Frontend engineer with React.js"
- **Context understanding**: "AI expert" matches "Machine learning specialist"
- **Multi-field synthesis**: Combines skills, experience, location into single searchable representation

### Why Multiple Embeddings Per Member?

We create **3 separate embeddings** per member to optimize different query types:

```
Member Profile
├── profile_embedding (768-dim)     → Full profile: name, role, company, education
├── skills_embedding (768-dim)      → Skills, expertise, services only
└── contextual_embedding (768-dim)  → Community-specific context + interests
```

**Rationale**:
- **Skill queries** ("Who knows Python?") → Search only `skills_embedding` (faster, more precise)
- **Experience queries** ("Find senior architects") → Search `profile_embedding` 
- **Interest queries** ("Who's interested in blockchain?") → Search `contextual_embedding`
- **Complex queries** ("IIT grad with AI skills in Chennai") → Weighted combination of all 3

---

## 2. Data Collection Strategy by Community Type

### 2.1 Alumni Community

#### **Primary Data Points** (High Priority)
```typescript
{
  // Identity
  name: string,                    // "Dr. Rajesh Kumar"
  
  // Education (CRITICAL for alumni queries)
  college: string,                 // "IIT Delhi"
  degree: string,                  // "B.Tech"
  department: string,              // "Computer Science"
  graduation_year: number,         // 2015
  specialization?: string,         // "Artificial Intelligence"
  
  // Current Status
  current_organization: string,    // "Google India"
  designation: string,             // "Senior Software Engineer"
  location: {
    city: string,                  // "Bangalore"
    country: string                // "India"
  },
  
  // Expertise (for semantic search)
  skills: string[],                // ["Python", "Machine Learning", "TensorFlow"]
  domains: string[],               // ["Healthcare", "Fintech"]
  
  // Network
  interests: string[],             // ["Startup mentoring", "Open source"]
  looking_for?: string,            // "Co-founders for SaaS startup"
  willing_to_help_with: string[]  // ["Career guidance", "Interview prep"]
}
```

#### **Sample Queries Alumni Communities Should Handle**:
1. "Find all IIT Delhi graduates from 2010-2015 batch"
2. "Who's working in Google with AI/ML expertise?"
3. "Connect me with alumni in San Francisco who can mentor in product management"
4. "Which CS graduates are now in leadership roles in fintech?"
5. "Who from my batch is looking for co-founders?"

#### **Vectorization Priority**:
- **High**: Education (college, degree, department), current role, skills
- **Medium**: Interests, location, graduation year
- **Low**: Contact details (not semantically searchable)

---

### 2.2 Entrepreneur Community

#### **Primary Data Points** (High Priority)
```typescript
{
  // Identity
  name: string,                    // "Priya Sharma"
  
  // Business
  company: string,                 // "EcoTech Solutions Pvt Ltd"
  industry: string,                // "CleanTech"
  company_stage: string,           // "Series A", "Bootstrapped", "Revenue Stage"
  annual_revenue_range?: string,   // "1-5 Cr", "5-10 Cr", "10+ Cr"
  employee_count_range?: string,   // "1-10", "11-50", "50+"
  
  // Offerings
  services_offered: string[],      // ["Solar panel installation", "Energy audits"]
  products: string[],              // ["IoT energy monitors", "Solar panels"]
  expertise: string[],             // ["Renewable energy", "IoT", "B2B sales"]
  
  // Business Needs
  looking_for: string[],           // ["Investors", "Co-founders", "B2B clients"]
  can_offer: string[],             // ["Mentorship in cleantech", "Intro to VCs"]
  target_customers: string[],      // ["Commercial buildings", "Factories"]
  
  // Location
  location: {
    city: string,                  // "Pune"
    markets: string[]              // ["Maharashtra", "Karnataka", "Gujarat"]
  },
  
  // Network
  interests: string[],             // ["Sustainability", "Climate tech"]
  certifications?: string[]        // ["ISO certified", "LEED certified"]
}
```

#### **Sample Queries Entrepreneur Communities Should Handle**:
1. "Find cleantech startups in Pune looking for Series A funding"
2. "Who offers B2B SaaS services for healthcare?"
3. "Connect me with fintech entrepreneurs who can mentor on fundraising"
4. "Which companies provide digital marketing services with proven ROI?"
5. "Who's looking for technical co-founders with AI expertise?"
6. "Find manufacturers in automotive sector with export experience"

#### **Vectorization Priority**:
- **High**: Industry, services/products, expertise, looking_for, can_offer
- **Medium**: Company stage, target customers, location
- **Low**: Revenue, employee count (numerical, not semantic)

---

### 2.3 Apartment/Residential Community

#### **Primary Data Points** (High Priority)
```typescript
{
  // Identity
  name: string,                    // "Amit Verma"
  apartment_number: string,        // "A-304"
  
  // Professional (for skill-sharing)
  profession: string,              // "Civil Engineer"
  organization?: string,           // "L&T Construction"
  skills: string[],                // ["Structural design", "AutoCAD", "Home renovation"]
  
  // Community Roles
  community_roles: string[],       // ["Maintenance committee member", "Sports club coordinator"]
  
  // Offerings & Interests
  can_help_with: string[],         // ["Plumbing issues", "Electrical work", "Home gardening"]
  interested_in: string[],         // ["Weekend trekking", "Book club", "Fitness group"]
  
  // Services (if providing)
  services_offered?: string[],     // ["Home tutoring for kids", "Yoga classes"]
  
  // Family (for community events)
  family_composition?: {
    adults: number,
    children: number,
    senior_citizens: number
  },
  
  // Vehicle (for parking management)
  vehicles?: string[]              // ["Car - KA01AB1234", "Two-wheeler"]
}
```

#### **Sample Queries Residential Communities Should Handle**:
1. "Who can help with plumbing issues in building A?"
2. "Find members interested in starting a weekend trekking group"
3. "Which apartments have kids in age group 5-10 for playdates?"
4. "Who's offering home tutoring services?"
5. "Connect me with someone who knows home gardening"
6. "Which residents are civil engineers or architects for consultation?"

#### **Vectorization Priority**:
- **High**: Skills, can_help_with, interested_in, services_offered
- **Medium**: Profession, community_roles
- **Low**: Apartment number, vehicle details (not semantically searchable)

---

## 3. Embedding Generation Process

### 3.1 Text Preparation Pipeline

```typescript
interface EmbeddingInput {
  memberId: string;
  communityId: string;
  memberType: 'alumni' | 'entrepreneur' | 'resident';
  data: AlumniProfile | EntrepreneurProfile | ResidentProfile;
}

// Step 1: Extract and structure text for each embedding type
function prepareTextForEmbedding(input: EmbeddingInput): {
  profileText: string;
  skillsText: string;
  contextualText: string;
} {
  switch(input.memberType) {
    case 'alumni':
      return prepareAlumniText(input.data as AlumniProfile);
    case 'entrepreneur':
      return prepareEntrepreneurText(input.data as EntrepreneurProfile);
    case 'resident':
      return prepareResidentText(input.data as ResidentProfile);
  }
}
```

### 3.2 Alumni Text Preparation

```typescript
function prepareAlumniText(profile: AlumniProfile) {
  // Profile Embedding - Focus on identity, education, career
  const profileText = [
    profile.name,
    `${profile.degree} in ${profile.department} from ${profile.college}`,
    `Graduated in ${profile.graduation_year}`,
    profile.specialization ? `Specialized in ${profile.specialization}` : '',
    `Currently ${profile.designation} at ${profile.current_organization}`,
    `Based in ${profile.location.city}, ${profile.location.country}`,
    profile.domains.length > 0 ? `Working in ${profile.domains.join(', ')} industry` : ''
  ].filter(Boolean).join('. ');

  // Skills Embedding - Pure technical/functional skills
  const skillsText = [
    profile.skills.length > 0 ? `Expert in ${profile.skills.join(', ')}` : '',
    profile.domains.length > 0 ? `Domain expertise: ${profile.domains.join(', ')}` : '',
    profile.willing_to_help_with.length > 0 ? `Can help with ${profile.willing_to_help_with.join(', ')}` : ''
  ].filter(Boolean).join('. ');

  // Contextual Embedding - Interests, networking, aspirations
  const contextualText = [
    profile.interests.length > 0 ? `Interested in ${profile.interests.join(', ')}` : '',
    profile.looking_for ? `Currently looking for ${profile.looking_for}` : '',
    profile.willing_to_help_with.length > 0 ? `Open to helping with ${profile.willing_to_help_with.join(', ')}` : ''
  ].filter(Boolean).join('. ');

  return { profileText, skillsText, contextualText };
}
```

**Example Output**:
```
profileText: "Dr. Rajesh Kumar. B.Tech in Computer Science from IIT Delhi. Graduated in 2015. Specialized in Artificial Intelligence. Currently Senior Software Engineer at Google India. Based in Bangalore, India. Working in Healthcare, Fintech industry."

skillsText: "Expert in Python, Machine Learning, TensorFlow, NLP, Deep Learning. Domain expertise: Healthcare, Fintech. Can help with Career guidance, Interview preparation, ML project mentoring."

contextualText: "Interested in Startup mentoring, Open source contributions, AI research. Currently looking for Co-founders for healthcare AI startup. Open to helping with Career guidance, Technical mentoring, Research collaboration."
```

### 3.3 Entrepreneur Text Preparation

```typescript
function prepareEntrepreneurText(profile: EntrepreneurProfile) {
  // Profile Embedding - Company, industry, scale
  const profileText = [
    profile.name,
    `Founder/Leadership at ${profile.company}`,
    `Operating in ${profile.industry} industry`,
    profile.company_stage ? `Company stage: ${profile.company_stage}` : '',
    profile.annual_revenue_range ? `Revenue: ${profile.annual_revenue_range}` : '',
    profile.employee_count_range ? `Team size: ${profile.employee_count_range}` : '',
    `Based in ${profile.location.city}`,
    profile.location.markets.length > 0 ? `Serving markets: ${profile.location.markets.join(', ')}` : ''
  ].filter(Boolean).join('. ');

  // Skills Embedding - Services, products, expertise
  const skillsText = [
    profile.services_offered.length > 0 ? `Services: ${profile.services_offered.join(', ')}` : '',
    profile.products.length > 0 ? `Products: ${profile.products.join(', ')}` : '',
    profile.expertise.length > 0 ? `Expertise: ${profile.expertise.join(', ')}` : '',
    profile.target_customers.length > 0 ? `Target customers: ${profile.target_customers.join(', ')}` : '',
    profile.certifications && profile.certifications.length > 0 ? `Certified in ${profile.certifications.join(', ')}` : ''
  ].filter(Boolean).join('. ');

  // Contextual Embedding - Networking needs, offerings
  const contextualText = [
    profile.looking_for.length > 0 ? `Currently seeking ${profile.looking_for.join(', ')}` : '',
    profile.can_offer.length > 0 ? `Can provide ${profile.can_offer.join(', ')}` : '',
    profile.interests.length > 0 ? `Interested in ${profile.interests.join(', ')}` : ''
  ].filter(Boolean).join('. ');

  return { profileText, skillsText, contextualText };
}
```

### 3.4 Resident Text Preparation

```typescript
function prepareResidentText(profile: ResidentProfile) {
  // Profile Embedding - Identity, professional background
  const profileText = [
    profile.name,
    `Residing in Apartment ${profile.apartment_number}`,
    profile.profession ? `Works as ${profile.profession}` : '',
    profile.organization ? `at ${profile.organization}` : '',
    profile.community_roles.length > 0 ? `Community roles: ${profile.community_roles.join(', ')}` : ''
  ].filter(Boolean).join('. ');

  // Skills Embedding - Professional skills + community skills
  const skillsText = [
    profile.skills.length > 0 ? `Skills: ${profile.skills.join(', ')}` : '',
    profile.can_help_with.length > 0 ? `Can help with ${profile.can_help_with.join(', ')}` : '',
    profile.services_offered && profile.services_offered.length > 0 ? `Offers ${profile.services_offered.join(', ')}` : ''
  ].filter(Boolean).join('. ');

  // Contextual Embedding - Interests, activities
  const contextualText = [
    profile.interested_in.length > 0 ? `Interested in ${profile.interested_in.join(', ')}` : '',
    profile.family_composition ? `Family: ${profile.family_composition.adults} adults, ${profile.family_composition.children} children` : ''
  ].filter(Boolean).join('. ');

  return { profileText, skillsText, contextualText };
}
```

---

## 4. Embedding Model Selection

### 4.1 Recommended Models

| Model | Dimensions | Best For | Speed | Accuracy |
|-------|------------|----------|-------|----------|
| **BAAI/bge-base-en-v1.5** | 768 | General purpose (CURRENT) | Fast | High |
| **BAAI/bge-large-en-v1.5** | 1024 | High accuracy needs | Medium | Very High |
| **all-MiniLM-L6-v2** | 384 | Cost-optimized, fast | Very Fast | Medium |
| **text-embedding-3-small** (OpenAI) | 1536 | Best accuracy | Slow | Highest |

**Current Choice**: **BAAI/bge-base-en-v1.5** (768 dimensions)
- **Pros**: Best balance of speed/accuracy, optimized for retrieval, affordable
- **Cons**: Requires self-hosting or API (DeepInfra)

### 4.2 Generation Code

```typescript
import axios from 'axios';

interface EmbeddingResponse {
  embedding: number[];
  model: string;
  usage: { prompt_tokens: number };
}

async function generateEmbedding(
  text: string, 
  model: string = 'BAAI/bge-base-en-v1.5'
): Promise<number[]> {
  const response = await axios.post(
    'https://api.deepinfra.com/v1/inference/BAAI/bge-base-en-v1.5',
    {
      inputs: text,
      normalize: true  // CRITICAL: Normalize for cosine similarity
    },
    {
      headers: {
        'Authorization': `Bearer ${process.env.DEEPINFRA_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return response.data.embeddings[0];
}
```

---

## 5. Database Schema with Embeddings

### 5.1 Enhanced Embeddings Table

```sql
CREATE TABLE member_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    membership_id UUID NOT NULL REFERENCES community_memberships(id) ON DELETE CASCADE,
    
    -- Three embedding types for different query patterns
    profile_embedding VECTOR(768) NOT NULL,
    skills_embedding VECTOR(768) NOT NULL,
    contextual_embedding VECTOR(768) NOT NULL,
    
    -- Metadata for tracking
    embedding_model VARCHAR(100) DEFAULT 'BAAI/bge-base-en-v1.5' NOT NULL,
    embedding_version INTEGER DEFAULT 1,  -- For regeneration tracking
    
    -- Source text tracking (for debugging/regeneration)
    profile_text TEXT,
    skills_text TEXT,
    contextual_text TEXT,
    
    -- Quality metrics
    profile_text_length INTEGER,
    skills_text_length INTEGER,
    contextual_text_length INTEGER,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(membership_id)
);

-- Indexes for vector similarity search (HNSW for performance)
CREATE INDEX idx_embeddings_profile ON member_embeddings 
    USING hnsw (profile_embedding vector_cosine_ops) 
    WITH (m = 16, ef_construction = 64);

CREATE INDEX idx_embeddings_skills ON member_embeddings 
    USING hnsw (skills_embedding vector_cosine_ops) 
    WITH (m = 16, ef_construction = 64);

CREATE INDEX idx_embeddings_contextual ON member_embeddings 
    USING hnsw (contextual_embedding vector_cosine_ops) 
    WITH (m = 16, ef_construction = 64);

-- Traditional indexes
CREATE INDEX idx_embeddings_membership ON member_embeddings(membership_id);
CREATE INDEX idx_embeddings_version ON member_embeddings(embedding_version);
CREATE INDEX idx_embeddings_model ON member_embeddings(embedding_model);
```

### 5.2 Embedding Generation Tracking

```sql
-- Track embedding generation jobs (for bulk operations)
CREATE TABLE embedding_generation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    
    -- Job details
    job_type VARCHAR(50) NOT NULL CHECK (job_type IN ('initial', 'regenerate', 'update')),
    target_member_type VARCHAR(20) CHECK (target_member_type IN ('alumni', 'entrepreneur', 'resident', 'all')),
    
    -- Progress tracking
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    total_members INTEGER,
    processed_members INTEGER DEFAULT 0,
    failed_members INTEGER DEFAULT 0,
    
    -- Timing
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Error tracking
    error_log JSONB DEFAULT '[]'
);

CREATE INDEX idx_embedding_jobs_community ON embedding_generation_jobs(community_id);
CREATE INDEX idx_embedding_jobs_status ON embedding_generation_jobs(status);
```

---

## 6. Query Strategy: When to Use Which Embedding

### 6.1 Query Type Classification

```typescript
type QueryType = 
  | 'skill_based'      // "Who knows React?"
  | 'profile_based'    // "Find senior engineers at Google"
  | 'interest_based'   // "Who's interested in blockchain?"
  | 'mixed'            // "IIT grads with AI skills looking for cofounders"
  | 'exact';           // "Find John Doe" (use full-text, not embeddings)

function classifyQuery(query: string): QueryType {
  const skillKeywords = /\b(knows|expert|skilled|proficient|experienced in)\b/i;
  const profileKeywords = /\b(working at|graduated from|senior|junior|located in)\b/i;
  const interestKeywords = /\b(interested|looking for|wants to|seeking|open to)\b/i;
  
  const hasSkill = skillKeywords.test(query);
  const hasProfile = profileKeywords.test(query);
  const hasInterest = interestKeywords.test(query);
  
  if (hasSkill && !hasProfile && !hasInterest) return 'skill_based';
  if (hasProfile && !hasSkill && !hasInterest) return 'profile_based';
  if (hasInterest && !hasSkill && !hasProfile) return 'interest_based';
  if (hasSkill || hasProfile || hasInterest) return 'mixed';
  
  return 'profile_based'; // default
}
```

### 6.2 Query Execution Strategy

```typescript
async function executeSemanticSearch(
  query: string,
  communityId: string,
  memberType?: string
): Promise<SearchResult[]> {
  const queryType = classifyQuery(query);
  const queryEmbedding = await generateEmbedding(query);
  
  switch(queryType) {
    case 'skill_based':
      // Search ONLY skills_embedding
      return searchBySkills(queryEmbedding, communityId, memberType);
      
    case 'profile_based':
      // Search ONLY profile_embedding
      return searchByProfile(queryEmbedding, communityId, memberType);
      
    case 'interest_based':
      // Search ONLY contextual_embedding
      return searchByContext(queryEmbedding, communityId, memberType);
      
    case 'mixed':
      // Weighted search across all embeddings
      return searchWeighted(queryEmbedding, communityId, memberType, {
        profile: 0.4,
        skills: 0.4,
        contextual: 0.2
      });
  }
}
```

### 6.3 SQL Query Examples

**Skill-Based Search**:
```sql
WITH query_embedding AS (
    SELECT $1::vector AS qvec
)
SELECT 
    m.name,
    m.phone,
    cm.member_type,
    1 - (emb.skills_embedding <=> qe.qvec) AS similarity,
    emb.skills_text  -- Show what matched
FROM query_embedding qe
CROSS JOIN member_embeddings emb
JOIN community_memberships cm ON emb.membership_id = cm.id
JOIN members m ON cm.member_id = m.id
WHERE cm.community_id = $2
  AND cm.is_active = true
  AND (1 - (emb.skills_embedding <=> qe.qvec)) > 0.7  -- Similarity threshold
ORDER BY similarity DESC
LIMIT 20;
```

**Mixed Weighted Search**:
```sql
WITH query_embedding AS (
    SELECT $1::vector AS qvec
)
SELECT 
    m.name,
    m.phone,
    cm.member_type,
    (
        0.4 * (1 - (emb.profile_embedding <=> qe.qvec)) +
        0.4 * (1 - (emb.skills_embedding <=> qe.qvec)) +
        0.2 * (1 - (emb.contextual_embedding <=> qe.qvec))
    ) AS combined_similarity,
    jsonb_build_object(
        'profile_match', 1 - (emb.profile_embedding <=> qe.qvec),
        'skills_match', 1 - (emb.skills_embedding <=> qe.qvec),
        'context_match', 1 - (emb.contextual_embedding <=> qe.qvec)
    ) AS match_breakdown
FROM query_embedding qe
CROSS JOIN member_embeddings emb
JOIN community_memberships cm ON emb.membership_id = cm.id
JOIN members m ON cm.member_id = m.id
WHERE cm.community_id = $2
  AND cm.is_active = true
ORDER BY combined_similarity DESC
LIMIT 20;
```

---

## 7. Embedding Update Strategy

### 7.1 When to Regenerate Embeddings

**Automatic Regeneration Triggers**:
- Member creates/updates profile
- Member adds/removes skills
- Member updates job/company info
- Member changes interests/looking_for

**Batch Regeneration Scenarios**:
- New embedding model released (upgrade from v1 to v2)
- Algorithm improvements (better text preparation)
- Quarterly refresh (catch any missed updates)

### 7.2 Incremental Update Function

```typescript
async function updateMemberEmbeddings(
  membershipId: string,
  profile: AlumniProfile | EntrepreneurProfile | ResidentProfile,
  memberType: string
): Promise<void> {
  // Prepare texts
  const { profileText, skillsText, contextualText } = 
    prepareTextForEmbedding({ membershipId, memberType, data: profile });
  
  // Generate embeddings (can be done in parallel)
  const [profileEmbedding, skillsEmbedding, contextualEmbedding] = await Promise.all([
    generateEmbedding(profileText),
    generateEmbedding(skillsText),
    generateEmbedding(contextualText)
  ]);
  
  // Update database
  await query(`
    INSERT INTO member_embeddings (
      membership_id, 
      profile_embedding, 
      skills_embedding, 
      contextual_embedding,
      profile_text,
      skills_text,
      contextual_text,
      profile_text_length,
      skills_text_length,
      contextual_text_length
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    ON CONFLICT (membership_id) DO UPDATE SET
      profile_embedding = EXCLUDED.profile_embedding,
      skills_embedding = EXCLUDED.skills_embedding,
      contextual_embedding = EXCLUDED.contextual_embedding,
      profile_text = EXCLUDED.profile_text,
      skills_text = EXCLUDED.skills_text,
      contextual_text = EXCLUDED.contextual_text,
      profile_text_length = EXCLUDED.profile_text_length,
      skills_text_length = EXCLUDED.skills_text_length,
      contextual_text_length = EXCLUDED.contextual_text_length,
      updated_at = NOW()
  `, [
    membershipId,
    profileEmbedding,
    skillsEmbedding,
    contextualEmbedding,
    profileText,
    skillsText,
    contextualText,
    profileText.length,
    skillsText.length,
    contextualText.length
  ]);
  
  // Update search index trigger will fire automatically
}
```

---

## 8. Performance Optimization

### 8.1 Embedding Cache Strategy

```sql
-- Cache query embeddings (avoid regenerating for same/similar queries)
CREATE TABLE query_embedding_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_text TEXT NOT NULL,
    query_hash VARCHAR(64) UNIQUE NOT NULL,  -- MD5 of normalized query
    
    query_embedding VECTOR(768) NOT NULL,
    
    hit_count INTEGER DEFAULT 1,
    last_used TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_query_cache_hash ON query_embedding_cache(query_hash);
CREATE INDEX idx_query_cache_expires ON query_embedding_cache(expires_at);
```

### 8.2 Batch Processing for Bulk Operations

```typescript
async function generateEmbeddingsBatch(
  communityId: string,
  memberType?: string
): Promise<void> {
  // Create job record
  const jobId = await createEmbeddingJob(communityId, memberType);
  
  // Fetch members in batches (avoid memory overflow)
  const batchSize = 50;
  let offset = 0;
  let totalProcessed = 0;
  
  while (true) {
    const members = await fetchMembersForEmbedding(
      communityId, 
      memberType, 
      batchSize, 
      offset
    );
    
    if (members.length === 0) break;
    
    // Process batch in parallel (but limit concurrency)
    const promises = members.map(member => 
      updateMemberEmbeddings(member.membership_id, member.profile, member.type)
        .catch(err => {
          console.error(`Failed for member ${member.membership_id}:`, err);
          return { error: true, memberId: member.membership_id };
        })
    );
    
    const results = await Promise.all(promises);
    const failedCount = results.filter(r => r?.error).length;
    
    totalProcessed += members.length;
    offset += batchSize;
    
    // Update job progress
    await updateJobProgress(jobId, totalProcessed, failedCount);
  }
  
  // Mark job complete
  await completeEmbeddingJob(jobId);
}
```

---

## 9. Quality Assurance

### 9.1 Embedding Quality Metrics

```sql
-- Monitor embedding quality
CREATE VIEW embedding_quality_metrics AS
SELECT 
    cm.community_id,
    cm.member_type,
    COUNT(*) as total_embeddings,
    
    -- Text length distribution
    AVG(profile_text_length) as avg_profile_length,
    AVG(skills_text_length) as avg_skills_length,
    AVG(contextual_text_length) as avg_contextual_length,
    
    -- Identify sparse embeddings (too short, likely poor quality)
    COUNT(*) FILTER (WHERE profile_text_length < 50) as sparse_profiles,
    COUNT(*) FILTER (WHERE skills_text_length < 20) as sparse_skills,
    
    -- Freshness
    COUNT(*) FILTER (WHERE updated_at < NOW() - INTERVAL '90 days') as stale_embeddings
FROM member_embeddings emb
JOIN community_memberships cm ON emb.membership_id = cm.id
GROUP BY cm.community_id, cm.member_type;
```

### 9.2 Search Quality Testing

```typescript
// Test queries for quality assurance
const testQueries = {
  alumni: [
    "Find IIT Delhi computer science graduates",
    "Who's working in Google with machine learning expertise?",
    "Connect me with alumni interested in startup mentoring"
  ],
  entrepreneur: [
    "Find fintech startups looking for Series A funding",
    "Who offers B2B SaaS services in healthcare?",
    "Which companies provide digital marketing with SEO expertise?"
  ],
  resident: [
    "Who can help with plumbing issues?",
    "Find members interested in weekend trekking",
    "Which residents are civil engineers?"
  ]
};

async function runQualityTests(communityId: string, memberType: string) {
  const queries = testQueries[memberType];
  
  for (const query of queries) {
    const results = await executeSemanticSearch(query, communityId, memberType);
    
    console.log(`Query: "${query}"`);
    console.log(`Results: ${results.length}`);
    console.log(`Top match similarity: ${results[0]?.similarity}`);
    console.log(`Avg top-5 similarity: ${
      results.slice(0, 5).reduce((sum, r) => sum + r.similarity, 0) / 5
    }`);
    console.log('---');
  }
}
```

---

## 10. Implementation Checklist

### Phase 1: Foundation (Week 1)
- [ ] Update database schema with embedding tables
- [ ] Implement text preparation functions for each member type
- [ ] Set up DeepInfra API integration
- [ ] Create embedding generation service

### Phase 2: Bulk Generation (Week 2)
- [ ] Build batch processing for existing members
- [ ] Implement job tracking system
- [ ] Generate embeddings for all communities
- [ ] Validate embedding quality

### Phase 3: Real-time Updates (Week 3)
- [ ] Add triggers for profile updates
- [ ] Implement incremental embedding updates
- [ ] Set up embedding cache
- [ ] Monitor update latency

### Phase 4: Search Integration (Week 4)
- [ ] Implement query type classification
- [ ] Build weighted search algorithms
- [ ] Integrate with existing search API
- [ ] A/B test with full-text search

### Phase 5: Optimization (Week 5+)
- [ ] Fine-tune similarity thresholds
- [ ] Optimize index parameters
- [ ] Implement query result caching
- [ ] Set up monitoring dashboards

---

## 11. Cost Estimation

### DeepInfra Pricing (BAAI/bge-base-en-v1.5)
- **Cost per 1M tokens**: $0.0001
- **Average text per member**: ~300 tokens × 3 embeddings = 900 tokens
- **Cost per member**: $0.0009
- **1000 members**: $0.90
- **10,000 members**: $9.00

### Storage Costs (PostgreSQL with pgvector)
- **Per member**: 768 dim × 4 bytes × 3 embeddings = 9.2 KB
- **1000 members**: 9.2 MB
- **10,000 members**: 92 MB
- **Negligible storage cost**

### Total Monthly Cost (assuming 10k members, 100k queries)
- **Initial embedding generation**: $9.00 (one-time)
- **Monthly updates (10% churn)**: $0.90/month
- **Query embeddings (100k queries)**: $0.50/month
- **Total**: ~$1.40/month for 10k member community

---

## 12. Conclusion

This embedding strategy provides:
✅ **High accuracy**: Separate embeddings for different query types
✅ **Flexibility**: Works across alumni, entrepreneur, resident communities
✅ **Performance**: HNSW indexes for sub-100ms queries
✅ **Cost-effective**: <$10 for 10k members initial setup
✅ **Maintainable**: Automatic updates on profile changes
✅ **Scalable**: Batch processing for bulk operations

**Key Takeaway**: The three-embedding approach (profile, skills, contextual) allows for precise, fast searches while maintaining reasonable costs and complexity.
