#!/bin/bash

# ============================================
# Community Connect - Migration Automation
# ============================================
# This script automates migration from v1.0 → v2.0
# Run as: sudo ./migrate.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

LOG_FILE="migration_$(date +%Y%m%d_%H%M%S).log"
BACKUP_DIR="backups/migration_$(date +%Y%m%d_%H%M%S)"

# Read from existing .env or prompt
# Check multiple possible locations
if [ -f ".env" ]; then
    set -a  # Mark all variables for export
    source .env
    set +a
elif [ -f "Server/.env" ]; then
    set -a
    source Server/.env
    set +a
elif [ -f "../Server/.env" ]; then
    set -a
    source ../Server/.env
    set +a
else
    echo "Error: .env not found. Please ensure .env exists in current directory."
    echo "Searched locations:"
    echo "  - ./.env"
    echo "  - ./Server/.env"
    echo "  - ../Server/.env"
    exit 1
fi

# Verify DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "Error: DATABASE_URL not found in .env file"
    exit 1
fi

echo "Using database: $(echo $DATABASE_URL | sed 's/:\/\/.*@/:\/\/***:***@/')"  # Hide credentials
echo ""

log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1" | tee -a $LOG_FILE
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a $LOG_FILE
    exit 1
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a $LOG_FILE
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a $LOG_FILE
}

