# Community Connect v2.0 - Automated Setup Scripts

## Overview
Three bash scripts for automated setup, migration, and backup verification:

1. **`setup.sh`** - Clean installation for new deployments
2. **`migrate.sh`** - Migrate existing v1.0 → v2.0
3. **`verify-backup.sh`** - Test backup integrity before migration

## Prerequisites

### System Requirements
- **OS**: Ubuntu 20.04+, macOS 11+, or Debian 11+
- **Shell**: Bash 4.0+
- **Privileges**: Root/sudo access
- **Disk Space**: 5GB+ free
- **Memory**: 2GB+ RAM

### Network Requirements
- Internet access for package downloads
- Ports available: 5432 (PostgreSQL), 6379 (Redis), 3000 (API), 5173 (Frontend)

---

## Script 1: Clean Setup (`setup.sh`)

### Purpose
Automated installation for **fresh deployments** (no existing data).

### What It Does
1. ✅ Checks system requirements (disk, memory, OS)
2. ✅ Installs PostgreSQL 16 + pgvector extension
3. ✅ Installs Node.js 18 + pnpm
4. ✅ Installs Redis 6+
5. ✅ Creates database + user with generated password
6. ✅ Installs schema from `docs/communityconnect_schema_final.sql`
7. ✅ Creates sample community ("Tech Innovators Hub")
8. ✅ Generates `.env` files with secure secrets
9. ✅ Installs npm dependencies (backend + frontend)
10. ✅ Creates 3 sample members (admin, alumni, entrepreneur)

### Usage

```bash
# Navigate to Server directory
cd Server

# Run as root (Linux) or with sudo
sudo ./setup.sh

# On macOS (no sudo needed if Homebrew installed)
./setup.sh
```

### Output Files
```
Server/.env              # Backend configuration
dashboard/.env           # Frontend configuration
.credentials             # Database credentials (secure)
.community_id            # Created community UUID
setup.log                # Installation log
Server/logs/             # Application logs directory
```

### Sample Output
```
==========================================
Setup Complete! 🎉
==========================================

Database:
  Name: communityconnect
  User: community_app
  Password: [generated 24-char password]

Community:
  ID: 123e4567-e89b-12d3-a456-426614174000
  Name: Tech Innovators Hub

Sample Users:
  Admin: +919876543212
  Alumni: +919876543210
  Entrepreneur: +919876543211

Next Steps:
  1. Update DEEPINFRA_API_KEY in Server/.env
  2. Start backend: cd Server && npm run dev
  3. Start frontend: cd dashboard && npm run dev
  4. Open: http://localhost:5173
```

### Post-Setup Steps
1. **Add DeepInfra API Key**:
   ```bash
   nano Server/.env
   # Update: DEEPINFRA_API_KEY=your_actual_key
   ```

2. **Start Development**:
   ```bash
   # Terminal 1 - Backend
   cd Server && npm run dev

   # Terminal 2 - Frontend
   cd dashboard && npm run dev
   ```

3. **Login to Dashboard**:
   - Open: http://localhost:5173
   - Set `localStorage.setItem('userPhone', '+919876543212')` in console
   - Or use phone input: `+919876543212`

### Estimated Time
- **Linux VPS**: 10-15 minutes
- **macOS**: 5-10 minutes (if Homebrew pre-installed)

### Troubleshooting

**PostgreSQL installation fails**:
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y software-properties-common

