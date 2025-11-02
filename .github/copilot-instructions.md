# Community Connect - AI Agent Instructions

## Project Overview
Community Connect is a **WhatsApp bot for apartment communities** with a React admin dashboard. Users query member information via natural language through WhatsApp; admins manage members through a web interface. The system uses semantic search powered by DeepInfra's Llama 3.1 8B and pgvector for member discovery.

## Architecture

### Monorepo Structure
- **`/Server`** - Express.js/TypeScript backend (port 3000)
- **`/dashboard`** - React/Vite frontend (port 5173)
- **`/docs`** - Extensive documentation (START-HERE.md is entry point)

### Tech Stack
**Backend**: Express.js, TypeScript, PostgreSQL (Supabase) with pgvector, Redis (sessions/rate limiting)  
**Frontend**: React 18, Vite, TailwindCSS, shadcn/ui, TanStack Query, React Router v6  
**AI/ML**: DeepInfra Llama 3.1 8B (inference), BAAI/bge-base-en-v1.5 (embeddings)  
**External**: Twilio WhatsApp API, ngrok (local dev tunneling)

### Service Architecture
```
WhatsApp → Twilio → ngrok → Express Server
                              ├─ whatsappController → nlSearchService → llmService (DeepInfra)
                              ├─ conversationService (Redis sessions)
                              └─ semanticSearch (pgvector embeddings)
```

## Critical Developer Patterns

### 1. Phone-Based Authentication ("Smart Auth")
**Backend**: All protected routes automatically resolve user roles from database via phone number
- Phone extracted from `req.body.phoneNumber`, `req.query.phoneNumber`, or `req.body.From` (WhatsApp)
- Middleware in `Server/src/middlewares/authorize.ts` fetches role from DB, defaults to 'member'
- **Never trust client-provided roles** - DB is single source of truth

**Frontend**: Phone number sent with every API request via axios interceptor
- `dashboard/src/lib/auth.ts` - manages localStorage `userPhone`
- `dashboard/src/lib/api.ts` - interceptor adds phone to all requests (GET→params, POST→body)
- Testing: Set `localStorage.setItem('userPhone', '9876543210')` or use `VITE_TEST_PHONE_NUMBER` env var

### 2. LLM Integration Pattern
**File**: `Server/src/services/llmService.ts`
- Uses Llama 3.1 8B chat template: `<|begin_of_text|><|start_header_id|>system<|end_header_id|>...<|eot_id|>`
- Always include proper stop tokens: `["<|eot_id|>", "<|end_of_text|>", "<|eom_id|>"]`
- Two-stage processing: (1) `parseQuery()` extracts entities via structured JSON prompt, (2) `semanticSearch()` uses embeddings
- Conversation context passed as system prompt prefix for follow-up queries

### 3. Redis Session Management
**File**: `Server/src/services/sessionService.ts`
- Sessions keyed by phone: `session:whatsapp:+919876543210` (30min TTL)
- Stores conversation history (max 10 entries), role, message/search counters
- Rate limiting: separate Redis keys `rate:msg:{phone}` and `rate:search:{phone}` (1hr TTL)
- **Always use `getOrCreateSession()` before processing WhatsApp messages**

### 4. Vector Embeddings & Search
**Setup**: `Server/src/scripts/generateEmbeddings.ts` creates 768-dim vectors via BAAI/bge-base-en-v1.5
- Two embeddings per member: `profile_embedding` (full profile), `skills_embedding` (skills only)
- Search: `Server/src/services/semanticSearch.ts` generates query embedding, uses pgvector cosine similarity
- Index type: IVFFlat with 100 lists (`ivfflat (embedding vector_cosine_ops)`)

### 5. Database Schema Conventions
- Primary keys: `id UUID DEFAULT gen_random_uuid()`
- Timestamps: `created_at`, `updated_at` (Postgres `TIMESTAMP`)
- Snake_case for DB columns, camelCase in TypeScript (transform in queries)
- Role column: `role VARCHAR(20) DEFAULT 'member'` (`member | admin | super_admin`)

