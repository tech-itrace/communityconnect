# Post-Migration Updates Needed

## Migration Status ✅
- ✅ Schema migrated successfully (14 tables)
- ✅ 51 members migrated to multi-community structure  
- ✅ 51 community memberships created (all in "main-community")
- ✅ 51 contextual embeddings generated (3 types per member)

## Critical Updates Required 🔴

### 1. Semantic Search Service (`Server/src/services/semanticSearch.ts`)
**Status**: ❌ Still using old single-community schema

**Required Changes**:
- Update queries to use `community_memberships` JOIN instead of direct `members` table
- Add `community_id` parameter to all search functions
- Update embedding queries to use `member_embeddings` with `membership_id` FK
- Modify result mapping to include community context

**Old Query Pattern**:
```sql
SELECT m.*, me.profile_embedding, me.skills_embedding
FROM members m
JOIN member_embeddings me ON m.id = me.member_id
WHERE m.is_active = TRUE
```

**New Query Pattern Needed**:
```sql
SELECT m.*, cm.*, me.profile_embedding, me.skills_embedding, me.contextual_embedding
FROM community_memberships cm
JOIN members m ON cm.member_id = m.id
JOIN member_embeddings me ON cm.id = me.membership_id
WHERE cm.community_id = $1 
  AND cm.is_active = TRUE
```

---

### 2. Member Controller (`Server/src/controllers/memberController.ts`)
**Status**: ⚠️  Needs verification and updates

**Required Changes**:
- Update GET /api/members to filter by community_id
- Update POST /api/members to create both member + membership
- Update PUT /api/members/:id to handle membership updates
- Add community context to all member operations

---

### 3. WhatsApp Controller (`Server/src/controllers/whatsappController.ts`)
**Status**: ⚠️  Needs verification

**Required Changes**:
- Determine community_id from WhatsApp number or default to "main-community"
- Pass community_id to semantic search service
- Update session management to include community context

---

### 4. Dashboard API Routes (`Server/src/routes/members.ts`)
**Status**: ⚠️  Needs updates

**Required Changes**:
- Add community_id parameter extraction from auth/session
- Update all member queries to be community-scoped
- Implement multi-community support (if admin manages multiple communities)

---

### 5. Type Definitions (`Server/src/utils/types.ts`)
**Status**: ⚠️  Needs expansion

**Required Changes**:
- Add `CommunityMembership` type
- Add `AlumniProfile`, `EntrepreneurProfile`, `ResidentProfile` types
- Update `Member` type to reflect base identity only
- Add `MemberWithProfile` type for joined data

---

## Migration Path Forward

### Phase 1: Critical Path (Required for basic functionality)
1. ✅ ~~Generate contextual embeddings~~
2. **Update semanticSearch.ts** ← NEXT STEP
3. Test WhatsApp search with new schema
4. Update memberController basic operations

### Phase 2: Full Multi-Community Support
1. Update dashboard to support community selection
2. Implement community-scoped member management
3. Add type-specific profile editing (alumni vs entrepreneur vs resident)
4. Update all API routes with community filtering

### Phase 3: Advanced Features
1. Implement cross-community search (for super admins)
2. Add community-specific embeddings optimization
3. Implement query embedding cache
4. Add search analytics per community

---

## Quick Fix for Testing (Temporary)

To test WhatsApp functionality immediately without full migration:

1. Hard-code `main-community` ID in semantic search queries
2. Keep existing member-centric query structure but JOIN through memberships
3. Use `profile_embedding` only (skip contextual for now)

**Temporary Query**:
```sql
WITH main_community AS (
  SELECT id FROM communities WHERE slug = 'main-community' LIMIT 1
)
SELECT 
  m.id, m.name, m.phone, m.email,
  me.profile_embedding,
  (1 - (me.profile_embedding <=> $1::vector)) as similarity
FROM members m
JOIN community_memberships cm ON m.id = cm.member_id
JOIN member_embeddings me ON cm.id = me.membership_id
CROSS JOIN main_community mc
WHERE cm.community_id = mc.id
  AND cm.is_active = TRUE
ORDER BY similarity DESC
LIMIT 10
```

---

## Testing Checklist

- [ ] WhatsApp search returns results
- [ ] Dashboard member list loads
- [ ] Can add new member with membership
- [ ] Can edit member profile
- [ ] Vector search uses correct embeddings
- [ ] No N+1 query issues
- [ ] Community isolation works (RLS if enabled)

---

## Notes

- All embeddings use `BAAI/bge-base-en-v1.5` (768 dimensions)
- Gemini fallback available for rate limiting
- HNSW indexes created (faster than IVFFlat)
- Current data: 51 members, all alumni type, all in main-community
- Alumni profiles have default values (need manual update)
