# Quick Deploy to VPS + WhatsApp Setup

## Step 1: Deploy to VPS with CI/CD (Automated) ✅

**Your setup uses:**
- ✅ AWS ECR for Docker images
- ✅ GitHub Actions for CI/CD
- ✅ VPS with docker-compose
- ✅ Redis included automatically

### Automatic Deployment (Already Configured!)

**Every push to `main` branch:**
1. GitHub Actions builds Docker image
2. Pushes to AWS ECR
3. Updates docker-compose.yaml with new image
4. Deploys to VPS at `connectbees.drizzfit.com`
5. Redis deploys automatically alongside app

**Your deployment URL:** `https://connectbees.drizzfit.com`

### Manual Deployment (If Needed)

```bash
# On your VPS
cd /root/communityconnect

# Pull latest image
docker-compose pull

# Deploy with Redis
docker-compose up -d

# Check status
docker-compose ps
```

**Environment Variables:** Managed via AWS Secrets Manager (`env-communityconnect`)

## Step 2: Setup Twilio WhatsApp (10 min)

1. **Create Twilio Account**
   ```
   - Go to twilio.com/try-twilio
   - Sign up (get $15 free credit)
   - Verify your phone number
   ```

2. **Get WhatsApp Sandbox**
   ```
   - Go to Console → Messaging → Try it out → Send a WhatsApp message
   - Send "join <your-sandbox-name>" to the Twilio WhatsApp number
   - You'll get a WhatsApp number like: +1 415 523 8886
   ```

3. **Configure Webhook**
   ```
   - In Twilio Console → Messaging → Settings → WhatsApp Sandbox
   - When a message comes in: https://connectbees.drizzfit.com/api/whatsapp/webhook
   - Method: POST
   - Save
   ```

## Step 3: Test WhatsApp Bot

1. **Send test message to Twilio WhatsApp number:**
   ```
   find AI experts
   ```

2. **You should receive:**
   ```
   🔍 I found 5 members...

   Found 5 members:

   1. *John Doe*
      📍 Chennai
      💼 AI Consultant
      🏢 Tech Corp

   ... and 2 more

   💡 Try asking:
   - Find members with AI experience
   - Show members in Mumbai
   ```

## Production Setup (Optional)

### Current VPS Setup ✅

**What's Already Configured:**
- ✅ Domain: `connectbees.drizzfit.com`
- ✅ SSL/TLS: Let's Encrypt (auto-renewal)
- ✅ Redis: Included in docker-compose
- ✅ Reverse proxy: nginx (via VIRTUAL_HOST)
- ✅ CI/CD: GitHub Actions → AWS ECR → VPS

**Docker Compose Services:**
```yaml
services:
  redis:
    - Redis for sessions & rate limiting
    - 256MB memory limit
    - Persistent data storage
  
  communityconnect:
    - Your Node.js app
    - Port 6000:3000
    - Connected to Redis
    - Auto-deploys on push
```

### Get Approved WhatsApp Business Number

1. **Apply for WhatsApp Business API**
   - Requires: Business verification
   - Cost: ~$0.005/message
   - Timeline: 1-2 weeks approval

2. **Update webhook URL** to your custom number

## Environment Variables Reference

### Managed via AWS Secrets Manager

Your environment variables are stored in AWS Secrets Manager (`env-communityconnect`) and automatically deployed:

```env
# Core
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://...

# LLM
DEEPINFRA_API_KEY=...

# Redis (auto-configured in docker-compose)
REDIS_URL=redis://redis:6379

# WhatsApp (Optional - for OTP)
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=...

# Domain (auto-configured in docker-compose)
VIRTUAL_HOST=connectbees.drizzfit.com
LETSENCRYPT_HOST=connectbees.drizzfit.com
LETSENCRYPT_EMAIL=srilekha@candorbees.com
```

### To Update Environment Variables

```bash
# Update in AWS Secrets Manager
aws secretsmanager update-secret \
  --secret-id env-communityconnect \
  --secret-string '{"KEY":"value"}'

# Redeploy (will fetch new values)
cd /root/communityconnect
docker-compose down
docker-compose up -d
```

## Webhook Endpoints

**Base URL:** `https://connectbees.drizzfit.com`

- `GET /api/whatsapp/webhook` - Verification (returns "Webhook is active")
- `POST /api/whatsapp/webhook` - Message handler (processes WhatsApp messages)

## CI/CD Pipeline

**Automatic deployment on every push to `main`:**

1. **Build** - Docker image built in GitHub Actions
2. **Push** - Image pushed to AWS ECR (`eu-north-1`)
3. **Copy** - docker-compose.yaml updated and copied to VPS
4. **Deploy** - VPS pulls image and restarts containers
5. **Cleanup** - Old ECR images pruned (keeps latest 5)

**Check deployment logs:**
```bash
# On VPS
docker-compose logs -f communityconnect
docker-compose logs -f redis
```

## Testing Locally with ngrok

```bash
# Terminal 1: Start server
npm run dev

# Terminal 2: Use ngrok for public URL
npx ngrok http 3000

# Use ngrok URL in Twilio webhook:
https://abc123.ngrok.io/api/whatsapp/webhook
```

## Troubleshooting

### VPS Deployment Issues

**Container not starting:**
```bash
# Check logs
docker-compose logs communityconnect

# Check Redis
docker-compose logs redis

# Restart services
docker-compose restart
```

**Webhook not receiving messages:**
- ✅ Check VPS logs: `docker-compose logs -f communityconnect`
- ✅ Verify webhook URL: `https://connectbees.drizzfit.com/api/whatsapp/webhook`
- ✅ Ensure method is POST in Twilio
- ✅ Check Twilio debugger
- ✅ Test endpoint: `curl https://connectbees.drizzfit.com/api/whatsapp/webhook`

**Redis connection errors:**
```bash
# Check Redis is running
docker-compose ps redis

# Check Redis logs
docker-compose logs redis

# Test Redis connection
docker exec -it connectbees-redis redis-cli ping
# Should return: PONG
```

**Authentication errors:**
- Phone must be in `community_members` table
- Phone format: 10 digits (no +91 prefix in DB)
- Check DB: `SELECT phone FROM community_members WHERE phone = '9943549835';`

**Environment variable issues:**
```bash
# Verify secrets fetched
cat /root/communityconnect/secret.env

# Update secrets in AWS
aws secretsmanager update-secret \
  --secret-id env-communityconnect \
  --secret-string file://new-secrets.json

# Redeploy
docker-compose down && docker-compose up -d
```

**GitHub Actions failing:**
- Check workflow logs in GitHub Actions tab
- Verify AWS credentials in repository secrets
- Ensure ECR repository exists: `communityconnect`
- Check VPS SSH access

## Costs

### VPS Deployment (Your Setup)
- VPS: $XX/month (your existing server)
- AWS ECR: ~$0.10/month (storage)
- Redis: FREE (included in docker-compose)
- Twilio Sandbox: FREE
- Twilio Production: $0.005/message
- **Total for 500 msgs/month: ~$2.50** (just Twilio messages)

### Comparison with Railway
- Railway: $5/month + $5/month for Redis
- Your VPS: FREE (already paid) + Redis included
- **Savings: ~$10/month**

## Next Steps

1. ✅ Deploy to VPS (automated via GitHub Actions)
2. ✅ Configure Twilio webhook
3. ✅ Test with WhatsApp
4. Week 3: Add admin dashboard
5. Production: Apply for WhatsApp Business API
