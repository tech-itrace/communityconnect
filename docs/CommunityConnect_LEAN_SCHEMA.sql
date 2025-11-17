--
-- Community Connect - Lean Schema (Optimized)
-- PostgreSQL database dump for FRESH DEPLOYMENTS
--
-- This is the LEAN version with JSONB profiles (not for migration)
-- Use this for new installations instead of the old 12-table schema
--
-- Requirements: PostgreSQL 16+ (required for pgvector extension)
-- Generated: 2025-11-18
-- Schema Version: 2.0 (Lean)
--

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
-- SET transaction_timeout = 0;  -- Requires PostgreSQL 17+
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
-- Use public schema instead of empty search_path
SELECT pg_catalog.set_config('search_path', 'public', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

SET default_tablespace = '';
SET default_table_access_method = heap;

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to generate search vector for member embeddings
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

-- ============================================================================
-- TABLE: communities
-- ============================================================================

CREATE TABLE communities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    slug character varying(100) NOT NULL,
    type character varying(20) NOT NULL,
    description text,
    whatsapp_number character varying(20),
    whatsapp_webhook_url text,
    subscription_plan character varying(50) DEFAULT 'free'::character varying,
    member_limit integer DEFAULT 100,
    search_limit_monthly integer DEFAULT 1000,
    is_bot_enabled boolean DEFAULT false,
    is_search_enabled boolean DEFAULT true,
    is_embedding_enabled boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_active boolean DEFAULT true,
    created_by uuid,
    search_vector tsvector GENERATED ALWAYS AS (to_tsvector('english'::regconfig, (((name)::text || ' '::text) || COALESCE(description, ''::text)))) STORED,
    CONSTRAINT communities_member_limit_check CHECK ((member_limit > 0)),
    CONSTRAINT communities_search_limit_monthly_check CHECK ((search_limit_monthly > 0)),
    CONSTRAINT communities_slug_check CHECK (((slug)::text ~ '^[a-z0-9-]+$'::text)),
    CONSTRAINT communities_subscription_plan_check CHECK (((subscription_plan)::text = ANY ((ARRAY['free'::character varying, 'basic'::character varying, 'pro'::character varying, 'enterprise'::character varying])::text[]))),
    CONSTRAINT communities_type_check CHECK (((type)::text = ANY ((ARRAY['alumni'::character varying, 'entrepreneur'::character varying, 'apartment'::character varying, 'mixed'::character varying])::text[])))
);

ALTER TABLE ONLY communities ADD CONSTRAINT communities_pkey PRIMARY KEY (id);
ALTER TABLE ONLY communities ADD CONSTRAINT communities_slug_key UNIQUE (slug);

COMMENT ON TABLE communities IS 'Represents different communities (apartment, alumni, entrepreneur groups)';
COMMENT ON COLUMN communities.slug IS 'URL-friendly identifier for the community';
COMMENT ON COLUMN communities.type IS 'Type of community: alumni, entrepreneur, apartment, or mixed';

-- ============================================================================
-- TABLE: members
-- ============================================================================

