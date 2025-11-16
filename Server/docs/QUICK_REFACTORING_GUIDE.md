# Quick Refactoring Guide

**How to apply the new utilities to existing code**

---

## 🔄 Controller Refactoring Pattern

### Before (Old Pattern)
```typescript
export async function getMemberByIdHandler(req: Request, res: Response) {
    try {
        const { id } = req.params;

        // UUID validation
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(id)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_ID',
                    message: 'Invalid member ID format'
                }
            });
        }

        const member = await getMemberById(id);

        if (!member) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Member not found'
                }
            });
        }

        res.json({
            success: true,
            member
        });

    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: {
                code: 'SERVER_ERROR',
                message: 'Failed to fetch member'
            }
        });
    }
}
```

### After (New Pattern)
```typescript
import { asyncHandler, assertFound, ValidationError, successResponse } from '../utils/errors';
import { REGEX } from '../config/constants';

export const getMemberByIdHandler = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    // Validate UUID
    if (!REGEX.UUID.test(id)) {
        throw new ValidationError('Invalid member ID format');
    }

    // Get member
    const member = await getMemberById(id);

    // Assert found (throws NotFoundError if null)
    assertFound(member, 'Member', id);

    // Success response
    successResponse(res, { member });
});
```

**Lines saved:** 48 → 14 (70% reduction)
**Benefits:** Cleaner, type-safe, consistent errors

---

## 🔄 Service Refactoring Pattern (Add Transactions)

### Before (DANGEROUS - No Transaction)
```typescript
export async function createMemberWithProfile(data: MemberData) {
    // Step 1: Create member
    const memberResult = await query(
        'INSERT INTO members (name, phone, email) VALUES ($1, $2, $3) RETURNING *',
        [data.name, data.phone, data.email]
    );
    const memberId = memberResult.rows[0].id;

    // Step 2: Create profile
    await query(
        'INSERT INTO alumni_profiles (membership_id, college, degree) VALUES ($1, $2, $3)',
        [memberId, data.college, data.degree]
    );

    // Step 3: Create embedding
    await query(
        'INSERT INTO member_embeddings (member_id, profile_embedding) VALUES ($1, $2)',
        [memberId, embedding]
    );

    // ❌ If step 3 fails, we have orphaned member and profile!

    return memberResult.rows[0];
}
```

### After (SAFE - With Transaction)
```typescript
import { withTransaction, executeQuery } from '../utils/dbHelpers';
import { mapRowToMember } from '../utils/mappers';

export async function createMemberWithProfile(data: MemberData) {
    return withTransaction(async (client) => {
        // Step 1: Create member
        const memberResult = await executeQuery(
            client,
            'INSERT INTO members (name, phone, email) VALUES ($1, $2, $3) RETURNING *',
            [data.name, data.phone, data.email]
        );
        const memberId = memberResult.rows[0].id;

        // Step 2: Create profile
        await executeQuery(
            client,
            'INSERT INTO alumni_profiles (membership_id, college, degree) VALUES ($1, $2, $3)',
            [memberId, data.college, data.degree]
        );

        // Step 3: Create embedding
        await executeQuery(
            client,
            'INSERT INTO member_embeddings (member_id, profile_embedding) VALUES ($1, $2)',
            [memberId, embedding]
        );

        // ✅ If ANY step fails, ALL are rolled back automatically

        return mapRowToMember(memberResult.rows[0]);
    });
}
```

**Benefits:** Data integrity, automatic rollback, safer code

---

## 🔄 Replace Magic Numbers with Constants

### Before
```typescript
// Scattered throughout code
if (query.length > 500) { ... }
if (page < 1) { ... }
if (limit > 100) { ... }
if (confidence < 0.3) { ... }
```

### After
```typescript
import { VALIDATION, PAGINATION } from '../config/constants';

if (query.length > VALIDATION.QUERY_MAX_LENGTH) { ... }
if (page < PAGINATION.MIN_PAGE) { ... }
if (limit > PAGINATION.MAX_LIMIT) { ... }
if (confidence < VALIDATION.CONFIDENCE_THRESHOLD) { ... }
```