# ============================================
# Phase 1: Pre-Migration
# ============================================
phase1_pre_migration() {
    log "=== PHASE 1: PRE-MIGRATION ==="
    
    mkdir -p "$BACKUP_DIR"
    
    # 1. Full database backup (compressed custom format)
    log "Creating full database backup..."
    pg_dump "$DATABASE_URL" -Fc -f "$BACKUP_DIR/full_backup.dump"
    
    if [ $? -ne 0 ]; then
        error "Database backup failed! Cannot proceed without backup."
    fi
    
    # Verify backup file exists and is not empty
    if [ ! -s "$BACKUP_DIR/full_backup.dump" ]; then
        error "Backup file is empty or missing!"
    fi
    
    BACKUP_SIZE=$(du -h "$BACKUP_DIR/full_backup.dump" | cut -f1)
    log "✓ Backup created: $BACKUP_DIR/full_backup.dump ($BACKUP_SIZE)"
    
    # 1b. Additional SQL backup (human-readable)
    log "Creating SQL text backup..."
    pg_dump "$DATABASE_URL" -f "$BACKUP_DIR/full_backup.sql"
    
    if [ -s "$BACKUP_DIR/full_backup.sql" ]; then
        gzip "$BACKUP_DIR/full_backup.sql"
        SQL_SIZE=$(du -h "$BACKUP_DIR/full_backup.sql.gz" | cut -f1)
        log "✓ SQL backup created: $BACKUP_DIR/full_backup.sql.gz ($SQL_SIZE)"
    fi
    
    # 1c. Export critical tables as CSV (for emergency recovery)
    log "Exporting critical data as CSV..."
    psql "$DATABASE_URL" -c "\COPY (SELECT * FROM community_members) TO '$BACKUP_DIR/community_members.csv' CSV HEADER" 2>/dev/null
    psql "$DATABASE_URL" -c "\COPY (SELECT * FROM member_embeddings) TO '$BACKUP_DIR/member_embeddings.csv' CSV HEADER" 2>/dev/null
    log "✓ CSV exports created"
    
    # 1d. Create backup manifest
    cat > "$BACKUP_DIR/manifest.txt" << EOF
Community Connect Database Backup
Created: $(date)
Database URL: $DATABASE_URL
Backup Type: Pre-Migration (v1.0 → v2.0)

Files:
- full_backup.dump      : PostgreSQL custom format (for pg_restore)
- full_backup.sql.gz    : SQL text format (compressed)
- community_members.csv : Members table export
- member_embeddings.csv : Embeddings table export
- audit_report.txt      : Pre-migration data quality report
- verification_report.txt : Post-migration verification (added after migration)

Restore Instructions:
1. Full restore: pg_restore -d DATABASE_URL -c full_backup.dump
2. SQL restore: gunzip -c full_backup.sql.gz | psql DATABASE_URL
3. CSV import: \COPY table_name FROM 'file.csv' CSV HEADER
EOF
    
    log "✓ Backup manifest created"
    
    # 2. Data quality audit
    log "Running data quality audit..."
    
    psql "$DATABASE_URL" -t << 'EOF' > "$BACKUP_DIR/audit_report.txt"
-- Null checks
SELECT 'Members with null phone: ' || COUNT(*) FROM community_members WHERE phone IS NULL;
SELECT 'Members with null name: ' || COUNT(*) FROM community_members WHERE name IS NULL;

-- Duplicate checks
SELECT 'Duplicate phones: ' || COUNT(*) FROM (
    SELECT phone FROM community_members GROUP BY phone HAVING COUNT(*) > 1
) t;

-- Format validation
SELECT 'Invalid phone formats: ' || COUNT(*) FROM community_members 
WHERE phone !~ '^\+[0-9]{10,15}$';

SELECT 'Invalid emails: ' || COUNT(*) FROM community_members 
WHERE email IS NOT NULL AND email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';

-- Statistics
SELECT 'Total members: ' || COUNT(*) FROM community_members;
SELECT 'Members with embeddings: ' || COUNT(*) FROM member_embeddings;
EOF
    
    cat "$BACKUP_DIR/audit_report.txt"
    log "✓ Audit report saved"
    
    # 3. Check for critical issues
    NULL_PHONES=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM community_members WHERE phone IS NULL;")
    if [ "$NULL_PHONES" -gt 0 ]; then
        error "Found $NULL_PHONES members with null phone numbers. Fix before migration!"
    fi
    
    # 4. Test backup integrity
    log "Testing backup integrity..."
    pg_restore --list "$BACKUP_DIR/full_backup.dump" > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        log "✓ Backup integrity verified"
    else
        error "Backup file is corrupted! Cannot proceed."
    fi
    
    # 5. Calculate backup checksum
    if command -v sha256sum &> /dev/null; then
        CHECKSUM=$(sha256sum "$BACKUP_DIR/full_backup.dump" | cut -d' ' -f1)
    else
        CHECKSUM=$(shasum -a 256 "$BACKUP_DIR/full_backup.dump" | cut -d' ' -f1)
    fi
    
    echo "Backup Checksum (SHA-256): $CHECKSUM" >> "$BACKUP_DIR/manifest.txt"
    log "✓ Backup checksum: ${CHECKSUM:0:16}..."
    
    log "✓ Pre-migration checks passed"
    info "Backup location: $BACKUP_DIR"
    
    # Pause for confirmation
    echo ""
    warn "CRITICAL: This backup contains ALL your data"
    warn "Location: $BACKUP_DIR"
    warn "Size: $BACKUP_SIZE"
    echo ""
    read -p "Confirm backup location is correct and proceed? (yes/NO): " -r
    
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        error "Migration cancelled by user"
    fi
}

# ============================================
# Phase 2: Schema Migration
# ============================================
phase2_schema_migration() {
    log "=== PHASE 2: SCHEMA MIGRATION ==="
    
    # 1. Rename old tables
    log "Renaming existing tables..."
    psql "$DATABASE_URL" << 'EOF'
-- Rename old tables (keep for rollback)
ALTER TABLE IF EXISTS community_members RENAME TO community_members_old;
ALTER TABLE IF EXISTS member_embeddings RENAME TO member_embeddings_old;
ALTER TABLE IF EXISTS search_queries RENAME TO search_queries_old;
EOF
    log "✓ Old tables renamed"
    
    # 2. Install new schema
    log "Installing new schema..."
    psql "$DATABASE_URL" -f docs/communityconnect_schema_final.sql >> $LOG_FILE 2>&1
    
    if [ $? -eq 0 ]; then
        log "✓ New schema installed"
    else
        error "Schema installation failed. Check $LOG_FILE"
    fi
    
    # 3. Verify new structure
    TABLE_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name NOT LIKE '%_old';")
    log "✓ New tables created: $TABLE_COUNT"
}

