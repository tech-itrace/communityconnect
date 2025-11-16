--
-- PostgreSQL database dump
--

\restrict bExM38HV8ZYj6HmQ2DfGnjGy23OxuK0VMUdoqKIgq0kpatEia5xmQU1arJG6vND

-- Dumped from database version 16.10 (Homebrew)
-- Dumped by pg_dump version 18.0

-- Started on 2025-11-15 19:32:59 IST

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

--
-- TOC entry 2 (class 3079 OID 16390)
-- Name: vector; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;


--
-- TOC entry 4172 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION vector; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION vector IS 'vector data type and ivfflat and hnsw access methods';


--
-- TOC entry 315 (class 1255 OID 16779)
-- Name: update_full_text_search(); Type: FUNCTION; Schema: public; Owner: community_user
--

CREATE FUNCTION public.update_full_text_search() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
            BEGIN
                NEW.full_text_search := 
                    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
                    setweight(to_tsvector('english', COALESCE(NEW.working_knowledge, '')), 'A') ||
                    setweight(to_tsvector('english', COALESCE(NEW.organization_name, '')), 'B') ||
                    setweight(to_tsvector('english', COALESCE(NEW.designation, '')), 'B') ||
                    setweight(to_tsvector('english', COALESCE(NEW.city, '')), 'B') ||
                    setweight(to_tsvector('english', COALESCE(NEW.degree, '')), 'C') ||
                    setweight(to_tsvector('english', COALESCE(NEW.branch, '')), 'C');
                RETURN NEW;
            END;
            $$;


ALTER FUNCTION public.update_full_text_search() OWNER TO community_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 227 (class 1259 OID 17015)
-- Name: alumini_members; Type: TABLE; Schema: public; Owner: community_user
--

CREATE TABLE public.alumini_members (
    id text NOT NULL,
    college text NOT NULL,
    graduation_year text NOT NULL,
    degree text NOT NULL,
    department text NOT NULL,
    current_organization text NOT NULL,
    designation text NOT NULL,
    member_id text NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    other_details jsonb DEFAULT '{}'::jsonb
);


ALTER TABLE public.alumini_members OWNER TO community_user;

--
-- TOC entry 221 (class 1259 OID 16913)
-- Name: community; Type: TABLE; Schema: public; Owner: community_user
--

CREATE TABLE public.community (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    type character varying(100),
    admins jsonb DEFAULT '[]'::jsonb,
    rules text,
    is_bot_enable boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_by character varying(255),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.community OWNER TO community_user;

--
-- TOC entry 220 (class 1259 OID 16884)
-- Name: community_groups; Type: TABLE; Schema: public; Owner: candorbees
--

CREATE TABLE public.community_groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    members uuid[] DEFAULT '{}'::uuid[],
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.community_groups OWNER TO candorbees;

--
-- TOC entry 216 (class 1259 OID 16718)
-- Name: community_members; Type: TABLE; Schema: public; Owner: community_user
--

CREATE TABLE public.community_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    year_of_graduation integer,
    degree character varying(100),
    branch character varying(100),
    working_knowledge text,
    email character varying(255),
    phone character varying(20),
    address text,
    city character varying(100),
    state character varying(100),
    country character varying(100) DEFAULT 'India'::character varying,
    organization_name text,
    designation character varying(255),
    annual_turnover character varying(50),
    full_text_search tsvector,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    is_active boolean DEFAULT true,
    role text
);


ALTER TABLE public.community_members OWNER TO community_user;

--
-- TOC entry 225 (class 1259 OID 16963)
-- Name: community_members_types; Type: TABLE; Schema: public; Owner: community_user
--

CREATE TABLE public.community_members_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    community_id uuid NOT NULL,
    member_id text NOT NULL,
    member_type_id text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.community_members_types OWNER TO community_user;

--
-- TOC entry 226 (class 1259 OID 16999)
-- Name: entrepreneur_members; Type: TABLE; Schema: public; Owner: community_user
--

CREATE TABLE public.entrepreneur_members (
    id text NOT NULL,
    company text NOT NULL,
    industry text NOT NULL,
    web_url text NOT NULL,
    services_offered text NOT NULL,
    looking_for text NOT NULL,
    offering text NOT NULL,
    expertise text NOT NULL,
    member_id text NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    other_details jsonb DEFAULT '{}'::jsonb
);