CREATE TABLE members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    phone character varying(20) NOT NULL,
    email character varying(255),
    name character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_login timestamp with time zone,
    is_active boolean DEFAULT true,
    CONSTRAINT members_email_check CHECK (((email IS NULL) OR ((email)::text ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'::text))),
    CONSTRAINT members_name_check CHECK ((length(TRIM(BOTH FROM name)) >= 2)),
    CONSTRAINT members_phone_check CHECK (((phone)::text ~ '^\+?[1-9]\d{9,14}$'::text))
);

ALTER TABLE ONLY members ADD CONSTRAINT members_pkey PRIMARY KEY (id);
ALTER TABLE ONLY members ADD CONSTRAINT members_phone_key UNIQUE (phone);

COMMENT ON TABLE members IS 'Base member identity - a person can belong to multiple communities';
COMMENT ON COLUMN members.phone IS 'Primary authentication mechanism, must be unique globally';

-- ============================================================================
-- TABLE: community_memberships (WITH JSONB PROFILE DATA)
-- ============================================================================

CREATE TABLE community_memberships (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    community_id uuid NOT NULL,
    member_id uuid NOT NULL,
    member_type character varying(20) NOT NULL,
    role character varying(20) DEFAULT 'member'::character varying,
    profile_data jsonb DEFAULT '{}'::jsonb,
    permissions jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    joined_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    invited_by uuid,
    invitation_accepted_at timestamp with time zone,
    CONSTRAINT community_memberships_member_type_check CHECK (((member_type)::text = ANY ((ARRAY['alumni'::character varying, 'entrepreneur'::character varying, 'resident'::character varying, 'generic'::character varying])::text[]))),
    CONSTRAINT community_memberships_role_check CHECK (((role)::text = ANY ((ARRAY['member'::character varying, 'admin'::character varying, 'super_admin'::character varying])::text[])))
);

ALTER TABLE ONLY community_memberships ADD CONSTRAINT community_memberships_pkey PRIMARY KEY (id);
ALTER TABLE ONLY community_memberships ADD CONSTRAINT community_memberships_community_id_member_id_key UNIQUE (community_id, member_id);

COMMENT ON TABLE community_memberships IS 'Links members to communities with role and type information. Profile data stored as JSONB.';
COMMENT ON COLUMN community_memberships.member_type IS 'How this person participates: alumni, entrepreneur, resident, or generic';
COMMENT ON COLUMN community_memberships.role IS 'Access level: member (search only), admin (manage members), super_admin (full access)';
COMMENT ON COLUMN community_memberships.profile_data IS 'Type-specific profile data stored as JSONB. Structure varies by member_type (alumni/entrepreneur/resident)';
COMMENT ON COLUMN community_memberships.permissions IS 'Admin permissions for members with role=admin or super_admin';

-- ============================================================================
-- TABLE: member_embeddings (WITH SEARCH VECTOR)
-- ============================================================================

CREATE TABLE member_embeddings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    membership_id uuid NOT NULL,
    profile_embedding vector(768) NOT NULL,
    skills_embedding vector(768) NOT NULL,
    contextual_embedding vector(768) NOT NULL,
    search_vector tsvector NOT NULL,
    embedding_model character varying(100) DEFAULT 'BAAI/bge-base-en-v1.5'::character varying NOT NULL,
    embedding_version integer DEFAULT 1,
    profile_text text,
    skills_text text,
    contextual_text text,
    profile_text_length integer,
    skills_text_length integer,
    contextual_text_length integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY member_embeddings ADD CONSTRAINT member_embeddings_pkey1 PRIMARY KEY (id);
ALTER TABLE ONLY member_embeddings ADD CONSTRAINT member_embeddings_membership_id_key UNIQUE (membership_id);

COMMENT ON TABLE member_embeddings IS 'Vector embeddings for semantic search - three types per member plus full-text search vector';
COMMENT ON COLUMN member_embeddings.profile_embedding IS 'Embedding of full profile for general queries';
COMMENT ON COLUMN member_embeddings.skills_embedding IS 'Embedding of skills/expertise for "who knows X" queries';
COMMENT ON COLUMN member_embeddings.contextual_embedding IS 'Embedding of interests/needs for networking queries';
COMMENT ON COLUMN member_embeddings.search_vector IS 'Full-text search vector combining profile, skills, and contextual text. Auto-updated via trigger.';

-- ============================================================================
-- TABLE: search_queries
-- ============================================================================

CREATE TABLE search_queries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    community_id uuid NOT NULL,
    member_id uuid,
    query_text text NOT NULL,
    query_type character varying(50),
    member_type_filter character varying(20),
    search_strategy character varying(50),
    embedding_type_used character varying(50),
    results_count integer,
    response_time_ms integer,
    success boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    user_agent text,
    source character varying(50)
);

ALTER TABLE ONLY search_queries ADD CONSTRAINT search_queries_pkey1 PRIMARY KEY (id);

COMMENT ON TABLE search_queries IS 'Logs all search queries for analytics and optimization';

-- ============================================================================
-- TABLE: search_cache
-- ============================================================================

CREATE TABLE search_cache (
    query_hash character varying(64) NOT NULL,
    query_text text NOT NULL,
    response jsonb NOT NULL,
    hit_count integer DEFAULT 1,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    last_accessed timestamp without time zone DEFAULT now()
);

ALTER TABLE ONLY search_cache ADD CONSTRAINT search_cache_pkey PRIMARY KEY (query_hash);

COMMENT ON TABLE search_cache IS 'Caches search results to reduce embedding computation and database queries';

-- ============================================================================
-- TABLE: query_embedding_cache
-- ============================================================================

CREATE TABLE query_embedding_cache (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    query_text text NOT NULL,
    query_hash character varying(64) NOT NULL,
    query_embedding vector(768) NOT NULL,
    embedding_model character varying(100) DEFAULT 'BAAI/bge-base-en-v1.5'::character varying,
    hit_count integer DEFAULT 1,
    last_used timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY query_embedding_cache ADD CONSTRAINT query_embedding_cache_pkey PRIMARY KEY (id);
ALTER TABLE ONLY query_embedding_cache ADD CONSTRAINT query_embedding_cache_query_hash_key UNIQUE (query_hash);

COMMENT ON TABLE query_embedding_cache IS 'Caches query embeddings to avoid re-computing for similar/repeated queries';

-- ============================================================================
-- TABLE: embedding_generation_jobs (OPTIONAL - for tracking)
-- ============================================================================

CREATE TABLE embedding_generation_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    community_id uuid NOT NULL,
    job_type character varying(50) NOT NULL,
    target_member_type character varying(20),
    embedding_model character varying(100),
    status character varying(20) DEFAULT 'pending'::character varying,
    total_members integer,
    processed_members integer DEFAULT 0,
    failed_members integer DEFAULT 0,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    duration_seconds integer,
    error_log jsonb DEFAULT '[]'::jsonb,
    failed_member_ids text[],
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    CONSTRAINT embedding_generation_jobs_job_type_check CHECK (((job_type)::text = ANY ((ARRAY['initial'::character varying, 'regenerate'::character varying, 'update'::character varying, 'model_upgrade'::character varying])::text[]))),
    CONSTRAINT embedding_generation_jobs_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'running'::character varying, 'completed'::character varying, 'failed'::character varying, 'cancelled'::character varying])::text[]))),
    CONSTRAINT embedding_generation_jobs_target_member_type_check CHECK (((target_member_type)::text = ANY ((ARRAY['alumni'::character varying, 'entrepreneur'::character varying, 'resident'::character varying, 'all'::character varying])::text[])))
);

