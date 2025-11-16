# Query Taxonomy & Sample Dataset

**Date**: November 14, 2025  
**Purpose**: Comprehensive query patterns for prompt engineering and regex development

---

## 🎯 Community Types & Search Patterns

Your platform serves **3 overlapping user personas**:
1. **Entrepreneurs Community** - Business/service discovery
2. **Alumni Community** - Peer/batch discovery
3. **Alumni Entrepreneurs Community** - Hybrid searches

---

## 📊 Query Pattern Analysis

### **Group 1: Entrepreneurs Community (Business Focus)**
**Intent**: Find service providers, companies, business partners

#### **1.1 Service-Based Queries**

**Pattern**: "Find {service/product} in {location}"

```
1. "Find web development company in Chennai"
2. "Looking for IT consulting services in Bangalore"
3. "Who provides digital marketing services?"
4. "Find textile manufacturers in Tamil Nadu"
5. "Looking for packaging solutions in Chennai"
6. "Find HR consultancy services"
7. "Who does software development in Hyderabad?"
8. "Find investment advisory services in Chennai"
9. "Looking for insurance brokers"
10. "Find civil engineering consultants in Chennai"
11. "Who provides CAD engineering services?"
12. "Find quality assurance services for textiles"
13. "Looking for safety audit services"
14. "Find e-waste recycling companies"
15. "Who manufactures aluminum products?"
```

**Extracted Entities**:
```javascript
{
  intent: "find_business",
  entities: {
    working_knowledge: ["web development", "website design", "IT services"],
    city: "Chennai",
    search_type: "service_provider"
  }
}
```

---

#### **1.2 Industry/Domain Queries**

**Pattern**: "Find companies in {industry}"

```
16. "Find IT industry companies"
17. "Looking for manufacturing businesses"
18. "Find consulting firms"
19. "Who is in the automobile industry?"
20. "Find companies in diamond jewelry"
21. "Looking for construction material suppliers"
22. "Find packaging industry companies"
23. "Who works in renewable energy?"
24. "Find fintech companies"
25. "Looking for educational services providers"
```

**Extracted Entities**:
```javascript
{
  intent: "find_business",
  entities: {
    working_knowledge: ["IT", "software", "technology", "information technology"],
    search_type: "industry_based"
  }
}
```

---

#### **1.3 Business Size/Scale Queries**

**Pattern**: "Find {size_descriptor} companies/businesses"

```
26. "Find companies with high turnover"
27. "Looking for successful businesses in Chennai"
28. "Find startups with good revenue"
29. "Who has turnover above 10 crores?"
30. "Find large manufacturing companies"
31. "Looking for established businesses"
32. "Find SMEs in Chennai"
33. "Who runs medium-sized companies?"
```

**Extracted Entities**:
```javascript
{
  intent: "find_business",
  entities: {
    turnover_requirement: "high", // Maps to: minTurnover: 100000000
    city: "Chennai"
  }
}
```

---

#### **1.4 Specific Company/Person Lookup**

**Pattern**: "Find {name}" or "Who is {name}"

```
34. "Find Sivakumar from USAM Technology"
35. "Looking for contact of S Mohanraj"
36. "Who is Nalini Rajesh?"
37. "Find details of BetterBy Marketplace"
38. "Contact information for Sriram Safety"
39. "Find Prabhuram from Mefco"
40. "Who runs Conquest Quality Systems?"
41. "Find Lakshmi Narasimha Moorthy"
```

**Extracted Entities**:
```javascript
{
  intent: "find_specific_person",
  entities: {
    name: "Sivakumar",
    organization: "USAM Technology"
  }
}
```

---

#### **1.5 Location-Based Business Discovery**

**Pattern**: "Companies in {location}" or "{location} businesses"

```
42. "Find all companies in Chennai"
43. "Who are the entrepreneurs in Hyderabad?"
44. "Businesses in Coimbatore"
45. "Find service providers in Salem"
46. "Who works in Bangalore?"
47. "Chennai-based companies"
48. "Find businesses operating in Tamil Nadu"
49. "Who is in Madurai?"
50. "Entrepreneurs in Erode"
```

**Extracted Entities**:
```javascript
{
  intent: "find_business",
  entities: {
    city: "Chennai"
  }
}
```

