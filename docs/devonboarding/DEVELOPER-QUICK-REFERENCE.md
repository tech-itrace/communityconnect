# 🎯 Developer Quick Reference Card

**Print this page for easy reference during setup!**

---

## 📦 Essential Commands (Run in Order)

### Initial Setup (One Time Only)

```bash
# 1. Navigate to Server directory
cd Server

# 2. Install dependencies
npm install

# 3. Copy environment template
cp .env.example .env

# 4. Edit .env (add your API keys)
# macOS: nano .env
# Windows: notepad .env

# 5. Create database tables
npm run db:setup

# 6. Import member data from CSV
npm run import:members

# 7. Generate AI embeddings (~2 minutes)
npm run generate:embeddings

# 8. Start backend server
npm run dev
```

### Frontend Setup (One Time Only)

```bash
# 1. Navigate to dashboard directory
cd dashboard

# 2. Install dependencies
npm install

# 3. Create .env file
echo "VITE_API_URL=http://localhost:3000" > .env
echo "VITE_TEST_PHONE_NUMBER=9876543210" >> .env

# 4. Start frontend server
npm run dev
```

---

## 🚀 Daily Development Workflow

### Terminal 1: Backend
```bash
cd Server
npm run dev
```
**Server runs at:** http://localhost:3000

### Terminal 2: Frontend
```bash
cd dashboard
npm run dev
```
**Dashboard runs at:** http://localhost:5173

### Terminal 3: Testing/Commands
```bash
# API health check
curl http://localhost:3000/api/health

# Test search
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "Find engineers", "phoneNumber": "9876543210"}'
```

---

## 🔧 Service Management

### Check Status

**macOS:**
```bash
brew services list | grep postgresql
brew services list | grep redis
```

**Windows PowerShell:**
```powershell
Get-Service postgresql*
Get-Service Redis
```

### Start Services

**macOS:**
```bash
brew services start postgresql@16
brew services start redis
```

**Windows PowerShell:**
```powershell
Start-Service postgresql-x64-16
Start-Service Redis
```

**Windows WSL (for Redis):**
```bash
sudo service redis-server start
```

### Stop Services

**macOS:**
```bash
brew services stop postgresql@16
brew services stop redis
```

**Windows PowerShell:**
```powershell
Stop-Service postgresql-x64-16
Stop-Service Redis
```

---

## 🗄️ Database Commands

### Connect to Database

```bash
psql -U community_user -d community_connect
```

### Common SQL Commands

```sql
-- List all tables
\dt

-- Count members
SELECT COUNT(*) FROM community_members;

-- Count embeddings
SELECT COUNT(*) FROM member_embeddings;

-- View recent searches
SELECT * FROM search_queries ORDER BY created_at DESC LIMIT 10;

-- Exit psql
\q
```

### Re-import Data

```bash
cd Server
npm run import:members
npm run generate:embeddings
```

---

## 🔴 Redis Commands

### Test Connection
```bash
redis-cli ping
```
**Expected:** `PONG`

### Clear Cache
```bash
redis-cli FLUSHALL
```

### View All Keys
```bash
redis-cli KEYS "*"
```

---

## 🐛 Quick Troubleshooting

### Port Already in Use

**macOS/Linux:**
```bash
lsof -ti:3000 | xargs kill -9
```

**Windows PowerShell:**
```powershell
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Database Connection Failed

```bash
# Reset user password
psql -U postgres -c "ALTER USER community_user WITH PASSWORD 'dev_password_123';"

# Test connection
psql -U community_user -d community_connect -c "SELECT 1;"
```

### Redis Not Responding

**macOS:**
```bash
brew services restart redis
redis-cli ping
```

**Windows:**
```powershell
Restart-Service Redis
redis-cli ping
```

### Can't Find Command

**macOS - Add to PATH:**
```bash
echo 'export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

**Windows - Add to PATH:**
1. Win + X → System → Advanced
2. Environment Variables → Path → Edit
3. Add: `C:\Program Files\PostgreSQL\16\bin`
4. Restart PowerShell

