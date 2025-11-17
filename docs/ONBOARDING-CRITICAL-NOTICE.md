# ⚠️ IMPORTANT: Multi-Community Setup Required

## Critical Information for New Developers

The onboarding guides (`DEVELOPER-ONBOARDING-MAC.md` and `DEVELOPER-ONBOARDING-WINDOWS.md`) currently use the **legacy single-community database schema**. 

**The production system uses a multi-community architecture**, which requires additional setup steps.

---

## Current Situation

### What the Onboarding Guides Do ✅
- Install PostgreSQL, pgvector, Redis, Node.js
- Create basic tables: `community_members`, `member_embeddings`, `search_queries`, `search_cache`
- Import 48 sample members
- Generate embeddings
- Start servers

### What's Missing ❌
- **Communities table** - Not created
- **Community memberships** - No relationships
- **Default community** - No "main-community" exists
- **Admin assignment** - No one is assigned as admin
- **Role-based access** - Members can't be distinguished by role

---

## Why This Matters

### Dashboard Access
**Issue**: Members can only query from the dashboard if they are admins in a community.

**Current State**: 
- ❌ No communities exist
- ❌ No admin roles assigned
- ❌ Dashboard will fail permission checks
- ❌ Search queries won't be scoped to a community

### Database Schema Mismatch
**The system expects**:
```
communities (community definitions)
    ↓
members (user profiles)
    ↓
community_memberships (many-to-many with roles)
    ↓
member_embeddings (semantic vectors)
```

**What onboarding creates**:
```
community_members (old schema - direct member storage)
member_embeddings (works but references old schema)
```

---

## Solution: Additional Setup Steps

After completing the onboarding guide, run these additional steps:

### Step 1: Migrate to Multi-Community Schema

This has **already been implemented** but is not included in the onboarding guides.

**Scripts available:**
- `migrateMembersToMultiCommunity.ts` - Converts old schema to new
- `promoteAdminAndRenameCommunity.ts` - Assigns admin roles
- `importMembersMultiCommunity.ts` - Import directly to multi-community

### Step 2: What Needs to Be Done

**Option A: Update `setupDatabase.ts`** ✅ RECOMMENDED
- Add communities table creation
- Add community_memberships table
- Add member types tables (alumni_profiles, entrepreneur_profiles, etc.)
- Create default "main-community"
- Modify import script to create memberships

**Option B: Add Migration Step to Onboarding** ⚠️ TEMPORARY FIX
- After `npm run import:members`, add:
- `npm run migrate:memberships`
- `npm run promote:admin`

---

## Action Items

### For Maintainers

1. **Update `setupDatabase.ts`** to create multi-community schema:
   ```typescript
   // Add these tables:
   - communities
   - members (rename from community_members)
   - community_memberships
   - alumni_profiles
   - entrepreneur_profiles
   - resident_profiles
   - member_search_index
   ```

2. **Create default community** in setup:
   ```sql
   INSERT INTO communities (name, slug, description)
   VALUES ('Main Community', 'main-community', 'Default community for all members');
   ```

3. **Update `importMembers.ts`** to:
   - Insert into `members` table (not `community_members`)
   - Create `community_memberships` for each member
   - Set first member as admin
   - Create profile records (alumni_profiles, etc.)

4. **Update onboarding guides** to include:
   - Community creation step
   - Admin assignment step
   - Verification that multi-community works

### For New Developers (Temporary Workaround)

If you followed the onboarding guide and need multi-community:

**After completing onboarding**, run:

```bash
# 1. Check if communities table exists
psql -U community_user -d community_connect -c "\dt communities"

# 2. If not, you need to run migration
# First, backup your data!
psql -U community_user -d community_connect -c "SELECT * FROM community_members;" > backup.sql

# 3. Contact team for migration script or:
# Option: Use importMembersMultiCommunity.ts instead
npm run import:members:multi

# 4. Assign yourself as admin
# Edit: Server/src/scripts/promoteAdminAndRenameCommunity.ts
# Change phone number to yours, then:
# (Script needs to be created or updated)
```

---

## Schema Comparison

### Legacy Schema (What Onboarding Creates)
```sql
community_members (
    id UUID,
    name VARCHAR,
    phone VARCHAR,
    email VARCHAR,
    working_knowledge TEXT,
    -- No role field
    -- No community_id
)

member_embeddings (
    member_id UUID → community_members.id
)
```

