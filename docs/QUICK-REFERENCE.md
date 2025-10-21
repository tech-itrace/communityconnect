# 🚀 Quick Reference - Twilio WhatsApp Testing

## 📋 Setup (One-time)

```bash
# 1. Install ngrok
brew install ngrok/ngrok/ngrok

# 2. Configure ngrok
ngrok config add-authtoken YOUR_TOKEN

# 3. Sign up Twilio
# https://www.twilio.com/try-twilio
```

## 🏃 Daily Workflow

### Terminal 1: Start Server
```bash
cd /Users/udhay/Documents/Candorbees/communityConnect/Server
npm run dev
```

### Terminal 2: Start ngrok
```bash
ngrok http 3000
```
📝 **Copy ngrok URL** (e.g., `https://abc123.ngrok-free.app`)

### Browser: Update Twilio Webhook
```
Twilio Console → WhatsApp Sandbox → Webhook
https://YOUR_NGROK_URL/api/whatsapp/webhook
```

### WhatsApp: Send Message
```
find AI experts
```

## 🔍 Monitoring URLs

| Service | URL | Purpose |
|---------|-----|---------|
| ngrok Web UI | http://localhost:4040 | See all requests |
| Server Health | http://localhost:3000/health | Check server |
| Twilio Debugger | https://twil.io/console/debugger | See webhook calls |

## 🧪 Testing Commands

```bash
# Test webhook locally
cd Server
./test-whatsapp-local.sh "find Python developers" "9876543210"

# Or with npm
npm run test:whatsapp

# Test specific endpoint
curl http://localhost:3000/api/whatsapp/webhook

# Check ngrok tunnel
curl http://localhost:4040/api/tunnels | jq
```

## 📱 WhatsApp Test Queries

```
find AI experts
find developers in Chennai
show me Python experts
members in Mumbai
who knows machine learning
```

## ⚠️ Common Issues

| Problem | Solution |
|---------|----------|
| No response | Update webhook URL in Twilio |
| "Not a member" | Add phone to database |
| ngrok changed URL | Update Twilio webhook |
| Webhook timeout | Check server logs, DB connection |

## 🔧 Quick Fixes

```bash
# Restart everything
# Terminal 1: Ctrl+C, then npm run dev
# Terminal 2: Ctrl+C, then ngrok http 3000
# Update webhook URL in Twilio

# Check server is running
curl http://localhost:3000/health

# Kill stuck processes
lsof -ti:3000 | xargs kill -9
```

## 📊 Useful SQL Queries

```sql
-- Check your phone number
SELECT * FROM community_members WHERE phone = '9876543210';

-- Add test user
INSERT INTO community_members (name, phone, email, city, skills)
VALUES ('Test User', '9876543210', 'test@test.com', 'Chennai', ARRAY['Python']);

-- Check embeddings
SELECT COUNT(*) FROM member_embeddings;
```

## 🎯 Success Indicators

✅ Server terminal shows: "Server running on port 3000"
✅ ngrok terminal shows: "Forwarding https://..."
✅ WhatsApp bot responds to messages
✅ ngrok UI (localhost:4040) shows requests
✅ Server logs show: "[WhatsApp] Message from..."

## 🛑 Before You Leave

```bash
# Stop servers gracefully
# Terminal 1: Ctrl+C (server)
# Terminal 2: Ctrl+C (ngrok)

# Or kill all
pkill -f ts-node-dev
pkill ngrok
```

## 📞 Twilio Sandbox Info

- **Number:** +1 415 523 8886 (example)
- **Join code:** `join your-code` (from Twilio console)
- **Valid for:** 3 days (rejoin after expiry)

## 🌐 Important URLs

- ngrok Dashboard: https://dashboard.ngrok.com
- Twilio Console: https://console.twilio.com
- WhatsApp Sandbox: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn

---

**Keep ngrok running during testing!**
Free plan changes URL on restart → Update Twilio webhook each time.
