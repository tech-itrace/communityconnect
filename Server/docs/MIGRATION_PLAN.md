# Migration Plan: Current Schema → New Multi-Community Schema

## Executive Summary

This document outlines the complete migration strategy from the current single-community schema to the new multi-community schema with type-specific profiles and embeddings.

**Migration Complexity**: Medium to High  
**Estimated Downtime**: 2-4 hours (for 10k members)  
**Rollback Strategy**: Full database backup + migration rollback script  
**Data Loss Risk**: ZERO (all data preserved)

---

## Current Schema Analysis

### Existing Tables
```
community_members (UUID id, name, email, phone, year_of_graduation, 
                   degree, branch, working_knowledge, organization_name, 
                   designation, city, annual_turnover, role, ...)
                   
member_embeddings (UUID id, member_id → community_members(id),
                   profile_embedding VECTOR(768),
                   skills_embedding VECTOR(768))
                   
search_queries (id, user_id, query_text, ...)
search_cache (query_hash, response, ...)
users (id SERIAL, name, email, phone, ...)
```

### Key Issues
1. ❌ No `community_id` column (single community only)
2. ❌ All member types mixed in one table
3. ❌ Alumni-specific fields (degree, branch) hardcoded
4. ❌ No entrepreneur/resident specific tables
5. ❌ Only 2 embeddings (missing contextual_embedding)
6. ❌ No community management tables
7. ❌ TEXT role column (not checked enum)

---

## Migration Strategy

### Phase 1: Pre-Migration (1-2 days before)

#### 1.1 Database Backup
```bash
# Full database dump
pg_dump -h <host> -U <user> -d communityconnect \
    --format=custom \
    --file=backup_pre_migration_$(date +%Y%m%d_%H%M%S).dump

# Verify backup
pg_restore --list backup_pre_migration_*.dump | head -20

# Test restore on staging (CRITICAL)
createdb communityconnect_staging
pg_restore -h localhost -d communityconnect_staging backup_pre_migration_*.dump
```

#### 1.2 Data Quality Audit
```sql
-- Check for data quality issues that might break migration

-- 1. Members with NULL phone (breaks new schema)
SELECT COUNT(*) as null_phones 
FROM community_members 
WHERE phone IS NULL OR TRIM(phone) = '';

-- 2. Invalid phone formats
SELECT phone, COUNT(*) 
FROM community_members 
WHERE phone IS NOT NULL 
  AND phone !~ '^\+?[1-9]\d{9,14}$'
GROUP BY phone;

-- 3. Duplicate phones (breaks UNIQUE constraint)
SELECT phone, COUNT(*) 
FROM community_members 
WHERE phone IS NOT NULL 
GROUP BY phone 
HAVING COUNT(*) > 1;

-- 4. Invalid emails
SELECT email, COUNT(*) 
FROM community_members 
WHERE email IS NOT NULL 
  AND email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'
GROUP BY email;

-- 5. Orphaned embeddings (should be 0)
SELECT COUNT(*) 
FROM member_embeddings me 
LEFT JOIN community_members cm ON me.member_id = cm.id 
WHERE cm.id IS NULL;

-- 6. Check role values
SELECT role, COUNT(*) 
FROM community_members 
GROUP BY role;
```

#### 1.3 Data Cleanup (if issues found)
```sql
-- Fix NULL phones - assign temporary unique phone
UPDATE community_members 
SET phone = '+91' || LPAD(nextval('temp_phone_seq')::text, 10, '0')
WHERE phone IS NULL OR TRIM(phone) = '';

-- Fix invalid phone formats
UPDATE community_members 
SET phone = '+91' || regexp_replace(phone, '[^0-9]', '', 'g')
WHERE phone !~ '^\+?[1-9]\d{9,14}$';

-- Handle duplicate phones (keep first, update others)
WITH duplicates AS (
    SELECT phone, 
           id,
           ROW_NUMBER() OVER (PARTITION BY phone ORDER BY created_at) as rn
    FROM community_members
    WHERE phone IS NOT NULL
)
UPDATE community_members 
SET phone = phone || '_dup' || d.rn
FROM duplicates d
WHERE community_members.id = d.id 
  AND d.rn > 1;

-- Fix invalid roles
UPDATE community_members 
SET role = 'member' 
WHERE role NOT IN ('member', 'admin', 'super_admin') 
   OR role IS NULL;
```

