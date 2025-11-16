# CommunityConnect API - Postman Collection

Complete Postman collection for testing the refactored CommunityConnect API.

## 📦 What's Included

- **Collection**: `CommunityConnect_API.postman_collection.json`
- **Environment**: `CommunityConnect_Local.postman_environment.json`
- **70+ API endpoints** organized by feature
- **Sample requests & responses** for all endpoints
- **Auto-tests** for response validation
- **Environment variables** for easy switching

---

## 🚀 Quick Start

### 1. Import to Postman

1. Open Postman
2. Click **Import** button
3. Drag and drop both files:
   - `CommunityConnect_API.postman_collection.json`
   - `CommunityConnect_Local.postman_environment.json`

### 2. Set Environment

1. Click environment dropdown (top right)
2. Select **"CommunityConnect - Local"**
3. Update `admin_phone` if different from default (919840061561)

### 3. Start Testing

The collection is organized into folders:
- **Members** - Member CRUD operations
- **Communities** - Community management
- **Groups** - Group operations
- **Search** - Semantic & NL search
- **Admin** - Admin operations
- **Analytics** - Statistics & reports

---

## 🔑 Authentication

Most endpoints require authentication via **phone number in header**:

```
Header: phone
Value: 919840061561
```

### Test Users

**Super Admin** (full access):
- Phone: `919840061561`
- Can: Create/update/delete all resources

**Test Member** (limited access):
- Phone: `919876543210`
- Can: Read resources, update own profile

---

## 📋 Testing Workflow

### Scenario 1: Create & Manage Members

1. **Create Member** → Save `member_id` to environment
   ```json
   POST /api/members
   {
     "phone": "919999999999",
     "name": "Test User",
     "email": "test@example.com"
   }
   ```

2. **Get Member by ID** → Verify creation
   ```
   GET /api/members/{{member_id}}
   ```

3. **Update Member** → Modify fields
   ```json
   PUT /api/members/{{member_id}}
   {
     "city": "Mumbai",
     "designation": "Senior Engineer"
   }
   ```

4. **Get All Members** → Check filters
   ```
   GET /api/members?city=Mumbai&sortBy=name
   ```

### Scenario 2: Create Community (Transaction Test)

This tests the **transaction safety** feature:

```json
POST /api/communities
Header: phone = 919840061561

{
  "name": "Tech Community",
  "type": "alumni",
  "admins": [
    {
      "name": "Admin One",
      "phone": "919111111111",
      "email": "admin1@test.com"
    }
  ],
  "member_type_data": {
    "college": "Test College",
    "graduation_year": 2020,
    "degree": "B.Tech",
    "department": "CS"
  }
}
```

**What happens**:
1. Community created
2. Admin member created (or found if exists)
3. Alumni profile created
4. Membership linked

**If ANY step fails → Everything rolls back!** ✅

### Scenario 3: Bulk Import Members

1. **Prepare CSV file** with columns:
   ```
   phone,name,email,city,degree,branch
   919111111111,User One,user1@test.com,Chennai,B.Tech,CS
   919222222222,User Two,user2@test.com,Mumbai,M.Tech,EC
   ```

2. **Import CSV**:
   ```
   POST /api/members/bulk/import
   Header: phone = 919840061561
   Body: form-data
   Key: file
   Value: <select CSV file>
   ```

3. **Check Results**:
   ```json
   {
     "successCount": 45,
     "failedCount": 5,
     "duplicates": 3,
     "errors": [...]
   }
   ```

### Scenario 4: Natural Language Search

Test the AI-powered search:

```json
POST /api/search/query

{
  "phoneNumber": "919840061561",
  "query": "Find React developers in Chennai with 5+ years experience",
  "options": {
    "maxResults": 10,
    "includeResponse": true
  }
}
```

**Response includes**:
- AI understanding of query
- Matched members with relevance scores
- Conversational response
- Follow-up suggestions

### Scenario 5: Test Error Handling