# macOS
brew update
```

**Node.js version issues**:
```bash
# Use nvm instead
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
```

**Permission denied**:
```bash
chmod +x setup.sh
sudo ./setup.sh  # Linux
./setup.sh       # macOS
```

---

## Script 2: Migration (`migrate.sh`)

### Purpose
Migrate **existing v1.0 installation** to v2.0 multi-community schema.

### What It Does
**Phase 1 - Pre-Migration**:
- Creates **three backup formats**:
  - PostgreSQL custom format (.dump) - for fast restore
  - SQL text format (.sql.gz) - human-readable fallback
  - CSV exports - emergency data recovery
- Verifies backup integrity and calculates SHA-256 checksum
- Creates backup manifest with restore instructions
- Runs data quality audit (null checks, duplicates, format validation)
- Tests backup can be listed (integrity check)
- Requires user confirmation before proceeding
- Fails if critical issues found (e.g., null phone numbers, corrupted backup)

**Phase 2 - Schema Migration**:
- Renames old tables (`community_members` → `community_members_old`)
- Installs new schema alongside old (zero downtime until switch)

**Phase 3 - Data Migration**:
- Creates default community
- Migrates members → new `members` table
- Creates `community_memberships` records
- Splits data into type-specific profiles:
  - `alumni_profiles`
  - `entrepreneur_profiles`
  - `resident_profiles`
- Migrates existing embeddings (profile + skills)

**Phase 4 - Post-Migration**:
- Rebuilds full-text search index
- Runs VACUUM ANALYZE for optimization
- Schedules contextual embedding generation

**Phase 5 - Verification**:
- Compares record counts (old vs new)
- Checks referential integrity
- Generates verification report

**Phase 6 - Cleanup**:
- Optionally drops old tables (manual confirmation)

### Usage

```bash
cd Server

# Ensure .env exists
cat .env  # Should have DATABASE_URL

# Run migration (requires sudo on Linux)
sudo ./migrate.sh
```

### Interactive Prompts
```
Continue with migration? (yes/NO): yes
```

```
⚠️  CRITICAL: This backup contains ALL your data
Location: backups/migration_20240115_143022/
Size: 245M

Confirm backup location is correct and proceed? (yes/NO): yes
```

```
Drop old tables? (y/N): N   # Recommended: Keep for 7 days
```

### Output Files
```
backups/migration_YYYYMMDD_HHMMSS/
  ├── full_backup.dump           # PostgreSQL custom format (fast restore)
  ├── full_backup.sql.gz         # SQL text format (human-readable)
  ├── community_members.csv      # Members table export
  ├── member_embeddings.csv      # Embeddings table export
  ├── manifest.txt               # Backup metadata + SHA-256 checksum
  ├── audit_report.txt           # Pre-migration data quality
  └── verification_report.txt    # Post-migration integrity check

migration_YYYYMMDD_HHMMSS.log    # Detailed execution log
```

### Sample Output
```
==========================================
Migration Complete! 🎉
==========================================

Backup Location: backups/migration_20240115_143022/
Migration Log: migration_20240115_143022.log

Next Steps:
  1. Review verification report: backups/.../verification_report.txt
  2. Generate contextual embeddings: cd Server && npm run generate:embeddings
  3. Update application code to use new schema
  4. Test thoroughly before deploying

⚠️  Keep backup for 7 days before deleting
```

### Estimated Time
- **Small DB** (< 1K members): 5-10 minutes
- **Medium DB** (1K-10K members): 15-30 minutes
- **Large DB** (10K+ members): 1-2 hours

### Safety Features

**Triple-Format Backup**:
```bash
# 1. PostgreSQL custom format (fastest restore)
pg_restore -d $DATABASE_URL --clean backups/migration_*/full_backup.dump

# 2. SQL text format (fallback if custom format fails)
gunzip -c backups/migration_*/full_backup.sql.gz | psql $DATABASE_URL

