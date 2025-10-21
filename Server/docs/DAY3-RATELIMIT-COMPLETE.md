# Day 3 Complete: Rate Limiting Middleware ✅

**Date:** October 21, 2025  
**Status:** ✅ COMPLETED  
**Time:** ~1 hour

---

## What We Accomplished

### 1. ✅ Rate Limiter Middleware Created
**File:** `src/middlewares/rateLimiter.ts`

**Features:**
- Flexible, reusable rate limiting middleware
- Redis-based counter storage
- Configurable limits per endpoint
- Proper HTTP headers (X-RateLimit-*, Retry-After)
- Graceful degradation (fail open on Redis errors)

**Predefined Configurations:**
```typescript
- whatsapp: 50/hour per phone number
- search: 30/hour per user (phone number)
- auth: 10/15min per IP address
- global: 1000/hour per IP address
```

### 2. ✅ Applied to Routes
**Modified Files:**
- `src/routes/search.ts` - Applied search rate limiter (30/hour)
- `src/app.ts` - Applied global rate limiter (1000/hour)
- `src/routes/whatsapp.ts` - Already has rate limiting via sessionService

### 3. ✅ Comprehensive Tests
**File:** `src/test-ratelimit.ts`

**7 Tests Covering:**
1. ✓ Normal requests (all 5 allowed)
2. ✓ Rate limit exceeded (6th request blocked with 429)
3. ✓ Different users have separate limits
4. ✓ Rate limit info retrieval
5. ✓ TTL and reset time tracking
6. ✓ Redis key storage
7. ✓ Cleanup

**Run:** `npm run test:ratelimit`

**All tests passed!** ✅

---

## Rate Limiting Architecture

### Middleware Flow
```
Request → Global Rate Limit (1000/hour per IP)
    ↓
Route-Specific Rate Limit (e.g., 30/hour for search)
    ↓
Controller Logic
    ↓
Response with Headers:
  - X-RateLimit-Limit: 30
  - X-RateLimit-Remaining: 15
  - X-RateLimit-Reset: ISO timestamp
```

### On Limit Exceeded (429 Response)
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "You've reached the hourly limit",
    "retryAfter": 1800,
    "limit": 30,
    "windowMs": 3600000
  }
}
```

**Headers:**
```
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 2025-10-21T16:30:00.000Z
Retry-After: 1800
```

---

## Rate Limit Configuration

### WhatsApp Messages
```typescript
{
  windowMs: 60 * 60 * 1000,  // 1 hour
  maxRequests: 50,
  keyGenerator: (req) => `rate:whatsapp:${phoneNumber}`,
  message: "⚠️ You've reached the hourly message limit (50 messages)"
}
```

### Search API
```typescript
{
  windowMs: 60 * 60 * 1000,  // 1 hour
  maxRequests: 30,
  keyGenerator: (req) => `rate:search:${phoneNumber}`,
  message: "⚠️ You've reached the hourly search limit (30 searches)"
}
```

### Auth Endpoints (Future)
```typescript
{
  windowMs: 15 * 60 * 1000,  // 15 minutes
  maxRequests: 10,
  keyGenerator: (req) => `rate:auth:${ipAddress}`,
  message: "Too many authentication attempts"
}
```

### Global (Per IP)
```typescript
{
  windowMs: 60 * 60 * 1000,  // 1 hour
  maxRequests: 1000,
  keyGenerator: (req) => `rate:global:${ipAddress}`,
  message: "Too many requests"
}
```

---

## Redis Storage

### Key Patterns
```
rate:whatsapp:{phoneNumber}  → Counter (TTL: 1 hour)
rate:search:{phoneNumber}    → Counter (TTL: 1 hour)
rate:auth:{ipAddress}        → Counter (TTL: 15 min)
rate:global:{ipAddress}      → Counter (TTL: 1 hour)
```

### Example
```bash
# Check rate limit
redis-cli GET "rate:search:+919840930854"
# Output: "15" (15 requests made)

# Check TTL
redis-cli TTL "rate:search:+919840930854"
# Output: 1234 (seconds remaining)

# See all rate limit keys
redis-cli KEYS "rate:*"
```

---

## Usage Examples

### Using Predefined Limiters
```typescript
import { rateLimiters } from '../middlewares/rateLimiter';

// Apply to specific route
router.post('/search', rateLimiters.search, searchHandler);

// Apply to all routes in router
router.use(rateLimiters.global);
```

### Custom Rate Limiter
```typescript
import { customRateLimit } from '../middlewares/rateLimiter';

// Custom: 100 requests per hour
const customLimiter = customRateLimit(
    100,                    // maxRequests
    60 * 60 * 1000,        // windowMs
    'custom',              // keyPrefix
    'Custom limit exceeded'
);

router.post('/custom', customLimiter, handler);
```

### Creating New Configuration
```typescript
import { createRateLimiter } from '../middlewares/rateLimiter';

const myLimiter = createRateLimiter({
    windowMs: 5 * 60 * 1000,  // 5 minutes
    maxRequests: 20,
    keyGenerator: (req) => `rate:api:${req.body.apiKey}`,
    message: 'API rate limit exceeded'
});
```

---

## Testing Results

### Test Output
```
=== Rate Limiter Middleware Tests ===

✓ Request 1-5: All allowed (remaining: 4→0)
✓ Request 6: Blocked with 429 (Retry After: 10s)
✓ User2: Fresh limit (separate counter)
✓ Rate limit info retrieved
✓ TTL tracking works
✓ Redis keys stored correctly
✓ Cleanup successful

