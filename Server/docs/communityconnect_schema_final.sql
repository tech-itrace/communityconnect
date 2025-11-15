-- ============================================
-- Community Connect - Complete Schema
-- Multi-Community Platform with Type-Specific Profiles
-- Version: 2.0
-- Date: 2025-11-16
-- ============================================

-- Prerequisites
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- SECTION 1: CORE ENTITIES
-- ============================================

-- Communities table - represents different apartment complexes, alumni groups, etc.
CREATE TABLE communities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Basic info
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL CHECK (slug ~ '^[a-z0-9-]+$'),
    type VARCHAR(20) NOT NULL CHECK (type IN ('alumni', 'entrepreneur', 'apartment', 'mixed')),
    description TEXT,
    
    -- Configuration
    whatsapp_number VARCHAR(20),
    whatsapp_webhook_url TEXT,
    subscription_plan VARCHAR(50) DEFAULT 'free' CHECK (subscription_plan IN ('free', 'basic', 'pro', 'enterprise')),
    
    -- Limits
    member_limit INTEGER DEFAULT 100 CHECK (member_limit > 0),
    search_limit_monthly INTEGER DEFAULT 1000 CHECK (search_limit_monthly > 0),
    
    -- Features
    is_bot_enabled BOOLEAN DEFAULT false,
    is_search_enabled BOOLEAN DEFAULT true,
    is_embedding_enabled BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    
    -- Audit
    created_by UUID,  -- FK to members, added later
    
    -- Full-text search
    search_vector TSVECTOR GENERATED ALWAYS AS (
        to_tsvector('english', name || ' ' || COALESCE(description, ''))
    ) STORED
);

COMMENT ON TABLE communities IS 'Represents different communities (apartment, alumni, entrepreneur groups)';
COMMENT ON COLUMN communities.type IS 'Type of community: alumni, entrepreneur, apartment, or mixed';
COMMENT ON COLUMN communities.slug IS 'URL-friendly identifier for the community';

-- Indexes
CREATE INDEX idx_communities_slug ON communities(slug);
CREATE INDEX idx_communities_type ON communities(type);
CREATE INDEX idx_communities_active ON communities(is_active) WHERE is_active = true;
CREATE INDEX idx_communities_search ON communities USING GIN(search_vector);


-- ============================================
-- Members table - base identity across all communities
CREATE TABLE members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Authentication (phone-based as per requirements)
    phone VARCHAR(20) UNIQUE NOT NULL CHECK (phone ~ '^\+?[1-9]\d{9,14}$'),
    email VARCHAR(255) CHECK (
        email IS NULL OR 
        email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'
    ),
    
    -- Basic identity
    name VARCHAR(255) NOT NULL CHECK (LENGTH(TRIM(name)) >= 2),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true
);

COMMENT ON TABLE members IS 'Base member identity - a person can belong to multiple communities';
COMMENT ON COLUMN members.phone IS 'Primary authentication mechanism, must be unique globally';

-- Indexes
CREATE INDEX idx_members_phone ON members(phone);
CREATE INDEX idx_members_email ON members(email) WHERE email IS NOT NULL;
CREATE INDEX idx_members_active ON members(is_active) WHERE is_active = true;


-- ============================================
-- Community Memberships - junction table linking members to communities
CREATE TABLE community_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    
    -- Member type in THIS community
    member_type VARCHAR(20) NOT NULL CHECK (member_type IN ('alumni', 'entrepreneur', 'resident', 'generic')),
    
    -- Role-based access control
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('member', 'admin', 'super_admin')),
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Audit
    invited_by UUID REFERENCES members(id) ON DELETE SET NULL,
    invitation_accepted_at TIMESTAMPTZ,
    
    -- Ensure one membership per member per community
    UNIQUE(community_id, member_id)
);

COMMENT ON TABLE community_memberships IS 'Links members to communities with role and type information';
COMMENT ON COLUMN community_memberships.member_type IS 'How this person participates: alumni, entrepreneur, resident, or generic';
COMMENT ON COLUMN community_memberships.role IS 'Access level: member (search only), admin (manage members), super_admin (full access)';

