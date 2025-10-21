# Day 4: Role-Based Access Control (RBAC) - Complete ✓

## Overview
Implemented comprehensive Role-Based Access Control system with three-tier hierarchy and permission matrix.

**Date**: October 21, 2025  
**Status**: ✅ Complete  
**Tests**: All passing

---

## What We Built

### 1. Database Schema Update
- Added `role` column to `community_members` table
- Constraints: VARCHAR(20), CHECK for valid roles (member/admin/super_admin)
- Default role: 'member'
- Index on role column for performance
- **Result**: 51 existing members migrated to 'member' role

### 2. Role Hierarchy

```
┌─────────────────┬────────┬───────┬─────────────┐
│ Permission      │ Member │ Admin │ Super Admin │
├─────────────────┼────────┼───────┼─────────────┤
│ Search          │   ✓    │   ✓   │      ✓      │
│ View Profile    │   ✓    │   ✓   │      ✓      │
│ Update Own      │   ✓    │   ✓   │      ✓      │
│ Add Members     │   ✗    │   ✓   │      ✓      │
│ Edit Members    │   ✗    │   ✓   │      ✓      │
│ Delete Members  │   ✗    │   ✗   │      ✓      │
│ View Analytics  │   ✗    │   ✓   │      ✓      │
│ Manage Admins   │   ✗    │   ✗   │      ✓      │
└─────────────────┴────────┴───────┴─────────────┘
```

### 3. Authorization Middleware

**File**: `src/middlewares/authorize.ts`

**Functions**:
- `requireRole(role)` - Requires exact role match
- `requireAnyRole([roles])` - Requires one of specified roles
- `requirePermission(permission)` - Requires specific permission
- `requireOwnership(getResourceOwner)` - Ensures user owns resource
- `setUserFromSession()` - Populates req.user from session
- `hasPermission(role, permission)` - Helper to check permissions

**Features**:
- Clear console logging for debugging
- Detailed error messages
- Graceful degradation on auth errors
- Integrates with session service

---

## Files Modified

### New Files
1. `src/scripts/addRoleColumn.ts` - Database migration script
2. `src/middlewares/authorize.ts` - Authorization middleware (240 lines)
3. `src/test-rbac.ts` - Comprehensive RBAC test suite

### Updated Files
1. `src/utils/types.ts` - Added Role type and ROLE_PERMISSIONS matrix
2. `src/services/conversationService.ts` - Fetches role from database
3. `src/routes/whatsapp.ts` - Uses role from validation
4. `src/routes/members.ts` - Applied RBAC to member routes
5. `src/routes/search.ts` - Applied RBAC to search routes

---

## Protected Routes

### Member Routes (`/api/members`)

```typescript
// Stats - Admin/Super Admin only
GET /api/members/stats
  ✓ requireAnyRole(['admin', 'super_admin'])

// View single member - All authenticated users
GET /api/members/:id
  ✓ requirePermission('canViewProfile')

// List all members - Admin/Super Admin only
GET /api/members
  ✓ requireAnyRole(['admin', 'super_admin'])
```

### Search Routes (`/api/search`)

```typescript
// Natural language query - All authenticated users
POST /api/search/query
  ✓ requirePermission('canSearch')

// Structured search - All authenticated users
POST /api/search/members
  ✓ requirePermission('canSearch')

// Suggestions - All authenticated users
GET /api/search/suggestions
  ✓ requirePermission('canSearch')
```

---

## Test Results

### RBAC Test Suite (10 tests)

```bash
npm run test:rbac
# or
npx ts-node -r dotenv/config src/test-rbac.ts
```

**Results**: ✅ All 10 tests passing

1. ✅ Permission matrix structure
2. ✅ hasPermission() function
3. ✅ Member accessing member-only route (200)
4. ✅ Member blocked from admin route (403)
5. ✅ Admin blocked from super-admin route (403)
6. ✅ Admin accessing admin-or-super route (200)
7. ✅ Member lacking permission blocked (403)
8. ✅ Ownership check - own resource (200)
9. ✅ Ownership check - other's resource (403)
10. ✅ Role hierarchy verification

---

## Usage Examples

### Example 1: Require Specific Role

```typescript
import { requireRole } from '../middlewares/authorize';

// Only super admins can delete members
router.delete('/members/:id', 
    requireRole('super_admin'),
    deleteMemberHandler
);
```

### Example 2: Require Any of Multiple Roles

```typescript
import { requireAnyRole } from '../middlewares/authorize';

// Admins and super admins can view analytics
router.get('/analytics',
    requireAnyRole(['admin', 'super_admin']),
    getAnalyticsHandler
);
```