=== All Tests Passed! ✓ ===
```

---

## HTTP Response Headers

### Success Response (Within Limit)
```
HTTP/1.1 200 OK
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 15
X-RateLimit-Reset: 2025-10-21T16:30:00.000Z
Content-Type: application/json

{
  "success": true,
  "results": [...]
}
```

### Rate Limit Exceeded
```
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 2025-10-21T16:30:00.000Z
Retry-After: 1800
Content-Type: application/json

{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "You've reached the hourly limit",
    "retryAfter": 1800,
    "limit": 30,
    "windowMs": 3600000
  }
}
```

---

## Applied Rate Limits

### Current Implementation

| Endpoint | Rate Limit | Key | Window |
|----------|------------|-----|--------|
| **All requests** | 1000/hour | IP address | 1 hour |
| **WhatsApp webhook** | 50/hour | Phone number | 1 hour |
| **POST /api/search/query** | 30/hour | Phone number | 1 hour |
| **POST /api/search/members** | 30/hour | Phone number | 1 hour |
| **GET /api/search/suggestions** | 30/hour | Phone number | 1 hour |

### Future Endpoints (Ready to Use)

| Endpoint | Config | Notes |
|----------|--------|-------|
| **Auth endpoints** | `rateLimiters.auth` | 10/15min per IP |
| **Custom routes** | `customRateLimit()` | Configurable |

---

## Error Handling

### Redis Connection Failure
- **Behavior:** Fail open (allow request)
- **Log:** Error logged to console
- **User:** Request proceeds normally
- **Monitoring:** Track Redis connection issues

### Invalid Key Generator
- **Behavior:** Falls back to 'unknown' identifier
- **Log:** Warning logged
- **Effect:** All requests without proper ID share same limit

---

## Monitoring

### Check Rate Limit Status
```typescript
import { getRateLimitInfo } from '../middlewares/rateLimiter';

const info = await getRateLimitInfo('rate:search:+919840930854');
console.log(info);
// {
//   limit: 30,
//   current: 15,
//   remaining: 15,
//   reset: Date
// }
```

### Redis Commands
```bash
# See all rate limit counters
redis-cli KEYS "rate:*"

# Check specific user
redis-cli GET "rate:search:+919840930854"

# Check TTL
redis-cli TTL "rate:search:+919840930854"

# Delete rate limit (reset for user)
redis-cli DEL "rate:search:+919840930854"

# Monitor all rate limit activity
redis-cli --scan --pattern "rate:*"
```

---

## Configuration

### Environment Variables (Optional)
```bash
# Can override defaults in config
RATE_LIMIT_MESSAGES_PER_HOUR=50
RATE_LIMIT_SEARCHES_PER_HOUR=30
RATE_LIMIT_AUTH_PER_15MIN=10
RATE_LIMIT_GLOBAL_PER_HOUR=1000
```

### Adjust in Code
```typescript
// Edit RateLimitConfigs in rateLimiter.ts
export const RateLimitConfigs = {
    search: {
        maxRequests: 50,  // Change from 30 to 50
        windowMs: 60 * 60 * 1000,
        // ...
    }
};
```

---

## Files Modified/Created

### Created:
- ✅ `src/middlewares/rateLimiter.ts` - Rate limiter middleware (200 lines)
- ✅ `src/test-ratelimit.ts` - Test suite (120 lines)
- ✅ `docs/DAY3-RATELIMIT-COMPLETE.md`

### Modified:
- ✅ `src/app.ts` - Added global rate limiter
- ✅ `src/routes/search.ts` - Added search rate limiter
- ✅ `package.json` - Added test:ratelimit script
- ✅ `docs/SECURITY-AUTH-CHECKLIST-REVISED.md`

---

## Key Features

### Flexible Configuration
- Define limits per route
- Custom key generators
- Custom error messages
- Multiple limits per route

### Production Ready
- Proper HTTP headers
- Error handling
- Fail open on Redis errors
- Logging

### User Friendly
- Clear error messages
- Retry-After information
- Remaining requests shown

### Developer Friendly
- Predefined configs
- Easy to apply
- Testable
- Documented

---

## Quick Commands

```bash
# Run rate limiter tests
npm run test:ratelimit

# Check Redis rate limits
docker exec -it redis redis-cli
> KEYS rate:*
> GET "rate:search:+919840930854"
> TTL "rate:search:+919840930854"

# Clear all rate limits (if needed)
> KEYS rate:*
> DEL rate:search:+919840930854

# Monitor rate limit activity
> MONITOR
```

---

## What's Next: Day 4

**Task:** Role-Based Access Control (RBAC)

**Steps:**
1. Add `role` column to `community_members` table
2. Create `authorize.ts` middleware
3. Implement role checks (member/admin/super_admin)
4. Apply to protected routes
5. Test role enforcement

**Files to Create/Modify:**
- `src/middlewares/authorize.ts` - NEW
- Database migration for role column
- Update member types with role field
- Apply to admin routes

---

## Summary

✅ Rate limiter middleware created (flexible & reusable)  
✅ Applied to search API (30/hour)  
✅ Applied global limiter (1000/hour per IP)  
✅ WhatsApp already has rate limiting  
✅ Comprehensive test suite (7 tests passing)  
✅ Proper HTTP headers and error responses  
✅ Production-ready with error handling  
✅ Documentation complete  

**Day 3: COMPLETE!** Ready for Day 4: RBAC 🚀

---

**Time Investment:** ~1 hour  
**Next Session:** Day 4 - Role-Based Access Control (~2 hours)
