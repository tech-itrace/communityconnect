# Security & Authentication - Implementation Plan

**Status:** 🔴 Planning  
**Priority:** ⚠️ MUST HAVE  
**Timeline:** 2 weeks  
**Cost:** $10/month (Twilio + Redis)

---

## Current State

✅ **Basic phone validation** (in-memory)  
✅ **Member lookup** (Supabase)  
✅ **Conversation tracking** (30-min sessions)  
❌ **No OTP verification**  
❌ **No JWT tokens**  
❌ **No rate limiting**  
❌ **No persistent sessions**  
❌ **No role-based access**

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Security Flow                             │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. User sends phone → Request OTP                           │
│  2. System sends OTP → Twilio SMS                            │
│  3. User enters OTP → Verify                                 │
│  4. System returns → JWT Token                               │
│  5. User uses token → Access API (rate limited)              │
│  6. Session stored → Redis (persistent)                      │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Tasks

### Phase 1: OTP Verification (3 days)

#### 1.1 Twilio Setup
- [ ] Create Twilio account (free trial: $15 credit)
- [ ] Get phone number ($1/month)
- [ ] Get Account SID & Auth Token
- [ ] Test SMS sending

**Dependencies:**
```bash
npm install twilio
npm install @types/twilio --save-dev
```

**Config:**
```typescript
// .env
TWILIO_ACCOUNT_SID=ACxxxx
TWILIO_AUTH_TOKEN=xxxx
TWILIO_PHONE_NUMBER=+1xxx
```

#### 1.2 OTP Service
**File:** `src/services/otpService.ts`

**Features:**
- Generate 6-digit OTP
- Store in Redis (5-min expiry)
- Send via Twilio
- Verify OTP
- Rate limit: 3 OTPs/hour per phone

**Key Functions:**
```typescript
generateOTP(phoneNumber: string): Promise<{success: boolean}>
verifyOTP(phoneNumber: string, otp: string): Promise<{valid: boolean}>
```

#### 1.3 OTP Endpoints
**File:** `src/routes/auth.ts`

```
POST /auth/request-otp
Body: { phoneNumber: string }
Response: { success: true, expiresIn: 300 }

POST /auth/verify-otp  
Body: { phoneNumber: string, otp: string }
Response: { token: string, expiresIn: 86400, user: {...} }
```

---

### Phase 2: JWT Token Management (2 days)

#### 2.1 JWT Setup
**Dependencies:**
```bash
npm install jsonwebtoken
npm install @types/jsonwebtoken --save-dev
```

**Config:**
```typescript
// .env
JWT_SECRET=your-super-secret-key-min-32-chars
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d
```

#### 2.2 JWT Service
**File:** `src/services/jwtService.ts`

**Features:**
- Generate access token (24h)
- Generate refresh token (7d)
- Verify token
- Decode token payload
- Blacklist revoked tokens

**Payload:**
```typescript
{
  userId: string,
  phoneNumber: string,
  role: 'member' | 'admin' | 'super_admin',
  iat: number,
  exp: number
}
```

#### 2.3 Auth Middleware
**File:** `src/middlewares/auth.ts`

**Features:**
- Extract token from `Authorization: Bearer <token>`
- Verify JWT signature
- Check expiration
- Check blacklist
- Attach user to `req.user`
- Handle errors (401/403)

**Usage:**
```typescript
router.post('/search/nl', authenticateJWT, nlSearchController);
```

---

### Phase 3: Role-Based Access Control (2 days)

#### 3.1 Database Schema
**Table:** `community_members`

```sql
ALTER TABLE community_members 
ADD COLUMN role VARCHAR(20) DEFAULT 'member';

-- Roles: 'member', 'admin', 'super_admin'
-- member: search only
-- admin: search + manage community members
-- super_admin: full access
```

#### 3.2 Authorization Middleware
**File:** `src/middlewares/authorize.ts`

**Features:**
```typescript
requireRole('admin')           // Single role
requireAnyRole(['admin', 'super_admin']) // Multiple roles
requirePermission('member:write') // Permission-based
```

**Usage:**
```typescript
router.post('/members', authenticateJWT, requireRole('admin'), createMember);
router.delete('/members/:id', authenticateJWT, requireRole('super_admin'), deleteMember);
```

#### 3.3 Permission Matrix

