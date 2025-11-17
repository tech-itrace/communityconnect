-- ============================================================================
-- ROLLBACK: Restore Original Schema
-- File: Server/src/migrations/ROLLBACK_lean_schema.sql
-- ⚠️  Use only if you need to revert to original schema
-- ⚠️  This assumes you have NOT yet run 005_drop_old_tables.sql
-- ============================================================================

BEGIN;

RAISE NOTICE '═══════════════════════════════════════════════════════════';
RAISE NOTICE '⚠️  ROLLBACK: Reverting Lean Schema Migration';
RAISE NOTICE '═══════════════════════════════════════════════════════════';

-- ============================================================================
-- If Tables Were Already Dropped - Restore from JSONB
-- ============================================================================

-- Check if old tables exist
DO $$
DECLARE
    alumni_exists BOOLEAN;
    entrepreneur_exists BOOLEAN;
    resident_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'alumni_profiles'
    ) INTO alumni_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'entrepreneur_profiles'
    ) INTO entrepreneur_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'resident_profiles'
    ) INTO resident_exists;
    
    IF NOT alumni_exists OR NOT entrepreneur_exists OR NOT resident_exists THEN
        RAISE NOTICE '⚠️  Profile tables do not exist - they must be recreated from backup';
        RAISE NOTICE 'Restore from your backup.sql file first, then run this script';
        RAISE EXCEPTION 'Cannot rollback - tables missing. Restore from backup first.';
    ELSE
        RAISE NOTICE '✅ All profile tables exist - proceeding with rollback';
    END IF;
END $$;

-- ============================================================================
-- Restore Data from JSONB to Original Tables (if needed)
-- ============================================================================

-- This section only needed if you want to sync data back to old tables
-- Useful if you ran migrations but haven't dropped tables yet

-- Restore alumni profiles
INSERT INTO alumni_profiles (
    membership_id, college, graduation_year, degree, department,
    specialization, current_organization, designation, years_of_experience,
    city, state, country, skills, domains, interests, looking_for,
    willing_to_help_with, linkedin_url, github_url
)
SELECT 
    cm.id,
    cm.profile_data->>'college',
    (cm.profile_data->>'graduation_year')::integer,
    cm.profile_data->>'degree',
    cm.profile_data->>'department',
    cm.profile_data->>'specialization',
    cm.profile_data->>'current_organization',
    cm.profile_data->>'designation',
    (cm.profile_data->>'years_of_experience')::integer,
    cm.profile_data->>'city',
    cm.profile_data->>'state',
    cm.profile_data->>'country',
    ARRAY(SELECT jsonb_array_elements_text(cm.profile_data->'skills')),
    ARRAY(SELECT jsonb_array_elements_text(cm.profile_data->'domains')),
    ARRAY(SELECT jsonb_array_elements_text(cm.profile_data->'interests')),
    cm.profile_data->>'looking_for',
    ARRAY(SELECT jsonb_array_elements_text(cm.profile_data->'willing_to_help_with')),
    cm.profile_data->>'linkedin_url',
    cm.profile_data->>'github_url'
FROM community_memberships cm
WHERE cm.member_type = 'alumni'
AND cm.profile_data != '{}'::jsonb
ON CONFLICT (membership_id) DO UPDATE SET
    college = EXCLUDED.college,
    graduation_year = EXCLUDED.graduation_year,
    degree = EXCLUDED.degree,
    department = EXCLUDED.department,
    specialization = EXCLUDED.specialization,
    current_organization = EXCLUDED.current_organization,
    designation = EXCLUDED.designation,
    years_of_experience = EXCLUDED.years_of_experience,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    country = EXCLUDED.country,
    skills = EXCLUDED.skills,
    domains = EXCLUDED.domains,
    interests = EXCLUDED.interests,
    looking_for = EXCLUDED.looking_for,
    willing_to_help_with = EXCLUDED.willing_to_help_with,
    linkedin_url = EXCLUDED.linkedin_url,
    github_url = EXCLUDED.github_url,
    updated_at = now();

