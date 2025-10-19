# Technology Stack

## Community Connect - Complete Technology Stack

**Last Updated**: October 18, 2025  
**Project**: Community Connect - WhatsApp Bot for Apartment Communities

---

## Table of Contents
1. [Backend](#backend)
2. [LLM & AI](#llm--ai)
3. [Database](#database)
4. [Messaging](#messaging)
5. [Payments](#payments)
6. [Hosting](#hosting)
7. [Development Tools](#development-tools)
8. [Architecture Diagram](#architecture-diagram)

---

## Backend

### Runtime & Framework
- **Runtime**: Node.js 20 LTS
  - Long-term support version
  - Stable production environment
  - Large ecosystem and community support

- **Framework**: Express.js
  - Lightweight and flexible
  - Excellent middleware support
  - Battle-tested for production APIs

- **Language**: TypeScript
  - Type safety and better IDE support
  - Easier refactoring and maintenance
  - Catches errors at compile time

### API Design
- **API Style**: REST
- **Authentication**: JWT + Supabase Auth
- **Rate Limiting**: Per-user and per-endpoint
- **Versioning**: URL-based (e.g., `/api/v1/`)

---

## LLM & AI

### Primary Provider
- **Provider**: DeepInfra
- **Primary Model**: Llama 3.1 8B Instruct
  - Cost: $0.055 per 1M input tokens, $0.055 per 1M output tokens
  - Context Window: 128K tokens
  - Speed: Very Fast inference
  - Performance: Optimized for semantic tasks

### Fallback Models
- **Secondary Model**: DeepInfra Llama 3.1 70B Instruct
  - Use for: Complex reasoning tasks
  - Cost: $0.35 per 1M input tokens, $0.40 per 1M output tokens
  - Better quality for complex queries

- **Tertiary Option**: Gemini 1.5 Flash
  - Use for: If DeepInfra has downtime
  - Cost: $0.075 per 1M input tokens, $0.30 per 1M output tokens
  - Reliability backup

### Embeddings
- **Primary**: text-embedding-ada-002 (OpenAI)
  - Dimension: 1536
  - Quality: High semantic similarity
  - Fallback option available

- **Alternative**: all-MiniLM-L6-v2 (Local)
  - Dimension: 384
  - Speed: Very fast local processing
  - Privacy: Data stays in-house

### Vector Search
- **Implementation**: pgvector (PostgreSQL extension)
- **Use Case**: Semantic search over conversation history
- **Distance Metric**: Cosine similarity
- **Index Type**: IVFFlat for scalability

---

## Database

### Primary Database
- **System**: Supabase (Hosted PostgreSQL 15)
- **Storage**: 500MB (Free Tier) → 8GB (Pro) → Self-hosted (Scale)
- **Features**:
  - Built-in authentication (Phone OTP, JWT)
  - Real-time subscriptions
  - Row Level Security (RLS)
  - Automatic SSL/TLS
  - Connection pooling (Supavisor)

### Extensions
- **pgvector**: Vector similarity search
  - For semantic search over embeddings
  - Enables similarity queries on conversation context

- **pg_trgm**: Trigram text search
  - For full-text search capabilities
  - Pattern matching on user queries

### Authentication & Authorization
- **Auth Method**: Supabase Auth
- **OTP Type**: Phone OTP (SMS)
- **JWT Handling**: Automatic token generation
- **Session Management**: Built-in with automatic refresh

### Data Architecture
```
Tables:
├── users
│   ├── id (UUID, PK)
│   ├── phone_number (unique)
│   ├── full_name
│   ├── apartment_info
│   ├── user_role (user/admin/super_admin)
│   └── created_at
│
├── conversations
│   ├── id (UUID, PK)
│   ├── user_id (FK)
│   ├── messages (jsonb array)
│   ├── context_summary (text)
│   └── updated_at
│
├── embeddings
│   ├── id (UUID, PK)
│   ├── conversation_id (FK)
│   ├── content_hash
│   ├── vector (vector)
│   └── metadata (jsonb)
│
├── subscriptions
│   ├── id (UUID, PK)
│   ├── user_id (FK)
│   ├── plan_id (FK)
│   ├── status (active/cancelled/expired)
│   └── renewal_date
│
└── audit_logs
    ├── id (UUID, PK)
    ├── user_id (FK)
    ├── admin_id (FK)
    ├── action_type
    ├── details (jsonb)
    └── timestamp
```

### Row Level Security (RLS)
- Users can only view their own data
- Admin users can view all user data
- Automatic filtering at database level
- Prevents unauthorized data access

---

## Messaging

### WhatsApp Integration
- **Provider**: Twilio
- **Message Type**: Webhook-based
- **Environments**:
  - **Sandbox**: Free testing environment
  - **Production**: $0.005 per message (pay-as-you-go)

### Message Flow
1. User sends message to WhatsApp bot number
2. Twilio webhook triggers our API
3. Process message through bot logic
4. Query LLM for response
5. Send response back via Twilio API

### Webhook Configuration
- **Endpoint**: `POST /api/webhooks/whatsapp`
- **Auth**: Twilio signature verification
- **Retry Policy**: Automatic retries on failure
- **Rate Limiting**: Per-user message throttling

---

## Payments

### Payment Processor
- **Provider**: Stripe
- **Payment Methods**: Cards (Visa, Mastercard, Amex)
- **Currency**: Configurable by region
- **Fee Structure**: 2.9% + $0.30 per transaction

### Subscription Management
- **Products**: Basic, Pro, Enterprise plans
- **Billing**: Monthly recurring
- **Webhook Handling**:
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`

### Plan Structure
```
Basic Plan ($10/month)
├── 100 queries/month
├── Conversation history (30 days)
└── Standard support

Pro Plan ($25/month)
├── 1,000 queries/month
├── Conversation history (90 days)
├── Priority support
└── Advanced analytics

Enterprise Plan (Custom)
├── Unlimited queries
├── Unlimited history
├── Dedicated support
└── Custom integrations
```

---

## Hosting

### API Server
- **Primary**: Railway
  - Free $5/month credit (can cover free tier)
  - Easy Git deployment
  - Environment variable management
  - Alternative: Render (750 hours/month free)

### Database Hosting
- **MVP**: Supabase Free Tier (500MB)
- **Growth**: Supabase Pro ($25/month, 8GB)
- **Scale**: Self-hosted on DigitalOcean ($12/month, 1GB RAM, 25GB SSD)

### CDN & Static Assets
- **Option 1**: Railway built-in
- **Option 2**: Cloudflare (free tier)
- **Use**: Static files, API documentation

### Monitoring & Logging
- **Railway Dashboard**: Basic metrics
- **Sentry**: Error tracking (optional, free tier available)
- **LogRocket**: Session replay (optional)

---

## Development Tools

### Version Control
- **System**: Git
- **Platform**: GitHub
- **Branching Strategy**: Git Flow
  - `main`: Production-ready code
  - `develop`: Integration branch
  - `feature/*`: Feature branches
  - `hotfix/*`: Emergency fixes

### API Testing
- **Tool**: REST Client (VS Code extension)
- **Alternative**: Postman
- **Documentation**: OpenAPI/Swagger

### Database Client
- **Primary**: Supabase Dashboard
  - Built-in query editor
  - Table browser
  - Real-time data viewer

- **Alternative**: pgAdmin (for self-hosted)
- **Local**: TablePlus or DBeaver

### Local Development
- **Package Manager**: npm or pnpm
- **Task Runner**: npm scripts
- **Docker** (Optional):
  - Dockerfile for containerization
  - Docker Compose for multi-service setup
  - PostgreSQL container for local testing

### Code Quality
- **Linter**: ESLint
- **Formatter**: Prettier
- **Type Checker**: TypeScript
- **Testing**: Jest (unit tests)
- **E2E Testing**: Playwright or Cypress

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     USER INTERFACE                          │
├──────────────────────────┬──────────────────────────────────┤
│    WhatsApp Bot          │     Web Dashboard                │
│    (Twilio)              │     (React/Vue)                  │
└──────────────────────────┴──────────────────────────────────┘
                                    │
                                    │ HTTPS
                                    ▼
┌─────────────────────────────────────────────────────────────┐
│              EXPRESS.JS REST API (Node.js 20)               │
├──────────────────────────────────────────────────────────────┤
│  Middleware: Auth, Rate Limiting, CORS, Logging             │
│                                                              │
│  Routes:                                                     │
│  ├─ /api/auth (Supabase Auth)                               │
│  ├─ /api/messages (WhatsApp webhook + bot logic)            │
│  ├─ /api/subscriptions (Stripe webhook)                     │
│  └─ /api/admin (Admin operations)                           │
└────────┬────────────────────┬──────────────────┬────────────┘
         │                    │                  │
         │ SQL/RLS            │ HTTP             │ HTTP
         │                    │                  │
    ┌────▼────┐         ┌─────▼─────┐      ┌────▼─────┐
    │Supabase │         │ DeepInfra  │      │  Stripe  │
    │PostgreSQL         │  LLM API   │      │  Payments│
    │+ pgvector         │            │      │          │
    │+ Auth             │ Llama 3.1  │      │ Webhook  │
    │+ RLS              │ 8B/70B     │      │ Handling │
    └────────┘         └────────────┘      └──────────┘
```

---

## Deployment Pipeline

```
Development
    ↓
Git Push to GitHub
    ↓
GitHub Actions (Optional)
├─ Run tests
├─ Lint code
└─ Build TypeScript
    ↓
Railway Deployment
├─ Auto pull from Git
├─ Install dependencies
├─ Build project
└─ Start server
    ↓
Production
└─ Live API at api.communityconnect.io
```

---

## Environment Configuration

### Development (.env.local)
```env
NODE_ENV=development
PORT=3000
SUPABASE_URL=local_dev_url
SUPABASE_ANON_KEY=local_dev_key
DEEPINFRA_API_KEY=dev_key
TWILIO_ACCOUNT_SID=dev_sid
STRIPE_SECRET_KEY=dev_key
```

### Production (.env)
```env
NODE_ENV=production
PORT=8080
SUPABASE_URL=prod_url
SUPABASE_ANON_KEY=prod_key
DEEPINFRA_API_KEY=prod_key
TWILIO_ACCOUNT_SID=prod_sid
STRIPE_SECRET_KEY=prod_key
DATABASE_URL=postgres://...
```

---

## Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| API Response Time | < 500ms | - |
| LLM Response Time | < 2s | - |
| Database Query Time | < 100ms | - |
| Page Load Time | < 2s | - |
| Uptime | 99.5% | - |
| Error Rate | < 0.1% | - |

---

## Security Measures

1. **Authentication**: JWT + Phone OTP
2. **Authorization**: Role-based with RLS
3. **Encryption**: TLS 1.3 for all communications
4. **Secrets**: Environment variables only
5. **Rate Limiting**: Per-user and per-endpoint
6. **CORS**: Whitelist origin domains
7. **SQL Injection**: Parameterized queries only
8. **Audit Logging**: All admin actions logged