-- Indexes
CREATE INDEX idx_cm_community ON community_memberships(community_id);
CREATE INDEX idx_cm_member ON community_memberships(member_id);
CREATE INDEX idx_cm_type ON community_memberships(member_type);
CREATE INDEX idx_cm_role ON community_memberships(role);
CREATE INDEX idx_cm_community_type ON community_memberships(community_id, member_type);
CREATE INDEX idx_cm_community_active ON community_memberships(community_id, is_active) WHERE is_active = true;


-- ============================================
-- SECTION 2: TYPE-SPECIFIC PROFILES
-- ============================================

-- Alumni profiles - extends community_memberships for alumni type
CREATE TABLE alumni_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    membership_id UUID NOT NULL REFERENCES community_memberships(id) ON DELETE CASCADE,
    
    -- Educational background (REQUIRED)
    college VARCHAR(255) NOT NULL,
    graduation_year INTEGER NOT NULL CHECK (
        graduation_year BETWEEN 1950 AND EXTRACT(YEAR FROM CURRENT_DATE) + 10
    ),
    degree VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    specialization VARCHAR(100),
    
    -- Current professional status (OPTIONAL)
    current_organization VARCHAR(255),
    designation VARCHAR(255),
    years_of_experience INTEGER CHECK (years_of_experience >= 0),
    
    -- Location
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'India',
    
    -- Skills and expertise (arrays for efficient querying)
    skills TEXT[],
    domains TEXT[],
    
    -- Networking
    interests TEXT[],
    looking_for TEXT,
    willing_to_help_with TEXT[],
    
    -- Social links
    linkedin_url TEXT CHECK (linkedin_url IS NULL OR linkedin_url ~* '^https?://'),
    github_url TEXT CHECK (github_url IS NULL OR github_url ~* '^https?://'),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- One profile per membership
    UNIQUE(membership_id)
);

COMMENT ON TABLE alumni_profiles IS 'Type-specific data for alumni community members';
COMMENT ON COLUMN alumni_profiles.skills IS 'Technical and professional skills (e.g., Python, Leadership)';
COMMENT ON COLUMN alumni_profiles.domains IS 'Industry domains (e.g., Healthcare, Fintech)';

-- Indexes
CREATE INDEX idx_alumni_membership ON alumni_profiles(membership_id);
CREATE INDEX idx_alumni_college ON alumni_profiles(college);
CREATE INDEX idx_alumni_year ON alumni_profiles(graduation_year);
CREATE INDEX idx_alumni_degree ON alumni_profiles(degree);
CREATE INDEX idx_alumni_department ON alumni_profiles(department);
CREATE INDEX idx_alumni_city ON alumni_profiles(city);
CREATE INDEX idx_alumni_skills ON alumni_profiles USING GIN(skills);
CREATE INDEX idx_alumni_domains ON alumni_profiles USING GIN(domains);


-- ============================================
-- Entrepreneur profiles - extends community_memberships for entrepreneur type
CREATE TABLE entrepreneur_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    membership_id UUID NOT NULL REFERENCES community_memberships(id) ON DELETE CASCADE,
    
    -- Company info (REQUIRED)
    company VARCHAR(255) NOT NULL,
    industry VARCHAR(100) NOT NULL,
    
    -- Company details
    company_stage VARCHAR(50) CHECK (company_stage IN (
        'Idea', 'MVP', 'Pre-revenue', 'Revenue', 'Profitable', 
        'Bootstrapped', 'Seed', 'Series A', 'Series B+', 'Acquired', 'Public'
    )),
    founded_year INTEGER CHECK (founded_year BETWEEN 1900 AND EXTRACT(YEAR FROM CURRENT_DATE)),
    employee_count_range VARCHAR(20) CHECK (employee_count_range IN (
        '1', '2-10', '11-50', '51-200', '201-500', '500+'
    )),
    annual_revenue_range VARCHAR(50) CHECK (annual_revenue_range IN (
        'Pre-revenue', '0-10L', '10L-50L', '50L-1Cr', '1-5Cr', '5-10Cr', '10-50Cr', '50Cr+'
    )),
    
    -- Offerings (arrays for flexibility)
    services_offered TEXT[],
    products TEXT[],
    expertise TEXT[],
    
    -- Business needs
    looking_for TEXT[],
    can_offer TEXT[],
    target_customers TEXT[],
    
    -- Location and markets
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'India',
    markets_served TEXT[],
    
    -- Certifications and credentials
    certifications TEXT[],
    awards TEXT[],
    
    -- Links
    website_url TEXT CHECK (website_url IS NULL OR website_url ~* '^https?://'),
    linkedin_company_url TEXT CHECK (linkedin_company_url IS NULL OR linkedin_company_url ~* '^https?://'),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(membership_id)
);

