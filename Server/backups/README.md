# Database Backup System

Comprehensive backup solution for the Community Connect database with automated daily backups, verification, and cloud upload capabilities.

## 📁 Quick Start

### Create a Backup Now

```bash
# Simple backup
./scripts/daily-backup.sh

# Backup with verification
./scripts/daily-backup.sh --verify

# Backup with 7-day retention
./scripts/daily-backup.sh --retention 7

# See all options
./scripts/daily-backup.sh --help
```

### Restore a Backup

```bash
# Restore most recent backup
gunzip -c backups/community_connect_backup_YYYYMMDD_HHMMSS.sql.gz | \
  PGPASSWORD=dev_password_123 psql -h localhost -p 5432 -U community_user -d community_connect

# Or use the command shown in backup summary
```

### Verify a Backup

```bash
./scripts/verify-backup.sh backups/community_connect_backup_YYYYMMDD_HHMMSS.sql.gz
```

## 📋 Available Scripts

### 1. `daily-backup.sh` - Main Backup Script

Creates a full database backup with optional compression, verification, and cloud upload.

**Usage:**
```bash
./scripts/daily-backup.sh [OPTIONS]

Options:
  --retention N     Keep backups for N days (default: 30)
  --verify          Verify backup after creation
  --upload          Upload to cloud storage (S3/GCS)
  --no-compress     Keep backup uncompressed
  --help            Show help message
```

**Examples:**
```bash
# Daily production backup (keep 90 days)
./scripts/daily-backup.sh --retention 90 --verify

# Development backup (keep 7 days)
./scripts/daily-backup.sh --retention 7

# Backup and upload to cloud
./scripts/daily-backup.sh --upload --verify
```

**Features:**
- ✅ Timestamped backups
- ✅ Automatic compression (gzip)
- ✅ Integrity verification
- ✅ Old backup cleanup
- ✅ Cloud upload (S3/GCS)
- ✅ Detailed logging
- ✅ Error handling

### 2. `verify-backup.sh` - Backup Verification

Verifies backup file integrity and contents.

**Usage:**
```bash
./scripts/verify-backup.sh [BACKUP_FILE]

# If no file specified, uses most recent backup
./scripts/verify-backup.sh
```

**Checks:**
- File exists and readable
- Compression integrity (if gzipped)
- Required tables present
- Data record counts
- Indexes (HNSW, GIN, B-tree)
- Triggers and foreign keys
- pgvector extension
- Quality score (0-100%)

## ⏰ Automated Backups

### Schedule with Cron

Add to your crontab to run automatically:

```bash
# Edit crontab
crontab -e

# Add one of these lines:

# Daily at 2 AM
0 2 * * * cd /path/to/Server && ./scripts/daily-backup.sh --verify >> logs/backup.log 2>&1

# Daily at 2 AM with 90-day retention
0 2 * * * cd /path/to/Server && ./scripts/daily-backup.sh --retention 90 >> logs/backup.log 2>&1

# Twice daily (2 AM and 2 PM) with cloud upload
0 2,14 * * * cd /path/to/Server && ./scripts/daily-backup.sh --upload >> logs/backup.log 2>&1
```

### Schedule with systemd (Linux)

1. Create service file:

```bash
# /etc/systemd/system/community-backup.service
[Unit]
Description=Community Connect Database Backup
After=postgresql.service

[Service]
Type=oneshot
User=udhay
WorkingDirectory=/path/to/Server
ExecStart=/path/to/Server/scripts/daily-backup.sh --verify
StandardOutput=append:/var/log/community-backup.log
StandardError=append:/var/log/community-backup.log
```

2. Create timer file:

```bash
# /etc/systemd/system/community-backup.timer
[Unit]
Description=Daily Community Connect Database Backup
Requires=community-backup.service

[Timer]
OnCalendar=daily
OnCalendar=02:00
Persistent=true

[Install]
WantedBy=timers.target
```

3. Enable and start:

```bash
sudo systemctl enable community-backup.timer
sudo systemctl start community-backup.timer

# Check status
sudo systemctl list-timers | grep community
```

## ☁️ Cloud Storage Integration

### AWS S3

