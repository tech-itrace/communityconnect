# Community Member Addition - API Endpoints

## Overview

This document describes the REST API endpoints for adding and managing members in communities using the lean schema.

## Base URL

```
http://localhost:3000/api/community
```

---

## Endpoints

### 1. Add Member to Community

**POST** `/api/community/:id/members`

Adds a new member to a community. Creates the member in the `members` table if they don't exist, then creates a membership in `community_memberships` with profile data stored in JSONB.

**Headers:**
```
Content-Type: application/json
```

**URL Parameters:**
- `id` (UUID) - Community ID

**Request Body:**
```json
{
  "member_data": {
    "name": "John Alumni",
    "phone": "+919900000002",
    "email": "john@alumni.com"
  },
  "member_type": "alumni",
  "profile_data": {
    "graduation_year": 2018,
    "degree": "M.Tech",
    "department": "Electrical Engineering",
    "college": "Test College",
    "skills": ["Python", "Data Science", "ML"],
    "bio": "Data scientist with 5 years experience"
  },
  "role": "member",
  "invited_by": "uuid-of-inviter"
}
```

**Field Descriptions:**
- `member_data` (required):
  - `name` (required): Member's full name
  - `phone` (required): Phone number (must be unique)
  - `email` (optional): Email address

- `member_type` (optional): One of `alumni`, `entrepreneur`, `resident`, `generic`
  - If not provided, inferred from community type

- `profile_data` (optional): Type-specific profile data stored as JSONB
  - **Alumni**: graduation_year, degree, department, college, skills, bio
  - **Entrepreneur**: company, industry, position, skills, bio
  - **Resident** (apartment): apartment_number, floor, block, interests
  - **Generic** (mixed): skills, interests, bio

- `role` (optional): `member`, `admin`, or `super_admin` (default: `member`)