#### 1.4 Prepare Migration Environment
```bash
# Create migration tracking table in current schema
psql -d communityconnect << 'EOF'
CREATE TABLE IF NOT EXISTS migration_log (
    id SERIAL PRIMARY KEY,
    phase VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'started',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    rows_affected INTEGER
);
EOF
```

---

### Phase 2: Schema Migration (Maintenance Window)

#### 2.1 Set Maintenance Mode
```bash
# Stop application servers
sudo systemctl stop communityconnect-backend
sudo systemctl stop communityconnect-dashboard

# Verify no active connections
psql -d communityconnect -c "
SELECT pid, usename, application_name, state 
FROM pg_stat_activity 
WHERE datname = 'communityconnect' 
  AND pid <> pg_backend_pid();
"

# Terminate remaining connections (if safe)
psql -d communityconnect -c "
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity 
WHERE datname = 'communityconnect' 
  AND pid <> pg_backend_pid();
"
```

#### 2.2 Create New Schema Alongside Old
```bash
# Run new schema creation (without dropping old tables)
psql -d communityconnect -f communityconnect_schema_final.sql

# This creates:
# - communities (new)
# - members (new)
# - community_memberships (new)
# - alumni_profiles (new)
# - entrepreneur_profiles (new)
# - resident_profiles (new)
# - member_embeddings (NEW version with 3 embeddings)
# - All other new tables...

# Rename old tables to _old suffix
psql -d communityconnect << 'EOF'
ALTER TABLE community_members RENAME TO community_members_old;
ALTER TABLE member_embeddings RENAME TO member_embeddings_old;
ALTER TABLE search_queries RENAME TO search_queries_old;
ALTER TABLE search_cache RENAME TO search_cache_old;
-- Keep users table as is for now
EOF
```

---

### Phase 3: Data Migration

#### 3.1 Create Default Community
```sql
-- Log phase start
INSERT INTO migration_log (phase, status) 
VALUES ('create_default_community', 'started');

-- Create default community for existing members
INSERT INTO communities (
    id,
    name, 
    slug, 
    type, 
    description,
    subscription_plan,
    member_limit,
    is_bot_enabled,
    is_active
) VALUES (
    gen_random_uuid(),
    'Community Connect Platform',  -- Update with actual name
    'default-community',
    'mixed',  -- Supports all types
    'Legacy community migrated from single-community setup',
    'enterprise',
    10000,
    true,
    true
) RETURNING id;

-- Store community_id for migration
-- (Replace '<community-id>' below with returned UUID)

UPDATE migration_log 
SET status = 'completed', completed_at = NOW() 
WHERE phase = 'create_default_community';
```

#### 3.2 Migrate Members
```sql
-- Log phase start
INSERT INTO migration_log (phase, status) 
VALUES ('migrate_members', 'started');

-- Create base member records (deduplicated by phone)
INSERT INTO members (
    id,
    phone,
    email,
    name,
    created_at,
    updated_at,
    is_active
)
SELECT 
    id,  -- Preserve UUID
    phone,
    email,
    name,
    created_at,
    updated_at,
    is_active
FROM community_members_old
ON CONFLICT (phone) DO NOTHING;

-- Log completion
UPDATE migration_log 
SET status = 'completed', 
    completed_at = NOW(),
    rows_affected = (SELECT COUNT(*) FROM members)
WHERE phase = 'migrate_members';
```

