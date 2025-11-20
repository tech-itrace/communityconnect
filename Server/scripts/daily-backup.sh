#!/bin/bash

################################################################################
# Daily Database Backup Script for Community Connect
#
# This script creates a full backup of the community_connect database with:
# - Timestamped filenames
# - Compression to save space
# - Automatic cleanup of old backups
# - Verification of backup integrity
# - Optional upload to cloud storage
#
# Usage:
#   ./scripts/daily-backup.sh                 # Create backup with default settings
#   ./scripts/daily-backup.sh --retention 7   # Keep backups for 7 days
#   ./scripts/daily-backup.sh --upload        # Upload to cloud storage
#   ./scripts/daily-backup.sh --verify        # Verify backup after creation
#
# Schedule with cron (daily at 2 AM):
#   0 2 * * * /path/to/scripts/daily-backup.sh >> /path/to/logs/backup.log 2>&1
#
################################################################################

set -e  # Exit on error

# ============================================================================
# Configuration (customize these values)
# ============================================================================

# Database connection
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-community_user}"
DB_PASSWORD="${DB_PASSWORD:-dev_password_123}"
DB_NAME="${DB_NAME:-community_connect}"

# Backup settings
BACKUP_DIR="backups"
RETENTION_DAYS=30  # Keep backups for 30 days by default
COMPRESS=true      # Compress backups by default
VERIFY=false       # Don't verify by default (faster)
UPLOAD=false       # Don't upload by default

# Cloud storage (optional)
S3_BUCKET=""       # Set to enable S3 upload: s3://your-bucket/backups
GCS_BUCKET=""      # Set to enable GCS upload: gs://your-bucket/backups

# ============================================================================
# Parse command line arguments
# ============================================================================

while [[ $# -gt 0 ]]; do
    case $1 in
        --retention)
            RETENTION_DAYS="$2"
            shift 2
            ;;
        --verify)
            VERIFY=true
            shift
            ;;
        --upload)
            UPLOAD=true
            shift
            ;;
        --no-compress)
            COMPRESS=false
            shift
            ;;
        --help)
            grep "^#" "$0" | grep -v "#!/bin/bash" | sed 's/^# //'
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# ============================================================================
# Setup
# ============================================================================

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Generate timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DATE_HUMAN=$(date +"%Y-%m-%d %H:%M:%S")

# Backup filename
BACKUP_FILE="$BACKUP_DIR/community_connect_backup_${TIMESTAMP}.sql"
BACKUP_COMPRESSED="${BACKUP_FILE}.gz"

# Log function
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

# ============================================================================
# Pre-flight checks
# ============================================================================

log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "🔄 Starting Daily Database Backup"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log ""
log "📋 Configuration:"
log "   Database: $DB_NAME@$DB_HOST:$DB_PORT"
log "   Backup Directory: $BACKUP_DIR"
log "   Retention: $RETENTION_DAYS days"
log "   Compress: $COMPRESS"
log "   Verify: $VERIFY"
log "   Upload: $UPLOAD"
log ""

# Check if PostgreSQL is running
if ! pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" &>/dev/null; then
    log "❌ Error: PostgreSQL is not running or not accessible"
    log "   Host: $DB_HOST:$DB_PORT"
    log "   User: $DB_USER"
    exit 1
fi

log "✅ PostgreSQL is running"

# Check if database exists
if ! PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    log "❌ Error: Database '$DB_NAME' does not exist"
    exit 1
fi

log "✅ Database '$DB_NAME' exists"
log ""

# ============================================================================
# Create backup
# ============================================================================

log "📦 Creating database backup..."
log "   File: $BACKUP_FILE"

START_TIME=$(date +%s)

# Create backup using pg_dump
PGPASSWORD="$DB_PASSWORD" pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --format=plain \
    --no-owner \
    --no-acl \
    --file="$BACKUP_FILE" 2>&1 > /dev/null

DUMP_EXIT_CODE=$?

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

if [ $DUMP_EXIT_CODE -eq 0 ] && [ -f "$BACKUP_FILE" ]; then
    FILE_SIZE=$(ls -lh "$BACKUP_FILE" | awk '{print $5}')
    log "✅ Backup created successfully"
    log "   Size: $FILE_SIZE"
    log "   Duration: ${DURATION}s"
else
    log "❌ Error: pg_dump failed (exit code: $DUMP_EXIT_CODE)"
    [ -f "$BACKUP_FILE" ] && rm -f "$BACKUP_FILE"
    exit 1
fi

# ============================================================================
# Compress backup
# ============================================================================

if [ "$COMPRESS" = true ]; then
    log ""
    log "🗜️  Compressing backup..."

    if gzip -f "$BACKUP_FILE"; then
        COMPRESSED_SIZE=$(ls -lh "$BACKUP_COMPRESSED" | awk '{print $5}')
        log "✅ Backup compressed successfully"
        log "   Compressed Size: $COMPRESSED_SIZE"
        FINAL_BACKUP="$BACKUP_COMPRESSED"
    else
        log "⚠️  Warning: Compression failed, keeping uncompressed backup"
        FINAL_BACKUP="$BACKUP_FILE"
    fi
else
    FINAL_BACKUP="$BACKUP_FILE"