COMMENT ON TABLE entrepreneur_profiles IS 'Type-specific data for entrepreneur community members';
COMMENT ON COLUMN entrepreneur_profiles.looking_for IS 'What they are seeking: Investors, Co-founders, Clients, etc.';
COMMENT ON COLUMN entrepreneur_profiles.can_offer IS 'What they can provide to others: Mentorship, Services, etc.';

-- Indexes
CREATE INDEX idx_entrepreneur_membership ON entrepreneur_profiles(membership_id);
CREATE INDEX idx_entrepreneur_company ON entrepreneur_profiles(company);
CREATE INDEX idx_entrepreneur_industry ON entrepreneur_profiles(industry);
CREATE INDEX idx_entrepreneur_stage ON entrepreneur_profiles(company_stage);
CREATE INDEX idx_entrepreneur_city ON entrepreneur_profiles(city);
CREATE INDEX idx_entrepreneur_services ON entrepreneur_profiles USING GIN(services_offered);
CREATE INDEX idx_entrepreneur_products ON entrepreneur_profiles USING GIN(products);
CREATE INDEX idx_entrepreneur_expertise ON entrepreneur_profiles USING GIN(expertise);
CREATE INDEX idx_entrepreneur_looking ON entrepreneur_profiles USING GIN(looking_for);


-- ============================================
-- Resident profiles - for apartment/housing communities
CREATE TABLE resident_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    membership_id UUID NOT NULL REFERENCES community_memberships(id) ON DELETE CASCADE,
    
    -- Apartment details
    apartment_number VARCHAR(50) NOT NULL,
    building VARCHAR(50),
    floor INTEGER,
    apartment_type VARCHAR(50),  -- 1BHK, 2BHK, 3BHK, Villa, etc.
    
    -- Occupancy
    ownership_type VARCHAR(20) CHECK (ownership_type IN ('Owner', 'Tenant', 'Guest')),
    move_in_date DATE,
    
    -- Professional (for skill-sharing)
    profession VARCHAR(255),
    organization VARCHAR(255),
    skills TEXT[],
    
    -- Community participation
    community_roles TEXT[],  -- Committee member, Club coordinator, etc.
    can_help_with TEXT[],
    services_offered TEXT[],
    interested_in TEXT[],
    
    -- Family composition (for community events)
    family_composition JSONB,  -- {adults: 2, children: 1, senior_citizens: 0, pets: 1}
    
    -- Vehicles (for parking management)
    vehicles JSONB,  -- [{type: 'Car', number: 'KA01AB1234'}, {type: 'Bike', number: 'KA01CD5678'}]
    
    -- Emergency contact
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(membership_id)
);

COMMENT ON TABLE resident_profiles IS 'Type-specific data for apartment/residential community members';
COMMENT ON COLUMN resident_profiles.can_help_with IS 'Skills/services member can offer to community';

-- Indexes
CREATE INDEX idx_resident_membership ON resident_profiles(membership_id);
CREATE INDEX idx_resident_apartment ON resident_profiles(apartment_number);
CREATE INDEX idx_resident_building ON resident_profiles(building);
CREATE INDEX idx_resident_profession ON resident_profiles(profession);
CREATE INDEX idx_resident_skills ON resident_profiles USING GIN(skills);
CREATE INDEX idx_resident_help ON resident_profiles USING GIN(can_help_with);
CREATE INDEX idx_resident_interests ON resident_profiles USING GIN(interested_in);


