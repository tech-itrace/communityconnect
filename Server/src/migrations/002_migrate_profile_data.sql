-- ============================================================================
-- MIGRATION: Phase 2 - Migrate Profile Data to JSONB
-- File: Server/src/migrations/002_migrate_profile_data.sql
-- Safe to run: YES (reads old tables, writes to new column)
-- Estimated time: ~1 second per 1000 members
-- ============================================================================

BEGIN;

-- ============================================================================
-- 2.1 Migrate Alumni Profiles
-- ============================================================================
UPDATE community_memberships cm
SET profile_data = jsonb_build_object(
    'college', ap.college,
    'graduation_year', ap.graduation_year,
    'degree', ap.degree,
    'department', ap.department,
    'specialization', ap.specialization,
    'current_organization', ap.current_organization,
    'designation', ap.designation,
    'years_of_experience', ap.years_of_experience,
    'city', ap.city,
    'state', ap.state,
    'country', ap.country,
    'skills', ap.skills,
    'domains', ap.domains,
    'interests', ap.interests,
    'looking_for', ap.looking_for,
    'willing_to_help_with', ap.willing_to_help_with,
    'linkedin_url', ap.linkedin_url,
    'github_url', ap.github_url
)
FROM alumni_profiles ap
WHERE cm.id = ap.membership_id
AND cm.member_type = 'alumni';

RAISE NOTICE '✅ Alumni profiles migrated';

-- ============================================================================
-- 2.2 Migrate Entrepreneur Profiles
-- ============================================================================
UPDATE community_memberships cm
SET profile_data = jsonb_build_object(
    'company', ep.company,
    'industry', ep.industry,
    'company_stage', ep.company_stage,
    'founded_year', ep.founded_year,
    'employee_count_range', ep.employee_count_range,
    'annual_revenue_range', ep.annual_revenue_range,
    'services_offered', ep.services_offered,
    'products', ep.products,
    'expertise', ep.expertise,
    'looking_for', ep.looking_for,
    'can_offer', ep.can_offer,
    'target_customers', ep.target_customers,
    'city', ep.city,
    'state', ep.state,
    'country', ep.country,
    'markets_served', ep.markets_served,
    'certifications', ep.certifications,
    'awards', ep.awards,
    'website_url', ep.website_url,
    'linkedin_company_url', ep.linkedin_company_url
)
FROM entrepreneur_profiles ep
WHERE cm.id = ep.membership_id
AND cm.member_type = 'entrepreneur';

RAISE NOTICE '✅ Entrepreneur profiles migrated';

-- ============================================================================
-- 2.3 Migrate Resident Profiles
-- ============================================================================
UPDATE community_memberships cm
SET profile_data = jsonb_build_object(
    'apartment_number', rp.apartment_number,
    'building', rp.building,
    'floor', rp.floor,
    'apartment_type', rp.apartment_type,
    'ownership_type', rp.ownership_type,
    'move_in_date', rp.move_in_date,
    'profession', rp.profession,
    'organization', rp.organization,
    'skills', rp.skills,
    'community_roles', rp.community_roles,
    'can_help_with', rp.can_help_with,
    'services_offered', rp.services_offered,
    'interested_in', rp.interested_in,
    'family_composition', rp.family_composition,
    'vehicles', rp.vehicles,
    'emergency_contact_name', rp.emergency_contact_name,
    'emergency_contact_phone', rp.emergency_contact_phone
)
FROM resident_profiles rp
WHERE cm.id = rp.membership_id
AND cm.member_type = 'resident';

RAISE NOTICE '✅ Resident profiles migrated';

-- ============================================================================
-- 2.4 Migrate Community Admin Permissions
-- ============================================================================
UPDATE community_memberships cm
SET permissions = ca.permissions,
    role = ca.role
FROM community_admins ca
WHERE cm.community_id = ca.community_id
AND cm.member_id = ca.member_id
AND ca.revoked_at IS NULL;

RAISE NOTICE '✅ Admin permissions migrated';

-- ============================================================================
-- 2.5 Verification Queries
-- ============================================================================

-- Count migrated records
DO $$
DECLARE
    alumni_count INT;
    entrepreneur_count INT;
    resident_count INT;
    admin_count INT;
BEGIN
    SELECT COUNT(*) INTO alumni_count 
    FROM community_memberships 
    WHERE member_type = 'alumni' AND profile_data != '{}'::jsonb;
    
    SELECT COUNT(*) INTO entrepreneur_count 
    FROM community_memberships 
    WHERE member_type = 'entrepreneur' AND profile_data != '{}'::jsonb;
    
    SELECT COUNT(*) INTO resident_count 
    FROM community_memberships 
    WHERE member_type = 'resident' AND profile_data != '{}'::jsonb;
    
    SELECT COUNT(*) INTO admin_count 
    FROM community_memberships 
    WHERE role IN ('admin', 'super_admin') AND permissions != '{}'::jsonb;
    
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE 'Migration Summary:';
    RAISE NOTICE '  Alumni profiles migrated: %', alumni_count;
    RAISE NOTICE '  Entrepreneur profiles migrated: %', entrepreneur_count;
    RAISE NOTICE '  Resident profiles migrated: %', resident_count;
    RAISE NOTICE '  Admin permissions migrated: %', admin_count;
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;

COMMIT;