- `invited_by` (optional): UUID of the member who invited this member

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "membership": {
      "id": "382d50a6-6a39-462c-9636-108fc246a766",
      "community_id": "3b62355d-feb7-45fa-bda0-1996a4454372",
      "member_id": "fec32516-366d-49bf-ab6a-b3e5cd399942",
      "member_type": "alumni",
      "role": "member",
      "profile_data": {
        "graduation_year": 2018,
        "degree": "M.Tech",
        "department": "Electrical Engineering",
        "college": "Test College",
        "skills": ["Python", "Data Science", "ML"],
        "bio": "Data scientist with 5 years experience"
      },
      "is_active": true,
      "joined_at": "2025-11-18T04:00:00Z",
      "updated_at": "2025-11-18T04:00:00Z",
      "invited_by": null,
      "invitation_accepted_at": null
    },
    "member": {
      "id": "fec32516-366d-49bf-ab6a-b3e5cd399942",
      "name": "John Alumni",
      "phone": "+919900000002",
      "email": "john@alumni.com"
    }
  }
}
```

**Error Responses:**

- **400 Bad Request** - Missing required fields
```json
{
  "success": false,
  "error": {
    "message": "Member data with name and phone is required"
  }
}
```

- **404 Not Found** - Community doesn't exist
```json
{
  "success": false,
  "error": {
    "message": "Community not found: {id}"
  }
}
```

- **409 Conflict** - Member already in community
```json
{
  "success": false,
  "error": {
    "message": "Member +919900000002 is already part of this community"
  }
}
```

---

### 2. Get Community Members

**GET** `/api/community/:id/members`

Retrieves all members of a community with their profile data.

**URL Parameters:**
- `id` (UUID) - Community ID

**Query Parameters:**
- `member_type` (optional): Filter by member type (`alumni`, `entrepreneur`, `resident`, `generic`)
- `role` (optional): Filter by role (`member`, `admin`, `super_admin`)
- `is_active` (optional): Filter by active status (`true` or `false`)

**Examples:**
```
GET /api/community/{id}/members
GET /api/community/{id}/members?member_type=alumni
GET /api/community/{id}/members?role=admin
GET /api/community/{id}/members?is_active=true
GET /api/community/{id}/members?member_type=alumni&role=member
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "members": [
      {
        "id": "fec32516-366d-49bf-ab6a-b3e5cd399942",
        "name": "John Alumni",
        "phone": "+919900000002",
        "email": "john@alumni.com",
        "member_type": "alumni",
        "role": "admin",
        "profile_data": {
          "graduation_year": 2018,
          "degree": "M.Tech",
          "department": "Electrical Engineering",
          "college": "Test College",
          "skills": ["Python", "Data Science", "ML", "Deep Learning"],
          "bio": "Senior Data Scientist with 5+ years experience",
          "current_company": "Tech Corp"
        },
        "joined_at": "2025-11-18T04:00:00Z",
        "is_active": true,
        "invited_by_name": null
      },
      {
        "id": "c6210b5e-4b93-48f5-8926-2eac460cca05",
        "name": "Community Admin",
        "phone": "+919900000001",
        "email": "admin@test.com",
        "member_type": "alumni",
        "role": "admin",
        "profile_data": {
          "graduation_year": 2020,
          "degree": "B.Tech",
          "department": "Computer Science",
          "college": "Test College"
        },
        "joined_at": "2025-11-18T04:00:00Z",
        "is_active": true,
        "invited_by_name": null
      }
    ],
    "count": 2
  }
}
```

---

### 3. Update Member Profile

**PUT** `/api/community/:id/members/:member_id/profile`

Updates a member's profile data (JSONB) in a community.

**URL Parameters:**
- `id` (UUID) - Community ID
- `member_id` (UUID) - Member ID

**Request Body:**
```json
{
  "profile_data": {
    "graduation_year": 2018,
    "degree": "M.Tech",
    "department": "Electrical Engineering",
    "college": "Test College",
    "skills": ["Python", "Data Science", "ML", "Deep Learning"],
    "bio": "Senior Data Scientist with 5+ years experience",
    "current_company": "Tech Corp"
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "membership": {
      "id": "382d50a6-6a39-462c-9636-108fc246a766",
      "community_id": "3b62355d-feb7-45fa-bda0-1996a4454372",
      "member_id": "fec32516-366d-49bf-ab6a-b3e5cd399942",
      "member_type": "alumni",
      "role": "member",
      "profile_data": {
        "graduation_year": 2018,
        "degree": "M.Tech",
        "department": "Electrical Engineering",
        "college": "Test College",
        "skills": ["Python", "Data Science", "ML", "Deep Learning"],
        "bio": "Senior Data Scientist with 5+ years experience",
        "current_company": "Tech Corp"
      },
      "is_active": true,
      "joined_at": "2025-11-18T04:00:00Z",
      "updated_at": "2025-11-18T04:05:00Z",
      "invited_by": null,
      "invitation_accepted_at": null
    }
  }
}
```

**Error Response (404 Not Found):**
```json
{
  "success": false,
  "error": {
    "message": "Membership not found"
  }
}
```

---

### 4. Update Member Role

**PUT** `/api/community/:id/members/:member_id/role`

Updates a member's role in a community.

**URL Parameters:**
- `id` (UUID) - Community ID
- `member_id` (UUID) - Member ID

**Request Body:**
```json
{
  "role": "admin"
}
```

**Valid Roles:**
- `member` - Regular member
- `admin` - Community admin
- `super_admin` - Super admin with full access

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "membership": {
      "id": "382d50a6-6a39-462c-9636-108fc246a766",
      "community_id": "3b62355d-feb7-45fa-bda0-1996a4454372",
      "member_id": "fec32516-366d-49bf-ab6a-b3e5cd399942",
      "member_type": "alumni",
      "role": "admin",
      "profile_data": {...},
      "is_active": true,
      "joined_at": "2025-11-18T04:00:00Z",
      "updated_at": "2025-11-18T04:10:00Z",
      "invited_by": null,
      "invitation_accepted_at": null
    }
  }
}
```

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "error": {
    "message": "Valid role is required (member, admin, or super_admin)"
  }
}
```

---

### 5. Remove Member from Community

**DELETE** `/api/community/:id/members/:member_id`

Soft deletes a member from a community (sets `is_active` to `false`).

**URL Parameters:**
- `id` (UUID) - Community ID
- `member_id` (UUID) - Member ID

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Member removed from community successfully"
  }
}
```