#### 3.3 Determine Member Types
```sql
-- Log phase start
INSERT INTO migration_log (phase, status) 
VALUES ('determine_member_types', 'started');

-- Logic to determine member type from existing data:
-- If has degree/branch/year_of_graduation → alumni
-- If has organization and services/products indicators → entrepreneur
-- Default → alumni (since current schema is alumni-heavy)

-- Create temporary type classification table
CREATE TEMP TABLE member_type_classification AS
SELECT 
    id,
    CASE
        -- Strong alumni indicators
        WHEN year_of_graduation IS NOT NULL 
         AND degree IS NOT NULL 
         AND branch IS NOT NULL 
        THEN 'alumni'
        
        -- Entrepreneur indicators (working_knowledge contains business terms)
        WHEN working_knowledge ILIKE ANY(ARRAY[
            '%services%', '%consulting%', '%founder%', 
            '%CEO%', '%director%', '%business%'
        ])
        THEN 'entrepreneur'
        
        -- Default to alumni (current schema bias)
        ELSE 'alumni'
    END as member_type
FROM community_members_old;

-- Log completion
UPDATE migration_log 
SET status = 'completed', 
    completed_at = NOW(),
    rows_affected = (SELECT COUNT(*) FROM member_type_classification)
WHERE phase = 'determine_member_types';
```

#### 3.4 Create Community Memberships
```sql
-- Log phase start
INSERT INTO migration_log (phase, status) 
VALUES ('create_memberships', 'started');

-- Create membership records
INSERT INTO community_memberships (
    id,
    community_id,
    member_id,
    member_type,
    role,
    is_active,
    joined_at,
    updated_at
)
SELECT 
    gen_random_uuid(),
    '<DEFAULT_COMMUNITY_ID>'::uuid,  -- Replace with actual ID
    cm.id,
    mtc.member_type,
    COALESCE(cm.role, 'member'),
    cm.is_active,
    cm.created_at,
    cm.updated_at
FROM community_members_old cm
JOIN member_type_classification mtc ON cm.id = mtc.id;

-- Log completion
UPDATE migration_log 
SET status = 'completed', 
    completed_at = NOW(),
    rows_affected = (SELECT COUNT(*) FROM community_memberships)
WHERE phase = 'create_memberships';
```

#### 3.5 Migrate to Type-Specific Profiles

**Alumni Profiles:**
```sql
-- Log phase start
INSERT INTO migration_log (phase, status) 
VALUES ('migrate_alumni_profiles', 'started');

INSERT INTO alumni_profiles (
    membership_id,
    college,
    graduation_year,
    degree,
    department,
    current_organization,
    designation,
    city,
    state,
    country,
    skills,
    created_at,
    updated_at
)
SELECT 
    cm.id,
    COALESCE(cm_old.branch, 'Not Specified'),  -- Use branch as college placeholder
    COALESCE(cm_old.year_of_graduation, 2000),
    COALESCE(cm_old.degree, 'Not Specified'),
    COALESCE(cm_old.branch, 'General'),
    cm_old.organization_name,
    cm_old.designation,
    cm_old.city,
    cm_old.state,
    cm_old.country,
    CASE 
        WHEN cm_old.working_knowledge IS NOT NULL 
        THEN string_to_array(cm_old.working_knowledge, ',')
        ELSE ARRAY[]::TEXT[]
    END,
    cm_old.created_at,
    cm_old.updated_at
FROM community_memberships cm
JOIN community_members_old cm_old ON cm.member_id = cm_old.id
WHERE cm.member_type = 'alumni';

-- Log completion
UPDATE migration_log 
SET status = 'completed', 
    completed_at = NOW(),
    rows_affected = (SELECT COUNT(*) FROM alumni_profiles)
WHERE phase = 'migrate_alumni_profiles';
```

