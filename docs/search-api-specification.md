# Community Search API Specification

**Version**: 1.0.0  
**Last Updated**: October 19, 2025  
**Base URL**: `http://localhost:3000/api` (Development)

---

## Table of Contents
1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Endpoints](#endpoints)
4. [Data Models](#data-models)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)
7. [Query Examples](#query-examples)

---

## Overview

The Community Search API enables natural language querying of business community member data. It supports skill-based, service-based, location-based, and multi-criteria searches.

### Key Features
- Natural language query processing
- Semantic search with embeddings
- Structured filtering
- Conversation context support
- Real-time suggestions
- Analytics tracking

---

## Authentication

**Type**: JWT Bearer Token (Phase 2)  
**Header**: `Authorization: Bearer <token>`

For MVP/Phase 1, authentication is optional.

---

## Endpoints

### 1. Natural Language Search

```http
POST /api/search/query
```

**Description**: Process natural language queries and return relevant members.

**Request Headers**:
```
Content-Type: application/json
Authorization: Bearer <token> (optional)
```

**Request Body**:
```json
{
  "message": "string (required) - Natural language query",
  "userId": "string (optional) - User identifier",
  "conversationId": "string (optional) - Conversation thread ID",
  "limit": "number (optional, default: 10) - Max results",
  "includeContactInfo": "boolean (optional, default: true)"
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "response": "string - Natural language response",
  "members": [
    {
      "id": "uuid",
      "name": "string",
      "workingKnowledge": "string",
      "organization": "string",
      "designation": "string",
      "city": "string",
      "email": "string (if includeContactInfo=true)",
      "phone": "string (if includeContactInfo=true)",
      "yearOfGraduation": "number",
      "degree": "string",
      "branch": "string",
      "turnover": "string",
      "relevanceScore": "number (0-1)"
    }
  ],
  "metadata": {
    "totalResults": "number",
    "searchType": "string (skill|service|location|multi-criteria)",
    "processingTime": "string (ms)",
    "confidence": "number (0-1)",
    "queryId": "uuid"
  },
  "suggestions": [
    "string - Follow-up questions"
  ]
}
```

**Example Request**:
```bash
curl -X POST http://localhost:3000/api/search/query \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Find IT consultants in Chennai",
    "limit": 5
  }'
```

**Example Response**:
```json
{
  "success": true,
  "response": "I found 3 IT consultants in Chennai:\n\n1. **Udhayakumar Ulaganathan** - Lead Consultant at Thoughtworks Technologies...",
  "members": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Mr. Udhayakumar, Ulaganathan",
      "workingKnowledge": "Service",
      "organization": "Thoughtworks Technologies",
      "designation": "Lead Consultant - Software Architect",
      "city": "Chennai",
      "email": "udhayapsg@gmail.com",
      "phone": "919943549835",
      "yearOfGraduation": 2009,
      "degree": "MCA",
      "branch": "Computer Application",
      "turnover": "Less than 2 Crores",
      "relevanceScore": 0.95
    }
  ],
  "metadata": {
    "totalResults": 3,
    "searchType": "multi-criteria",
    "processingTime": "245ms",
    "confidence": 0.92,
    "queryId": "7c9e6679-7425-40de-944b-e07fc1f90ae7"
  },
  "suggestions": [
    "Would you like their email addresses?",
    "Show me more IT professionals",
    "Find consultants in other cities"
  ]
}
```

---

### 2. Structured Member Search

```http
POST /api/search/members
```

**Description**: Search members with structured filters.

**Request Body**:
```json
{
  "filters": {
    "workingKnowledge": "string (optional) - Skill or service keyword",
    "city": "string[] (optional) - Cities",
    "degree": "string[] (optional) - Degrees",
    "branch": "string[] (optional) - Engineering branches",
    "turnoverMin": "string (optional) - Minimum turnover",
    "turnoverMax": "string (optional) - Maximum turnover",
    "yearOfGraduationRange": {
      "min": "number (optional)",
      "max": "number (optional)"
    },
    "organizationName": "string (optional)",
    "designation": "string (optional)"
  },
  "searchText": "string (optional) - Free text search",
  "sortBy": "string (optional) - relevance|name|yearOfGraduation|turnover",
  "sortOrder": "string (optional) - asc|desc (default: desc)",
  "limit": "number (optional, default: 20)",
  "offset": "number (optional, default: 0)"
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "members": [
    {
      "id": "uuid",
      "name": "string",
      "workingKnowledge": "string",
      "organization": "string",
      "designation": "string",
      "city": "string",
      "email": "string",
      "phone": "string",
      "address": "string",
      "yearOfGraduation": "number",
      "degree": "string",
      "branch": "string",
      "turnover": "string"
    }
  ],
  "pagination": {
    "total": "number",
    "limit": "number",
    "offset": "number",
    "hasMore": "boolean"
  },
  "appliedFilters": {
    "city": ["Chennai"],
    "workingKnowledge": "IT consulting"
  }
}
```

**Example Request**:
```bash
curl -X POST http://localhost:3000/api/search/members \
  -H "Content-Type: application/json" \
  -d '{
    "filters": {
      "city": ["Chennai", "Bangalore"],
      "workingKnowledge": "manufacturing",
      "turnoverMin": "5 Crores"
    },
    "sortBy": "turnover",
    "limit": 10
  }'
```

---

### 3. Get Member Details

```http
GET /api/members/:id
```

**Description**: Retrieve full details of a specific member.

**Path Parameters**:
- `id` (uuid, required) - Member ID

**Response (200 OK)**:
```json
{
  "success": true,
  "member": {
    "id": "uuid",
    "name": "string",
    "contactInfo": {
      "email": "string",
      "phone": "string",
      "address": "string"
    },
    "professional": {
      "organization": "string",
      "designation": "string",
      "workingKnowledge": "string",
      "turnover": "string"
    },
    "education": {
      "degree": "string",
      "branch": "string",
      "yearOfGraduation": "number"
    },
    "location": {
      "city": "string",
      "state": "string",
      "country": "string"
    },
    "metadata": {
      "createdAt": "timestamp",
      "updatedAt": "timestamp",
      "isActive": "boolean"
    }
  }
}
```

**Example Request**:
```bash
curl -X GET http://localhost:3000/api/members/550e8400-e29b-41d4-a716-446655440000
```

**Response (404 Not Found)**:
```json
{
  "success": false,
  "error": {
    "code": "MEMBER_NOT_FOUND",
    "message": "Member with ID 550e8400-e29b-41d4-a716-446655440000 not found"
  }
}
```

---

### 4. Search Suggestions

```http
GET /api/search/suggestions
```

**Description**: Get autocomplete suggestions for search queries.

**Query Parameters**:
- `q` (string, required) - Partial query text (min 2 characters)
- `type` (string, optional) - Filter by suggestion type (skill|service|location|name)
- `limit` (number, optional, default: 10) - Max suggestions

**Response (200 OK)**:
```json
{
  "success": true,
  "suggestions": [
    {
      "text": "string - Suggestion text",
      "type": "string - skill|service|location|name|organization",
      "count": "number - Number of matching members",
      "category": "string (optional)"
    }
  ]
}
```

**Example Request**:
```bash
curl -X GET "http://localhost:3000/api/search/suggestions?q=IT%20cons&limit=5"
```

**Example Response**:
```json
{
  "success": true,
  "suggestions": [
    {
      "text": "IT consulting",
      "type": "service",
      "count": 5,
      "category": "Services"
    },
    {
      "text": "IT infrastructure",
      "type": "service",
      "count": 3,
      "category": "Services"
    },
    {
      "text": "IT services",
      "type": "service",
      "count": 7,
      "category": "Services"
    }
  ]
}
```

---

### 5. List All Members (Paginated)

```http
GET /api/members
```

**Description**: Get a paginated list of all members.

**Query Parameters**:
- `limit` (number, optional, default: 20, max: 100)
- `offset` (number, optional, default: 0)
- `city` (string, optional) - Filter by city
- `sortBy` (string, optional) - name|yearOfGraduation|organization
- `sortOrder` (string, optional) - asc|desc

**Response (200 OK)**:
```json
{
  "success": true,
  "members": [
    {
      "id": "uuid",
      "name": "string",
      "organization": "string",
      "city": "string",
      "designation": "string",
      "workingKnowledge": "string"
    }
  ],
  "pagination": {
    "total": 48,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

---

### 6. Get Member Stats

```http
GET /api/members/stats
```

**Description**: Get aggregate statistics about community members.

**Response (200 OK)**:
```json
{
  "success": true,
  "stats": {
    "totalMembers": 48,
    "byCity": {
      "Chennai": 25,
      "Bangalore": 8,
      "Hyderabad": 3,
      "Other": 12
    },
    "byTurnover": {
      "Less than 2 Crores": 20,
      "2 to 5 Crores": 8,
      "5 to 10 Crores": 5,
      "Above 10 Crores": 15
    },
    "byDegree": {
      "B.E": 30,
      "MCA": 8,
      "MBA": 5,
      "M.E": 5
    },
    "topSkills": [
      {"skill": "IT Services", "count": 10},
      {"skill": "Manufacturing", "count": 8},
      {"skill": "Consulting", "count": 7}
    ],
    "averageGraduationYear": 1999
  }
}
```

---

### 7. Search Analytics (Admin Only)

```http
GET /api/admin/search/analytics
```

**Description**: Get search analytics and metrics (requires admin role).

**Query Parameters**:
- `startDate` (ISO date, optional) - Filter from date
- `endDate` (ISO date, optional) - Filter to date
- `groupBy` (string, optional) - day|week|month

**Response (200 OK)**:
```json
{
  "success": true,
  "analytics": {
    "totalSearches": 855,
    "uniqueUsers": 45,
    "avgResponseTime": "187ms",
    "successRate": 0.94,
    "topSearches": [
      {
        "query": "IT consulting",
        "count": 145,
        "avgRelevance": 0.89
      },
      {
        "query": "Chennai",
        "count": 98,
        "avgRelevance": 0.95
      }
    ],
    "searchesByType": {
      "skill": 345,
      "service": 234,
      "location": 189,
      "multiCriteria": 87
    },
    "searchesByHour": [
      {"hour": 9, "count": 45},
      {"hour": 10, "count": 78}
    ],
    "noResultsQueries": [
      {"query": "blockchain developer", "count": 5}
    ]
  },
  "period": {
    "startDate": "2025-10-01T00:00:00Z",
    "endDate": "2025-10-19T23:59:59Z"
  }
}
```

---

## Data Models

### Member

```typescript
interface Member {
  id: string;                    // UUID
  name: string;
  yearOfGraduation: number | null;
  degree: string | null;
  branch: string | null;
  workingKnowledge: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string;
  organizationName: string | null;
  designation: string | null;
  annualTurnover: string | null;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}
```

### Search Query

```typescript
interface SearchQuery {
  message: string;
  userId?: string;
  conversationId?: string;
  limit?: number;
  includeContactInfo?: boolean;
}
```

### Search Response

```typescript
interface SearchResponse {
  success: boolean;
  response: string;
  members: MemberResult[];
  metadata: {
    totalResults: number;
    searchType: 'skill' | 'service' | 'location' | 'multi-criteria';
    processingTime: string;
    confidence: number;
    queryId: string;
  };
  suggestions: string[];
}
```

### Member Result

```typescript
interface MemberResult extends Member {
  relevanceScore: number;  // 0-1
  matchedFields?: string[]; // Fields that matched the query
}
```

---

## Error Handling

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "string - Error code",
    "message": "string - Human-readable message",
    "details": "object (optional) - Additional context"
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_REQUEST` | 400 | Malformed request body |
| `MISSING_PARAMETER` | 400 | Required parameter missing |
| `INVALID_QUERY` | 400 | Query cannot be processed |
| `MEMBER_NOT_FOUND` | 404 | Member ID does not exist |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |
| `LLM_ERROR` | 503 | LLM service unavailable |
| `DATABASE_ERROR` | 503 | Database connection issue |

### Example Error Responses

**400 Bad Request**:
```json
{
  "success": false,
  "error": {
    "code": "MISSING_PARAMETER",
    "message": "Required parameter 'message' is missing",
    "details": {
      "parameter": "message",
      "type": "string"
    }
  }
}
```

**429 Rate Limit Exceeded**:
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Try again in 60 seconds.",
    "details": {
      "retryAfter": 60,
      "limit": 100,
      "window": "1 minute"
    }
  }
}
```

**503 Service Unavailable**:
```json
{
  "success": false,
  "error": {
    "code": "LLM_ERROR",
    "message": "Language model service is temporarily unavailable",
    "details": {
      "provider": "DeepInfra",
      "retryable": true
    }
  }
}
```

---

## Rate Limiting

### Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/search/query` | 60 requests | per minute |
| `/api/search/members` | 100 requests | per minute |
| `/api/members/:id` | 200 requests | per minute |
| `/api/search/suggestions` | 300 requests | per minute |

### Rate Limit Headers

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1697812345
```

---

## Query Examples

### Example 1: Simple Skill Search

**Query**: "Who knows Python?"

**API Call**:
```bash
curl -X POST http://localhost:3000/api/search/query \
  -H "Content-Type: application/json" \
  -d '{"message": "Who knows Python?"}'
```

---

### Example 2: Location-Based Search

**Query**: "Show me all members in Chennai"

**API Call**:
```bash
curl -X POST http://localhost:3000/api/search/query \
  -H "Content-Type: application/json" \
  -d '{"message": "Show me all members in Chennai", "limit": 25}'
```

---

### Example 3: Service Search

**Query**: "I need someone for industrial automation"

**API Call**:
```bash
curl -X POST http://localhost:3000/api/search/query \
  -H "Content-Type: application/json" \
  -d '{"message": "I need someone for industrial automation"}'
```

---

### Example 4: Multi-Criteria Search

**Query**: "Find manufacturing businesses in Chennai with turnover above 10 crores"

**API Call**:
```bash
curl -X POST http://localhost:3000/api/search/query \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Find manufacturing businesses in Chennai with turnover above 10 crores",
    "limit": 10
  }'
