#!/bin/bash

# ============================================
# Backup Verification Script
# ============================================
# Tests backup integrity before migration
# Usage: ./verify-backup.sh [backup_dir]

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

BACKUP_DIR="${1:-backups/latest}"

log() {
    echo -e "${GREEN}[✓]${NC} $1"
}

error() {
    echo -e "${RED}[✗]${NC} $1"
    exit 1
}

warn() {
    echo -e "${YELLOW}[!]${NC} $1"
}

echo "=========================================="
echo "Backup Verification Tool"
echo "=========================================="
echo ""

# Check if backup directory exists
if [ ! -d "$BACKUP_DIR" ]; then
    error "Backup directory not found: $BACKUP_DIR"
fi

log "Checking backup directory: $BACKUP_DIR"
echo ""

# 1. Check for required files
echo "File Presence Check:"
echo "-------------------"

FILES=(
    "full_backup.dump:PostgreSQL custom format"
    "full_backup.sql.gz:SQL text format"
    "community_members.csv:Members export"
    "manifest.txt:Backup manifest"
)

for file_entry in "${FILES[@]}"; do
    IFS=':' read -r file desc <<< "$file_entry"
    
    if [ -f "$BACKUP_DIR/$file" ]; then
        size=$(du -h "$BACKUP_DIR/$file" | cut -f1)
        log "$desc ($file) - $size"
    else
        error "$desc ($file) - MISSING"
    fi
done

echo ""

# 2. Verify PostgreSQL backup integrity
echo "Integrity Checks:"
echo "----------------"

if pg_restore --list "$BACKUP_DIR/full_backup.dump" > /dev/null 2>&1; then
    TABLE_COUNT=$(pg_restore --list "$BACKUP_DIR/full_backup.dump" | grep "TABLE DATA" | wc -l | tr -d ' ')
    log "PostgreSQL backup is valid ($TABLE_COUNT tables)"
else
    error "PostgreSQL backup is corrupted!"
fi

# 3. Check SQL backup
if gunzip -t "$BACKUP_DIR/full_backup.sql.gz" 2>/dev/null; then
    log "SQL backup gzip compression is valid"
else
    warn "SQL backup may be corrupted"
fi

# 4. Verify checksum
if [ -f "$BACKUP_DIR/manifest.txt" ]; then
    if grep -q "Checksum" "$BACKUP_DIR/manifest.txt"; then
        STORED_CHECKSUM=$(grep "Checksum" "$BACKUP_DIR/manifest.txt" | cut -d':' -f2 | tr -d ' ')
        
        if command -v sha256sum &> /dev/null; then
            CURRENT_CHECKSUM=$(sha256sum "$BACKUP_DIR/full_backup.dump" | cut -d' ' -f1)
        else
            CURRENT_CHECKSUM=$(shasum -a 256 "$BACKUP_DIR/full_backup.dump" | cut -d' ' -f1)
        fi
        
        if [ "$STORED_CHECKSUM" = "$CURRENT_CHECKSUM" ]; then
            log "Checksum matches (${CURRENT_CHECKSUM:0:16}...)"
        else
            error "Checksum mismatch! Backup may be corrupted."
        fi
    else
        warn "No checksum found in manifest"
    fi
fi

echo ""

# 5. Show backup metadata
echo "Backup Metadata:"
echo "---------------"
if [ -f "$BACKUP_DIR/manifest.txt" ]; then
    cat "$BACKUP_DIR/manifest.txt" | head -10
else
    warn "No manifest file found"
fi

echo ""

# 6. Estimate restore time
DUMP_SIZE=$(stat -f%z "$BACKUP_DIR/full_backup.dump" 2>/dev/null || stat -c%s "$BACKUP_DIR/full_backup.dump" 2>/dev/null || echo "0")
DUMP_SIZE_MB=$((DUMP_SIZE / 1024 / 1024))

if [ $DUMP_SIZE_MB -gt 0 ]; then
    # Rough estimate: 100MB/minute for restore
    EST_MINUTES=$((DUMP_SIZE_MB / 100 + 1))
    
    echo "Restore Estimates:"
    echo "-----------------"
    echo "Backup size: ${DUMP_SIZE_MB}MB"
    echo "Estimated restore time: ~${EST_MINUTES} minutes"
    echo "Estimated migration time: ~$((EST_MINUTES * 3)) minutes"
fi

echo ""

# 7. Test restore command (dry-run)
echo "Restore Commands:"
echo "----------------"
echo "# Method 1 (Recommended): PostgreSQL custom format"
echo "pg_restore -d \$DATABASE_URL --clean --if-exists $BACKUP_DIR/full_backup.dump"
echo ""
echo "# Method 2 (Fallback): SQL text format"
echo "gunzip -c $BACKUP_DIR/full_backup.sql.gz | psql \$DATABASE_URL"
echo ""
echo "# Method 3 (Emergency): CSV import"
echo "psql \$DATABASE_URL -c \"\COPY community_members FROM '$BACKUP_DIR/community_members.csv' CSV HEADER\""

echo ""
echo "=========================================="
log "Backup verification PASSED"
echo "=========================================="
echo ""
echo "This backup is ready for:"
echo "  ✓ Migration rollback"
echo "  ✓ Disaster recovery"
echo "  ✓ Data archival"