**Entrepreneur Profiles:**
```sql
-- Log phase start
INSERT INTO migration_log (phase, status) 
VALUES ('migrate_entrepreneur_profiles', 'started');

INSERT INTO entrepreneur_profiles (
    membership_id,
    company,
    industry,
    services_offered,
    expertise,
    city,
    state,
    country,
    created_at,
    updated_at
)
SELECT 
    cm.id,
    COALESCE(cm_old.organization_name, 'Not Specified'),
    COALESCE(
        CASE 
            WHEN cm_old.working_knowledge ILIKE '%technology%' THEN 'Technology'
            WHEN cm_old.working_knowledge ILIKE '%consulting%' THEN 'Consulting'
            WHEN cm_old.working_knowledge ILIKE '%finance%' THEN 'Finance'
            ELSE 'General Business'
        END,
        'General Business'
    ),
    CASE 
        WHEN cm_old.working_knowledge IS NOT NULL 
        THEN string_to_array(cm_old.working_knowledge, ',')
        ELSE ARRAY[]::TEXT[]
    END,
    ARRAY[]::TEXT[],  -- Empty expertise initially
    cm_old.city,
    cm_old.state,
    cm_old.country,
    cm_old.created_at,
    cm_old.updated_at
FROM community_memberships cm
JOIN community_members_old cm_old ON cm.member_id = cm_old.id
WHERE cm.member_type = 'entrepreneur';

-- Log completion
UPDATE migration_log 
SET status = 'completed', 
    completed_at = NOW(),
    rows_affected = (SELECT COUNT(*) FROM entrepreneur_profiles)
WHERE phase = 'migrate_entrepreneur_profiles';
```

#### 3.6 Migrate Embeddings
```sql
-- Log phase start
INSERT INTO migration_log (phase, status) 
VALUES ('migrate_embeddings', 'started');

-- Migrate existing 2 embeddings, set contextual to profile (will regenerate later)
INSERT INTO member_embeddings (
    membership_id,
    profile_embedding,
    skills_embedding,
    contextual_embedding,  -- Copy from profile initially
    embedding_model,
    embedding_version,
    created_at,
    updated_at
)
SELECT 
    cm.id,
    me.profile_embedding,
    me.skills_embedding,
    me.profile_embedding,  -- Duplicate until regeneration
    me.embedding_model,
    1,  -- Version 1 (mark for regeneration)
    me.created_at,
    NOW()
FROM member_embeddings_old me
JOIN community_members_old cm_old ON me.member_id = cm_old.id
JOIN members m ON cm_old.id = m.id
JOIN community_memberships cm ON m.id = cm.member_id
WHERE cm.community_id = '<DEFAULT_COMMUNITY_ID>'::uuid;

-- Log completion
UPDATE migration_log 
SET status = 'completed', 
    completed_at = NOW(),
    rows_affected = (SELECT COUNT(*) FROM member_embeddings)
WHERE phase = 'migrate_embeddings';
```

#### 3.7 Migrate Search Queries
```sql
-- Log phase start
INSERT INTO migration_log (phase, status) 
VALUES ('migrate_search_queries', 'started');

INSERT INTO search_queries (
    community_id,
    member_id,
    query_text,
    query_type,
    results_count,
    response_time_ms,
    success,
    created_at
)
SELECT 
    '<DEFAULT_COMMUNITY_ID>'::uuid,
    m.id,
    sq.query_text,
    sq.query_type,
    sq.results_count,
    sq.response_time_ms,
    sq.success,
    sq.created_at
FROM search_queries_old sq
LEFT JOIN members m ON sq.user_id = m.phone  -- Assuming user_id was phone
WHERE sq.created_at > NOW() - INTERVAL '90 days';  -- Only recent queries

-- Log completion
UPDATE migration_log 
SET status = 'completed', 
    completed_at = NOW(),
    rows_affected = (SELECT COUNT(*) FROM search_queries)
WHERE phase = 'migrate_search_queries';
```

#### 3.8 Skip Search Cache (Regenerate Instead)
```sql
-- Don't migrate cache - it will regenerate naturally
-- Old cache is tied to old query structure
INSERT INTO migration_log (phase, status, completed_at) 
VALUES ('skip_search_cache', 'skipped', NOW());
```

