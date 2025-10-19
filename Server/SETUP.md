# Community Search - Setup Instructions

## Prerequisites

1. **Node.js** (v20 or higher)
2. **PostgreSQL** (v15 or higher) with **pgvector** extension
3. **OpenAI API Key** (for embeddings)
4. **DeepInfra API Key** (already configured)

## Database Setup Options

### Option 1: Using Supabase (Recommended)

1. Create a free account at [https://supabase.com](https://supabase.com)
2. Create a new project
3. Get your database connection string from Settings → Database
4. The pgvector extension is pre-installed on Supabase

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
   
   # AI/LLM API Keys
   DEEPINFRA_API_KEY=your_deepinfra_key_here
   OPENAI_API_KEY=your_openai_api_key_here
   
   # Database Configuration
   DATABASE_URL=postgresql://user:password@localhost:5432/community_connect
   # Or for Supabase:
   # DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
   ```

3. **Get an OpenAI API Key**:
   - Go to [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
   - Create a new API key
   - Add it to your `.env` file

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

This generates semantic embeddings for all members (takes 1-2 minutes):

```bash
npm run generate:embeddings
```

Expected output:
```
[Embeddings] Starting embeddings generation...
[Embeddings] Found 48 members to process
[Embeddings] Processing: Mr. Udhayakumar Ulaganathan...
[Embeddings] Processed 5/48 members...
...
[Embeddings] ✅ Generation completed!
  - Successfully processed: 48/48
  - Errors: 0
  - Embeddings in database: 48
```

**Note**: This step uses OpenAI API and will cost approximately $0.01

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

Test that everything is working:

```bash
# Test basic server
curl http://localhost:3000/api/messages/ \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello"}'
```

## Troubleshooting

### "Cannot connect to database"

- Check your `DATABASE_URL` in `.env`
- Verify PostgreSQL is running
- Test connection: `psql $DATABASE_URL`

### "pgvector extension not found"

- For Supabase: pgvector is pre-installed
- For local PostgreSQL: Install pgvector following [installation guide](https://github.com/pgvector/pgvector#installation)

### "OpenAI API error"

- Verify your `OPENAI_API_KEY` is correct
- Check you have credits in your OpenAI account
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
- Generating 48 embeddings: ~$0.01

### Monthly Operating Costs (1000 queries):
- OpenAI embeddings: ~$0.01
- DeepInfra LLM: ~$0.05
- Database (Supabase): Free tier
- **Total: ~$0.06/month**

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
