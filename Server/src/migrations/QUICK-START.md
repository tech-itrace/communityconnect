# Lean Schema Migration - Quick Start

## ⚡ 5-Minute Migration Guide

### Step 1: Backup (30 seconds)
```bash
pg_dump communityconnect > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Step 2: Run Migration (3-5 minutes)
```bash
cd Server
npm run migrate:lean
```

**What happens:**
- ✅ Adds JSONB columns to existing tables
- ✅ Copies all data from old tables to new structure
- ✅ Validates everything worked
- ⚠️ **Old tables still exist** (safe to test)

### Step 3: Test Your Application (1-2 days)
```bash
# Start server
npm run dev

# Test in another terminal
npm run test:whatsapp
```

**Verify:**
- [ ] WhatsApp bot responds to queries
- [ ] Dashboard loads member profiles
- [ ] Search functionality works
- [ ] Member updates save correctly

### Step 4: Drop Old Tables (when confident)
```bash
npm run migrate:drop-old-tables
# Type: DROP TABLES
```

---

## 🔄 If Something Goes Wrong

### Before dropping old tables:
```bash
npm run migrate:rollback
```

### After dropping old tables:
```bash
# Restore from backup
psql -d communityconnect < backup_YYYYMMDD_HHMMSS.sql
```

---

## 📊 What Changed?

| Before | After |
|--------|-------|
| 12 tables | 8 tables |
| ~70 indexes | ~35 indexes |
| 3 JOINs for profiles | Direct JSONB access |
| Separate admin table | Merged into memberships |

---

## ✅ Success Indicators

Run this query to verify:
```sql
SELECT 
    COUNT(*) as total_memberships,
    COUNT(*) FILTER (WHERE profile_data != '{}') as with_profiles,
    COUNT(*) FILTER (WHERE member_type = 'alumni' AND profile_data->>'college' IS NOT NULL) as alumni_migrated
FROM community_memberships;
```

**Expected:** All three numbers should match (excluding generic members).

---

## 🆘 Need Help?

1. Check `Server/src/migrations/README.md` for detailed guide
2. Review validation output: `npm run migrate:validate`
3. View migration logs in console output

---

**Estimated Total Time:** 
- Backup: 30 seconds
- Migration: 3-5 minutes
- Testing: 1-2 days (recommended)
- Drop tables: 10 seconds

**Rollback Window:** Until you run `npm run migrate:drop-old-tables`
