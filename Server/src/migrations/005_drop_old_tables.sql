-- ============================================================================
-- MIGRATION: Phase 5 - Drop Redundant Tables
-- File: Server/src/migrations/005_drop_old_tables.sql
-- ⚠️  DESTRUCTIVE: Only run after thorough validation
-- ⚠️  BACKUP YOUR DATABASE FIRST: pg_dump communityconnect > backup.sql
-- ============================================================================

BEGIN;

RAISE NOTICE '═══════════════════════════════════════════════════════════';
RAISE NOTICE '⚠️  WARNING: DESTRUCTIVE MIGRATION - DROPPING OLD TABLES';
RAISE NOTICE '═══════════════════════════════════════════════════════════';

-- Safety check - abort if no data migrated
DO $$
DECLARE
    migrated_count INT;
BEGIN
    SELECT COUNT(*) INTO migrated_count 
    FROM community_memberships 
    WHERE profile_data != '{}'::jsonb;
    
    IF migrated_count = 0 THEN
        RAISE EXCEPTION 'ABORT: No migrated data found in profile_data! Run migrations 001-004 first.';
    END IF;
    
    RAISE NOTICE 'Safety check passed: % profiles migrated', migrated_count;
END $$;

-- ============================================================================
-- 5.1 Drop Profile Tables
-- ============================================================================

-- Drop triggers first
DROP TRIGGER IF EXISTS trg_alumni_search ON alumni_profiles;
DROP TRIGGER IF EXISTS trg_alumni_updated ON alumni_profiles;
RAISE NOTICE '✅ Dropped alumni_profiles triggers';

DROP TRIGGER IF EXISTS trg_entrepreneur_search ON entrepreneur_profiles;
DROP TRIGGER IF EXISTS trg_entrepreneur_updated ON entrepreneur_profiles;
RAISE NOTICE '✅ Dropped entrepreneur_profiles triggers';

DROP TRIGGER IF EXISTS trg_resident_search ON resident_profiles;
DROP TRIGGER IF EXISTS trg_resident_updated ON resident_profiles;
RAISE NOTICE '✅ Dropped resident_profiles triggers';

-- Drop tables (CASCADE removes foreign keys)
DROP TABLE IF EXISTS alumni_profiles CASCADE;
RAISE NOTICE '✅ Dropped alumni_profiles table';

DROP TABLE IF EXISTS entrepreneur_profiles CASCADE;
RAISE NOTICE '✅ Dropped entrepreneur_profiles table';

DROP TABLE IF EXISTS resident_profiles CASCADE;
RAISE NOTICE '✅ Dropped resident_profiles table';

-- ============================================================================
-- 5.2 Drop member_search_index Table
-- ============================================================================

DROP TABLE IF EXISTS member_search_index CASCADE;
RAISE NOTICE '✅ Dropped member_search_index table';

-- ============================================================================
-- 5.3 Drop community_admins Table
-- ============================================================================

DROP TABLE IF EXISTS community_admins CASCADE;
RAISE NOTICE '✅ Dropped community_admins table';

-- ============================================================================
-- 5.4 Drop embedding_generation_jobs Table (Optional)
-- ============================================================================

-- Uncomment the following lines if you want to remove this table
-- DROP TABLE IF EXISTS embedding_generation_jobs CASCADE;
-- RAISE NOTICE '✅ Dropped embedding_generation_jobs table';

RAISE NOTICE 'ℹ️  Kept embedding_generation_jobs table (comment out to remove)';

-- ============================================================================
-- 5.5 Clean Up Functions
-- ============================================================================

-- Drop old search index update function if it exists
DROP FUNCTION IF EXISTS update_member_search_index() CASCADE;
RAISE NOTICE '✅ Dropped update_member_search_index() function';

-- ============================================================================
-- 5.6 Vacuum and Analyze
-- ============================================================================

RAISE NOTICE '';
RAISE NOTICE 'Running VACUUM ANALYZE to optimize database...';

VACUUM ANALYZE community_memberships;
VACUUM ANALYZE member_embeddings;

RAISE NOTICE '✅ Database optimized';

-- ============================================================================
-- 5.7 Final Summary
-- ============================================================================

RAISE NOTICE '';
RAISE NOTICE '═══════════════════════════════════════════════════════════';
RAISE NOTICE '✅ LEAN SCHEMA MIGRATION COMPLETE';
RAISE NOTICE '═══════════════════════════════════════════════════════════';

-- Show remaining tables with sizes
RAISE NOTICE '';
RAISE NOTICE 'Remaining tables and sizes:';

DO $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN (
        SELECT 
            tablename,
            pg_size_pretty(pg_total_relation_size('public.'||tablename)) AS size
        FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size('public.'||tablename) DESC
        LIMIT 10
    ) LOOP
        RAISE NOTICE '  % - %', rec.tablename, rec.size;
    END LOOP;
END $$;

RAISE NOTICE '';
RAISE NOTICE 'Tables removed:';
RAISE NOTICE '  ❌ alumni_profiles';
RAISE NOTICE '  ❌ entrepreneur_profiles';
RAISE NOTICE '  ❌ resident_profiles';
RAISE NOTICE '  ❌ member_search_index';
RAISE NOTICE '  ❌ community_admins';
RAISE NOTICE '';
RAISE NOTICE 'Next steps:';
RAISE NOTICE '  1. Update TypeScript types to use JSONB structure';
RAISE NOTICE '  2. Update service layer queries';
RAISE NOTICE '  3. Test application thoroughly';
RAISE NOTICE '  4. Monitor query performance';
RAISE NOTICE '═══════════════════════════════════════════════════════════';

COMMIT;
