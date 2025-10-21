# Security & Authentication - REVISED Plan (WhatsApp-First)

**Status:** 🟡 Revised for WhatsApp  
**Priority:** ⚠️ MUST HAVE  
**Timeline:** 1 week (reduced from 2 weeks)  
**Cost:** $5/month (just Redis, no Twilio OTP needed)

---

## 🔑 Key Insight

**You're right!** WhatsApp users are **already authenticated** by WhatsApp/Twilio. We don't need separate OTP verification.

```
WhatsApp Flow:
User sends message → Twilio verifies phone → Webhook to our server
                     ↑
                Already authenticated!
```

---

## Revised Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              Simplified Security Flow                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. User sends WhatsApp → Twilio validates phone             │
│  2. Webhook received → Extract verified phone number         │
│  3. Check member status → Query Supabase                     │
│  4. Generate session → Store in Redis (24h)                  │
│  5. Process message → Apply rate limits                      │
│  6. Return response → Via WhatsApp                           │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## What Changes?

### ❌ REMOVE:
- OTP service (not needed!)
- Twilio SMS sending (WhatsApp already uses Twilio)
- `/auth/request-otp` endpoint
- `/auth/verify-otp` endpoint
- JWT tokens for WhatsApp users (stateless, session-based instead)

### ✅ KEEP:
- JWT tokens for **Admin Dashboard** (web-based, needs auth)
- Redis sessions (conversation history + rate limiting)
- Role-based access control (member/admin/super_admin)
- Rate limiting (prevent abuse)

---

## Implementation Tasks (REVISED)

### Phase 1: Session Management (2 days)

#### 1.1 Redis Setup
```bash
# Local
docker run -d -p 6379:6379 redis:alpine

# Production (Railway)
Add Redis plugin → $5/month
```

**Dependencies:**
```bash
npm install redis
npm install @types/redis --save-dev
```

#### 1.2 Session Service
**File:** `src/services/sessionService.ts`

**WhatsApp Session Logic:**
```typescript
// When WhatsApp message received:
1. Extract phone from Twilio webhook: req.body.From
2. Validate member: conversationService.validateMember(phone)
3. Create/update session: sessionService.getOrCreateSession(phone)
4. Store conversation history in Redis (30-min TTL)
5. Apply rate limits
6. Process message
7. Update session
```

**Session Structure:**
```typescript
{
  userId: string,
  phoneNumber: string,
  role: 'member' | 'admin',
  conversationHistory: Message[],
  lastActivity: Date,
  messageCount: number
}
```

**Redis Keys:**
```
session:whatsapp:{phoneNumber}  → Session data (TTL: 30min)
rate:msg:{phoneNumber}          → Message count (TTL: 1h)
rate:search:{phoneNumber}       → Search count (TTL: 1h)
```

---

### Phase 2: Rate Limiting (1 day)

#### 2.1 WhatsApp-Specific Rate Limits
**File:** `src/middlewares/rateLimiter.ts`

```typescript
// Rate limits per phone number:
messages: 50 messages/hour    // Prevent spam
searches: 30 searches/hour    // Prevent API abuse
context: 10 requests/min      // Prevent rapid-fire
```

**Implementation:**
- Check Redis counter before processing
- Increment on each message
- Return friendly WhatsApp message if exceeded:
  ```
  "You've reached the hourly limit (50 messages). 
   Please try again in 30 minutes. 🙏"
  ```

---

### Phase 3: Role-Based Access (2 days)

#### 3.1 Database Schema
```sql
-- Add role column to community_members
ALTER TABLE community_members 
ADD COLUMN role VARCHAR(20) DEFAULT 'member';

-- Update existing members
UPDATE community_members SET role = 'member';

-- Promote admins manually
UPDATE community_members 
SET role = 'admin' 
WHERE phone = '919840930854';
```

#### 3.2 Role Permissions (WhatsApp)

| Role | WhatsApp Access |
|------|-----------------|
| **member** | Search members, view profiles |
| **admin** | Everything + add/edit members via NL commands |
| **super_admin** | Everything + delete members |

**Example Admin Commands (via WhatsApp):**
```
"Add new member John Doe, phone 9876543210, email john@example.com"
"Update Priya's email to priya.new@email.com"
"Remove member with phone 9999999999" (super_admin only)
```

---