# 3. CSV exports (emergency data recovery)
psql $DATABASE_URL -c "\COPY community_members FROM 'community_members.csv' CSV HEADER"
```

**Backup Verification**:
- SHA-256 checksum calculated and stored in manifest.txt
- Integrity test using `pg_restore --list` before proceeding
- File size validation (must not be empty)
- User confirmation required after backup creation

**Automatic Rollback**:
```bash
# If ANY step fails, auto-rollback from backup
# Tries custom format first, falls back to SQL if needed
# Manually rollback if needed:
pg_restore -d $DATABASE_URL --clean backups/migration_*/full_backup.dump
```

**Data Preservation**:
- Three backup formats: .dump (binary), .sql.gz (text), .csv (tabular)
- Backup integrity verified before migration starts
- Old tables kept as `*_old` (not dropped by default)
- Idempotent SQL (ON CONFLICT DO NOTHING)
- User confirmation required at two checkpoints

**Pre-Flight Checks**:
- ❌ Blocks if null phone numbers found
- ❌ Blocks if backup creation fails or file is empty
- ❌ Blocks if backup integrity check fails
- ⚠️ Warns on low memory, invalid emails
- ✅ Requires explicit "yes" confirmation (not just "y")

### Post-Migration Tasks

1. **Generate Contextual Embeddings**:
   ```bash
   cd Server
   npm run generate:embeddings
   # Background job - takes 1-2 hours for 10K members
   ```

2. **Update Application Queries**:
   ```typescript
   // OLD (v1.0)
   SELECT * FROM community_members WHERE phone = ?

   // NEW (v2.0)
   SELECT m.*, cm.member_type, cm.role
   FROM members m
   JOIN community_memberships cm ON cm.member_id = m.id
   WHERE m.phone = ? AND cm.community_id = ?
   ```

3. **Update Environment Variables**:
   ```bash
   nano Server/.env
   # Add: SCHEMA_VERSION=2.0
   # Add: DEFAULT_COMMUNITY_ID=<uuid-from-migration>
   ```

4. **Test Critical Flows**:
   ```bash
   # WhatsApp search
   npm run test:whatsapp

   # Dashboard login
   npm run dev  # Test with migrated admin phone
   ```

### Troubleshooting

**Backup creation fails**:
```bash
# Check disk space
df -h

# Check PostgreSQL connection
psql $DATABASE_URL -c "SELECT version();"

# Manual backup
pg_dump $DATABASE_URL -Fc -f manual_backup.dump

# Check permissions
ls -la backups/
```

**Migration hangs at schema installation**:
```bash
# Check for active connections
psql $DATABASE_URL -c "SELECT * FROM pg_stat_activity WHERE datname = 'communityconnect';"

# Kill connections
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'communityconnect' AND pid <> pg_backend_pid();
```

**Duplicate key violations**:
```sql
-- Check for duplicates before migration
SELECT phone, COUNT(*) FROM community_members_old GROUP BY phone HAVING COUNT(*) > 1;

-- De-duplicate
DELETE FROM community_members_old a USING community_members_old b
WHERE a.id < b.id AND a.phone = b.phone;
```

**Embeddings not migrating**:
```sql
-- Check old embeddings
SELECT COUNT(*) FROM member_embeddings_old WHERE profile_embedding IS NOT NULL;

-- Check vector dimensions (must be 768)
SELECT vector_dims(profile_embedding) FROM member_embeddings_old LIMIT 1;
```

---

## Script 3: Backup Verification (`verify-backup.sh`)

### Purpose
Test backup integrity **before running migration** or for disaster recovery validation.

### What It Does
1. ✅ Checks all backup files exist (*.dump, *.sql.gz, *.csv, manifest.txt)
2. ✅ Verifies PostgreSQL backup integrity using `pg_restore --list`
3. ✅ Tests gzip compression on SQL backup
4. ✅ Validates SHA-256 checksum against manifest
5. ✅ Counts tables in backup
6. ✅ Estimates restore time based on backup size
7. ✅ Provides restore commands for each format

### Usage

```bash
# Verify latest backup
./verify-backup.sh backups/migration_20240115_143022

# Verify backup in specific directory
./verify-backup.sh /path/to/backup

# Default (checks backups/latest)
./verify-backup.sh
```

### Sample Output
```
==========================================
Backup Verification Tool
==========================================

File Presence Check:
-------------------
✓ PostgreSQL custom format (full_backup.dump) - 245M
✓ SQL text format (full_backup.sql.gz) - 89M
✓ Members export (community_members.csv) - 12M
✓ Backup manifest (manifest.txt) - 2K

Integrity Checks:
----------------
✓ PostgreSQL backup is valid (23 tables)
✓ SQL backup gzip compression is valid
✓ Checksum matches (a3f5e8c9...)

