# Migration Backup System - Complete Overview

## 🛡️ Triple-Format Backup Strategy

The migration script creates **three backup formats** to ensure maximum data safety:

### 1. PostgreSQL Custom Format (`.dump`)
- **Purpose**: Fast, reliable restore with full metadata
- **Size**: Smallest (compressed)
- **Restore Speed**: Fastest (parallel restore support)
- **Use Case**: Primary restore method
- **Command**: 
  ```bash
  pg_restore -d $DATABASE_URL --clean --if-exists full_backup.dump
  ```

### 2. SQL Text Format (`.sql.gz`)
- **Purpose**: Human-readable fallback, cross-version compatible
- **Size**: Larger (text-based but gzipped)
- **Restore Speed**: Slower
- **Use Case**: Fallback if .dump fails, manual inspection
- **Command**:
  ```bash
  gunzip -c full_backup.sql.gz | psql $DATABASE_URL
  ```

### 3. CSV Exports
- **Purpose**: Emergency data recovery, data portability
- **Files**: `community_members.csv`, `member_embeddings.csv`
- **Use Case**: Partial recovery, data migration to other systems
- **Command**:
  ```bash
  psql $DATABASE_URL -c "\COPY community_members FROM 'community_members.csv' CSV HEADER"
  ```

---

## 🔒 Backup Verification Process

The migration script performs **5 verification checks** before proceeding:

### 1. File Existence Check
```bash
✓ full_backup.dump exists
✓ File size > 0 bytes
```

### 2. Integrity Test
```bash
pg_restore --list full_backup.dump
✓ Backup can be parsed
✓ Tables can be listed
```

### 3. Checksum Validation
```bash
✓ SHA-256 calculated: a3f5e8c9...
✓ Stored in manifest.txt
✓ Verified before migration
```

### 4. Metadata Recording
```bash
# manifest.txt contains:
- Creation timestamp
- Database URL (sanitized)
- Backup type (pre-migration)
- File list with descriptions
- SHA-256 checksum
- Restore instructions
```

### 5. User Confirmation
```
⚠️  CRITICAL: This backup contains ALL your data
Location: backups/migration_20251116_143022/
Size: 245M

Confirm backup location is correct and proceed? (yes/NO):
```

---

## 🔄 Automatic Rollback System

### Trigger Conditions
- **Any SQL error** during migration
- **Schema installation failure**
- **Data integrity violation**
- **Manual user interruption** (Ctrl+C)

### Rollback Process
```bash
1. Stop active connections
   └─> pg_terminate_backend(pid)

2. Try custom format restore (fast)
   └─> pg_restore --clean full_backup.dump

3. If fails, try SQL restore (fallback)
   └─> gunzip -c full_backup.sql.gz | psql

4. Verify restored data
   └─> SELECT COUNT(*) FROM community_members

5. Report results
   └─> Log file + console output
```

### Rollback Success Indicators
```
✓ Database restored from backup
✓ Restored members: 1,247
✓ Backup preserved at: backups/migration_*/
```

---

## 📊 Backup Directory Structure

```
backups/migration_20251116_143022/
├── full_backup.dump           # 245M - PostgreSQL binary (primary)
├── full_backup.sql.gz         # 89M  - SQL text (fallback)
├── community_members.csv      # 12M  - Members data (emergency)
├── member_embeddings.csv      # 156M - Vector data (emergency)
├── manifest.txt               # 2K   - Backup metadata + checksum
├── audit_report.txt           # 4K   - Pre-migration data quality
└── verification_report.txt    # 6K   - Post-migration checks (after migration)
```

---

## 🚀 Quick Reference

### Before Migration
```bash
# Step 1: Verify existing data
psql $DATABASE_URL -c "SELECT COUNT(*) FROM community_members;"

# Step 2: Check disk space (need 2x current DB size)
df -h

# Step 3: Run migration (auto-creates backups)
cd Server && sudo ./migrate.sh
```

### During Migration
```
Phase 1: PRE-MIGRATION
[✓] Backup created: backups/migration_20251116_143022/full_backup.dump (245M)
[✓] SQL backup created: backups/migration_20251116_143022/full_backup.sql.gz (89M)
[✓] CSV exports created
[✓] Backup manifest created
[✓] Backup integrity verified
[✓] Backup checksum: a3f5e8c9...

Confirm backup location is correct and proceed? (yes/NO): yes
```

### If Migration Fails (Auto-Rollback)
```
[ERROR] Migration failed at 14:35:22! Initiating rollback...
[✓] Step 1: Stopping active connections...
[✓] Step 2: Restoring from backup...
[✓] Database restored from backup
[✓] Restored members: 1,247

Rollback Complete
Database restored to pre-migration state
Review logs: migration_20251116_143022.log
```

### Manual Rollback (If Needed)
```bash
# Method 1: Custom format (recommended)
pg_restore -d $DATABASE_URL --clean backups/migration_*/full_backup.dump

# Method 2: SQL format
gunzip -c backups/migration_*/full_backup.sql.gz | psql $DATABASE_URL

# Method 3: Verify restore
psql $DATABASE_URL -c "SELECT COUNT(*) FROM community_members;"
```

### Verify Any Backup
```bash
./verify-backup.sh backups/migration_20251116_143022/
```

---

## 🎯 Best Practices

### ✅ DO

