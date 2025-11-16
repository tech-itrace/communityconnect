# Testing Guide - Phase 1 & 2 Refactoring

This guide helps you test all the improvements made during Phase 1 and Phase 2 refactoring.

---

## 🎯 What We're Testing

### Phase 1 Changes
1. ✅ Global error handler (app.ts)
2. ✅ Refactored communityController (asyncHandler)
3. ✅ Removed duplicated mappings (memberService)
4. ✅ Replaced magic numbers with constants

### Phase 2 Changes
1. ✅ Refactored memberController (asyncHandler, 561→343 lines)
2. ✅ Transaction safety in groupService
3. ✅ Extracted embeddingService from semanticSearch
4. ✅ Used PAGINATION and VALIDATION constants everywhere

---

## 🔍 Test 1: Error Handling Consistency

**Goal**: Verify all refactored endpoints return consistent error format

### Test Cases

#### 1.1 Invalid UUID Format
```bash
# Using Postman:
GET {{base_url}}/api/members/invalid-uuid
Header: phone = 919840061561

# Expected Response (400):
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid member ID format - must be a valid UUID"
  }
}
```

✅ **Pass Criteria**:
- Status code is 400
- Error has `code`, `message` fields
- Code is "VALIDATION_ERROR"

#### 1.2 Resource Not Found
```bash
GET {{base_url}}/api/members/00000000-0000-0000-0000-000000000000
Header: phone = 919840061561

# Expected Response (404):
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Member not found: 00000000-0000-0000-0000-000000000000"
  }
}
```

✅ **Pass Criteria**:
- Status code is 404
- Error code is "NOT_FOUND"
- Message includes the ID

#### 1.3 Duplicate Resource
```bash
# First create a member
POST {{base_url}}/api/members
Header: phone = 919840061561
Body: {
  "phone": "919111111111",
  "name": "Test User"
}

# Then try creating same member again
POST {{base_url}}/api/members
Header: phone = 919840061561
Body: {
  "phone": "919111111111",  # Same phone!
  "name": "Duplicate User"
}

# Expected Response (409):
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "A member with this phone number already exists",
    "details": {
      "phone": "919111111111"
    }
  }
}
```

✅ **Pass Criteria**:
- Status code is 409
- Error code is "CONFLICT"
- Details include the conflicting phone

---

## 🔢 Test 2: Constants Validation

**Goal**: Verify magic numbers replaced with centralized constants

### Test Cases

#### 2.1 Pagination Limits
```bash
# Test exceeding MAX_LIMIT (100)
GET {{base_url}}/api/members?limit=150
Header: phone = 919840061561

# Expected Response (400):
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Limit must be between 1 and 100",
    "details": { "limit": 150 }
  }
}
```

✅ **Pass Criteria**:
- Error message references "100" (PAGINATION.MAX_LIMIT)
- Not a hardcoded value in response

#### 2.2 Query Length Limit
```bash
# Create a 501-character query
POST {{base_url}}/api/search/query
Body: {
  "phoneNumber": "919840061561",
  "query": "<501 characters long string>"
}

# Expected Response (400):
{
  "success": false,
  "error": {
    "code": "QUERY_TOO_LONG",
    "message": "Query must be less than 500 characters",
    "details": {
      "length": 501,
      "maxLength": 500
    }
  }
}
```

✅ **Pass Criteria**:
- Message references "500" (VALIDATION.QUERY_MAX_LENGTH)
- Details show both actual and max length

#### 2.3 Search Results Limit
```bash
POST {{base_url}}/api/search/query
Body: {
  "phoneNumber": "919840061561",
  "query": "Find developers",
  "options": {
    "maxResults": 100  # Exceeds MAX_RESULTS_MAX (50)
  }
}

# Expected Response (400):
{
  "success": false,
  "error": {
    "code": "INVALID_MAX_RESULTS",
    "message": "maxResults must be between 1 and 50",
    "details": { "maxResults": 100 }
  }
}
```

✅ **Pass Criteria**:
- Message references "50" (VALIDATION.MAX_RESULTS_MAX)
- Error triggered before search execution

---

## 🔄 Test 3: Transaction Safety

**Goal**: Verify multi-step operations rollback on failure

### Test Cases

#### 3.1 Community Creation (Success)
```bash
POST {{base_url}}/api/communities
Header: phone = 919840061561
Body: {
  "name": "Test Community Success",
  "type": "alumni",
  "admins": [
    {
      "name": "Admin User",
      "phone": "919111111111",
      "email": "admin@test.com"
    }
  ],
  "member_type_data": {
    "college": "Test College",
    "graduation_year": 2020,
    "degree": "B.Tech",
    "department": "CS"
  }
}

# Expected: Success (201)
# Verify in DB:
# - Community created
# - Member created
# - Alumni profile created
# - Membership linked
```

✅ **Pass Criteria**:
- Status 201
- Community returned with ID
- All related records in DB