-- ============================================
-- SECTION 3: AI/EMBEDDINGS FOR SEMANTIC SEARCH
-- ============================================

-- Member embeddings - three different embeddings per member for optimized search
CREATE TABLE member_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    membership_id UUID NOT NULL REFERENCES community_memberships(id) ON DELETE CASCADE,
    
    -- Three embedding types for different query patterns
    profile_embedding VECTOR(768) NOT NULL,      -- Full profile: name, role, education, company
    skills_embedding VECTOR(768) NOT NULL,       -- Skills, expertise, services only
    contextual_embedding VECTOR(768) NOT NULL,   -- Interests, networking, aspirations
    
    -- Embedding metadata
    embedding_model VARCHAR(100) DEFAULT 'BAAI/bge-base-en-v1.5' NOT NULL,
    embedding_version INTEGER DEFAULT 1,         -- For tracking regenerations
    
    -- Source texts (for debugging/regeneration)
    profile_text TEXT,
    skills_text TEXT,
    contextual_text TEXT,
    
    -- Quality metrics
    profile_text_length INTEGER,
    skills_text_length INTEGER,
    contextual_text_length INTEGER,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(membership_id)
);

COMMENT ON TABLE member_embeddings IS 'Vector embeddings for semantic search - three types per member';
COMMENT ON COLUMN member_embeddings.profile_embedding IS 'Embedding of full profile for general queries';
COMMENT ON COLUMN member_embeddings.skills_embedding IS 'Embedding of skills/expertise for "who knows X" queries';
COMMENT ON COLUMN member_embeddings.contextual_embedding IS 'Embedding of interests/needs for networking queries';

-- Vector indexes using HNSW (faster than IVFFlat, auto-tuning)
CREATE INDEX idx_embeddings_profile ON member_embeddings 
    USING hnsw (profile_embedding vector_cosine_ops) 
    WITH (m = 16, ef_construction = 64);

CREATE INDEX idx_embeddings_skills ON member_embeddings 
    USING hnsw (skills_embedding vector_cosine_ops) 
    WITH (m = 16, ef_construction = 64);

CREATE INDEX idx_embeddings_contextual ON member_embeddings 
    USING hnsw (contextual_embedding vector_cosine_ops) 
    WITH (m = 16, ef_construction = 64);

-- Traditional indexes
CREATE INDEX idx_embeddings_membership ON member_embeddings(membership_id);
CREATE INDEX idx_embeddings_version ON member_embeddings(embedding_version);
CREATE INDEX idx_embeddings_model ON member_embeddings(embedding_model);
CREATE INDEX idx_embeddings_updated ON member_embeddings(updated_at);


-- ============================================
-- Embedding generation job tracking
CREATE TABLE embedding_generation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    
    -- Job configuration
    job_type VARCHAR(50) NOT NULL CHECK (job_type IN ('initial', 'regenerate', 'update', 'model_upgrade')),
    target_member_type VARCHAR(20) CHECK (target_member_type IN ('alumni', 'entrepreneur', 'resident', 'all')),
    embedding_model VARCHAR(100),
    
    -- Progress tracking
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    total_members INTEGER,
    processed_members INTEGER DEFAULT 0,
    failed_members INTEGER DEFAULT 0,
    
    -- Timing
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    
    -- Error tracking
    error_log JSONB DEFAULT '[]',
    failed_member_ids TEXT[],
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES members(id) ON DELETE SET NULL
);

COMMENT ON TABLE embedding_generation_jobs IS 'Tracks bulk embedding generation/regeneration jobs';

-- Indexes
CREATE INDEX idx_embedding_jobs_community ON embedding_generation_jobs(community_id);
CREATE INDEX idx_embedding_jobs_status ON embedding_generation_jobs(status);
CREATE INDEX idx_embedding_jobs_created ON embedding_generation_jobs(created_at DESC);