| Action | Member | Admin | Super Admin |
|--------|--------|-------|-------------|
| Search members | ✅ | ✅ | ✅ |
| View profile | ✅ | ✅ | ✅ |
| Update own profile | ✅ | ✅ | ✅ |
| Add members | ❌ | ✅ | ✅ |
| Edit members | ❌ | ✅ | ✅ |
| Delete members | ❌ | ❌ | ✅ |
| View analytics | ❌ | ✅ | ✅ |
| Manage admins | ❌ | ❌ | ✅ |

---

### Phase 4: Rate Limiting (1 day)

#### 4.1 Rate Limiter Setup
**Dependencies:**
```bash
npm install express-rate-limit
npm install rate-limit-redis
```

#### 4.2 Rate Limit Config
**File:** `src/middlewares/rateLimiter.ts`

**Tiers:**
```typescript
// OTP requests: 3 per hour
otpLimiter: 3 requests/hour per phone

// Search API: 100 requests/hour per user
searchLimiter: 100 requests/hour per user

// Auth endpoints: 10 requests/15min per IP
authLimiter: 10 requests/15min per IP

// Global: 1000 requests/hour per IP
globalLimiter: 1000 requests/hour per IP
```

**Usage:**
```typescript
app.use('/auth', authLimiter);
app.use('/search', authenticateJWT, searchLimiter);
```

**Response (429):**
```json
{
  "error": "Too many requests",
  "retryAfter": 3600
}
```

---

### Phase 5: Redis Sessions (2 days)

#### 5.1 Redis Setup
**Local Development:**
```bash
docker run -d -p 6379:6379 redis:alpine
```

**Production (Railway):**
- Add Redis plugin ($5/month)
- Get connection URL

**Dependencies:**
```bash
npm install redis
npm install @types/redis --save-dev
npm install connect-redis express-session
```

#### 5.2 Redis Client
**File:** `src/config/redis.ts`

**Features:**
- Connection management
- Reconnection logic
- Error handling
- Health check

**Config:**
```typescript
// .env
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=optional
REDIS_TLS=false
```

#### 5.3 Session Store
**File:** `src/services/sessionService.ts`

**Store in Redis:**
- OTP codes (5-min TTL)
- Conversation history (30-min TTL)
- Token blacklist (until expiry)
- Rate limit counters (1-hour TTL)

**Key Structure:**
```
otp:{phoneNumber}         → "123456" (TTL: 5min)
session:{userId}          → {conversationHistory} (TTL: 30min)
blacklist:{tokenJti}      → "1" (TTL: 24h)
rate:otp:{phoneNumber}    → counter (TTL: 1h)
rate:search:{userId}      → counter (TTL: 1h)
```

---

## File Structure

```
Server/src/
├── config/
│   ├── redis.ts              # NEW: Redis client
│   └── jwt.ts                # NEW: JWT config
│
├── services/
│   ├── otpService.ts         # NEW: OTP generation & verification
│   ├── jwtService.ts         # NEW: Token management
│   └── sessionService.ts     # NEW: Redis session handling
│
├── middlewares/
│   ├── auth.ts               # NEW: JWT authentication
│   ├── authorize.ts          # NEW: Role-based authorization
│   ├── rateLimiter.ts        # NEW: Rate limiting
│   └── errorHandler.ts       # UPDATE: Handle 401/403/429
│
├── routes/
│   └── auth.ts               # NEW: /auth/request-otp, /auth/verify-otp
│
└── utils/
    └── types.ts              # UPDATE: Add JWT payload, OTP types
```

---

## Environment Variables

**Add to `.env`:**
```bash
# JWT
JWT_SECRET=your-super-secret-key-change-this-in-production-min-32-chars
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=
REDIS_TLS=false

# Rate Limiting
RATE_LIMIT_WINDOW_MS=3600000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## Testing Plan

### Unit Tests
```typescript
// tests/otpService.test.ts
✓ Generate valid 6-digit OTP
✓ OTP expires after 5 minutes
✓ Same phone can't request >3 OTPs/hour
✓ Verify correct OTP returns success
✓ Verify wrong OTP returns error

// tests/jwtService.test.ts
✓ Generate valid JWT token
✓ Verify token signature
✓ Expired token throws error
✓ Blacklisted token rejected

// tests/auth.middleware.test.ts
✓ Valid token allows access
✓ Invalid token returns 401
✓ Missing token returns 401
✓ Expired token returns 401
```

### Integration Tests
```bash
# Test flow
./tests/auth-flow.sh