---

### Phase 4: Post-Migration Tasks

#### 4.1 Regenerate Full-Text Search Index
```sql
-- Log phase start
INSERT INTO migration_log (phase, status) 
VALUES ('regenerate_search_index', 'started');

-- Trigger will auto-populate from profiles
-- Force trigger by updating profiles
UPDATE alumni_profiles SET updated_at = NOW();
UPDATE entrepreneur_profiles SET updated_at = NOW();

-- Verify
SELECT COUNT(*) as indexed_members FROM member_search_index;

-- Log completion
UPDATE migration_log 
SET status = 'completed', 
    completed_at = NOW(),
    rows_affected = (SELECT COUNT(*) FROM member_search_index)
WHERE phase = 'regenerate_search_index';
```

#### 4.2 Generate Contextual Embeddings (Background Job)
```sql
-- Create embedding regeneration job
INSERT INTO embedding_generation_jobs (
    community_id,
    job_type,
    target_member_type,
    status,
    total_members
) VALUES (
    '<DEFAULT_COMMUNITY_ID>'::uuid,
    'regenerate',
    'all',
    'pending',
    (SELECT COUNT(*) FROM community_memberships WHERE community_id = '<DEFAULT_COMMUNITY_ID>'::uuid)
);

-- This will be processed by background worker
-- See section 5.2 for implementation
```

#### 4.3 Create Community Admins
```sql
-- Log phase start
INSERT INTO migration_log (phase, status) 
VALUES ('create_community_admins', 'started');

-- Migrate existing admins/super_admins
INSERT INTO community_admins (
    community_id,
    member_id,
    role,
    granted_at
)
SELECT 
    '<DEFAULT_COMMUNITY_ID>'::uuid,
    m.id,
    cm_old.role,
    cm_old.created_at
FROM community_members_old cm_old
JOIN members m ON cm_old.id = m.id
WHERE cm_old.role IN ('admin', 'super_admin');

-- Log completion
UPDATE migration_log 
SET status = 'completed', 
    completed_at = NOW(),
    rows_affected = (SELECT COUNT(*) FROM community_admins)
WHERE phase = 'create_community_admins';
```

#### 4.4 Verify Data Integrity
```sql
-- Comprehensive verification queries
SELECT 
    'Members' as entity,
    COUNT(*) as old_count,
    (SELECT COUNT(*) FROM members) as new_count,
    CASE 
        WHEN COUNT(*) = (SELECT COUNT(*) FROM members) 
        THEN '✓ PASS' 
        ELSE '✗ FAIL' 
    END as status
FROM community_members_old

UNION ALL

SELECT 
    'Memberships',
    COUNT(*),
    (SELECT COUNT(*) FROM community_memberships),
    CASE 
        WHEN COUNT(*) = (SELECT COUNT(*) FROM community_memberships) 
        THEN '✓ PASS' 
        ELSE '✗ FAIL' 
    END
FROM community_members_old

UNION ALL

SELECT 
    'Alumni Profiles',
    COUNT(*) FILTER (WHERE year_of_graduation IS NOT NULL),
    (SELECT COUNT(*) FROM alumni_profiles),
    '✓ MIGRATED'
FROM community_members_old

UNION ALL

SELECT 
    'Embeddings',
    COUNT(*),
    (SELECT COUNT(*) FROM member_embeddings),
    CASE 
        WHEN COUNT(*) = (SELECT COUNT(*) FROM member_embeddings) 
        THEN '✓ PASS' 
        ELSE '⚠ PARTIAL' 
    END
FROM member_embeddings_old;
```

#### 4.5 Update Application Configuration
```bash
# Update .env file to point to new schema
cat >> .env << 'EOF'
# Migration completed - using new schema
SCHEMA_VERSION=2.0
DEFAULT_COMMUNITY_ID=<YOUR_COMMUNITY_ID>
MIGRATION_DATE=2025-11-16
EOF
```