-- ============================================
-- SECTION 4: FULL-TEXT SEARCH
-- ============================================

-- Full-text search index - aggregates all searchable content per member
CREATE TABLE member_search_index (
    membership_id UUID PRIMARY KEY REFERENCES community_memberships(id) ON DELETE CASCADE,
    community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    
    -- Aggregated search vector
    search_vector TSVECTOR NOT NULL,
    
    -- Track what was indexed
    indexed_fields JSONB,  -- {profile: true, skills: true, education: true, ...}
    
    -- Metadata
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE member_search_index IS 'Full-text search index combining all searchable member data';

-- Indexes
CREATE INDEX idx_search_community ON member_search_index(community_id);
CREATE INDEX idx_search_vector ON member_search_index USING GIN(search_vector);


-- ============================================
-- SECTION 5: ANALYTICS & CACHING
-- ============================================

-- Search query logging for analytics
CREATE TABLE search_queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    member_id UUID REFERENCES members(id) ON DELETE SET NULL,
    
    -- Query details
    query_text TEXT NOT NULL,
    query_type VARCHAR(50),  -- semantic, keyword, hybrid
    member_type_filter VARCHAR(20),  -- alumni, entrepreneur, resident, null = all
    
    -- Search strategy used
    search_strategy VARCHAR(50),  -- profile_only, skills_only, mixed_weighted
    embedding_type_used VARCHAR(50),  -- profile, skills, contextual, combined
    
    -- Results
    results_count INTEGER,
    response_time_ms INTEGER,
    success BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_agent TEXT,
    source VARCHAR(50)  -- whatsapp, dashboard, api
);

COMMENT ON TABLE search_queries IS 'Logs all search queries for analytics and optimization';

-- Indexes
CREATE INDEX idx_queries_community ON search_queries(community_id, created_at DESC);
CREATE INDEX idx_queries_member ON search_queries(member_id);
CREATE INDEX idx_queries_type ON search_queries(query_type);
CREATE INDEX idx_queries_created ON search_queries(created_at DESC);
CREATE INDEX idx_queries_success ON search_queries(success) WHERE success = false;


-- ============================================
-- Search result cache
CREATE TABLE search_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    
    -- Cache key
    query_hash VARCHAR(64) NOT NULL,
    query_text TEXT NOT NULL,
    member_type_filter VARCHAR(20),
    
    -- Cached result
    response JSONB NOT NULL,
    
    -- Cache statistics
    hit_count INTEGER DEFAULT 1,
    
    -- Expiration
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_accessed TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(community_id, query_hash, COALESCE(member_type_filter, ''))
);

COMMENT ON TABLE search_cache IS 'Caches search results to reduce embedding computation and database queries';

-- Indexes
CREATE INDEX idx_cache_community_hash ON search_cache(community_id, query_hash);
CREATE INDEX idx_cache_expires ON search_cache(expires_at);
CREATE INDEX idx_cache_hits ON search_cache(hit_count DESC);


-- ============================================
-- Query embedding cache (avoid regenerating embeddings for similar queries)
CREATE TABLE query_embedding_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Query identification
    query_text TEXT NOT NULL,
    query_hash VARCHAR(64) UNIQUE NOT NULL,
    
    -- Cached embedding
    query_embedding VECTOR(768) NOT NULL,
    embedding_model VARCHAR(100) DEFAULT 'BAAI/bge-base-en-v1.5',
    
    -- Usage statistics
    hit_count INTEGER DEFAULT 1,
    last_used TIMESTAMPTZ DEFAULT NOW(),
    
    -- Expiration
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE query_embedding_cache IS 'Caches query embeddings to avoid re-computing for similar/repeated queries';

-- Indexes
CREATE INDEX idx_query_cache_hash ON query_embedding_cache(query_hash);
CREATE INDEX idx_query_cache_expires ON query_embedding_cache(expires_at);


-- ============================================
-- SECTION 6: USER MANAGEMENT & ADMINISTRATION
-- ============================================