### Phase 4: Admin Dashboard Auth (2 days)

**This is where JWT is actually needed!**

#### 4.1 Separate Auth for Web Dashboard
**File:** `src/routes/auth.ts`

**Endpoints (for web dashboard only):**
```typescript
POST /auth/admin/login
Body: { phoneNumber: string, password: string }
Response: { token: string, role: string }

POST /auth/admin/refresh
Body: { refreshToken: string }
Response: { token: string }

POST /auth/admin/logout
Headers: Authorization: Bearer <token>
Response: { success: true }
```

#### 4.2 JWT for Dashboard Only
```typescript
// Admin logs in via web dashboard
// Gets JWT token
// Uses token for dashboard API calls
// WhatsApp users don't need tokens (session-based)
```

#### 4.3 Dual Auth Strategy
```typescript
// src/middlewares/auth.ts

export function authenticate(req, res, next) {
  // Check if request from WhatsApp webhook
  if (req.path.startsWith('/webhook/whatsapp')) {
    // Session-based auth (phone from Twilio)
    return authenticateWhatsApp(req, res, next);
  }
  
  // Dashboard/API requests
  // JWT-based auth (Bearer token)
  return authenticateJWT(req, res, next);
}
```

---

## File Structure (REVISED)

```
Server/src/
├── config/
│   ├── redis.ts              # NEW: Redis client
│   └── jwt.ts                # NEW: JWT for dashboard only
│
├── services/
│   ├── sessionService.ts     # NEW: WhatsApp session management
│   └── jwtService.ts         # NEW: Dashboard JWT only
│
├── middlewares/
│   ├── auth.ts               # NEW: Dual auth (WhatsApp + Dashboard)
│   ├── authorize.ts          # NEW: Role checks
│   ├── rateLimiter.ts        # NEW: WhatsApp rate limiting
│   └── errorHandler.ts       # UPDATE: Handle auth errors
│
├── routes/
│   ├── auth.ts               # NEW: Dashboard login only
│   └── whatsapp.ts           # UPDATE: Add session handling
│
└── utils/
    └── types.ts              # UPDATE: Session types
```

---

## Environment Variables (SIMPLIFIED)

```bash
# Redis (only external service needed!)
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=
REDIS_TLS=false

# JWT (for admin dashboard only)
JWT_SECRET=your-super-secret-key-min-32-chars
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Admin credentials (for dashboard login)
ADMIN_PASSWORD_HASH=bcrypt_hash_here

# Rate limits
RATE_LIMIT_MESSAGES_PER_HOUR=50
RATE_LIMIT_SEARCHES_PER_HOUR=30
```

---

## Implementation Checklist (REVISED)

### Day 1-2: Redis + Sessions
- [ ] Setup Redis (Docker local, Railway prod)
- [ ] Create `src/config/redis.ts`
- [ ] Create `src/services/sessionService.ts`
- [ ] Update WhatsApp webhook to use sessions
- [ ] Store conversation history in Redis
- [ ] Test session persistence

### Day 3: Rate Limiting
- [ ] Create `src/middlewares/rateLimiter.ts`
- [ ] Add rate limit checks to WhatsApp webhook
- [ ] Configure limits (50 msg/hour, 30 search/hour)
- [ ] Test rate limit enforcement
- [ ] Add friendly error messages

### Day 4-5: RBAC
- [ ] Add `role` column to database
- [ ] Create `src/middlewares/authorize.ts`
- [ ] Implement role checks in search/commands
- [ ] Test member vs admin access
- [ ] Document admin commands

### Day 6-7: Dashboard Auth (Optional - Week 2)
- [ ] Create `src/routes/auth.ts` (dashboard login)
- [ ] Create `src/services/jwtService.ts`
- [ ] Add password hashing (bcrypt)
- [ ] Create dual auth middleware
- [ ] Test dashboard login flow

---

## WhatsApp Webhook Flow (REVISED)