### Example 3: Require Specific Permission

```typescript
import { requirePermission } from '../middlewares/authorize';

// Anyone with canAddMembers permission can add
router.post('/members',
    requirePermission('canAddMembers'),
    addMemberHandler
);
```

### Example 4: Ownership Check

```typescript
import { requireOwnership } from '../middlewares/authorize';

// Users can only update their own profile
router.put('/profile/:userId',
    requireOwnership((req) => req.params.userId),
    updateProfileHandler
);
```

### Example 5: Check Permission in Code

```typescript
import { hasPermission } from '../middlewares/authorize';

const canDelete = hasPermission(user.role, 'canDeleteMembers');
if (canDelete) {
    // Allow deletion
}
```

---

## Integration with WhatsApp Bot

The WhatsApp webhook now automatically:
1. Validates member from database
2. Fetches their role (member/admin/super_admin)
3. Creates session with role
4. Applies rate limits based on role
5. Enforces permissions on all actions

**Example Flow**:
```
User sends WhatsApp message
  → Validate member from database (get role)
  → Check rate limits (message/search counters)
  → Create/get session with role
  → Process query with role context
  → Apply permission checks
  → Return results
```

---

## Promoting Users to Admin

### Manual Promotion (SQL)

```sql
-- Promote to admin
UPDATE community_members 
SET role = 'admin' 
WHERE phone = '+919840930854';

-- Promote to super admin
UPDATE community_members 
SET role = 'super_admin' 
WHERE phone = '+919876543210';

-- Check current admins
SELECT name, phone, role 
FROM community_members 
WHERE role IN ('admin', 'super_admin');
```

### Future: Admin Management API
- POST /api/admin/promote - Promote user to admin (super_admin only)
- POST /api/admin/demote - Demote admin to member (super_admin only)
- GET /api/admin/list - List all admins (admin/super_admin)

---

## Performance Notes

### Database
- ✅ Index on role column for fast filtering
- ✅ Role fetched once during member validation
- ✅ Stored in session (30-min TTL)

### Middleware
- ✅ Permission checks are O(1) lookups
- ✅ Role checks fail fast (no DB queries)
- ✅ Clear console logging for debugging

---

## Security Considerations

### ✅ Implemented
- Role stored in database (not client-provided)
- Permission matrix enforced server-side
- Session-based role caching (prevents tampering)
- Clear audit trail via console logs
- Graceful degradation on auth failures

### 🔄 Future Enhancements
- Audit log for admin actions
- Role change notifications
- Time-limited admin privileges
- IP-based restrictions for admins
- Two-factor auth for super admins

---

## Next Steps (Day 5)

### 1. Audit Logging
- Log all admin actions
- Track role changes
- Monitor permission denials
- Export audit reports

### 2. Admin Dashboard
- Web UI for admin operations
- Role management interface
- Analytics dashboard
- Member management

### 3. Advanced Permissions
- Custom permission groups
- Temporary role elevation
- Time-based permissions
- Resource-specific permissions

---

## Rollback Instructions

If needed to rollback the RBAC changes:

```sql
-- Remove role column
ALTER TABLE community_members DROP COLUMN role;
```

Then revert these files:
- `src/routes/members.ts`
- `src/routes/search.ts`
- `src/routes/whatsapp.ts`
- `src/services/conversationService.ts`
- `src/utils/types.ts`

---

## Summary

✅ **Database**: Role column added with constraints  
✅ **Types**: Role enum and permission matrix defined  
✅ **Middleware**: 5 authorization functions implemented  
✅ **Integration**: WhatsApp bot uses roles from DB  
✅ **Routes**: All protected routes have RBAC applied  
✅ **Tests**: 10 RBAC tests passing  
✅ **Documentation**: Complete usage examples

**Lines of Code**: ~400 lines  
**Test Coverage**: 10 test scenarios  
**Performance Impact**: Minimal (O(1) permission checks)

---

## Team Notes

### For Developers
- Use `requirePermission()` for granular control
- Use `requireRole()` for strict role requirements
- Use `requireAnyRole()` for flexible access
- Always include role in console logs for debugging

### For Product
- Default role is 'member' (limited permissions)
- Admin promotion requires manual SQL update
- Super admin is the highest privilege level
- All permission changes require code deployment

### For DevOps
- Migration script: `npm run db:add-roles`
- Test suite: `npm run test:rbac`
- No additional infrastructure needed
- Roles stored in existing PostgreSQL database

---

**Day 4 Status**: ✅ COMPLETE  
**Next**: Day 5 - Audit Logging & Admin Dashboard
