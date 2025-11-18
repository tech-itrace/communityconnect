-- Migration 006: Create member_search_index table for full-text search
-- This table stores aggregated tsvector for full-text search across all member data

CREATE TABLE IF NOT EXISTS member_search_index (
    membership_id UUID PRIMARY KEY REFERENCES community_memberships(id) ON DELETE CASCADE,
    community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,

    -- Aggregated search vector
    search_vector TSVECTOR NOT NULL,

    -- Track what was indexed
    indexed_fields JSONB DEFAULT '{}'::jsonb,

    -- Metadata
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE member_search_index IS 'Full-text search index combining all searchable member data from JSONB profiles';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_search_community ON member_search_index(community_id);
CREATE INDEX IF NOT EXISTS idx_search_vector ON member_search_index USING GIN(search_vector);

-- Trigger to auto-update search vector when membership profile changes
CREATE OR REPLACE FUNCTION update_member_search_vector()
RETURNS TRIGGER AS $$
DECLARE
    search_text TEXT;
    member_name TEXT;
    member_email TEXT;
    member_phone TEXT;
BEGIN
    -- Get member basic info
    SELECT m.name, m.email, m.phone
    INTO member_name, member_email, member_phone
    FROM members m
    WHERE m.id = NEW.member_id;

    -- Build searchable text from member data + JSONB profile
    search_text := COALESCE(member_name, '') || ' ' ||
                   COALESCE(member_email, '') || ' ' ||
                   COALESCE(member_phone, '') || ' ' ||
                   COALESCE(NEW.profile_data->>'college', '') || ' ' ||
                   COALESCE(NEW.profile_data->>'degree', '') || ' ' ||
                   COALESCE(NEW.profile_data->>'department', '') || ' ' ||
                   COALESCE(NEW.profile_data->>'city', '') || ' ' ||
                   COALESCE(NEW.profile_data->>'company', '') || ' ' ||
                   COALESCE(NEW.profile_data->>'industry', '') || ' ' ||
                   COALESCE(NEW.profile_data->>'designation', '') || ' ' ||
                   COALESCE(NEW.profile_data->>'current_organization', '') || ' ' ||
                   COALESCE(NEW.profile_data->>'profession', '') || ' ' ||
                   COALESCE(NEW.profile_data->>'organization', '') || ' ' ||
                   COALESCE(NEW.profile_data->>'apartment_number', '') || ' ' ||
                   COALESCE(NEW.profile_data->>'building', '');

    -- Add skills array if exists
    IF NEW.profile_data ? 'skills' AND jsonb_typeof(NEW.profile_data->'skills') = 'array' THEN
        search_text := search_text || ' ' || array_to_string(ARRAY(SELECT jsonb_array_elements_text(NEW.profile_data->'skills')), ' ');
    END IF;

    -- Add services_offered array if exists
    IF NEW.profile_data ? 'services_offered' AND jsonb_typeof(NEW.profile_data->'services_offered') = 'array' THEN
        search_text := search_text || ' ' || array_to_string(ARRAY(SELECT jsonb_array_elements_text(NEW.profile_data->'services_offered')), ' ');
    END IF;

    -- Upsert into search index
    INSERT INTO member_search_index (membership_id, community_id, search_vector, updated_at)
    VALUES (
        NEW.id,
        NEW.community_id,
        to_tsvector('english', search_text),
        NOW()
    )
    ON CONFLICT (membership_id)
    DO UPDATE SET
        search_vector = to_tsvector('english', search_text),
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on community_memberships
DROP TRIGGER IF EXISTS trg_update_search_index ON community_memberships;
CREATE TRIGGER trg_update_search_index
    AFTER INSERT OR UPDATE OF profile_data
    ON community_memberships
    FOR EACH ROW
    EXECUTE FUNCTION update_member_search_vector();

-- Populate search index for existing memberships
INSERT INTO member_search_index (membership_id, community_id, search_vector, updated_at)
SELECT
    cm.id,
    cm.community_id,
    to_tsvector('english',
        COALESCE(m.name, '') || ' ' ||
        COALESCE(m.email, '') || ' ' ||
        COALESCE(m.phone, '') || ' ' ||
        COALESCE(cm.profile_data->>'college', '') || ' ' ||
        COALESCE(cm.profile_data->>'degree', '') || ' ' ||
        COALESCE(cm.profile_data->>'department', '') || ' ' ||
        COALESCE(cm.profile_data->>'city', '') || ' ' ||
        COALESCE(cm.profile_data->>'company', '') || ' ' ||
        COALESCE(cm.profile_data->>'industry', '') || ' ' ||
        COALESCE(cm.profile_data->>'designation', '') || ' ' ||
        COALESCE(cm.profile_data->>'current_organization', '') || ' ' ||
        COALESCE(cm.profile_data->>'profession', '') || ' ' ||
        COALESCE(cm.profile_data->>'organization', '') || ' ' ||
        COALESCE(cm.profile_data->>'apartment_number', '') || ' ' ||
        COALESCE(cm.profile_data->>'building', '') || ' ' ||
        CASE
            WHEN cm.profile_data ? 'skills' AND jsonb_typeof(cm.profile_data->'skills') = 'array'
            THEN array_to_string(ARRAY(SELECT jsonb_array_elements_text(cm.profile_data->'skills')), ' ')
            ELSE ''
        END || ' ' ||
        CASE
            WHEN cm.profile_data ? 'services_offered' AND jsonb_typeof(cm.profile_data->'services_offered') = 'array'
            THEN array_to_string(ARRAY(SELECT jsonb_array_elements_text(cm.profile_data->'services_offered')), ' ')
            ELSE ''
        END
    ) AS search_vector,
    NOW()
FROM community_memberships cm
JOIN members m ON cm.member_id = m.id
WHERE cm.is_active = TRUE
ON CONFLICT (membership_id) DO NOTHING;

COMMENT ON TRIGGER trg_update_search_index ON community_memberships IS 'Auto-update search index when member profile data changes';