```typescript
// src/controllers/botController.ts

export async function handleWhatsAppMessage(req, res) {
  try {
    // 1. Extract verified phone (already authenticated by Twilio!)
    const phoneNumber = req.body.From; // e.g., "whatsapp:+919840930854"
    const message = req.body.Body;
    
    // 2. Validate member
    const { isValid, memberId, memberName, role } = 
      await conversationService.validateMember(phoneNumber);
    
    if (!isValid) {
      return res.send({
        body: "Sorry, this service is only for registered members."
      });
    }
    
    // 3. Get/create session
    const session = await sessionService.getOrCreateSession({
      phoneNumber,
      userId: memberId,
      role
    });
    
    // 4. Check rate limits
    const rateLimitCheck = await rateLimiter.checkWhatsAppRateLimit(phoneNumber);
    if (rateLimitCheck.exceeded) {
      return res.send({
        body: `You've reached the hourly limit. Try again in ${rateLimitCheck.retryAfter} minutes.`
      });
    }
    
    // 5. Process message (existing logic)
    const response = await llmService.processQuery({
      query: message,
      conversationHistory: session.history,
      userId: memberId
    });
    
    // 6. Update session
    await sessionService.updateSession(phoneNumber, {
      lastMessage: message,
      lastResponse: response,
      messageCount: session.messageCount + 1
    });
    
    // 7. Send response
    return res.send({ body: response });
    
  } catch (error) {
    console.error('WhatsApp message error:', error);
    return res.send({
      body: "Sorry, something went wrong. Please try again."
    });
  }
}
```

---

## Cost Breakdown (REVISED)

### Development
| Item | Cost |
|------|------|
| Redis (local) | Free |
| Twilio WhatsApp | Free tier (1000 msgs/month) |
| **Total Dev** | **$0** |

### Production
| Item | Monthly Cost |
|------|--------------|
| Redis (Railway) | $5 |
| Twilio WhatsApp | $0.005/msg (~$5 for 1000 msgs) |
| **Total** | **~$10/month** |

**Savings:** $7.50/month (no SMS OTP needed!)

---

## Testing Plan (REVISED)

### Manual Testing (WhatsApp)
```
1. Send "Hi" to WhatsApp bot
   ✓ Get welcome message
   ✓ Session created in Redis

2. Send "Find doctors"
   ✓ Get search results
   ✓ Conversation history stored

3. Send 55 messages rapidly
   ✓ Get rate limit message after 50

4. Wait 30 minutes
   ✓ Session expires
   ✓ New session created on next message

5. Try admin command (as member)
   ✓ Get "Not authorized" message

6. Try admin command (as admin)
   ✓ Command executed successfully
```

### Integration Tests
```typescript
// tests/whatsapp-session.test.ts
✓ Session created on first message
✓ Session retrieved on subsequent messages
✓ Session expires after 30 minutes
✓ Conversation history persisted
✓ Rate limit enforced
✓ Role-based access works
```

---

## Migration Path

### Immediate (This Week)
1. ✅ Setup Redis
2. ✅ Add session management to WhatsApp webhook
3. ✅ Add rate limiting
4. ✅ Add role column to database
5. ✅ Test with real WhatsApp

### Later (When Dashboard Ready)
1. ✅ Add JWT service
2. ✅ Create admin login endpoint
3. ✅ Add dual auth middleware
4. ✅ Secure dashboard API routes

---

## Key Differences

| Feature | Original Plan | Revised Plan |
|---------|---------------|--------------|
| **OTP Service** | ✅ Via SMS | ❌ Not needed |
| **Twilio SMS** | ✅ $0.0075/msg | ❌ Not needed |
| **JWT for WhatsApp** | ✅ Required | ❌ Session-based |
| **JWT for Dashboard** | ✅ Required | ✅ Still needed |
| **Timeline** | 2 weeks | 1 week |
| **Cost** | $14/month | $10/month |

---

## Success Criteria (REVISED)

✅ **WhatsApp users can message without extra auth**  
✅ **Sessions persist in Redis**  
✅ **Rate limiting prevents spam (50 msg/hour)**  
✅ **Conversation history works**  
✅ **Roles control access (member/admin)**  
✅ **Admin dashboard has JWT login**  
✅ **<500ms message processing overhead**  
✅ **99.9% uptime**

---

## Bottom Line

**Your insight is correct!** 

- ✅ WhatsApp users → **No OTP needed** (already authenticated)
- ✅ Dashboard users → **JWT tokens** (web needs auth)
- ✅ Both → **Redis sessions + rate limiting**

**New Timeline:** 5-7 days (instead of 14)  
**New Cost:** $10/month (instead of $14)  
**Simpler:** One less auth flow to maintain

**Ready to implement the revised plan?** 🚀
