# Lean Schema Community Creation - Postman Testing Guide

## Overview

This guide focuses specifically on testing the **Community Creation flow** aligned with the **lean schema**. The lean schema uses JSONB for profile data instead of separate tables.

## Collection File

📦 **File**: `Community_API_Tests.postman_collection.json`

## What Changed in Lean Schema?

### Old Schema (Deprecated)
```
communities
├── community_admins (separate table)
├── alumni_profiles (separate table)
├── entrepreneur_profiles (separate table)
└── apartment_residents (separate table)
```

### New Lean Schema
```
communities
└── community_memberships
    ├── role ('admin', 'super_admin', 'member')
    └── profile_data (JSONB - contains all type-specific data)
```

## Quick Setup

### 1. Import Collection

```bash
# In Postman:
1. Click "Import"
2. Select: Server/postman/Community_API_Tests.postman_collection.json
3. Done!
```

### 2. Set Variables

| Variable | Value | Description |
|----------|-------|-------------|
| `base_url` | `http://localhost:3000` | Your server URL |
| `community_id` | Auto-set | Saved from create response |

### 3. Start Server

```bash
cd Server
npm run dev
```

## Testing Scenarios

### Scenario 1: Create Alumni Community ✅

**Endpoint**: `POST {{base_url}}/api/community`

**Body**:
```json
{
  "name": "IIT Alumni Network",
  "slug": "iit-alumni-network",
  "type": "alumni",
  "description": "Network of IIT alumni across the globe",
  "subscription_plan": "basic",
  "member_limit": 500,
  "search_limit_monthly": 5000,
  "is_bot_enabled": true,
  "is_search_enabled": true,
  "is_embedding_enabled": true,
  "member_type_data": {
    "name": "John Doe",
    "phone": "+919876543210",
    "email": "john.doe@example.com",
    "graduation_year": 2015,
    "degree": "B.Tech",
    "department": "Computer Science",
    "college": "IIT Madras",
    "skills": ["Python", "Machine Learning", "Data Science"],
    "bio": "Software Engineer at Google"
  }
}
```

**What Happens**:
1. ✅ Member created in `members` table
2. ✅ Community created in `communities` table
3. ✅ Membership created in `community_memberships` with:
   - `member_type` = "alumni"
   - `role` = "admin"
   - `profile_data` = JSONB with graduation details
4. ✅ No separate `alumni_profiles` table used!

**Expected Response** (201):
```json
{
  "success": true,
  "data": {
    "community": {
      "id": "053b73c5-6aa5-459b-b429-496a06e1ccbc",
      "name": "IIT Alumni Network",
      "type": "alumni",
      "admins": [
        {
          "id": "2e828b8c-1e0a-47c5-9f10-b543ade72bb9",
          "name": "John Doe",
          "phone": "+919876543210",
          "email": "john.doe@example.com",
          "role": "admin",
          "joined_at": "2025-11-18T03:25:36.438159+05:30"
        }
      ]
    }
  }
}
```

**Verify in Database**:
```sql
-- Check profile data in JSONB
SELECT
  c.name AS community,
  m.name AS member,
  cm.member_type,
  cm.role,
  cm.profile_data
FROM communities c
JOIN community_memberships cm ON cm.community_id = c.id
JOIN members m ON m.id = cm.member_id
WHERE c.slug = 'iit-alumni-network';
```

Expected `profile_data`:
```json
{
  "bio": "Software Engineer at Google",
  "degree": "B.Tech",
  "skills": ["Python", "Machine Learning", "Data Science"],
  "college": "IIT Madras",
  "department": "Computer Science",
  "graduation_year": 2015
}
```

---

### Scenario 2: Create Entrepreneur Community ✅

**Body**:
```json
{
  "name": "Startup Founders Hub",
  "slug": "startup-founders-hub",
  "type": "entrepreneur",
  "description": "Community for startup founders",
  "member_type_data": {
    "name": "Jane Smith",
    "phone": "+919876543211",
    "email": "jane.smith@example.com",
    "company": "TechStartup Inc",
    "industry": "Technology",
    "position": "CEO & Founder",
    "skills": ["Leadership", "Product Management", "Fundraising"],
    "bio": "Serial entrepreneur with 3 successful exits"
  }
}
```

**What Happens**:
1. ✅ Member created
2. ✅ Community created
3. ✅ Membership with:
   - `member_type` = "entrepreneur"
   - `profile_data` = JSONB with company details

**Profile Data Structure**:
```json
{
  "bio": "Serial entrepreneur with 3 successful exits",
  "skills": ["Leadership", "Product Management", "Fundraising"],
  "company": "TechStartup Inc",
  "industry": "Technology",
  "position": "CEO & Founder"
}
```

---

### Scenario 3: Create Apartment Community ✅

**Body**:
```json
{
  "name": "Green Valley Apartments",
  "slug": "green-valley-apartments",
  "type": "apartment",
  "description": "Resident community",
  "member_type_data": {
    "name": "Bob Johnson",
    "phone": "+919876543212",
    "email": "bob.johnson@example.com",
    "apartment_number": "A-101",
    "floor": "1",
    "block": "A",
    "interests": ["Gardening", "Community Events"]
  }
}
```

**What Happens**:
1. ✅ Member created
2. ✅ Community created
3. ✅ Membership with:
   - `member_type` = "resident" (mapped from "apartment")
   - `profile_data` = JSONB with apartment details

**Profile Data Structure**:
```json
{
  "block": "A",
  "floor": "1",
  "interests": ["Gardening", "Community Events"],
  "apartment_number": "A-101"
}
```

---

