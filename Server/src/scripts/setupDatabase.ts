import dotenv from 'dotenv';
import pool, { query } from '../config/db';

// Load environment variables
dotenv.config();

async function setupDatabase() {
    console.log('[Setup] Starting database setup...');

    try {
        // Enable pgvector extension
        console.log('[Setup] Enabling pgvector extension...');
        await query(`CREATE EXTENSION IF NOT EXISTS vector;`);
        console.log('[Setup] ✓ pgvector extension enabled');

        // Create community_members table
        console.log('[Setup] Creating community_members table...');
        await query(`
            CREATE TABLE IF NOT EXISTS community_members (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(255) NOT NULL,
                year_of_graduation INTEGER,
                degree VARCHAR(100),
                branch VARCHAR(100),
                working_knowledge TEXT,
                email VARCHAR(255),
                phone VARCHAR(20),
                address TEXT,
                city VARCHAR(100),
                state VARCHAR(100),
                country VARCHAR(100) DEFAULT 'India',
                organization_name TEXT,
                designation VARCHAR(255),
                annual_turnover VARCHAR(50),
                
                -- Computed fields for search
                full_text_search TSVECTOR,
                
                -- Metadata
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                is_active BOOLEAN DEFAULT TRUE
            );
        `);
        console.log('[Setup] ✓ community_members table created');

        // Create indexes for community_members
        console.log('[Setup] Creating indexes for community_members...');
        await query(`CREATE INDEX IF NOT EXISTS idx_members_fts ON community_members USING GIN(full_text_search);`);
        await query(`CREATE INDEX IF NOT EXISTS idx_members_city ON community_members(city);`);
        await query(`CREATE INDEX IF NOT EXISTS idx_members_turnover ON community_members(annual_turnover);`);
        await query(`CREATE INDEX IF NOT EXISTS idx_members_year ON community_members(year_of_graduation);`);
        await query(`CREATE INDEX IF NOT EXISTS idx_members_email ON community_members(email);`);
        await query(`CREATE INDEX IF NOT EXISTS idx_members_active ON community_members(is_active) WHERE is_active = TRUE;`);
        console.log('[Setup] ✓ Indexes created for community_members');

        // Create member_embeddings table
        console.log('[Setup] Creating member_embeddings table...');
        await query(`
            CREATE TABLE IF NOT EXISTS member_embeddings (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                member_id UUID NOT NULL REFERENCES community_members(id) ON DELETE CASCADE,
                
                -- Embeddings for different fields (768 dimensions for DeepInfra BAAI/bge-base-en-v1.5)
                profile_embedding VECTOR(768),
                skills_embedding VECTOR(768),
                
                -- Metadata
                embedding_model VARCHAR(100) DEFAULT 'BAAI/bge-base-en-v1.5',
                created_at TIMESTAMP DEFAULT NOW(),
                
                UNIQUE(member_id)
            );
        `);
        console.log('[Setup] ✓ member_embeddings table created');

        // Create vector indexes (using ivfflat for better performance)
        console.log('[Setup] Creating vector indexes...');
        await query(`CREATE INDEX IF NOT EXISTS idx_embeddings_profile ON member_embeddings USING ivfflat (profile_embedding vector_cosine_ops) WITH (lists = 100);`);
        await query(`CREATE INDEX IF NOT EXISTS idx_embeddings_skills ON member_embeddings USING ivfflat (skills_embedding vector_cosine_ops) WITH (lists = 100);`);
        console.log('[Setup] ✓ Vector indexes created');

        // Create search_queries table for analytics
        console.log('[Setup] Creating search_queries table...');
        await query(`
            CREATE TABLE IF NOT EXISTS search_queries (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id VARCHAR(255),
                conversation_id VARCHAR(255),
                query_text TEXT NOT NULL,
                query_type VARCHAR(50),
                results_count INTEGER,
                response_time_ms INTEGER,
                success BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);
        await query(`CREATE INDEX IF NOT EXISTS idx_queries_user ON search_queries(user_id);`);
        await query(`CREATE INDEX IF NOT EXISTS idx_queries_created ON search_queries(created_at);`);
        await query(`CREATE INDEX IF NOT EXISTS idx_queries_type ON search_queries(query_type);`);
        console.log('[Setup] ✓ search_queries table created');

        // Create search_cache table for performance
        console.log('[Setup] Creating search_cache table...');
        await query(`
            CREATE TABLE IF NOT EXISTS search_cache (
                query_hash VARCHAR(64) PRIMARY KEY,
                query_text TEXT NOT NULL,
                response JSONB NOT NULL,
                hit_count INTEGER DEFAULT 1,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT NOW(),
                last_accessed TIMESTAMP DEFAULT NOW()
            );
        `);
        await query(`CREATE INDEX IF NOT EXISTS idx_cache_expires ON search_cache(expires_at);`);
        console.log('[Setup] ✓ search_cache table created');

        // Create function to update full text search
        console.log('[Setup] Creating full text search trigger...');
        await query(`
            CREATE OR REPLACE FUNCTION update_full_text_search()
            RETURNS TRIGGER AS $$
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
            $$ LANGUAGE plpgsql;
        `);

        await query(`
            DROP TRIGGER IF EXISTS trg_update_full_text_search ON community_members;
            CREATE TRIGGER trg_update_full_text_search
                BEFORE INSERT OR UPDATE ON community_members
                FOR EACH ROW
                EXECUTE FUNCTION update_full_text_search();
        `);
        console.log('[Setup] ✓ Full text search trigger created');

        console.log('\n[Setup] ✅ Database setup completed successfully!');
        console.log('[Setup] Tables created:');
        console.log('  - community_members (with indexes)');
        console.log('  - member_embeddings (with vector indexes)');
        console.log('  - search_queries (analytics)');
        console.log('  - search_cache (performance)');

    } catch (error) {
        console.error('[Setup] ❌ Error setting up database:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

// Run setup
setupDatabase()
    .then(() => {
        console.log('[Setup] Exiting...');
        process.exit(0);
    })
    .catch((error) => {
        console.error('[Setup] Fatal error:', error);
        process.exit(1);
    });
