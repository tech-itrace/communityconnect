# RAG Integration Flow & Implementation Guide

**Date**: November 15, 2025  
**Status**: IMPLEMENTATION READY  
**Prerequisites**: Google API Key configured ✅  
**Target**: Integrate Gemini File Search for document-based RAG

---

## 🎯 Executive Summary

This document maps **current query flow** → **RAG integration points** → **implementation steps** for Community Connect. With Google API Key ready, we can immediately leverage Gemini's File Search for document Q&A while keeping pgvector for member search.

---

## 📊 Current System Flow (Member Search Only)

```
┌──────────────────────────────────────────────────────────────────┐
│ 1. WhatsApp Message Received                                     │
│    POST /api/whatsapp/webhook                                    │
│    Body: { From: "whatsapp:+919876543210",                      │
│            Body: "Find AI experts in Chennai" }                  │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         ↓
┌──────────────────────────────────────────────────────────────────┐
│ 2. WhatsApp Route Handler                                        │
│    File: src/routes/whatsapp.ts                                 │
│    - Extract phone number                                        │
│    - Get/create session (Redis)                                  │
│    - Rate limit check                                            │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         ↓
┌──────────────────────────────────────────────────────────────────┐
│ 3. NL Search Service                                             │
│    File: src/services/nlSearchService.ts                        │
│    Function: processNaturalLanguageQuery()                      │
│                                                                   │
│    ┌──────────────────────────────────────────────────────┐    │
│    │ Step 3.1: Hybrid Entity Extraction                    │    │
│    │ File: src/services/hybridExtractor.ts                │    │
│    │ - classifyIntent() → Intent (0-2ms)                  │    │
│    │ - extractWithRegex() → Entities (5-10ms)             │    │
│    │ - If confidence < 0.5 → LLM fallback (2-5s)          │    │
│    │ Output: { intent, entities, confidence, method }     │    │
│    └──────────────────────────────────────────────────────┘    │
│                         │                                        │
│                         ↓                                        │
│    ┌──────────────────────────────────────────────────────┐    │
│    │ Step 3.2: Convert to Search Filters                   │    │
│    │ Function: entitiesToFilters()                        │    │
│    │ - location → city filter                             │    │
│    │ - skills → skills filter                             │    │
│    │ - services → services filter                          │    │
│    │ - graduationYear → year filter                        │    │
│    └──────────────────────────────────────────────────────┘    │
│                         │                                        │
│                         ↓                                        │
│    ┌──────────────────────────────────────────────────────┐    │
│    │ Step 3.3: Semantic Search (pgvector)                 │    │
│    │ File: src/services/semanticSearch.ts                 │    │
│    │ Function: searchMembers()                            │    │
│    │                                                       │    │
│    │ - Generate query embedding (DeepInfra)               │    │
│    │ - Vector search: profile_embedding <=> query         │    │
│    │ - Apply filters (city, skills, year)                 │    │
│    │ - Hybrid: 70% vector + 30% full-text                 │    │
│    │ Output: { members[], totalCount }                    │    │
│    └──────────────────────────────────────────────────────┘    │
│                         │                                        │
│                         ↓                                        │
│    ┌──────────────────────────────────────────────────────┐    │
│    │ Step 3.4: Format Response                             │    │
│    │ File: src/services/responseFormatter.ts              │    │
│    │ - Template-based formatting by intent                 │    │
│    │ - Add suggestions                                     │    │
│    │ Output: Conversational text                          │    │
│    └──────────────────────────────────────────────────────┘    │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         ↓
┌──────────────────────────────────────────────────────────────────┐
│ 4. Return Response to WhatsApp                                   │
│    - Update session (conversation history)                       │
│    - Log performance metrics (Redis)                             │
│    - Send Twilio message                                         │
└──────────────────────────────────────────────────────────────────┘
```

**Limitations**:
- ❌ Can only search member profiles (database rows)
- ❌ No document knowledge (policies, FAQs, guides)
- ❌ No context from uploaded files
- ❌ Cannot answer "How do I...?" or "What is the policy for...?"

---

## 🆕 Enhanced System with RAG (Hybrid Architecture)