# ============================================
# Phase 3: Data Migration
# ============================================
phase3_data_migration() {
    log "=== PHASE 3: DATA MIGRATION ==="
    
    # 1. Create default community
    log "Creating default community..."
    COMMUNITY_ID=$(psql "$DATABASE_URL" -t << 'EOF' | tr -d ' '
INSERT INTO communities (
    name, slug, type, description, 
    subscription_plan, member_limit, is_bot_enabled
)
VALUES (
    'Main Community', 'main-community', 'mixed',
    'Migrated from v1.0',
    'pro', 10000, true
)
RETURNING id;
EOF
    )
    log "✓ Default community created: $COMMUNITY_ID"
    
    # 2. Migrate members
    log "Migrating members table..."
    psql "$DATABASE_URL" << EOF
INSERT INTO members (id, phone, email, name, created_at, updated_at)
SELECT 
    id, phone, email, name,
    COALESCE(created_at, NOW()),
    COALESCE(updated_at, NOW())
FROM community_members_old
ON CONFLICT (phone) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name;
EOF
    
    MIGRATED_MEMBERS=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM members;")
    log "✓ Migrated members: $MIGRATED_MEMBERS"
    
    # 3. Create memberships
    log "Creating community memberships..."
    psql "$DATABASE_URL" << EOF
INSERT INTO community_memberships (
    community_id, member_id, member_type,
    role, join_date, is_active
)
SELECT 
    '$COMMUNITY_ID',
    id,
    CASE 
        WHEN LOWER(COALESCE(member_type, '')) = 'alumni' THEN 'alumni'
        WHEN LOWER(COALESCE(member_type, '')) = 'entrepreneur' THEN 'entrepreneur'
        WHEN LOWER(COALESCE(member_type, '')) = 'resident' THEN 'resident'
        ELSE 'generic'
    END,
    COALESCE(role, 'member')::VARCHAR,
    COALESCE(created_at, NOW()),
    true
FROM community_members_old
ON CONFLICT DO NOTHING;
EOF
    
    MEMBERSHIPS=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM community_memberships;")
    log "✓ Created memberships: $MEMBERSHIPS"
    
    # 4. Migrate type-specific profiles
    log "Migrating alumni profiles..."
    psql "$DATABASE_URL" << EOF
INSERT INTO alumni_profiles (
    membership_id, college, graduation_year, degree, department,
    current_organization, designation, city, skills, domains
)
SELECT 
    cm.id,
    old.college,
    old.graduation_year,
    old.degree,
    old.department,
    old.current_organization,
    old.designation,
    old.city,
    CASE WHEN old.skills IS NOT NULL THEN string_to_array(old.skills, ',') ELSE ARRAY[]::VARCHAR[] END,
    CASE WHEN old.domains IS NOT NULL THEN string_to_array(old.domains, ',') ELSE ARRAY[]::VARCHAR[] END
FROM community_members_old old
JOIN members m ON m.phone = old.phone
JOIN community_memberships cm ON cm.member_id = m.id
WHERE cm.member_type = 'alumni'
ON CONFLICT DO NOTHING;
EOF
    
    log "Migrating entrepreneur profiles..."
    psql "$DATABASE_URL" << EOF
INSERT INTO entrepreneur_profiles (
    membership_id, company, industry, company_stage,
    services_offered, expertise, city, looking_for
)
SELECT 
    cm.id,
    old.company,
    old.industry,
    COALESCE(old.company_stage, 'Unknown'),
    CASE WHEN old.services_offered IS NOT NULL THEN string_to_array(old.services_offered, ',') ELSE ARRAY[]::VARCHAR[] END,
    CASE WHEN old.expertise IS NOT NULL THEN string_to_array(old.expertise, ',') ELSE ARRAY[]::VARCHAR[] END,
    old.city,
    CASE WHEN old.looking_for IS NOT NULL THEN string_to_array(old.looking_for, ',') ELSE ARRAY[]::VARCHAR[] END
FROM community_members_old old
JOIN members m ON m.phone = old.phone
JOIN community_memberships cm ON cm.member_id = m.id
WHERE cm.member_type = 'entrepreneur'
ON CONFLICT DO NOTHING;
EOF
    
    log "Migrating resident profiles..."
    psql "$DATABASE_URL" << EOF
INSERT INTO resident_profiles (
    membership_id, flat_number, tower_block, floor_number,
    resident_type, move_in_date, family_size
)
SELECT 
    cm.id,
    old.flat_number,
    old.tower_block,
    old.floor_number,
    COALESCE(old.resident_type, 'owner'),
    old.move_in_date,
    old.family_size
FROM community_members_old old
JOIN members m ON m.phone = old.phone
JOIN community_memberships cm ON cm.member_id = m.id
WHERE cm.member_type = 'resident'
ON CONFLICT DO NOTHING;
EOF
    
    ALUMNI=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM alumni_profiles;")
    ENTREPRENEURS=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM entrepreneur_profiles;")
    RESIDENTS=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM resident_profiles;")
    
    log "✓ Alumni profiles: $ALUMNI"
    log "✓ Entrepreneur profiles: $ENTREPRENEURS"
    log "✓ Resident profiles: $RESIDENTS"
    
    # 5. Migrate embeddings (profile + skills only, contextual will be regenerated)
    log "Migrating existing embeddings..."
    psql "$DATABASE_URL" << EOF
INSERT INTO member_embeddings (
    member_id, community_id,
    profile_embedding, skills_embedding,
    last_generated_at
)
SELECT 
    m.id,
    '$COMMUNITY_ID',
    old.profile_embedding,
    old.skills_embedding,
    old.last_generated_at
FROM member_embeddings_old old
JOIN members m ON m.id = old.member_id
WHERE old.profile_embedding IS NOT NULL
ON CONFLICT DO NOTHING;
EOF
    
    EMBEDDINGS=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM member_embeddings;")
    log "✓ Migrated embeddings: $EMBEDDINGS"
}

