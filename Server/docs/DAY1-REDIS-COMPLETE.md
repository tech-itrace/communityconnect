# Day 1 Complete: Redis Setup ✅

**Date:** October 21, 2025  
**Status:** ✅ COMPLETED  
**Time:** ~1 hour

---

## What We Accomplished

### 1. ✅ Redis Container Running
- Pulled `redis:alpine` image
- Started Redis on port 6379
- Verified with `redis-cli ping` → `PONG`

### 2. ✅ Dependencies Installed
```bash
npm install redis
npm install @types/redis --save-dev
```

### 3. ✅ Redis Client Configuration
**File:** `src/config/redis.ts`

**Features:**
- Singleton client pattern
- Auto-reconnection with exponential backoff
- Health check function
- Graceful shutdown handling
- Event logging (connect, error, ready, reconnecting)

### 4. ✅ Environment Configuration
**Updated files:**
- `.env` - Added Redis config
- `.env.example` - Added Redis template
- `src/config/index.ts` - Exported Redis & rate limit configs

**New variables:**
```bash
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=
REDIS_TLS=false
RATE_LIMIT_MESSAGES_PER_HOUR=50
RATE_LIMIT_SEARCHES_PER_HOUR=30
```

### 5. ✅ Test Suite Created
**File:** `src/test-redis.ts`

**Tests:**
- ✓ Connection
- ✓ PING command
- ✓ SET/GET operations
- ✓ TTL (Time To Live)
- ✓ HASH operations (for sessions)
- ✓ INCR counter (for rate limiting)
- ✓ Health check
- ✓ Cleanup

**Run:** `npm run test:redis`

### 6. ✅ Health Check Endpoint Updated
**Endpoint:** `GET /api/health`

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-21T15:11:30.000Z",
  "redis": {
    "connected": true,
    "latency": 1
  }
}
```

### 7. ✅ Docker Compose Updated
**File:** `docker-compose.yaml`

**Added:**
- Redis service (alpine image)
- Persistent volume for Redis data
- maxmemory policy (256MB)
- Network connection between app & Redis

---

## Quick Reference Commands

```bash
# Start Redis
docker run -d --name redis -p 6379:6379 redis:alpine

# Check Redis is running
docker ps | grep redis

# Test Redis connection
docker exec redis redis-cli ping

# Test from Node.js
npm run test:redis

# Check health endpoint
curl http://localhost:3000/api/health

# View Redis data
docker exec -it redis redis-cli

# Inside redis-cli:
> KEYS *              # List all keys
> GET key_name        # Get value
> TTL key_name        # Check expiry
> FLUSHALL           # Clear all (use carefully!)
> MONITOR            # Watch all commands in real-time
```

---

## Redis Key Patterns (For Future)

```
# Session storage
session:whatsapp:{phoneNumber}    → Hash (30-min TTL)

# Rate limiting
rate:msg:{phoneNumber}            → Counter (1-hour TTL)
rate:search:{phoneNumber}         → Counter (1-hour TTL)

# Conversation history (embedded in session)
session:whatsapp:{phoneNumber}.history → Array
```

---

## What's Next: Day 2

**Task:** Create Session Service

**Files to create:**
- `src/services/sessionService.ts`
- `src/utils/types.ts` (update with session types)

**Functions to implement:**
```typescript
getOrCreateSession(phoneNumber: string)
updateSession(phoneNumber: string, data: Partial<Session>)
getSession(phoneNumber: string)
deleteSession(phoneNumber: string)
getConversationHistory(phoneNumber: string)
```

---

## Verification

Run these checks to verify Day 1 is complete:

```bash
# 1. Redis container running?
docker ps | grep redis
# Should show: redis container UP

# 2. Redis responding?
docker exec redis redis-cli ping
# Should return: PONG

# 3. Node.js can connect?
npm run test:redis
# Should show: All Tests Passed! ✓

# 4. Health check works?
npm run dev
# In another terminal:
curl http://localhost:3000/api/health
# Should show: redis.connected: true
```

---

## Troubleshooting

### Issue: Redis won't start
```bash
# Check if port 6379 is in use
lsof -i :6379

# Kill existing Redis
docker stop redis && docker rm redis

# Start fresh
docker run -d --name redis -p 6379:6379 redis:alpine
```

### Issue: Can't connect from Node.js
```bash
# Check Redis logs
docker logs redis

# Check .env file has correct URL
cat .env | grep REDIS_URL

# Should be: REDIS_URL=redis://localhost:6379
```

### Issue: TypeScript errors
```bash
# Rebuild
npm run build

# Check types installed
npm list @types/redis
```

---

## Production Notes

**For Railway deployment:**
1. Add Redis plugin in Railway dashboard
2. Copy `REDIS_URL` from plugin
3. Add to environment variables
4. Update connection URL to use internal hostname

**For Docker deployment:**
1. Use docker-compose.yaml (already updated)
2. Set `REDIS_URL=redis://redis:6379` (service name)
3. Ensure both services on same network

---

## Files Modified/Created

### Created:
- ✅ `src/config/redis.ts` - Redis client
- ✅ `src/test-redis.ts` - Test suite

### Modified:
- ✅ `src/config/index.ts` - Added Redis config exports
- ✅ `src/routes/index.ts` - Updated health check
- ✅ `package.json` - Added test:redis script
- ✅ `.env` - Added Redis variables
- ✅ `.env.example` - Added Redis template
- ✅ `docker-compose.yaml` - Added Redis service

---

## Summary

✅ Redis is running locally  
✅ Node.js can connect to Redis  
✅ All operations tested (SET/GET/HASH/INCR/TTL)  
✅ Health check includes Redis status  
✅ Docker Compose ready for deployment  
✅ Documentation complete  

**Day 1: COMPLETE!** Ready for Day 2: Session Service 🚀

---

**Time Investment:** ~1 hour  
**Next Session:** Day 2 - Session Service (~2 hours)
