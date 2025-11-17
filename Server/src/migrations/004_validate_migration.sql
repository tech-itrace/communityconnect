-- ============================================================================
-- MIGRATION: Phase 4 - Validation Queries
-- File: Server/src/migrations/004_validate_migration.sql
-- Safe to run: YES (read-only validation)
-- ============================================================================

BEGIN;

RAISE NOTICE '═══════════════════════════════════════════════════════════';
RAISE NOTICE 'VALIDATION: Data Integrity Checks';
RAISE NOTICE '═══════════════════════════════════════════════════════════';

-- ============================================================================
-- 4.1 Data Integrity Checks
-- ============================================================================

-- Check for missing profile_data
DO $$
DECLARE
    missing_alumni INT;
    missing_entrepreneur INT;
    missing_resident INT;
BEGIN
    SELECT COUNT(*) INTO missing_alumni
    FROM community_memberships
    WHERE member_type = 'alumni'
    AND (profile_data IS NULL OR profile_data = '{}'::jsonb);
    
    SELECT COUNT(*) INTO missing_entrepreneur
    FROM community_memberships
    WHERE member_type = 'entrepreneur'
    AND (profile_data IS NULL OR profile_data = '{}'::jsonb);
    
    SELECT COUNT(*) INTO missing_resident
    FROM community_memberships
    WHERE member_type = 'resident'
    AND (profile_data IS NULL OR profile_data = '{}'::jsonb);
    
    RAISE NOTICE 'Missing profile_data check:';
    RAISE NOTICE '  Alumni missing: %', missing_alumni;
    RAISE NOTICE '  Entrepreneur missing: %', missing_entrepreneur;
    RAISE NOTICE '  Resident missing: %', missing_resident;
    
    IF missing_alumni > 0 OR missing_entrepreneur > 0 OR missing_resident > 0 THEN
        RAISE WARNING '⚠️  Some profiles not migrated to JSONB!';
    ELSE
        RAISE NOTICE '  ✅ All profiles migrated successfully';
    END IF;
END $$;

-- Check for orphaned profile records (data in old tables not in JSONB)
DO $$
DECLARE
    orphaned_alumni INT;
    orphaned_entrepreneur INT;
    orphaned_resident INT;
BEGIN
    SELECT COUNT(*) INTO orphaned_alumni
    FROM alumni_profiles ap
    LEFT JOIN community_memberships cm ON ap.membership_id = cm.id
    WHERE cm.profile_data IS NULL OR cm.profile_data = '{}'::jsonb;
    
    SELECT COUNT(*) INTO orphaned_entrepreneur
    FROM entrepreneur_profiles ep
    LEFT JOIN community_memberships cm ON ep.membership_id = cm.id
    WHERE cm.profile_data IS NULL OR cm.profile_data = '{}'::jsonb;
    
    SELECT COUNT(*) INTO orphaned_resident
    FROM resident_profiles rp
    LEFT JOIN community_memberships cm ON rp.membership_id = cm.id
    WHERE cm.profile_data IS NULL OR cm.profile_data = '{}'::jsonb;
    
    RAISE NOTICE '';
    RAISE NOTICE 'Orphaned records check:';
    RAISE NOTICE '  Alumni orphaned: %', orphaned_alumni;
    RAISE NOTICE '  Entrepreneur orphaned: %', orphaned_entrepreneur;
    RAISE NOTICE '  Resident orphaned: %', orphaned_resident;
    
    IF orphaned_alumni > 0 OR orphaned_entrepreneur > 0 OR orphaned_resident > 0 THEN
        RAISE WARNING '⚠️  Some old profile records not migrated!';
    ELSE
        RAISE NOTICE '  ✅ No orphaned records found';
    END IF;
END $$;

-- ============================================================================
-- 4.2 Sample Data Comparison
-- ============================================================================

RAISE NOTICE '';
RAISE NOTICE '═══════════════════════════════════════════════════════════';
RAISE NOTICE 'VALIDATION: Sample Data Comparison (First 3 Alumni)';
RAISE NOTICE '═══════════════════════════════════════════════════════════';

-- Compare old vs new structure for alumni (first 3 records)
DO $$
DECLARE
    rec RECORD;
    counter INT := 0;
