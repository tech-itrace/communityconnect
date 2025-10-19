# Architecture Decision Records (ADR)

## Project: Community Connect - WhatsApp Bot for Apartment Communities

**Last Updated**: October 18, 2025  
**Decision Date**: October 18, 2024  
**Status**: Decided ✅

---

## Table of Contents
1. [LLM Provider Selection](#llm-provider-selection)
2. [Database Selection](#database-selection)
3. [Migration Strategy](#migration-strategy)

---

**Note**: For additional documentation, see:
- `docs/project-scope.md` - Project goals and feature breakdown
- `docs/tech-stack.md` - Technology stack details
- `docs/cost-analysis.md` - Financial projections
- `docs/development-timeline.md` - Implementation schedule

---

## LLM Provider Selection

### Decision: DeepInfra with Llama 3.1 8B

### Options Evaluated

| Provider | Model | Input Cost | Output Cost | Context | Speed |
|----------|-------|-----------|-------------|---------|-------|
| **OpenAI** | GPT-3.5-turbo | $0.50 | $1.50 | 16K | Medium |
| **OpenAI** | GPT-4o-mini | $0.15 | $0.60 | 128K | Medium |
| **OpenAI** | GPT-4o | $2.50 | $10.00 | 128K | Slow |
| **Anthropic** | Claude 3.5 Haiku | $0.25 | $1.25 | 200K | Fast |
| **Anthropic** | Claude 3.5 Sonnet | $3.00 | $15.00 | 200K | Medium |
| **Google** | Gemini 1.5 Flash | $0.075 | $0.30 | 1M | Fast |
| **Google** | Gemini 1.5 Pro | $1.25 | $5.00 | 2M | Medium |
| **Groq** | Llama 3.1 70B | $0.59 | $0.79 | 128K | Very Fast |
| **Groq** | Mixtral 8x7B | $0.24 | $0.24 | 32K | Very Fast |
| **DeepInfra** | **Llama 3.1 8B** ✅ | **$0.055** | **$0.055** | **128K** | **Very Fast** |
| **DeepInfra** | Llama 3.1 70B | $0.35 | $0.40 | 128K | Fast |
| **DeepInfra** | Mixtral 8x7B | $0.24 | $0.24 | 32K | Fast |
| **DeepInfra** | Qwen 2.5 72B | $0.35 | $0.40 | 128K | Fast |

### Cost Projection (1000 queries/month, 500 input + 300 output tokens)

```
DeepInfra Llama 3.1 8B:    $0.03 + $0.02 = $0.05/month ✅ WINNER
Gemini 1.5 Flash:          $0.04 + $0.09 = $0.13/month
Groq Mixtral:              $0.12 + $0.07 = $0.19/month
OpenAI GPT-4o-mini:        $0.08 + $0.18 = $0.26/month
DeepInfra Llama 3.1 70B:   $0.18 + $0.12 = $0.30/month
Claude 3.5 Haiku:          $0.13 + $0.38 = $0.51/month
OpenAI GPT-3.5-turbo:      $0.25 + $0.45 = $0.70/month
```

### Rationale

**Why DeepInfra Llama 3.1 8B:**
1. ✅ **10x cheaper** than OpenAI GPT-3.5-turbo
2. ✅ **2.6x cheaper** than Gemini Flash
3. ✅ **Very fast inference** (comparable to Groq)
4. ✅ **128K context window** (sufficient for conversation history)
5. ✅ **Open-source model** (no vendor lock-in)
6. ✅ **Single API** for multiple models (easy to upgrade to 70B if needed)
7. ✅ **Pay-as-you-go** pricing

**Fallback Strategy:**
- Primary: DeepInfra Llama 3.1 8B (simple queries)
- Secondary: DeepInfra Llama 3.1 70B (complex reasoning)
- Backup: Gemini Flash (if DeepInfra has downtime)

**Free Tier Alternatives Considered:**
- ❌ Groq: 14,400 requests/day but rate-limited
- ❌ Google AI Studio: Generous but not production-ready
- ❌ Together.ai: $25 credit runs out quickly

---

## Database Selection

### Decision: Supabase (PostgreSQL) Free Tier → Self-hosted Postgres (Later)

### Options Evaluated

| Feature | MongoDB Atlas | Supabase (Postgres) | Postgres Community |
|---------|---------------|---------------------|-------------------|
| **Setup Time** | 5 min | 2 min ✅ | 15-30 min |
| **Free Tier** | 512MB, Shared CPU | 500MB DB, 2GB bandwidth ✅ | N/A (hosting cost) |
| **Vector Search** | ❌ Needs $9+ tier | ✅ pgvector included | ✅ Manual setup |
| **Auth Built-in** | ❌ | ✅ Phone OTP, JWT ✅ | ❌ |
| **Real-time** | Change Streams | ✅ Subscriptions ✅ | ❌ |
| **Admin UI** | Compass (local) | ✅ Dashboard ✅ | pgAdmin |
| **Backups** | Manual/Paid | Daily (paid tier) | Manual |
| **Connection Pooling** | Built-in | ✅ Supavisor | pgBouncer |
| **Row Level Security** | Manual | ✅ Built-in | ✅ Manual |

### Cost Breakdown

#### MongoDB Atlas
```
Free:      512MB storage, shared CPU, NO vector search
$9/month:  2GB RAM, 10GB storage, Vector Search included
$25/month: 4GB RAM, 20GB storage
```

#### Supabase
```
Free:      500MB DB, 2GB bandwidth, Auth, pgvector, RLS ✅
$25/month: 8GB DB, 50GB bandwidth, daily backups
$100/month: 64GB DB, 250GB bandwidth
```

#### Self-hosted Postgres
```
Railway:       $5 credit/month (500MB free)
Render:        $7/month (256MB RAM)
DigitalOcean:  $12/month (1GB RAM, 25GB SSD)
AWS RDS:       $15+/month (t3.micro)
```

### Rationale

**Why Supabase Free Tier (Start):**
1. ✅ **2-minute setup** - fastest path to MVP
2. ✅ **Auth included** - saves 6+ hours of OAuth/JWT implementation
3. ✅ **pgvector ready** - semantic search without configuration
4. ✅ **Real-time subscriptions** - useful for admin dashboards
5. ✅ **Admin UI** - query/debug data during development
6. ✅ **Row Level Security** - authorization built-in (Slice 4)
7. ✅ **$0 cost** for months 1-3 (within free tier limits)
8. ✅ **Standard PostgreSQL** - easy migration path

**Why NOT MongoDB:**
- ❌ Vector search requires $9/month minimum
- ❌ No built-in auth
- ❌ Horizontal scaling overkill for MVP
- ❌ Different query language (harder to migrate)

**Why NOT Self-hosted Postgres (Initially):**
- ❌ 15-30 min setup time
- ❌ Manual auth implementation
- ❌ Manual backup setup
- ❌ Server maintenance overhead
- ❌ $4-15/month hosting cost immediately

---

## Migration Strategy

### Phase 1: Supabase Free Tier (Months 1-3)

**Use until hitting limits:**
- 500MB database storage
- 2GB bandwidth/month
- 50,000 monthly active users

**What you get:**
- ✅ Supabase Auth (Phone OTP)
- ✅ pgvector for semantic search
- ✅ Real-time subscriptions
- ✅ Admin dashboard
- ✅ Automatic SSL
- ✅ Connection pooling

### Phase 2: Supabase Pro (Months 4-6)

**Upgrade when:**
- Database > 500MB
- Bandwidth > 2GB/month
- Need daily backups
- Need better performance

**Cost:** $25/month
- 8GB database
- 50GB bandwidth
- Daily backups
- Dedicated resources

### Phase 3: Self-hosted Postgres (Months 6+)

**Migrate when:**
- Cost optimization needed (> $100/month on Supabase)
- Need full control over database
- Custom extensions/configurations required
- Compliance requirements

### Migration Process (When Needed)

````bash
# Step 1: Export from Supabase
pg_dump -h db.xxx.supabase.co \
        -U postgres \
        -d postgres \
        --no-owner \
        --no-acl \
        > backup.sql

# Step 2: Setup self-hosted Postgres
# Install Postgres + pgvector extension
apt-get install postgresql postgresql-contrib
git clone https://github.com/pgvector/pgvector.git
cd pgvector && make && make install

# Step 3: Import data
psql -h your-server.com \
     -U postgres \
     -d communityconnect \
     < backup.sql

# Step 4: Update environment variables
# SUPABASE_URL → DATABASE_URL
# SUPABASE_ANON_KEY → (remove)
# SUPABASE_SERVICE_KEY → (remove)
````

#### What Changes During Migration

Lost Features:

❌ Supabase Auth → Replace with jsonwebtoken + custom OTP
❌ Supabase Dashboard → Use pgAdmin/TablePlus
❌ Automatic backups → Setup cron jobs
❌ Edge Functions → Use Express routes (already doing this)
❌ Real-time subscriptions → Use WebSockets if needed
Unchanged Features:

✅ All SQL schemas (standard Postgres)
✅ pgvector queries (same syntax)
✅ Row Level Security policies
✅ Connection pooling (add pgBouncer)
✅ Application code (minimal changes)

#### Code Abstraction for Easy Migration
````bash
// Database abstraction layer
export interface DatabaseService {
  query(sql: string, params: any[]): Promise<any>;
  transaction(queries: Array<{sql: string, params: any[]}>): Promise<void>;
}

// Supabase implementation
class SupabaseDB implements DatabaseService {
  async query(sql: string, params: any[]) {
    return supabase.rpc('execute_sql', { query: sql, params });
  }
}

// Postgres implementation
class PostgresDB implements DatabaseService {
  async query(sql: string, params: any[]) {
    return pool.query(sql, params);
  }
}

// Switch via environment variable
export const db: DatabaseService = 
  process.env.DB_PROVIDER === 'supabase' 
    ? new SupabaseDB() 
    : new PostgresDB();
````