All refactored endpoints return **consistent error format**:

**Invalid UUID**:
```
GET /api/members/invalid-id
→ 400 Bad Request
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid member ID format - must be a valid UUID"
  }
}
```

**Not Found**:
```
GET /api/members/00000000-0000-0000-0000-000000000000
→ 404 Not Found
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Member not found: 00000000-0000-0000-0000-000000000000"
  }
}
```

**Duplicate Resource**:
```
POST /api/members (with existing phone)
→ 409 Conflict
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "A member with this phone number already exists",
    "details": { "phone": "919876543210" }
  }
}
```

---

## 🎯 Key Features to Test

### 1. Constants Usage

All endpoints now use centralized constants:

- **Pagination**: `limit` must be 1-100 (PAGINATION.MAX_LIMIT)
- **Query Length**: Max 500 chars (VALIDATION.QUERY_MAX_LENGTH)
- **Max Results**: 1-50 for search (VALIDATION.MAX_RESULTS_MAX)

**Test**: Try exceeding limits and verify error messages reference constants.

### 2. Transaction Safety

Endpoints with multi-step operations now use transactions:

**Community Creation**:
- Creates community → members → profiles → memberships
- If ANY fails → ALL rollback

**Group Member Addition**:
- Checks existing → creates new → adds to group
- If ANY fails → ALL rollback

**Test**: Try creating community with invalid data mid-transaction and verify rollback.

### 3. Embedding Service

Search endpoints now use extracted `embeddingService`:

**Endpoints using embeddings**:
- `POST /api/search/query` (NL search)
- `POST /api/search/members` (semantic search)

**Features**:
- Primary: DeepInfra
- Fallback: Google Gemini
- Auto-retry on rate limits

**Test**: Verify search still works, check response times.

### 4. Error Handling Consistency

