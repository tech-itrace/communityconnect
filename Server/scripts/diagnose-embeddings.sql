-- Diagnostic script to verify embeddings and vector search setup
-- Run with: psql $DATABASE_URL -f scripts/diagnose-embeddings.sql

\echo '========================================='
\echo 'PHASE 2: Database & Vector Search Diagnostics'
\echo '========================================='
\echo ''

\echo '1. Check embedding storage'
\echo '----------------------------'
SELECT
    COUNT(*) as total_embeddings,
    COUNT(DISTINCT embedding_model) as unique_models,
    COUNT(DISTINCT embedding_version) as unique_versions
FROM member_embeddings;
\echo ''

\echo '2. Check embedding dimensions'
\echo '-----------------------------'
SELECT
    embedding_model,
    embedding_version,
    array_length(profile_embedding, 1) as profile_dim,
    array_length(skills_embedding, 1) as skills_dim,
    array_length(contextual_embedding, 1) as contextual_dim,
    COUNT(*) as count
FROM member_embeddings
GROUP BY embedding_model, embedding_version,
         array_length(profile_embedding, 1),
         array_length(skills_embedding, 1),
         array_length(contextual_embedding, 1);
\echo ''

\echo '3. Sample embeddings with member details'
\echo '----------------------------------------'
SELECT
    m.name,
    cm.community_id,
    me.embedding_model,
    me.embedding_version,
    array_length(me.profile_embedding, 1) as dim,
    (me.profile_embedding[1:5])::text as sample_values,
    me.profile_text,
    me.skills_text
FROM member_embeddings me
JOIN community_memberships cm ON me.membership_id = cm.id
JOIN members m ON cm.member_id = m.id
WHERE cm.is_active = TRUE
  AND m.is_active = TRUE
LIMIT 5;
\echo ''

\echo '4. Check vector extension and indexes'
\echo '-------------------------------------'
-- Check if pgvector extension exists
SELECT
    extname,
    extversion,
    installed_version
FROM pg_available_extensions
WHERE extname = 'vector';
\echo ''

\echo '5. List HNSW indexes on member_embeddings'
\echo '-----------------------------------------'
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'member_embeddings'
  AND indexdef LIKE '%hnsw%';
\echo ''

\echo '6. Check index health and size'
\echo '-------------------------------'
SELECT
    indexname,
    pg_size_pretty(pg_relation_size(indexname::regclass)) as index_size,
    idx_scan as times_used,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND tablename = 'member_embeddings';
\echo ''

\echo '7. Test query plan for vector similarity'
\echo '----------------------------------------'
EXPLAIN ANALYZE
SELECT
    m.name,
    me.profile_embedding <=> '[0.1,0.2,0.3]'::vector(768) as distance
FROM member_embeddings me
JOIN community_memberships cm ON me.membership_id = cm.id
JOIN members m ON cm.member_id = m.id
WHERE cm.is_active = TRUE
  AND m.is_active = TRUE
ORDER BY distance ASC
LIMIT 10;
\echo ''

\echo '8. Check community distribution'
\echo '--------------------------------'
SELECT
    c.name as community,
    c.slug,
    COUNT(DISTINCT cm.id) as memberships,
    COUNT(DISTINCT me.id) as embeddings
FROM communities c
LEFT JOIN community_memberships cm ON c.id = cm.community_id AND cm.is_active = TRUE
LEFT JOIN member_embeddings me ON cm.id = me.membership_id
GROUP BY c.id, c.name, c.slug
ORDER BY embeddings DESC;
\echo ''

\echo '9. Identify missing embeddings'
\echo '------------------------------'
SELECT
    COUNT(*) as active_memberships_without_embeddings
FROM community_memberships cm
LEFT JOIN member_embeddings me ON cm.id = me.membership_id
WHERE cm.is_active = TRUE
  AND me.id IS NULL;
\echo ''

\echo '========================================='
\echo 'Diagnostics Complete!'
\echo '========================================='