---

### **Group 2: Alumni Community (Peer/Batch Focus)**

**Intent**: Find batchmates, classmates, alumni connections

#### **2.1 Batch/Year-Based Queries**

**Pattern**: "Find {year} passout/batch"

```
51. "Find my batchmates from 1995 passout"
52. "Who are the 1998 batch members?"
53. "Looking for 95 passout mechanical"
54. "Find 2010 graduates"
55. "Who graduated in 1994?"
56. "1988 batch ECE students"
57. "Find alumni from 2015"
58. "Looking for 92 passout"
59. "Who are my batchmates?" (requires user context)
60. "Find classmates from 1996"
```

**Extracted Entities**:
```javascript
{
  intent: "find_peers",
  entities: {
    year_of_graduation: [1995]
  }
}
```

---

#### **2.2 Department/Branch Queries**

**Pattern**: "Find {branch} graduates" or "{branch} alumni"

```
61. "Find mechanical engineers"
62. "Who studied ECE?"
63. "Looking for civil engineering graduates"
64. "Find textile engineering alumni"
65. "Who are the MCA graduates?"
66. "Looking for EEE department students"
67. "Find production engineering passouts"
68. "Who did MBA in finance?"
69. "Mechanical branch alumni"
70. "Find computer science graduates"
```

**Extracted Entities**:
```javascript
{
  intent: "find_peers",
  entities: {
    branch: ["Mechanical", "Mechanical Engineering"]
  }
}
```

---

#### **2.3 Combined Batch + Branch Queries**

**Pattern**: "Find {year} passout {branch}"

```
71. "Find my batchmates from 1995 passout mechanical"
72. "Who are 1988 ECE graduates?"
73. "Looking for 1994 civil engineering batch"
74. "Find 2010 textile graduates"
75. "1992 MCA passouts"
76. "Who are 1998 production engineering students?"
77. "Find 2006 MBA finance graduates"
78. "Looking for 1984 EEE batch"
79. "1996 mechanical passouts"
80. "Find 2002 computer science graduates"
```

**Extracted Entities**:
```javascript
{
  intent: "find_peers",
  entities: {
    year_of_graduation: [1995],
    branch: ["Mechanical", "Mechanical Engineering"]
  }
}
```

---

#### **2.4 Location-Based Alumni Queries**

**Pattern**: "Alumni in {location}" or "Who lives in {location}"

```
81. "Find alumni living in Chennai"
82. "Who moved to Bangalore?"
83. "Looking for batchmates in Hyderabad"
84. "Alumni settled in USA"
85. "Who lives in Salem?"
86. "Find members in Coimbatore"
87. "Looking for people in Mumbai"
88. "Who is in Chennai now?"
89. "Alumni in Delhi"
90. "Find classmates living abroad"
```

**Extracted Entities**:
```javascript
{
  intent: "find_peers",
  entities: {
    city: "Chennai"
  }
}
```

---

#### **2.5 Name-Based Alumni Search**

**Pattern**: "Find {name}" or "Looking for {name}"

```
91. "Find Udhayakumar from MCA 2009"
92. "Looking for Thirunavukarasu"
93. "Who is Praveen Kumar?"
94. "Find Saravan Prabu contact"
95. "Looking for Ramakrishnan M"
96. "Find Parthiban Ellappan"
97. "Who is Siddharth Anbuselvan?"
98. "Looking for Aditya from 2015 batch"
99. "Find Murali Krishnan P"
100. "Contact for Heartly Rayan"
```

**Extracted Entities**:
```javascript
{
  intent: "find_specific_person",
  entities: {
    name: "Udhayakumar"
  }
}
```

---

#### **2.6 Degree-Specific Queries**

**Pattern**: "Find {degree} graduates"

```
101. "Find all B.E graduates"
102. "Who did MBA?"
103. "Looking for MCA passouts"
104. "Find M.E graduates"
105. "Who has B.Tech degree?"
106. "Looking for diploma holders"
107. "Find engineering graduates"
108. "Who did postgraduation?"
```

**Extracted Entities**:
```javascript
{
  intent: "find_peers",
  entities: {
    degree: ["B.E", "Bachelor of Engineering"]
  }
}
```

---

### **Group 3: Alumni Entrepreneurs Community (Hybrid)**

