# Postman Collection - Quick Reference Card

## 📦 Files
- `Community_API_Tests.postman_collection.json` - Lean schema community tests
- `CommunityConnect_API.postman_collection.json` - Full API tests
- `CommunityConnect_Local.postman_environment.json` - Environment variables

## 🚀 Quick Start

### Import in Postman
```
1. Click Import
2. Drag: Community_API_Tests.postman_collection.json
3. Set base_url = http://localhost:3000
4. Start testing!
```

### Run Server
```bash
cd Server
npm run dev
```

---

## 📋 Test Order

### Basic Flow
1. **Create Alumni Community** → Saves `community_id`
2. **Get All Communities** → Verify creation
3. **Get Community by ID** → View details
4. **Update Community** → Modify fields
5. **Delete Community** → Soft delete

---

## 🎯 Key Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/community` | Create community |
| GET | `/api/community` | List all communities |
| GET | `/api/community/:id` | Get single community |
| PUT | `/api/community/:id` | Update community |
| DELETE | `/api/community/:id` | Soft delete |

---

## 📝 Request Bodies

### Alumni Community
```json
{
  "name": "IIT Alumni Network",
  "slug": "iit-alumni-network",
  "type": "alumni",
  "member_type_data": {
    "name": "John Doe",
    "phone": "+919876543210",
    "email": "john@example.com",
    "graduation_year": 2015,
    "degree": "B.Tech",
    "department": "CS",
    "college": "IIT Madras",
    "skills": ["Python"],
    "bio": "Engineer"
  }
}
```

### Entrepreneur Community
```json
{
  "name": "Founders Hub",
  "slug": "founders-hub",
  "type": "entrepreneur",
  "member_type_data": {
    "name": "Jane Smith",
    "phone": "+919876543211",
    "email": "jane@example.com",
    "company": "TechStartup",
    "industry": "Technology",
    "position": "CEO",
    "skills": ["Leadership"],
    "bio": "Entrepreneur"
  }
}
```

### Apartment Community
```json
{
  "name": "Green Apartments",
  "slug": "green-apartments",
  "type": "apartment",
  "member_type_data": {
    "name": "Bob Johnson",
    "phone": "+919876543212",
    "email": "bob@example.com",
    "apartment_number": "A-101",
    "floor": "1",
    "block": "A",
    "interests": ["Gardening"]
  }
}
```

---

## ✅ Expected Responses

### Success (201)
```json
{
  "success": true,
  "data": {
    "community": {
      "id": "uuid",
      "name": "IIT Alumni Network",
      "type": "alumni",
      "admins": [...]
    }
  }
}
```

### Error (404)
```json
{
  "success": false,
  "error": {
    "message": "Community not found",
    "code": "NOT_FOUND"
  }
}
```

---

## 🗄️ Database Verification

### Check communities
```sql
SELECT * FROM communities ORDER BY created_at DESC;
```

### Check profile data (JSONB)
```sql
SELECT
  c.name,
  m.name,
  cm.member_type,
  cm.role,
  cm.profile_data
FROM communities c
JOIN community_memberships cm ON cm.community_id = c.id
JOIN members m ON m.id = cm.member_id;
```

### Check admins
```sql
SELECT
  c.name,
  m.name,
  cm.role
FROM communities c
JOIN community_memberships cm ON cm.community_id = c.id
JOIN members m ON m.id = cm.member_id
WHERE cm.role IN ('admin', 'super_admin');
```

---

## 🧪 Run Automated Tests

```bash
npm run test:community
```

Expected output:
```
✅ Alumni Community Created
✅ Entrepreneur Community Created
✅ Apartment Community Created
✅ All Tests Passed!
```

---

## 🔑 Variables

| Variable | Value | Auto-Set? |
|----------|-------|-----------|
| `base_url` | `http://localhost:3000` | No |
| `community_id` | UUID | Yes (from create) |

---

## 🐛 Common Issues

| Issue | Solution |
|-------|----------|
| Connection refused | Start server: `npm run dev` |
| Community not found | Run "Get All" to set `community_id` |
| Duplicate slug | Change slug to unique value |
| Invalid phone | Use format: `+91XXXXXXXXXX` |

---

## 📚 Documentation

- **Full Guide**: `LEAN_SCHEMA_COMMUNITY_TESTS.md`
- **General Tests**: `README.md`
- **API Docs**: `/docs/api.md`
- **Schema**: `/docs/CommunityConnect_LEAN_SCHEMA.sql`

---

## 🎯 Lean Schema Key Points

✅ Profile data in **JSONB** (no separate tables)
✅ Admins via **role** field (not separate table)
✅ Type mapping: apartment → resident, mixed → generic
✅ Flexible schema for different community types

---

**Quick Help**
```bash
# Fresh database
npm run db:fresh

# Import members
npm run import:members:lean

# Generate embeddings
npm run generate:embeddings:lean

# Test community flow
npm run test:community

# Start server
npm run dev
```