#### 3.2 Community Creation (Rollback Test)
```bash
# Create with invalid data to trigger failure
POST {{base_url}}/api/communities
Header: phone = 919840061561
Body: {
  "name": "Test Community Fail",
  "type": "alumni",
  "admins": [
    {
      "name": "Admin One",
      "phone": "919222222222",
      "email": "admin1@test.com"
    },
    {
      # Invalid phone format to trigger error
      "name": "Admin Two",
      "phone": "INVALID_PHONE",
      "email": "admin2@test.com"
    }
  ],
  "member_type_data": {
    "college": "Test College",
    "graduation_year": 2020,
    "degree": "B.Tech",
    "department": "CS"
  }
}

# Expected: Error (500)
# Verify in DB:
# - No community created
# - No members created
# - No profiles created
# - FULL ROLLBACK!
```

✅ **Pass Criteria**:
- Request fails
- **NO orphaned records** in database
- All tables remain unchanged

#### 3.3 Group Member Addition (Transaction)
```bash
# First create a group
POST {{base_url}}/api/groups
Header: phone = 919840061561
Body: {
  "name": "Test Group",
  "description": "Testing transaction safety"
}
# Save the group_id from response

# Add members to group
POST {{base_url}}/api/groups/{{group_id}}/members
Header: phone = 919840061561
Body: {
  "members": [
    {
      "name": "Member One",
      "phone": "919333333333",
      "email": "member1@test.com"
    },
    {
      "name": "Member Two",
      "phone": "919444444444",
      "email": "member2@test.com"
    }
  ]
}

# Expected: Success
# All members added atomically
```

✅ **Pass Criteria**:
- Both members added OR none added
- No partial state (one added, one failed)
- Response shows success/duplicate counts

---

## 🔍 Test 4: Embedding Service Extraction

**Goal**: Verify search still works with extracted embeddingService

### Test Cases

#### 4.1 Natural Language Search
```bash
POST {{base_url}}/api/search/query
Body: {
  "phoneNumber": "919840061561",
  "query": "Find React developers in Chennai",
  "options": {
    "maxResults": 10
  }
}

# Expected Response (200):
{
  "success": true,
  "query": "Find React developers in Chennai",
  "understanding": {
    "intent": "find_members",
    "entities": {
      "skills": ["React"],
      "location": "Chennai"
    },
    "confidence": 0.85
  },
  "results": {
    "members": [...],
    "pagination": {...}
  },
  "executionTime": 1200  # First query: 1-2s (embedding generation)
}
```

✅ **Pass Criteria**:
- Search executes successfully
- Embedding generated (check logs for "[Embedding Service]")
- Results returned with relevance scores

#### 4.2 Semantic Search
```bash
POST {{base_url}}/api/search/members
Header: phone = 919840061561
Body: {
  "query": "experienced full stack developer",
  "searchType": "hybrid",
  "limit": 10
}

# Expected: Success (200)
# Results with semantic similarity scores
```

✅ **Pass Criteria**:
- Hybrid search works
- Uses embeddingService (check logs)
- Response time reasonable (<2s first time, <500ms cached)

#### 4.3 Embedding Fallback (Optional)
```bash
# Temporarily disable DeepInfra API key in .env
# DEEPINFRA_API_KEY=invalid_key_to_test_fallback

# Run NL search again
POST {{base_url}}/api/search/query
Body: {
  "phoneNumber": "919840061561",
  "query": "test fallback"
}

# Expected:
# - DeepInfra fails
# - Falls back to Gemini
# - Search still succeeds
# Check logs for: "DeepInfra failed, trying Gemini fallback"
```

✅ **Pass Criteria**:
- Search succeeds despite primary provider failure
- Logs show fallback activation
- Gemini used for embedding

---

## 📦 Test 5: Bulk Import (CSV)

**Goal**: Test CSV import with error tracking

### Test Cases

#### 5.1 Successful Import
```bash
# Use sample_members.csv file
POST {{base_url}}/api/members/bulk/import
Header: phone = 919840061561
Body: form-data
Key: file
Value: <select sample_members.csv>

# Expected Response (201):
{
  "success": true,
  "message": "Bulk import completed: 15 members imported successfully",
  "data": {
    "successCount": 15,
    "failedCount": 0,
    "duplicates": 0,
    "totalProcessed": 15,
    "errors": []
  }
}
```

✅ **Pass Criteria**:
- All valid records imported
- Success count matches CSV row count
- No errors array

#### 5.2 Import with Duplicates
```bash
# Import same CSV again
POST {{base_url}}/api/members/bulk/import
Header: phone = 919840061561
Body: form-data
Key: file
Value: <select sample_members.csv>

# Expected Response (201):
{
  "success": true,
  "message": "Bulk import completed: 0 members imported successfully",
  "data": {
    "successCount": 0,
    "failedCount": 15,
    "duplicates": 15,
    "totalProcessed": 15,
    "errors": [
      {
        "row": 1,
        "error": "Member with this phone number already exists",
        "data": {...}
      },
      ...
    ]
  }
}
```