1. Install AWS CLI:
```bash
# macOS
brew install awscli

# Ubuntu
sudo apt install awscli
```

2. Configure credentials:
```bash
aws configure
# Enter your AWS Access Key ID, Secret Access Key, and region
```

3. Set environment variable:
```bash
export S3_BUCKET="s3://your-bucket-name/backups"
```

4. Run backup with upload:
```bash
./scripts/daily-backup.sh --upload
```

### Google Cloud Storage

1. Install gsutil:
```bash
# macOS
brew install google-cloud-sdk

# Ubuntu
sudo snap install google-cloud-cli --classic
```

2. Authenticate:
```bash
gcloud auth login
```

3. Set environment variable:
```bash
export GCS_BUCKET="gs://your-bucket-name/backups"
```

4. Run backup with upload:
```bash
./scripts/daily-backup.sh --upload
```

## 📊 Backup File Naming

Backups use timestamp-based naming:

```
community_connect_backup_YYYYMMDD_HHMMSS.sql[.gz]

Examples:
  community_connect_backup_20251120_101706.sql.gz  # Compressed
  community_connect_backup_20251120_102031.sql     # Uncompressed
```

## 🔄 Restore Procedures

### Full Database Restore

**⚠️ WARNING: This will DELETE ALL existing data!**

```bash
# 1. Stop application
npm stop  # or systemctl stop your-app

# 2. Drop and recreate database
PGPASSWORD=dev_password_123 dropdb -h localhost -U community_user community_connect
PGPASSWORD=dev_password_123 createdb -h localhost -U community_user community_connect

# 3. Restore backup
gunzip -c backups/community_connect_backup_YYYYMMDD_HHMMSS.sql.gz | \
  PGPASSWORD=dev_password_123 psql -h localhost -U community_user -d community_connect

# 4. Verify restoration
PGPASSWORD=dev_password_123 psql -h localhost -U community_user -d community_connect -c "
  SELECT 'members' as table, COUNT(*) FROM members
  UNION ALL SELECT 'embeddings', COUNT(*) FROM member_embeddings;
"

# 5. Restart application
npm start
```

### Restore to Test Database

Test restoration without affecting production:

```bash
# Create test database
PGPASSWORD=dev_password_123 createdb -h localhost -U community_user community_connect_test

# Restore to test database
gunzip -c backups/community_connect_backup_YYYYMMDD_HHMMSS.sql.gz | \
  PGPASSWORD=dev_password_123 psql -h localhost -U community_user -d community_connect_test

# Test queries
PGPASSWORD=dev_password_123 psql -h localhost -U community_user -d community_connect_test

# Cleanup when done
PGPASSWORD=dev_password_123 dropdb -h localhost -U community_user community_connect_test
```

### Selective Table Restore

Restore specific tables only:

```bash
# Extract SQL file
gunzip backups/community_connect_backup_YYYYMMDD_HHMMSS.sql.gz

# Find the table data (example: members table)
sed -n '/^COPY public.members/,/^\\.$/p' community_connect_backup_YYYYMMDD_HHMMSS.sql > members_data.sql

# Truncate and restore
PGPASSWORD=dev_password_123 psql -h localhost -U community_user -d community_connect << EOF
TRUNCATE TABLE members CASCADE;
\i members_data.sql
EOF

# Cleanup
rm members_data.sql community_connect_backup_YYYYMMDD_HHMMSS.sql
```

## 📈 Monitoring & Logs

### View Recent Backups

```bash
# List backups with sizes
ls -lht backups/community_connect_backup_*.sql.gz | head -10

# Count total backups
ls -1 backups/community_connect_backup_*.sql.gz | wc -l

# Total backup storage used
du -sh backups/
```

### Check Backup Logs

If using cron with logging:

```bash
# View last 50 lines
tail -50 logs/backup.log

# Follow logs in real-time
tail -f logs/backup.log

# Search for errors
grep "Error" logs/backup.log

# Search for successful backups
grep "Completed Successfully" logs/backup.log
```

### Backup Statistics

```bash
# Backup sizes over time
ls -lh backups/community_connect_backup_*.sql.gz | \
  awk '{print $6, $7, $8, $5}' | \
  tail -10

# Average backup size
ls -l backups/community_connect_backup_*.sql.gz | \
  awk '{sum += $5; count++} END {print sum/count/1024/1024 " MB"}'
```

