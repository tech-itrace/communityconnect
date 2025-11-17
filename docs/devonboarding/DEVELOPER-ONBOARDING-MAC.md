# 🍎 Developer Onboarding Guide - macOS

**Complete setup guide for new developers starting with an empty PostgreSQL database**

---

## 📋 Prerequisites

Before starting, ensure you have:

1. **macOS** (10.15 Catalina or later)
2. **Internet connection** (for downloading dependencies)
3. **Terminal access** (Applications → Utilities → Terminal)
4. **Admin privileges** (for installing software)

---

## 🛠️ Step 1: Install Required Software

### 1.1 Install Homebrew (Package Manager)

Open Terminal and run:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

After installation, follow the on-screen instructions to add Homebrew to your PATH.

Verify installation:
```bash
brew --version
```

**Expected output:** `Homebrew 4.x.x`

---

### 1.2 Install Node.js (v20+)

```bash
brew install node@20
brew link node@20
```

Verify installation:
```bash
node --version    # Should show v20.x.x
npm --version     # Should show 10.x.x
```

---

### 1.3 Install PostgreSQL 16 with pgvector

```bash
# Install PostgreSQL
brew install postgresql@16

# Install pgvector extension
brew install pgvector

# Add PostgreSQL to PATH
echo 'export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

Verify installation:
```bash
psql --version    # Should show psql (PostgreSQL) 16.x
```

---

### 1.4 Install Redis

```bash
brew install redis
```

Verify installation:
```bash
redis-cli --version    # Should show redis-cli 7.x.x
```

---

### 1.5 Install Git (if not already installed)

```bash
brew install git
```

Verify:
```bash
git --version
```

---

## 🗄️ Step 2: Set Up PostgreSQL Database

### 2.1 Start PostgreSQL Service

```bash
# Start PostgreSQL (runs in background)
brew services start postgresql@16

# Check status
brew services list | grep postgresql
```

**Expected output:** `postgresql@16 started`

---

### 2.2 Create Database and User

```bash
# Create a new PostgreSQL user
createuser -s community_user

# Set password for the user
psql postgres -c "ALTER USER community_user WITH PASSWORD 'dev_password_123';"

# Create the database
createdb -O community_user community_connect

# Verify database was created
psql -U community_user -d community_connect -c "\conninfo"
```

**Expected output:**
```
You are connected to database "community_connect" as user "community_user"...
```

---

### 2.3 Enable pgvector Extension

```bash
psql -U community_user -d community_connect -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

Verify:
```bash
psql -U community_user -d community_connect -c "SELECT * FROM pg_extension WHERE extname = 'vector';"
```

**Expected output:** Row showing the vector extension

---

## 🔴 Step 3: Set Up Redis

### 3.1 Start Redis Service

```bash
# Start Redis (runs in background)
brew services start redis

# Check status
brew services list | grep redis
```

**Expected output:** `redis started`

### 3.2 Test Redis Connection

```bash
redis-cli ping
```

**Expected output:** `PONG`

---

## 📦 Step 4: Clone and Set Up Project

### 4.1 Clone Repository

```bash
# Navigate to your projects directory
cd ~/Documents/Projects

# Clone the repository (replace with your repo URL)
git clone https://github.com/tech-itrace/communityconnect.git
cd communityconnect
```

---

### 4.2 Set Up Backend

```bash
# Navigate to Server directory
cd Server

# Install dependencies
npm install
```

**Expected output:** Dependencies installed without errors

---

### 4.3 Configure Environment Variables

```bash
# Copy example environment file
cp .env.example .env

# Open .env file in your default editor
nano .env
```

**Configure the following variables:**

```bash
NODE_ENV=development
PORT=3000

# AI/LLM Configuration
LLM_PROVIDER_PRIMARY=deepinfra
LLM_PROVIDER_FALLBACK=google_gemini
LLM_ENABLE_RETRY_BACKOFF=true
LLM_RETRY_DELAY_MS=1000
LLM_MAX_RETRIES=3

# DeepInfra API Key (REQUIRED)
DEEPINFRA_API_KEY=your_actual_deepinfra_key_here

# Google API Key (Optional - for fallback)
GOOGLE_API_KEY=your_actual_google_key_here

# Database Configuration (use exact connection string)
DATABASE_URL=postgresql://community_user:dev_password_123@localhost:5432/community_connect

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=
REDIS_TLS=false

# Rate Limiting Configuration
RATE_LIMIT_MESSAGES_PER_HOUR=50
RATE_LIMIT_SEARCHES_PER_HOUR=30
```

**Save and exit:** Press `Ctrl+X`, then `Y`, then `Enter`

---

### 4.4 Get API Keys

#### **DeepInfra API Key (Required)**