```

---

### Example 5: Educational Background

**Query**: "Show me MCA graduates from 2009"

**API Call**:
```bash
curl -X POST http://localhost:3000/api/search/query \
  -H "Content-Type: application/json" \
  -d '{"message": "Show me MCA graduates from 2009"}'
```

---

### Example 6: Structured Search with Filters

**Query**: Search for IT consultants in Chennai or Bangalore

**API Call**:
```bash
curl -X POST http://localhost:3000/api/search/members \
  -H "Content-Type: application/json" \
  -d '{
    "filters": {
      "workingKnowledge": "IT consulting",
      "city": ["Chennai", "Bangalore"]
    },
    "sortBy": "relevance",
    "limit": 20
  }'
```

---

### Example 7: Organization Search

**Query**: "Who works at Thoughtworks?"

**API Call**:
```bash
curl -X POST http://localhost:3000/api/search/query \
  -H "Content-Type: application/json" \
  -d '{"message": "Who works at Thoughtworks?"}'
```

---

## Versioning

API versioning follows URL-based versioning:
- Current: `/api/v1/...`
- Future: `/api/v2/...`

The base `/api/...` endpoints currently map to `/api/v1/...`.

---

## Changelog

### Version 1.0.0 (2025-10-19)
- Initial API specification
- Natural language search endpoint
- Structured search endpoint
- Member detail endpoints
- Search suggestions
- Analytics endpoints

---

**Last Updated**: October 19, 2025  
**Maintained By**: tech-itrace/communityconnect
