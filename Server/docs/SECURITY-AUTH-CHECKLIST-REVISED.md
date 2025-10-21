# Security & Auth - REVISED Checklist (WhatsApp-First)

**Timeline:** 1 week | **Priority:** ⚠️ CRITICAL

---

## 🎯 Key Change

**No OTP needed for WhatsApp users!** Phone numbers are already verified by WhatsApp/Twilio.

- ✅ JWT only for **Admin Dashboard** (web)
- ✅ Sessions for **WhatsApp users** (already authenticated)
- ✅ Redis for both (persistence + rate limiting)

---

## Week 1: Implementation

### Day 1: Redis Setup ✅ COMPLETED
- [x] Start Redis locally: `docker run -d -p 6379:6379 redis:alpine`
- [x] Install dependencies: `npm install redis @types/redis --save-dev`
- [x] Create `src/config/redis.ts` - Redis client with connection handling
- [x] Test Redis connection: `redis-cli ping` → should return `PONG`
- [x] Add to `.env`:
  ```bash
  REDIS_URL=redis://localhost:6379
  REDIS_PASSWORD=
  REDIS_TLS=false
  RATE_LIMIT_MESSAGES_PER_HOUR=50
  RATE_LIMIT_SEARCHES_PER_HOUR=30
  ```
- [x] Create test script: `src/test-redis.ts`
- [x] Update health endpoint to include Redis status
- [x] Update docker-compose.yaml with Redis service

### Day 2: Session Service ✅ COMPLETED
- [x] Create `src/services/sessionService.ts`
- [x] Implement functions:
  - [x] `getOrCreateSession(phoneNumber)` - Get/create WhatsApp session
  - [x] `updateSession(phoneNumber, data)` - Update conversation history
  - [x] `getSession(phoneNumber)` - Retrieve existing session
  - [x] `deleteSession(phoneNumber)` - Clear session
  - [x] `addConversationEntry()` - Add to history (max 10)
  - [x] `checkMessageRateLimit()` - Check 50/hour limit
  - [x] `incrementMessageCounter()` - Track messages
  - [x] `checkSearchRateLimit()` - Check 30/hour limit
  - [x] `incrementSearchCounter()` - Track searches
- [x] Session structure with TTL:
  - [x] `session:whatsapp:{phone}` → 30 min TTL
  - [x] `rate:msg:{phone}` → 1 hour TTL
  - [x] `rate:search:{phone}` → 1 hour TTL
- [x] Create test suite: `src/test-session.ts`
- [x] All 13 tests passing ✓

### Day 3: WhatsApp Session Integration ✅ COMPLETED
- [x] Update `src/controllers/botController.ts`:
  - [x] Extract phone from `req.body.From` (Twilio webhook)
  - [x] Call `sessionService.getOrCreateSession()`
  - [x] Pass conversation history to LLM
  - [x] Update session after response
- [x] Test flow:
  - [x] Send WhatsApp message → Session created
  - [x] Send follow-up → History preserved
  - [x] Wait 30 min → Session expires
  - [x] Send again → New session

### Day 4: Rate Limiting ✅ COMPLETED
- [x] Create `src/middlewares/rateLimiter.ts`
- [x] Implement rate limit checks:
  - [x] WhatsApp: 50 messages/hour
  - [x] Search API: 30/hour
  - [x] Global: 1000/hour per IP
  - [x] Auth (future): 10/15min per IP
- [x] Add to WhatsApp webhook:
  - [x] Check rate limit before processing
  - [x] Increment counter after processing
  - [x] Return friendly message if exceeded
- [x] Apply to routes:
  - [x] `src/app.ts` - Global rate limiter
  - [x] `src/routes/search.ts` - Search rate limiter
  - [x] WhatsApp already has rate limiting
- [x] Test:
  - [x] Send 55 messages → Should block after 50
  - [x] Check Redis: `redis-cli GET rate:msg:{phone}`
  - [x] All tests passing ✓