Backup Metadata:
---------------
Community Connect Database Backup
Created: Sat Nov 16 14:30:22 IST 2025
Database URL: postgresql://...
Backup Type: Pre-Migration (v1.0 → v2.0)

Restore Estimates:
-----------------
Backup size: 245MB
Estimated restore time: ~3 minutes
Estimated migration time: ~9 minutes

==========================================
✓ Backup verification PASSED
==========================================
```

### When to Use

**Before Migration**:
```bash
# Create test backup first
pg_dump $DATABASE_URL -Fc -f backups/test_backup.dump

# Verify it
./verify-backup.sh backups/test_backup/

# If PASSED, proceed with migration
./migrate.sh
```

**After Scheduled Backups**:
```bash
# In cron job
0 3 * * * cd /path/to/Server && pg_dump $DATABASE_URL -Fc -f backups/daily_$(date +\%Y\%m\%d).dump && ./verify-backup.sh backups/daily_$(date +\%Y\%m\%d)/
```

**Disaster Recovery Drills**:
```bash
# Verify old backup is still valid
./verify-backup.sh backups/migration_20240101_000000/
```

### Exit Codes
- **0**: Backup is valid and ready to use
- **1**: Critical failure (corrupted backup, missing files, checksum mismatch)

### Troubleshooting

**"Backup directory not found"**:
```bash
ls -la backups/
# Check path is correct
```

**"PostgreSQL backup is corrupted"**:
```bash
# Try re-creating backup
pg_dump $DATABASE_URL -Fc -f new_backup.dump

# Check PostgreSQL version compatibility
psql --version
pg_restore --version
```

**"Checksum mismatch"**:
```bash
# File may have been modified or corrupted
# Create fresh backup
```

---

## Comparison: Setup vs Migration vs Verification

| Feature | `setup.sh` | `migrate.sh` | `verify-backup.sh` |
|---------|-----------|-------------|-------------------|
| **Use Case** | Fresh installation | Existing v1.0 → v2.0 | Test backup integrity |
| **Data Loss** | N/A (no existing data) | Zero (triple backup) | N/A (read-only) |
| **Downtime** | None (new system) | 5 mins - 2 hours | None (read-only) |
| **Rollback** | N/A | Automatic + manual | N/A |
| **Dependencies** | Installs all | Expects existing setup | Requires pg_restore |
| **Outputs** | .env files, sample data | Backup + migration log | Verification report |
| **Run Frequency** | Once per deployment | Once per major upgrade | Daily/weekly |

---

| Feature | `setup.sh` | `migrate.sh` |
|---------|-----------|-------------|
| **Use Case** | Fresh installation | Existing v1.0 → v2.0 |
| **Data Loss** | N/A (no existing data) | Zero (full backup) |
| **Downtime** | None (new system) | 5 mins - 2 hours |
| **Rollback** | N/A | Automatic + manual backup |
| **Sample Data** | ✅ Creates 3 members | ❌ Uses existing data |
| **Dependencies** | Installs all (PostgreSQL, Node, Redis) | Expects existing setup |
| **Community Creation** | Auto-creates "Tech Innovators Hub" | Auto-creates "Main Community" |
| **Embeddings** | None (run generation after) | Migrates existing, generates contextual |

---

## Best Practices

### For Production Deployment

**Option 1: Clean Setup (Recommended for new projects)**
```bash
# VPS setup
ssh user@your-server.com
git clone <your-repo>
cd communityConnect/Server
sudo ./setup.sh

# Update production configs
nano .env
# Change NODE_ENV=production
# Add real DEEPINFRA_API_KEY

# Setup PM2 + Nginx (see CLEAN_SETUP_GUIDE.md Section 7)
```

**Option 2: Migration (For existing v1.0)**
```bash
# 1. Create and verify backup on staging
ssh user@staging-server.com
cd communityConnect/Server

pg_dump $DATABASE_URL -Fc -f backups/staging_test.dump
./verify-backup.sh backups/staging_test/