**Intent**: Find alumni with specific business/services, batch+business combinations

#### **3.1 Batch + Service Queries**

**Pattern**: "Find {year} batch working in {industry/service}"

```
109. "Find 1995 batch in IT industry"
110. "Who from 1998 batch does consulting?"
111. "Looking for 2010 passout in digital marketing"
112. "Find 1994 batch with manufacturing business"
113. "Who from 88 batch runs their own company?"
114. "Looking for 1992 alumni in software industry"
115. "Find 2015 batch entrepreneurs"
116. "Who from 1996 batch provides engineering services?"
117. "Looking for 2002 MCA in product companies"
118. "Find 1987 batch with business turnover above 10cr"
```

**Extracted Entities**:
```javascript
{
  intent: "find_alumni_business",
  entities: {
    year_of_graduation: [1995],
    working_knowledge: ["IT", "software", "technology", "information technology"]
  }
}
```

---

#### **3.2 Branch + Service/Industry Queries**

**Pattern**: "Find {branch} graduates in {industry}"

```
119. "Find mechanical engineers in manufacturing"
120. "Who from ECE works in electronics industry?"
121. "Looking for civil engineers in construction"
122. "Find textile graduates running textile business"
123. "Who from production engineering has their own company?"
124. "Looking for EEE alumni in electrical manufacturing"
125. "Find MCA graduates in IT companies"
126. "Who from mechanical does automotive business?"
127. "Looking for civil engineers in infrastructure"
128. "Find computer science graduates with tech startups"
```

**Extracted Entities**:
```javascript
{
  intent: "find_alumni_business",
  entities: {
    branch: ["Mechanical", "Mechanical Engineering"],
    working_knowledge: ["manufacturing", "production", "industrial"]
  }
}
```

---

#### **3.3 Location + Service + Batch Queries (Complex)**

**Pattern**: "Find {year} batch {service} in {location}"

```
129. "Find 1995 mechanical passout companies in Chennai"
130. "Who from 1998 batch does IT consulting in Bangalore?"
131. "Looking for 2010 graduates with startups in Chennai"
132. "Find 1994 civil engineers in Chennai construction"
133. "Who from 1988 batch has manufacturing in Tamil Nadu?"
134. "Looking for 2015 entrepreneurs in Hyderabad"
135. "Find 1992 textile graduates in Coimbatore"
136. "Who from 2002 batch does software services in Chennai?"
137. "Looking for 1996 passout with businesses in Salem"
138. "Find 1987 batch consultants in Chennai"
```

**Extracted Entities**:
```javascript
{
  intent: "find_alumni_business",
  entities: {
    year_of_graduation: [1995],
    branch: ["Mechanical"],
    city: "Chennai"
  }
}
```

---

#### **3.4 Current Role/Designation Queries**

**Pattern**: "Find alumni working as {designation}"

```
139. "Find alumni who are CEOs"
140. "Who works as consultant?"
141. "Looking for directors/founders"
142. "Find members who are managers"
143. "Who is a software architect?"
144. "Looking for business owners"
145. "Find alumni entrepreneurs"
146. "Who runs their own company?"
147. "Looking for partners in firms"
148. "Find alumni in leadership roles"
```

**Extracted Entities**:
```javascript
{
  intent: "find_alumni_business",
  entities: {
    designation: ["CEO", "Founder", "Director"]
  }
}
```

---

#### **3.5 Service + Location (No Batch Filter)**

**Pattern**: "Find alumni providing {service} in {location}"

```
149. "Find alumni doing consulting in Chennai"
150. "Who provides IT services in Bangalore?"
151. "Looking for alumni with manufacturing in Coimbatore"
152. "Find members offering HR services in Chennai"
153. "Who does engineering services in Hyderabad?"
154. "Looking for alumni in investment advisory"
155. "Find members with packaging business in Chennai"
156. "Who provides safety consulting?"
157. "Looking for alumni in quality assurance services"
158. "Find members doing e-commerce in Bangalore"
```

**Extracted Entities**:
```javascript
{
  intent: "find_alumni_business",
  entities: {
    working_knowledge: ["consulting", "advisory", "business consulting"],
    city: "Chennai"
  }
}
```

---

#### **3.6 Skill/Expertise-Based Queries**