### Day 5: Role-Based Access Control
- [ ] Add `role` column to database:
  ```sql
  ALTER TABLE community_members 
  ADD COLUMN role VARCHAR(20) DEFAULT 'member';
  ```
- [ ] Update existing members: `UPDATE community_members SET role = 'member';`
- [ ] Create `src/middlewares/authorize.ts`:
  ```typescript
  requireRole(role: string) // Check user role
  requireAnyRole(roles: string[]) // Check multiple roles
  ```
- [ ] Implement role checks in conversation service
- [ ] Test role enforcement:
  - [ ] Member tries admin command → Denied
  - [ ] Admin tries admin command → Allowed

---

## Day 6-7: Admin Dashboard Auth (Optional)

### Day 6: JWT Service (for Dashboard)
- [ ] Install: `npm install jsonwebtoken bcrypt @types/jsonwebtoken @types/bcrypt --save-dev`
- [ ] Create `src/services/jwtService.ts`:
  - [ ] `generateToken(payload)` - Create JWT
  - [ ] `verifyToken(token)` - Verify JWT
  - [ ] `refreshToken(token)` - Refresh JWT
- [ ] Add to `.env`:
  ```bash
  JWT_SECRET=your-super-secret-key-min-32-chars
  JWT_EXPIRES_IN=24h
  JWT_REFRESH_EXPIRES_IN=7d
  ```

### Day 7: Dashboard Auth Endpoints
- [ ] Create `src/routes/auth.ts`:
  - [ ] `POST /auth/admin/login` - Dashboard login
  - [ ] `POST /auth/admin/refresh` - Refresh token
  - [ ] `POST /auth/admin/logout` - Logout
- [ ] Create `src/middlewares/auth.ts`:
  - [ ] `authenticateWhatsApp()` - Session-based (WhatsApp)
  - [ ] `authenticateJWT()` - Token-based (Dashboard)
  - [ ] `authenticate()` - Dual auth (route-based)
- [ ] Hash admin password: `bcrypt.hash('password', 10)`
- [ ] Test dashboard login flow

---

## Dependencies

```bash
# Core (Required)
npm install redis

# Dashboard Auth (Optional - Week 2)
npm install jsonwebtoken bcrypt

# Dev dependencies
npm install @types/redis @types/jsonwebtoken @types/bcrypt --save-dev
```

---

## Environment Variables

```bash
# Redis (Required)
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=
REDIS_TLS=false

# Rate Limits (Required)
RATE_LIMIT_MESSAGES_PER_HOUR=50
RATE_LIMIT_SEARCHES_PER_HOUR=30

# JWT (Optional - for Dashboard only)
JWT_SECRET=your-super-secret-key-min-32-chars
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Admin Credentials (Optional - for Dashboard)
ADMIN_PASSWORD_HASH=<bcrypt_hash>
```

---

## Quick Commands

### Start Redis
```bash
docker run -d --name redis -p 6379:6379 redis:alpine
docker ps  # Check running
redis-cli ping  # Test connection
```

### Test WhatsApp Session
```bash
# Check session in Redis
redis-cli GET "session:whatsapp:+919840930854"

# Check rate limit counter
redis-cli GET "rate:msg:+919840930854"

# Check all keys
redis-cli KEYS "*"

# Clear all (if needed)
redis-cli FLUSHALL
```

### Monitor Redis
```bash
# Watch all commands
redis-cli MONITOR

# Check memory usage
redis-cli INFO memory

# Check key TTL
redis-cli TTL "session:whatsapp:+919840930854"
```

---

## Files to Create/Update

