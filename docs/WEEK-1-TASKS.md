# 🎯 Immediate Next Steps (This Week)

**Current Status**: Phase 1-3 Complete, Running on localhost  
**Goal**: Production-ready MVP in 4 weeks  
**This Week's Focus**: Security + Deployment

---

## Day 1: Production Deployment ⚡ (4-6 hours)

### Morning: Railway Setup (2 hours)

1. **Create Railway Account** (5 min)
   ```bash
   # Go to railway.app
   # Sign up with GitHub
   # Connect communityConnect repo
   ```

2. **Configure Environment Variables** (15 min)
   ```env
   NODE_ENV=production
   PORT=8080
   DATABASE_URL=your_supabase_connection_string
   DEEPINFRA_API_KEY=your_deepinfra_key
   
   # Add these later when implemented:
   # TWILIO_ACCOUNT_SID=
   # TWILIO_AUTH_TOKEN=
   # STRIPE_SECRET_KEY=
   # REDIS_URL=
   ```

3. **Add Build/Start Commands** (5 min)
   ```json
   // In package.json - verify these exist:
   {
     "scripts": {
       "build": "tsc",
       "start": "node dist/server.js",
       "dev": "ts-node-dev --respawn src/server.ts"
     }
   }
   ```

4. **Deploy & Test** (30 min)
   ```bash
   # Railway auto-deploys on Git push
   git add .
   git commit -m "feat: prepare for production deployment"
   git push origin main
   
   # Railway will:
   # - Install dependencies (npm ci)
   # - Build TypeScript (npm run build)
   # - Start server (npm start)
   
   # Get your production URL:
   # https://communityconnect-production.up.railway.app
   
   # Test it:
   curl https://your-app.railway.app/health
   ```

5. **Setup Custom Domain** (30 min - OPTIONAL)
   ```bash
   # In Railway dashboard:
   # Settings → Domains → Add Custom Domain
   # Add: api.communityconnect.io
   
   # In your DNS (Cloudflare/Namecheap):
   # Add CNAME: api → your-app.railway.app
   ```

### Afternoon: Monitoring Setup (2 hours)

6. **Add Sentry Error Tracking** (30 min)
   ```bash
   cd Server
   npm install @sentry/node @sentry/tracing
   ```
   
   Create `src/config/sentry.ts`:
   ```typescript
   import * as Sentry from '@sentry/node';
   import * as Tracing from '@sentry/tracing';
   import { Express } from 'express';
   
   export function initSentry(app: Express) {
     if (process.env.NODE_ENV === 'production') {
       Sentry.init({
         dsn: process.env.SENTRY_DSN,
         environment: process.env.NODE_ENV,
         tracesSampleRate: 0.1,
         integrations: [
           new Sentry.Integrations.Http({ tracing: true }),
           new Tracing.Integrations.Express({ app })
         ]
       });
       
       app.use(Sentry.Handlers.requestHandler());
       app.use(Sentry.Handlers.tracingHandler());
     }
   }
   
   export function sentryErrorHandler(app: Express) {
     if (process.env.NODE_ENV === 'production') {
       app.use(Sentry.Handlers.errorHandler());
     }
   }
   ```
   
   Update `src/app.ts`:
   ```typescript
   import { initSentry, sentryErrorHandler } from './config/sentry';
   
   // After creating app
   initSentry(app);
   
   // ... your routes ...
   
   // Before other error handlers
   sentryErrorHandler(app);
   ```
   
   Sign up at sentry.io (free tier: 5K errors/month)