```
┌──────────────────────────────────────────────────────────────────┐
│ 1. WhatsApp Message Received                                     │
│    "What's the visitor parking policy?"                          │
│    OR                                                             │
│    "Find AI experts in Chennai"                                  │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         ↓
┌──────────────────────────────────────────────────────────────────┐
│ 2. Query Type Detection (NEW!)                                   │
│    File: src/services/queryRouter.ts (NEW)                      │
│                                                                   │
│    Analyze query intent:                                         │
│    - "Find/Search/Looking for" → MEMBER_SEARCH                   │
│    - "What/How/Why/Policy/Rule" → DOCUMENT_QA                   │
│    - "Both" (e.g., "Find experts on visitor policy") → HYBRID   │
│                                                                   │
│    Method: Fast regex patterns (5ms)                             │
└────────┬────────────────────────┬─────────────────────────────────┘
         │                        │
    MEMBER_SEARCH           DOCUMENT_QA
         │                        │
         ↓                        ↓
┌────────────────────┐   ┌──────────────────────────────────────┐
│ 3A. Member Search  │   │ 3B. RAG Document Q&A (NEW!)          │
│ (Current Flow)     │   │ File: src/services/ragService.ts     │
│                    │   │                                       │
│ pgvector Search    │   │ ┌──────────────────────────────────┐ │
│ ↓                  │   │ │ Gemini File Search               │ │
│ semanticSearch()   │   │ │                                  │ │
│ ↓                  │   │ │ 1. Identify community_id         │ │
│ Return members     │   │ │ 2. Get corpus ID from DB         │ │
└──────────┬─────────┘   │ │    community_documents table     │ │
           │             │ │ 3. Query Gemini with corpus      │ │
           │             │ │    fileSearchTool: [corpus_id]   │ │
           │             │ │ 4. Get answer + citations        │ │
           │             │ │                                  │ │
           │             │ │ Gemini handles:                  │ │
           │             │ │ - Embedding generation (FREE)    │ │
           │             │ │ - Vector search                  │ │
           │             │ │ - Context retrieval              │ │
           │             │ │ - Response generation            │ │
           │             │ │ - Citation extraction            │ │
           │             │ └──────────────────────────────────┘ │
           │             │                                       │
           │             │ Output:                               │
           │             │ {                                     │
           │             │   answer: "Visitor parking is...",    │
           │             │   citations: [                        │
           │             │     { document: "policy.pdf",         │
           │             │       page: 3,                        │
           │             │       excerpt: "..." }                │
           │             │   ],                                  │
           │             │   confidence: 0.95                   │
           │             │ }                                     │
           │             └──────────────────────────────────────┘
           │                         │
           └─────────┬───────────────┘
                     │
                     ↓
           ┌─────────────────────┐
           │ 4. Merge & Format   │
           │ (if HYBRID query)   │
           └──────────┬──────────┘
                      │
                      ↓
            ┌─────────────────────┐
            │ 5. Return Response  │
            └─────────────────────┘
```

---

## 🎯 RAG Integration Points (Where to Add)

### **Point 1: Query Router (NEW Service)** 🔴 HIGH PRIORITY

**Location**: Create `src/services/queryRouter.ts`

**Purpose**: Detect if query needs member search, document Q&A, or both

**Implementation**:
```typescript
export type QueryType = 'member_search' | 'document_qa' | 'hybrid' | 'conversational';

export interface RoutingDecision {
    queryType: QueryType;
    confidence: number;
    reasoning: string;
    shouldUsePgvector: boolean;
    shouldUseGeminiRAG: boolean;
}

export function routeQuery(query: string): RoutingDecision {
    const lowerQuery = query.toLowerCase();
    
    // Document Q&A patterns
    const docPatterns = [
        /what (is|are) (the|our)/i,
        /how (do|can) (i|we)/i,
        /policy|rule|guideline|regulation/i,
        /explain|tell me about|describe/i,
        /procedure|process|steps/i,
        /when (is|are)/i,
        /where (is|are) (the|our)/i
    ];
    
    // Member search patterns
    const memberPatterns = [
        /find|search|looking for|show me/i,
        /who (is|are|has|have)/i,
        /any(one)? (with|in|from)/i,
        /(entrepreneurs?|alumni|members?) (in|with|from)/i,
        /business|company|startup/i,
        /expert|specialist|professional/i
    ];
    
    const hasDocPattern = docPatterns.some(p => p.test(query));
    const hasMemberPattern = memberPatterns.some(p => p.test(query));
    
    if (hasDocPattern && !hasMemberPattern) {
        return {
            queryType: 'document_qa',
            confidence: 0.9,
            reasoning: 'Query asks for information/policy',
            shouldUsePgvector: false,
            shouldUseGeminiRAG: true
        };
    }
    
    if (hasMemberPattern && !hasDocPattern) {
        return {
            queryType: 'member_search',
            confidence: 0.9,
            reasoning: 'Query searches for members',
            shouldUsePgvector: true,
            shouldUseGeminiRAG: false
        };
    }
    
    if (hasMemberPattern && hasDocPattern) {
        return {
            queryType: 'hybrid',
            confidence: 0.8,
            reasoning: 'Query needs both member search and document context',
            shouldUsePgvector: true,
            shouldUseGeminiRAG: true
        };
    }
    
    // Default: member search
    return {
        queryType: 'member_search',
        confidence: 0.6,
        reasoning: 'Default to member search',
        shouldUsePgvector: true,
        shouldUseGeminiRAG: false
    };
}
```

