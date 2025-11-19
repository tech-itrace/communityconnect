# Quick Search Test Reference Card

## 🎯 Test Members at a Glance

| Name | Location | Primary Skill | Specialty | College |
|------|----------|---------------|-----------|---------|
| **Priya Sharma** | Bangalore | Python, ML/AI | AI Consulting | IIT Madras '18 |
| **Rahul Verma** | Mumbai | JavaScript, React | Startup CTO | IIT Bombay '16 |
| **Aisha Khan** | Delhi | Cybersecurity | Security Audits | IIT Delhi '15 |
| **Vikram Patel** | Bangalore | Python, Analytics | Data Science | IIT Madras '17 |
| **Sneha Reddy** | Pune | Mobile Dev | iOS/Android | IIT Kanpur '19 |

---

## ⚡ Quick Test Queries

### Single Match (Unique Skills)
```
"machine learning"     → Priya
"cybersecurity"        → Aisha
"mobile app"           → Sneha
"startup founder"      → Rahul
"data visualization"   → Vikram
```

### Multiple Matches (Common Skills)
```
"Python"              → Priya, Aisha, Vikram
"consulting"          → Priya, Rahul, Vikram
"Bangalore"           → Priya, Vikram
"IIT Madras"          → Priya, Vikram
```

### Location Filters
```
city=Bangalore        → Priya, Vikram (2)
city=Mumbai           → Rahul (1)
city=Delhi            → Aisha (1)
city=Pune             → Sneha (1)
```

### Natural Language
```
"Who can help with AI?"                      → Priya
"Need security audit"                        → Aisha
"Build mobile app"                           → Sneha
"Startup tech advice"                        → Rahul
"Create data dashboards"                     → Vikram
```

---

## 🔍 Search Type Guide

| Type | Best For | Example |
|------|----------|---------|
| **semantic** | Concepts, typos, synonyms | "ML expert" → matches "Machine Learning" |
| **keyword** | Exact terms, names | "IIT Madras" → exact match |
| **hybrid** | General queries (default) | "Python dev in Bangalore" |

---

## 📋 Testing Checklist

### Setup (Do Once)
- [ ] Create community
- [ ] Add all 5 members
- [ ] Generate embeddings (`npm run generate:embeddings:lean`)
- [ ] Verify members with "Get All Members"

### Skill Tests
- [ ] Single skill: "Python"
- [ ] Tech stack: "React Node.js"
- [ ] Domain: "machine learning"
- [ ] Abbreviation: "ML AI"

### Location Tests
- [ ] Filter by city: "developer" + city=Bangalore
- [ ] Query + location: "AI expert Bangalore"

### Service Tests
- [ ] Consulting: "consulting mentor"
- [ ] Specific service: "security audit"
- [ ] Development: "mobile app development"

### Natural Language Tests
- [ ] Question: "Who can help with...?"
- [ ] Need statement: "I need..."
- [ ] Service request: "Looking for..."

### Edge Cases
- [ ] Typo: "macine learning"
- [ ] Abbreviation: "ML DL"
- [ ] Synonym: "hacking" → security
- [ ] Broad: "expert"

---

## 🎨 Member Specialties Quick Lookup

### AI/ML & Data Science
- **Priya** - Deep Learning, Computer Vision, NLP, AI Consulting
- **Vikram** - Data Analytics, BI, Predictive Modeling, Dashboards

### Development
- **Rahul** - Full Stack, Web Apps, React, Node.js, System Design
- **Sneha** - Mobile (iOS/Android), React Native, Flutter, UI/UX

### Security & Infrastructure
- **Aisha** - Cybersecurity, Penetration Testing, Security Audits

---

## 🚀 Postman Folders to Run

1. **Setup** - Create community (run once)
2. **Add Test Members** - Insert 5 members (run once)
3. **Generate Embeddings** - Prepare search (run once, or via npm)
4. **Skill-Based Searches** - Test technical skills
5. **Location-Based Searches** - Test geo filters
6. **Service-Based Searches** - Test offerings
7. **Domain Searches** - Test specializations
8. **Natural Language** - Test conversational queries
9. **Complex Searches** - Test multi-filters
10. **Edge Cases** - Test fuzzy matching
11. **Get All Members** - Verify data

---

## 💡 Expected Behavior Examples

### Query: "Python developer"
**Should return:** Priya, Aisha, Vikram
**Ranking:** Depends on context
- If query includes "AI" → Priya first
- If query includes "security" → Aisha first
- If query includes "data" → Vikram first

### Query: "consulting" + city=Bangalore
**Should return:** Priya, Vikram
**Why:** Both offer consulting and are in Bangalore
**Excludes:** Rahul (offers consulting but in Mumbai)

### Query: "Who can build a mobile app?"
**Should return:** Sneha
**Why:** Primary mobile developer with "Mobile App Development" service

### Query: "IIT Madras alumni"
**Should return:** Priya, Vikram
**Both graduated from IIT Madras**
- Priya: 2018, CSE
- Vikram: 2017, Mathematics & Computing

---

## 🐛 Troubleshooting One-Liners

```bash
# Check if embeddings exist
psql -d community_connect -c "SELECT COUNT(*) FROM member_embeddings;"

# Regenerate embeddings
npm run generate:embeddings:lean

# Check if members exist
curl http://localhost:3000/api/community/COMMUNITY_ID/members

# Test search directly
curl "http://localhost:3000/api/search/members?query=Python&communityId=COMMUNITY_ID"
```

---

## 📊 Success Metrics

After running all tests, you should see:

✅ **Precision** - Relevant results for each query
✅ **Diversity** - Different members match different specialties
✅ **Location Filtering** - Geo filters work correctly
✅ **Fuzzy Matching** - Typos don't break searches
✅ **Semantic Understanding** - "ML" matches "Machine Learning"
✅ **Multi-Filter** - Complex queries combine filters properly
✅ **Speed** - Searches complete in < 200ms (hybrid/semantic)

---

## 🔗 Quick Links

- Full Guide: [SEARCH_TEST_DATA_GUIDE.md](./SEARCH_TEST_DATA_GUIDE.md)
- API Docs: [SEARCH_EMBEDDING_ENDPOINTS.md](./SEARCH_EMBEDDING_ENDPOINTS.md)
- Postman Collection: [Search_Test_Data.postman_collection.json](./Search_Test_Data.postman_collection.json)

---

**Ready to test? Import the Postman collection and start with folder 1! 🚀**