BEGIN
    FOR rec IN (
        SELECT 
            cm.id as membership_id,
            m.name,
            ap.college as old_college,
            ap.graduation_year as old_year,
            ap.city as old_city,
            cm.profile_data->>'college' as new_college,
            (cm.profile_data->>'graduation_year')::integer as new_year,
            cm.profile_data->>'city' as new_city
        FROM community_memberships cm
        JOIN members m ON cm.member_id = m.id
        LEFT JOIN alumni_profiles ap ON ap.membership_id = cm.id
        WHERE cm.member_type = 'alumni'
        LIMIT 3
    ) LOOP
        counter := counter + 1;
        RAISE NOTICE 'Record %: %', counter, rec.name;
        RAISE NOTICE '  College - Old: "%" | New: "%"', rec.old_college, rec.new_college;
        RAISE NOTICE '  Year - Old: % | New: %', rec.old_year, rec.new_year;
        RAISE NOTICE '  City - Old: "%" | New: "%"', rec.old_city, rec.new_city;
        
        IF rec.old_college != rec.new_college OR rec.old_year != rec.new_year OR rec.old_city != rec.new_city THEN
            RAISE WARNING '  ⚠️  Data mismatch detected!';
        ELSE
            RAISE NOTICE '  ✅ Data matches';
        END IF;
    END LOOP;
END $$;

-- ============================================================================
-- 4.3 Index Usage Validation
-- ============================================================================

RAISE NOTICE '';
RAISE NOTICE '═══════════════════════════════════════════════════════════';
RAISE NOTICE 'VALIDATION: Query Performance Tests';
RAISE NOTICE '═══════════════════════════════════════════════════════════';

-- Test JSONB query performance
EXPLAIN (FORMAT TEXT, ANALYZE, BUFFERS)
SELECT cm.id, m.name, cm.profile_data
FROM community_memberships cm
JOIN members m ON cm.member_id = m.id
WHERE cm.member_type = 'alumni'
AND cm.profile_data->>'city' ILIKE '%bangalore%'
LIMIT 10;

RAISE NOTICE '';
RAISE NOTICE 'JSONB City Filter Query Executed ✅';

-- Test search vector performance (if data exists)
DO $$
DECLARE
    embedding_count INT;
BEGIN
    SELECT COUNT(*) INTO embedding_count FROM member_embeddings;
    
    IF embedding_count > 0 THEN
        RAISE NOTICE 'Testing search vector query...';
        
        PERFORM me.membership_id, me.profile_text
        FROM member_embeddings me
        WHERE me.search_vector @@ to_tsquery('english', 'python | development')
        LIMIT 10;
        
        RAISE NOTICE 'Search Vector Query Executed ✅';
    ELSE
        RAISE NOTICE 'No embeddings found - skipping search vector test';
    END IF;
END $$;

-- ============================================================================
-- 4.4 Summary Statistics
-- ============================================================================

RAISE NOTICE '';
RAISE NOTICE '═══════════════════════════════════════════════════════════';
RAISE NOTICE 'MIGRATION VALIDATION COMPLETE';
RAISE NOTICE '═══════════════════════════════════════════════════════════';

DO $$
DECLARE
    total_memberships INT;
    with_profile_data INT;
    total_embeddings INT;
    with_search_vector INT;
BEGIN
    SELECT COUNT(*) INTO total_memberships FROM community_memberships;
    SELECT COUNT(*) INTO with_profile_data FROM community_memberships 
        WHERE profile_data != '{}'::jsonb;
    SELECT COUNT(*) INTO total_embeddings FROM member_embeddings;
    SELECT COUNT(*) INTO with_search_vector FROM member_embeddings 
        WHERE search_vector IS NOT NULL;
    
    RAISE NOTICE 'Final Statistics:';
    RAISE NOTICE '  Total memberships: %', total_memberships;
    RAISE NOTICE '  With profile_data: % (%.1f%%)', with_profile_data, 
        (with_profile_data::float / NULLIF(total_memberships, 0) * 100);
    RAISE NOTICE '  Total embeddings: %', total_embeddings;
    RAISE NOTICE '  With search_vector: % (%.1f%%)', with_search_vector,
        (with_search_vector::float / NULLIF(total_embeddings, 0) * 100);
    RAISE NOTICE '';
    RAISE NOTICE 'Review the output above before proceeding to Phase 5';
    RAISE NOTICE 'If all checks pass, run: 005_drop_old_tables.sql';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;

COMMIT;