**Examples**:
```typescript
routeQuery("Find AI experts in Chennai")
→ { queryType: 'member_search', shouldUsePgvector: true }

routeQuery("What's the visitor parking policy?")
→ { queryType: 'document_qa', shouldUseGeminiRAG: true }

routeQuery("Find members who know about our parking policy")
→ { queryType: 'hybrid', shouldUsePgvector: true, shouldUseGeminiRAG: true }
```

---

### **Point 2: RAG Service (NEW Service)** 🔴 HIGH PRIORITY

**Location**: Create `src/services/ragService.ts`

**Purpose**: Interface with Gemini File Search for document Q&A

**Implementation**:
```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';
import { query } from '../config/db';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

export interface RAGResult {
    answer: string;
    citations: Array<{
        documentName: string;
        documentId: string;
        page?: number;
        excerpt?: string;
    }>;
    confidence: number;
    documentsSearched: number;
    executionTime: number;
}

/**
 * Get community's document corpus ID
 */
async function getCommunityCorpusId(communityId: string): Promise<string | null> {
    const result = await query(
        'SELECT gemini_corpus_id FROM communities WHERE id = $1',
        [communityId]
    );
    return result.rows[0]?.gemini_corpus_id || null;
}

/**
 * Query documents using Gemini File Search RAG
 */
export async function queryDocuments(
    userQuery: string,
    communityId: string
): Promise<RAGResult> {
    const startTime = Date.now();
    
    console.log(`[RAG Service] Querying documents for: "${userQuery}"`);
    console.log(`[RAG Service] Community ID: ${communityId}`);
    
    try {
        // Get corpus ID for this community
        const corpusId = await getCommunityCorpusId(communityId);
        
        if (!corpusId) {
            console.warn(`[RAG Service] No document corpus found for community ${communityId}`);
            return {
                answer: "I don't have access to community documents yet. Please ask an admin to upload documents.",
                citations: [],
                confidence: 0,
                documentsSearched: 0,
                executionTime: Date.now() - startTime
            };
        }
        
        console.log(`[RAG Service] Using corpus: ${corpusId}`);
        
        // Query Gemini with File Search
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash-exp'
        });
        
        const result = await model.generateContent({
            contents: [{
                role: 'user',
                parts: [{ text: userQuery }]
            }],
            tools: [{
                fileSearchTool: {
                    corpora: [corpusId]
                }
            }]
        });
        
        const response = result.response;
        const answer = response.text();
        
        // Extract citations (Gemini provides these automatically)
        const citations = extractCitations(response);
        
        const executionTime = Date.now() - startTime;
        
        console.log(`[RAG Service] ✓ Answer generated in ${executionTime}ms`);
        console.log(`[RAG Service] ✓ ${citations.length} citations found`);
        
        return {
            answer: answer.trim(),
            citations,
            confidence: 0.9, // Gemini File Search is highly accurate
            documentsSearched: citations.length,
            executionTime
        };
        
    } catch (error: any) {
        console.error(`[RAG Service] Error:`, error.message);
        throw new Error(`RAG query failed: ${error.message}`);
    }
}

/**
 * Extract citations from Gemini response
 */
function extractCitations(response: any): RAGResult['citations'] {
    // Gemini provides citations in response metadata
    // Parse and structure them
    const citations: RAGResult['citations'] = [];
    
    // TODO: Parse Gemini citation format
    // This depends on Gemini's actual response structure
    
    return citations;
}

/**
 * Hybrid query: Search both members and documents
 */
export async function hybridQuery(
    userQuery: string,
    communityId: string
): Promise<{
    memberResults: any; // From pgvector
    documentResults: RAGResult; // From Gemini RAG
}> {
    console.log(`[RAG Service] Executing hybrid query...`);
    
    // Run both in parallel
    const [memberResults, documentResults] = await Promise.all([
        // Import dynamically to avoid circular dependency
        import('./nlSearchService').then(m => 
            m.processNaturalLanguageQuery(userQuery, 10)
        ),
        queryDocuments(userQuery, communityId)
    ]);
    
    return {
        memberResults,
        documentResults
    };
}
```