1. Go to [https://deepinfra.com](https://deepinfra.com)
2. Sign up for a free account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key and paste it in `.env` as `DEEPINFRA_API_KEY`

**Features:**
- Free tier: 50 requests/minute
- Models: Llama 3.1 8B (inference) + BAAI/bge-base-en-v1.5 (embeddings)
- Cost: ~$0.005 for initial embedding generation

#### **Google Gemini API Key (Optional)**

1. Go to [https://makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)
2. Create API key
3. Enable "Generative Language API" in Google Cloud Console
4. Set up billing (required but has free tier)
5. Copy key and paste in `.env` as `GOOGLE_API_KEY`

**Features:**
- Free tier: 15 requests/minute
- Models: Gemini 2.0 Flash + text-embedding-004
- Serves as automatic fallback if DeepInfra fails

---

## 🚀 Step 5: Initialize Database

### 5.1 Verify Environment

```bash
# Make sure you're in /Server directory
cd Server

# Run environment check
chmod +x check-environment.sh
./check-environment.sh
```

**Expected output:** All green checkmarks ✅

If any checks fail, review previous steps before continuing.

---

### 5.2 Create Database Tables

This creates all necessary tables and indexes:

```bash
npm run db:setup
```

**Expected output:**
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
[Setup] Creating search_queries table...
[Setup] ✓ search_queries table created
[Setup] Creating search_cache table...
[Setup] ✓ search_cache table created
[Setup] ✅ Database setup completed successfully!
```

---

### 5.3 Verify Tables Created

```bash
psql -U community_user -d community_connect -c "\dt"
```

**Expected output:** List of tables including:
- `community_members`
- `member_embeddings`
- `search_queries`
- `search_cache`

---

## 📊 Step 6: Import Member Data

### 6.1 Prepare CSV Data

The project includes a sample CSV file at:
```
Server/data/CommunityMemberDetails.csv
```

**CSV Format Required:**
- Name
- Year of Graduation
- Degree
- Branch
- Working Knowledge
- Email
- Phone number
- Address
- City / Town of Living
- Organization Name:
- Designation:
- Annual Turnover

### 6.2 Import Members from CSV

```bash
npm run import:members
```

**Expected output:**
```
[Import] Starting member import...
[Import] Reading CSV from: /path/to/CommunityMemberDetails.csv
[Import] Parsed 48 members from CSV
[Import] Clearing existing members...
[Import] Inserting members into database...
[Import] ✅ Successfully imported 48 members!
[Import] Database statistics:
  - Total members: 48
  - Unique cities: 12
  - Unique degrees: 5
  - Members with email: 48
  - Members with phone: 45
```

### 6.3 Verify Data Import

```bash
psql -U community_user -d community_connect -c "SELECT COUNT(*) FROM community_members;"
```

**Expected output:** Count showing 48 (or your CSV row count)

---

## 🤖 Step 7: Generate AI Embeddings

This step creates semantic vectors for intelligent search functionality.

### 7.1 Generate Embeddings

```bash
npm run generate:embeddings
```

**Expected output:**
```
[Embeddings] Starting embeddings generation...
[Embeddings] Using LLM Factory with automatic provider fallback
[Embeddings] Providers: DeepInfra (BAAI/bge-base-en-v1.5) → Gemini (text-embedding-004)
[Embeddings] Both models produce 768-dimensional embeddings
[Embeddings] Found 48 members to process
[Embeddings] Processing: Mr. Udhayakumar Ulaganathan...
[Embeddings] Processed 5/48 members...
[Embeddings] Processed 10/48 members...
...
[Embeddings] ✅ Generation completed!
  - Successfully processed: 48/48
  - Errors: 0
  - Embeddings in database: 48
```

**Time:** ~1-2 minutes depending on API response times  
**Cost:** ~$0.005 (very inexpensive!)

### 7.2 Verify Embeddings Created

```bash
psql -U community_user -d community_connect -c "SELECT COUNT(*) FROM member_embeddings;"
```

**Expected output:** Count matching number of members (48)

---

## ✅ Step 8: Verify Installation

### 8.1 Start Backend Server

```bash
npm run dev
```

**Expected output:**
```
[DB] Connected to PostgreSQL database
[Redis] Connected to Redis
Server running on http://localhost:3000
```

**Keep this terminal open** - the server is now running.

---

### 8.2 Test API Health (New Terminal)

Open a **new terminal window** and run:

```bash
curl http://localhost:3000/api/health
```

**Expected output:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-17T...",
  "database": "connected",
  "redis": "connected"
}
```

---

### 8.3 Test Search Functionality

```bash
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Find software engineers in Bangalore",
    "phoneNumber": "9876543210"
  }'
```

**Expected output:** JSON response with matching members

---

## 🎨 Step 9: Set Up Frontend Dashboard

### 9.1 Install Frontend Dependencies

Open a **new terminal window**:

```bash
# Navigate to dashboard directory
cd ~/Documents/Projects/communityconnect/dashboard

# Install dependencies
npm install
```

---

### 9.2 Configure Frontend Environment

```bash
# Create .env file
cat > .env << EOF
VITE_API_URL=http://localhost:3000
VITE_TEST_PHONE_NUMBER=9876543210
EOF
```

---

### 9.3 Start Frontend Server

```bash
npm run dev
```

**Expected output:**
```
VITE v5.x.x  ready in 500 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

---

### 9.4 Access Dashboard

1. Open browser: http://localhost:5173
2. Open browser console (F12 or Cmd+Option+I)
3. Set test phone number:
   ```javascript
   localStorage.setItem('userPhone', '9876543210')
   ```
4. Refresh page
5. Navigate to "Members" section

You should see the imported member list!

---

## 🎯 Step 10: Common Operations

### View Logs

**Backend logs:**
- Already visible in the terminal running `npm run dev`

**Database queries:**
```bash
psql -U community_user -d community_connect
```

### Stop Services

```bash
# Stop PostgreSQL
brew services stop postgresql@16

# Stop Redis
brew services stop redis

# Stop backend (Ctrl+C in terminal running npm run dev)
# Stop frontend (Ctrl+C in terminal running npm run dev)
```

### Restart Services

```bash
# Start PostgreSQL
brew services start postgresql@16

# Start Redis
brew services start redis
```

### Re-import Data (Clear and Reimport)

```bash
cd Server
npm run import:members
npm run generate:embeddings
```

### Add More Members

1. Edit `Server/data/CommunityMemberDetails.csv`
2. Run `npm run import:members`
3. Run `npm run generate:embeddings`

---

## 🐛 Troubleshooting

### PostgreSQL Connection Issues

**Error:** `FATAL: password authentication failed`

**Solution:**
```bash
psql postgres -c "ALTER USER community_user WITH PASSWORD 'dev_password_123';"
```

### pgvector Extension Not Found

**Error:** `extension "vector" does not exist`

**Solution:**
```bash
brew reinstall pgvector
psql -U community_user -d community_connect -c "CREATE EXTENSION vector;"
```

### Redis Connection Failed

**Error:** `Could not connect to Redis`

**Solution:**
```bash
# Check if Redis is running
brew services list | grep redis

# If not started
brew services start redis

# Test connection
redis-cli ping
```

### Port Already in Use

**Error:** `Port 3000 is already in use`

**Solution:**
```bash
# Find process using port 3000
lsof -ti:3000

# Kill the process (replace PID with actual number)
kill -9 <PID>
```

### API Key Issues

**Error:** `DEEPINFRA_API_KEY not found`

**Solution:**
1. Verify `.env` file exists in `Server/` directory
2. Check API key is correctly pasted (no extra spaces)
3. Restart server after updating `.env`

### Embedding Generation Fails

**Error:** `Error generating embedding`

**Solution:**
1. Check API key is valid
2. Verify internet connection
3. Check DeepInfra API status: https://deepinfra.com/status
4. If using Gemini fallback, verify `GOOGLE_API_KEY` is set

---

## 📚 Next Steps

### Recommended Documentation

1. **Architecture Overview:** `/docs/ARCHITECTURE-DIAGRAM.md`
2. **API Testing Guide:** `/Server/API-TESTING-GUIDE.md`
3. **Smart Auth System:** `/docs/SMART-AUTH-COMPLETE.md`
4. **WhatsApp Bot Setup:** `/docs/START-HERE.md`

### Development Workflow

**Daily development:**

Terminal 1:
```bash
cd Server
npm run dev
```

Terminal 2:
```bash
cd dashboard
npm run dev
```

Terminal 3 (for testing):
```bash
cd Server
./test-whatsapp-local.sh
```

---

## ✅ Verification Checklist

Before starting development, ensure:

- [ ] PostgreSQL running and accessible
- [ ] Redis running and responsive
- [ ] Database tables created successfully
- [ ] Member data imported (48+ members)
- [ ] Embeddings generated successfully
- [ ] Backend server starts without errors
- [ ] Frontend dashboard loads correctly
- [ ] API health check returns `200 OK`
- [ ] Search query returns results
- [ ] No errors in browser console

---

## 🆘 Getting Help

If you encounter issues:

1. **Check logs:** Review terminal output for error messages
2. **Run diagnostics:** `./check-environment.sh`
3. **Review docs:** See `/docs/` folder for detailed guides
4. **Check environment:** Verify all `.env` variables are set
5. **Ask team:** Contact the development team with error logs

---

**🎉 Congratulations! Your development environment is ready!**

You can now:
- Add/edit/delete members via dashboard
- Test natural language search queries
- Develop new features
- Run tests and debug issues

Happy coding! 🚀