---

## 📝 Environment Variables (.env)

### Required Variables

```bash
# Database
DATABASE_URL=postgresql://community_user:dev_password_123@localhost:5432/community_connect

# AI Provider (at least one required)
DEEPINFRA_API_KEY=your_actual_key_here
GOOGLE_API_KEY=your_actual_key_here  # Optional

# Redis
REDIS_URL=redis://localhost:6379

# Server
NODE_ENV=development
PORT=3000
```

---

## 🔑 API Keys

### DeepInfra (Required)
1. Visit: https://deepinfra.com
2. Sign up → API Keys → Create
3. Copy to `.env`: `DEEPINFRA_API_KEY=...`

### Google Gemini (Optional)
1. Visit: https://makersuite.google.com/app/apikey
2. Create API key
3. Copy to `.env`: `GOOGLE_API_KEY=...`

---

## 📊 Useful Scripts

```bash
# Check environment setup
./check-environment.sh

# Test Redis connection
npm run test:redis

# Test WhatsApp webhook
npm run test:whatsapp

# Create audit table
npm run db:create-audit

# Add role column (if missing)
npm run db:add-roles
```

---

## 🧪 Testing Endpoints

### Health Check
```bash
curl http://localhost:3000/api/health
```

### Search Query
```bash
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Find software engineers in Bangalore",
    "phoneNumber": "9876543210"
  }'
```

### Get Members List
```bash
curl http://localhost:3000/api/members?phoneNumber=9876543210
```

---

## 📱 Dashboard Setup

### Set Test Phone Number

Open browser console (F12) at http://localhost:5173:

```javascript
localStorage.setItem('userPhone', '9876543210')
```

Then refresh the page.

### View Storage

```javascript
// Check stored phone
console.log(localStorage.getItem('userPhone'))

// Clear storage
localStorage.clear()
```

---

## 📁 Important File Locations

### Configuration Files
- Backend env: `Server/.env`
- Frontend env: `dashboard/.env`
- CSV data: `Server/data/CommunityMemberDetails.csv`

### Database Scripts
- Setup: `Server/src/scripts/setupDatabase.ts`
- Import: `Server/src/scripts/importMembers.ts`
- Embeddings: `Server/src/scripts/generateEmbeddings.ts`

### API Routes
- Members: `Server/src/routes/members.ts`
- Search: `Server/src/routes/search.ts`
- WhatsApp: `Server/src/routes/whatsapp.ts`

---

## 🆘 Get Help

### Documentation
- Full Mac guide: `docs/DEVELOPER-ONBOARDING-MAC.md`
- Full Windows guide: `docs/DEVELOPER-ONBOARDING-WINDOWS.md`
- Architecture: `docs/ARCHITECTURE-DIAGRAM.md`
- Start here: `docs/START-HERE.md`

### Check Status
```bash
# All at once
node --version && \
npm --version && \
psql --version && \
redis-cli --version && \
echo "All tools installed!"
```

---

## ✅ Daily Checklist

**Before starting work:**
- [ ] PostgreSQL running
- [ ] Redis running
- [ ] Backend server started (`npm run dev` in Server/)
- [ ] Frontend server started (`npm run dev` in dashboard/)
- [ ] Dashboard loads at http://localhost:5173
- [ ] API responds at http://localhost:3000/api/health

**After making database changes:**
- [ ] Re-run `npm run import:members`
- [ ] Re-run `npm run generate:embeddings`
- [ ] Restart backend server

---

## 🎨 Color-Coded Output

### ✅ Good (Green)
- "Connected to PostgreSQL database"
- "Connected to Redis"
- "Server running on http://localhost:3000"
- `PONG` (from redis-cli ping)

### ⚠️ Warning (Yellow)
- "node_modules not found. Run: npm install"
- "API key not configured"

### ❌ Error (Red)
- "FATAL: password authentication failed"
- "Could not connect to Redis"
- "Port 3000 is already in use"

---

**💾 Save this file for quick reference!**

Print it or keep it open in a separate window while working.

Last updated: November 2025