---

### **Point 3: Update NL Search Service** 🟡 MEDIUM PRIORITY

**Location**: Modify `src/services/nlSearchService.ts`

**Change**: Add routing logic at the start

**Implementation**:
```typescript
import { routeQuery } from './queryRouter';
import { queryDocuments, hybridQuery } from './ragService';

export async function processNaturalLanguageQuery(
    naturalQuery: string,
    maxResults: number = 10,
    conversationContext?: string,
    communityId?: string // NEW: Required for RAG
): Promise<NLSearchResult | RAGResult | HybridResult> {
    const startTime = Date.now();
    
    // NEW: Route query to appropriate backend
    const routing = routeQuery(naturalQuery);
    console.log(`[NL Search] Query type: ${routing.queryType} (confidence: ${routing.confidence})`);
    
    // Handle document Q&A
    if (routing.queryType === 'document_qa' && communityId) {
        console.log(`[NL Search] Routing to RAG service...`);
        return await queryDocuments(naturalQuery, communityId);
    }
    
    // Handle hybrid queries
    if (routing.queryType === 'hybrid' && communityId) {
        console.log(`[NL Search] Executing hybrid search...`);
        return await hybridQuery(naturalQuery, communityId);
    }
    
    // Default: Continue with existing member search flow
    console.log(`[NL Search] Processing as member search...`);
    
    // ... existing code ...
}
```

---

### **Point 4: WhatsApp Route Handler** 🟡 MEDIUM PRIORITY

**Location**: Modify `src/routes/whatsapp.ts`

**Change**: Pass communityId to NL search

**Implementation**:
```typescript
// In webhook handler
const userPhone = from.replace('whatsapp:', '');

// Get user's community ID
const userResult = await query(
    'SELECT community_id FROM community_members WHERE phone = $1',
    [userPhone]
);

const communityId = userResult.rows[0]?.community_id;

// Pass to NL search
const searchResult = await processNaturalLanguageQuery(
    messageText,
    10,
    conversationHistory,
    communityId // NEW: Pass community context
);

// Format response based on result type
let responseText: string;
if ('answer' in searchResult) {
    // RAG result
    responseText = formatRAGResponse(searchResult);
} else if ('memberResults' in searchResult) {
    // Hybrid result
    responseText = formatHybridResponse(searchResult);
} else {
    // Member search result
    responseText = searchResult.response.conversational;
}
```

---

### **Point 5: Database Schema Updates** 🟢 EASY

**Location**: Database migration script

**Purpose**: Store Gemini corpus references

**Implementation**:
```sql
-- Add to communities table
ALTER TABLE communities 
ADD COLUMN gemini_corpus_id VARCHAR(255),
ADD COLUMN gemini_corpus_name VARCHAR(255),
ADD COLUMN documents_indexed_at TIMESTAMP;

-- Create document tracking table
CREATE TABLE community_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID REFERENCES communities(id),
    
    -- File metadata
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size INTEGER,
    category VARCHAR(50), -- 'policy', 'faq', 'guide', 'announcement'
    
    -- Gemini references
    gemini_file_id VARCHAR(255), -- Reference to file in Gemini
    gemini_corpus_id VARCHAR(255), -- Corpus this file belongs to
    
    -- Upload tracking
    uploaded_by UUID REFERENCES community_members(id),
    uploaded_at TIMESTAMP DEFAULT NOW(),
    
    -- Indexing status
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'indexing', 'ready', 'failed'
    indexed_at TIMESTAMP,
    index_error TEXT,
    
    -- Metadata
    description TEXT,
    tags TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_community_documents_community 
ON community_documents(community_id);

CREATE INDEX idx_community_documents_status 
ON community_documents(status);

CREATE INDEX idx_community_documents_category 
ON community_documents(category);
```

---

### **Point 6: Document Upload API** 🟡 MEDIUM PRIORITY

**Location**: Create `src/routes/documents.ts`

**Purpose**: Allow admins to upload documents for RAG