### Multi-Community Schema (What System Needs)
```sql
communities (
    id UUID,
    name VARCHAR,
    slug VARCHAR UNIQUE,
    description TEXT
)

members (
    id UUID,
    name VARCHAR,
    phone VARCHAR UNIQUE,
    email VARCHAR
)

community_memberships (
    id UUID,
    member_id UUID → members.id,
    community_id UUID → communities.id,
    role VARCHAR DEFAULT 'member',  -- member, admin, super_admin
    member_type VARCHAR,             -- alumni, entrepreneur, resident, generic
    is_active BOOLEAN
)

alumni_profiles (
    member_id UUID → members.id,
    working_knowledge TEXT,
    company_name VARCHAR,
    designation VARCHAR
)

member_embeddings (
    member_id UUID → members.id,
    community_id UUID → communities.id,  -- Scoped to community
    profile_embedding VECTOR(768),
    skills_embedding VECTOR(768),
    contextual_embedding VECTOR(768)
)
```

---

## Impact Analysis

### What Works Without Multi-Community ✅
- Backend server starts
- Database tables created
- Data imported
- Embeddings generated
- Basic API health checks

### What Doesn't Work ❌
- **Dashboard login/auth** - No admin roles
- **Member queries** - No community scoping
- **Search API** - Expects communityId parameter
- **WhatsApp bot** - Member validation fails
- **Role-based permissions** - No roles assigned
- **Multi-tenancy** - Can't separate communities

---

## Recommended Fix Priority

### High Priority 🔴
1. Update `setupDatabase.ts` to create multi-community schema
2. Update `importMembers.ts` to populate all required tables
3. Add default community creation
4. Add admin user assignment (from environment variable)

### Medium Priority 🟡
5. Update onboarding guides with new steps
6. Add verification script to check multi-community setup
7. Create troubleshooting guide for schema mismatches

### Low Priority 🟢
8. Create automated migration tool
9. Add schema version checking
10. Document both schemas for reference

---

## Verification After Fix

Run these checks to ensure multi-community is working:

```bash
# 1. Check tables exist
psql -U community_user -d community_connect -c "\dt"
# Should show: communities, members, community_memberships, alumni_profiles, etc.

# 2. Check default community exists
psql -U community_user -d community_connect -c "SELECT * FROM communities;"
# Should show at least 1 community

# 3. Check memberships created
psql -U community_user -d community_connect -c "SELECT COUNT(*) FROM community_memberships;"
# Should match number of imported members

# 4. Check admin assigned
psql -U community_user -d community_connect -c "SELECT m.name, cm.role FROM members m JOIN community_memberships cm ON m.id = cm.member_id WHERE cm.role = 'admin';"
# Should show at least 1 admin

# 5. Test dashboard access
# Login with admin phone number
# Should see members and have full access
```

---

## Communication Plan

### For Current Developers
- [ ] Notify team of schema mismatch in onboarding
- [ ] Share this document
- [ ] Plan fix timeline
- [ ] Assign owner for database schema updates

### For New Developers
- [ ] Add warning to onboarding guides
- [ ] Provide temporary workaround steps
- [ ] Link to this document
- [ ] Update after fix is deployed

---

## Questions & Answers

**Q: Why wasn't this caught earlier?**
A: The onboarding guides were created for the legacy schema. The multi-community migration happened but wasn't reflected in setup scripts.

**Q: Can I still use the onboarding guide?**
A: Yes, for learning the system. But you'll need additional steps for full functionality.

**Q: How long to fix this properly?**
A: ~2-4 hours to update setup scripts and test thoroughly.

**Q: What if I already completed onboarding?**
A: You'll need to run migration scripts or re-setup with updated scripts (when available).

**Q: Will my data be lost?**
A: No, migration scripts preserve all data. Always backup first though!

---

## Status

**Created:** November 17, 2025  
**Priority:** HIGH - Blocks new developer productivity  
**Owner:** TBD  
**Estimated Fix Time:** 2-4 hours  
**Impact:** All new developers following onboarding guides

---

## Next Steps

1. **Immediate**: Add this warning to onboarding index
2. **Short-term**: Update `setupDatabase.ts` and `importMembers.ts`
3. **Medium-term**: Update all onboarding documentation
4. **Long-term**: Add schema version checks and automated migration

---

**⚠️ Until this is fixed, new developers will have a partially functional system after onboarding.**

Contact the development team for the latest migration scripts and workarounds.
