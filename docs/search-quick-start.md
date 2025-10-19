# Community Search - Quick Start Guide

**Created**: October 19, 2025  
**For**: Business Community Search Chatbot

---

## 🎯 What We're Building

A natural language chatbot that helps community members find each other based on:
- **Skills** (e.g., "Who knows IT consulting?")
- **Services** (e.g., "Find someone who does manufacturing")
- **Location** (e.g., "Show me members in Chennai")
- **Multi-criteria** (e.g., "IT consultants in Chennai with experience")

---

## 📊 Your Data

**Source**: `Server/data/CommunityMemberDetails.csv`  
**Members**: 48 business professionals  
**Key Fields**:
- Name, Email, Phone
- Skills (Working Knowledge)
- Location (City)
- Business (Organization, Designation, Turnover)
- Education (Degree, Branch, Year)

---

## 🚀 Quick Start - 3 Steps

### Step 1: Set Up Database (Day 1)
```bash
# 1. Create database tables
npm run db:setup

# 2. Import CSV data
npm run import:members

# 3. Generate embeddings
npm run generate:embeddings
```

**Result**: Database populated with 48 members + semantic search ready

---

### Step 2: Test Search API (Day 2)
```bash
# Start server
npm run dev

# Test natural language search
curl -X POST http://localhost:3000/api/search/query \
  -H "Content-Type: application/json" \
  -d '{"message": "Find IT consultants in Chennai"}'
```

**Result**: Get relevant member matches with natural language response

---

### Step 3: Connect to WhatsApp (Day 3)
```bash
# Configure WhatsApp webhook
npm run setup:whatsapp

# Test via WhatsApp
# Send: "Who provides HR services?"
```

**Result**: Working chatbot on WhatsApp

---

## 🔑 Core Endpoints

### 1. Natural Language Search
```javascript
POST /api/search/query

// Request
{
  "message": "Find IT consultants in Chennai",
  "limit": 10
}

// Response
{
  "response": "I found 3 IT consultants in Chennai: ...",
  "members": [/* member details */],
  "metadata": {
    "totalResults": 3,
    "searchType": "multi-criteria",
    "confidence": 0.92
  }
}
```

### 2. Structured Search
```javascript
POST /api/search/members

// Request
{
  "filters": {
    "city": ["Chennai"],
    "workingKnowledge": "manufacturing",
    "turnoverMin": "5 Crores"
  },
  "limit": 20
}

// Response
{
  "members": [/* filtered results */],
  "pagination": {
    "total": 45,
    "hasMore": true
  }
}
```

### 3. Member Details
```javascript
GET /api/members/:id

// Response
{
  "member": {
    "name": "Mr. Udhayakumar, Ulaganathan",
    "contactInfo": { "email": "...", "phone": "..." },
    "professional": { "organization": "...", "designation": "..." },
    "education": { "degree": "MCA", "yearOfGraduation": 2009 }
  }
}
```

---

## 💡 Example Queries

### Skill-Based
```
"Who knows software development?"
"Find someone with textile expertise"
"I need a startup consultant"
```

### Service-Based
```
"Who provides HR services?"
"Find waterproofing contractors"
"Show me diamond jewelry manufacturers"
```

### Location-Based
```
"Who is in Chennai?"
"Find members in Madurai"
"Show me businesses near me"
```

### Multi-Criteria
```
"Find IT consultants in Chennai"
"Manufacturing businesses with turnover above 5 crores"
"Show me MCA graduates working in IT"
```

---

## 🏗️ Architecture

```
User Query
    ↓
LLM (Llama 3.1) → Parse intent & extract entities
    ↓
Semantic Search (OpenAI Embeddings + pgvector)
    ↓
PostgreSQL Database
    ↓
LLM Response Generation
    ↓
Natural Language Response + Member Cards
```

---

## 📦 Technology Stack

| Component | Technology |
|-----------|-----------|
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL (Supabase) + pgvector |
| LLM | DeepInfra Llama 3.1 8B |
| Embeddings | OpenAI text-embedding-ada-002 |
| Messaging | WhatsApp Business API |

---

## 🎨 Response Format

**Natural Language Response**:
```
I found 3 IT consultants in Chennai:

1. **Udhayakumar Ulaganathan** - Lead Consultant
   🏢 Thoughtworks Technologies
   📍 Chennai | 📞 +91 99435 49835
   🎓 MCA (2009) | 💼 Software Architecture

2. **Dhandapani Ammasai** - Independent Consultant
   📍 Chennai | 📞 +91 95660 82226
   🎓 MCA (1993) | 💼 IT Consulting, Advisory

Would you like their email addresses?
```

---

## 📈 Success Metrics

| Metric | Target |
|--------|--------|
| Search Accuracy | >85% |
| Response Time | <2 seconds |
| Member Coverage | 100% (48/48) |
| User Engagement | 50% monthly active |

---

## 💰 Cost Estimate

For 10,000 queries/month:
- **OpenAI Embeddings**: ~$0.01
- **DeepInfra LLM**: ~$0.39
- **WhatsApp API**: ~$45
- **Total**: ~$45-50/month

For 50 members → ~$5-10/month

---

## 📋 Implementation Checklist

### Week 1: Foundation
- [ ] Set up PostgreSQL with pgvector
- [ ] Import CSV data (48 members)
- [ ] Generate embeddings
- [ ] Create search indexes

### Week 2: Core Search
- [ ] Implement structured search
- [ ] Add natural language query parser
- [ ] Implement semantic search
- [ ] Test with sample queries

### Week 3: Polish & Integration
- [ ] Generate natural language responses
- [ ] WhatsApp integration
- [ ] End-to-end testing
- [ ] Deploy to production

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Test specific search
npm test -- search.test.ts

# Test embeddings
npm test -- embeddings.test.ts
```

---

## 📚 Documentation

- **Full Plan**: `docs/community-search-implementation-plan.md`
- **API Spec**: `docs/search-api-specification.md`
- **Database Schema**: See implementation plan
- **Examples**: See API specification

---

## 🚦 Getting Started Now

```bash
# 1. Clone and setup
cd Server
npm install

# 2. Configure environment
cp .env.example .env
# Add: DEEPINFRA_API_KEY, OPENAI_API_KEY, DATABASE_URL

# 3. Set up database
npm run db:migrate
npm run import:members

# 4. Start development
npm run dev

# 5. Test search
curl -X POST http://localhost:3000/api/search/query \
  -H "Content-Type: application/json" \
  -d '{"message": "Who is in Chennai?"}'
```

---

## ❓ Common Questions

**Q: How accurate is the search?**  
A: Uses semantic embeddings + keyword matching for >90% accuracy

**Q: Can it handle typos?**  
A: Yes! Semantic search is resilient to minor spelling errors

**Q: What languages are supported?**  
A: Currently English, can be extended to Tamil/Hindi

**Q: Is contact info private?**  
A: Yes, can be controlled via `includeContactInfo` flag

**Q: How fast is the search?**  
A: Target <2 seconds end-to-end (including LLM)

---

## 🆘 Support

- **Issues**: Create GitHub issue
- **Questions**: Contact tech-itrace team
- **Docs**: See `/docs` folder

---

## 🎯 Next Steps

1. **Review** this plan with stakeholders
2. **Approve** technology choices
3. **Start** Phase 1 (Database setup)
4. **Demo** after each phase
5. **Deploy** to production

---

**Status**: ✅ Ready to Start  
**Estimated Time**: 2-3 weeks  
**Team**: 1-2 developers
