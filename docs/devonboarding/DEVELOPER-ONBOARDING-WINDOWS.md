# 🪟 Developer Onboarding Guide - Windows

**Complete setup guide for new developers starting with an empty PostgreSQL database**

---

## 📋 Prerequisites

Before starting, ensure you have:

1. **Windows 10/11** (64-bit)
2. **Internet connection** (for downloading dependencies)
3. **Admin privileges** (for installing software)
4. **Windows PowerShell** or **Command Prompt**

---

## 🛠️ Step 1: Install Required Software

### 1.1 Install Node.js (v20+)

1. Download Node.js installer from: https://nodejs.org/
2. Choose **LTS version** (v20.x.x)
3. Run installer (`node-v20.x.x-x64.msi`)
4. During installation:
   - ✅ Check "Automatically install necessary tools"
   - ✅ Check "Add to PATH"
5. Click through installation wizard

**Verify installation:**

Open **PowerShell** or **Command Prompt** and run:
```powershell
node --version    # Should show v20.x.x
npm --version     # Should show 10.x.x
```

---

### 1.2 Install PostgreSQL 16 with pgvector

#### Download and Install PostgreSQL

1. Go to: https://www.postgresql.org/download/windows/
2. Download **PostgreSQL 16** installer
3. Run `postgresql-16.x-windows-x64.exe`
4. During installation:
   - Set password for `postgres` superuser: **dev_password_123** (remember this!)
   - Port: **5432** (default)
   - Locale: **Default locale**
   - ✅ Check "Stack Builder" at the end

**Add PostgreSQL to PATH:**

1. Open **System Environment Variables**:
   - Press `Win + X` → System → Advanced system settings
   - Click "Environment Variables"
   - Under "System variables", find `Path`
   - Click "Edit" → "New"
   - Add: `C:\Program Files\PostgreSQL\16\bin`
   - Click OK

2. Verify:
```powershell
# Close and reopen PowerShell
psql --version    # Should show psql (PostgreSQL) 16.x
```

#### Install pgvector Extension

**Method 1: Using Pre-built Binaries**

1. Download pgvector for Windows from: https://github.com/pgvector/pgvector/releases
2. Download `pgvector-v0.x.x-windows-x64.zip`
3. Extract the ZIP file
4. Copy files to PostgreSQL directory:
   ```powershell
   # Open PowerShell as Administrator
   Copy-Item "pgvector.dll" "C:\Program Files\PostgreSQL\16\lib\"
   Copy-Item "pgvector.control" "C:\Program Files\PostgreSQL\16\share\extension\"
   Copy-Item "pgvector--*.sql" "C:\Program Files\PostgreSQL\16\share\extension\"
   ```

**Method 2: Using WSL (Alternative)**

If you have Windows Subsystem for Linux:
```bash
# In WSL terminal
sudo apt-get update
sudo apt-get install postgresql-16-pgvector
```

---

### 1.3 Install Redis

**Option A: Using WSL (Recommended)**

1. Install WSL if not already installed:
   ```powershell
   # Run PowerShell as Administrator
   wsl --install
   ```

2. Install Redis in WSL:
   ```bash
   # In WSL terminal
   sudo apt-get update
   sudo apt-get install redis-server
   ```

3. Start Redis:
   ```bash
   sudo service redis-server start
   ```

**Option B: Using Redis for Windows (Alternative)**

1. Download from: https://github.com/microsoftarchive/redis/releases
2. Download `Redis-x64-3.0.504.msi`
3. Run installer
4. During installation:
   - ✅ Check "Add Redis to PATH"
   - ✅ Check "Add firewall exception"
5. Redis will run as Windows service

**Verify installation:**
```powershell
redis-cli --version    # Should show redis-cli 3.x.x or 7.x.x
redis-cli ping         # Should respond: PONG
```

---

### 1.4 Install Git for Windows

1. Download from: https://git-scm.com/download/win
2. Run installer (`Git-2.x.x-64-bit.exe`)
3. During installation:
   - Choose "Git from the command line and also from 3rd-party software"
   - Line ending conversion: "Checkout Windows-style, commit Unix-style"
   - Terminal emulator: "Use MinTTY"

**Verify:**
```powershell
git --version
```

---

### 1.5 Install Visual Studio Code (Recommended)

1. Download from: https://code.visualstudio.com/
2. Run installer
3. During installation:
   - ✅ Check "Add to PATH"
   - ✅ Check "Create desktop icon"

---

## 🗄️ Step 2: Set Up PostgreSQL Database

### 2.1 Start PostgreSQL Service

PostgreSQL should start automatically. Verify:

```powershell
# Check service status
Get-Service -Name postgresql*

# If not running, start it
Start-Service -Name postgresql-x64-16
```

---

### 2.2 Create Database and User

Open **SQL Shell (psql)** from Start Menu or run:

```powershell
psql -U postgres
```

Enter password: `dev_password_123` (or whatever you set during installation)