**Error Response (404 Not Found):**
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Membership not found"
  }
}
```

---

## Example Workflows

### Workflow 1: Add Multiple Members to Community

```bash
# 1. Get community ID
GET /api/community

# 2. Add first member
POST /api/community/{id}/members
{
  "member_data": {"name": "Alice", "phone": "+91999000001"},
  "member_type": "alumni",
  "profile_data": {
    "graduation_year": 2020,
    "degree": "B.Tech",
    "college": "IIT Madras"
  }
}

# 3. Add second member
POST /api/community/{id}/members
{
  "member_data": {"name": "Bob", "phone": "+91999000002"},
  "member_type": "alumni",
  "profile_data": {
    "graduation_year": 2019,
    "degree": "M.Tech",
    "college": "IIT Madras"
  }
}

# 4. List all members
GET /api/community/{id}/members
```

### Workflow 2: Promote Member to Admin

```bash
# 1. Get all regular members
GET /api/community/{id}/members?role=member

# 2. Promote specific member
PUT /api/community/{id}/members/{member_id}/role
{
  "role": "admin"
}

# 3. Verify promotion
GET /api/community/{id}/members?role=admin
```

### Workflow 3: Update Member Skills

```bash
# 1. Get member's current profile
GET /api/community/{id}/members/{member_id}

# 2. Update profile with new skills
PUT /api/community/{id}/members/{member_id}/profile
{
  "profile_data": {
    "graduation_year": 2020,
    "degree": "B.Tech",
    "college": "IIT Madras",
    "skills": ["Python", "JavaScript", "React", "Node.js"]
  }
}
```

---

## Testing with npm Script

Run automated tests:

```bash
npm run test:members
```

This will:
1. Create a test community
2. Add multiple members
3. Test duplicate rejection
4. Update member profiles
5. Promote members to admin
6. Remove members
7. Verify database state

---

## Database Schema

### Tables Used

**members**
```sql
CREATE TABLE members (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) UNIQUE NOT NULL,
  email VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE
);
```

**community_memberships**
```sql
CREATE TABLE community_memberships (
  id UUID PRIMARY KEY,
  community_id UUID REFERENCES communities(id),
  member_id UUID REFERENCES members(id),
  member_type VARCHAR(20) NOT NULL,  -- alumni, entrepreneur, resident, generic
  role VARCHAR(20) DEFAULT 'member', -- member, admin, super_admin
  profile_data JSONB DEFAULT '{}',   -- Type-specific profile data
  permissions JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  invited_by UUID REFERENCES members(id),
  invitation_accepted_at TIMESTAMPTZ,
  UNIQUE(community_id, member_id)
);
```

---

## Authorization

All endpoints require authentication and appropriate roles:

- **Add Member**: Requires `admin` or `super_admin` role
- **Get Members**: Requires `member`, `admin`, or `super_admin` role
- **Update Profile**: Requires `admin` or `super_admin` role (or member updating own profile)
- **Update Role**: Requires `super_admin` role
- **Remove Member**: Requires `admin` or `super_admin` role

---

## Notes

1. **Member Creation**: If a member with the same phone number already exists, they will be reused (no duplicate members created)
2. **Profile Data**: Stored as flexible JSONB, allowing different fields for different community types
3. **Soft Delete**: Removing a member sets `is_active = false` but doesn't delete the record
4. **Type Inference**: If `member_type` is not provided, it's inferred from the community type
5. **Permissions**: The `permissions` JSONB field can store custom permissions for admin/super_admin roles
