# 🎓 New Developer Onboarding - Complete Guide

**Welcome to Community Connect!** This comprehensive onboarding package will take you from zero to fully functional development environment.

---

## ⚠️ CRITICAL NOTICE - READ FIRST

**The onboarding guides currently set up a LEGACY database schema.** The production system uses a **multi-community architecture** that requires additional setup.

**Impact:**
- ❌ Dashboard login will fail (no admin roles)
- ❌ Member queries won't work (no community scoping)
- ❌ Search API expects `communityId` parameter

**📖 Read**: [ONBOARDING-CRITICAL-NOTICE.md](./ONBOARDING-CRITICAL-NOTICE.md) for:
- Full explanation of the schema mismatch
- Workaround steps
- What needs to be fixed
- Current status and timeline

**For now:** Follow the onboarding guide to learn the system, but be aware you'll need additional migration steps for full functionality.

---

## 🎯 Choose Your Path

### 🆕 First Time Setup (Empty Database)

**Start here if you have:**
- ✅ Empty PostgreSQL installation (no tables)
- ✅ Never run this project before
- ✅ Need complete step-by-step guidance

**👉 Choose your platform:**

<table>
<tr>
<td width="50%" valign="top">

### 🍎 macOS Developers

**[Complete macOS Setup Guide →](./DEVELOPER-ONBOARDING-MAC.md)**

**You'll learn:**
- Install PostgreSQL 16 + pgvector via Homebrew
- Set up Redis and Node.js
- Create database from scratch
- Import CSV data
- Generate AI embeddings
- Verify everything works

**Time:** ~60 minutes

</td>
<td width="50%" valign="top">

### 🪟 Windows Developers

**[Complete Windows Setup Guide →](./DEVELOPER-ONBOARDING-WINDOWS.md)**

**You'll learn:**
- Install PostgreSQL 16 + pgvector
- Set up Redis (native or WSL)
- Create database from scratch
- Import CSV data
- Generate AI embeddings
- Verify everything works

**Time:** ~60 minutes

</td>
</tr>
</table>

### 📚 Quick Reference

Already set up? Need a command reminder?

**[Developer Quick Reference Card →](./DEVELOPER-QUICK-REFERENCE.md)**

One-page cheat sheet with:
- Essential commands
- Service management
- Database operations
- Troubleshooting tips
- **Print-friendly format**

---

## 📖 Documentation Structure

### Getting Started (You Are Here!)

```
docs/
├── DEVELOPER-ONBOARDING-README.md       ← Overview (start here)
├── DEVELOPER-ONBOARDING-MAC.md          ← Complete macOS guide
├── DEVELOPER-ONBOARDING-WINDOWS.md      ← Complete Windows guide
└── DEVELOPER-QUICK-REFERENCE.md         ← Command cheat sheet
```

### Project Understanding

```
docs/
├── START-HERE.md                        ← Visual testing guide
├── ARCHITECTURE-DIAGRAM.md              ← System architecture
├── PRODUCT-ROADMAP.md                   ← Feature roadmap
└── ADR.md                              ← Technology decisions
```

### Feature Documentation

```
docs/
├── SMART-AUTH-COMPLETE.md              ← Phone authentication
├── MULTI-COMMUNITY-MIGRATION-COMPLETE.md  ← Multi-tenancy
├── MULTI-PROVIDER-LLM-COMPLETE.md      ← AI integration
├── BULK-IMPORT-QUICKSTART.md           ← CSV import feature
└── RAG-INTEGRATION-FLOW.md             ← Semantic search
```

### Testing & Deployment

```
docs/
├── API-TESTING-GUIDE.md                ← Backend API testing
├── TESTING-SUMMARY.md                  ← Test coverage
├── DEPLOY-WHATSAPP.md                  ← WhatsApp bot setup
└── VPS-DEPLOYMENT-SUMMARY.md           ← Production deployment
```

---

## 🚀 What You'll Build

Community Connect is a **WhatsApp bot for apartment communities** with a React admin dashboard.

### Key Features