1. **Test on Staging First**
   ```bash
   # Staging
   ./migrate.sh
   npm run test:all
   
   # If all tests pass, proceed to production
   ```

2. **Keep Backups for 7 Days**
   ```bash
   # After 7 days of successful operation
   rm -rf backups/migration_20251109_*
   ```

3. **Schedule During Low Traffic**
   - Sunday 2-4 AM
   - Public holidays
   - Maintenance windows

4. **Verify Backup Before Migration**
   ```bash
   ./verify-backup.sh backups/latest/
   # Only proceed if verification PASSED
   ```

5. **Monitor After Migration**
   ```bash
   tail -f logs/app.log
   # Watch for 24-48 hours
   ```

### ❌ DON'T

1. **Don't Delete Backups Immediately**
   - Keep for minimum 7 days
   - Wait for full production validation

2. **Don't Skip Verification**
   - Always run `verify-backup.sh`
   - Check backup size is reasonable

3. **Don't Migrate Without Testing**
   - Test on staging first
   - Test rollback process

4. **Don't Ignore Warnings**
   - Fix null phone numbers
   - Resolve duplicate data
   - Clean invalid formats

5. **Don't Run on Live Production Without Notice**
   - Notify users of maintenance
   - Schedule appropriate window

---

## 🔍 Troubleshooting

### Backup Creation Fails

**Problem**: `pg_dump: error: connection failed`
```bash
# Solution: Check PostgreSQL is running
systemctl status postgresql
psql $DATABASE_URL -c "SELECT version();"
```

**Problem**: Backup file is 0 bytes
```bash
# Solution: Check disk space
df -h

# Check permissions
ls -la backups/
chmod 755 backups/
```

### Backup Verification Fails

**Problem**: `PostgreSQL backup is corrupted!`
```bash
# Solution: Re-create backup
pg_dump $DATABASE_URL -Fc -f new_backup.dump

# Verify immediately
pg_restore --list new_backup.dump
```

**Problem**: `Checksum mismatch!`
```bash
# Solution: Backup was modified/corrupted
# Create fresh backup
```

### Rollback Fails

**Problem**: `pg_restore: error: could not execute query`
```bash
# Solution: Use SQL format instead
gunzip -c backups/migration_*/full_backup.sql.gz | psql $DATABASE_URL

# Or restore to new database
createdb communityconnect_restored
pg_restore -d communityconnect_restored backups/*/full_backup.dump
```

---

## 📈 Performance Metrics

### Backup Creation Time
| Database Size | Backup Time | Disk Space Required |
|--------------|-------------|---------------------|
| 100MB        | ~30 seconds | 200MB (2x)          |
| 1GB          | ~2 minutes  | 2GB (2x)            |
| 10GB         | ~15 minutes | 20GB (2x)           |
| 100GB        | ~2 hours    | 200GB (2x)          |

### Restore Time
| Backup Size | Custom Format | SQL Format |
|-------------|--------------|------------|
| 100MB       | ~1 minute    | ~2 minutes |
| 1GB         | ~5 minutes   | ~10 minutes|
| 10GB        | ~30 minutes  | ~1 hour    |
| 100GB       | ~3 hours     | ~8 hours   |

### Migration Total Time
**Formula**: `Backup Time + Data Migration Time + Index Rebuild Time`

Example (10K members):
- Backup: 2 minutes
- Schema migration: 1 minute
- Data migration: 3 minutes
- Index rebuild: 2 minutes
- Verification: 1 minute
- **Total**: ~9 minutes

---

## 🆘 Emergency Recovery Scenarios

### Scenario 1: Complete Data Loss
```bash
# 1. Identify most recent backup
ls -lt backups/

# 2. Verify backup integrity
./verify-backup.sh backups/migration_LATEST/

# 3. Restore
pg_restore -d $DATABASE_URL --clean backups/migration_LATEST/full_backup.dump

# 4. Verify data
psql $DATABASE_URL -c "SELECT COUNT(*) FROM members;"
```

### Scenario 2: Partial Data Corruption
```bash
# 1. Export affected table from backup
pg_restore -d $DATABASE_URL -t community_members backups/*/full_backup.dump

# 2. Or use CSV
psql $DATABASE_URL -c "\COPY community_members FROM 'backups/*/community_members.csv' CSV HEADER"
```

### Scenario 3: Need Old Data
```bash
# Extract specific records from backup without full restore
pg_restore --data-only -t community_members backups/*/full_backup.dump | \
  grep "specific_user" > recovered_data.sql
```

---

## 📝 Backup Checklist

### Pre-Migration
- [ ] Sufficient disk space (2x current DB size)
- [ ] PostgreSQL version 14+
- [ ] pg_dump/pg_restore available
- [ ] Write permissions to backups/
- [ ] No active user sessions
- [ ] Staging tested successfully

### During Backup
- [ ] Three backup formats created (.dump, .sql.gz, .csv)
- [ ] Manifest file generated
- [ ] SHA-256 checksum calculated
- [ ] Integrity test passed
- [ ] User confirmed backup location

### Post-Migration
- [ ] Verification report reviewed
- [ ] Data counts match (old vs new)
- [ ] No orphaned records
- [ ] Application tested (WhatsApp, dashboard, API)
- [ ] Backup preserved for 7+ days
- [ ] Old tables kept (*_old) until verified

---

**Last Updated**: November 16, 2025  
**Script Version**: 2.0  
**Backup Format Version**: 1.0