-- Dashboard users (separate from members for admin-only access)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Authentication
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    
    -- Profile
    name VARCHAR(255) NOT NULL,
    
    -- Optional link to member
    member_id UUID REFERENCES members(id) ON DELETE SET NULL,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    email_verified_at TIMESTAMPTZ,
    
    -- Session tracking
    last_login TIMESTAMPTZ,
    last_login_ip INET,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE users IS 'Dashboard users - may or may not be community members';

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_member ON users(member_id) WHERE member_id IS NOT NULL;
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = true;


-- ============================================
-- Community administrators
CREATE TABLE community_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    
    -- Role level
    role VARCHAR(20) DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
    
    -- Permissions (if fine-grained control needed)
    permissions JSONB DEFAULT '{
        "manage_members": true,
        "manage_settings": false,
        "view_analytics": true,
        "manage_admins": false
    }',
    
    -- Audit trail
    granted_by UUID REFERENCES members(id) ON DELETE SET NULL,
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    
    -- One admin entry per member per community
    UNIQUE(community_id, member_id)
);

COMMENT ON TABLE community_admins IS 'Community-level administrators with role-based permissions';

-- Indexes
CREATE INDEX idx_admins_community ON community_admins(community_id);
CREATE INDEX idx_admins_member ON community_admins(member_id);
CREATE INDEX idx_admins_role ON community_admins(role);
CREATE INDEX idx_admins_active ON community_admins(revoked_at) WHERE revoked_at IS NULL;


-- ============================================
-- SECTION 7: TRIGGERS
-- ============================================

-- Function to auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all relevant tables
CREATE TRIGGER trg_communities_updated BEFORE UPDATE ON communities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_members_updated BEFORE UPDATE ON members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_memberships_updated BEFORE UPDATE ON community_memberships
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_alumni_updated BEFORE UPDATE ON alumni_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_entrepreneur_updated BEFORE UPDATE ON entrepreneur_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_resident_updated BEFORE UPDATE ON resident_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_embeddings_updated BEFORE UPDATE ON member_embeddings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================
-- Function to update full-text search index
CREATE OR REPLACE FUNCTION update_member_search_index()
RETURNS TRIGGER AS $$
DECLARE
    v_community_id UUID;
    v_member_name TEXT;
    v_member_email TEXT;
    v_member_type VARCHAR(20);
    v_search_text TEXT := '';
BEGIN
    -- Get membership details
    SELECT cm.community_id, cm.member_type, m.name, m.email
    INTO v_community_id, v_member_type, v_member_name, v_member_email
    FROM community_memberships cm
    JOIN members m ON cm.member_id = m.id
    WHERE cm.id = COALESCE(NEW.membership_id, OLD.membership_id);
    
    IF NOT FOUND THEN
        RETURN NEW;
    END IF;
    
    -- Build search text based on member type
    v_search_text := COALESCE(v_member_name, '') || ' ' || COALESCE(v_member_email, '');
    
    -- Add type-specific data
    IF v_member_type = 'alumni' THEN
        SELECT COALESCE(
            college || ' ' || 
            degree || ' ' || 
            department || ' ' ||
            COALESCE(current_organization, '') || ' ' ||
            COALESCE(designation, '') || ' ' ||
            array_to_string(COALESCE(skills, ARRAY[]::TEXT[]), ' ') || ' ' ||
            array_to_string(COALESCE(domains, ARRAY[]::TEXT[]), ' '),
            ''
        )
        INTO v_search_text
        FROM alumni_profiles
        WHERE membership_id = COALESCE(NEW.membership_id, OLD.membership_id);
        
    ELSIF v_member_type = 'entrepreneur' THEN
        SELECT COALESCE(
            company || ' ' || 
            industry || ' ' ||
            array_to_string(COALESCE(services_offered, ARRAY[]::TEXT[]), ' ') || ' ' ||
            array_to_string(COALESCE(products, ARRAY[]::TEXT[]), ' ') || ' ' ||
            array_to_string(COALESCE(expertise, ARRAY[]::TEXT[]), ' '),
            ''
        )
        INTO v_search_text
        FROM entrepreneur_profiles
        WHERE membership_id = COALESCE(NEW.membership_id, OLD.membership_id);
        
    ELSIF v_member_type = 'resident' THEN
        SELECT COALESCE(
            apartment_number || ' ' ||
            COALESCE(profession, '') || ' ' ||
            array_to_string(COALESCE(skills, ARRAY[]::TEXT[]), ' ') || ' ' ||
            array_to_string(COALESCE(can_help_with, ARRAY[]::TEXT[]), ' '),
            ''
        )
        INTO v_search_text
        FROM resident_profiles
        WHERE membership_id = COALESCE(NEW.membership_id, OLD.membership_id);
    END IF;
    
    -- Update search index
    INSERT INTO member_search_index (membership_id, community_id, search_vector, updated_at)
    VALUES (
        COALESCE(NEW.membership_id, OLD.membership_id),
        v_community_id,
        to_tsvector('english', v_search_text),
        NOW()
    )
    ON CONFLICT (membership_id) DO UPDATE 
    SET search_vector = to_tsvector('english', v_search_text),
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for search index updates
CREATE TRIGGER trg_alumni_search 
    AFTER INSERT OR UPDATE ON alumni_profiles
    FOR EACH ROW EXECUTE FUNCTION update_member_search_index();