**Implementation**:
```typescript
import express from 'express';
import multer from 'multer';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { query } from '../config/db';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

/**
 * Upload document to community corpus
 */
router.post('/:communityId/upload', upload.single('file'), async (req, res) => {
    try {
        const { communityId } = req.params;
        const { category, description } = req.body;
        const file = req.file;
        
        if (!file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        // Get or create corpus for this community
        let corpusId = await getCommunityCorpusId(communityId);
        
        if (!corpusId) {
            // Create new corpus
            const corpus = await genAI.createCorpus({
                name: `community_${communityId}_docs`,
                displayName: `Documents for Community ${communityId}`
            });
            corpusId = corpus.name;
            
            // Save corpus ID to database
            await query(
                'UPDATE communities SET gemini_corpus_id = $1 WHERE id = $2',
                [corpusId, communityId]
            );
        }
        
        // Upload file to Gemini
        const uploadedFile = await genAI.uploadFile({
            corpus: corpusId,
            file: fs.readFileSync(file.path),
            mimeType: file.mimetype
        });
        
        // Save to database
        await query(
            `INSERT INTO community_documents 
             (community_id, file_name, file_type, file_size, category, 
              gemini_file_id, gemini_corpus_id, status, description)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'ready', $8)`,
            [
                communityId,
                file.originalname,
                file.mimetype,
                file.size,
                category,
                uploadedFile.name,
                corpusId,
                description
            ]
        );
        
        res.json({
            success: true,
            message: 'Document uploaded and indexed successfully',
            fileId: uploadedFile.name
        });
        
    } catch (error: any) {
        console.error('Document upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * List documents for community
 */
router.get('/:communityId/list', async (req, res) => {
    try {
        const { communityId } = req.params;
        
        const result = await query(
            `SELECT id, file_name, file_type, category, description, 
                    status, uploaded_at, indexed_at
             FROM community_documents
             WHERE community_id = $1 AND is_active = TRUE
             ORDER BY uploaded_at DESC`,
            [communityId]
        );
        
        res.json({
            success: true,
            documents: result.rows
        });
        
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
```

---

## 🚀 Implementation Roadmap

### **Phase 1: Core RAG (This Week, 16 hours)**

**Day 1 (8 hours)**:
1. ✅ Install Gemini SDK (5 min)
   ```bash
   npm install @google/generative-ai
   ```

2. ✅ Create Query Router (2 hours)
   - File: `src/services/queryRouter.ts`
   - Implement pattern matching
   - Test with sample queries

3. ✅ Create RAG Service (4 hours)
   - File: `src/services/ragService.ts`
   - Implement `queryDocuments()`
   - Implement `hybridQuery()`
   - Add error handling

4. ✅ Database Migration (1 hour)
   - Add gemini_corpus_id to communities
   - Create community_documents table
   - Run migration script

5. ✅ Test with Mock Corpus (1 hour)
   ```typescript
   // Create test corpus manually
   const corpus = await genAI.createCorpus({
       name: 'test_community_docs'
   });
   // Upload test PDF
   await genAI.uploadFile({ corpus, file: 'test.pdf' });
   // Test query
   const result = await queryDocuments("What's the parking policy?", 'test');
   ```

**Day 2 (8 hours)**:
1. ✅ Update NL Search Service (2 hours)
   - Add routing logic
   - Handle RAG results
   - Merge with existing flow

2. ✅ Update WhatsApp Handler (2 hours)
   - Pass communityId
   - Format RAG responses
   - Handle hybrid results

3. ✅ Create Document Upload API (3 hours)
   - File upload endpoint
   - Gemini indexing
   - Database tracking

4. ✅ Testing & Debugging (1 hour)
   - Test document Q&A flow
   - Test member search (ensure not broken)
   - Test hybrid queries

**Deliverables**:
- ✅ Working document Q&A via WhatsApp
- ✅ Document upload API for admins
- ✅ Database schema updated
- ✅ Existing member search unchanged

---

### **Phase 2: Admin Dashboard (Next Week, 16 hours)**

**Tasks**:
1. Document upload UI (4 hours)
2. Document management (list, delete, re-index) (4 hours)
3. Test different file formats (PDF, DOCX, TXT) (2 hours)
4. Usage analytics (RAG vs member search) (4 hours)
5. Cost monitoring (2 hours)

---

### **Phase 3: Advanced Features (Week 3, 16 hours)**

**Tasks**:
1. Rich member profiles as JSON documents (6 hours)
2. Conversation history with RAG (4 hours)
3. Query expansion (3 hours)
4. Re-ranking (3 hours)

---

## 📊 Query Flow Decision Tree