ALTER TABLE public.entrepreneur_members OWNER TO community_user;

--
-- TOC entry 217 (class 1259 OID 16736)
-- Name: member_embeddings; Type: TABLE; Schema: public; Owner: community_user
--

CREATE TABLE public.member_embeddings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    member_id uuid NOT NULL,
    profile_embedding public.vector(768),
    skills_embedding public.vector(768),
    embedding_model character varying(100) DEFAULT 'BAAI/bge-base-en-v1.5'::character varying,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.member_embeddings OWNER TO community_user;

--
-- TOC entry 224 (class 1259 OID 16940)
-- Name: members; Type: TABLE; Schema: public; Owner: community_user
--

CREATE TABLE public.members (
    id text NOT NULL,
    name text NOT NULL,
    phone text,
    email text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.members OWNER TO community_user;

--
-- TOC entry 219 (class 1259 OID 16768)
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
-- TOC entry 218 (class 1259 OID 16755)
-- Name: search_queries; Type: TABLE; Schema: public; Owner: community_user
--

CREATE TABLE public.search_queries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying(255),
    conversation_id character varying(255),
    query_text text NOT NULL,
    query_type character varying(50),
    results_count integer,
    response_time_ms integer,
    success boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.search_queries OWNER TO community_user;

--
-- TOC entry 223 (class 1259 OID 16927)
-- Name: users; Type: TABLE; Schema: public; Owner: community_user
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    password character varying(255),
    phone character varying(255),
    about text,
    purpose character varying(255),
    is_active boolean DEFAULT true,
    created_by character varying(255),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.users OWNER TO community_user;

--
-- TOC entry 222 (class 1259 OID 16926)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: community_user
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO community_user;

--
-- TOC entry 4174 (class 0 OID 0)
-- Dependencies: 222
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: community_user
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 3955 (class 2604 OID 16930)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: community_user
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 4016 (class 2606 OID 17025)
-- Name: alumini_members alumini_members_pkey; Type: CONSTRAINT; Schema: public; Owner: community_user
--

ALTER TABLE ONLY public.alumini_members
    ADD CONSTRAINT alumini_members_pkey PRIMARY KEY (id);


--
-- TOC entry 3995 (class 2606 OID 16895)
-- Name: community_groups community_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: candorbees
--

ALTER TABLE ONLY public.community_groups
    ADD CONSTRAINT community_groups_pkey PRIMARY KEY (id);


--
-- TOC entry 3973 (class 2606 OID 16729)
-- Name: community_members community_members_pkey; Type: CONSTRAINT; Schema: public; Owner: community_user
--

ALTER TABLE ONLY public.community_members
    ADD CONSTRAINT community_members_pkey PRIMARY KEY (id);


--
-- TOC entry 4012 (class 2606 OID 16972)
-- Name: community_members_types community_members_types_pkey; Type: CONSTRAINT; Schema: public; Owner: community_user
--

ALTER TABLE ONLY public.community_members_types
    ADD CONSTRAINT community_members_types_pkey PRIMARY KEY (id);


--
-- TOC entry 4000 (class 2606 OID 16925)
-- Name: community community_pkey; Type: CONSTRAINT; Schema: public; Owner: community_user
--

ALTER TABLE ONLY public.community
    ADD CONSTRAINT community_pkey PRIMARY KEY (id);


--
-- TOC entry 4014 (class 2606 OID 17009)
-- Name: entrepreneur_members entrepreneur_members_pkey; Type: CONSTRAINT; Schema: public; Owner: community_user
--

ALTER TABLE ONLY public.entrepreneur_members
    ADD CONSTRAINT entrepreneur_members_pkey PRIMARY KEY (id);


--
-- TOC entry 3983 (class 2606 OID 16747)
-- Name: member_embeddings member_embeddings_member_id_key; Type: CONSTRAINT; Schema: public; Owner: community_user
--

ALTER TABLE ONLY public.member_embeddings
    ADD CONSTRAINT member_embeddings_member_id_key UNIQUE (member_id);


--
-- TOC entry 3985 (class 2606 OID 16745)
-- Name: member_embeddings member_embeddings_pkey; Type: CONSTRAINT; Schema: public; Owner: community_user
--

ALTER TABLE ONLY public.member_embeddings
    ADD CONSTRAINT member_embeddings_pkey PRIMARY KEY (id);


--
-- TOC entry 4006 (class 2606 OID 16952)
-- Name: members members_email_key; Type: CONSTRAINT; Schema: public; Owner: community_user
--

ALTER TABLE ONLY public.members
    ADD CONSTRAINT members_email_key UNIQUE (email);


--
-- TOC entry 4008 (class 2606 OID 16950)
-- Name: members members_phone_key; Type: CONSTRAINT; Schema: public; Owner: community_user
--

ALTER TABLE ONLY public.members
    ADD CONSTRAINT members_phone_key UNIQUE (phone);


--
-- TOC entry 4010 (class 2606 OID 16948)
-- Name: members members_pkey; Type: CONSTRAINT; Schema: public; Owner: community_user
--

ALTER TABLE ONLY public.members
    ADD CONSTRAINT members_pkey PRIMARY KEY (id);


--
-- TOC entry 3993 (class 2606 OID 16777)
-- Name: search_cache search_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: community_user
--

ALTER TABLE ONLY public.search_cache
    ADD CONSTRAINT search_cache_pkey PRIMARY KEY (query_hash);


--
-- TOC entry 3990 (class 2606 OID 16764)
-- Name: search_queries search_queries_pkey; Type: CONSTRAINT; Schema: public; Owner: community_user
--

ALTER TABLE ONLY public.search_queries
    ADD CONSTRAINT search_queries_pkey PRIMARY KEY (id);


--
-- TOC entry 4002 (class 2606 OID 16939)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: community_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 4004 (class 2606 OID 16937)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: community_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 3991 (class 1259 OID 16778)
-- Name: idx_cache_expires; Type: INDEX; Schema: public; Owner: community_user
--

CREATE INDEX idx_cache_expires ON public.search_cache USING btree (expires_at);


--
-- TOC entry 3996 (class 1259 OID 16897)
-- Name: idx_community_groups_is_active; Type: INDEX; Schema: public; Owner: candorbees
--

CREATE INDEX idx_community_groups_is_active ON public.community_groups USING btree (is_active);


--
-- TOC entry 3997 (class 1259 OID 16898)
-- Name: idx_community_groups_members; Type: INDEX; Schema: public; Owner: candorbees
--

CREATE INDEX idx_community_groups_members ON public.community_groups USING gin (members);


--
-- TOC entry 3998 (class 1259 OID 16896)
-- Name: idx_community_groups_name; Type: INDEX; Schema: public; Owner: candorbees
--

CREATE INDEX idx_community_groups_name ON public.community_groups USING btree (name);


--
-- TOC entry 3980 (class 1259 OID 16753)
-- Name: idx_embeddings_profile; Type: INDEX; Schema: public; Owner: community_user
--

CREATE INDEX idx_embeddings_profile ON public.member_embeddings USING ivfflat (profile_embedding public.vector_cosine_ops) WITH (lists='100');


--
-- TOC entry 3981 (class 1259 OID 16754)
-- Name: idx_embeddings_skills; Type: INDEX; Schema: public; Owner: community_user
--

CREATE INDEX idx_embeddings_skills ON public.member_embeddings USING ivfflat (skills_embedding public.vector_cosine_ops) WITH (lists='100');


--
-- TOC entry 3974 (class 1259 OID 16735)
-- Name: idx_members_active; Type: INDEX; Schema: public; Owner: community_user
--

CREATE INDEX idx_members_active ON public.community_members USING btree (is_active) WHERE (is_active = true);


--
-- TOC entry 3975 (class 1259 OID 16731)
-- Name: idx_members_city; Type: INDEX; Schema: public; Owner: community_user
--

CREATE INDEX idx_members_city ON public.community_members USING btree (city);


--
-- TOC entry 3976 (class 1259 OID 16734)
-- Name: idx_members_email; Type: INDEX; Schema: public; Owner: community_user
--

CREATE INDEX idx_members_email ON public.community_members USING btree (email);


--
-- TOC entry 3977 (class 1259 OID 16730)
-- Name: idx_members_fts; Type: INDEX; Schema: public; Owner: community_user
--

CREATE INDEX idx_members_fts ON public.community_members USING gin (full_text_search);


--
-- TOC entry 3978 (class 1259 OID 16732)
-- Name: idx_members_turnover; Type: INDEX; Schema: public; Owner: community_user
--

CREATE INDEX idx_members_turnover ON public.community_members USING btree (annual_turnover);


--
-- TOC entry 3979 (class 1259 OID 16733)
-- Name: idx_members_year; Type: INDEX; Schema: public; Owner: community_user
--

CREATE INDEX idx_members_year ON public.community_members USING btree (year_of_graduation);


--
-- TOC entry 3986 (class 1259 OID 16766)
-- Name: idx_queries_created; Type: INDEX; Schema: public; Owner: community_user
--

CREATE INDEX idx_queries_created ON public.search_queries USING btree (created_at);


--
-- TOC entry 3987 (class 1259 OID 16767)
-- Name: idx_queries_type; Type: INDEX; Schema: public; Owner: community_user
--

CREATE INDEX idx_queries_type ON public.search_queries USING btree (query_type);


--
-- TOC entry 3988 (class 1259 OID 16765)
-- Name: idx_queries_user; Type: INDEX; Schema: public; Owner: community_user
--

CREATE INDEX idx_queries_user ON public.search_queries USING btree (user_id);


--
-- TOC entry 4022 (class 2620 OID 16780)
-- Name: community_members trg_update_full_text_search; Type: TRIGGER; Schema: public; Owner: community_user
--

CREATE TRIGGER trg_update_full_text_search BEFORE INSERT OR UPDATE ON public.community_members FOR EACH ROW EXECUTE FUNCTION public.update_full_text_search();


--
-- TOC entry 4021 (class 2606 OID 17026)
-- Name: alumini_members fk_aluimni_member; Type: FK CONSTRAINT; Schema: public; Owner: community_user
--

ALTER TABLE ONLY public.alumini_members
    ADD CONSTRAINT fk_aluimni_member FOREIGN KEY (member_id) REFERENCES public.members(id);


--
-- TOC entry 4018 (class 2606 OID 16973)
-- Name: community_members_types fk_cmt_community; Type: FK CONSTRAINT; Schema: public; Owner: community_user
--

ALTER TABLE ONLY public.community_members_types
    ADD CONSTRAINT fk_cmt_community FOREIGN KEY (community_id) REFERENCES public.community(id);


--
-- TOC entry 4019 (class 2606 OID 16978)
-- Name: community_members_types fk_cmt_member; Type: FK CONSTRAINT; Schema: public; Owner: community_user
--

ALTER TABLE ONLY public.community_members_types
    ADD CONSTRAINT fk_cmt_member FOREIGN KEY (member_id) REFERENCES public.members(id);


--
-- TOC entry 4020 (class 2606 OID 17010)
-- Name: entrepreneur_members fk_entrepreneur_member; Type: FK CONSTRAINT; Schema: public; Owner: community_user
--

ALTER TABLE ONLY public.entrepreneur_members
    ADD CONSTRAINT fk_entrepreneur_member FOREIGN KEY (member_id) REFERENCES public.members(id);


--
-- TOC entry 4017 (class 2606 OID 16748)
-- Name: member_embeddings member_embeddings_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: community_user
--

ALTER TABLE ONLY public.member_embeddings
    ADD CONSTRAINT member_embeddings_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.community_members(id) ON DELETE CASCADE;


--
-- TOC entry 4171 (class 0 OID 0)
-- Dependencies: 6
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT ALL ON SCHEMA public TO community_user;


--
-- TOC entry 4173 (class 0 OID 0)
-- Dependencies: 220
-- Name: TABLE community_groups; Type: ACL; Schema: public; Owner: candorbees
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.community_groups TO community_user;


-- Completed on 2025-11-15 19:32:59 IST

--
-- PostgreSQL database dump complete
--

\unrestrict bExM38HV8ZYj6HmQ2DfGnjGy23OxuK0VMUdoqKIgq0kpatEia5xmQU1arJG6vND

