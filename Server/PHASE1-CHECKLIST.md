# Phase 1 Setup Checklist

**Status**: Ready to execute  
**Date**: October 19, 2025

---

## ✅ Pre-Setup (Complete)

- [x] Dependencies installed
- [x] Scripts created (setupDatabase, importMembers, generateEmbeddings)
- [x] Switched to DeepInfra embeddings (768 dimensions)
- [x] Documentation updated
- [x] Package.json configured

---

## 📋 Your Action Items

### 1. Configure Environment Variables

```bash
cd Server
cp .env.example .env
```

Edit `.env` file with:
```bash
NODE_ENV=development
PORT=3000

# Your DeepInfra API Key (same one you already have!)
DEEPINFRA_API_KEY=your_actual_key_here

# Database connection string
# Option A - Supabase (Recommended):
DATABASE_URL=postgresql://postgres:[YOUR_PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres

# Option B - Local PostgreSQL:
DATABASE_URL=postgresql://user:password@localhost:5432/community_connect
```

**Need help?**
- **Supabase**: See `SUPABASE-SETUP.md` for detailed guide
  - Quick: https://supabase.com → Create project → Settings → Database → Connection String → **URI tab**
- **Local**: Install PostgreSQL and create database

---

### 2. Run Setup Scripts

```bash
# Step 1: Create database tables and indexes
npm run db:setup

# Step 2: Import 48 members from CSV
npm run import:members

# Step 3: Generate embeddings with DeepInfra
npm run generate:embeddings

# Step 4: Start the server
npm run dev
```

---

## 🎯 Expected Results

### After `npm run db:setup`:
```
[Setup] ✅ Database setup completed successfully!
[Setup] Tables created:
  - community_members (with indexes)
  - member_embeddings (with vector indexes)
  - search_queries (analytics)
  - search_cache (performance)
```

### After `npm run import:members`:
```
[Import] ✅ Successfully imported 48 members!
[Import] Database statistics:
  - Total members: 48
  - Unique cities: 12
  - Members with email: 48
```

### After `npm run generate:embeddings`:
```
[Embeddings] Using DeepInfra BAAI/bge-base-en-v1.5 model (768 dimensions)
[Embeddings] ✅ Generation completed!
  - Successfully processed: 48/48
  - Embeddings in database: 48
```

### After `npm run dev`:
```
[DB] Connected to PostgreSQL database
Server running on http://localhost:3000
```

---

## 🔧 Database Options

### Option 1: Supabase (Recommended - Easiest)

**Why Supabase?**
- ✅ Free tier available
- ✅ pgvector pre-installed
- ✅ No local setup needed
- ✅ Production-ready
- ✅ Automatic backups

**Setup Steps**:
1. Go to https://supabase.com
2. Sign up (free)
3. Create new project (save your database password!)
4. Wait 2 minutes for setup
5. Go to Settings → Database → Connection String
6. Click **URI** tab (not "Connection parameters")
7. Copy the connection string
8. Replace `[YOUR-PASSWORD]` with your actual password
9. Add to `.env` as `DATABASE_URL`

**Connection String Format**:
```
postgresql://postgres.[project-ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:5432/postgres
```

**Note**: Use the **transaction pooler** (port 6543) or **direct connection** (port 5432).
See `SUPABASE-SETUP.md` for detailed instructions and troubleshooting.

---

### Option 2: Local PostgreSQL

**Requirements**:
- PostgreSQL 15+
- pgvector extension

**macOS Setup**:
```bash
# Install PostgreSQL
brew install postgresql@15
brew install pgvector

# Start PostgreSQL
brew services start postgresql@15

# Create database
createdb community_connect

# Test connection
psql community_connect
```

**Linux/Ubuntu Setup**:
```bash
# Install PostgreSQL
sudo apt install postgresql-15 postgresql-contrib

# Install pgvector
git clone https://github.com/pgvector/pgvector.git
cd pgvector
make
sudo make install

# Create database
sudo -u postgres createdb community_connect
```

---

## 💰 Cost Estimate

**DeepInfra API Usage**:
- Embeddings generation (one-time): ~$0.005
- Monthly queries (1000): ~$0.055

**Database**:
- Supabase free tier: $0
- Local PostgreSQL: $0

**Total**: Less than $0.10/month! 🎉

---

## 🆘 Troubleshooting

### Issue: "Cannot find module 'pg'"
**Solution**: Run `npm install` again

### Issue: "Cannot connect to database"
**Solution**: 
- Check `DATABASE_URL` in `.env`
- For Supabase: Verify password and project reference
- For local: Check PostgreSQL is running: `pg_isready`

### Issue: "pgvector extension not found"
**Solution**:
- Supabase: Pre-installed, no action needed
- Local: Install pgvector (see Option 2 above)

### Issue: "DeepInfra API error"
**Solution**:
- Verify `DEEPINFRA_API_KEY` in `.env`
- Check you have credits: https://deepinfra.com/dash
- Verify key at: https://deepinfra.com/dash/api_keys

### Issue: "CSV file not found"
**Solution**:
- File should be at: `Server/data/CommunityMemberDetails.csv`
- Verify with: `ls -la Server/data/`

---

## ✅ Verification Commands

After setup, verify everything works:

```bash
# 1. Check database tables
psql $DATABASE_URL -c "\dt"
# Should show: community_members, member_embeddings, search_queries, search_cache

# 2. Check member count
psql $DATABASE_URL -c "SELECT COUNT(*) FROM community_members;"
# Should show: 48

# 3. Check embeddings count
psql $DATABASE_URL -c "SELECT COUNT(*) FROM member_embeddings;"
# Should show: 48

# 4. Check embedding dimensions
psql $DATABASE_URL -c "SELECT vector_dims(profile_embedding) FROM member_embeddings LIMIT 1;"
# Should show: 768

# 5. Test server
curl http://localhost:3000/api/messages/ \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello"}'
# Should return a response from the bot
```

---

## 📊 What You'll Have After Setup

### Database:
- ✅ 48 member profiles
- ✅ 96 embeddings (2 per member)
- ✅ Full-text search indexes
- ✅ Vector similarity indexes

### Ready for Phase 2:
- ✅ Search by skills
- ✅ Search by location
- ✅ Search by services
- ✅ Semantic/AI search

---

## 🚀 After Setup is Complete

Once all scripts run successfully, let me know! We'll move to:

**Phase 2**: Implementing search endpoints
- Build structured search API
- Add semantic search
- Create natural language query processing

---

## 📞 Need Help?

If you encounter any issues:
1. Check the error message carefully
2. Review the troubleshooting section above
3. Check `SETUP.md` for detailed instructions
4. Let me know the specific error and I'll help!

---

## 🎯 Current Status

**What's Done**:
- ✅ All code written
- ✅ Dependencies configured
- ✅ Scripts ready to run
- ✅ Documentation complete

**What You Need to Do**:
1. ⏳ Set up database (Supabase or local)
2. ⏳ Configure `.env` file
3. ⏳ Run the 3 setup scripts
4. ⏳ Verify everything works

**Estimated Time**: 15-20 minutes

---

**Ready to start? Let's go!** 🚀

**Next**: Configure your `.env` file and run `npm run db:setup`
