# Database Backup & Restore Instructions

## 📦 Backup Information

**Backup Date:** 2025-11-20 10:17:06
**Database:** community_connect
**Backup File:** `community_connect_backup_20251120_101706.sql`
**Compressed:** `community_connect_backup_20251120_101706.sql.gz` (800K)

## 📊 Backed Up Data

| Table | Records | Description |
|-------|---------|-------------|
| communities | 8 | Community configurations |
| community_memberships | 69 | Member-community relationships |
| member_embeddings | 69 | ML embeddings for semantic search |
| member_search_index | 68 | Full-text search indexes |
| members | 64 | Member profiles |
| embedding_generation_jobs | 0 | Background job tracking |
| query_embedding_cache | 0 | Query embedding cache |
| search_cache | 0 | Search result cache |
| search_queries | 0 | Query analytics |
| users | 0 | User authentication data |

**Total Records:** 278 records across 10 tables

## 🔄 How to Restore

### Option 1: Full Database Restore (Recommended for new environment)

```bash
# 1. Extract compressed backup
gunzip -c backups/community_connect_backup_20251120_101706.sql.gz > restore.sql

# 2. Drop existing database (WARNING: This deletes all data!)
PGPASSWORD=dev_password_123 dropdb -h localhost -p 5432 -U community_user community_connect

# 3. Create fresh database
PGPASSWORD=dev_password_123 createdb -h localhost -p 5432 -U community_user community_connect

# 4. Restore backup
PGPASSWORD=dev_password_123 psql -h localhost -p 5432 -U community_user -d community_connect < restore.sql

# 5. Verify restoration
PGPASSWORD=dev_password_123 psql -h localhost -p 5432 -U community_user -d community_connect -c "\dt"
```

### Option 2: Selective Table Restore (For specific tables only)

```bash
# 1. Extract specific table data
gunzip -c backups/community_connect_backup_20251120_101706.sql.gz > restore.sql

# 2. Restore only specific tables (example: members and embeddings)
PGPASSWORD=dev_password_123 psql -h localhost -p 5432 -U community_user -d community_connect << EOF
-- Truncate existing data
TRUNCATE members CASCADE;
TRUNCATE member_embeddings CASCADE;
EOF

# Then manually extract and run relevant COPY statements from restore.sql
```

### Option 3: Restore to Different Database

```bash
# Restore to a test database for verification
PGPASSWORD=dev_password_123 createdb -h localhost -p 5432 -U community_user community_connect_test

gunzip -c backups/community_connect_backup_20251120_101706.sql.gz | \
  PGPASSWORD=dev_password_123 psql -h localhost -p 5432 -U community_user -d community_connect_test
```

## 🧪 Verify Restore

After restoration, run these commands to verify:

```bash
# Connect to database
PGPASSWORD=dev_password_123 psql -h localhost -p 5432 -U community_user -d community_connect

# Check record counts
SELECT 'communities' as table_name, COUNT(*) FROM communities
UNION ALL
SELECT 'members', COUNT(*) FROM members
UNION ALL
SELECT 'community_memberships', COUNT(*) FROM community_memberships
UNION ALL
SELECT 'member_embeddings', COUNT(*) FROM member_embeddings
UNION ALL
SELECT 'member_search_index', COUNT(*) FROM member_search_index;

# Verify embeddings
SELECT COUNT(*) as total_embeddings,
       array_length(profile_embedding, 1) as embedding_dimensions
FROM member_embeddings
GROUP BY array_length(profile_embedding, 1);

# Test a search query (optional)
# Run your application and try a search
```

Expected output:
- communities: 8 records
- members: 64 records
- community_memberships: 69 records
- member_embeddings: 69 records (768 dimensions)
- member_search_index: 68 records

## 📋 What's Included in This Backup

✅ **Schema:**
- All table definitions
- Indexes (including HNSW vector indexes)
- Triggers (search index updates)
- Foreign key constraints
- Row-level security policies

✅ **Data:**
- All member records and profiles
- All vector embeddings (768D, normalized)
- All community configurations
- Full-text search indexes
- Community memberships and relationships

✅ **Extensions:**
- pgvector (vector similarity search)
- pg_trgm (fuzzy text search)

## 🔒 Security Notes

⚠️ **Important Security Considerations:**

1. **Sensitive Data:** This backup contains real member data including:
   - Phone numbers
   - Email addresses
   - Personal information
   - Keep this file secure and encrypted

2. **Credentials:** The restore commands use hardcoded passwords
   - Change them in production
   - Use environment variables: `$PGPASSWORD` or `.pgpass` file

3. **Access Control:** Store backups in:
   - Encrypted storage
   - Access-controlled locations
   - Version-controlled externally (not in git)

## 📅 Backup Schedule Recommendations

For production use, implement automated backups:

```bash
# Daily backup script (add to crontab)
# 0 2 * * * /path/to/backup_script.sh

#!/bin/bash
DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/path/to/backups"
RETENTION_DAYS=30

# Create backup
pg_dump -h localhost -U community_user -d community_connect \
  --format=plain \
  --file="$BACKUP_DIR/community_connect_$DATE.sql"

# Compress
gzip "$BACKUP_DIR/community_connect_$DATE.sql"

# Remove old backups
find "$BACKUP_DIR" -name "community_connect_*.sql.gz" -mtime +$RETENTION_DAYS -delete

# Upload to cloud storage (optional)
# aws s3 cp "$BACKUP_DIR/community_connect_$DATE.sql.gz" s3://your-bucket/
```

## 🚀 Quick Restore Commands

```bash
# Quick restore (one-liner)
gunzip -c backups/community_connect_backup_20251120_101706.sql.gz | \
  PGPASSWORD=dev_password_123 psql -h localhost -p 5432 -U community_user -d community_connect

# Restore from different location
cat /path/to/backup.sql.gz | gunzip | \
  PGPASSWORD=dev_password_123 psql -h localhost -p 5432 -U community_user -d community_connect
```

## 📞 Support

If you encounter issues during restore:

1. Check PostgreSQL logs: `tail -f /usr/local/var/log/postgres.log`
2. Verify PostgreSQL is running: `pg_isready`
3. Check database exists: `psql -l`
4. Verify user permissions: `psql -U community_user -l`

## 🎯 Backup Checklist

- [x] Full schema backup
- [x] All data backed up
- [x] Indexes included (HNSW, GIN, B-tree)
- [x] Triggers included
- [x] Foreign keys included
- [x] Row-level security policies included
- [x] Compressed version created
- [x] Restore instructions documented
- [ ] Backup tested (restore to test database)
- [ ] Backup uploaded to cloud storage (recommended)
- [ ] Backup encrypted (for sensitive data)

---

**Generated:** 2025-11-20 10:17:06
**Phase:** Post Phase-8 Code Cleanup
**Status:** ✅ Clean codebase with optimized search
