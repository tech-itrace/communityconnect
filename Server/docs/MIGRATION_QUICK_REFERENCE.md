# Migration Quick Reference Card

## 🚀 Quick Start

```bash
# Clean setup (new installation)
cd Server && sudo ./setup.sh

# Migration (v1.0 → v2.0)
cd Server && sudo ./migrate.sh

# Verify backup
./verify-backup.sh backups/migration_YYYYMMDD_HHMMSS/
```

---

## 📋 Pre-Migration Checklist

```bash
# 1. Check current data
psql $DATABASE_URL -c "SELECT COUNT(*) FROM community_members;"

# 2. Check disk space (need 2x DB size)
df -h

# 3. Check PostgreSQL version (need 14+)
psql --version

# 4. Verify no null phones
psql $DATABASE_URL -c "SELECT COUNT(*) FROM community_members WHERE phone IS NULL;"

# 5. Stop application (avoid active connections)
pm2 stop all
```

---

## 🛡️ Backup Formats Created

| Format | Size | Use Case | Restore Speed |
|--------|------|----------|---------------|
| `.dump` | Smallest | Primary restore | Fastest |
| `.sql.gz` | Medium | Fallback | Slower |
| `.csv` | Largest | Emergency | Manual |

---

## 🔄 Restore Commands

```bash
# Method 1: Custom format (recommended)
pg_restore -d $DATABASE_URL --clean backups/migration_*/full_backup.dump

# Method 2: SQL format (fallback)
gunzip -c backups/migration_*/full_backup.sql.gz | psql $DATABASE_URL

# Method 3: CSV (emergency)
psql $DATABASE_URL -c "\COPY community_members FROM 'community_members.csv' CSV HEADER"
```

---

## ⏱️ Time Estimates

| Database Size | Backup | Migration | Total |
|--------------|--------|-----------|-------|
| < 1K members | 30s    | 2 min     | 3 min |
| 1K-10K       | 2 min  | 5 min     | 9 min |
| 10K-50K      | 10 min | 20 min    | 35 min|
| 50K+         | 30 min | 1 hour    | 2 hours|

---

## 🎯 Migration Phases

```
Phase 1: PRE-MIGRATION (2-5 min)
├─ Create 3 backup formats
├─ Verify integrity + checksum
├─ Run data quality audit
└─ User confirmation

Phase 2: SCHEMA MIGRATION (1-2 min)
├─ Rename old tables (*_old)
└─ Install new schema

Phase 3: DATA MIGRATION (2-30 min)
├─ Create default community
├─ Migrate members → new table
├─ Create memberships
├─ Split into type-specific profiles
└─ Migrate embeddings

Phase 4: POST-MIGRATION (1-5 min)
├─ Rebuild search index
├─ VACUUM ANALYZE
└─ Schedule embedding jobs

Phase 5: VERIFICATION (1 min)
├─ Compare record counts
├─ Check integrity
└─ Generate report

Phase 6: CLEANUP (optional)
└─ Drop old tables
```

---

## ✅ Success Indicators

```
✓ Backup created: 245M
✓ Backup integrity verified
✓ Migrated members: 1,247
✓ Alumni profiles: 423
✓ Entrepreneur profiles: 312
✓ Resident profiles: 512
✓ Embeddings migrated: 1,247
✓ No orphaned records
```

---

## ❌ Failure Indicators

```
✗ Backup creation failed
✗ Checksum mismatch
✗ Schema installation error
✗ Orphaned members found
✗ Data count mismatch

→ Auto-rollback initiated
→ Check logs: migration_*.log
```

---

## 🆘 Emergency Procedures

### Migration Hanging
```bash
# Check active connections
psql $DATABASE_URL -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"

# Kill if needed
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'active';
```

### Rollback Manually
```bash
# Stop application
pm2 stop all

# Restore backup
pg_restore -d $DATABASE_URL --clean backups/migration_*/full_backup.dump

# Verify
psql $DATABASE_URL -c "SELECT COUNT(*) FROM community_members;"

# Restart
pm2 start all
```

### Check Logs
```bash
# Migration log
tail -100 migration_*.log

# Application log
tail -100 logs/app.log

# PostgreSQL log
sudo tail -50 /var/log/postgresql/postgresql-*.log
```

---

## 📊 Verification Queries

```sql
-- Compare old vs new counts
SELECT 'Old members' AS source, COUNT(*) FROM community_members_old
UNION ALL
SELECT 'New members', COUNT(*) FROM members;

-- Check orphaned records
SELECT COUNT(*) FROM members m 
LEFT JOIN community_memberships cm ON cm.member_id = m.id 
WHERE cm.id IS NULL;

-- Check embeddings migration
SELECT 
  COUNT(*) AS total_members,
  COUNT(profile_embedding) AS with_profile,
  COUNT(skills_embedding) AS with_skills,
  COUNT(contextual_embedding) AS with_contextual
FROM member_embeddings;

-- Check type distribution
SELECT member_type, COUNT(*) 
FROM community_memberships 
GROUP BY member_type;
```

---

## 🔒 Security

```bash
# After migration, secure backup
chmod 600 backups/migration_*/*
chown $USER:$USER backups/migration_*/*

# Rotate database password (optional)
psql $DATABASE_URL -c "ALTER USER community_app WITH PASSWORD 'new_password';"

# Update .env
nano Server/.env
# DATABASE_URL=postgresql://community_app:new_password@...
```

---

## 📞 Support

**Logs**:
- Migration: `migration_YYYYMMDD_HHMMSS.log`
- Application: `logs/app.log`
- Backup: `backups/migration_*/manifest.txt`

**Verification**:
- Audit: `backups/migration_*/audit_report.txt`
- Verification: `backups/migration_*/verification_report.txt`

**Commands**:
```bash
# Test backup
./verify-backup.sh backups/migration_*/

# Test database connection
psql $DATABASE_URL -c "SELECT version();"

# Test application
npm run test:all
```

---

**Print this card and keep handy during migration!** 📌
