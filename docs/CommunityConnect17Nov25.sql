--
-- PostgreSQL database dump
--

\restrict L1BVWRayRqCkxLX5Xpd2nmcxlKh12fZX7fndcVRmOjsrh8QqaEKLmXojV0f9SUz

-- Dumped from database version 16.10 (Homebrew)
-- Dumped by pg_dump version 18.0

-- Started on 2025-11-17 22:19:40 IST

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 221 (class 1259 OID 24670)
-- Name: alumni_profiles; Type: TABLE; Schema: public; Owner: community_user
--

CREATE TABLE public.alumni_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    membership_id uuid NOT NULL,
    college character varying(255) NOT NULL,
    graduation_year integer NOT NULL,
    degree character varying(100) NOT NULL,
    department character varying(100) NOT NULL,
    specialization character varying(100),
    current_organization character varying(255),
    designation character varying(255),
    years_of_experience integer,
    city character varying(100),
    state character varying(100),
    country character varying(100) DEFAULT 'India'::character varying,
    skills text[],
    domains text[],
    interests text[],
    looking_for text,
    willing_to_help_with text[],
    linkedin_url text,
    github_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT alumni_profiles_github_url_check CHECK (((github_url IS NULL) OR (github_url ~* '^https?://'::text))),
    CONSTRAINT alumni_profiles_graduation_year_check CHECK (((graduation_year >= 1950) AND ((graduation_year)::numeric <= (EXTRACT(year FROM CURRENT_DATE) + (10)::numeric)))),
    CONSTRAINT alumni_profiles_linkedin_url_check CHECK (((linkedin_url IS NULL) OR (linkedin_url ~* '^https?://'::text))),
    CONSTRAINT alumni_profiles_years_of_experience_check CHECK ((years_of_experience >= 0))
);


ALTER TABLE public.alumni_profiles OWNER TO community_user;

--
-- TOC entry 4319 (class 0 OID 0)
-- Dependencies: 221
-- Name: TABLE alumni_profiles; Type: COMMENT; Schema: public; Owner: community_user
--

COMMENT ON TABLE public.alumni_profiles IS 'Type-specific data for alumni community members';


--
-- TOC entry 4320 (class 0 OID 0)
-- Dependencies: 221
-- Name: COLUMN alumni_profiles.skills; Type: COMMENT; Schema: public; Owner: community_user
--

COMMENT ON COLUMN public.alumni_profiles.skills IS 'Technical and professional skills (e.g., Python, Leadership)';


--
-- TOC entry 4321 (class 0 OID 0)
-- Dependencies: 221
-- Name: COLUMN alumni_profiles.domains; Type: COMMENT; Schema: public; Owner: community_user
--

COMMENT ON COLUMN public.alumni_profiles.domains IS 'Industry domains (e.g., Healthcare, Fintech)';


--
-- TOC entry 218 (class 1259 OID 24589)
-- Name: communities; Type: TABLE; Schema: public; Owner: community_user
--

