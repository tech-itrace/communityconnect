# Script Updates Required for Lean Schema

## ⚠️ Important Notice

The import and embedding generation scripts need to be updated to work with the lean schema's JSONB structure.

---

## 📝 Required Updates

### 1. Import Members Script

**Current:** `Server/src/scripts/importMembersMultiCommunity.ts`

**Changes Needed:**
- ❌ Remove insert into `alumni_profiles`, `entrepreneur_profiles`, `resident_profiles`
- ✅ Insert profile data as JSONB into `community_memberships.profile_data`

### 2. Generate Embeddings Script

**Current:** `Server/src/scripts/generateEmbeddings.ts`

**Changes Needed:**
- ❌ Remove queries joining separate profile tables
- ✅ Query `profile_data` JSONB from `community_memberships`
- ✅ Ensure `search_vector` is populated (auto via trigger)

---

## 🔧 Updated Scripts Created

The following updated scripts have been created for lean schema support:

### 1. `importMembersLeanSchema.ts`
- ✅ Uses JSONB `profile_data` column
- ✅ Supports all member types (alumni/entrepreneur/resident)
- ✅ Auto-detects member type from CSV columns
- ✅ Validates JSONB structure

### 2. `generateEmbeddingsLeanSchema.ts`
- ✅ Queries `profile_data` JSONB
- ✅ Builds text from JSONB fields
- ✅ Uses `member_embeddings.search_vector` (auto-populated)
- ✅ Handles all member types

---

## 🚀 Usage

### For Fresh Installations (Lean Schema)

```bash
# Import members with JSONB profiles
npm run import:members:lean

# Generate embeddings
npm run generate:embeddings:lean
```

### For Migrated Installations

**After migration complete (Phase 5):**
```bash
# Same commands
npm run import:members:lean
npm run generate:embeddings:lean
```

**During migration (Phase 1-4, old tables still exist):**
```bash
# Use old scripts (they still work)
npm run import:members:multi
npm run generate:embeddings
```

---

## 📋 Script Comparison

| Aspect | Old Scripts | Lean Schema Scripts |
|--------|-------------|---------------------|
| **Profile Storage** | Insert into 3 separate tables | Insert JSONB into 1 column |
| **Data Structure** | Normalized tables | JSONB document |
| **Member Types** | Separate table per type | Single JSONB column |
| **Complexity** | 3 INSERT statements | 1 INSERT with JSONB |
| **Flexibility** | Schema change = migration | Add field to JSONB |
| **Performance** | Multiple writes | Single write |

---

## 🔄 Migration Path for Scripts

### Phase 1: During Migration (Both Schemas Exist)

**Keep using old scripts:**
- `importMembersMultiCommunity.ts` → Works with old tables
- `generateEmbeddings.ts` → Works with old structure

### Phase 2: After Migration Complete (Old Tables Dropped)

**Switch to lean scripts:**
- `importMembersLeanSchema.ts` → Uses JSONB
- `generateEmbeddingsLeanSchema.ts` → Uses JSONB

### Phase 3: Update Package.json

```json
{
  "scripts": {
    "import:members": "ts-node -r dotenv/config src/scripts/importMembersLeanSchema.ts",
    "generate:embeddings": "ts-node -r dotenv/config src/scripts/generateEmbeddingsLeanSchema.ts",
    
    // Keep old scripts for reference
    "import:members:old": "ts-node -r dotenv/config src/scripts/importMembersMultiCommunity.ts",
    "generate:embeddings:old": "ts-node -r dotenv/config src/scripts/generateEmbeddings.ts"
  }
}
```

---

## ✅ Verification

After using lean schema scripts:

```sql
-- Check profiles stored as JSONB
SELECT 
    member_type,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE profile_data != '{}') as with_profiles
FROM community_memberships
GROUP BY member_type;

-- Verify search vectors populated
SELECT 
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE search_vector IS NOT NULL) as with_vectors
FROM member_embeddings;

-- Sample profile data
SELECT 
    m.name,
    cm.member_type,
    cm.profile_data
FROM members m
JOIN community_memberships cm ON m.id = cm.member_id
LIMIT 3;
```

---

## 📚 Next Steps

1. **For New Installations:**
   - Use lean schema scripts from day one
   - Refer to updated scripts in this document

2. **For Migrations:**
   - Complete migration first (Phase 1-5)
   - Then switch to lean schema scripts
   - Update package.json

3. **Testing:**
   - Import sample data with lean scripts
   - Verify JSONB structure
   - Test embeddings generation
   - Confirm search works

---

**Status:** ⚠️ Scripts need updating after migration completes  
**Priority:** High - Required for fresh installations  
**Created:** November 18, 2025