---

### Phase 5: Application Updates

#### 5.1 Update Database Queries in Code

**Before (old schema):**
```typescript
// Old query
const members = await query(`
    SELECT * FROM community_members 
    WHERE is_active = true
`);
```

**After (new schema):**
```typescript
// New query with community context
const members = await query(`
    SELECT m.*, cm.member_type, cm.role,
           CASE 
               WHEN cm.member_type = 'alumni' THEN row_to_json(ap.*)
               WHEN cm.member_type = 'entrepreneur' THEN row_to_json(ep.*)
           END as profile_data
    FROM members m
    JOIN community_memberships cm ON m.id = cm.member_id
    LEFT JOIN alumni_profiles ap ON cm.id = ap.membership_id
    LEFT JOIN entrepreneur_profiles ep ON cm.id = ep.membership_id
    WHERE cm.community_id = $1 
      AND cm.is_active = true
`, [communityId]);
```

#### 5.2 Implement Background Embedding Regeneration

**Create script: `Server/src/scripts/regenerateContextualEmbeddings.ts`:**
```typescript
import { query } from '../config/db';
import { generateEmbedding } from '../services/embeddingService';

async function regenerateContextualEmbeddings() {
    console.log('[Regeneration] Starting contextual embedding generation...');
    
    // Get job
    const job = await query(`
        SELECT * FROM embedding_generation_jobs 
        WHERE status = 'pending' 
        ORDER BY created_at 
        LIMIT 1
    `);
    
    if (job.rows.length === 0) {
        console.log('[Regeneration] No pending jobs');
        return;
    }
    
    const jobId = job.rows[0].id;
    const communityId = job.rows[0].community_id;
    
    // Mark as running
    await query(`
        UPDATE embedding_generation_jobs 
        SET status = 'running', started_at = NOW() 
        WHERE id = $1
    `, [jobId]);
    
    // Get members needing contextual embeddings
    const members = await query(`
        SELECT 
            cm.id as membership_id,
            cm.member_type,
            m.name,
            CASE 
                WHEN cm.member_type = 'alumni' THEN 
                    jsonb_build_object(
                        'interests', ap.interests,
                        'looking_for', ap.looking_for,
                        'willing_to_help_with', ap.willing_to_help_with
                    )
                WHEN cm.member_type = 'entrepreneur' THEN
                    jsonb_build_object(
                        'looking_for', ep.looking_for,
                        'can_offer', ep.can_offer,
                        'interests', '[]'::jsonb
                    )
            END as contextual_data
        FROM community_memberships cm
        JOIN members m ON cm.member_id = m.id
        LEFT JOIN alumni_profiles ap ON cm.id = ap.membership_id
        LEFT JOIN entrepreneur_profiles ep ON cm.id = ep.membership_id
        WHERE cm.community_id = $1
    `, [communityId]);
    
    let processed = 0;
    let failed = 0;
    
    for (const member of members.rows) {
        try {
            // Prepare contextual text
            const contextualText = prepareContextualText(
                member.member_type, 
                member.contextual_data
            );
            
            // Generate embedding
            const embedding = await generateEmbedding(contextualText);
            
            // Update database
            await query(`
                UPDATE member_embeddings 
                SET contextual_embedding = $1,
                    contextual_text = $2,
                    contextual_text_length = $3,
                    embedding_version = 2,
                    updated_at = NOW()
                WHERE membership_id = $4
            `, [embedding, contextualText, contextualText.length, member.membership_id]);
            
            processed++;
            
            if (processed % 100 === 0) {
                console.log(`[Regeneration] Processed ${processed}/${members.rows.length}`);
                
                // Update job progress
                await query(`
                    UPDATE embedding_generation_jobs 
                    SET processed_members = $1 
                    WHERE id = $2
                `, [processed, jobId]);
            }
            
        } catch (error) {
            console.error(`[Regeneration] Failed for ${member.membership_id}:`, error);
            failed++;
        }
    }
    
    // Mark job as completed
    await query(`
        UPDATE embedding_generation_jobs 
        SET status = 'completed',
            completed_at = NOW(),
            processed_members = $1,
            failed_members = $2,
            duration_seconds = EXTRACT(EPOCH FROM (NOW() - started_at))
        WHERE id = $3
    `, [processed, failed, jobId]);
    
    console.log(`[Regeneration] Completed! Processed: ${processed}, Failed: ${failed}`);
}

function prepareContextualText(memberType: string, data: any): string {
    if (memberType === 'alumni') {
        return [
            data.interests?.length ? `Interested in ${data.interests.join(', ')}` : '',
            data.looking_for ? `Currently looking for ${data.looking_for}` : '',
            data.willing_to_help_with?.length ? `Open to helping with ${data.willing_to_help_with.join(', ')}` : ''
        ].filter(Boolean).join('. ');
    } else if (memberType === 'entrepreneur') {
        return [
            data.looking_for?.length ? `Currently seeking ${data.looking_for.join(', ')}` : '',
            data.can_offer?.length ? `Can provide ${data.can_offer.join(', ')}` : ''
        ].filter(Boolean).join('. ');
    }
    return '';
}

// Run if called directly
if (require.main === module) {
    regenerateContextualEmbeddings()
        .then(() => process.exit(0))
        .catch(err => {
            console.error(err);
            process.exit(1);
        });
}

export default regenerateContextualEmbeddings;
```