1. Request OTP → Check SMS received
2. Verify OTP → Get JWT token
3. Use token → Access protected route
4. Wrong token → Get 401
5. Rate limit → Get 429
```

### Manual Testing
```bash
# 1. Request OTP
curl -X POST http://localhost:3000/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "919840930854"}'

# 2. Verify OTP (check SMS)
curl -X POST http://localhost:3000/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "919840930854", "otp": "123456"}'

# 3. Use token
curl -X POST http://localhost:3000/search/nl \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "find doctors"}'
```

---

## Security Best Practices

### 1. Secrets Management
- ✅ Never commit `.env` to Git
- ✅ Use Railway/Vercel env vars in prod
- ✅ Rotate JWT secret monthly
- ✅ Use strong JWT secret (min 32 chars)

### 2. Token Security
- ✅ Short-lived access tokens (24h)
- ✅ Refresh tokens for renewal
- ✅ Blacklist on logout
- ✅ HTTPS only in production

### 3. Rate Limiting
- ✅ Per-IP limits on auth endpoints
- ✅ Per-user limits on API endpoints
- ✅ OTP request limits (3/hour)
- ✅ Progressive delays on failures

### 4. OTP Security
- ✅ 6-digit random OTP
- ✅ 5-minute expiry
- ✅ Single-use only
- ✅ Rate limit requests
- ✅ Log all attempts

### 5. Error Messages
- ❌ "Invalid OTP" (don't reveal if phone exists)
- ✅ "Invalid credentials" (generic)
- ❌ Don't leak user roles in errors
- ✅ Sanitize all error responses

---

## Cost Breakdown

### Development
| Service | Free Tier | Paid |
|---------|-----------|------|
| Twilio (dev) | $15 credit | $1/mo + $0.0075/SMS |
| Redis (local) | Free | - |
| Redis (Railway) | - | $5/month |
| **Total Dev** | **$0** | - |
| **Total Prod** | - | **~$10/month** |

### Usage Estimates
```
100 users × 10 logins/month = 1000 OTPs
1000 OTPs × $0.0075 = $7.50/month
Phone number = $1/month
Redis = $5/month
────────────────────────
Total: ~$14/month
```

---

## Migration Strategy

### Step 1: Deploy Redis (Day 1)
```bash
# Add to docker-compose.yaml
redis:
  image: redis:alpine
  ports:
    - "6379:6379"
```

### Step 2: Add Dependencies (Day 1)
```bash
npm install twilio jsonwebtoken redis express-rate-limit
npm install @types/twilio @types/jsonwebtoken @types/redis --save-dev
```

### Step 3: Create Services (Day 2-3)
- OTP service
- JWT service
- Session service

### Step 4: Add Middleware (Day 4)
- Auth middleware
- Authorization middleware
- Rate limiter

### Step 5: Update Routes (Day 5)
- Add `/auth` routes
- Protect existing routes
- Update error handling

### Step 6: Test (Day 6-7)
- Unit tests
- Integration tests
- Manual testing
- Security audit

### Step 7: Deploy (Day 8-10)
- Railway Redis plugin
- Environment variables
- Smoke tests
- Monitor errors

---

## Success Criteria

✅ **Users can request OTP via SMS**  
✅ **OTP verification returns JWT token**  
✅ **Protected routes require valid JWT**  
✅ **Rate limiting prevents abuse**  
✅ **Sessions persist across restarts**  
✅ **Roles control access (member/admin/super)**  
✅ **All tests pass**  
✅ **<500ms auth overhead**  
✅ **99.9% auth success rate**

---

## Next Steps

1. **Review this plan** → Approve/adjust
2. **Setup Twilio** → Get credentials
3. **Setup Redis** → Local + Railway
4. **Start Phase 1** → OTP implementation
5. **Daily progress updates** → Track blockers

**Start Date:** TBD  
**Target Completion:** 2 weeks from start

---

## Questions to Answer

1. **OTP length:** 6 digits or 4 digits?
2. **Token expiry:** 24h access + 7d refresh?
3. **Rate limits:** 100 req/hour good for users?
4. **Admin creation:** Manual or self-service?
5. **Redis provider:** Railway or Upstash?

---

**Status:** Ready for implementation 🚀
