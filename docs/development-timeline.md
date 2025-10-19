# Development Timeline

## Community Connect - 3-Day MVP Development Schedule

**Last Updated**: October 18, 2025  
**Total Duration**: 3 days (24 hours)  
**Project**: Community Connect - WhatsApp Bot for Apartment Communities

---

## Table of Contents
1. [Day 1: Core Bot & Semantic Search](#day-1-core-bot--semantic-search)
2. [Day 2: Authentication & WhatsApp Integration](#day-2-authentication--whatsapp-integration)
3. [Day 3: Actions, Payments & Authorization](#day-3-actions-payments--authorization)
4. [Post-MVP Roadmap](#post-mvp-roadmap)

---

## Day 1: Core Bot & Semantic Search

**Duration**: 8 hours  
**Focus**: Slices 1 & 2 (Semantic Answering + Conversation History)

### Morning Session (4 hours)

#### 1.1 Project Setup (1 hour)
- Initialize Express.js project with TypeScript
- Setup project structure:
  ```
  src/
  ├─ config/
  ├─ controllers/
  ├─ middleware/
  ├─ services/
  ├─ types/
  └─ utils/
  ```
- Configure TypeScript (tsconfig.json)
- Setup ESLint + Prettier
- Initialize Git repository

**Deliverable**: ✅ Boilerplate ready for development

#### 1.2 DeepInfra Integration (1 hour)
- Setup DeepInfra API client
- Implement model selection logic
- Create LLM service wrapper:
  ```typescript
  class LLMService {
    query(prompt: string, context: string): Promise<string>
    createEmbedding(text: string): Promise<number[]>
  }
  ```
- Add error handling and retry logic
- Test with sample queries

**Deliverable**: ✅ LLM integration working with test API

#### 1.3 Supabase Setup & Schema (1 hour)
- Create Supabase project
- Design and create database tables:
  - `users` (id, phone_number, role, created_at)
  - `conversations` (id, user_id, messages, context_summary)
  - `embeddings` (id, conversation_id, vector, metadata)
- Setup pgvector extension
- Configure Row Level Security (RLS) policies
- Create initial migration scripts

**Deliverable**: ✅ Database schema ready with RLS

#### 1.4 Basic Query Endpoint (1 hour)
- Create `/api/query` POST endpoint
- Implement request validation
- Integrate LLM service
- Add basic response formatting
- Setup error handling

**Code Example**:
```typescript
POST /api/query
{
  "user_id": "uuid",
  "query": "What is the maintenance schedule?"
}

Response:
{
  "response": "The maintenance is scheduled...",
  "sources": ["document_id_1"],
  "confidence": 0.95
}
```

**Deliverable**: ✅ Basic bot answering queries

---

### Afternoon Session (4 hours)

#### 1.5 pgvector Semantic Search (2 hours)
- Create embedding service using DeepInfra/OpenAI
- Implement vector storage:
  - Convert queries to embeddings
  - Store embeddings in pgvector
  - Build similarity search queries

- Create semantic search service:
  ```typescript
  class SemanticSearchService {
    searchSimilar(embedding: number[], limit: number): Promise<Document[]>
    indexDocument(content: string, metadata: any): Promise<void>
  }
  ```

- Test with sample data:
  - Index 10 sample documents
  - Query with similar phrases
  - Verify ranking quality

**Deliverable**: ✅ Semantic search returning relevant documents

#### 1.6 Conversation History Context (1 hour)
- Store conversation history in database
- Create context injection logic:
  ```typescript
  function injectContext(query: string, history: Message[]): string {
    return `Previous context: ${formatHistory(history)}\n\nNew query: ${query}`;
  }
  ```
- Implement message history retrieval
- Limit history to last N messages for context window
- Test multi-turn conversation flow

**Test Scenario**:
```
Q1: "What facilities does our apartment have?"
A1: "Pool, gym, basketball court..."

Q2: "Can I book the gym?"
A2: "Yes, the gym is available... (references Q1 context)"
```

**Deliverable**: ✅ Multi-turn conversation working with context

#### 1.7 Railway Deployment (0.5 hour)
- Connect GitHub repository to Railway
- Setup environment variables
- Configure Node.js runtime
- Deploy initial version
- Test API endpoint on deployed server

**Deliverable**: ✅ API live at `api.communityconnect.io`

#### 1.8 Testing & Debugging (0.5 hour)
- Manual API testing with REST Client
- Test edge cases (empty queries, very long queries)
- Performance testing (response times)
- Bug fixes and optimization

**Deliverable**: ✅ Core bot functioning reliably

### Day 1 Summary

| Component | Status | Notes |
|-----------|--------|-------|
| Express + TypeScript setup | ✅ | Ready for features |
| DeepInfra LLM integration | ✅ | Llama 3.1 8B working |
| Supabase database & RLS | ✅ | Tables created, permissions set |
| Query endpoint | ✅ | Basic answering working |
| Semantic search | ✅ | pgvector indexed and searching |
| Conversation history | ✅ | Context injection active |
| Deployment | ✅ | Live on Railway |

**Day 1 Deliverables:**
- ✅ Bot answers direct queries
- ✅ Bot uses conversation history
- ✅ Semantic search working
- ✅ Deployed and accessible via API

---

## Day 2: Authentication & WhatsApp Integration

**Duration**: 8 hours  
**Focus**: User authentication and WhatsApp messaging

### Morning Session (4 hours)

#### 2.1 Supabase Auth Integration (2 hours)
- Setup Supabase authentication:
  - Enable Phone OTP provider
  - Configure SMS settings
  - Create auth flow functions

- Implement phone login:
  ```typescript
  POST /api/auth/phone-signup
  { "phone": "+1234567890" }

  POST /api/auth/phone-verify
  { "phone": "+1234567890", "otp": "123456" }
  ```

- Test SMS delivery (sandbox mode)
- Implement session management
- Setup automatic token refresh

**Deliverable**: ✅ Phone-based login working

#### 2.2 User Registration Flow (1 hour)
- Create `/api/auth/register` endpoint
- Store user profile:
  - Phone number
  - Full name
  - Apartment info
  - Preferences

- Implement profile completion after signup
- Add user validation
- Test end-to-end registration

**Test User Created**:
```json
{
  "id": "uuid",
  "phone": "+1234567890",
  "full_name": "John Doe",
  "apartment": "A-101",
  "created_at": "2025-10-18T10:00:00Z"
}
```

**Deliverable**: ✅ Users can register and login

#### 2.3 JWT Middleware (1 hour)
- Implement JWT verification middleware
- Protect all `/api/` routes
- Extract user context from token
- Add to request object

```typescript
middleware/auth.ts:
app.use('/api', verifyJWT, attachUserContext);
```

- Test protected routes:
  - With valid token ✅
  - With invalid token ❌
  - With expired token ❌

**Deliverable**: ✅ All API routes protected

---

### Afternoon Session (4 hours)

#### 2.4 Twilio WhatsApp Webhook Setup (2 hours)
- Setup Twilio account and configure WhatsApp
- Create webhook endpoint:
  ```typescript
  POST /api/webhooks/whatsapp
  ```

- Implement webhook signature verification
- Parse incoming WhatsApp messages:
  ```typescript
  {
    "From": "whatsapp:+1234567890",
    "To": "whatsapp:+14155552671",
    "Body": "Hello bot!"
  }
  ```

- Configure webhook in Twilio dashboard
- Test message receiving in sandbox mode

**Deliverable**: ✅ WhatsApp webhook receiving messages

#### 2.5 WhatsApp Message Handler (1.5 hours)
- Route incoming messages to bot logic
- Extract user phone number
- Lookup or create user session
- Process message through query endpoint
- Send response back via Twilio API

```typescript
async function handleWhatsAppMessage(req) {
  const phone = extractPhone(req.body.From);
  const query = req.body.Body;
  
  const response = await queryBot(phone, query);
  await sendWhatsAppMessage(phone, response);
}
```

- Test end-to-end WhatsApp flow
- Verify message formatting

**Test Flow**:
```
User sends WhatsApp message
    ↓
Webhook receives message
    ↓
Find or create user
    ↓
Send to bot endpoint
    ↓
Get response from LLM
    ↓
Send back on WhatsApp
```

**Deliverable**: ✅ Bot responds to WhatsApp messages

#### 2.6 WhatsApp Flow Testing (0.5 hour)
- Test with test phone number
- Verify message delays
- Test error scenarios
- Test rate limiting

**Deliverable**: ✅ WhatsApp integration stable

### Day 2 Summary

| Component | Status | Notes |
|-----------|--------|-------|
| Supabase phone auth | ✅ | OTP working |
| User registration | ✅ | Profile creation working |
| JWT middleware | ✅ | All routes protected |
| WhatsApp webhook | ✅ | Receiving messages |
| Message handler | ✅ | Processing correctly |
| End-to-end WhatsApp | ✅ | Bot responding |

**Day 2 Deliverables:**
- ✅ Users can login via phone
- ✅ Bot works on WhatsApp
- ✅ Conversation tied to users
- ✅ Rate limiting per user implemented

---

## Day 3: Actions, Payments & Authorization

**Duration**: 8 hours  
**Focus**: Slices 3-6 (Update Actions, Authorization, Admin, Bulk Updates)

### Morning Session (4 hours)

#### 3.1 Natural Language Action Parser (1.5 hours)
- Create action detection service:
  ```typescript
  interface Action {
    type: 'query' | 'update' | 'delete' | 'report';
    entity: string;
    value?: any;
    confidence: number;
  }
  
  function parseAction(query: string): Action
  ```

- Implement action types:
  - `query`: Information request
  - `update`: Data modification
  - `report`: Issue reporting
  - `request`: Maintenance/amenity request

- Use LLM to detect intent:
  ```typescript
  prompt: "Extract action from: '${query}'"
  + "Respond in JSON: {type, entity, value, confidence}"
  ```

- Test with sample queries:
  - "How to book the gym?" → query
  - "Update my profile to A-102" → update
  - "Report water leak in apartment" → report

**Deliverable**: ✅ Action detection working with 90%+ accuracy

#### 3.2 Authorization Middleware (1 hour)
- Define role-based access control (RBAC):
  ```typescript
  enum UserRole {
    USER = 'user',
    ADMIN = 'admin',
    SUPER_ADMIN = 'super_admin'
  }
  ```

- Implement permission matrix:
  - `USER`: View own data, update own profile, submit reports
  - `ADMIN`: View all users, approve requests, manage content
  - `SUPER_ADMIN`: Full access including user management

- Create authorization middleware:
  ```typescript
  middleware/authorize.ts:
  requireRole('admin', 'super_admin')(req, res, next)
  ```

- Test authorization checks

**Deliverable**: ✅ Authorization middleware protecting endpoints

#### 3.3 Admin vs User Roles (1 hour)
- Add role column to users table
- Implement role assignment (initial: all users)
- Create admin promotion endpoint (super_admin only)
- Add audit logging for role changes

- Test role-based endpoints:
  - User accessing user endpoint ✅
  - User accessing admin endpoint ❌
  - Admin accessing admin endpoint ✅

**Deliverable**: ✅ Role-based access control working

#### 3.4 Bulk Update for Admin (0.5 hour)
- Create bulk update endpoint:
  ```typescript
  POST /api/admin/bulk-update
  {
    "filter": { "apartment_building": "A" },
    "updates": { "maintenance_fee": 150 },
    "notify_users": true
  }
  ```

- Implement safe bulk operations:
  - Validation before execution
  - Transaction support
  - Rollback on error
  - Audit logging

- Test with sample data

**Deliverable**: ✅ Bulk update working safely

---

### Afternoon Session (4 hours)

#### 3.5 Stripe Payment Integration (2 hours)
- Setup Stripe account
- Create product catalog:
  - Basic: $10/month (100 queries)
  - Pro: $25/month (1,000 queries)
  - Enterprise: Custom pricing

- Implement subscription creation:
  ```typescript
  POST /api/subscriptions/create
  {
    "user_id": "uuid",
    "plan": "pro",
    "payment_method_id": "pm_xxx"
  }
  ```

- Create checkout session handling
- Test in test mode with test cards

**Deliverable**: ✅ Payment form working

#### 3.6 Subscription Webhook Handling (1 hour)
- Create webhook endpoint:
  ```typescript
  POST /api/webhooks/stripe
  ```

- Handle key events:
  - `customer.subscription.created` - Grant access
  - `customer.subscription.updated` - Sync plan
  - `customer.subscription.deleted` - Revoke access
  - `invoice.payment_failed` - Send reminder

- Update user plan in database
- Test webhook delivery

**Test Scenarios**:
```
1. User subscribes to Pro
   → API receives webhook
   → User plan updated to 'pro'
   → Query limit increased

2. Subscription expires
   → API receives webhook
   → User plan reverted to 'free'
   → Query limit decreased
```

**Deliverable**: ✅ Webhook handling automatic subscriptions

#### 3.7 End-to-End Testing (1 hour)
- Test complete flow:
  1. User registers
  2. User sends WhatsApp query
  3. Bot responds
  4. User upgrades subscription
  5. User performs action (with auth check)
  6. Admin approves action

- Test error scenarios
- Verify audit logs
- Performance testing

**Deliverable**: ✅ Full system working end-to-end

### Day 3 Summary

| Component | Status | Notes |
|-----------|--------|-------|
| Action parser | ✅ | Detecting intents |
| Authorization middleware | ✅ | Enforcing permissions |
| Role-based access | ✅ | User/admin separation |
| Bulk updates | ✅ | Safe batch operations |
| Stripe integration | ✅ | Payment processing |
| Webhook handling | ✅ | Automatic subscriptions |
| End-to-end testing | ✅ | All features integrated |

**Day 3 Deliverables:**
- ✅ Users can update their apartment info
- ✅ Authorization checks working
- ✅ Admin can bulk update
- ✅ Payment flow complete
- ✅ Subscription plans active

---

## MVP Completion Checklist

### Core Features
- ✅ Bot answers queries using LLM
- ✅ Bot understands conversation history
- ✅ Users authenticate via phone OTP
- ✅ Bot works on WhatsApp
- ✅ Users can perform actions (updates)
- ✅ Authorization prevents unauthorized actions
- ✅ Admins can update on behalf of users
- ✅ Admins can bulk update records
- ✅ Payment processing working
- ✅ Subscription plans active

### Infrastructure
- ✅ API deployed on Railway
- ✅ Database on Supabase
- ✅ LLM via DeepInfra
- ✅ WhatsApp via Twilio
- ✅ Payments via Stripe

### Quality
- ✅ Error handling implemented
- ✅ Rate limiting active
- ✅ Audit logging enabled
- ✅ Security: JWT + RLS + RBAC
- ✅ Code deployed and tested

---

## Post-MVP Roadmap

### Week 2-3: Polish & Scale
- User feedback collection
- Performance optimization
- Error handling improvements
- Monitoring setup (Sentry, LogRocket)

### Week 4-6: Feature Expansion
- Advanced admin dashboard
- Analytics and reporting
- Batch message sending
- Custom bot responses per community

### Month 2-3: Production Launch
- Marketing campaign
- Community onboarding
- Support infrastructure
- Payment processing for production

### Month 4+: Growth
- Scale infrastructure
- New integrations
- Mobile app
- Multi-language support

---

## Time Tracking

| Day | Phase | Hours | Status |
|-----|-------|-------|--------|
| Day 1 | Setup + Core Bot | 8 | Completed |
| Day 2 | Auth + WhatsApp | 8 | Completed |
| Day 3 | Actions + Payments | 8 | Completed |
| **Total** | **MVP** | **24** | **✅ Done** |

---

## Notes for Developers

1. **Sleep Schedule**: Consider the 8-hour work days across 3 calendar days or compress into 72 continuous hours
2. **Testing**: Run tests incrementally at the end of each section
3. **Deployment**: Deploy after each day to catch issues early
4. **Documentation**: Keep API docs updated as endpoints are created
5. **Git**: Commit frequently with clear messages
6. **Fallbacks**: Have DeepInfra 70B and Gemini ready as LLM fallbacks
7. **Backup**: Regular backups of Supabase database during development

---

## Success Criteria

| Metric | Target | How to Verify |
|--------|--------|---------------|
| Bot Response Time | < 2 seconds | Test with sample queries |
| Accuracy | > 85% | Manual QA testing |
| Authorization | 100% | Test role-based access |
| Webhook Delivery | 99%+ | Stripe/Twilio logs |
| API Uptime | 99%+ | Railway dashboard |
| Error Rate | < 0.1% | Sentry/Logs monitoring |