7. **Add Health Check Endpoint** (15 min)
   ```typescript
   // src/routes/health.ts
   import { Router } from 'express';
   import { query } from '../config/db';
   
   const router = Router();
   
   router.get('/health', async (req, res) => {
     try {
       // Check database
       await query('SELECT 1');
       
       res.json({
         status: 'healthy',
         timestamp: new Date().toISOString(),
         uptime: process.uptime(),
         environment: process.env.NODE_ENV,
         version: '1.0.0'
       });
     } catch (error) {
       res.status(503).json({
         status: 'unhealthy',
         error: 'Database connection failed'
       });
     }
   });
   
   router.get('/healthz', (req, res) => {
     res.status(200).send('OK');
   });
   
   router.get('/ready', async (req, res) => {
     try {
       await query('SELECT 1');
       res.status(200).send('READY');
     } catch {
       res.status(503).send('NOT READY');
     }
   });
   
   export default router;
   ```
   
   Add to `src/routes/index.ts`:
   ```typescript
   import healthRouter from './health';
   app.use('/', healthRouter);
   ```

8. **Setup Uptime Monitoring** (15 min)
   ```bash
   # Go to uptimerobot.com (free account)
   # Add monitor:
   # - Type: HTTP(S)
   # - URL: https://your-app.railway.app/health
   # - Interval: 5 minutes
   # - Alert Contacts: Your email
   ```

9. **Add Structured Logging** (45 min)
   ```bash
   npm install winston winston-daily-rotate-file
   ```
   
   Create `src/utils/logger.ts`:
   ```typescript
   import winston from 'winston';
   import DailyRotateFile from 'winston-daily-rotate-file';
   
   const logFormat = winston.format.combine(
     winston.format.timestamp(),
     winston.format.errors({ stack: true }),
     winston.format.json()
   );
   
   const transports: winston.transport[] = [
     new winston.transports.Console({
       format: winston.format.combine(
         winston.format.colorize(),
         winston.format.simple()
       )
     })
   ];
   
   if (process.env.NODE_ENV === 'production') {
     transports.push(
       new DailyRotateFile({
         filename: 'logs/app-%DATE%.log',
         datePattern: 'YYYY-MM-DD',
         maxSize: '20m',
         maxFiles: '14d',
         level: 'info'
       }),
       new DailyRotateFile({
         filename: 'logs/error-%DATE%.log',
         datePattern: 'YYYY-MM-DD',
         maxSize: '20m',
         maxFiles: '30d',
         level: 'error'
       })
     );
   }
   
   export const logger = winston.createLogger({
     level: process.env.LOG_LEVEL || 'info',
     format: logFormat,
     transports
   });
   
   // Replace console.log usage:
   // console.log('message') → logger.info('message')
   // console.error('error') → logger.error('error')
   ```

---

## Day 2: Security Hardening 🔐 (6-8 hours)

### Morning: Rate Limiting (2 hours)

10. **Install Dependencies** (2 min)
    ```bash
    npm install express-rate-limit
    ```

11. **Create Rate Limiter** (30 min)
    ```typescript
    // src/middlewares/rateLimiter.ts
    import rateLimit from 'express-rate-limit';
    
    // Global rate limiter
    export const globalLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // 100 requests per 15 min
      message: 'Too many requests, please try again later',
      standardHeaders: true,
      legacyHeaders: false
    });
    
    // Search rate limiter (more restrictive)
    export const searchLimiter = rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 50, // 50 searches per hour
      message: 'Search quota exceeded. Please try again later.',
      keyGenerator: (req) => {
        // Rate limit by phone number if authenticated
        return req.body.phoneNumber || req.ip;
      }
    });
    
    // OTP rate limiter (will implement later)
    export const otpLimiter = rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 3, // 3 OTP requests per hour per phone
      message: 'Too many OTP requests. Please try again later.',
      keyGenerator: (req) => req.body.phoneNumber || req.ip
    });
    ```

12. **Apply Rate Limiters** (15 min)
    ```typescript
    // src/app.ts
    import { globalLimiter, searchLimiter } from './middlewares/rateLimiter';
    
    // Apply global rate limiter to all routes
    app.use(globalLimiter);
    
    // Apply search limiter to search routes
    app.use('/api/search', searchLimiter);
    ```

