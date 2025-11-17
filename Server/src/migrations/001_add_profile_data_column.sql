-- ============================================================================
-- MIGRATION: Phase 1 - Add JSONB Profile Data Column
-- File: Server/src/migrations/001_add_profile_data_column.sql
-- Safe to run: YES (non-breaking, keeps existing tables)
-- ============================================================================

BEGIN;

-- Add profile_data column to community_memberships
ALTER TABLE community_memberships 
ADD COLUMN IF NOT EXISTS profile_data JSONB DEFAULT '{}'::jsonb;

-- Add permissions column to community_memberships (merge community_admins)
ALTER TABLE community_memberships
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb;

-- Add comments
COMMENT ON COLUMN community_memberships.profile_data IS 
'Type-specific profile data stored as JSONB. Structure varies by member_type (alumni/entrepreneur/resident)';

COMMENT ON COLUMN community_memberships.permissions IS 
'Admin permissions for members with role=admin or super_admin';

-- Create GIN index for JSONB queries
CREATE INDEX IF NOT EXISTS idx_cm_profile_data_gin 
ON community_memberships USING gin(profile_data);

-- Create expression indexes for common filters
CREATE INDEX IF NOT EXISTS idx_cm_profile_city 
ON community_memberships ((profile_data->>'city')) 
WHERE profile_data->>'city' IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cm_profile_college 
ON community_memberships ((profile_data->>'college'))
WHERE member_type = 'alumni';

CREATE INDEX IF NOT EXISTS idx_cm_profile_year 
ON community_memberships (((profile_data->>'graduation_year')::integer))
WHERE member_type = 'alumni' AND profile_data->>'graduation_year' IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cm_profile_company
ON community_memberships ((profile_data->>'company'))
WHERE member_type = 'entrepreneur';

CREATE INDEX IF NOT EXISTS idx_cm_profile_apartment
ON community_memberships ((profile_data->>'apartment_number'))
WHERE member_type = 'resident';

-- Create index for skills array (works with JSONB arrays)
CREATE INDEX IF NOT EXISTS idx_cm_profile_skills_gin
ON community_memberships USING gin((profile_data->'skills'))
WHERE profile_data->'skills' IS NOT NULL;

RAISE NOTICE '✅ Phase 1 Complete: Added profile_data and permissions columns with indexes';

COMMIT;
