# Security & Auth - Implementation Checklist

**Timeline:** 2 weeks | **Priority:** ⚠️ CRITICAL

---

## Week 1: Core Authentication

### Day 1-2: Setup & OTP Service
- [ ] Create Twilio account & get credentials
- [ ] Setup Redis (Docker locally)
- [ ] Install dependencies: `twilio`, `redis`, `jsonwebtoken`, `express-rate-limit`
- [ ] Create `src/config/redis.ts` - Redis client
- [ ] Create `src/config/jwt.ts` - JWT config
- [ ] Create `src/services/otpService.ts` - OTP generation/verification
- [ ] Add environment variables to `.env`
- [ ] Test OTP SMS sending manually

### Day 3-4: JWT & Auth Routes
- [ ] Create `src/services/jwtService.ts` - Token generation/verification
- [ ] Create `src/middlewares/auth.ts` - JWT authentication middleware
- [ ] Create `src/routes/auth.ts` - Auth endpoints
  - [ ] `POST /auth/request-otp`
  - [ ] `POST /auth/verify-otp`
  - [ ] `POST /auth/refresh-token`
  - [ ] `POST /auth/logout`
- [ ] Update `src/app.ts` to include auth routes
- [ ] Test auth flow end-to-end

### Day 5: Rate Limiting
- [ ] Create `src/middlewares/rateLimiter.ts`
- [ ] Configure limits:
  - [ ] OTP requests: 3/hour per phone
  - [ ] Auth endpoints: 10/15min per IP
  - [ ] Search API: 100/hour per user
- [ ] Apply to all routes
- [ ] Test rate limit enforcement

---

## Week 2: RBAC & Production

### Day 6-7: Role-Based Access Control
- [ ] Add `role` column to `community_members` table
- [ ] Update existing members with default role ('member')
- [ ] Create `src/middlewares/authorize.ts` - Role middleware
- [ ] Implement role checks:
  - [ ] `requireRole('admin')`
  - [ ] `requireAnyRole(['admin', 'super_admin'])`
- [ ] Protect admin routes:
  - [ ] Member CRUD (admin only)
  - [ ] Analytics (admin+)
  - [ ] Settings (super_admin only)
- [ ] Test role enforcement

### Day 8: Redis Sessions
- [ ] Create `src/services/sessionService.ts`
- [ ] Migrate OTP storage to Redis (5-min TTL)
- [ ] Migrate conversation history to Redis (30-min TTL)
- [ ] Store token blacklist in Redis
- [ ] Store rate limit counters in Redis
- [ ] Test session persistence (restart server)

### Day 9: Testing
- [ ] Write unit tests:
  - [ ] `tests/otpService.test.ts`
  - [ ] `tests/jwtService.test.ts`
  - [ ] `tests/auth.middleware.test.ts`
- [ ] Write integration test: `tests/auth-flow.test.ts`
- [ ] Manual testing with Postman/curl
- [ ] Security audit:
  - [ ] Check error messages (no leaks)
  - [ ] Verify rate limits work
  - [ ] Test expired tokens
  - [ ] Test invalid roles

### Day 10: Deploy & Monitor
- [ ] Add Redis plugin on Railway
- [ ] Set environment variables on Railway
- [ ] Deploy to production
- [ ] Smoke tests on production
- [ ] Monitor error logs (Sentry)
- [ ] Monitor auth success rate
- [ ] Create deployment documentation

---

## Dependencies to Install

```bash
# Production
npm install twilio
npm install jsonwebtoken
npm install redis
npm install express-rate-limit
npm install rate-limit-redis
npm install express-session
npm install connect-redis

# Development
npm install @types/twilio --save-dev
npm install @types/jsonwebtoken --save-dev
npm install @types/redis --save-dev
npm install @types/express-session --save-dev
```

---

## Environment Variables

```bash
# JWT
JWT_SECRET=your-super-secret-key-min-32-chars-change-in-prod
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Twilio
TWILIO_ACCOUNT_SID=ACxxxx
TWILIO_AUTH_TOKEN=xxxx
TWILIO_PHONE_NUMBER=+1xxx

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=
REDIS_TLS=false
```

---

## Quick Commands

### Start Redis (Docker)
```bash
docker run -d --name redis -p 6379:6379 redis:alpine
```

### Test OTP Flow
```bash
# 1. Request OTP
curl -X POST http://localhost:3000/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "919840930854"}'

# 2. Check SMS, then verify
curl -X POST http://localhost:3000/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "919840930854", "otp": "123456"}'

# 3. Use token
export TOKEN="eyJhbGc..."
curl -X POST http://localhost:3000/search/nl \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "find doctors"}'
```

### Test Rate Limiting
```bash
# Send 5 OTP requests (should fail on 4th)
for i in {1..5}; do
  curl -X POST http://localhost:3000/auth/request-otp \
    -H "Content-Type: application/json" \
    -d '{"phoneNumber": "919840930854"}'
  echo "\nRequest $i"
done
```

---

## Files to Create

```
Server/src/
├── config/
│   ├── redis.ts         ⬅️ NEW
│   └── jwt.ts           ⬅️ NEW
│
├── services/
│   ├── otpService.ts    ⬅️ NEW
│   ├── jwtService.ts    ⬅️ NEW
│   └── sessionService.ts ⬅️ NEW
│
├── middlewares/
│   ├── auth.ts          ⬅️ NEW
│   ├── authorize.ts     ⬅️ NEW
│   └── rateLimiter.ts   ⬅️ NEW
│
├── routes/
│   └── auth.ts          ⬅️ NEW
│
└── tests/
    ├── otpService.test.ts    ⬅️ NEW
    ├── jwtService.test.ts    ⬅️ NEW
    └── auth-flow.test.ts     ⬅️ NEW
```

---

## Migration Checklist

### Before Starting
- [ ] Backup database
- [ ] Review current auth flow
- [ ] Notify test users (if any)

### During Implementation
- [ ] Keep existing phone validation working
- [ ] Don't break current search API
- [ ] Test after each phase

### After Completion
- [ ] Update API documentation (OpenAPI)
- [ ] Update README with auth flow
- [ ] Create migration guide for users
- [ ] Monitor for 48 hours

---

## Success Metrics

- [ ] Auth response time: <500ms
- [ ] OTP delivery: <10 seconds
- [ ] SMS delivery rate: >95%
- [ ] JWT verification: <50ms
- [ ] Zero auth-related errors in 24h
- [ ] Rate limiting blocks abuse
- [ ] Session persists across restarts

---

## Rollback Plan

If something breaks:
1. **Revert Git commit** - Back to working version
2. **Keep old phone validation** - As fallback
3. **Disable OTP temporarily** - Use phone-only auth
4. **Fix forward** - Small fixes, don't rewrite

---

## Cost Estimate

| Item | Dev | Production |
|------|-----|------------|
| Twilio trial | $15 free | - |
| Twilio number | - | $1/mo |
| SMS (1000/mo) | Free | $7.50/mo |
| Redis local | Free | - |
| Redis Railway | - | $5/mo |
| **Total** | **$0** | **~$14/mo** |

---

## Next Action Items

1. ✅ Review plan (YOU ARE HERE)
2. ⬜ Get Twilio credentials
3. ⬜ Setup Redis locally
4. ⬜ Start Day 1 tasks
5. ⬜ Daily standup updates

**Ready to start?** 🚀