```
Server/src/
├── config/
│   ├── redis.ts         ⬅️ NEW (Day 1)
│   └── jwt.ts           ⬅️ NEW (Day 6, optional)
│
├── services/
│   ├── sessionService.ts    ⬅️ NEW (Day 2)
│   └── jwtService.ts        ⬅️ NEW (Day 6, optional)
│
├── middlewares/
│   ├── rateLimiter.ts       ⬅️ NEW (Day 4)
│   ├── authorize.ts         ⬅️ NEW (Day 5)
│   └── auth.ts              ⬅️ NEW (Day 7, optional)
│
├── routes/
│   └── auth.ts              ⬅️ NEW (Day 7, optional)
│
├── controllers/
│   └── botController.ts     ⬅️ UPDATE (Day 3)
│
└── utils/
    └── types.ts             ⬅️ UPDATE (Add session types)
```

---

## Testing Checklist

### WhatsApp Flow (Required)
- [ ] Send message → Session created in Redis
- [ ] Send follow-up → History preserved
- [ ] Send 55 messages → Rate limited at 50
- [ ] Wait 30 min → Session expires
- [ ] Send as member → Access granted
- [ ] Send as non-member → Access denied
- [ ] Try admin command as member → Denied
- [ ] Try admin command as admin → Allowed

### Dashboard Flow (Optional)
- [ ] Login with credentials → Get JWT token
- [ ] Use token for API → Access granted
- [ ] Use expired token → Get 401
- [ ] Logout → Token blacklisted

---

## Database Migration

```sql
-- Add role column
ALTER TABLE community_members 
ADD COLUMN role VARCHAR(20) DEFAULT 'member';

-- Set all existing to member
UPDATE community_members SET role = 'member';

-- Promote specific users to admin (do this manually)
UPDATE community_members 
SET role = 'admin' 
WHERE phone IN ('+919840930854', 'other_admin_phone');

-- Check roles
SELECT name, phone, role FROM community_members WHERE role != 'member';
```

---

## Deployment Checklist

### Railway Setup
- [ ] Add Redis plugin (Redis by Upstash - $5/mo)
- [ ] Copy Redis connection URL
- [ ] Add to Railway environment variables:
  - `REDIS_URL`
  - `JWT_SECRET` (optional)
  - `RATE_LIMIT_MESSAGES_PER_HOUR=50`
  - `RATE_LIMIT_SEARCHES_PER_HOUR=30`
- [ ] Deploy and test
- [ ] Monitor Redis memory usage
- [ ] Check session persistence

### Post-Deploy
- [ ] Send test WhatsApp message
- [ ] Verify session in Redis (via Railway CLI)
- [ ] Test rate limiting
- [ ] Monitor error logs
- [ ] Check response times (<500ms)

---

## Success Metrics

- [ ] Redis connected: `redis-cli ping`
- [ ] Session creation: <100ms
- [ ] Session retrieval: <50ms
- [ ] Rate limit check: <10ms
- [ ] Message processing: <2s total
- [ ] Session persistence: Survives server restart
- [ ] Zero auth-related errors in 24h

---

## Rollback Plan

If Redis fails:
1. **Fallback to in-memory** - Already implemented in `conversationService.ts`
2. **Disable rate limiting temporarily** - Comment out middleware
3. **Fix Redis connection** - Check URL, credentials, network
4. **Redeploy with working Redis**

---

## Cost (Revised)

| Item | Development | Production |
|------|-------------|------------|
| Redis local | Free | - |
| Redis Railway | - | $5/month |
| Twilio WhatsApp | Free (1K msgs) | $0.005/msg |
| **Total** | **$0** | **~$10/month** |

**Savings:** No SMS OTP = $7.50/month saved! 💰

---

## Next Steps

**Phase 1 (Required - Days 1-5):**
1. ✅ Review this checklist
2. ⬜ Start Day 1: Setup Redis
3. ⬜ Daily progress through Day 5
4. ⬜ Deploy to Railway with Redis
5. ⬜ Test with real WhatsApp users

**Phase 2 (Optional - Days 6-7):**
1. ⬜ Wait until dashboard is built
2. ⬜ Add JWT service
3. ⬜ Create admin login
4. ⬜ Test dashboard auth

**Ready to start Day 1?** 🚀