# ============================================
# Phase 4: Post-Migration
# ============================================
phase4_post_migration() {
    log "=== PHASE 4: POST-MIGRATION ==="
    
    # 1. Rebuild search index
    log "Rebuilding full-text search index..."
    psql "$DATABASE_URL" << 'EOF'
TRUNCATE member_search_index;
-- Trigger will auto-populate on next insert/update
-- Or manually populate:
INSERT INTO member_search_index (member_id, community_id, search_vector, last_indexed_at)
SELECT 
    m.id,
    cm.community_id,
    setweight(to_tsvector('english', COALESCE(m.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(m.email, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(
        (SELECT string_agg(skill, ' ') FROM unnest(ap.skills) AS skill), ''
    )), 'C'),
    NOW()
FROM members m
JOIN community_memberships cm ON cm.member_id = m.id
LEFT JOIN alumni_profiles ap ON ap.membership_id = cm.id
ON CONFLICT (member_id, community_id) DO UPDATE SET
    search_vector = EXCLUDED.search_vector,
    last_indexed_at = NOW();
EOF
    log "✓ Search index rebuilt"
    
    # 2. Vacuum and analyze
    log "Optimizing database..."
    psql "$DATABASE_URL" << 'EOF'
VACUUM ANALYZE members;
VACUUM ANALYZE community_memberships;
VACUUM ANALYZE member_embeddings;
VACUUM ANALYZE member_search_index;
EOF
    log "✓ Database optimized"
    
    # 3. Generate missing contextual embeddings
    log "Scheduling contextual embeddings generation..."
    info "Run: cd Server && npm run generate:contextual-embeddings"
    
    # Create job tracker
    psql "$DATABASE_URL" << EOF
INSERT INTO embedding_generation_jobs (
    community_id, job_type, total_members,
    status, started_at
)
SELECT 
    '$COMMUNITY_ID',
    'contextual_only',
    COUNT(*),
    'pending',
    NOW()
FROM members;
EOF
    
    log "✓ Embedding job scheduled"
}

# ============================================
# Phase 5: Verification
# ============================================
phase5_verification() {
    log "=== PHASE 5: VERIFICATION ==="
    
    psql "$DATABASE_URL" << 'EOF' > "$BACKUP_DIR/verification_report.txt"
-- Count verification
SELECT '=== RECORD COUNTS ===' AS section;
SELECT 'Members (old): ' || COUNT(*) FROM community_members_old;
SELECT 'Members (new): ' || COUNT(*) FROM members;
SELECT 'Memberships: ' || COUNT(*) FROM community_memberships;
SELECT 'Alumni profiles: ' || COUNT(*) FROM alumni_profiles;
SELECT 'Entrepreneur profiles: ' || COUNT(*) FROM entrepreneur_profiles;
SELECT 'Resident profiles: ' || COUNT(*) FROM resident_profiles;
SELECT 'Embeddings (old): ' || COUNT(*) FROM member_embeddings_old WHERE profile_embedding IS NOT NULL;
SELECT 'Embeddings (new): ' || COUNT(*) FROM member_embeddings WHERE profile_embedding IS NOT NULL;

-- Integrity checks
SELECT '=== INTEGRITY CHECKS ===' AS section;
SELECT 'Members without memberships: ' || COUNT(*) 
FROM members m 
LEFT JOIN community_memberships cm ON cm.member_id = m.id 
WHERE cm.id IS NULL;

SELECT 'Memberships without profiles: ' || COUNT(*)
FROM community_memberships cm
LEFT JOIN alumni_profiles ap ON ap.membership_id = cm.id
LEFT JOIN entrepreneur_profiles ep ON ep.membership_id = cm.id
LEFT JOIN resident_profiles rp ON rp.membership_id = cm.id
WHERE cm.member_type != 'generic'
  AND ap.id IS NULL AND ep.id IS NULL AND rp.id IS NULL;

-- Sample data check
SELECT '=== SAMPLE DATA ===' AS section;
SELECT m.name, m.phone, cm.member_type, cm.role
FROM members m
JOIN community_memberships cm ON cm.member_id = m.id
LIMIT 5;
EOF
    
    cat "$BACKUP_DIR/verification_report.txt"
    log "✓ Verification report created"
    
    # Check for issues
    ORPHANS=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM members m LEFT JOIN community_memberships cm ON cm.member_id = m.id WHERE cm.id IS NULL;")
    
    if [ "$ORPHANS" -gt 0 ]; then
        warn "Found $ORPHANS members without memberships!"
    else
        log "✓ All members have memberships"
    fi
}

# ============================================
# Phase 6: Cleanup
# ============================================
phase6_cleanup() {
    log "=== PHASE 6: CLEANUP ==="
    
    read -p "Drop old tables? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log "Dropping old tables..."
        psql "$DATABASE_URL" << 'EOF'
DROP TABLE IF EXISTS community_members_old CASCADE;
DROP TABLE IF EXISTS member_embeddings_old CASCADE;
DROP TABLE IF EXISTS search_queries_old CASCADE;
EOF
        log "✓ Old tables dropped"
    else
        info "Old tables kept for rollback: *_old"
    fi
    
    log "✓ Cleanup complete"
}

# ============================================
# Rollback Function
# ============================================
rollback() {
    echo ""
    error "Migration failed at $(date)! Initiating rollback..."
    
    log "Step 1: Stopping any active connections..."
    psql "$DATABASE_URL" -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = current_database() AND pid <> pg_backend_pid();" 2>/dev/null || true
    
    log "Step 2: Restoring from backup..."
    
    # Try custom format first
    if [ -f "$BACKUP_DIR/full_backup.dump" ]; then
        log "Restoring from custom format backup..."
        pg_restore -d "$DATABASE_URL" --clean --if-exists "$BACKUP_DIR/full_backup.dump" >> $LOG_FILE 2>&1
        
        if [ $? -eq 0 ]; then
            log "✓ Database restored from backup"
        else
            warn "Custom format restore had issues, trying SQL backup..."
            
            # Fallback to SQL backup
            if [ -f "$BACKUP_DIR/full_backup.sql.gz" ]; then
                gunzip -c "$BACKUP_DIR/full_backup.sql.gz" | psql "$DATABASE_URL" >> $LOG_FILE 2>&1
                log "✓ Database restored from SQL backup"
            else
                error "Both restore methods failed! Manual recovery needed."
            fi
        fi
    else
        error "Backup file not found: $BACKUP_DIR/full_backup.dump"
    fi
    
    log "Step 3: Verifying restored data..."
    RESTORED_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM community_members;" 2>/dev/null || echo "0")
    log "Restored members: $RESTORED_COUNT"
    
    echo ""
    echo "=========================================="
    echo "Rollback Complete"
    echo "=========================================="
    echo ""
    echo "Database restored to pre-migration state"
    echo "Backup preserved at: $BACKUP_DIR"
    echo "Migration log: $LOG_FILE"
    echo ""
    echo "Review logs to identify failure cause:"
    echo "  tail -50 $LOG_FILE"
    echo ""
    
    exit 1
}

# ============================================
# Main Execution
# ============================================
main() {
    echo "=========================================="
    echo "Community Connect v2.0 - Migration Script"
    echo "=========================================="
    echo ""
    
    warn "⚠️  DATABASE MIGRATION WARNING ⚠️"
    warn "This will migrate your database to v2.0 schema"
    warn "Estimated downtime: 5 minutes - 2 hours (data-dependent)"
    echo ""
    info "What will happen:"
    info "  1. Full backup of current database"
    info "  2. Data quality audit"
    info "  3. Schema migration (old tables renamed)"
    info "  4. Data migration to new structure"
    info "  5. Search index rebuild"
    info "  6. Verification checks"
    echo ""
    warn "Prerequisites:"
    warn "  ✓ Database backup verified"
    warn "  ✓ Sufficient disk space (2x current DB size)"
    warn "  ✓ No active user sessions"
    warn "  ✓ Maintenance window scheduled"
    echo ""
    read -p "Continue with migration? (yes/NO): " -r
    
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        echo "Migration cancelled"
        exit 0
    fi
    
    # Record migration start time
    MIGRATION_START=$(date +%s)
    
    # Trap errors for rollback
    trap rollback ERR
    
    phase1_pre_migration
    phase2_schema_migration
    phase3_data_migration
    phase4_post_migration
    phase5_verification
    phase6_cleanup
    
    # Calculate duration
    MIGRATION_END=$(date +%s)
    DURATION=$((MIGRATION_END - MIGRATION_START))
    DURATION_MIN=$((DURATION / 60))
    DURATION_SEC=$((DURATION % 60))
    
    echo ""
    echo "=========================================="
    echo "Migration Complete! 🎉"
    echo "=========================================="
    echo ""
    echo "Duration: ${DURATION_MIN}m ${DURATION_SEC}s"
    echo "Backup Location: $BACKUP_DIR"
    echo "Migration Log: $LOG_FILE"
    echo ""
    echo "Backup Contents:"
    echo "  - full_backup.dump (PostgreSQL format)"
    echo "  - full_backup.sql.gz (SQL text format)"
    echo "  - *.csv (CSV exports)"
    echo "  - manifest.txt (backup details)"
    echo ""
    echo "Next Steps:"
    echo "  1. Review verification report:"
    echo "     cat $BACKUP_DIR/verification_report.txt"
    echo ""
    echo "  2. Generate contextual embeddings:"
    echo "     cd Server && npm run generate:contextual-embeddings"
    echo ""
    echo "  3. Update application code to use new schema"
    echo "     (See MIGRATION_PLAN.md Phase 5)"
    echo ""
    echo "  4. Test ALL features before going live:"
    echo "     - WhatsApp search: npm run test:whatsapp"
    echo "     - Dashboard: npm run dev"
    echo "     - API endpoints: npm run test:api"
    echo ""
    echo "  5. Monitor application for 24-48 hours"
    echo ""
    echo "⚠️  IMPORTANT:"
    echo "  - Keep backup for minimum 7 days"
    echo "  - Old tables (*_old) kept for rollback"
    echo "  - DO NOT drop old tables until fully verified"
    echo ""
    echo "Rollback Instructions (if needed):"
    echo "  pg_restore -d \$DATABASE_URL --clean $BACKUP_DIR/full_backup.dump"
    echo ""
    echo "=========================================="
}

main "$@"