CREATE TRIGGER trg_entrepreneur_search 
    AFTER INSERT OR UPDATE ON entrepreneur_profiles
    FOR EACH ROW EXECUTE FUNCTION update_member_search_index();

CREATE TRIGGER trg_resident_search 
    AFTER INSERT OR UPDATE ON resident_profiles
    FOR EACH ROW EXECUTE FUNCTION update_member_search_index();


-- ============================================
-- SECTION 8: ROW-LEVEL SECURITY (Optional)
-- ============================================

-- Enable RLS on sensitive tables
ALTER TABLE community_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_search_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_cache ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access data from their current community
-- Application must set: SET LOCAL app.current_community_id = '<uuid>';
CREATE POLICY community_isolation ON community_memberships
    FOR ALL
    USING (
        community_id = NULLIF(current_setting('app.current_community_id', true), '')::uuid
        OR current_setting('app.current_community_id', true) = ''
    );

CREATE POLICY embedding_isolation ON member_embeddings
    FOR ALL
    USING (
        membership_id IN (
            SELECT id FROM community_memberships 
            WHERE community_id = NULLIF(current_setting('app.current_community_id', true), '')::uuid
        )
        OR current_setting('app.current_community_id', true) = ''
    );

CREATE POLICY search_index_isolation ON member_search_index
    FOR ALL
    USING (
        community_id = NULLIF(current_setting('app.current_community_id', true), '')::uuid
        OR current_setting('app.current_community_id', true) = ''
    );

CREATE POLICY cache_isolation ON search_cache
    FOR ALL
    USING (
        community_id = NULLIF(current_setting('app.current_community_id', true), '')::uuid
        OR current_setting('app.current_community_id', true) = ''
    );


-- ============================================
-- SECTION 9: VIEWS FOR COMMON QUERIES
-- ============================================

-- Complete member profile view (joins all related data)
CREATE VIEW v_member_profiles AS
SELECT 
    cm.id as membership_id,
    cm.community_id,
    cm.member_id,
    cm.member_type,
    cm.role,
    cm.is_active as membership_active,
    
    -- Member basic info
    m.name,
    m.phone,
    m.email,
    m.is_active as member_active,
    
    -- Type-specific data (JSON aggregation)
    CASE 
        WHEN cm.member_type = 'alumni' THEN
            jsonb_build_object(
                'college', ap.college,
                'graduation_year', ap.graduation_year,
                'degree', ap.degree,
                'department', ap.department,
                'current_organization', ap.current_organization,
                'designation', ap.designation,
                'city', ap.city,
                'skills', ap.skills,
                'domains', ap.domains
            )
        WHEN cm.member_type = 'entrepreneur' THEN
            jsonb_build_object(
                'company', ep.company,
                'industry', ep.industry,
                'company_stage', ep.company_stage,
                'services_offered', ep.services_offered,
                'expertise', ep.expertise,
                'city', ep.city
            )
        WHEN cm.member_type = 'resident' THEN
            jsonb_build_object(
                'apartment_number', rp.apartment_number,
                'building', rp.building,
                'profession', rp.profession,
                'skills', rp.skills,
                'can_help_with', rp.can_help_with
            )
        ELSE NULL
    END as profile_data,
    
    cm.joined_at,
    cm.updated_at
    