All refactored endpoints return same error structure:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": { /* additional context */ }
  }
}
```

**Test different error scenarios**:
- ✅ Invalid input (400 - VALIDATION_ERROR)
- ✅ Unauthorized (403 - UNAUTHORIZED)
- ✅ Not found (404 - NOT_FOUND)
- ✅ Duplicate (409 - CONFLICT)
- ✅ Server error (500 - SERVER_ERROR)

---

## 📊 Auto-Tests

The collection includes auto-tests that run on every request:

### Response Time Test
```javascript
pm.test('Response time is acceptable', function () {
    pm.expect(pm.response.responseTime).to.be.below(3000);
});
```

### Structure Test
```javascript
pm.test('Response has success field', function () {
    pm.expect(pm.response.json()).to.have.property('success');
});
```

### Error Format Test
```javascript
if (pm.response.code >= 400) {
    pm.test('Error has proper structure', function () {
        const jsonData = pm.response.json();
        pm.expect(jsonData.error).to.have.property('code');
        pm.expect(jsonData.error).to.have.property('message');
    });
}
```

**View test results** in the "Test Results" tab after each request.

---

## 🔧 Environment Variables

### Pre-configured Variables

| Variable | Default Value | Description |
|----------|---------------|-------------|
| `base_url` | http://localhost:3000 | API base URL |
| `admin_phone` | 919840061561 | Super admin phone |
| `test_member_phone` | 919876543210 | Test member phone |
| `member_id` | (empty) | Set after creating member |
| `community_id` | (empty) | Set after creating community |
| `group_id` | (empty) | Set after creating group |

### Setting Variables from Response

After creating a resource, save the ID:

**In Tests tab**:
```javascript
const jsonData = pm.response.json();
pm.environment.set('member_id', jsonData.member.id);
```

Then use in subsequent requests:
```
GET /api/members/{{member_id}}
```

---

## 📝 Sample Data

### Member CSV Template

For bulk import testing:

```csv
phone,name,email,city,working_knowledge,degree,branch,organization_name,designation
919111111111,Alice Johnson,alice@test.com,Chennai,"React,Node.js,MongoDB",B.Tech,CS,TechCorp,Senior Developer
919222222222,Bob Smith,bob@test.com,Mumbai,"Python,Django,PostgreSQL",M.Tech,EC,StartupXYZ,Tech Lead
919333333333,Carol White,carol@test.com,Bangalore,"Java,Spring,AWS",B.Tech,IT,Enterprise Inc,Architect
```

### Community Creation Template

```json
{
  "name": "Alumni Network",
  "description": "Professional network for alumni",
  "type": "alumni",
  "rules": "Be respectful and professional at all times",
  "is_bot_enable": true,
  "created_by": "{{admin_phone}}",
  "admins": [
    {
      "name": "Primary Admin",
      "phone": "{{admin_phone}}",
      "email": "admin@alumni.com"
    }
  ],
  "member_type_data": {
    "college": "Example University",
    "graduation_year": 2018,
    "degree": "B.Tech",
    "department": "Computer Science",
    "current_organization": "Tech Company",
    "designation": "Software Engineer"
  }
}
```

---

## 🐛 Troubleshooting

### Issue: "Unauthorized" errors

**Solution**: Check phone header is set correctly
```
Header: phone
Value: 919840061561
```

### Issue: "Member not found"

**Solution**: Use valid member ID from database
```sql
SELECT id FROM members LIMIT 1;
```

### Issue: Slow response times

**Cause**: Embedding generation (first search query)
**Expected**: 1-2 seconds for first search, <500ms after
**Solution**: Embeddings are cached after first generation

### Issue: CSV import fails

**Check**:
1. File has required columns: phone, name
2. Phone numbers are valid (12 digits starting with 91)
3. File encoding is UTF-8
4. No empty required fields

---

## 📈 Performance Benchmarks

Expected response times after Phase 1 & 2 refactoring:

| Endpoint | Expected Time | Notes |
|----------|---------------|-------|
| GET /api/members/:id | <100ms | Simple query |
| GET /api/members | <200ms | With pagination |
| POST /api/members | <150ms | Single insert |
| POST /api/members/bulk/import | <5s | For 50 records |
| POST /api/communities | <500ms | Transaction with 3 members |
| POST /api/search/query | 1-2s | First query (embedding gen) |
| POST /api/search/query | <500ms | Subsequent queries |
| POST /api/search/members | <800ms | Hybrid search |

---

## ✅ Testing Checklist

### Core Features
- [ ] Create member with valid data
- [ ] Create member with duplicate phone (should fail with 409)
- [ ] Get member by valid UUID
- [ ] Get member by invalid UUID (should fail with 400)
- [ ] Update member
- [ ] Delete member (super admin only)
- [ ] Bulk import CSV (50+ records)

### Transaction Safety
- [ ] Create community successfully
- [ ] Create community with invalid admin data (should rollback)
- [ ] Add members to group successfully
- [ ] Add members to group with duplicate (should skip, not fail)

### Search Features
- [ ] Natural language search with simple query
- [ ] Natural language search with complex query
- [ ] Semantic search with filters
- [ ] Verify embedding fallback (disable DeepInfra key temporarily)

### Error Handling
- [ ] Verify all 400 errors have VALIDATION_ERROR code
- [ ] Verify all 404 errors have NOT_FOUND code
- [ ] Verify all 409 errors have CONFLICT code
- [ ] Verify error messages are descriptive

### Constants Validation
- [ ] Page number must be >= 1
- [ ] Limit must be 1-100 for pagination
- [ ] Query length must be <= 500 for NL search
- [ ] Max results must be 1-50 for search

---

## 🎉 Summary

This collection tests **all refactored endpoints** from Phase 1 & 2:

✅ **2 refactored controllers** (member, community)
✅ **5 improved services** (member, community, group, embedding, search)
✅ **Transaction safety** in multi-step operations
✅ **Consistent error handling** across all endpoints
✅ **Centralized constants** usage
✅ **Extracted embedding service** for modularity

**Happy Testing!** 🚀
