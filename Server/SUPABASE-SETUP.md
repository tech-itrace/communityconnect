# Supabase Setup Guide for Community Connect

**Date**: October 19, 2025  
**Database**: PostgreSQL with pgvector via Supabase

---

## Why Direct PostgreSQL Connection?

We use **direct PostgreSQL connection** (via `pg` npm package) instead of Supabase's JavaScript client because:

1. ✅ **pgvector support** - Direct SQL access to vector operations
2. ✅ **Raw SQL queries** - Full control over complex queries
3. ✅ **Better performance** - Direct connection pooling
4. ✅ **Migration scripts** - Can run DDL statements

**Note**: Supabase JS client is for simple CRUD operations. We need advanced features.

---

## Getting Your Supabase Connection String

### Step 1: Create Supabase Project

1. Go to https://supabase.com
2. Click "New Project"
3. Fill in:
   - **Name**: `community-connect` (or your choice)
   - **Database Password**: Create a strong password (SAVE THIS!)
   - **Region**: Choose closest to you
4. Click "Create new project"
5. Wait 2-3 minutes for setup

### Step 2: Get Connection String

1. In your Supabase dashboard, go to:
   ```
   Settings → Database → Connection String
   ```

2. You'll see two tabs:
   - **URI** ← Use this one!
   - **Connection parameters**

3. Copy the **URI** format:
   ```
   postgresql://postgres.[project-ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:5432/postgres
   ```

4. **Replace** `[YOUR-PASSWORD]` with the actual password you created

### Step 3: Update .env File

```bash
cd Server
cp .env.example .env
```

Edit `.env` and paste your connection string:

```bash
NODE_ENV=development
PORT=3000

DEEPINFRA_API_KEY=your_deepinfra_key_here

# Supabase PostgreSQL connection (replace with your actual values)
DATABASE_URL=postgresql://postgres.xxxxxxxxxxxx:your-actual-password@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

---

## Connection String Formats

### ✅ Correct Format (Use This)

**Transaction Mode** (for migrations and scripts):
```bash
# From: Settings → Database → Connection String → URI
postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

**Direct Connection** (alternative):
```bash
# From: Settings → Database → Connection String → Direct connection
postgresql://postgres:[password]@db.[project-ref].supabase.com:5432/postgres
```

### ❌ Wrong Format (Don't Use)

**Supabase JS Client** (not for our use case):
```bash
SUPABASE_URL=https://[project-ref].supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Verify Connection

### Test 1: Using psql

```bash
# Test connection with psql
psql "postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"

# Once connected, test:
\dt  # List tables (should be empty initially)
\dx  # List extensions (should see pgvector after setup)
```

### Test 2: Using Node.js

Create a test file `test-db.js`:

```javascript
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('❌ Connection failed:', err.message);
    } else {
        console.log('✅ Connected! Server time:', res.rows[0].now);
    }
    pool.end();
});
```

Run:
```bash
node test-db.js
```

Expected output:
```
✅ Connected! Server time: 2025-10-19T...
```

---

## Common Issues & Solutions

### Issue 1: "Connection refused" or "timeout"

**Cause**: Wrong connection string or SSL configuration

**Solutions**:
1. Verify connection string format
2. Ensure SSL is enabled in production:
   ```typescript
   ssl: { rejectUnauthorized: false }
   ```
3. Check Supabase project is running (not paused)
4. Try direct connection instead of pooler

### Issue 2: "password authentication failed"

**Cause**: Wrong password in connection string

**Solutions**:
1. Reset password in Supabase Dashboard:
   ```
   Settings → Database → Database password → Reset
   ```
2. Update `.env` with new password
3. Ensure special characters in password are URL-encoded:
   - `@` → `%40`
   - `#` → `%23`
   - `$` → `%24`

### Issue 3: "pgvector extension not found"

**Cause**: Extension not enabled (but Supabase has it by default!)

**Solution**:
```sql
-- In psql or Supabase SQL Editor:
CREATE EXTENSION IF NOT EXISTS vector;
```

Our `db:setup` script does this automatically.

### Issue 4: "Too many connections"

**Cause**: Connection pool not properly closed or limit reached

**Solutions**:
1. Check pool configuration in `src/config/db.ts`:
   ```typescript
   max: 20,  // Max connections
   ```
2. Ensure scripts call `pool.end()` when done
3. Use Supabase connection pooler (port 6543) instead of direct (5432)

---

## Supabase-Specific Configuration

### SSL Configuration

Supabase **requires SSL** in production. Our config handles this:

```typescript
// src/config/db.ts
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' 
        ? { rejectUnauthorized: false } 
        : false,
    // ... other options
});
```

For development with Supabase, you can force SSL:

```typescript
ssl: { rejectUnauthorized: false }  // Always use SSL
```

### Connection Pooling

Supabase offers two connection modes:

| Mode | Port | Use Case | Connection String |
|------|------|----------|-------------------|
| **Transaction** | 6543 | Migrations, scripts | Pooler URL (recommended) |
| **Direct** | 5432 | Long-running connections | Direct URL |

**For our scripts**: Use port 6543 (transaction mode)