FROM community_memberships cm
JOIN members m ON cm.member_id = m.id
LEFT JOIN alumni_profiles ap ON cm.id = ap.membership_id AND cm.member_type = 'alumni'
LEFT JOIN entrepreneur_profiles ep ON cm.id = ep.membership_id AND cm.member_type = 'entrepreneur'
LEFT JOIN resident_profiles rp ON cm.id = rp.membership_id AND cm.member_type = 'resident';

COMMENT ON VIEW v_member_profiles IS 'Complete member profile with type-specific data aggregated';


-- ============================================
-- Embedding quality metrics view
CREATE VIEW v_embedding_quality_metrics AS
SELECT 
    cm.community_id,
    c.name as community_name,
    cm.member_type,
    COUNT(*) as total_embeddings,
    
    -- Text length statistics
    AVG(emb.profile_text_length) as avg_profile_length,
    AVG(emb.skills_text_length) as avg_skills_length,
    AVG(emb.contextual_text_length) as avg_contextual_length,
    
    -- Quality indicators
    COUNT(*) FILTER (WHERE emb.profile_text_length < 50) as sparse_profiles,
    COUNT(*) FILTER (WHERE emb.skills_text_length < 20) as sparse_skills,
    COUNT(*) FILTER (WHERE emb.contextual_text_length < 20) as sparse_contextual,
    
    -- Freshness
    COUNT(*) FILTER (WHERE emb.updated_at < NOW() - INTERVAL '90 days') as stale_embeddings,
    COUNT(*) FILTER (WHERE emb.updated_at >= NOW() - INTERVAL '7 days') as recent_embeddings,
    
    -- Model versions
    jsonb_object_agg(
        emb.embedding_model, 
        COUNT(*)
    ) as model_distribution
    
FROM member_embeddings emb
JOIN community_memberships cm ON emb.membership_id = cm.id
JOIN communities c ON cm.community_id = c.id
GROUP BY cm.community_id, c.name, cm.member_type;

COMMENT ON VIEW v_embedding_quality_metrics IS 'Monitoring view for embedding quality and freshness';


-- ============================================
-- SECTION 10: SAMPLE DATA & TESTING
-- ============================================

-- Insert sample community (for testing)
INSERT INTO communities (name, slug, type, description) VALUES
('IIT Delhi Alumni Network', 'iit-delhi-alumni', 'alumni', 'Official alumni network for IIT Delhi graduates'),
('TechStartup Entrepreneurs Hub', 'techstartup-hub', 'entrepreneur', 'Community for tech entrepreneurs and founders'),
('Green Valley Apartments', 'green-valley-apts', 'apartment', 'Residential community for Green Valley apartment complex')
ON CONFLICT (slug) DO NOTHING;


-- ============================================
-- SECTION 11: GRANTS (Adjust based on your setup)
-- ============================================

-- Grant appropriate permissions to application user
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO community_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO community_app_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO community_app_user;


-- ============================================
-- END OF SCHEMA
-- ============================================

-- Verify installation
DO $$
BEGIN
    RAISE NOTICE 'Community Connect Schema v2.0 installed successfully!';
    RAISE NOTICE 'Total tables created: %', (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public');
    RAISE NOTICE 'Total indexes created: %', (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public');
    RAISE NOTICE 'Total functions created: %', (SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public');
    RAISE NOTICE 'pgvector extension enabled: %', (SELECT COUNT(*) > 0 FROM pg_extension WHERE extname = 'vector');
END $$;