**For End Users (via WhatsApp):**
- 💬 Natural language queries: "Find plumbers near me"
- 🔍 AI-powered semantic search
- 📱 Conversational interface
- 🎯 Context-aware responses

**For Admins (via Dashboard):**
- 👥 Member management (CRUD operations)
- 📊 Search analytics
- 📤 Bulk CSV import/export
- 🔐 Role-based access control

### Tech Stack

**Backend:**
- Express.js + TypeScript
- PostgreSQL 16 + pgvector
- Redis (sessions/caching)
- DeepInfra Llama 3.1 8B

**Frontend:**
- React 18 + Vite
- TailwindCSS + shadcn/ui
- TanStack Query
- React Router v6

**External Services:**
- Twilio (WhatsApp API)
- DeepInfra (AI inference)
- Google Gemini (fallback)

---

## 📋 Prerequisites Checklist

Before starting setup, ensure you have:

### System Requirements

**macOS:**
- [ ] macOS 10.15 Catalina or later
- [ ] Admin privileges
- [ ] 5GB free disk space
- [ ] Internet connection

**Windows:**
- [ ] Windows 10/11 64-bit
- [ ] Admin privileges
- [ ] 5GB free disk space
- [ ] Internet connection

### Accounts You'll Need

- [ ] **DeepInfra account** (free tier) - [Sign up](https://deepinfra.com)
- [ ] **Google account** (optional, for Gemini fallback)
- [ ] **GitHub account** (for repo access)

### Skills Assumed

- ✅ Basic command line usage
- ✅ Git fundamentals (clone, pull, push)
- ✅ JavaScript/TypeScript basics
- ✅ SQL fundamentals (helpful but not required)

---

## 🛣️ Learning Paths

### Path 1: Backend Developer (API Focus)

**Focus:** Build and extend REST APIs, database, AI integration

**Start here:**
1. Complete platform setup guide (Mac/Windows)
2. Read: `ARCHITECTURE-DIAGRAM.md`
3. Read: `Server/API-TESTING-GUIDE.md`
4. Explore: `Server/src/routes/` and `Server/src/controllers/`
5. Read: `MULTI-PROVIDER-LLM-COMPLETE.md`
6. Read: `RAG-INTEGRATION-FLOW.md`

**Key files:**
- `Server/src/services/llmService.ts` - AI integration
- `Server/src/services/semanticSearch.ts` - Vector search
- `Server/src/middlewares/authorize.ts` - Authentication
- `Server/src/scripts/` - Database scripts

### Path 2: Frontend Developer (Dashboard Focus)

**Focus:** Build React components, UI/UX, state management

**Start here:**
1. Complete platform setup guide (Mac/Windows)
2. Read: `DASHBOARD-QUICK-START.md`
3. Read: `FRONTEND-SMART-AUTH-COMPLETE.md`
4. Explore: `dashboard/src/pages/` and `dashboard/src/components/`
5. Read: `dashboard/README.md`

**Key files:**
- `dashboard/src/lib/api.ts` - API client
- `dashboard/src/lib/auth.ts` - Authentication
- `dashboard/src/pages/Members.tsx` - Main UI
- `dashboard/src/components/ui/` - UI components

### Path 3: Full-Stack Developer

**Focus:** End-to-end features, both frontend and backend

**Start here:**
1. Complete platform setup guide (Mac/Windows)
2. Read: `ARCHITECTURE-DIAGRAM.md`
3. Read: `SMART-AUTH-COMPLETE.md` (covers both layers)
4. Follow Backend Path steps 4-6
5. Follow Frontend Path steps 2-5
6. Read: `MULTI-COMMUNITY-MIGRATION-COMPLETE.md`

### Path 4: WhatsApp Bot Developer

**Focus:** Conversational AI, natural language processing

**Start here:**
1. Complete platform setup guide (Mac/Windows)
2. Read: `START-HERE.md` (WhatsApp testing)
3. Read: `DEPLOY-WHATSAPP.md`
4. Read: `MULTI-PROVIDER-LLM-COMPLETE.md`
5. Explore: `Server/src/routes/whatsapp.ts`
6. Explore: `Server/src/services/nlSearchService.ts`

**Key files:**
- `Server/src/services/llmService.ts` - LLM integration
- `Server/src/services/conversationService.ts` - Context management
- `Server/src/services/sessionService.ts` - Redis sessions

---

## 🎯 Setup Overview

### Step-by-Step Process

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  1. Install Software (30-45 min)                   │
│     • Node.js, PostgreSQL, Redis, Git              │
│                                                     │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│                                                     │
│  2. Set Up Database (10-15 min)                    │
│     • Create database & user                       │
│     • Enable pgvector extension                    │
│                                                     │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│                                                     │
│  3. Configure Project (5-10 min)                   │
│     • Clone repository                             │
│     • Install dependencies                         │
│     • Set environment variables                    │
│     • Get API keys                                 │
│                                                     │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│                                                     │
│  4. Initialize Database (5-10 min)                 │
│     • Create tables: npm run db:setup              │
│     • Import data: npm run import:members          │
│     • Generate vectors: npm run generate:embeddings│
│                                                     │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│                                                     │
│  5. Verify Installation (5 min)                    │
│     • Start backend: npm run dev                   │
│     • Start frontend: npm run dev                  │
│     • Test API endpoints                           │
│     • Access dashboard                             │
│                                                     │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
                 ✅ Ready to Code!
```

**Total Time: ~60 minutes**

---

## 🔑 API Keys Guide

### DeepInfra (Required)

**Purpose:** Primary AI provider for inference and embeddings

**Get your key:**
1. Visit: https://deepinfra.com
2. Sign up for free account
3. Navigate to: Dashboard → API Keys
4. Click "Create API Key"
5. Copy and save key

**Add to .env:**
```bash
DEEPINFRA_API_KEY=your_actual_key_here
```

**Free tier:**
- 50 requests/minute
- Models: Llama 3.1 8B + BAAI/bge-base-en-v1.5
- Cost: ~$0.005 for initial embedding generation

### Google Gemini (Optional)

**Purpose:** Automatic fallback if DeepInfra fails or rate limits

**Get your key:**
1. Visit: https://makersuite.google.com/app/apikey
2. Sign in with Google account
3. Click "Create API Key"
4. Enable "Generative Language API" in Google Cloud Console
5. Set up billing (required but has generous free tier)
6. Copy and save key

**Add to .env:**
```bash
GOOGLE_API_KEY=your_actual_key_here
```

**Free tier:**
- 15 requests/minute
- Models: Gemini 2.0 Flash + text-embedding-004
- Better JSON formatting than DeepInfra

---

## ✅ Success Criteria

### You're ready when you can:

**Backend:**
- [ ] Run `npm run dev` without errors
- [ ] Access http://localhost:3000/api/health
- [ ] See "Connected to PostgreSQL database" in logs
- [ ] See "Connected to Redis" in logs
- [ ] Query returns results: `/api/search`

**Frontend:**
- [ ] Run `npm run dev` without errors
- [ ] Access http://localhost:5173
- [ ] See member list in dashboard
- [ ] Can add/edit/delete members
- [ ] No console errors in browser

**Database:**
- [ ] Can connect: `psql -U community_user -d community_connect`
- [ ] Tables exist: `\dt` shows 4+ tables
- [ ] Data imported: `SELECT COUNT(*) FROM community_members;` > 0
- [ ] Embeddings created: `SELECT COUNT(*) FROM member_embeddings;` > 0

---

## 🐛 Common Issues

### Installation Problems

**Issue:** Command not found (psql, node, etc.)

**Solution:**
- Verify software installed correctly
- Check PATH environment variable
- Restart terminal/PowerShell
- See troubleshooting in your platform guide

### Database Issues

**Issue:** Can't connect to PostgreSQL

**Solution:**
- Verify service is running
- Check port 5432 is not in use
- Verify DATABASE_URL in .env
- Reset user password if needed

### API Key Issues

**Issue:** "API key not found" error

**Solution:**
- Check .env file exists in Server/ directory
- Verify no extra spaces around key
- Restart server after editing .env
- Try regenerating key at provider website

### Import/Embedding Issues

**Issue:** Import fails or embeddings don't generate

**Solution:**
- Verify CSV file exists at `Server/data/CommunityMemberDetails.csv`
- Check internet connection for API calls
- Verify API key is valid and has credits
- Check logs for specific error messages

---

## 📚 Next Steps After Setup

### Immediate Next Steps

1. **Explore the codebase:**
   - Run `npm run dev` and keep server running
   - Browse `Server/src/` directory structure
   - Read `ARCHITECTURE-DIAGRAM.md`

2. **Make your first change:**
   - Add a new field to member schema
   - Create a simple API endpoint
   - Add a new page to dashboard

3. **Test your setup:**
   - Import your own CSV data
   - Try different search queries
   - Set up WhatsApp bot (optional)

### Recommended Reading Order

**Week 1: Core Understanding**
- [ ] `ARCHITECTURE-DIAGRAM.md` - System design
- [ ] `ADR.md` - Technology choices
- [ ] `SMART-AUTH-COMPLETE.md` - Authentication system

**Week 2: Feature Deep-Dive**
- [ ] `MULTI-PROVIDER-LLM-COMPLETE.md` - AI integration
- [ ] `RAG-INTEGRATION-FLOW.md` - Semantic search
- [ ] `MULTI-COMMUNITY-MIGRATION-COMPLETE.md` - Multi-tenancy

**Week 3: Testing & Deployment**
- [ ] `API-TESTING-GUIDE.md` - Backend testing
- [ ] `START-HERE.md` - WhatsApp testing
- [ ] `VPS-DEPLOYMENT-SUMMARY.md` - Production deployment

---

## 🆘 Getting Help

### Self-Service Resources

1. **Check platform guide troubleshooting section**
   - Mac: `DEVELOPER-ONBOARDING-MAC.md` → Troubleshooting
   - Windows: `DEVELOPER-ONBOARDING-WINDOWS.md` → Troubleshooting

2. **Review logs carefully**
   - Backend: Terminal running `npm run dev`
   - Database: `psql` error messages
   - Browser: Console (F12)

3. **Verify environment**
   - Run `./check-environment.sh` (Mac/Linux)
   - Check all services running
   - Verify .env variables set

### When Asking for Help

**Provide:**
- Operating system and version
- Full error message (copy-paste, not screenshot)
- What you were trying to do
- What you've already tried
- Relevant log output

**Example good question:**
```
OS: macOS 13.5
Issue: npm run generate:embeddings fails
Error: "Error generating embedding: API key invalid"
Tried: Verified DEEPINFRA_API_KEY is set in .env, restarted server
Log output: [paste relevant logs]
```

---

## 🎉 You're Ready!

**Congratulations on taking the first step!**

Choose your platform guide below and begin your onboarding journey:

<table>
<tr>
<td align="center" width="50%">

### 🍎 macOS
**[Start macOS Setup →](./DEVELOPER-ONBOARDING-MAC.md)**

Complete guide for Mac developers

</td>
<td align="center" width="50%">

### 🪟 Windows
**[Start Windows Setup →](./DEVELOPER-ONBOARDING-WINDOWS.md)**

Complete guide for Windows developers

</td>
</tr>
</table>

### Quick Links

- 📋 **[Quick Reference Card](./DEVELOPER-QUICK-REFERENCE.md)** - Print-friendly command cheat sheet
- 🏗️ **[Architecture Guide](./ARCHITECTURE-DIAGRAM.md)** - System design overview
- 🎯 **[WhatsApp Testing](./START-HERE.md)** - Test bot locally
- 📚 **[All Documentation](./README.md)** - Complete doc index

---

**Estimated setup time: ~60 minutes**

Both guides include:
- ✅ Step-by-step instructions with screenshots
- ✅ Expected output for each command
- ✅ Comprehensive troubleshooting
- ✅ Verification checkpoints

Happy coding! 🚀

---

**Last updated:** November 2025  
**Maintained by:** tech-itrace team  
**Questions?** Contact the development team
