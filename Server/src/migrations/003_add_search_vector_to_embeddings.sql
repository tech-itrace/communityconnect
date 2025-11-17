-- ============================================================================
-- MIGRATION: Phase 3 - Add Search Vector to Member Embeddings
-- File: Server/src/migrations/003_add_search_vector_to_embeddings.sql
-- Safe to run: YES (adds column and function)
-- ============================================================================

BEGIN;

-- Add search_vector column to member_embeddings
ALTER TABLE member_embeddings
ADD COLUMN IF NOT EXISTS search_vector tsvector;

RAISE NOTICE '✅ Added search_vector column';

-- Create function to generate search vector from existing text columns
CREATE OR REPLACE FUNCTION generate_member_search_vector(
    p_profile_text TEXT,
    p_skills_text TEXT,
    p_contextual_text TEXT
) RETURNS tsvector AS $$
BEGIN
    RETURN to_tsvector('english', 
        COALESCE(p_profile_text, '') || ' ' ||
        COALESCE(p_skills_text, '') || ' ' ||
        COALESCE(p_contextual_text, '')
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

RAISE NOTICE '✅ Created search vector generation function';

-- Populate search_vector from existing text columns
UPDATE member_embeddings
SET search_vector = generate_member_search_vector(
    profile_text,
    skills_text,
    contextual_text
);

RAISE NOTICE '✅ Populated search vectors from existing data';

-- Make it NOT NULL after population
ALTER TABLE member_embeddings
ALTER COLUMN search_vector SET NOT NULL;

-- Create GIN index for full-text search
CREATE INDEX IF NOT EXISTS idx_embeddings_search_vector
ON member_embeddings USING gin(search_vector);

RAISE NOTICE '✅ Created GIN index on search_vector';

-- Create trigger to auto-update search_vector
CREATE OR REPLACE FUNCTION update_embedding_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := generate_member_search_vector(
        NEW.profile_text,
        NEW.skills_text,
        NEW.contextual_text
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_embedding_search_vector
BEFORE INSERT OR UPDATE OF profile_text, skills_text, contextual_text
ON member_embeddings
FOR EACH ROW
EXECUTE FUNCTION update_embedding_search_vector();

RAISE NOTICE '✅ Created auto-update trigger';

-- Add comment
COMMENT ON COLUMN member_embeddings.search_vector IS 
'Full-text search vector combining profile, skills, and contextual text. Auto-updated via trigger.';

-- Verification
DO $$
DECLARE
    total_count INT;
    vector_count INT;
BEGIN
    SELECT COUNT(*) INTO total_count FROM member_embeddings;
    SELECT COUNT(*) INTO vector_count FROM member_embeddings WHERE search_vector IS NOT NULL;
    
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE 'Search Vector Migration Summary:';
    RAISE NOTICE '  Total embeddings: %', total_count;
    RAISE NOTICE '  Vectors generated: %', vector_count;
    
    IF total_count != vector_count THEN
        RAISE WARNING 'Not all embeddings have search vectors!';
    ELSE
        RAISE NOTICE '  ✅ All embeddings have search vectors';
    END IF;
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;

COMMIT;