---

## Environment Variables Explained

```bash
# Required for LLM and embeddings
DEEPINFRA_API_KEY=your_key_here

# Required for database
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres

# Optional (for development)
NODE_ENV=development  # or 'production'
PORT=3000
```

### What We DON'T Need

These are **not required** for our setup:

```bash
# ❌ Not needed (for Supabase JS client only)
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

---

## Running Setup Scripts

### 1. Setup Database Schema

```bash
npm run db:setup
```

**What it does**:
- Enables pgvector extension
- Creates 4 tables (community_members, member_embeddings, search_queries, search_cache)
- Creates indexes (GIN for full-text, IVFFlat for vectors)
- Creates triggers for automatic full-text search updates

**Expected output**:
```
[Setup] Starting database setup...
[Setup] Enabling pgvector extension...
[Setup] ✓ pgvector extension enabled
[Setup] Creating community_members table...
[Setup] ✓ community_members table created
[Setup] Creating indexes for community_members...
[Setup] ✓ Indexes created for community_members
[Setup] Creating member_embeddings table...
[Setup] ✓ member_embeddings table created
[Setup] Creating vector indexes...
[Setup] ✓ Vector indexes created
[Setup] ✅ Database setup completed successfully!
```

**If it fails**:
- Check DATABASE_URL in .env
- Verify Supabase project is active
- Test connection with psql
- Check error message for specific issue

### 2. Import Members

```bash
npm run import:members
```

**What it does**:
- Reads CSV file
- Validates data
- Inserts 48 members
- Shows statistics

### 3. Generate Embeddings

```bash
npm run generate:embeddings
```

**What it does**:
- Generates embeddings using DeepInfra
- Stores in member_embeddings table
- Uses 768-dimensional vectors

---

## Verifying Setup

### Check Tables

```bash
psql "$DATABASE_URL" -c "\dt"
```

Expected tables:
- community_members
- member_embeddings
- search_queries
- search_cache

### Check Extensions

```bash
psql "$DATABASE_URL" -c "\dx"
```

Should show:
- pgvector

### Check Data

```bash
# Count members
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM community_members;"
# Expected: 48

# Count embeddings
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM member_embeddings;"
# Expected: 48

# Check vector dimensions
psql "$DATABASE_URL" -c "SELECT vector_dims(profile_embedding) FROM member_embeddings LIMIT 1;"
# Expected: 768
```

---

## Supabase Dashboard Tools

### SQL Editor

Run queries directly:
1. Go to SQL Editor in dashboard
2. Create new query
3. Run SQL:
   ```sql
   SELECT name, city, working_knowledge 
   FROM community_members 
   LIMIT 10;
   ```

### Table Editor

View data with UI:
1. Go to Table Editor
2. Select `community_members`
3. Browse/edit data

### Database

Monitor:
- Disk usage
- Connection count
- Query performance

---

## Security Best Practices

### 1. Never Commit .env

```bash
# .gitignore should include:
.env
.env.local
.env.*.local
```

### 2. Use Strong Passwords

Supabase generates strong passwords. Use them!

### 3. Rotate Keys

Change database password periodically:
```
Settings → Database → Database password → Reset
```

### 4. Use Service Role Carefully

If you need it later, service role key has admin access. Keep secure.

---

## Cost & Limits

### Free Tier (Supabase)

- ✅ 500 MB database
- ✅ 5 GB bandwidth
- ✅ 2 GB file storage
- ✅ Pauses after 1 week of inactivity

**For 48 members**: Well within free tier!

### Upgrading

If needed, Pro plan ($25/month):
- 8 GB database
- 250 GB bandwidth
- No pause on inactivity

---

## Troubleshooting Checklist

- [ ] Copied connection string from Supabase Dashboard
- [ ] Replaced `[YOUR-PASSWORD]` with actual password
- [ ] Using URI format (not JS client keys)
- [ ] Added to `.env` file as `DATABASE_URL`
- [ ] Used port 6543 (transaction mode) or 5432 (direct)
- [ ] SSL is enabled in config
- [ ] Supabase project is active (not paused)
- [ ] DEEPINFRA_API_KEY is set
- [ ] Ran `npm install` after updating packages

---

## Quick Reference

### Connection String Template

```bash
# Transaction mode (recommended for scripts)
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres

# Direct mode
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.com:5432/postgres
```

### Where to Find Values

| Value | Location in Supabase Dashboard |
|-------|-------------------------------|
| PROJECT-REF | URL bar or Settings → General |
| PASSWORD | The one you set during project creation |
| REGION | Shows in connection string |

### Example

```bash
# Real example (with fake password):
DATABASE_URL=postgresql://postgres.abcdefghijklmnop:MySecure123Pass!@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

---

## Next Steps

After Supabase is connected:

1. ✅ Verify connection with test script
2. ✅ Run `npm run db:setup`
3. ✅ Run `npm run import:members`
4. ✅ Run `npm run generate:embeddings`
5. ✅ Run `npm run dev`
6. ✅ Move to Phase 2

---

**Need help?** Check the error message and refer to "Common Issues & Solutions" section above.