ALTER TABLE ONLY embedding_generation_jobs ADD CONSTRAINT embedding_generation_jobs_pkey PRIMARY KEY (id);

COMMENT ON TABLE embedding_generation_jobs IS 'Tracks bulk embedding generation/regeneration jobs';

-- ============================================================================
-- TABLE: users (Optional - for dashboard authentication)
-- ============================================================================

CREATE TABLE users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    member_id uuid,
    is_active boolean DEFAULT true,
    email_verified boolean DEFAULT false,
    email_verified_at timestamp with time zone,
    last_login timestamp with time zone,
    last_login_ip inet,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY users ADD CONSTRAINT users_pkey PRIMARY KEY (id);
ALTER TABLE ONLY users ADD CONSTRAINT users_email_key UNIQUE (email);

COMMENT ON TABLE users IS 'Dashboard users - may or may not be community members';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Communities indexes
CREATE INDEX idx_communities_active ON communities USING btree (is_active) WHERE (is_active = true);
CREATE INDEX idx_communities_search ON communities USING gin (search_vector);
CREATE INDEX idx_communities_slug ON communities USING btree (slug);
CREATE INDEX idx_communities_type ON communities USING btree (type);

-- Members indexes
CREATE INDEX idx_members_phone ON members USING btree (phone);

-- Community memberships indexes (including JSONB expression indexes)
CREATE INDEX idx_cm_community ON community_memberships USING btree (community_id);
CREATE INDEX idx_cm_community_active ON community_memberships USING btree (community_id, is_active) WHERE (is_active = true);
CREATE INDEX idx_cm_community_type ON community_memberships USING btree (community_id, member_type);
CREATE INDEX idx_cm_member ON community_memberships USING btree (member_id);
CREATE INDEX idx_cm_role ON community_memberships USING btree (role);
CREATE INDEX idx_cm_type ON community_memberships USING btree (member_type);

