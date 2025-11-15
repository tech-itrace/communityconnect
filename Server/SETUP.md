# Community Search - Setup Instructions

## Prerequisites

1. **Node.js** (v20 or higher)
2. **PostgreSQL** (v15 or higher) with **pgvector** extension
3. **DeepInfra API Key** (for LLM and embeddings)

## Database Setup Options

### Option 1: Using Supabase (Recommended)

**📖 See detailed guide**: `SUPABASE-SETUP.md`

Quick steps:
1. Create a free account at [https://supabase.com](https://supabase.com)
2. Create a new project (save your password!)
3. Get connection string from Settings → Database → Connection String → **URI**
4. Format: `postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres`
5. The pgvector extension is pre-installed on Supabase

### Option 2: Local PostgreSQL

1. Install PostgreSQL 15+
2. Install pgvector extension:
   ```bash
   # macOS with Homebrew
   brew install pgvector
   
   # Or follow instructions at: https://github.com/pgvector/pgvector
   ```
3. Create a database:
   ```bash
   createdb community_connect
   ```

## Environment Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your configuration:
   ```bash
   NODE_ENV=development
   PORT=3000
   
   # Multi-Provider LLM Configuration
   LLM_PROVIDER_PRIMARY=deepinfra         # Primary provider
   LLM_PROVIDER_FALLBACK=google_gemini    # Fallback provider
   LLM_ENABLE_RETRY_BACKOFF=true          # Exponential backoff
   LLM_RETRY_DELAY_MS=1000                # Base retry delay
   LLM_MAX_RETRIES=3                      # Max retry attempts
   
   # API Keys
   DEEPINFRA_API_KEY=your_deepinfra_key_here
   GOOGLE_API_KEY=your_google_api_key_here  # Optional (for fallback)
   
   # Database Configuration
   DATABASE_URL=postgresql://user:password@localhost:5432/community_connect
   # Or for Supabase:
   # DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
   
   # Redis (for sessions and rate limiting)
   REDIS_URL=redis://localhost:6379
   ```

3. **Get API Keys**:
   
   **DeepInfra (Required):**
   - Go to [https://deepinfra.com](https://deepinfra.com)
   - Sign up and create an API key
   - Provides: Llama 3.1 8B (inference) + BAAI/bge-base-en-v1.5 (embeddings)
   - Free tier: 50 requests/minute
   
   **Google Gemini (Optional, for fallback):**
   - Go to [https://makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)
   - Create API key
   - Enable "Generative Language API" in Google Cloud Console
   - Setup billing account (required)
   - Provides: Gemini 2.0 Flash (inference) + text-embedding-004 (embeddings)
   - Free tier: 15 requests/minute
   
   **Comparison:**
   - DeepInfra: Cheaper, open-source models, good for development
   - Gemini: Faster responses, better JSON formatting, good for production
   - Recommended: Use both with automatic fallback

## Installation Steps

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Set Up Database Schema

This creates all necessary tables (community_members, member_embeddings, search_queries, search_cache) and indexes:

```bash
npm run db:setup
```

Expected output:
```
[Setup] Starting database setup...
[Setup] Enabling pgvector extension...
[Setup] ✓ pgvector extension enabled
[Setup] Creating community_members table...
[Setup] ✓ community_members table created
...
[Setup] ✅ Database setup completed successfully!
```

### Step 3: Import Member Data

This imports the 48 members from `data/CommunityMemberDetails.csv`:

```bash
npm run import:members
```

Expected output:
```
[Import] Starting member import...
[Import] Parsed 48 members from CSV
[Import] Inserting members into database...
[Import] ✅ Successfully imported 48 members!
[Import] Database statistics:
  - Total members: 48
  - Unique cities: 12
  - Unique degrees: 5
  - Members with email: 48
```

### Step 4: Generate AI Embeddings

This generates semantic embeddings for all members using DeepInfra (takes 1-2 minutes):

```bash
npm run generate:embeddings
```

Expected output:
```
[Embeddings] Starting embeddings generation...
[Embeddings] Using DeepInfra BAAI/bge-base-en-v1.5 model (768 dimensions)
[Embeddings] Found 48 members to process
[Embeddings] Processing: Mr. Udhayakumar Ulaganathan...
[Embeddings] Processed 5/48 members...
...
[Embeddings] ✅ Generation completed!
  - Successfully processed: 48/48
  - Errors: 0
  - Embeddings in database: 48
```

**Note**: This step uses DeepInfra API and will cost approximately $0.005 (even cheaper than OpenAI!)

### Step 5: Start the Server

```bash
npm run dev
```

Expected output:
```
[DB] Connected to PostgreSQL database
Server running on http://localhost:3000
```

## Verification

### 1. Test Server Health

```bash
curl http://localhost:3000/api/health
```

### 2. Test LLM Providers

```bash
# Test multi-provider system
npm test llmFactory

# Expected output:
# ✓ should initialize with available providers
# ✓ should generate text with primary provider
# ✓ should fallback to secondary provider when primary fails
# ✓ All tests passing (7/7)
```

### 3. Test Natural Language Query

```bash
curl http://localhost:3000/api/search \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Find 1995 batch mechanical engineers",
    "phoneNumber": "9876543210"
  }'
```

### 4. Verify Embeddings

```bash
# Check embedding count
psql $DATABASE_URL -c "SELECT COUNT(*) FROM member_embeddings;"

# Should return: 48
```

## Testing the Multi-Provider System

### Quick LLM Test

Run the comprehensive LLM test suite:

```bash
# Fast mode (for development)
LLM_ENABLE_RETRY_BACKOFF=false LLM_RETRY_DELAY_MS=100 npm test llmFactory

# Full suite
npm test llmServiceDomainSpecific
```

### Test Provider Fallback

```bash
# Test with DeepInfra primary
LLM_PROVIDER_PRIMARY=deepinfra npm test llmFactory

# Test with Gemini primary  
LLM_PROVIDER_PRIMARY=google_gemini npm test llmFactory

# Test DeepInfra only (no fallback)
LLM_PROVIDER_FALLBACK=none npm test llmFactory
```

## Troubleshooting

### "Cannot connect to database"

- Check your `DATABASE_URL` in `.env`
- Verify PostgreSQL is running
- Test connection: `psql $DATABASE_URL`

### "pgvector extension not found"

- For Supabase: pgvector is pre-installed
- For local PostgreSQL: Install pgvector following [installation guide](https://github.com/pgvector/pgvector#installation)

### "DeepInfra API error"

- Verify your `DEEPINFRA_API_KEY` is correct
- Check you have credits in your DeepInfra account
- Rate limits: Script adds 100ms delay between requests

### "CSV file not found"

- Verify the file exists at: `Server/data/CommunityMemberDetails.csv`
- Check file path in `src/scripts/importMembers.ts`

## Next Steps

After setup is complete:

1. ✅ Database configured and populated
2. ✅ Embeddings generated
3. ⏳ Implement search endpoints (Phase 2)
4. ⏳ Add natural language processing (Phase 3)
5. ⏳ Integrate with WhatsApp (Phase 4)

## Database Schema

### Tables Created

1. **community_members** - Member profiles (48 rows)
2. **member_embeddings** - AI embeddings for semantic search (48 rows)
3. **search_queries** - Analytics and query tracking (empty)
4. **search_cache** - Performance optimization (empty)

### Verify Data

```sql
-- Check members count
SELECT COUNT(*) FROM community_members;

-- Check embeddings count
SELECT COUNT(*) FROM member_embeddings;

-- View sample member
SELECT name, city, working_knowledge, organization_name 
FROM community_members 
LIMIT 1;
```

## Cost Estimation

### One-time Setup Costs:
- Generating 96 embeddings (48 members × 2 embeddings each): ~$0.005 with DeepInfra

### Monthly Operating Costs (1000 queries):
- DeepInfra embeddings: ~$0.005
- DeepInfra LLM: ~$0.05
- Database (Supabase): Free tier
- **Total: ~$0.055/month**

**Benefits of using DeepInfra**:
- Single API key for both LLM and embeddings
- More cost-effective than OpenAI
- 768-dimensional embeddings (smaller, faster)

## Development Commands

```bash
# Development server with auto-reload
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run tests
npm test

# Database setup
npm run db:setup

# Import members
npm run import:members

# Generate embeddings
npm run generate:embeddings
```

## Support

- **Documentation**: See `/docs` folder
- **Issues**: Create GitHub issue
- **Questions**: Contact tech-itrace team

---

**Status**: Phase 1 Complete - Ready for Phase 2 (Search Implementation)