# 2. Test migration on staging
sudo ./migrate.sh

# 3. Verify thoroughly
npm run test:all
# Manual testing of all features

# 4. Schedule production migration
# - Pick low-traffic window (e.g., Sunday 2 AM)
# - Notify users of maintenance
ssh user@production-server.com
cd communityConnect/Server

# Create and verify production backup
pg_dump $DATABASE_URL -Fc -f backups/production_$(date +%Y%m%d).dump
./verify-backup.sh backups/production_$(date +%Y%m%d)/

# If verification PASSED, run migration
sudo ./migrate.sh

# 5. Monitor for 24 hours
tail -f logs/app.log
```

### Security Hardening

**After Setup**:
```bash
# Secure credentials file
chmod 600 .credentials

# Restrict .env access
chmod 600 Server/.env dashboard/.env

# Backup credentials offsite
scp .credentials user@backup-server:/secure/backups/

# Rotate secrets every 90 days
openssl rand -base64 32  # New JWT secret
```

**Database Security**:
```sql
-- Disable remote root login
ALTER USER postgres WITH PASSWORD 'strong-password';

-- Restrict network access (pg_hba.conf)
# host    communityconnect    community_app    127.0.0.1/32    scram-sha-256
```

---

## Maintenance

### Daily Checks
```bash
# Check service status
systemctl status postgresql redis-server

# Check disk usage
df -h

# Check logs
tail -100 migration*.log setup.log
```

### Weekly Backups
```bash
# Add to crontab
crontab -e

# Backup every Sunday at 3 AM with verification
0 3 * * 0 cd /path/to/Server && \
  pg_dump $DATABASE_URL -Fc -f backups/weekly_$(date +\%Y\%m\%d).dump && \
  pg_dump $DATABASE_URL -f backups/weekly_$(date +\%Y\%m\%d).sql && \
  gzip backups/weekly_$(date +\%Y\%m\%d).sql && \
  ./verify-backup.sh backups/weekly_$(date +\%Y\%m\%d)/ >> logs/backup_verification.log 2>&1
```

### Monthly Cleanup
```bash
# After 30 days, drop old tables
psql $DATABASE_URL << 'EOF'
DROP TABLE IF EXISTS community_members_old CASCADE;
DROP TABLE IF EXISTS member_embeddings_old CASCADE;
EOF

# Clean old backups (keep last 4)
find /backups -name "weekly_*.sql.gz" -mtime +120 -delete
```

---

## Support

### Log Locations
- **Setup**: `Server/setup.log`
- **Migration**: `Server/migration_YYYYMMDD_HHMMSS.log`
- **Application**: `Server/logs/app.log`

### Common Issues

**"PostgreSQL not responding"**:
```bash
sudo systemctl restart postgresql
sudo systemctl status postgresql
```

**"Redis connection refused"**:
```bash
sudo systemctl restart redis-server
redis-cli ping  # Should return PONG
```

**"Permission denied on .env"**:
```bash
chmod 600 Server/.env
chown $USER:$USER Server/.env
```

### Getting Help
1. Check logs: `tail -100 setup.log` or `migration*.log`
2. Review verification report: `cat backups/*/verification_report.txt`
3. Test database connection:
   ```bash
   psql $DATABASE_URL -c "SELECT version();"
   ```

---

## Quick Reference

### Setup Commands
```bash
# Clean setup
cd Server && sudo ./setup.sh

# Check status
psql -U community_app -d communityconnect -c "\dt"
```

### Migration Commands
```bash
# Pre-migration check
psql $DATABASE_URL -c "SELECT COUNT(*) FROM community_members WHERE phone IS NULL;"

# Run migration
cd Server && sudo ./migrate.sh

# Post-migration
npm run generate:embeddings
```

### Rollback Commands
```bash
# Auto-rollback (if migration fails)
# Manual rollback:
pg_restore -d $DATABASE_URL -c backups/migration_*/full_backup.dump
```

---

**Created**: January 2024  
**Version**: 2.0  
**Last Updated**: January 15, 2024