```
User Query
    │
    ↓
┌───────────────────────────────────┐
│ Contains: find/search/looking?    │
│ Target: person/member/alumni?     │
└───────────┬───────────────────────┘
            │
            ├─── YES ──→ MEMBER_SEARCH (pgvector)
            │                ↓
            │         semanticSearch()
            │                ↓
            │         Return member list
            │
            └─── NO ───→ Check Document Patterns
                            │
                            ↓
                    ┌───────────────────────────┐
                    │ Contains: what/how/policy? │
                    │ Target: info/process/rule? │
                    └───────┬───────────────────┘
                            │
                            ├─── YES ──→ DOCUMENT_QA (Gemini RAG)
                            │                ↓
                            │         queryDocuments()
                            │                ↓
                            │         Return answer + citations
                            │
                            └─── BOTH ──→ HYBRID
                                            ↓
                                     Run both in parallel
                                            ↓
                                     Merge results
```

---

## 💰 Cost Analysis

### **Per Query Cost**:

**Member Search (Current)**:
- pgvector query: $0
- DeepInfra embedding: $0.00002
- **Total: $0.00002**

**Document Q&A (New)**:
- Gemini File Search: FREE (query-time embeddings)
- Gemini API call: $0.00035 (Flash model)
- **Total: $0.00035**

**Ratio**: Document Q&A is 17.5x more expensive, but:
- Provides value member search can't
- Eliminates support queries (saves time/money)
- Only used for ~20% of queries (document questions)

### **Monthly Cost** (1000 queries/day):
- 80% member search: 24,000 × $0.00002 = $0.48
- 20% document Q&A: 6,000 × $0.00035 = $2.10
- **Total: $2.58/month**

Still incredibly affordable! 🎉

---

## ✅ Testing Checklist

### **RAG Functionality**:
- [ ] Create test corpus with 3 sample documents
- [ ] Upload PDF policy document
- [ ] Query: "What's the visitor policy?" → Get answer with citation
- [ ] Query: "How do I update my profile?" → Get answer from guide
- [ ] Query with no relevant docs → Graceful fallback

### **Member Search** (Ensure Not Broken):
- [ ] Query: "Find AI experts" → Returns member list
- [ ] Query with filters: "AI experts in Chennai" → Filtered correctly
- [ ] Performance: Still <500ms response time

### **Hybrid Queries**:
- [ ] Query: "Find members who know our parking policy"
  - Returns: Members + policy excerpt

### **Error Handling**:
- [ ] Community with no corpus → Friendly message
- [ ] Gemini API failure → Fallback to member search
- [ ] Rate limit → Proper error message

---

## 📈 Success Metrics

**Target Improvements**:
- 60% reduction in support queries (auto-answer from docs)
- <2s response time for document Q&A
- 95%+ accuracy for policy questions
- Zero manual document maintenance (just upload PDFs)

**Monitoring**:
```typescript
// Track in performance metrics
{
    queryType: 'document_qa' | 'member_search' | 'hybrid',
    ragUsed: boolean,
    ragExecutionTime: number,
    documentsSe arched: number,
    citationsReturned: number
}
```

---

## 🎯 Quick Start (Today!)

**30-Minute POC**:

```bash
# 1. Install SDK
npm install @google/generative-ai

# 2. Test Gemini connection
node -e "
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
model.generateContent('Hello!').then(r => console.log(r.response.text()));
"

# 3. Create test corpus (manually via Google AI Studio)
# https://aistudio.google.com/

# 4. Test File Search query
node scripts/testRAG.js
```

**Result**: See Gemini RAG in action! ✨

---

## 📚 Resources

- [Gemini File Search Docs](http://ai.google.dev/gemini-api/docs/file-search)
- [Google AI Studio](https://aistudio.google.com/) - Visual corpus management
- [Demo App](https://aistudio.google.com/apps/bundled/ask_the_manual)
- [Supported Formats](http://ai.google.dev/gemini-api/docs/file-search#supported-formats)

---

## 🚀 Next Actions

**Today**:
1. ✅ Install `@google/generative-ai`
2. ✅ Create `queryRouter.ts`
3. ✅ Create `ragService.ts`
4. ✅ Test with manual corpus

**This Week**:
1. Database migration
2. Update nlSearchService
3. Document upload API
4. WhatsApp integration
5. End-to-end testing

**Result**: Full RAG + member search hybrid system operational! 🎉

---

**Author**: AI Development Team  
**Status**: Ready to Implement  
**Prerequisites Met**: ✅ Google API Key configured  
**Estimated Time**: 16 hours (2 days)  
**Last Updated**: November 15, 2025