### Scenario 4: Create Mixed Community ✅

**Body**:
```json
{
  "name": "Tech Enthusiasts Network",
  "slug": "tech-enthusiasts-network",
  "type": "mixed",
  "description": "Diverse tech community",
  "member_type_data": {
    "name": "Alex Chen",
    "phone": "+919876543213",
    "email": "alex.chen@example.com",
    "skills": ["JavaScript", "React", "Node.js"],
    "interests": ["Open Source", "AI/ML", "Web3"],
    "bio": "Full-stack developer and tech community organizer"
  }
}
```

**What Happens**:
1. ✅ Member created
2. ✅ Community created
3. ✅ Membership with:
   - `member_type` = "generic" (mapped from "mixed")
   - `profile_data` = JSONB with common fields

---

## Verify Lean Schema Alignment

### Test 1: Check No Old Tables Exist

```sql
-- These should NOT exist in lean schema
SELECT * FROM alumni_profiles;        -- ERROR: relation does not exist ✅
SELECT * FROM entrepreneur_profiles;  -- ERROR: relation does not exist ✅
SELECT * FROM community_admins;       -- ERROR: relation does not exist ✅
```

### Test 2: Verify JSONB Profile Storage

```sql
-- This SHOULD work
SELECT
  cm.member_type,
  cm.profile_data
FROM community_memberships cm
LIMIT 5;
```

### Test 3: Verify Admin Role in Memberships

```sql
-- Admins should be in community_memberships with role='admin'
SELECT
  c.name,
  m.name,
  cm.role
FROM communities c
JOIN community_memberships cm ON cm.community_id = c.id
JOIN members m ON m.id = cm.member_id
WHERE cm.role IN ('admin', 'super_admin');
```

### Test 4: Query JSONB Fields

```sql
-- Test JSONB querying (alumni)
SELECT
  m.name,
  cm.profile_data->>'college' AS college,
  cm.profile_data->>'graduation_year' AS year
FROM community_memberships cm
JOIN members m ON m.id = cm.member_id
WHERE cm.member_type = 'alumni';

-- Test JSONB querying (entrepreneur)
SELECT
  m.name,
  cm.profile_data->>'company' AS company,
  cm.profile_data->>'position' AS position
FROM community_memberships cm
JOIN members m ON m.id = cm.member_id
WHERE cm.member_type = 'entrepreneur';
```

---

## Common Profile Data Structures

### Alumni Type
```json
{
  "graduation_year": 2015,
  "degree": "B.Tech",
  "department": "Computer Science",
  "college": "IIT Madras",
  "skills": ["Python", "ML"],
  "interests": ["Teaching"],
  "bio": "Software Engineer"
}
```

### Entrepreneur Type
```json
{
  "company": "TechStartup Inc",
  "industry": "Technology",
  "position": "CEO & Founder",
  "skills": ["Leadership"],
  "interests": ["Mentoring"],
  "bio": "Serial entrepreneur"
}
```

### Apartment/Resident Type
```json
{
  "apartment_number": "A-101",
  "floor": "1",
  "block": "A",
  "interests": ["Gardening", "Events"]
}
```

### Generic/Mixed Type
```json
{
  "skills": ["JavaScript", "React"],
  "interests": ["Open Source"],
  "bio": "Full-stack developer"
}
```

---

## Error Testing

### Test 1: Duplicate Slug
**Request**: Create community with existing slug

**Expected**: 409 Conflict or constraint violation
```json
{
  "success": false,
  "error": {
    "message": "duplicate key value violates unique constraint",
    "code": "23505"
  }
}
```

### Test 2: Invalid Community Type
**Request**: Create with `"type": "invalid_type"`

**Expected**: 400 Bad Request or constraint violation

### Test 3: Missing Required Fields
**Request**: Create without `name`, `slug`, or `type`

**Expected**: 400 Bad Request

---

## Automated Test Script

You can also run the automated test script:

```bash
cd Server
npm run test:community
```

**Output**:
```
✅ Alumni Community Created
✅ Entrepreneur Community Created
✅ Apartment Community Created
✅ All Tests Passed!
📊 Summary:
   - Communities created: 3
   - Members created: 3
   - Memberships created: 3
   - All data stored in lean schema (JSONB profile_data)
```

---

## Troubleshooting

### Issue: "alumni_profiles does not exist"
**Cause**: Old code trying to use deprecated tables
**Solution**: Ensure you're using the updated service layer with JSONB

### Issue: "profile_data is null"
**Cause**: `buildProfileData()` not called
**Solution**: Verify `createCommunity()` calls `buildProfileData()`

### Issue: "Admins array is empty"
**Cause**: Query not joining with community_memberships
**Solution**: Use updated `getCommunityById()` query

### Issue: "Member type is 'apartment' instead of 'resident'"
**Cause**: Incorrect mapping in `addMembership()`
**Solution**: Verify mapping: `apartment` → `resident`

---

## Summary

### ✅ What's Working
- Community creation with JSONB profile storage
- Admin role stored in `community_memberships.role`
- No separate profile tables needed
- Type-specific data in flexible JSONB format

### 📊 Verified Flows
1. Alumni: graduation_year, degree, department, college → JSONB
2. Entrepreneur: company, industry, position → JSONB
3. Apartment: apartment_number, floor, block → JSONB (type: resident)
4. Mixed: generic fields → JSONB (type: generic)

### 🎯 Next Steps
- Test member addition to existing communities
- Test profile data updates via JSONB
- Test JSONB indexing and query performance
- Align other flows (search, embeddings) with lean schema

---

**Happy Testing!** 🚀