-- JSONB indexes for common queries
CREATE INDEX idx_cm_profile_data_gin ON community_memberships USING gin(profile_data);
CREATE INDEX idx_cm_profile_city ON community_memberships ((profile_data->>'city')) WHERE profile_data->>'city' IS NOT NULL;
CREATE INDEX idx_cm_profile_college ON community_memberships ((profile_data->>'college')) WHERE member_type = 'alumni';
CREATE INDEX idx_cm_profile_year ON community_memberships (((profile_data->>'graduation_year')::integer)) WHERE member_type = 'alumni' AND profile_data->>'graduation_year' IS NOT NULL;
CREATE INDEX idx_cm_profile_company ON community_memberships ((profile_data->>'company')) WHERE member_type = 'entrepreneur';
CREATE INDEX idx_cm_profile_apartment ON community_memberships ((profile_data->>'apartment_number')) WHERE member_type = 'resident';
CREATE INDEX idx_cm_profile_skills_gin ON community_memberships USING gin((profile_data->'skills')) WHERE profile_data->'skills' IS NOT NULL;

-- Member embeddings indexes (vector + full-text search)
CREATE INDEX idx_embeddings_profile ON member_embeddings USING hnsw (profile_embedding vector_cosine_ops) WITH (m='16', ef_construction='64');
CREATE INDEX idx_embeddings_skills ON member_embeddings USING hnsw (skills_embedding vector_cosine_ops) WITH (m='16', ef_construction='64');
CREATE INDEX idx_embeddings_contextual ON member_embeddings USING hnsw (contextual_embedding vector_cosine_ops) WITH (m='16', ef_construction='64');
CREATE INDEX idx_embeddings_search_vector ON member_embeddings USING gin(search_vector);
CREATE INDEX idx_embeddings_membership ON member_embeddings USING btree (membership_id);
CREATE INDEX idx_embeddings_model ON member_embeddings USING btree (embedding_model);
CREATE INDEX idx_embeddings_version ON member_embeddings USING btree (embedding_version);
CREATE INDEX idx_embeddings_updated ON member_embeddings USING btree (updated_at);

-- Search queries indexes
CREATE INDEX idx_queries_community ON search_queries USING btree (community_id, created_at DESC);
CREATE INDEX idx_queries_member ON search_queries USING btree (member_id);
CREATE INDEX idx_queries_success ON search_queries USING btree (success) WHERE (success = false);

-- Cache indexes
CREATE INDEX idx_cache_expires ON search_cache USING btree (expires_at);
CREATE INDEX idx_cache_hits ON search_cache USING btree (hit_count DESC);
CREATE INDEX idx_query_cache_expires ON query_embedding_cache USING btree (expires_at);
CREATE INDEX idx_query_cache_hash ON query_embedding_cache USING btree (query_hash);

-- Embedding jobs indexes
CREATE INDEX idx_embedding_jobs_community ON embedding_generation_jobs USING btree (community_id);
CREATE INDEX idx_embedding_jobs_status ON embedding_generation_jobs USING btree (status);
CREATE INDEX idx_embedding_jobs_created ON embedding_generation_jobs USING btree (created_at DESC);

-- Users indexes
CREATE INDEX idx_users_email ON users USING btree (email);
CREATE INDEX idx_users_member ON users USING btree (member_id) WHERE (member_id IS NOT NULL);
CREATE INDEX idx_users_active ON users USING btree (is_active) WHERE (is_active = true);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at on communities
CREATE TRIGGER trg_communities_updated
    BEFORE UPDATE ON communities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Update updated_at on members
CREATE TRIGGER trg_members_updated
    BEFORE UPDATE ON members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Update updated_at on community_memberships
CREATE TRIGGER trg_memberships_updated
    BEFORE UPDATE ON community_memberships
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Update updated_at on member_embeddings
CREATE TRIGGER trg_embeddings_updated
    BEFORE UPDATE ON member_embeddings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Auto-update search_vector on member_embeddings
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