RAISE NOTICE '✅ Alumni profiles restored';

-- Restore entrepreneur profiles
INSERT INTO entrepreneur_profiles (
    membership_id, company, industry, company_stage, founded_year,
    employee_count_range, annual_revenue_range, services_offered, products,
    expertise, looking_for, can_offer, target_customers, city, state, country,
    markets_served, certifications, awards, website_url, linkedin_company_url
)
SELECT 
    cm.id,
    cm.profile_data->>'company',
    cm.profile_data->>'industry',
    cm.profile_data->>'company_stage',
    (cm.profile_data->>'founded_year')::integer,
    cm.profile_data->>'employee_count_range',
    cm.profile_data->>'annual_revenue_range',
    ARRAY(SELECT jsonb_array_elements_text(cm.profile_data->'services_offered')),
    ARRAY(SELECT jsonb_array_elements_text(cm.profile_data->'products')),
    ARRAY(SELECT jsonb_array_elements_text(cm.profile_data->'expertise')),
    ARRAY(SELECT jsonb_array_elements_text(cm.profile_data->'looking_for')),
    ARRAY(SELECT jsonb_array_elements_text(cm.profile_data->'can_offer')),
    ARRAY(SELECT jsonb_array_elements_text(cm.profile_data->'target_customers')),
    cm.profile_data->>'city',
    cm.profile_data->>'state',
    cm.profile_data->>'country',
    ARRAY(SELECT jsonb_array_elements_text(cm.profile_data->'markets_served')),
    ARRAY(SELECT jsonb_array_elements_text(cm.profile_data->'certifications')),
    ARRAY(SELECT jsonb_array_elements_text(cm.profile_data->'awards')),
    cm.profile_data->>'website_url',
    cm.profile_data->>'linkedin_company_url'
FROM community_memberships cm
WHERE cm.member_type = 'entrepreneur'
AND cm.profile_data != '{}'::jsonb
ON CONFLICT (membership_id) DO UPDATE SET
    company = EXCLUDED.company,
    industry = EXCLUDED.industry,
    company_stage = EXCLUDED.company_stage,
    founded_year = EXCLUDED.founded_year,
    employee_count_range = EXCLUDED.employee_count_range,
    annual_revenue_range = EXCLUDED.annual_revenue_range,
    services_offered = EXCLUDED.services_offered,
    products = EXCLUDED.products,
    expertise = EXCLUDED.expertise,
    looking_for = EXCLUDED.looking_for,
    can_offer = EXCLUDED.can_offer,
    target_customers = EXCLUDED.target_customers,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    country = EXCLUDED.country,
    markets_served = EXCLUDED.markets_served,
    certifications = EXCLUDED.certifications,
    awards = EXCLUDED.awards,
    website_url = EXCLUDED.website_url,
    linkedin_company_url = EXCLUDED.linkedin_company_url,
    updated_at = now();

RAISE NOTICE '✅ Entrepreneur profiles restored';

-- Restore resident profiles
INSERT INTO resident_profiles (
    membership_id, apartment_number, building, floor, apartment_type,
    ownership_type, move_in_date, profession, organization, skills,
    community_roles, can_help_with, services_offered, interested_in,
    family_composition, vehicles, emergency_contact_name, emergency_contact_phone
)
SELECT 
    cm.id,
    cm.profile_data->>'apartment_number',
    cm.profile_data->>'building',
    (cm.profile_data->>'floor')::integer,
    cm.profile_data->>'apartment_type',
    cm.profile_data->>'ownership_type',
    (cm.profile_data->>'move_in_date')::date,
    cm.profile_data->>'profession',
    cm.profile_data->>'organization',
    ARRAY(SELECT jsonb_array_elements_text(cm.profile_data->'skills')),
    ARRAY(SELECT jsonb_array_elements_text(cm.profile_data->'community_roles')),
    ARRAY(SELECT jsonb_array_elements_text(cm.profile_data->'can_help_with')),
    ARRAY(SELECT jsonb_array_elements_text(cm.profile_data->'services_offered')),
    ARRAY(SELECT jsonb_array_elements_text(cm.profile_data->'interested_in')),
    cm.profile_data->'family_composition',
    cm.profile_data->'vehicles',
    cm.profile_data->>'emergency_contact_name',
    cm.profile_data->>'emergency_contact_phone'