✅ **Pass Criteria**:
- Duplicate count = 15
- No members created
- Errors list all duplicates

#### 5.3 Import with Invalid Data
```bash
# Create CSV with missing required fields
phone,name,email
919555555555,,test@test.com    # Missing name
,Invalid User,invalid@test.com   # Missing phone

# Import
POST {{base_url}}/api/members/bulk/import
...

# Expected: Failures for invalid rows
```

✅ **Pass Criteria**:
- Invalid rows skipped
- Valid rows imported
- Errors list reasons for failures

---

## 🎨 Test 6: Code Quality (Manual Inspection)

### Test Cases

#### 6.1 No Try-Catch in Controllers
```typescript
// Check memberController.ts and communityController.ts
// Should NOT see any try-catch blocks
// All handlers wrapped in asyncHandler()

// ✅ Good (after refactoring):
export const getMemberByIdHandler = asyncHandler(async (req, res) => {
  const member = await getMemberById(req.params.id);
  assertFound(member, 'Member', req.params.id);
  successResponse(res, { member });
});

// ❌ Bad (before refactoring):
export async function getMemberByIdHandler(req, res) {
  try {
    const member = await getMemberById(req.params.id);
    if (!member) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json({ success: true, member });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
}
```

✅ **Pass Criteria**:
- Zero try-catch in refactored controllers
- All use asyncHandler wrapper
- Consistent error throwing (not manual JSON)

#### 6.2 Constants Usage
```typescript
// Check for magic numbers in code
// Should use PAGINATION, VALIDATION, etc.

// ✅ Good:
const limit = Math.min(req.query.limit || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);

// ❌ Bad:
const limit = Math.min(req.query.limit || 10, 100);
```

✅ **Pass Criteria**:
- No hardcoded 10, 50, 100, 500 in controllers
- All use named constants
- Easy to change limits in one place

#### 6.3 Mapper Usage
```typescript
// Check memberService.ts
// Should use mappers, not manual mapping

// ✅ Good:
const members = mapRowsToMembers(result.rows);

// ❌ Bad:
const members = result.rows.map(row => ({
  id: row.id,
  name: row.name,
  // ... 15 more lines
}));
```

✅ **Pass Criteria**:
- No repeated row mapping
- mapRowToMember() used consistently
- DRY principle followed

---

## 📊 Test 7: Performance

**Goal**: Verify refactoring didn't slow down endpoints

### Test Cases

#### 7.1 Member CRUD Performance
```bash
# Measure response times
GET {{base_url}}/api/members/:id
# Expected: <100ms

GET {{base_url}}/api/members?limit=50
# Expected: <300ms

POST {{base_url}}/api/members
# Expected: <200ms
```

✅ **Pass Criteria**:
- No significant slowdown vs before
- asyncHandler overhead negligible
- Most endpoints still <500ms

#### 7.2 Transaction Overhead
```bash
# Community creation (with transaction)
POST {{base_url}}/api/communities
# Expected: <1000ms (reasonable for multi-step)

# Group member addition (with transaction)
POST {{base_url}}/api/groups/:id/members
# Expected: <800ms for 5 members
```

✅ **Pass Criteria**:
- Transaction overhead acceptable (<200ms)
- Still faster than making separate API calls
- Reliability worth the small overhead

---

## ✅ Summary Checklist

### Error Handling
- [ ] All errors have consistent format (success, error.code, error.message)
- [ ] Invalid UUID returns 400 with VALIDATION_ERROR
- [ ] Not found returns 404 with NOT_FOUND
- [ ] Duplicates return 409 with CONFLICT
- [ ] Server errors return 500 with proper structure

### Constants
- [ ] Pagination limits use PAGINATION constants
- [ ] Query length uses VALIDATION constants
- [ ] No magic numbers in controllers
- [ ] Easy to change limits in config/constants.ts

### Transactions
- [ ] Community creation is atomic (all or nothing)
- [ ] Group member addition is atomic
- [ ] No orphaned records on failure
- [ ] Rollback works correctly

### Embedding Service
- [ ] NL search works with extracted service
- [ ] Semantic search works
- [ ] Fallback to Gemini works (optional test)
- [ ] Performance acceptable

### Bulk Import
- [ ] Valid CSV imports successfully
- [ ] Duplicates detected and skipped
- [ ] Invalid rows tracked in errors
- [ ] Partial success handled correctly

### Code Quality
- [ ] No try-catch in refactored controllers
- [ ] asyncHandler used everywhere
- [ ] Constants used instead of magic numbers
- [ ] Mappers used instead of manual mapping

### Performance
- [ ] Response times acceptable
- [ ] No significant slowdown
- [ ] Transaction overhead reasonable

---

## 🎉 Success Criteria

**All tests passing** = Refactoring successful! ✅

Your codebase now has:
- ✅ Consistent error handling
- ✅ Transaction safety
- ✅ Modular code (extracted services)
- ✅ Centralized configuration
- ✅ Much better maintainability

**Ready for production!** 🚀