In the psql prompt, run:

```sql
-- Create a new user
CREATE USER community_user WITH PASSWORD 'dev_password_123';

-- Grant superuser privileges (for development)
ALTER USER community_user WITH SUPERUSER;

-- Create database
CREATE DATABASE community_connect OWNER community_user;

-- Exit psql
\q
```

---

### 2.3 Enable pgvector Extension

```powershell
psql -U community_user -d community_connect
```

In psql:
```sql
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify extension
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Exit
\q
```

**Expected output:** Row showing the vector extension

---

## 🔴 Step 3: Set Up Redis

### 3.1 Start Redis Service

**If using WSL:**
```bash
# In WSL terminal
sudo service redis-server start

# Check status
sudo service redis-server status
```

**If using Redis for Windows:**
```powershell
# Check service
Get-Service -Name Redis

# If not running
Start-Service -Name Redis
```

### 3.2 Test Redis Connection

```powershell
redis-cli ping
```

**Expected output:** `PONG`

---

## 📦 Step 4: Clone and Set Up Project

### 4.1 Clone Repository

```powershell
# Navigate to your projects directory
cd C:\Users\YourUsername\Documents
mkdir Projects
cd Projects

# Clone the repository (replace with your repo URL)
git clone https://github.com/tech-itrace/communityconnect.git
cd communityconnect
```

---

### 4.2 Set Up Backend

```powershell
# Navigate to Server directory
cd Server

# Install dependencies
npm install
```

**Expected output:** Dependencies installed without errors

---

### 4.3 Configure Environment Variables

```powershell
# Copy example environment file
copy .env.example .env

# Open in notepad or VS Code
notepad .env
# Or: code .env
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

**Save and close** the file.

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

Make sure you're in the Server directory:

```powershell
cd Server

# Run environment check (requires Git Bash)
bash check-environment.sh
```

**Expected output:** All green checkmarks ✅

**Note:** If you don't have Git Bash, you can skip this check and proceed to the next step.

---

### 5.2 Create Database Tables

This creates all necessary tables and indexes:

```powershell
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

```powershell
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
Server\data\CommunityMemberDetails.csv
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

```powershell
npm run import:members
```

**Expected output:**
```
[Import] Starting member import...
[Import] Reading CSV from: C:\...\CommunityMemberDetails.csv
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

```powershell
psql -U community_user -d community_connect -c "SELECT COUNT(*) FROM community_members;"
```

**Expected output:** Count showing 48 (or your CSV row count)

---

## 🤖 Step 7: Generate AI Embeddings

This step creates semantic vectors for intelligent search functionality.

### 7.1 Generate Embeddings

```powershell
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

```powershell
psql -U community_user -d community_connect -c "SELECT COUNT(*) FROM member_embeddings;"
```

**Expected output:** Count matching number of members (48)

---

## ✅ Step 8: Verify Installation

### 8.1 Start Backend Server

```powershell
npm run dev
```

**Expected output:**
```
[DB] Connected to PostgreSQL database
[Redis] Connected to Redis
Server running on http://localhost:3000
```

**Keep this PowerShell window open** - the server is now running.

---

### 8.2 Test API Health (New PowerShell Window)

Open a **new PowerShell window** and run:

```powershell
# Using curl (available in PowerShell)
curl http://localhost:3000/api/health

# Or using Invoke-WebRequest
Invoke-WebRequest -Uri http://localhost:3000/api/health | Select-Object -Expand Content
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

```powershell
# Create test request JSON
$body = @{
    query = "Find software engineers in Bangalore"
    phoneNumber = "9876543210"
} | ConvertTo-Json

# Send POST request
Invoke-WebRequest -Uri http://localhost:3000/api/search -Method POST -Body $body -ContentType "application/json" | Select-Object -Expand Content
```

**Expected output:** JSON response with matching members

---

## 🎨 Step 9: Set Up Frontend Dashboard

### 9.1 Install Frontend Dependencies

Open a **new PowerShell window**:

```powershell
# Navigate to dashboard directory
cd C:\Users\YourUsername\Documents\Projects\communityconnect\dashboard

# Install dependencies
npm install
```

---

### 9.2 Configure Frontend Environment

Create `.env` file:

```powershell
# Create .env file
@"
VITE_API_URL=http://localhost:3000
VITE_TEST_PHONE_NUMBER=9876543210
"@ | Out-File -FilePath .env -Encoding utf8
```

Or manually create `.env` file with:
```
VITE_API_URL=http://localhost:3000
VITE_TEST_PHONE_NUMBER=9876543210
```

---

### 9.3 Start Frontend Server

```powershell
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
2. Open browser console (F12)
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
- Already visible in the PowerShell window running `npm run dev`

**Database queries:**
```powershell
psql -U community_user -d community_connect
```

### Stop Services

```powershell
# Stop PostgreSQL
Stop-Service -Name postgresql-x64-16