fi

# ============================================================================
# Verify backup
# ============================================================================

if [ "$VERIFY" = true ]; then
    log ""
    log "🔍 Verifying backup integrity..."

    # Test gunzip if compressed
    if [[ "$FINAL_BACKUP" == *.gz ]]; then
        if gunzip -t "$FINAL_BACKUP" 2>/dev/null; then
            log "✅ Compressed file integrity verified"
        else
            log "❌ Error: Backup file is corrupted!"
            exit 1
        fi
    fi

    # Count records in backup
    if [[ "$FINAL_BACKUP" == *.gz ]]; then
        SQL_CONTENT=$(gunzip -c "$FINAL_BACKUP")
    else
        SQL_CONTENT=$(cat "$FINAL_BACKUP")
    fi

    MEMBER_COUNT=$(echo "$SQL_CONTENT" | sed -n "/^COPY public\.members/,/^\\\\.$/p" | grep -v "^COPY\|^\\\\\." | wc -l | tr -d ' ')
    EMBEDDING_COUNT=$(echo "$SQL_CONTENT" | sed -n "/^COPY public\.member_embeddings/,/^\\\\.$/p" | grep -v "^COPY\|^\\\\\." | wc -l | tr -d ' ')

    log "   Members: $MEMBER_COUNT"
    log "   Embeddings: $EMBEDDING_COUNT"

    if [ "$MEMBER_COUNT" -eq 0 ]; then
        log "⚠️  Warning: No member data found in backup"
    else
        log "✅ Backup contains data"
    fi
fi

# ============================================================================
# Upload to cloud storage
# ============================================================================

if [ "$UPLOAD" = true ]; then
    log ""
    log "☁️  Uploading backup to cloud storage..."

    UPLOADED=false

    # Upload to AWS S3
    if [ -n "$S3_BUCKET" ]; then
        if command -v aws &> /dev/null; then
            log "   Uploading to S3: $S3_BUCKET"
            if aws s3 cp "$FINAL_BACKUP" "$S3_BUCKET/$(basename $FINAL_BACKUP)"; then
                log "✅ Uploaded to S3 successfully"
                UPLOADED=true
            else
                log "⚠️  Warning: S3 upload failed"
            fi
        else
            log "⚠️  Warning: AWS CLI not installed, skipping S3 upload"
        fi
    fi

    # Upload to Google Cloud Storage
    if [ -n "$GCS_BUCKET" ]; then
        if command -v gsutil &> /dev/null; then
            log "   Uploading to GCS: $GCS_BUCKET"
            if gsutil cp "$FINAL_BACKUP" "$GCS_BUCKET/$(basename $FINAL_BACKUP)"; then
                log "✅ Uploaded to GCS successfully"
                UPLOADED=true
            else
                log "⚠️  Warning: GCS upload failed"
            fi
        else
            log "⚠️  Warning: gsutil not installed, skipping GCS upload"
        fi
    fi

    if [ "$UPLOADED" = false ]; then
        log "⚠️  Warning: No cloud storage configured or available"
        log "   Set S3_BUCKET or GCS_BUCKET environment variables"
    fi
fi

# ============================================================================
# Cleanup old backups
# ============================================================================

log ""
log "🧹 Cleaning up old backups (older than $RETENTION_DAYS days)..."

# Count backups before cleanup
BEFORE_COUNT=$(find "$BACKUP_DIR" -name "community_connect_backup_*.sql*" | wc -l | tr -d ' ')

# Remove old backups
DELETED_COUNT=0
while IFS= read -r old_backup; do
    log "   Removing: $(basename $old_backup)"
    rm -f "$old_backup"
    DELETED_COUNT=$((DELETED_COUNT + 1))
done < <(find "$BACKUP_DIR" -name "community_connect_backup_*.sql*" -mtime +$RETENTION_DAYS)

AFTER_COUNT=$(find "$BACKUP_DIR" -name "community_connect_backup_*.sql*" | wc -l | tr -d ' ')

if [ "$DELETED_COUNT" -gt 0 ]; then
    log "✅ Deleted $DELETED_COUNT old backup(s)"
else
    log "✅ No old backups to delete"
fi

log "   Backups remaining: $AFTER_COUNT"

# ============================================================================
# Summary
# ============================================================================

log ""
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "✅ Daily Backup Completed Successfully!"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log ""
log "📊 Backup Summary:"
log "   Timestamp: $DATE_HUMAN"
log "   File: $(basename $FINAL_BACKUP)"
log "   Location: $FINAL_BACKUP"
log "   Size: $(ls -lh $FINAL_BACKUP | awk '{print $5}')"
log "   Duration: ${DURATION}s"

if [ "$VERIFY" = true ]; then
    log "   Members: $MEMBER_COUNT"
    log "   Embeddings: $EMBEDDING_COUNT"
fi

log ""
log "🔄 To restore this backup, run:"
if [[ "$FINAL_BACKUP" == *.gz ]]; then
    log "   gunzip -c $FINAL_BACKUP | \\"
else
    log "   cat $FINAL_BACKUP | \\"
fi
log "     PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME"
log ""

# ============================================================================
# Exit
# ============================================================================

exit 0