13. **Test Rate Limiting** (15 min)
    ```bash
    # Test with a loop
    for i in {1..60}; do
      curl -X POST http://localhost:3000/api/search/query \
        -H "Content-Type: application/json" \
        -d '{"query": "test", "phoneNumber": "919840930854"}'
      sleep 1
    done
    
    # Should see "Search quota exceeded" after 50 requests
    ```

### Afternoon: Input Validation (2 hours)

14. **Install Validation Library** (2 min)
    ```bash
    npm install joi express-validator
    ```

15. **Create Validators** (1 hour)
    ```typescript
    // src/middlewares/validator.ts
    import { body, param, query, validationResult } from 'express-validator';
    import { Request, Response, NextFunction } from 'express';
    
    export const handleValidationErrors = (
      req: Request,
      res: Response,
      next: NextFunction
    ) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            details: errors.array()
          }
        });
      }
      next();
    };
    
    // Phone number validator
    export const validatePhoneNumber = [
      body('phoneNumber')
        .matches(/^[6-9]\d{9}$/)
        .withMessage('Invalid Indian mobile number')
        .trim()
        .escape(),
      handleValidationErrors
    ];
    
    // Search query validator
    export const validateSearchQuery = [
      body('query')
        .isString()
        .trim()
        .isLength({ min: 3, max: 500 })
        .withMessage('Query must be between 3 and 500 characters')
        .escape(),
      body('options.maxResults')
        .optional()
        .isInt({ min: 1, max: 50 })
        .withMessage('maxResults must be between 1 and 50'),
      handleValidationErrors
    ];
    ```

16. **Apply Validators** (30 min)
    ```typescript
    // src/controllers/nlSearchController.ts
    import { validatePhoneNumber, validateSearchQuery } from '../middlewares/validator';
    
    // In router:
    router.post('/query',
      validatePhoneNumber,
      validateSearchQuery,
      handleNaturalLanguageQuery
    );
    ```

### Evening: Security Headers (1 hour)

17. **Install Helmet** (2 min)
    ```bash
    npm install helmet
    ```

18. **Configure Security Headers** (15 min)
    ```typescript
    // src/app.ts
    import helmet from 'helmet';
    
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"]
        }
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    }));
    ```

19. **Update CORS** (15 min)
    ```typescript
    // src/app.ts
    import cors from 'cors';
    
    app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));
    ```

---

## Day 3: OTP Authentication Setup 📱 (8 hours)

### Morning: Twilio Setup (2 hours)

20. **Create Twilio Account** (15 min)
    ```
    1. Go to twilio.com/try-twilio
    2. Sign up (get $15 free credit)
    3. Get phone number (for SMS)
    4. Get Account SID and Auth Token
    5. Add to Railway environment variables
    ```

21. **Install Twilio SDK** (2 min)
    ```bash
    npm install twilio
    ```

22. **Create Twilio Service** (45 min)
    ```typescript
    // src/services/twilioService.ts
    import twilio from 'twilio';
    
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    
    export async function sendOTP(phoneNumber: string, otp: string): Promise<boolean> {
      try {
        await client.messages.create({
          body: `Your Community Connect verification code is: ${otp}. Valid for 5 minutes.`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: `+91${phoneNumber}`
        });
        return true;
      } catch (error: any) {
        console.error('[Twilio] Failed to send OTP:', error.message);
        return false;
      }
    }
    ```

### Afternoon: OTP Logic (3 hours)