FROM community_memberships cm
WHERE cm.member_type = 'resident'
AND cm.profile_data != '{}'::jsonb
ON CONFLICT (membership_id) DO UPDATE SET
    apartment_number = EXCLUDED.apartment_number,
    building = EXCLUDED.building,
    floor = EXCLUDED.floor,
    apartment_type = EXCLUDED.apartment_type,
    ownership_type = EXCLUDED.ownership_type,
    move_in_date = EXCLUDED.move_in_date,
    profession = EXCLUDED.profession,
    organization = EXCLUDED.organization,
    skills = EXCLUDED.skills,
    community_roles = EXCLUDED.community_roles,
    can_help_with = EXCLUDED.can_help_with,
    services_offered = EXCLUDED.services_offered,
    interested_in = EXCLUDED.interested_in,
    family_composition = EXCLUDED.family_composition,
    vehicles = EXCLUDED.vehicles,
    emergency_contact_name = EXCLUDED.emergency_contact_name,
    emergency_contact_phone = EXCLUDED.emergency_contact_phone,
    updated_at = now();

RAISE NOTICE '✅ Resident profiles restored';

-- ============================================================================
-- Remove New Columns
-- ============================================================================

-- Drop new indexes first
DROP INDEX IF EXISTS idx_cm_profile_data_gin;
DROP INDEX IF EXISTS idx_cm_profile_city;
DROP INDEX IF EXISTS idx_cm_profile_college;
DROP INDEX IF EXISTS idx_cm_profile_year;
DROP INDEX IF EXISTS idx_cm_profile_company;
DROP INDEX IF EXISTS idx_cm_profile_apartment;
DROP INDEX IF EXISTS idx_cm_profile_skills_gin;
RAISE NOTICE '✅ Dropped JSONB indexes';

-- Remove new columns
ALTER TABLE community_memberships DROP COLUMN IF EXISTS profile_data;
ALTER TABLE community_memberships DROP COLUMN IF EXISTS permissions;
RAISE NOTICE '✅ Removed profile_data and permissions columns';

-- Remove search_vector from member_embeddings
DROP TRIGGER IF EXISTS trg_update_embedding_search_vector ON member_embeddings;
DROP FUNCTION IF EXISTS update_embedding_search_vector() CASCADE;
DROP FUNCTION IF EXISTS generate_member_search_vector(TEXT, TEXT, TEXT) CASCADE;
DROP INDEX IF EXISTS idx_embeddings_search_vector;
ALTER TABLE member_embeddings DROP COLUMN IF EXISTS search_vector;
RAISE NOTICE '✅ Removed search_vector column and related objects';

-- ============================================================================
-- Verification
-- ============================================================================

RAISE NOTICE '';
RAISE NOTICE '═══════════════════════════════════════════════════════════';
RAISE NOTICE '✅ ROLLBACK COMPLETE';
RAISE NOTICE '═══════════════════════════════════════════════════════════';

DO $$
DECLARE
    alumni_count INT;
    entrepreneur_count INT;
    resident_count INT;
BEGIN
    SELECT COUNT(*) INTO alumni_count FROM alumni_profiles;
    SELECT COUNT(*) INTO entrepreneur_count FROM entrepreneur_profiles;
    SELECT COUNT(*) INTO resident_count FROM resident_profiles;
    
    RAISE NOTICE 'Restored records:';
    RAISE NOTICE '  Alumni profiles: %', alumni_count;
    RAISE NOTICE '  Entrepreneur profiles: %', entrepreneur_count;
    RAISE NOTICE '  Resident profiles: %', resident_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Schema reverted to original structure';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;

COMMIT;
