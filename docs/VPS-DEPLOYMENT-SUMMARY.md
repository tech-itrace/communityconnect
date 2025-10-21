# VPS Deployment Summary

## 🎯 Your Current Setup

### Infrastructure
- **VPS:** Your existing server
- **Domain:** `connectbees.drizzfit.com`
- **SSL:** Let's Encrypt (auto-renewal)
- **Reverse Proxy:** nginx (via VIRTUAL_HOST)
- **Container Management:** Docker Compose

### CI/CD Pipeline
```
GitHub Push (main branch)
    ↓
GitHub Actions
    ↓
Build Docker Image
    ↓
Push to AWS ECR (eu-north-1)
    ↓
Copy docker-compose.yaml to VPS
    ↓
Deploy on VPS
    ↓
Redis + App Running ✅
```

### Services Running

**1. Redis Container**
- Image: `redis:alpine`
- Purpose: Sessions & rate limiting
- Memory: 256MB limit
- Persistence: Volume-backed
- Connection: `redis://redis:6379`

**2. App Container**
- Image: From AWS ECR (auto-updated)
- Port: 6000 → 3000
- Connected to Redis automatically
- Environment: From AWS Secrets Manager

## ✅ Redis is Already Included!

**Your docker-compose.yaml:**
```yaml
services:
  redis:
    image: redis:alpine
    restart: unless-stopped
    ports:
      - "6379:6379"
    
  communityconnect:
    depends_on:
      - redis
    environment:
      - REDIS_URL=redis://redis:6379  # ← Automatically connected!
```

**Benefits:**
- ✅ Redis deploys automatically with your app
- ✅ No separate Redis service needed
- ✅ No extra $5/month cost (vs Railway)
- ✅ Network connection pre-configured
- ✅ Persistent data storage

## 🚀 To Deploy WhatsApp Integration

### 1. Already Done (Automatic)
- ✅ Code pushed to GitHub
- ✅ Docker image built & pushed to ECR
- ✅ Deployed to VPS with Redis
- ✅ SSL certificate configured

### 2. Configure Twilio (5 minutes)
```
1. Go to Twilio Console
2. Messaging → WhatsApp Sandbox
3. Set webhook URL:
   https://connectbees.drizzfit.com/api/whatsapp/webhook
4. Method: POST
5. Save
```

### 3. Test
```
Send WhatsApp message to Twilio number:
"find AI experts"

Bot responds with formatted results! ✅
```

## 🔧 Useful Commands

### Check Deployment Status
```bash
# SSH to VPS
ssh root@your-vps-ip

# Check running containers
cd /root/communityconnect
docker-compose ps

# View logs
docker-compose logs -f communityconnect
docker-compose logs -f redis

# Restart services
docker-compose restart

# Check Redis health
docker exec -it connectbees-redis redis-cli ping
# Should return: PONG
```

### Manual Deployment
```bash
# On VPS
cd /root/communityconnect

# Pull latest image
docker-compose pull

# Redeploy
docker-compose down
docker-compose up -d

# Check status
docker-compose ps
```

### Update Environment Variables
```bash
# Update in AWS Secrets Manager
aws secretsmanager update-secret \
  --secret-id env-communityconnect \
  --secret-string file://new-secrets.json

# Redeploy to pick up new values
cd /root/communityconnect
docker-compose down && docker-compose up -d
```

## 📊 Cost Comparison

### Your VPS Setup
- VPS: Already paid
- Redis: **FREE** (included in docker-compose)
- AWS ECR: ~$0.10/month
- GitHub Actions: FREE
- **Total: ~$0.10/month**

### Railway Alternative
- Railway App: $5/month
- Railway Redis: $5/month
- **Total: $10/month**

**Your Savings: ~$120/year** 💰

## 🔍 Monitoring & Debugging

### Check Webhook
```bash
# Test webhook endpoint
curl https://connectbees.drizzfit.com/api/whatsapp/webhook
# Should return: "Webhook is active"

# Test with sample data
curl -X POST https://connectbees.drizzfit.com/api/whatsapp/webhook \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "From=whatsapp:+919943549835" \
  --data-urlencode "Body=find AI experts" \
  --data-urlencode "ProfileName=Test User"
```

### View Logs
```bash
# Real-time logs
docker-compose logs -f

# Last 100 lines
docker-compose logs --tail=100

# Specific service
docker-compose logs -f communityconnect
docker-compose logs -f redis
```

### Check Redis Data
```bash
# Connect to Redis CLI
docker exec -it connectbees-redis redis-cli

# In Redis CLI:
> KEYS *                    # List all keys
> GET session:whatsapp:*   # View session
> TTL session:whatsapp:*   # Check TTL
> DBSIZE                   # Count keys
```

## 🚨 Troubleshooting

### Container Won't Start
```bash
# Check logs for errors
docker-compose logs communityconnect

# Check if port is available
netstat -tulpn | grep 6000

# Restart Docker
systemctl restart docker
docker-compose up -d
```

### Redis Connection Issues
```bash
# Verify Redis is running
docker-compose ps redis

# Test connection
docker exec -it connectbees-redis redis-cli ping

# Check network
docker network inspect communityconnect_grove-dev
```

### Webhook Not Working
```bash
# Check nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Verify SSL certificate
curl -I https://connectbees.drizzfit.com

# Check app logs
docker-compose logs -f communityconnect | grep WhatsApp
```

### GitHub Actions Failing
```bash
# Check in GitHub:
- Actions tab → View workflow run
- Verify AWS credentials in Secrets
- Check ECR repository exists

# On VPS:
- Verify secret.env exists
- Check AWS CLI credentials
```

## 📝 Environment Variables

**Location:** AWS Secrets Manager (`env-communityconnect`)

**Required Variables:**
```env
# Core
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://...

# LLM
DEEPINFRA_API_KEY=...

# Redis (auto-configured)
REDIS_URL=redis://redis:6379

# Domain (auto-configured)
VIRTUAL_HOST=connectbees.drizzfit.com
LETSENCRYPT_HOST=connectbees.drizzfit.com
LETSENCRYPT_EMAIL=srilekha@candorbees.com
```

## ✅ Week 2 Deployment Checklist

- [x] VPS deployment configured
- [x] CI/CD pipeline working (GitHub Actions)
- [x] Docker Compose with Redis
- [x] SSL certificate configured
- [x] Domain pointing to VPS
- [x] Environment variables in AWS Secrets Manager
- [ ] Twilio webhook configured (5 min task)
- [ ] WhatsApp sandbox joined
- [ ] Test WhatsApp messages

**You're 95% deployed! Just configure Twilio webhook to complete.**

## 🎉 Next Steps

1. **Configure Twilio Webhook** (5 minutes)
   - Set URL: `https://connectbees.drizzfit.com/api/whatsapp/webhook`
   
2. **Test WhatsApp** (2 minutes)
   - Join sandbox
   - Send test message
   - Verify bot responds

3. **Monitor** (ongoing)
   - Watch logs: `docker-compose logs -f`
   - Check Redis health
   - Review Twilio debugger

4. **Week 3: Admin Dashboard**
   - React frontend
   - Member management
   - Analytics

---

**Your deployment is production-ready!** 🚀