**Find and replace these:**
- `500` → `VALIDATION.QUERY_MAX_LENGTH`
- `100` → `PAGINATION.MAX_LIMIT`
- `10` → `PAGINATION.DEFAULT_LIMIT`
- `0.3` → `VALIDATION.CONFIDENCE_THRESHOLD`
- `50` → `VALIDATION.MAX_RESULTS_MAX`

---

## 🔄 Replace Row Mapping with Mappers

### Before (Code Duplication)
```typescript
const members = result.rows.map(row => ({
    id: row.id,
    name: row.name,
    yearOfGraduation: row.year_of_graduation,
    degree: row.degree,
    branch: row.branch,
    workingAs: row.working_as,
    organization: row.organization,
    designation: row.designation,
    city: row.city,
    phone: row.phone,
    email: row.email,
    skills: row.skills,
    productsServices: row.products_services,
    annualTurnover: row.annual_turnover,
    role: row.role,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at
}));
```

### After (One Line)
```typescript
import { mapRowsToMembers } from '../utils/mappers';

const members = mapRowsToMembers(result.rows);
```

**Search for:** `map(row => ({` or `result.rows.map`
**Replace with:** Appropriate mapper function

---

## 🔄 Standardize Error Responses

### Before (Inconsistent)
```typescript
// Pattern 1
res.status(404).json({ success: false, message: "Not found" });

// Pattern 2
res.status(400).json({ error: "Invalid input" });

// Pattern 3
res.status(500).json({ success: false, error: { code: 'ERROR', message: 'Failed' } });
```

### After (Consistent)
```typescript
import { NotFoundError, ValidationError } from '../utils/errors';

throw new NotFoundError('Member', id);
throw new ValidationError('Invalid input', { field: 'phone' });
// Error middleware handles the rest
```

---

## 🔄 Add Global Error Handler

### In `app.ts` (or main server file)

```typescript
import { errorHandler, notFoundHandler } from './utils/errors';

// ... all your routes ...

// Add BEFORE server.listen()
app.use(notFoundHandler);  // 404 handler
app.use(errorHandler);     // Error handler

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
```

---

## 🔄 Quick Checklist for Refactoring a Controller

- [ ] Import `asyncHandler`, error classes, `successResponse`
- [ ] Import constants for validation
- [ ] Wrap handler in `asyncHandler()`
- [ ] Remove all `try-catch` blocks
- [ ] Replace `if (!found) return res.status(404)...` with `throw new NotFoundError()`
- [ ] Replace manual validation with `throw new ValidationError()`
- [ ] Replace `res.json({ success: true, ...})` with `successResponse(res, data)`
- [ ] Replace magic numbers with constants
- [ ] Test the endpoint

---

## 🔄 Quick Checklist for Refactoring a Service

- [ ] Import `withTransaction`, `executeQuery` if multi-step operation
- [ ] Import `mapRow*` functions for result mapping
- [ ] Wrap multi-step operations in `withTransaction()`
- [ ] Replace `query()` with `executeQuery(client, ...)` inside transaction
- [ ] Replace manual row mapping with mapper functions
- [ ] Replace hardcoded SQL with prepared statements
- [ ] Test rollback behavior (cause intentional error)

---

## 📝 Common Patterns to Search For

### Find files that need refactoring:

```bash
# Find controllers with try-catch (need asyncHandler)
grep -r "try {" src/controllers/

# Find magic numbers (need constants)
grep -rE "if \(.* [<>] [0-9]+" src/

# Find manual row mapping (need mappers)
grep -r "map(row => ({" src/services/

# Find queries without transactions (need withTransaction)
grep -r "await query(" src/services/

# Find inconsistent error responses
grep -r "res.status(4" src/controllers/
```

---

## ⚡ Quick Wins by File

### Priority 1: Controllers
- `memberController.ts` - 561 lines, lots of try-catch
- `communityController.ts` - Simple, good starting point
- `nlSearchController.ts` - Has magic numbers

### Priority 2: Services
- `memberService.ts` - Has repeated row mapping
- `groupService.ts` - May have multi-step operations

### Priority 3: Global
- `app.ts` - Add error handlers
- All route files - Use error middleware

---

## 🎯 Expected Results

After refactoring:
- **70% less boilerplate** in controllers
- **100% transaction safety** in services
- **Consistent error format** across all endpoints
- **Type-safe constants** everywhere
- **No code duplication** for common patterns

---

**Remember:** Start small, test often, one file at a time!