**Pattern**: "Find alumni with {skill/expertise}"

```
159. "Find alumni experts in AI/ML"
160. "Who has expertise in blockchain?"
161. "Looking for alumni with financial planning skills"
162. "Find members with digital marketing expertise"
163. "Who knows about renewable energy?"
164. "Looking for alumni with export experience"
165. "Find members skilled in quality management"
166. "Who has ERP implementation experience?"
167. "Looking for alumni with startup mentoring skills"
168. "Find members with safety audit expertise"
```

**Extracted Entities**:
```javascript
{
  intent: "find_alumni_business",
  entities: {
    working_knowledge: ["AI", "ML", "artificial intelligence", "machine learning"]
  }
}
```

---

## 🎯 Special Query Patterns

### **Contextual/Conversational Queries** (Follow-up)

```
169. "Show me their profiles" (after search result)
170. "Who are they?" (after mention)
171. "Tell me more about him" (after person mention)
172. "What about their skills?" (drilling down)
173. "Any in Bangalore?" (location refinement)
174. "Who else?" (continuation)
175. "From my batch?" (adding user context)
176. "With good turnover?" (adding filter)
```

**Requires**: Conversation history context

---

### **Ambiguous/Vague Queries** (Need Clarification)

```
177. "Find someone" (too vague)
178. "Who can help?" (unclear intent)
179. "Looking for a person" (no criteria)
180. "Find businesses" (too broad)
181. "Who is good?" (subjective)
182. "Any contacts?" (unclear purpose)
```

**Should Return**: Clarification prompts or top matches

---

### **Natural Language Variations**

**Same Intent, Different Phrasing**:

```
183. "Find web development companies in Chennai"
184. "Looking for web developers in Chennai"
185. "Who does website design in Chennai?"
186. "Chennai-based web development services"
187. "Web design companies located in Chennai"
188. "Need web development company from Chennai"
```

All should extract same entities ✅

---

## 📋 Regex Pattern Extraction Map

### **Priority 1: High-Frequency Patterns**

```javascript
const HIGH_PRIORITY_PATTERNS = {
  // Year extraction (90% accuracy needed)
  year: [
    /(\d{4})\s*(?:passout|batch|grad(?:uate)?(?:d|s)?)/gi,
    /(?:passout|batch|grad(?:uate)?(?:d|s)?)\s*(?:of|from|in)?\s*(\d{4})/gi,
    /(\d{2})\s*batch/gi, // "95 batch" → 1995
    /batch\s*of\s*[''"]?(\d{2,4})/gi
  ],
  
  // Location (85% accuracy)
  city: [
    /(?:in|from|at|based in|located in)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g,
    /(Chennai|Bangalore|Bengaluru|Hyderabad|Mumbai|Delhi|Coimbatore|Salem|Madurai|Erode|Tiruchendur|Kanchipuram)/gi,
    /([A-Z][a-z]+)(?:-based|'s)/g // "Chennai-based"
  ],
  
  // Branch/Department (80% accuracy)
  branch: [
    /(?:^|\s)(mechanical|civil|ECE|EEE|textile|production|computer|CSE|IT|electronics)/gi,
    /(?:mechanical|civil|electrical|electronics|computer|textile)\s+engineering/gi,
    /(MCA|MBA|M\.E|B\.E|B\.Tech)/gi
  ],
  
  // Services/Skills (70% accuracy - harder)
  services: [
    /(?:find|looking for|need|want)\s+([a-z\s]+?)\s+(?:company|service|provider|in|at)/gi,
    /(web development|IT consulting|manufacturing|consulting|HR services|digital marketing)/gi
  ]
};
```

---

### **Priority 2: Intent Classification Patterns**

```javascript
const INTENT_PATTERNS = {
  find_business: /find\s+(?:company|business|service|provider)|looking for.*(?:company|service)/i,
  
  find_peers: /batchmates?|classmates?|batch|passout|alumni|graduates?/i,
  
  find_specific_person: /(?:find|looking for|who is)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?/i,
  
  find_alumni_business: /(?:batch|alumni|passout).*(?:in|doing|runs|provides)|(?:find|who).*alumni.*(?:service|business|company)/i
};
```

---

### **Priority 3: Entity Normalization**