**Run regeneration:**
```bash
npm run regenerate:embeddings
# or
ts-node src/scripts/regenerateContextualEmbeddings.ts
```

---

### Phase 6: Testing & Verification

#### 6.1 Functional Testing
```bash
# Test member search
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Find Python developers",
    "communityId": "<DEFAULT_COMMUNITY_ID>"
  }'

# Test member profile retrieval
curl http://localhost:3000/api/members/<MEMBER_ID>

# Test WhatsApp integration
# Send test message via Twilio
```

#### 6.2 Performance Testing
```sql
-- Test vector search performance
EXPLAIN ANALYZE
SELECT 
    m.name,
    1 - (emb.skills_embedding <=> $1::vector) AS similarity
FROM member_embeddings emb
JOIN community_memberships cm ON emb.membership_id = cm.id
JOIN members m ON cm.member_id = m.id
WHERE cm.community_id = $2
ORDER BY similarity DESC
LIMIT 20;

-- Should use HNSW index, <50ms execution time
```

#### 6.3 Data Validation
```sql
-- Run comprehensive validation
SELECT 
    'Total Members' as metric,
    COUNT(*) as count
FROM members
UNION ALL
SELECT 'Active Memberships', COUNT(*) FROM community_memberships WHERE is_active
UNION ALL
SELECT 'Alumni Profiles', COUNT(*) FROM alumni_profiles
UNION ALL
SELECT 'Entrepreneur Profiles', COUNT(*) FROM entrepreneur_profiles
UNION ALL
SELECT 'Embeddings Complete', COUNT(*) FROM member_embeddings WHERE embedding_version >= 2
UNION ALL
SELECT 'Search Index Entries', COUNT(*) FROM member_search_index
UNION ALL
SELECT 'Community Admins', COUNT(*) FROM community_admins;
```

---

### Phase 7: Go Live

#### 7.1 Start Application
```bash
# Start backend
sudo systemctl start communityconnect-backend

# Verify
curl http://localhost:3000/health

# Start dashboard
sudo systemctl start communityconnect-dashboard
```

#### 7.2 Monitor Logs
```bash
# Watch application logs
tail -f /var/log/communityconnect/backend.log

# Watch PostgreSQL logs
tail -f /var/log/postgresql/postgresql-16-main.log
```

#### 7.3 Smoke Tests
```bash
# Run automated smoke tests
npm run test:smoke

# Manual verification
# 1. Login to dashboard
# 2. Search for members
# 3. View member profiles
# 4. Test WhatsApp queries
```