CREATE TABLE public.communities (
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


ALTER TABLE public.communities OWNER TO community_user;

--
-- TOC entry 4322 (class 0 OID 0)
-- Dependencies: 218
-- Name: TABLE communities; Type: COMMENT; Schema: public; Owner: community_user
--

COMMENT ON TABLE public.communities IS 'Represents different communities (apartment, alumni, entrepreneur groups)';


--
-- TOC entry 4323 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN communities.slug; Type: COMMENT; Schema: public; Owner: community_user
--

COMMENT ON COLUMN public.communities.slug IS 'URL-friendly identifier for the community';


--
-- TOC entry 4324 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN communities.type; Type: COMMENT; Schema: public; Owner: community_user
--

COMMENT ON COLUMN public.communities.type IS 'Type of community: alumni, entrepreneur, apartment, or mixed';


--
-- TOC entry 230 (class 1259 OID 24893)
-- Name: community_admins; Type: TABLE; Schema: public; Owner: community_user
--

CREATE TABLE public.community_admins (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    community_id uuid NOT NULL,
    member_id uuid NOT NULL,
    role character varying(20) DEFAULT 'admin'::character varying,
    permissions jsonb DEFAULT '{"manage_admins": false, "manage_members": true, "view_analytics": true, "manage_settings": false}'::jsonb,
    granted_by uuid,
    granted_at timestamp with time zone DEFAULT now(),
    revoked_at timestamp with time zone,
    CONSTRAINT community_admins_role_check CHECK (((role)::text = ANY ((ARRAY['admin'::character varying, 'super_admin'::character varying])::text[])))
);


ALTER TABLE public.community_admins OWNER TO community_user;

--
-- TOC entry 4325 (class 0 OID 0)
-- Dependencies: 230
-- Name: TABLE community_admins; Type: COMMENT; Schema: public; Owner: community_user
--

COMMENT ON TABLE public.community_admins IS 'Community-level administrators with role-based permissions';


--
-- TOC entry 220 (class 1259 OID 24635)
-- Name: community_memberships; Type: TABLE; Schema: public; Owner: community_user
--

CREATE TABLE public.community_memberships (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    community_id uuid NOT NULL,
    member_id uuid NOT NULL,
    member_type character varying(20) NOT NULL,
    role character varying(20) DEFAULT 'member'::character varying,
    is_active boolean DEFAULT true,
    joined_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    invited_by uuid,
    invitation_accepted_at timestamp with time zone,
    CONSTRAINT community_memberships_member_type_check CHECK (((member_type)::text = ANY ((ARRAY['alumni'::character varying, 'entrepreneur'::character varying, 'resident'::character varying, 'generic'::character varying])::text[]))),
    CONSTRAINT community_memberships_role_check CHECK (((role)::text = ANY ((ARRAY['member'::character varying, 'admin'::character varying, 'super_admin'::character varying])::text[])))
);


ALTER TABLE public.community_memberships OWNER TO community_user;

--
-- TOC entry 4326 (class 0 OID 0)
-- Dependencies: 220
-- Name: TABLE community_memberships; Type: COMMENT; Schema: public; Owner: community_user
--

COMMENT ON TABLE public.community_memberships IS 'Links members to communities with role and type information';


--
-- TOC entry 4327 (class 0 OID 0)
-- Dependencies: 220
-- Name: COLUMN community_memberships.member_type; Type: COMMENT; Schema: public; Owner: community_user
--

COMMENT ON COLUMN public.community_memberships.member_type IS 'How this person participates: alumni, entrepreneur, resident, or generic';


--
-- TOC entry 4328 (class 0 OID 0)
-- Dependencies: 220
-- Name: COLUMN community_memberships.role; Type: COMMENT; Schema: public; Owner: community_user
--

COMMENT ON COLUMN public.community_memberships.role IS 'Access level: member (search only), admin (manage members), super_admin (full access)';


--
-- TOC entry 225 (class 1259 OID 24782)
-- Name: embedding_generation_jobs; Type: TABLE; Schema: public; Owner: community_user
--

CREATE TABLE public.embedding_generation_jobs (
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


ALTER TABLE public.embedding_generation_jobs OWNER TO community_user;

--
-- TOC entry 4329 (class 0 OID 0)
-- Dependencies: 225
-- Name: TABLE embedding_generation_jobs; Type: COMMENT; Schema: public; Owner: community_user
--

COMMENT ON TABLE public.embedding_generation_jobs IS 'Tracks bulk embedding generation/regeneration jobs';


--
-- TOC entry 222 (class 1259 OID 24700)
-- Name: entrepreneur_profiles; Type: TABLE; Schema: public; Owner: community_user
--

CREATE TABLE public.entrepreneur_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    membership_id uuid NOT NULL,
    company character varying(255) NOT NULL,
    industry character varying(100) NOT NULL,
    company_stage character varying(50),
    founded_year integer,
    employee_count_range character varying(20),
    annual_revenue_range character varying(50),
    services_offered text[],
    products text[],
    expertise text[],
    looking_for text[],
    can_offer text[],
    target_customers text[],
    city character varying(100),
    state character varying(100),
    country character varying(100) DEFAULT 'India'::character varying,
    markets_served text[],
    certifications text[],
    awards text[],
    website_url text,
    linkedin_company_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT entrepreneur_profiles_annual_revenue_range_check CHECK (((annual_revenue_range)::text = ANY ((ARRAY['Pre-revenue'::character varying, '0-10L'::character varying, '10L-50L'::character varying, '50L-1Cr'::character varying, '1-5Cr'::character varying, '5-10Cr'::character varying, '10-50Cr'::character varying, '50Cr+'::character varying])::text[]))),
    CONSTRAINT entrepreneur_profiles_company_stage_check CHECK (((company_stage)::text = ANY ((ARRAY['Idea'::character varying, 'MVP'::character varying, 'Pre-revenue'::character varying, 'Revenue'::character varying, 'Profitable'::character varying, 'Bootstrapped'::character varying, 'Seed'::character varying, 'Series A'::character varying, 'Series B+'::character varying, 'Acquired'::character varying, 'Public'::character varying])::text[]))),
    CONSTRAINT entrepreneur_profiles_employee_count_range_check CHECK (((employee_count_range)::text = ANY ((ARRAY['1'::character varying, '2-10'::character varying, '11-50'::character varying, '51-200'::character varying, '201-500'::character varying, '500+'::character varying])::text[]))),
    CONSTRAINT entrepreneur_profiles_founded_year_check CHECK (((founded_year >= 1900) AND ((founded_year)::numeric <= EXTRACT(year FROM CURRENT_DATE)))),
    CONSTRAINT entrepreneur_profiles_linkedin_company_url_check CHECK (((linkedin_company_url IS NULL) OR (linkedin_company_url ~* '^https?://'::text))),
    CONSTRAINT entrepreneur_profiles_website_url_check CHECK (((website_url IS NULL) OR (website_url ~* '^https?://'::text)))
);


ALTER TABLE public.entrepreneur_profiles OWNER TO community_user;

--
-- TOC entry 4330 (class 0 OID 0)
-- Dependencies: 222
-- Name: TABLE entrepreneur_profiles; Type: COMMENT; Schema: public; Owner: community_user
--

COMMENT ON TABLE public.entrepreneur_profiles IS 'Type-specific data for entrepreneur community members';


--
-- TOC entry 4331 (class 0 OID 0)
-- Dependencies: 222
-- Name: COLUMN entrepreneur_profiles.looking_for; Type: COMMENT; Schema: public; Owner: community_user
--

COMMENT ON COLUMN public.entrepreneur_profiles.looking_for IS 'What they are seeking: Investors, Co-founders, Clients, etc.';


--
-- TOC entry 4332 (class 0 OID 0)
-- Dependencies: 222
-- Name: COLUMN entrepreneur_profiles.can_offer; Type: COMMENT; Schema: public; Owner: community_user
--

COMMENT ON COLUMN public.entrepreneur_profiles.can_offer IS 'What they can provide to others: Mentorship, Services, etc.';


--
-- TOC entry 224 (class 1259 OID 24758)
-- Name: member_embeddings; Type: TABLE; Schema: public; Owner: community_user
--

CREATE TABLE public.member_embeddings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    membership_id uuid NOT NULL,
    profile_embedding public.vector(768) NOT NULL,
    skills_embedding public.vector(768) NOT NULL,
    contextual_embedding public.vector(768) NOT NULL,
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


ALTER TABLE public.member_embeddings OWNER TO community_user;

--
-- TOC entry 4333 (class 0 OID 0)
-- Dependencies: 224
-- Name: TABLE member_embeddings; Type: COMMENT; Schema: public; Owner: community_user
--

COMMENT ON TABLE public.member_embeddings IS 'Vector embeddings for semantic search - three types per member';


--
-- TOC entry 4334 (class 0 OID 0)
-- Dependencies: 224
-- Name: COLUMN member_embeddings.profile_embedding; Type: COMMENT; Schema: public; Owner: community_user
--

COMMENT ON COLUMN public.member_embeddings.profile_embedding IS 'Embedding of full profile for general queries';


--
-- TOC entry 4335 (class 0 OID 0)
-- Dependencies: 224
-- Name: COLUMN member_embeddings.skills_embedding; Type: COMMENT; Schema: public; Owner: community_user
--

COMMENT ON COLUMN public.member_embeddings.skills_embedding IS 'Embedding of skills/expertise for "who knows X" queries';


--
-- TOC entry 4336 (class 0 OID 0)
-- Dependencies: 224
-- Name: COLUMN member_embeddings.contextual_embedding; Type: COMMENT; Schema: public; Owner: community_user
--

COMMENT ON COLUMN public.member_embeddings.contextual_embedding IS 'Embedding of interests/needs for networking queries';


--
-- TOC entry 226 (class 1259 OID 24811)
-- Name: member_search_index; Type: TABLE; Schema: public; Owner: community_user
--

CREATE TABLE public.member_search_index (
    membership_id uuid NOT NULL,
    community_id uuid NOT NULL,
    search_vector tsvector NOT NULL,
    indexed_fields jsonb,
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.member_search_index OWNER TO community_user;

--
-- TOC entry 4337 (class 0 OID 0)
-- Dependencies: 226
-- Name: TABLE member_search_index; Type: COMMENT; Schema: public; Owner: community_user
--

COMMENT ON TABLE public.member_search_index IS 'Full-text search index combining all searchable member data';


--
-- TOC entry 219 (class 1259 OID 24618)
-- Name: members; Type: TABLE; Schema: public; Owner: community_user
--

CREATE TABLE public.members (
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


ALTER TABLE public.members OWNER TO community_user;

--
-- TOC entry 4338 (class 0 OID 0)
-- Dependencies: 219
-- Name: TABLE members; Type: COMMENT; Schema: public; Owner: community_user
--

COMMENT ON TABLE public.members IS 'Base member identity - a person can belong to multiple communities';


--
-- TOC entry 4339 (class 0 OID 0)
-- Dependencies: 219
-- Name: COLUMN members.phone; Type: COMMENT; Schema: public; Owner: community_user
--

COMMENT ON COLUMN public.members.phone IS 'Primary authentication mechanism, must be unique globally';


--
-- TOC entry 228 (class 1259 OID 24855)
-- Name: query_embedding_cache; Type: TABLE; Schema: public; Owner: community_user
--

CREATE TABLE public.query_embedding_cache (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    query_text text NOT NULL,
    query_hash character varying(64) NOT NULL,
    query_embedding public.vector(768) NOT NULL,
    embedding_model character varying(100) DEFAULT 'BAAI/bge-base-en-v1.5'::character varying,
    hit_count integer DEFAULT 1,
    last_used timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.query_embedding_cache OWNER TO community_user;

--
-- TOC entry 4340 (class 0 OID 0)
-- Dependencies: 228
-- Name: TABLE query_embedding_cache; Type: COMMENT; Schema: public; Owner: community_user
--

COMMENT ON TABLE public.query_embedding_cache IS 'Caches query embeddings to avoid re-computing for similar/repeated queries';


--
-- TOC entry 223 (class 1259 OID 24733)
-- Name: resident_profiles; Type: TABLE; Schema: public; Owner: community_user
--

CREATE TABLE public.resident_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    membership_id uuid NOT NULL,
    apartment_number character varying(50) NOT NULL,
    building character varying(50),
    floor integer,
    apartment_type character varying(50),
    ownership_type character varying(20),
    move_in_date date,
    profession character varying(255),
    organization character varying(255),
    skills text[],
    community_roles text[],
    can_help_with text[],
    services_offered text[],
    interested_in text[],
    family_composition jsonb,
    vehicles jsonb,
    emergency_contact_name character varying(255),
    emergency_contact_phone character varying(20),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT resident_profiles_ownership_type_check CHECK (((ownership_type)::text = ANY ((ARRAY['Owner'::character varying, 'Tenant'::character varying, 'Guest'::character varying])::text[])))
);


ALTER TABLE public.resident_profiles OWNER TO community_user;

--
-- TOC entry 4341 (class 0 OID 0)
-- Dependencies: 223
-- Name: TABLE resident_profiles; Type: COMMENT; Schema: public; Owner: community_user
--

COMMENT ON TABLE public.resident_profiles IS 'Type-specific data for apartment/residential community members';


--
-- TOC entry 4342 (class 0 OID 0)
-- Dependencies: 223
-- Name: COLUMN resident_profiles.can_help_with; Type: COMMENT; Schema: public; Owner: community_user
--

COMMENT ON COLUMN public.resident_profiles.can_help_with IS 'Skills/services member can offer to community';


--
-- TOC entry 217 (class 1259 OID 16764)
-- Name: search_cache; Type: TABLE; Schema: public; Owner: community_user
--

CREATE TABLE public.search_cache (
    query_hash character varying(64) NOT NULL,
    query_text text NOT NULL,
    response jsonb NOT NULL,
    hit_count integer DEFAULT 1,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    last_accessed timestamp without time zone DEFAULT now()
);


ALTER TABLE public.search_cache OWNER TO community_user;

--
-- TOC entry 4343 (class 0 OID 0)
-- Dependencies: 217
-- Name: TABLE search_cache; Type: COMMENT; Schema: public; Owner: community_user
--

COMMENT ON TABLE public.search_cache IS 'Caches search results to reduce embedding computation and database queries';


--
-- TOC entry 227 (class 1259 OID 24831)
-- Name: search_queries; Type: TABLE; Schema: public; Owner: community_user
--

CREATE TABLE public.search_queries (
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


ALTER TABLE public.search_queries OWNER TO community_user;

--
-- TOC entry 4344 (class 0 OID 0)
-- Dependencies: 227
-- Name: TABLE search_queries; Type: COMMENT; Schema: public; Owner: community_user
--

COMMENT ON TABLE public.search_queries IS 'Logs all search queries for analytics and optimization';


--
-- TOC entry 229 (class 1259 OID 24871)
-- Name: users; Type: TABLE; Schema: public; Owner: community_user
--

CREATE TABLE public.users (
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


ALTER TABLE public.users OWNER TO community_user;

--
-- TOC entry 4345 (class 0 OID 0)
-- Dependencies: 229
-- Name: TABLE users; Type: COMMENT; Schema: public; Owner: community_user
--

COMMENT ON TABLE public.users IS 'Dashboard users - may or may not be community members';


--
-- TOC entry 4056 (class 2606 OID 24686)
-- Name: alumni_profiles alumni_profiles_membership_id_key; Type: CONSTRAINT; Schema: public; Owner: community_user
--

ALTER TABLE ONLY public.alumni_profiles
    ADD CONSTRAINT alumni_profiles_membership_id_key UNIQUE (membership_id);


--
-- TOC entry 4058 (class 2606 OID 24684)
-- Name: alumni_profiles alumni_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: community_user
--

ALTER TABLE ONLY public.alumni_profiles
    ADD CONSTRAINT alumni_profiles_pkey PRIMARY KEY (id);


--
-- TOC entry 4033 (class 2606 OID 24611)
-- Name: communities communities_pkey; Type: CONSTRAINT; Schema: public; Owner: community_user
--

ALTER TABLE ONLY public.communities
    ADD CONSTRAINT communities_pkey PRIMARY KEY (id);


--
-- TOC entry 4035 (class 2606 OID 24613)
-- Name: communities communities_slug_key; Type: CONSTRAINT; Schema: public; Owner: community_user
--

ALTER TABLE ONLY public.communities
    ADD CONSTRAINT communities_slug_key UNIQUE (slug);


--
-- TOC entry 4128 (class 2606 OID 24906)
-- Name: community_admins community_admins_community_id_member_id_key; Type: CONSTRAINT; Schema: public; Owner: community_user
--

ALTER TABLE ONLY public.community_admins
    ADD CONSTRAINT community_admins_community_id_member_id_key UNIQUE (community_id, member_id);


--
-- TOC entry 4130 (class 2606 OID 24904)
-- Name: community_admins community_admins_pkey; Type: CONSTRAINT; Schema: public; Owner: community_user
--

ALTER TABLE ONLY public.community_admins
    ADD CONSTRAINT community_admins_pkey PRIMARY KEY (id);


--
-- TOC entry 4046 (class 2606 OID 24648)
-- Name: community_memberships community_memberships_community_id_member_id_key; Type: CONSTRAINT; Schema: public; Owner: community_user
--

ALTER TABLE ONLY public.community_memberships
    ADD CONSTRAINT community_memberships_community_id_member_id_key UNIQUE (community_id, member_id);


--
-- TOC entry 4048 (class 2606 OID 24646)
-- Name: community_memberships community_memberships_pkey; Type: CONSTRAINT; Schema: public; Owner: community_user
--

ALTER TABLE ONLY public.community_memberships
    ADD CONSTRAINT community_memberships_pkey PRIMARY KEY (id);


--
-- TOC entry 4101 (class 2606 OID 24797)
-- Name: embedding_generation_jobs embedding_generation_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: community_user
--

ALTER TABLE ONLY public.embedding_generation_jobs
    ADD CONSTRAINT embedding_generation_jobs_pkey PRIMARY KEY (id);


--
-- TOC entry 4068 (class 2606 OID 24718)
-- Name: entrepreneur_profiles entrepreneur_profiles_membership_id_key; Type: CONSTRAINT; Schema: public; Owner: community_user
--

ALTER TABLE ONLY public.entrepreneur_profiles
    ADD CONSTRAINT entrepreneur_profiles_membership_id_key UNIQUE (membership_id);


--
-- TOC entry 4070 (class 2606 OID 24716)
-- Name: entrepreneur_profiles entrepreneur_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: community_user
--

ALTER TABLE ONLY public.entrepreneur_profiles
    ADD CONSTRAINT entrepreneur_profiles_pkey PRIMARY KEY (id);


--
-- TOC entry 4097 (class 2606 OID 24771)
-- Name: member_embeddings member_embeddings_membership_id_key; Type: CONSTRAINT; Schema: public; Owner: community_user
--

ALTER TABLE ONLY public.member_embeddings
    ADD CONSTRAINT member_embeddings_membership_id_key UNIQUE (membership_id);


--
-- TOC entry 4099 (class 2606 OID 24769)
-- Name: member_embeddings member_embeddings_pkey1; Type: CONSTRAINT; Schema: public; Owner: community_user
--

ALTER TABLE ONLY public.member_embeddings
    ADD CONSTRAINT member_embeddings_pkey1 PRIMARY KEY (id);


--
-- TOC entry 4108 (class 2606 OID 24818)
-- Name: member_search_index member_search_index_pkey; Type: CONSTRAINT; Schema: public; Owner: community_user
--

ALTER TABLE ONLY public.member_search_index
    ADD CONSTRAINT member_search_index_pkey PRIMARY KEY (membership_id);


--
-- TOC entry 4042 (class 2606 OID 24633)
-- Name: members members_phone_key; Type: CONSTRAINT; Schema: public; Owner: community_user
--

ALTER TABLE ONLY public.members
    ADD CONSTRAINT members_phone_key UNIQUE (phone);


--
-- TOC entry 4044 (class 2606 OID 24631)
-- Name: members members_pkey; Type: CONSTRAINT; Schema: public; Owner: community_user
--

ALTER TABLE ONLY public.members
    ADD CONSTRAINT members_pkey PRIMARY KEY (id);


--
-- TOC entry 4117 (class 2606 OID 24866)
-- Name: query_embedding_cache query_embedding_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: community_user
--

ALTER TABLE ONLY public.query_embedding_cache
    ADD CONSTRAINT query_embedding_cache_pkey PRIMARY KEY (id);


--
-- TOC entry 4119 (class 2606 OID 24868)
-- Name: query_embedding_cache query_embedding_cache_query_hash_key; Type: CONSTRAINT; Schema: public; Owner: community_user
--

ALTER TABLE ONLY public.query_embedding_cache
    ADD CONSTRAINT query_embedding_cache_query_hash_key UNIQUE (query_hash);


--
-- TOC entry 4088 (class 2606 OID 24745)
-- Name: resident_profiles resident_profiles_membership_id_key; Type: CONSTRAINT; Schema: public; Owner: community_user
--

ALTER TABLE ONLY public.resident_profiles
    ADD CONSTRAINT resident_profiles_membership_id_key UNIQUE (membership_id);


--
-- TOC entry 4090 (class 2606 OID 24743)
-- Name: resident_profiles resident_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: community_user
--

ALTER TABLE ONLY public.resident_profiles
    ADD CONSTRAINT resident_profiles_pkey PRIMARY KEY (id);


--
-- TOC entry 4031 (class 2606 OID 16773)
-- Name: search_cache search_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: community_user
--

ALTER TABLE ONLY public.search_cache
    ADD CONSTRAINT search_cache_pkey PRIMARY KEY (query_hash);


--
-- TOC entry 4113 (class 2606 OID 24840)
-- Name: search_queries search_queries_pkey1; Type: CONSTRAINT; Schema: public; Owner: community_user
--

ALTER TABLE ONLY public.search_queries
    ADD CONSTRAINT search_queries_pkey1 PRIMARY KEY (id);


--
-- TOC entry 4124 (class 2606 OID 24884)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: community_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 4126 (class 2606 OID 24882)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: community_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 4131 (class 1259 OID 24925)
-- Name: idx_admins_active; Type: INDEX; Schema: public; Owner: community_user
--

CREATE INDEX idx_admins_active ON public.community_admins USING btree (revoked_at) WHERE (revoked_at IS NULL);


--
-- TOC entry 4132 (class 1259 OID 24922)
-- Name: idx_admins_community; Type: INDEX; Schema: public; Owner: community_user
--

CREATE INDEX idx_admins_community ON public.community_admins USING btree (community_id);


--
-- TOC entry 4133 (class 1259 OID 24923)
-- Name: idx_admins_member; Type: INDEX; Schema: public; Owner: community_user
--

CREATE INDEX idx_admins_member ON public.community_admins USING btree (member_id);


--
-- TOC entry 4134 (class 1259 OID 24924)
-- Name: idx_admins_role; Type: INDEX; Schema: public; Owner: community_user
--

CREATE INDEX idx_admins_role ON public.community_admins USING btree (role);


--
-- TOC entry 4059 (class 1259 OID 24697)
-- Name: idx_alumni_city; Type: INDEX; Schema: public; Owner: community_user
--

CREATE INDEX idx_alumni_city ON public.alumni_profiles USING btree (city);


--
-- TOC entry 4060 (class 1259 OID 24693)
-- Name: idx_alumni_college; Type: INDEX; Schema: public; Owner: community_user
--

CREATE INDEX idx_alumni_college ON public.alumni_profiles USING btree (college);


--
-- TOC entry 4061 (class 1259 OID 24695)
-- Name: idx_alumni_degree; Type: INDEX; Schema: public; Owner: community_user
--

CREATE INDEX idx_alumni_degree ON public.alumni_profiles USING btree (degree);


--
-- TOC entry 4062 (class 1259 OID 24696)
-- Name: idx_alumni_department; Type: INDEX; Schema: public; Owner: community_user
--

CREATE INDEX idx_alumni_department ON public.alumni_profiles USING btree (department);


--
-- TOC entry 4063 (class 1259 OID 24699)
-- Name: idx_alumni_domains; Type: INDEX; Schema: public; Owner: community_user
--

CREATE INDEX idx_alumni_domains ON public.alumni_profiles USING gin (domains);


--
-- TOC entry 4064 (class 1259 OID 24692)
-- Name: idx_alumni_membership; Type: INDEX; Schema: public; Owner: community_user
--

CREATE INDEX idx_alumni_membership ON public.alumni_profiles USING btree (membership_id);


--
-- TOC entry 4065 (class 1259 OID 24698)
-- Name: idx_alumni_skills; Type: INDEX; Schema: public; Owner: community_user
--

CREATE INDEX idx_alumni_skills ON public.alumni_profiles USING gin (skills);


--
-- TOC entry 4066 (class 1259 OID 24694)
-- Name: idx_alumni_year; Type: INDEX; Schema: public; Owner: community_user
--

CREATE INDEX idx_alumni_year ON public.alumni_profiles USING btree (graduation_year);


--
-- TOC entry 4028 (class 1259 OID 16774)
-- Name: idx_cache_expires; Type: INDEX; Schema: public; Owner: community_user
--

CREATE INDEX idx_cache_expires ON public.search_cache USING btree (expires_at);


--
-- TOC entry 4029 (class 1259 OID 24854)
-- Name: idx_cache_hits; Type: INDEX; Schema: public; Owner: community_user
--

CREATE INDEX idx_cache_hits ON public.search_cache USING btree (hit_count DESC);


--
-- TOC entry 4049 (class 1259 OID 24664)
-- Name: idx_cm_community; Type: INDEX; Schema: public; Owner: community_user
--

CREATE INDEX idx_cm_community ON public.community_memberships USING btree (community_id);


--
-- TOC entry 4050 (class 1259 OID 24669)
-- Name: idx_cm_community_active; Type: INDEX; Schema: public; Owner: community_user
--

CREATE INDEX idx_cm_community_active ON public.community_memberships USING btree (community_id, is_active) WHERE (is_active = true);


--
-- TOC entry 4051 (class 1259 OID 24668)
-- Name: idx_cm_community_type; Type: INDEX; Schema: public; Owner: community_user
--

CREATE INDEX idx_cm_community_type ON public.community_memberships USING btree (community_id, member_type);


--
-- TOC entry 4052 (class 1259 OID 24665)
-- Name: idx_cm_member; Type: INDEX; Schema: public; Owner: community_user
--

CREATE INDEX idx_cm_member ON public.community_memberships USING btree (member_id);


--
-- TOC entry 4053 (class 1259 OID 24667)
-- Name: idx_cm_role; Type: INDEX; Schema: public; Owner: community_user
--

CREATE INDEX idx_cm_role ON public.community_memberships USING btree (role);


--
-- TOC entry 4054 (class 1259 OID 24666)
-- Name: idx_cm_type; Type: INDEX; Schema: public; Owner: community_user
--

CREATE INDEX idx_cm_type ON public.community_memberships USING btree (member_type);


--
-- TOC entry 4036 (class 1259 OID 24616)
-- Name: idx_communities_active; Type: INDEX; Schema: public; Owner: community_user
--

CREATE INDEX idx_communities_active ON public.communities USING btree (is_active) WHERE (is_active = true);


--
-- TOC entry 4037 (class 1259 OID 24617)
-- Name: idx_communities_search; Type: INDEX; Schema: public; Owner: community_user
--

CREATE INDEX idx_communities_search ON public.communities USING gin (search_vector);


--
-- TOC entry 4038 (class 1259 OID 24614)
-- Name: idx_communities_slug; Type: INDEX; Schema: public; Owner: community_user
--

CREATE INDEX idx_communities_slug ON public.communities USING btree (slug);


--
-- TOC entry 4039 (class 1259 OID 24615)
-- Name: idx_communities_type; Type: INDEX; Schema: public; Owner: community_user
--

CREATE INDEX idx_communities_type ON public.communities USING btree (type);


--
-- TOC entry 4102 (class 1259 OID 24808)
-- Name: idx_embedding_jobs_community; Type: INDEX; Schema: public; Owner: community_user
--

CREATE INDEX idx_embedding_jobs_community ON public.embedding_generation_jobs USING btree (community_id);


--
-- TOC entry 4103 (class 1259 OID 24810)
-- Name: idx_embedding_jobs_created; Type: INDEX; Schema: public; Owner: community_user
--

CREATE INDEX idx_embedding_jobs_created ON public.embedding_generation_jobs USING btree (created_at DESC);


--
-- TOC entry 4104 (class 1259 OID 24809)
-- Name: idx_embedding_jobs_status; Type: INDEX; Schema: public; Owner: community_user
--

CREATE INDEX idx_embedding_jobs_status ON public.embedding_generation_jobs USING btree (status);


--
-- TOC entry 4091 (class 1259 OID 24777)
-- Name: idx_embeddings_contextual; Type: INDEX; Schema: public; Owner: community_user
--

CREATE INDEX idx_embeddings_contextual ON public.member_embeddings USING hnsw (contextual_embedding public.vector_cosine_ops) WITH (m='16', ef_construction='64');


--
-- TOC entry 4092 (class 1259 OID 24778)
-- Name: idx_embeddings_membership; Type: INDEX; Schema: public; Owner: community_user
--

CREATE INDEX idx_embeddings_membership ON public.member_embeddings USING btree (membership_id);


--
-- TOC entry 4093 (class 1259 OID 24780)
-- Name: idx_embeddings_model; Type: INDEX; Schema: public; Owner: community_user
--

CREATE INDEX idx_embeddings_model ON public.member_embeddings USING btree (embedding_model);


--
-- TOC entry 4094 (class 1259 OID 24781)
-- Name: idx_embeddings_updated; Type: INDEX; Schema: public; Owner: community_user
--

CREATE INDEX idx_embeddings_updated ON public.member_embeddings USING btree (updated_at);


--
-- TOC entry 4095 (class 1259 OID 24779)
-- Name: idx_embeddings_version; Type: INDEX; Schema: public; Owner: community_user
--

CREATE INDEX idx_embeddings_version ON public.member_embeddings USING btree (embedding_version);


--
-- TOC entry 4071 (class 1259 OID 24728)
-- Name: idx_entrepreneur_city; Type: INDEX; Schema: public; Owner: community_user
--

CREATE INDEX idx_entrepreneur_city ON public.entrepreneur_profiles USING btree (city);


--
-- TOC entry 4072 (class 1259 OID 24725)
-- Name: idx_entrepreneur_company; Type: INDEX; Schema: public; Owner: community_user
--

CREATE INDEX idx_entrepreneur_company ON public.entrepreneur_profiles USING btree (company);


--
-- TOC entry 4073 (class 1259 OID 24731)
-- Name: idx_entrepreneur_expertise; Type: INDEX; Schema: public; Owner: community_user
--

CREATE INDEX idx_entrepreneur_expertise ON public.entrepreneur_profiles USING gin (expertise);


--
-- TOC entry 4074 (class 1259 OID 24726)
-- Name: idx_entrepreneur_industry; Type: INDEX; Schema: public; Owner: community_user
--

CREATE INDEX idx_entrepreneur_industry ON public.entrepreneur_profiles USING btree (industry);


--
-- TOC entry 4075 (class 1259 OID 24732)
-- Name: idx_entrepreneur_looking; Type: INDEX; Schema: public; Owner: community_user
--

CREATE INDEX idx_entrepreneur_looking ON public.entrepreneur_profiles USING gin (looking_for);


--
-- TOC entry 4076 (class 1259 OID 24724)
-- Name: idx_entrepreneur_membership; Type: INDEX; Schema: public; Owner: community_user
--

CREATE INDEX idx_entrepreneur_membership ON public.entrepreneur_profiles USING btree (membership_id);


--
-- TOC entry 4077 (class 1259 OID 24730)
-- Name: idx_entrepreneur_products; Type: INDEX; Schema: public; Owner: community_user
--

CREATE INDEX idx_entrepreneur_products ON public.entrepreneur_profiles USING gin (products);


--
-- TOC entry 4078 (class 1259 OID 24729)
-- Name: idx_entrepreneur_services; Type: INDEX; Schema: public; Owner: community_user
--

CREATE INDEX idx_entrepreneur_services ON public.entrepreneur_profiles USING gin (services_offered);


--
-- TOC entry 4079 (class 1259 OID 24727)
-- Name: idx_entrepreneur_stage; Type: INDEX; Schema: public; Owner: community_user
--

CREATE INDEX idx_entrepreneur_stage ON public.entrepreneur_profiles USING btree (company_stage);


--
-- TOC entry 4040 (class 1259 OID 24634)
-- Name: idx_members_phone; Type: INDEX; Schema: public; Owner: community_user
--

CREATE INDEX idx_members_phone ON public.members USING btree (phone);


--
-- TOC entry 4109 (class 1259 OID 24851)
-- Name: idx_queries_community; Type: INDEX; Schema: public; Owner: community_user
--

CREATE INDEX idx_queries_community ON public.search_queries USING btree (community_id, created_at DESC);


--
-- TOC entry 4110 (class 1259 OID 24852)
-- Name: idx_queries_member; Type: INDEX; Schema: public; Owner: community_user
--

CREATE INDEX idx_queries_member ON public.search_queries USING btree (member_id);


--
-- TOC entry 4111 (class 1259 OID 24853)
-- Name: idx_queries_success; Type: INDEX; Schema: public; Owner: community_user
--

CREATE INDEX idx_queries_success ON public.search_queries USING btree (success) WHERE (success = false);


--
-- TOC entry 4114 (class 1259 OID 24870)
-- Name: idx_query_cache_expires; Type: INDEX; Schema: public; Owner: community_user
--

CREATE INDEX idx_query_cache_expires ON public.query_embedding_cache USING btree (expires_at);


--
-- TOC entry 4115 (class 1259 OID 24869)
-- Name: idx_query_cache_hash; Type: INDEX; Schema: public; Owner: community_user
--

CREATE INDEX idx_query_cache_hash ON public.query_embedding_cache USING btree (query_hash);


--
-- TOC entry 4080 (class 1259 OID 24752)
-- Name: idx_resident_apartment; Type: INDEX; Schema: public; Owner: community_user
--

CREATE INDEX idx_resident_apartment ON public.resident_profiles USING btree (apartment_number);


--
-- TOC entry 4081 (class 1259 OID 24753)
-- Name: idx_resident_building; Type: INDEX; Schema: public; Owner: community_user
--

CREATE INDEX idx_resident_building ON public.resident_profiles USING btree (building);


--
-- TOC entry 4082 (class 1259 OID 24756)
-- Name: idx_resident_help; Type: INDEX; Schema: public; Owner: community_user
--

CREATE INDEX idx_resident_help ON public.resident_profiles USING gin (can_help_with);


--
-- TOC entry 4083 (class 1259 OID 24757)
-- Name: idx_resident_interests; Type: INDEX; Schema: public; Owner: community_user
--

CREATE INDEX idx_resident_interests ON public.resident_profiles USING gin (interested_in);


--
-- TOC entry 4084 (class 1259 OID 24751)
-- Name: idx_resident_membership; Type: INDEX; Schema: public; Owner: community_user
--

CREATE INDEX idx_resident_membership ON public.resident_profiles USING btree (membership_id);


--
-- TOC entry 4085 (class 1259 OID 24754)
-- Name: idx_resident_profession; Type: INDEX; Schema: public; Owner: community_user
--

CREATE INDEX idx_resident_profession ON public.resident_profiles USING btree (profession);


--
-- TOC entry 4086 (class 1259 OID 24755)
-- Name: idx_resident_skills; Type: INDEX; Schema: public; Owner: community_user
--

CREATE INDEX idx_resident_skills ON public.resident_profiles USING gin (skills);


--
-- TOC entry 4105 (class 1259 OID 24829)
-- Name: idx_search_community; Type: INDEX; Schema: public; Owner: community_user
--

CREATE INDEX idx_search_community ON public.member_search_index USING btree (community_id);


--
-- TOC entry 4106 (class 1259 OID 24830)
-- Name: idx_search_vector; Type: INDEX; Schema: public; Owner: community_user
--

CREATE INDEX idx_search_vector ON public.member_search_index USING gin (search_vector);


--
-- TOC entry 4120 (class 1259 OID 24892)
-- Name: idx_users_active; Type: INDEX; Schema: public; Owner: community_user
--

CREATE INDEX idx_users_active ON public.users USING btree (is_active) WHERE (is_active = true);


--
-- TOC entry 4121 (class 1259 OID 24890)
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: community_user
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- TOC entry 4122 (class 1259 OID 24891)
-- Name: idx_users_member; Type: INDEX; Schema: public; Owner: community_user
--

CREATE INDEX idx_users_member ON public.users USING btree (member_id) WHERE (member_id IS NOT NULL);


--
-- TOC entry 4155 (class 2620 OID 24936)
-- Name: alumni_profiles trg_alumni_search; Type: TRIGGER; Schema: public; Owner: community_user
--

CREATE TRIGGER trg_alumni_search AFTER INSERT OR UPDATE ON public.alumni_profiles FOR EACH ROW EXECUTE FUNCTION public.update_member_search_index();


--
-- TOC entry 4156 (class 2620 OID 24930)
-- Name: alumni_profiles trg_alumni_updated; Type: TRIGGER; Schema: public; Owner: community_user
--

CREATE TRIGGER trg_alumni_updated BEFORE UPDATE ON public.alumni_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- TOC entry 4152 (class 2620 OID 24927)
-- Name: communities trg_communities_updated; Type: TRIGGER; Schema: public; Owner: community_user
--

CREATE TRIGGER trg_communities_updated BEFORE UPDATE ON public.communities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- TOC entry 4161 (class 2620 OID 24933)
-- Name: member_embeddings trg_embeddings_updated; Type: TRIGGER; Schema: public; Owner: community_user
--

CREATE TRIGGER trg_embeddings_updated BEFORE UPDATE ON public.member_embeddings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- TOC entry 4157 (class 2620 OID 24937)
-- Name: entrepreneur_profiles trg_entrepreneur_search; Type: TRIGGER; Schema: public; Owner: community_user
--

CREATE TRIGGER trg_entrepreneur_search AFTER INSERT OR UPDATE ON public.entrepreneur_profiles FOR EACH ROW EXECUTE FUNCTION public.update_member_search_index();


--
-- TOC entry 4158 (class 2620 OID 24931)
-- Name: entrepreneur_profiles trg_entrepreneur_updated; Type: TRIGGER; Schema: public; Owner: community_user
--

CREATE TRIGGER trg_entrepreneur_updated BEFORE UPDATE ON public.entrepreneur_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- TOC entry 4153 (class 2620 OID 24928)
-- Name: members trg_members_updated; Type: TRIGGER; Schema: public; Owner: community_user
--

CREATE TRIGGER trg_members_updated BEFORE UPDATE ON public.members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- TOC entry 4154 (class 2620 OID 24929)
-- Name: community_memberships trg_memberships_updated; Type: TRIGGER; Schema: public; Owner: community_user
--

CREATE TRIGGER trg_memberships_updated BEFORE UPDATE ON public.community_memberships FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- TOC entry 4159 (class 2620 OID 24938)
-- Name: resident_profiles trg_resident_search; Type: TRIGGER; Schema: public; Owner: community_user
--

CREATE TRIGGER trg_resident_search AFTER INSERT OR UPDATE ON public.resident_profiles FOR EACH ROW EXECUTE FUNCTION public.update_member_search_index();


--
-- TOC entry 4160 (class 2620 OID 24932)
-- Name: resident_profiles trg_resident_updated; Type: TRIGGER; Schema: public; Owner: community_user
--

CREATE TRIGGER trg_resident_updated BEFORE UPDATE ON public.resident_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- TOC entry 4162 (class 2620 OID 24934)
-- Name: users trg_users_updated; Type: TRIGGER; Schema: public; Owner: community_user
--

CREATE TRIGGER trg_users_updated BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- TOC entry 4138 (class 2606 OID 24687)
-- Name: alumni_profiles alumni_profiles_membership_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: community_user
--

ALTER TABLE ONLY public.alumni_profiles
    ADD CONSTRAINT alumni_profiles_membership_id_fkey FOREIGN KEY (membership_id) REFERENCES public.community_memberships(id) ON DELETE CASCADE;


--
-- TOC entry 4149 (class 2606 OID 24907)
-- Name: community_admins community_admins_community_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: community_user
--

ALTER TABLE ONLY public.community_admins
    ADD CONSTRAINT community_admins_community_id_fkey FOREIGN KEY (community_id) REFERENCES public.communities(id) ON DELETE CASCADE;


--
-- TOC entry 4150 (class 2606 OID 24917)
-- Name: community_admins community_admins_granted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: community_user
--

ALTER TABLE ONLY public.community_admins
    ADD CONSTRAINT community_admins_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.members(id) ON DELETE SET NULL;


--
-- TOC entry 4151 (class 2606 OID 24912)
-- Name: community_admins community_admins_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: community_user
--

ALTER TABLE ONLY public.community_admins
    ADD CONSTRAINT community_admins_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE CASCADE;


--
-- TOC entry 4135 (class 2606 OID 24649)
-- Name: community_memberships community_memberships_community_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: community_user
--

ALTER TABLE ONLY public.community_memberships
    ADD CONSTRAINT community_memberships_community_id_fkey FOREIGN KEY (community_id) REFERENCES public.communities(id) ON DELETE CASCADE;


--
-- TOC entry 4136 (class 2606 OID 24659)
-- Name: community_memberships community_memberships_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: community_user
--

ALTER TABLE ONLY public.community_memberships
    ADD CONSTRAINT community_memberships_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.members(id) ON DELETE SET NULL;


--
-- TOC entry 4137 (class 2606 OID 24654)
-- Name: community_memberships community_memberships_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: community_user
--

ALTER TABLE ONLY public.community_memberships
    ADD CONSTRAINT community_memberships_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE CASCADE;


--
-- TOC entry 4142 (class 2606 OID 24798)
-- Name: embedding_generation_jobs embedding_generation_jobs_community_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: community_user
--

ALTER TABLE ONLY public.embedding_generation_jobs
    ADD CONSTRAINT embedding_generation_jobs_community_id_fkey FOREIGN KEY (community_id) REFERENCES public.communities(id) ON DELETE CASCADE;


--
-- TOC entry 4143 (class 2606 OID 24803)
-- Name: embedding_generation_jobs embedding_generation_jobs_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: community_user
--

ALTER TABLE ONLY public.embedding_generation_jobs
    ADD CONSTRAINT embedding_generation_jobs_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.members(id) ON DELETE SET NULL;


--
-- TOC entry 4139 (class 2606 OID 24719)
-- Name: entrepreneur_profiles entrepreneur_profiles_membership_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: community_user
--

ALTER TABLE ONLY public.entrepreneur_profiles
    ADD CONSTRAINT entrepreneur_profiles_membership_id_fkey FOREIGN KEY (membership_id) REFERENCES public.community_memberships(id) ON DELETE CASCADE;


--
-- TOC entry 4141 (class 2606 OID 24772)
-- Name: member_embeddings member_embeddings_membership_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: community_user
--

ALTER TABLE ONLY public.member_embeddings
    ADD CONSTRAINT member_embeddings_membership_id_fkey FOREIGN KEY (membership_id) REFERENCES public.community_memberships(id) ON DELETE CASCADE;


--
-- TOC entry 4144 (class 2606 OID 24824)
-- Name: member_search_index member_search_index_community_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: community_user
--

ALTER TABLE ONLY public.member_search_index
    ADD CONSTRAINT member_search_index_community_id_fkey FOREIGN KEY (community_id) REFERENCES public.communities(id) ON DELETE CASCADE;


--
-- TOC entry 4145 (class 2606 OID 24819)
-- Name: member_search_index member_search_index_membership_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: community_user
--

ALTER TABLE ONLY public.member_search_index
    ADD CONSTRAINT member_search_index_membership_id_fkey FOREIGN KEY (membership_id) REFERENCES public.community_memberships(id) ON DELETE CASCADE;


--
-- TOC entry 4140 (class 2606 OID 24746)
-- Name: resident_profiles resident_profiles_membership_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: community_user
--

ALTER TABLE ONLY public.resident_profiles
    ADD CONSTRAINT resident_profiles_membership_id_fkey FOREIGN KEY (membership_id) REFERENCES public.community_memberships(id) ON DELETE CASCADE;


--
-- TOC entry 4146 (class 2606 OID 24841)
-- Name: search_queries search_queries_community_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: community_user
--

ALTER TABLE ONLY public.search_queries
    ADD CONSTRAINT search_queries_community_id_fkey FOREIGN KEY (community_id) REFERENCES public.communities(id) ON DELETE CASCADE;


--
-- TOC entry 4147 (class 2606 OID 24846)
-- Name: search_queries search_queries_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: community_user
--

ALTER TABLE ONLY public.search_queries
    ADD CONSTRAINT search_queries_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE SET NULL;


--
-- TOC entry 4148 (class 2606 OID 24885)
-- Name: users users_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: community_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE SET NULL;


--
-- TOC entry 4311 (class 3256 OID 24939)
-- Name: community_memberships community_isolation; Type: POLICY; Schema: public; Owner: community_user
--

CREATE POLICY community_isolation ON public.community_memberships USING (((community_id = (NULLIF(current_setting('app.current_community_id'::text, true), ''::text))::uuid) OR (current_setting('app.current_community_id'::text, true) = ''::text)));


--
-- TOC entry 4308 (class 0 OID 24635)
-- Dependencies: 220
-- Name: community_memberships; Type: ROW SECURITY; Schema: public; Owner: community_user
--

ALTER TABLE public.community_memberships ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4312 (class 3256 OID 24940)
-- Name: member_embeddings embedding_isolation; Type: POLICY; Schema: public; Owner: community_user
--

CREATE POLICY embedding_isolation ON public.member_embeddings USING (((membership_id IN ( SELECT community_memberships.id
   FROM public.community_memberships
  WHERE (community_memberships.community_id = (NULLIF(current_setting('app.current_community_id'::text, true), ''::text))::uuid))) OR (current_setting('app.current_community_id'::text, true) = ''::text)));


--
-- TOC entry 4309 (class 0 OID 24758)
-- Dependencies: 224
-- Name: member_embeddings; Type: ROW SECURITY; Schema: public; Owner: community_user
--

ALTER TABLE public.member_embeddings ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4310 (class 0 OID 24811)
-- Dependencies: 226
-- Name: member_search_index; Type: ROW SECURITY; Schema: public; Owner: community_user
--

ALTER TABLE public.member_search_index ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4307 (class 0 OID 16764)
-- Dependencies: 217
-- Name: search_cache; Type: ROW SECURITY; Schema: public; Owner: community_user
--

ALTER TABLE public.search_cache ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4313 (class 3256 OID 24941)
-- Name: member_search_index search_index_isolation; Type: POLICY; Schema: public; Owner: community_user
--

CREATE POLICY search_index_isolation ON public.member_search_index USING (((community_id = (NULLIF(current_setting('app.current_community_id'::text, true), ''::text))::uuid) OR (current_setting('app.current_community_id'::text, true) = ''::text)));


-- Completed on 2025-11-17 22:19:40 IST

--
-- PostgreSQL database dump complete
--

\unrestrict L1BVWRayRqCkxLX5Xpd2nmcxlKh12fZX7fndcVRmOjsrh8QqaEKLmXojV0f9SUz