```javascript
const NORMALIZATIONS = {
  cities: {
    'chennai': 'Chennai',
    'blr': 'Bangalore',
    'bengaluru': 'Bangalore',
    'hyd': 'Hyderabad',
    'mumbai': 'Mumbai',
    'delhi': 'Delhi'
  },
  
  branches: {
    'mech': 'Mechanical',
    'mechanical': 'Mechanical Engineering',
    'ece': 'Electronics and Communication',
    'eee': 'Electrical and Electronics',
    'cse': 'Computer Science',
    'it': 'Information Technology'
  },
  
  services: {
    'web dev': 'web development',
    'it consulting': 'IT consulting services',
    'hr': 'HR services'
  }
};
```

---

## 🎯 Prompt Engineering Dataset

### **Few-Shot Examples for LLM**

```typescript
const FEW_SHOT_EXAMPLES = [
  {
    query: "Find web development company in Chennai",
    output: {
      intent: "find_business",
      entities: {
        working_knowledge: ["web development", "website design", "web services"],
        city: "Chennai"
      },
      search_query: "web development website design company Chennai"
    }
  },
  {
    query: "Find my batchmates from 1995 passout mechanical",
    output: {
      intent: "find_peers",
      entities: {
        year_of_graduation: [1995],
        branch: ["Mechanical", "Mechanical Engineering"]
      },
      search_query: "1995 mechanical engineering graduates batchmates"
    }
  },
  {
    query: "Who from 1998 batch does IT consulting in Bangalore?",
    output: {
      intent: "find_alumni_business",
      entities: {
        year_of_graduation: [1998],
        working_knowledge: ["IT consulting", "technology consulting", "IT services"],
        city: "Bangalore"
      },
      search_query: "1998 batch IT consulting Bangalore"
    }
  },
  {
    query: "Find mechanical engineers in manufacturing",
    output: {
      intent: "find_alumni_business",
      entities: {
        branch: ["Mechanical", "Mechanical Engineering"],
        working_knowledge: ["manufacturing", "production", "industrial"]
      },
      search_query: "mechanical engineering manufacturing production"
    }
  },
  {
    query: "Looking for alumni with high turnover in Chennai",
    output: {
      intent: "find_business",
      entities: {
        turnover_requirement: "high",
        city: "Chennai"
      },
      search_query: "successful business high turnover Chennai"
    }
  }
];
```

---

## 📊 Query Complexity Distribution

```
Simple (1-2 entities):        45% (e.g., "Find Chennai companies")
Medium (2-3 entities):        35% (e.g., "1995 mechanical passout")
Complex (3+ entities):        15% (e.g., "1995 mechanical in Chennai manufacturing")
Conversational (context):     5%  (e.g., "Show their profiles")
```

---

## 🎯 Success Metrics by Query Type

| Query Type | Target Accuracy | Latency Goal | Priority |
|------------|----------------|--------------|----------|
| Year + Branch | 95%+ | <100ms | **P0** |
| Service + Location | 90%+ | <150ms | **P0** |
| Simple Location | 98%+ | <50ms | **P1** |
| Name Search | 95%+ | <100ms | **P1** |
| Complex (3+ filters) | 85%+ | <300ms | **P2** |
| Conversational | 80%+ | <200ms | **P3** |

---

## 💡 Implementation Notes

1. **Regex First**: Use regex for Queries 51-100 (batch/year patterns) → 95%+ accuracy
2. **LLM Fallback**: Use LLM for Queries 109-158 (complex alumni-business) → Handle nuances
3. **Hybrid**: Queries 1-50 can use both (regex for location, LLM for service extraction)
4. **Context Required**: Queries 169-176 need Redis session history

---

## 🔍 Next Steps

1. ✅ **Validate Sample Queries** - Review with actual users
2. ✅ **Test Regex Patterns** - Run against 180 queries, measure accuracy
3. ✅ **Build Prompt** - Use few-shot examples for LLM
4. ✅ **Implement Hybrid Extraction** - Combine regex + LLM
5. ✅ **A/B Test** - Compare old vs new approach

---

**Total Queries Catalogued**: 188  
**Entity Combinations**: 25+ unique patterns  
**Coverage**: Entrepreneurs (33%), Alumni (36%), Hybrid (31%)