---

### Phase 8: Cleanup (After 7 Days Success)

#### 8.1 Drop Old Tables
```sql
-- ONLY after verifying everything works for 1 week!
DROP TABLE IF EXISTS community_members_old CASCADE;
DROP TABLE IF EXISTS member_embeddings_old CASCADE;
DROP TABLE IF EXISTS search_queries_old CASCADE;
DROP TABLE IF EXISTS search_cache_old CASCADE;

-- Verify no dependencies
SELECT * FROM migration_log ORDER BY started_at;
```

#### 8.2 Vacuum & Analyze
```sql
-- Reclaim space and update statistics
VACUUM ANALYZE;

-- Check database size
SELECT 
    pg_size_pretty(pg_database_size('communityconnect')) as db_size,
    pg_size_pretty(pg_total_relation_size('member_embeddings')) as embeddings_size;
```

---

## Rollback Plan (If Issues Found)

### Emergency Rollback Steps

```bash
# 1. Stop application immediately
sudo systemctl stop communityconnect-backend
sudo systemctl stop communityconnect-dashboard

# 2. Restore from backup
dropdb communityconnect
createdb communityconnect
pg_restore -d communityconnect backup_pre_migration_*.dump

# 3. Restart application
sudo systemctl start communityconnect-backend
sudo systemctl start communityconnect-dashboard

# 4. Verify
curl http://localhost:3000/health
```

### Partial Rollback (Keep New Schema, Revert Data)

```sql
-- If schema is fine but data migration had issues
TRUNCATE communities, members, community_memberships, 
         alumni_profiles, entrepreneur_profiles, 
         member_embeddings, search_queries CASCADE;

-- Restore just the _old tables data
-- (requires custom script based on specific issue)
```

---

## Timeline & Checklist

### Pre-Migration (2 days before)
- [ ] Full database backup
- [ ] Data quality audit
- [ ] Data cleanup (if needed)
- [ ] Test migration on staging
- [ ] Notify users of maintenance window

### Migration Day (4 hours)
- [ ] Hour 0: Set maintenance mode
- [ ] Hour 0-1: Create new schema
- [ ] Hour 1-2: Migrate data (members, profiles, embeddings)
- [ ] Hour 2-3: Post-migration tasks (search index, admins)
- [ ] Hour 3-4: Testing & verification
- [ ] Hour 4: Go live

### Post-Migration (1 week)
- [ ] Day 1: Monitor closely, fix issues
- [ ] Day 2-7: Background embedding regeneration
- [ ] Day 7: Final verification, cleanup old tables

---

## Support & Troubleshooting

### Common Issues

**Issue 1: Duplicate phone numbers**
```sql
-- Solution: Add suffix to duplicates
UPDATE members SET phone = phone || '_dup' WHERE id IN (SELECT ..);
```

**Issue 2: Embeddings not migrating**
```sql
-- Check for NULL embeddings
SELECT COUNT(*) FROM member_embeddings_old WHERE profile_embedding IS NULL;

-- Skip NULL embeddings, regenerate later
```

**Issue 3: Slow migration**
```sql
-- Disable indexes temporarily
DROP INDEX idx_embeddings_profile;
-- ... migrate ...
-- Recreate indexes
CREATE INDEX idx_embeddings_profile USING hnsw...;
```

---

## Success Criteria

✅ **All data migrated** (0 data loss)  
✅ **Application functional** (search, profiles, WhatsApp working)  
✅ **Performance maintained** (queries <100ms)  
✅ **No user complaints** (first 24 hours)  
✅ **Embeddings regenerating** (background job running)

---

## Contact & Escalation

**Migration Lead**: [Your Name]  
**Database Admin**: [DBA Name]  
**Escalation Point**: [Technical Lead]

**Emergency Hotline**: [Phone Number]  
**Slack Channel**: #community-connect-migration
