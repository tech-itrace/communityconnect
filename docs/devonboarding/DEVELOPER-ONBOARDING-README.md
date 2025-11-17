# 🚀 New Developer Onboarding - Quick Start

**Welcome to Community Connect!** This guide will help you set up your development environment from scratch.

---

## 📖 Choose Your Platform

Select the guide that matches your operating system:

### 🍎 macOS Users
**→ [Complete macOS Setup Guide](./DEVELOPER-ONBOARDING-MAC.md)**

Perfect for developers using:
- macOS 10.15 Catalina or later
- Apple Silicon (M1/M2/M3) or Intel Macs
- Homebrew package manager

### 🪟 Windows Users
**→ [Complete Windows Setup Guide](./DEVELOPER-ONBOARDING-WINDOWS.md)**

Perfect for developers using:
- Windows 10 or Windows 11 (64-bit)
- PowerShell or Command Prompt
- Native Windows or WSL

---

## 🎯 What You'll Set Up

Both guides walk you through:

### 1. **Development Tools** (30-45 minutes)
- ✅ Node.js v20+ (JavaScript runtime)
- ✅ PostgreSQL 16+ (Database)
- ✅ pgvector extension (Vector similarity search)
- ✅ Redis (Session management & caching)
- ✅ Git (Version control)

### 2. **Database Setup** (10-15 minutes)
- ✅ Create PostgreSQL database
- ✅ Create database user with permissions
- ✅ Enable pgvector extension
- ✅ Create all tables and indexes

### 3. **Project Configuration** (5-10 minutes)
- ✅ Clone repository
- ✅ Install dependencies
- ✅ Configure environment variables
- ✅ Obtain API keys (DeepInfra, optional Google Gemini)

### 4. **Data Import** (5-10 minutes)
- ✅ Import member data from CSV
- ✅ Generate AI embeddings for semantic search
- ✅ Verify data import

### 5. **Verification** (5 minutes)
- ✅ Start backend server
- ✅ Start frontend dashboard
- ✅ Test API endpoints
- ✅ Verify search functionality

**Total Time: ~1 hour** ⏱️

---

## 🔑 What You Need

### Required

1. **API Key from DeepInfra** (Free tier available)
   - Sign up: https://deepinfra.com
   - Used for: AI-powered semantic search
   - Cost: ~$0.005 for initial setup
   - Free tier: 50 requests/minute

### Optional

2. **Google Gemini API Key** (Free tier available)
   - Sign up: https://makersuite.google.com/app/apikey
   - Used for: Automatic fallback if DeepInfra fails
   - Requires: Billing setup (but has free tier)
   - Free tier: 15 requests/minute

---

## 📋 Step-by-Step Overview

### Phase 1: Install Software
Install Node.js, PostgreSQL, Redis, and Git using platform-specific package managers.

### Phase 2: Set Up Database
Create database, enable pgvector extension, and verify connection.

### Phase 3: Configure Project
Clone repo, install dependencies, set environment variables, and get API keys.

### Phase 4: Initialize Database
Run automated scripts to:
```bash
npm run db:setup              # Create tables
npm run import:members         # Import CSV data  
npm run generate:embeddings    # Generate AI vectors
```

### Phase 5: Start Development
```bash
# Terminal 1 - Backend
cd Server && npm run dev

# Terminal 2 - Frontend
cd dashboard && npm run dev
```

Access dashboard at: http://localhost:5173

---

## 🎓 Learning Path

After setup, explore these docs in order:

1. **Architecture Overview**
   - `ARCHITECTURE-DIAGRAM.md` - System design & data flow
   - `ADR.md` - Technology choices & rationale

2. **Core Features**
   - `SMART-AUTH-COMPLETE.md` - Phone-based authentication
   - `MULTI-COMMUNITY-MIGRATION-COMPLETE.md` - Multi-tenancy
   - `MULTI-PROVIDER-LLM-COMPLETE.md` - AI integration

3. **Testing & Development**
   - `START-HERE.md` - WhatsApp bot testing
   - `API-TESTING-GUIDE.md` - API endpoints
   - `DASHBOARD-QUICK-START.md` - Frontend guide

---

## 🛠️ Key Technologies

### Backend
- **Express.js** - REST API server
- **TypeScript** - Type-safe JavaScript
- **PostgreSQL** - Relational database
- **pgvector** - Vector similarity search
- **Redis** - Session & rate limiting