## 🔒 Security Best Practices

### 1. Protect Backup Files

```bash
# Restrict permissions to owner only
chmod 600 backups/*.sql.gz

# Restrict directory access
chmod 700 backups/
```

### 2. Encrypt Backups

For sensitive data:

```bash
# Encrypt backup with GPG
gpg --symmetric --cipher-algo AES256 backup_file.sql.gz

# Decrypt when needed
gpg --decrypt backup_file.sql.gz.gpg > backup_file.sql.gz
```

### 3. Use Environment Variables

Never hardcode passwords in scripts:

```bash
# Set in environment
export DB_PASSWORD="your_secure_password"

# Or use .pgpass file
echo "localhost:5432:community_connect:community_user:your_password" > ~/.pgpass
chmod 600 ~/.pgpass
```

### 4. Secure Cloud Storage

```bash
# S3 with encryption
aws s3 cp backup.sql.gz s3://bucket/ --sse AES256

# GCS with encryption
gsutil -o GSUtil:encryption_key=YOUR_KEY cp backup.sql.gz gs://bucket/
```

## 🧪 Testing Backups

**Golden Rule:** A backup is only good if you can restore it!

### Monthly Restore Test

```bash
#!/bin/bash
# Test restore monthly

# 1. Get latest backup
LATEST=$(ls -t backups/community_connect_backup_*.sql.gz | head -1)

# 2. Create test database
PGPASSWORD=dev_password_123 createdb -h localhost -U community_user community_connect_test

# 3. Restore
gunzip -c "$LATEST" | \
  PGPASSWORD=dev_password_123 psql -h localhost -U community_user -d community_connect_test

# 4. Verify counts match production
PROD_COUNT=$(PGPASSWORD=dev_password_123 psql -h localhost -U community_user -d community_connect -tAc "SELECT COUNT(*) FROM members")
TEST_COUNT=$(PGPASSWORD=dev_password_123 psql -h localhost -U community_user -d community_connect_test -tAc "SELECT COUNT(*) FROM members")

if [ "$PROD_COUNT" -eq "$TEST_COUNT" ]; then
    echo "✅ Restore test passed!"
else
    echo "❌ Restore test failed! Counts don't match"
fi

# 5. Cleanup
PGPASSWORD=dev_password_123 dropdb -h localhost -U community_user community_connect_test
```

## 📞 Troubleshooting

### Backup Fails

```bash
# Check PostgreSQL is running
pg_isready -h localhost -p 5432

# Check database exists
PGPASSWORD=dev_password_123 psql -h localhost -U community_user -l | grep community_connect

# Check disk space
df -h

# Check permissions
ls -la backups/

# Test connection
PGPASSWORD=dev_password_123 psql -h localhost -U community_user -d community_connect -c "SELECT 1"
```

### Restore Fails

```bash
# Check backup file integrity
gunzip -t backup_file.sql.gz

# Check for errors in backup
gunzip -c backup_file.sql.gz | grep -i "error" | head -10

# Restore with verbose output
gunzip -c backup_file.sql.gz | \
  PGPASSWORD=dev_password_123 psql -h localhost -U community_user -d community_connect -v ON_ERROR_STOP=1

# Check PostgreSQL logs
tail -100 /usr/local/var/log/postgres.log  # macOS
tail -100 /var/log/postgresql/postgresql-*.log  # Linux
```

### Disk Space Issues

```bash
# Check backup directory size
du -sh backups/

# Remove old backups manually
find backups/ -name "*.sql.gz" -mtime +30 -delete

# Compress uncompressed backups
gzip backups/*.sql

# Move old backups to archive
mkdir backups/archive
mv backups/*_202411*.sql.gz backups/archive/
```

## 📚 Additional Resources

- [PostgreSQL Backup Documentation](https://www.postgresql.org/docs/current/backup.html)
- [pgvector Extension](https://github.com/pgvector/pgvector)
- [Restore Instructions](RESTORE_INSTRUCTIONS.md)

---

**Last Updated:** 2025-11-20
**Maintained by:** Development Team
**Status:** ✅ Production Ready