-- Update updated_at on users
CREATE TRIGGER trg_users_updated
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- FOREIGN KEYS
-- ============================================================================

ALTER TABLE ONLY community_memberships
    ADD CONSTRAINT community_memberships_community_id_fkey 
    FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE;

ALTER TABLE ONLY community_memberships
    ADD CONSTRAINT community_memberships_member_id_fkey 
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE;

ALTER TABLE ONLY community_memberships
    ADD CONSTRAINT community_memberships_invited_by_fkey 
    FOREIGN KEY (invited_by) REFERENCES members(id) ON DELETE SET NULL;

ALTER TABLE ONLY member_embeddings
    ADD CONSTRAINT member_embeddings_membership_id_fkey 
    FOREIGN KEY (membership_id) REFERENCES community_memberships(id) ON DELETE CASCADE;

ALTER TABLE ONLY search_queries
    ADD CONSTRAINT search_queries_community_id_fkey 
    FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE;

ALTER TABLE ONLY search_queries
    ADD CONSTRAINT search_queries_member_id_fkey 
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE SET NULL;

ALTER TABLE ONLY embedding_generation_jobs
    ADD CONSTRAINT embedding_generation_jobs_community_id_fkey 
    FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE;

ALTER TABLE ONLY embedding_generation_jobs
    ADD CONSTRAINT embedding_generation_jobs_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES members(id) ON DELETE SET NULL;

ALTER TABLE ONLY users
    ADD CONSTRAINT users_member_id_fkey 
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE SET NULL;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on sensitive tables
ALTER TABLE community_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_cache ENABLE ROW LEVEL SECURITY;

-- Policy: Community isolation for memberships
CREATE POLICY community_isolation ON community_memberships
    USING (
        (community_id = (NULLIF(current_setting('app.current_community_id', true), ''))::uuid) 
        OR (current_setting('app.current_community_id', true) = '')
    );

-- Policy: Embedding isolation
CREATE POLICY embedding_isolation ON member_embeddings
    USING (
        (membership_id IN (
            SELECT id FROM community_memberships 
            WHERE community_id = (NULLIF(current_setting('app.current_community_id', true), ''))::uuid
        )) 
        OR (current_setting('app.current_community_id', true) = '')
    );

-- ============================================================================
-- SAMPLE DATA / DEFAULTS (OPTIONAL)
-- ============================================================================

-- You can add default communities, test data, etc. here for development

-- ============================================================================
-- COMPLETION SUMMARY
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ Community Connect Lean Schema Created Successfully';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE 'Schema Version: 2.0 (Lean - Optimized)';
    RAISE NOTICE 'Tables Created: 8 core tables';
    RAISE NOTICE '  • communities';
    RAISE NOTICE '  • members';
    RAISE NOTICE '  • community_memberships (with JSONB profile_data)';
    RAISE NOTICE '  • member_embeddings (with search_vector)';
    RAISE NOTICE '  • search_queries';
    RAISE NOTICE '  • search_cache';
    RAISE NOTICE '  • query_embedding_cache';
    RAISE NOTICE '  • embedding_generation_jobs';
    RAISE NOTICE '  • users (optional)';
    RAISE NOTICE '';
    RAISE NOTICE 'Key Features:';
    RAISE NOTICE '  ✅ JSONB profile storage (flexible, no migrations needed)';
    RAISE NOTICE '  ✅ Full-text search integrated into embeddings';
    RAISE NOTICE '  ✅ Admin permissions in memberships table';
    RAISE NOTICE '  ✅ Vector search with pgvector (HNSW indexes)';
    RAISE NOTICE '  ✅ Row-level security policies';
    RAISE NOTICE '  ✅ Auto-updating timestamps and search vectors';
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '  1. Create your first community';
    RAISE NOTICE '  2. Import members using: npm run import:members';
    RAISE NOTICE '  3. Generate embeddings: npm run generate:embeddings';
    RAISE NOTICE '  4. Start server: npm run dev';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;

--
-- PostgreSQL database dump complete
--