### Frontend
- **React 18** - UI framework
- **Vite** - Fast build tool
- **TailwindCSS** - Utility-first CSS
- **shadcn/ui** - Component library
- **TanStack Query** - Data fetching

### AI/ML
- **DeepInfra** - Llama 3.1 8B inference
- **BAAI/bge-base-en-v1.5** - Text embeddings
- **Google Gemini** - Fallback provider

---

## 📁 Project Structure

```
communityConnect/
├── Server/                    # Backend (Express + TypeScript)
│   ├── src/
│   │   ├── routes/           # API endpoints
│   │   ├── controllers/      # Business logic
│   │   ├── services/         # LLM, search, sessions
│   │   ├── middlewares/      # Auth, rate limiting
│   │   ├── scripts/          # Database setup scripts
│   │   └── config/           # Database, Redis config
│   ├── data/                 # CSV import files
│   └── package.json
│
├── dashboard/                 # Frontend (React + Vite)
│   ├── src/
│   │   ├── pages/            # Dashboard pages
│   │   ├── components/       # React components
│   │   ├── lib/              # API client, auth
│   │   └── hooks/            # Custom React hooks
│   └── package.json
│
└── docs/                      # Documentation
    ├── DEVELOPER-ONBOARDING-MAC.md     ← macOS setup
    ├── DEVELOPER-ONBOARDING-WINDOWS.md ← Windows setup
    ├── ARCHITECTURE-DIAGRAM.md
    ├── START-HERE.md
    └── ...
```

---

## ✅ Success Criteria

You're ready to develop when:

- [ ] All services running (PostgreSQL, Redis, Backend, Frontend)
- [ ] Can access dashboard at http://localhost:5173
- [ ] Can view member list in dashboard
- [ ] API health check returns 200 OK
- [ ] Search query returns results
- [ ] No errors in browser console
- [ ] No errors in backend logs

---

## 🐛 Common Issues & Solutions

### "Port already in use"
```bash
# Find and kill process using port 3000
lsof -ti:3000 | xargs kill -9        # macOS/Linux
netstat -ano | findstr :3000          # Windows (find PID)
taskkill /PID <PID> /F                # Windows (kill process)
```

### "Cannot connect to database"
- Verify PostgreSQL is running
- Check DATABASE_URL in .env matches your setup
- Test connection: `psql -U community_user -d community_connect`

### "Redis connection failed"
- Verify Redis is running
- Test connection: `redis-cli ping` (should return PONG)

### "API key not found"
- Verify .env file exists in Server/ directory
- Check no extra spaces around API key
- Restart server after updating .env

---

## 🆘 Getting Help

**Before asking for help:**
1. ✅ Read error messages carefully
2. ✅ Check the troubleshooting section in your platform guide
3. ✅ Verify all environment variables are set
4. ✅ Ensure all services are running

**When asking for help, provide:**
- Operating system and version
- Error message (full text)
- Relevant log output
- What you were trying to do
- What you've already tried

---

## 📚 Additional Resources

### Documentation
- [Complete Documentation Index](./README.md)
- [Architecture Diagrams](./ARCHITECTURE-DIAGRAM.md)
- [API Specification](./search-api-specification.md)
- [Product Roadmap](./PRODUCT-ROADMAP.md)

### External Resources
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [pgvector GitHub](https://github.com/pgvector/pgvector)
- [DeepInfra Docs](https://deepinfra.com/docs)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [React Documentation](https://react.dev/)

---

## 🎉 Ready to Start?

Choose your platform guide above and begin your setup journey!

Both guides are:
- ✅ **Comprehensive** - Cover everything from installation to verification
- ✅ **Step-by-step** - Clear instructions with expected outputs
- ✅ **Tested** - Verified on real systems
- ✅ **Troubleshooting** - Solutions to common issues

**Estimated setup time: ~1 hour**

Good luck, and happy coding! 🚀

---

## 📝 Feedback

Found an issue with the setup guide? Have suggestions for improvement?

Please:
1. Check if issue is already documented in troubleshooting
2. Try solutions in your platform guide first
3. Create detailed issue report for the team
4. Suggest improvements to make guides better

These guides are living documents - we welcome feedback to improve them!