23. **Create OTP Service** (1.5 hours)
    ```typescript
    // src/services/otpService.ts
    import crypto from 'crypto';
    
    interface OTPSession {
      otp: string;
      phoneNumber: string;
      createdAt: number;
      attempts: number;
    }
    
    // In-memory storage (will move to Redis later)
    const otpSessions = new Map<string, OTPSession>();
    
    export function generateOTP(): string {
      return crypto.randomInt(100000, 999999).toString();
    }
    
    export function storeOTP(phoneNumber: string, otp: string): void {
      otpSessions.set(phoneNumber, {
        otp,
        phoneNumber,
        createdAt: Date.now(),
        attempts: 0
      });
      
      // Auto-expire after 5 minutes
      setTimeout(() => {
        otpSessions.delete(phoneNumber);
      }, 5 * 60 * 1000);
    }
    
    export function verifyOTP(phoneNumber: string, otp: string): { valid: boolean; message: string } {
      const session = otpSessions.get(phoneNumber);
      
      if (!session) {
        return { valid: false, message: 'OTP expired or not found' };
      }
      
      // Check expiry (5 minutes)
      if (Date.now() - session.createdAt > 5 * 60 * 1000) {
        otpSessions.delete(phoneNumber);
        return { valid: false, message: 'OTP expired' };
      }
      
      // Check attempts (max 3)
      if (session.attempts >= 3) {
        otpSessions.delete(phoneNumber);
        return { valid: false, message: 'Too many failed attempts' };
      }
      
      // Verify OTP
      if (session.otp === otp) {
        otpSessions.delete(phoneNumber);
        return { valid: true, message: 'OTP verified successfully' };
      }
      
      // Increment attempts
      session.attempts++;
      return { valid: false, message: 'Invalid OTP' };
    }
    ```

24. **Create JWT Service** (1 hour)
    ```bash
    npm install jsonwebtoken
    npm install -D @types/jsonwebtoken
    ```
    
    ```typescript
    // src/services/jwtService.ts
    import jwt from 'jsonwebtoken';
    
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    const JWT_EXPIRES_IN = '7d';
    
    export interface JWTPayload {
      userId: number;
      phoneNumber: string;
      name: string;
      role: string;
    }
    
    export function generateToken(payload: JWTPayload): string {
      return jwt.sign(payload, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN
      });
    }
    
    export function verifyToken(token: string): JWTPayload | null {
      try {
        return jwt.verify(token, JWT_SECRET) as JWTPayload;
      } catch {
        return null;
      }
    }
    ```

25. **Create Auth Controller** (30 min)
    ```typescript
    // src/controllers/authController.ts
    import { Request, Response } from 'express';
    import { generateOTP, storeOTP, verifyOTP } from '../services/otpService';
    import { sendOTP } from '../services/twilioService';
    import { generateToken } from '../services/jwtService';
    import { validateMember } from '../services/conversationService';
    
    export async function sendOTPHandler(req: Request, res: Response) {
      try {
        const { phoneNumber } = req.body;
        
        // Check if member exists
        const validation = await validateMember(phoneNumber);
        if (!validation.isValid) {
          return res.status(403).json({
            success: false,
            error: 'Not a community member'
          });
        }
        
        // Generate and store OTP
        const otp = generateOTP();
        storeOTP(phoneNumber, otp);
        
        // Send OTP via SMS
        const sent = await sendOTP(phoneNumber, otp);
        
        if (!sent) {
          return res.status(500).json({
            success: false,
            error: 'Failed to send OTP'
          });
        }
        
        res.json({
          success: true,
          message: 'OTP sent successfully',
          expiresIn: 300 // 5 minutes
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    }
    
    export async function verifyOTPHandler(req: Request, res: Response) {
      try {
        const { phoneNumber, otp } = req.body;
        
        // Verify OTP
        const result = verifyOTP(phoneNumber, otp);
        
        if (!result.valid) {
          return res.status(400).json({
            success: false,
            error: result.message
          });
        }
        
        // Get member details
        const member = await validateMember(phoneNumber);
        
        // Generate JWT
        const token = generateToken({
          userId: member.memberId!,
          phoneNumber,
          name: member.memberName!,
          role: 'member' // Will add role column later
        });
        
        res.json({
          success: true,
          message: 'Authentication successful',
          token,
          user: {
            id: member.memberId,
            name: member.memberName,
            phoneNumber
          }
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    }
    ```