# Stop Redis (if using Windows Redis)
Stop-Service -Name Redis

# Stop Redis (if using WSL)
# In WSL terminal: sudo service redis-server stop

# Stop backend (Ctrl+C in PowerShell running npm run dev)
# Stop frontend (Ctrl+C in PowerShell running npm run dev)
```

### Restart Services

```powershell
# Start PostgreSQL
Start-Service -Name postgresql-x64-16

# Start Redis (if using Windows Redis)
Start-Service -Name Redis

# Start Redis (if using WSL)
# In WSL terminal: sudo service redis-server start
```

### Re-import Data (Clear and Reimport)

```powershell
cd Server
npm run import:members
npm run generate:embeddings
```

### Add More Members

1. Edit `Server\data\CommunityMemberDetails.csv`
2. Run `npm run import:members`
3. Run `npm run generate:embeddings`

---

## 🐛 Troubleshooting

### PostgreSQL Connection Issues

**Error:** `FATAL: password authentication failed`

**Solution:**
```powershell
psql -U postgres -c "ALTER USER community_user WITH PASSWORD 'dev_password_123';"
```

**Error:** `psql: command not found`

**Solution:**
- Verify PostgreSQL is in PATH
- Restart PowerShell after adding to PATH
- Use full path: `"C:\Program Files\PostgreSQL\16\bin\psql.exe"`

### pgvector Extension Not Found

**Error:** `extension "vector" does not exist`

**Solution:**
1. Verify pgvector DLL is in: `C:\Program Files\PostgreSQL\16\lib\`
2. Verify .control and .sql files are in: `C:\Program Files\PostgreSQL\16\share\extension\`
3. Restart PostgreSQL service
4. Try creating extension again

### Redis Connection Failed

**Error:** `Could not connect to Redis`

**Solution (Windows Redis):**
```powershell
# Check if running
Get-Service -Name Redis

# Start if stopped
Start-Service -Name Redis

# Test
redis-cli ping
```

**Solution (WSL Redis):**
```bash
# In WSL terminal
sudo service redis-server start
sudo service redis-server status
```

### Port Already in Use

**Error:** `Port 3000 is already in use`

**Solution:**
```powershell
# Find process using port 3000
netstat -ano | findstr :3000

# Kill the process (replace PID with actual number)
taskkill /PID <PID> /F
```

### API Key Issues

**Error:** `DEEPINFRA_API_KEY not found`

**Solution:**
1. Verify `.env` file exists in `Server\` directory
2. Check API key is correctly pasted (no extra spaces)
3. Restart server after updating `.env`
4. Windows might add BOM to file - use VS Code to edit `.env`

### Embedding Generation Fails

**Error:** `Error generating embedding`

**Solution:**
1. Check API key is valid
2. Verify internet connection
3. Check Windows Firewall isn't blocking requests
4. Check DeepInfra API status: https://deepinfra.com/status
5. If using Gemini fallback, verify `GOOGLE_API_KEY` is set

### npm Install Errors

**Error:** `gyp ERR!` or build errors

**Solution:**
```powershell
# Install Windows build tools
npm install --global windows-build-tools

# Or install Visual Studio Build Tools
# Download from: https://visualstudio.microsoft.com/downloads/
```

---

## 📚 Next Steps

### Recommended Documentation

1. **Architecture Overview:** `\docs\ARCHITECTURE-DIAGRAM.md`
2. **API Testing Guide:** `\Server\API-TESTING-GUIDE.md`
3. **Smart Auth System:** `\docs\SMART-AUTH-COMPLETE.md`
4. **WhatsApp Bot Setup:** `\docs\START-HERE.md`

### Development Workflow

**Daily development:**

PowerShell Window 1:
```powershell
cd Server
npm run dev
```

PowerShell Window 2:
```powershell
cd dashboard
npm run dev
```

PowerShell Window 3 (for testing):
```powershell
cd Server
# Use curl or Invoke-WebRequest for API testing
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

1. **Check logs:** Review PowerShell output for error messages
2. **Run diagnostics:** Check services with `Get-Service` commands
3. **Review docs:** See `\docs\` folder for detailed guides
4. **Check environment:** Verify all `.env` variables are set
5. **Windows-specific:** Check firewall, antivirus, and PATH settings
6. **Ask team:** Contact the development team with error logs

---

## 💡 Windows-Specific Tips

1. **Use PowerShell (not CMD)** - Better support for modern tools
2. **Run as Administrator** when installing global packages or services
3. **Disable antivirus temporarily** if npm install fails
4. **Use Git Bash** for running shell scripts (`.sh` files)
5. **Use VS Code** for editing files (better than Notepad for `.env`)
6. **Check Windows Firewall** if API calls fail

---

**🎉 Congratulations! Your development environment is ready!**

You can now:
- Add/edit/delete members via dashboard
- Test natural language search queries
- Develop new features
- Run tests and debug issues

Happy coding! 🚀
