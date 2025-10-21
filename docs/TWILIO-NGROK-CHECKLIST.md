# Quick Start Checklist - Twilio WhatsApp with ngrok

Use this checklist to get up and running in ~15 minutes.

## ☑️ Pre-flight Checklist

- [ ] Local server can start (`cd Server && npm run dev`)
- [ ] Database connection works
- [ ] Have a phone number ready for testing
- [ ] Phone number exists in `community_members` table

## 📋 Setup Steps

### 1. Install ngrok (2 min)
- [ ] Install ngrok: `brew install ngrok/ngrok/ngrok`
- [ ] Verify: `ngrok --version`
- [ ] Sign up: https://dashboard.ngrok.com/signup
- [ ] Get auth token from dashboard
- [ ] Configure: `ngrok config add-authtoken YOUR_TOKEN`

### 2. Start Services (2 min)
- [ ] **Terminal 1:** Start server
  ```bash
  cd /Users/udhay/Documents/Candorbees/communityConnect/Server
  npm run dev
  ```
- [ ] **Terminal 2:** Start ngrok
  ```bash
  ngrok http 3000
  ```
- [ ] Copy ngrok URL (e.g., `https://abc123.ngrok-free.app`)

### 3. Setup Twilio (5 min)
- [ ] Sign up: https://www.twilio.com/try-twilio
- [ ] Verify email and phone
- [ ] Go to: Console → Messaging → Try WhatsApp
- [ ] Note Twilio WhatsApp number (e.g., `+1 415 523 8886`)
- [ ] Note join code (e.g., `join arrive-building`)

### 4. Join WhatsApp Sandbox (1 min)
- [ ] Open WhatsApp on your phone
- [ ] Send join message to Twilio number
- [ ] Wait for confirmation: "Awesome! You're all set."

### 5. Configure Webhook (2 min)
- [ ] In Twilio Console → WhatsApp Sandbox Settings
- [ ] "When a message comes in":
  ```
  https://YOUR_NGROK_URL/api/whatsapp/webhook
  ```
- [ ] Method: **POST**
- [ ] Click **Save**

### 6. Test! (2 min)
- [ ] Send message to Twilio WhatsApp number:
  ```
  find AI experts
  ```
- [ ] Receive response from bot
- [ ] Check ngrok interface: http://localhost:4040
- [ ] Check server logs in Terminal 1

## ✅ Success Criteria

You're ready when:
- ✅ Bot responds to your WhatsApp messages
- ✅ Server logs show incoming requests
- ✅ ngrok interface shows webhook calls
- ✅ No errors in Twilio debugger

## 🧪 Test Scenarios

Once working, test these:

- [ ] Search by skill: `find Python developers`
- [ ] Search by location: `members in Chennai`
- [ ] Search by role: `show AI consultants`
- [ ] Invalid member (number not in DB): Should get rejection message
- [ ] Check conversation history works

## 📊 Monitoring URLs

Keep these tabs open while testing:

1. **ngrok Web Interface**
   - http://localhost:4040
   - See all requests/responses

2. **Twilio Debugger**
   - https://www.twilio.com/console/runtime/debugger
   - See webhook errors

3. **Server Logs**
   - Terminal 1 (where npm run dev is running)

## 🔧 Quick Commands

```bash
# Test webhook locally (without WhatsApp)
cd Server
./test-whatsapp-local.sh "find AI experts" "9876543210"

# Check ngrok tunnels
curl http://localhost:4040/api/tunnels | jq

# View server logs
# Just watch Terminal 1

# Restart ngrok (if needed)
# Ctrl+C in Terminal 2, then:
ngrok http 3000
# Update webhook URL in Twilio!
```

## 🚨 Troubleshooting Quick Fixes

| Issue | Quick Fix |
|-------|-----------|
| No response | Check ngrok is running, update webhook URL |
| "Not a member" | Add phone to database |
| Webhook error | Check URL format, must be https |
| ngrok expired | Restart ngrok, update Twilio webhook |

## 📝 Important Notes

1. **ngrok URL changes** on restart (free plan)
   - Must update Twilio webhook each time
   - Keep ngrok running during testing

2. **Phone format in database:** `9876543210` (10 digits, no +91)

3. **Sandbox expires** in 3 days - rejoin if needed

## 🎯 Next Steps After Testing

- [ ] Document any issues found
- [ ] Test all query types
- [ ] Verify conversation history
- [ ] Prepare for Docker deployment
- [ ] Plan WhatsApp Business API application

## 💰 Costs

- Development/Testing: **$0** (all free tier)
- ngrok: Free (URL changes)
- Twilio Sandbox: Free

---

**Estimated Time:** 15 minutes total
**Difficulty:** Easy 🟢

Ready? Start with step 1! 🚀