26. **Create Auth Routes** (15 min)
    ```typescript
    // src/routes/auth.ts
    import { Router } from 'express';
    import { sendOTPHandler, verifyOTPHandler } from '../controllers/authController';
    import { otpLimiter } from '../middlewares/rateLimiter';
    
    const router = Router();
    
    router.post('/send-otp', otpLimiter, sendOTPHandler);
    router.post('/verify-otp', verifyOTPHandler);
    
    export default router;
    ```
    
    Add to `src/routes/index.ts`:
    ```typescript
    import authRouter from './auth';
    app.use('/api/auth', authRouter);
    ```

---

## Day 4: Testing & Documentation 📝 (6 hours)

27. **Test OTP Flow** (1 hour)
    ```bash
    # Test send OTP
    curl -X POST http://localhost:3000/api/auth/send-otp \
      -H "Content-Type: application/json" \
      -d '{"phoneNumber": "9840930854"}'
    
    # Check your phone for OTP
    
    # Test verify OTP
    curl -X POST http://localhost:3000/api/auth/verify-otp \
      -H "Content-Type: application/json" \
      -d '{"phoneNumber": "9840930854", "otp": "123456"}'
    
    # Should get JWT token
    ```

28. **Update Test Scripts** (1 hour)
    ```bash
    # Update test-auth-conversation.sh to use OTP flow
    # Update test-phase3.sh to include authentication
    ```

29. **Update OpenAPI Spec** (2 hours)
    ```yaml
    # Update Server/openapi.yaml with:
    # - /api/auth/send-otp endpoint
    # - /api/auth/verify-otp endpoint
    # - JWT authentication scheme
    # - Updated /api/search/query with auth requirement
    ```

30. **Write Quick Start Guide** (1 hour)
    ```markdown
    # Create docs/QUICKSTART.md
    # Include:
    # - How to run locally
    # - How to test OTP flow
    # - How to search with authentication
    # - Troubleshooting common issues
    ```

31. **Deploy to Production** (1 hour)
    ```bash
    git add .
    git commit -m "feat: add OTP authentication and production deployment"
    git push origin main
    
    # Railway auto-deploys
    # Test production API
    # Monitor Sentry for errors
    ```

---

## Success Checklist ✅

By end of Week 1, you should have:

- ✅ App deployed on Railway (production URL)
- ✅ Health check endpoints working
- ✅ Sentry error tracking active
- ✅ Uptime monitoring configured
- ✅ Rate limiting preventing abuse
- ✅ Input validation on all endpoints
- ✅ Security headers configured
- ✅ OTP authentication working
- ✅ JWT tokens issued
- ✅ Structured logging in place
- ✅ Test scripts updated
- ✅ Documentation updated

---

## Next Week Preview 👀

**Week 2: WhatsApp Integration**
- Twilio WhatsApp Business API setup
- Webhook handler for incoming messages
- Conversation state machine
- Message formatting
- Testing with real users

**Week 3: Admin Dashboard**
- React + Vite frontend
- Member management UI
- Search analytics
- Deploy to Vercel

**Week 4: Polish & Launch**
- Multi-tenancy (optional)
- Payments (optional)
- End-to-end testing
- Beta launch with 3-5 communities

---

## Need Help?

**Common Issues & Solutions:**

1. **Railway deployment fails**
   - Check build logs
   - Verify package.json scripts
   - Ensure all dependencies in package.json

2. **Twilio OTP not sending**
   - Verify phone number format (+91...)
   - Check Twilio console for errors
   - Verify account SID and auth token

3. **Rate limiting too strict**
   - Adjust limits in rateLimiter.ts
   - Add whitelist for admin IPs

4. **Database connection errors**
   - Verify DATABASE_URL in Railway
   - Check Supabase connection pooler
   - Increase connection pool size

**Support:**
- Check docs/TROUBLESHOOTING.md
- Review Railway logs
- Check Sentry errors
- Test locally first

---

## Quick Commands Reference

```bash
# Start local server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run tests
npm test

# Check TypeScript errors
npx tsc --noEmit

# Deploy to Railway
git push origin main

# View Railway logs
railway logs

# Check health
curl https://your-app.railway.app/health
```

Good luck with Week 1! 🚀