## Essential Commands

### Environment Setup (First Time)
```bash
# Backend
cd Server
npm install
cp .env.example .env  # Configure DATABASE_URL, DEEPINFRA_API_KEY, REDIS_URL
npm run check:env     # Verify setup
npm run db:setup      # Create tables
npm run import:members  # Load from CSV
npm run generate:embeddings  # Create vectors

# Frontend
cd dashboard
npm install
# Add VITE_API_URL=http://localhost:3000, VITE_TEST_PHONE_NUMBER=9876543210 to .env
```

### Daily Development
```bash
# Terminal 1 - Backend
cd Server && npm run dev  # ts-node-dev with auto-reload

# Terminal 2 - Frontend
cd dashboard && npm run dev  # Vite dev server (port 5173)

# Terminal 3 - WhatsApp testing (optional)
cd Server && ngrok http 3000  # Update Twilio webhook with ngrok URL
```

### Testing & Scripts
```bash
cd Server
npm run test:whatsapp   # Send test message to /api/whatsapp/webhook
npm run test:redis      # Verify Redis connection
npm run db:add-roles    # Migrate existing members to add role column
```

## File Navigation

**WhatsApp Flow**: `routes/whatsapp.ts` → `services/nlSearchService.ts` → `services/llmService.ts` + `services/semanticSearch.ts`  
**Dashboard Auth**: `dashboard/src/lib/api.ts` (interceptor) → `Server/src/middlewares/authorize.ts`  
**Member CRUD**: `dashboard/src/pages/Members.tsx` → `Server/src/routes/members.ts` → `controllers/memberController.ts`  
**Type Definitions**: `Server/src/utils/types.ts` (backend), `dashboard/src/lib/api.ts` (frontend)

## Common Gotchas

1. **WhatsApp phone format**: Twilio sends `whatsapp:+919876543210`, must strip `whatsapp:+` prefix
2. **LLM timeout**: DeepInfra calls have 10s timeout, may need retry logic for complex queries
3. **pgvector indexes**: Must vacuum/analyze after bulk imports: `VACUUM ANALYZE member_embeddings;`
4. **Redis disconnect**: Sessions lost if Redis crashes - design for graceful degradation
5. **CORS**: Backend allows all origins in dev (`app.use(cors())`), restrict in production
6. **Rate limits**: Default 50 msg/hr, 30 search/hr per user (configurable via env vars)

## Documentation Quick Reference
- `docs/START-HERE.md` - Visual guide for WhatsApp testing with ngrok/Twilio
- `docs/SMART-AUTH-COMPLETE.md` - Phone-based auth implementation details
- `docs/ARCHITECTURE-DIAGRAM.md` - Complete system flow diagrams
- `ADR.md` - Decision rationale for DeepInfra, Supabase, tech stack
- `Server/SETUP.md` - Database setup (Supabase vs local Postgres)

## When Making Changes

**Adding API endpoints**: Follow RESTful patterns in `routes/` → `controllers/` → `services/`, add to `routes/index.ts`  
**Database migrations**: Create script in `Server/src/scripts/`, add npm script, document in SETUP.md  
**New UI components**: Use shadcn/ui (`npx shadcn@latest add <component>`), follow TailwindCSS patterns  
**LLM prompts**: Update system prompts in `llmService.ts`, test with `temperature: 0.3` for consistency  
**Auth changes**: Update both `middlewares/authorize.ts` (backend) and `lib/auth.ts` (frontend)

## Role-Based Access Control
- **member**: Can search, view profiles, update own profile
- **admin**: + add/edit members, view analytics
- **super_admin**: + delete members, manage other admins

Check `Server/src/utils/types.ts` → `ROLE_PERMISSIONS` for full matrix.
