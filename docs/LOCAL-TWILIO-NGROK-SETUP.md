# Local Development: Twilio WhatsApp + ngrok Setup

This guide will help you test the WhatsApp bot locally using ngrok before deploying to your Docker server.

## Prerequisites

- ✅ Local server running (npm run dev)
- ✅ Supabase database configured
- ✅ DeepInfra API key set
- 📱 Phone number ready for testing

## Step 1: Install ngrok (2 min)

### Option A: Using Homebrew (Recommended for macOS)
```bash
brew install ngrok/ngrok/ngrok
```

### Option B: Using npm
```bash
npm install -g ngrok
```

### Option C: Download directly
```bash
# Download from https://ngrok.com/download
# Move to /usr/local/bin
```

### Verify Installation
```bash
ngrok --version
```

## Step 2: Sign up for ngrok (3 min)

1. **Create Account**
   - Go to https://dashboard.ngrok.com/signup
   - Sign up (free account is sufficient)

2. **Get Auth Token**
   - After signup, you'll see your authtoken
   - Or go to: https://dashboard.ngrok.com/get-started/your-authtoken

3. **Configure ngrok**
   ```bash
   ngrok config add-authtoken YOUR_AUTH_TOKEN
   ```

## Step 3: Start Your Local Server (1 min)

```bash
cd /Users/udhay/Documents/Candorbees/communityConnect/Server
npm run dev
```

You should see:
```
Server running on port 3000
Connected to database
```

## Step 4: Start ngrok Tunnel (1 min)

**Open a NEW terminal window** and run:

```bash
cd /Users/udhay/Documents/Candorbees/communityConnect/Server
ngrok http 3000
```

You'll see output like:
```
Session Status                online
Account                       Your Name (Plan: Free)
Version                       3.x.x
Region                        United States (us)
Latency                       -
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123.ngrok-free.app -> http://localhost:3000

Connections                   ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

**IMPORTANT:** Copy your ngrok URL (e.g., `https://abc123.ngrok-free.app`)

## Step 5: Create Twilio Account (5 min)

1. **Sign Up**
   - Go to https://www.twilio.com/try-twilio
   - Sign up (you get $15 free credit)
   - Verify your email
   - Verify your phone number

2. **Access Console**
   - After signup, you'll land in Twilio Console
   - Note your Account SID and Auth Token (optional for basic testing)

## Step 6: Setup WhatsApp Sandbox (5 min)

1. **Navigate to WhatsApp Sandbox**
   ```
   Twilio Console → Develop → Messaging → Try it out → Send a WhatsApp message
   ```

2. **Join Sandbox**
   - You'll see a WhatsApp number (e.g., `+1 415 523 8886`)
   - And a join code (e.g., `join arrive-building`)
   - Open WhatsApp on your phone
   - Send the join message to the Twilio number
   - You'll receive: "Awesome! You're all set."

3. **Configure Webhook**
   - Still in WhatsApp Sandbox settings
   - Find: "When a message comes in"
   - Enter your ngrok URL + webhook path:
     ```
     https://abc123.ngrok-free.app/api/whatsapp/webhook
     ```
   - Method: **POST**
   - Click **Save**

## Step 7: Test the Bot! 🎉

1. **Send a test message** to the Twilio WhatsApp number:
   ```
   find AI experts
   ```

2. **You should receive a response like:**
   ```
   🔍 I found 5 members with AI expertise

   Found 5 members:

   1. *John Doe*
      📍 Chennai
      💼 AI Consultant
      🏢 Tech Corp

   2. *Jane Smith*
      📍 Mumbai
      💼 ML Engineer
      🏢 DataCo

   ... and 3 more

   💡 Try asking:
   - Find members in Chennai
   - Show AI consultants
   ```

## Step 8: Monitor & Debug

### Check ngrok Web Interface
- Open browser: http://localhost:4040
- See all incoming requests
- Inspect request/response details
- Very useful for debugging!

### Check Server Logs
In your server terminal, you'll see:
```
[WhatsApp] Message from Udhay (9876543210): "find AI experts"
[NLSearch] Processing query: find AI experts
[NLSearch] Found 5 members
```

### Check Twilio Debugger
- Go to: https://www.twilio.com/console/runtime/debugger
- See all webhook calls and errors

## Testing Different Scenarios

### Test 1: Member Search
```
find developers in Chennai
```

### Test 2: Skills Search
```
show me Python experts
```

### Test 3: Location Search
```
members in Mumbai
```

### Test 4: Invalid Member
Send from a phone number NOT in your database:
```
hello
```
Expected response:
```
Sorry, this service is only available to community members. Please contact the administrator.
```

## Troubleshooting

### Issue: "Webhook is not responding"

**Check:**
1. Is your local server running? (`npm run dev`)
2. Is ngrok running? (check terminal)
3. Is the webhook URL correct in Twilio?
   - Should be: `https://YOUR_NGROK_URL/api/whatsapp/webhook`
   - NOT: `http://` (must be https)

**Fix:**
```bash
# Restart ngrok
ngrok http 3000

# Update webhook URL in Twilio with new ngrok URL
```

### Issue: "No response from bot"

**Check Server Logs:**
```bash
# In server terminal, look for errors
# Common issues:
# - Database connection error
# - DeepInfra API error
# - Member not found in database
```

**Check ngrok Interface:**
- Go to http://localhost:4040
- Check if request reached your server
- Check response status

### Issue: "Cannot join sandbox"

**Solution:**
- Make sure you're sending to the correct Twilio number
- Join code is case-sensitive
- Must send from WhatsApp (not SMS)

### Issue: "ngrok URL keeps changing"

**Problem:** Free ngrok changes URL on restart

**Solutions:**
1. **Quick Fix:** Update Twilio webhook each time
2. **Better:** Use ngrok static domain (paid plan ~$8/month)
3. **Best:** Deploy to Docker server (your plan)

## Environment Variables for Testing

Your current `.env` is good for local testing:
```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://...
DEEPINFRA_API_KEY=...
```

## Adding Twilio Credentials (Optional)

For advanced features (sending outbound messages), add to `.env`:
```env
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

Get these from: https://www.twilio.com/console

## Workflow Summary

```
┌─────────────┐
│  WhatsApp   │
│   Message   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Twilio    │
│   Webhook   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│    ngrok    │
│   Tunnel    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Local     │
│   Server    │
│  (port 3000)│
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Supabase   │
│   Database  │
└─────────────┘
```

## Next Steps

Once testing is complete:

1. ✅ **Test thoroughly** with different queries
2. ✅ **Add test phone numbers** to your database
3. ✅ **Document any issues**
4. 🚀 **Deploy to your Docker server**
5. 🚀 **Update Twilio webhook** to your server URL
6. 🚀 **Apply for WhatsApp Business API** (for production number)

## Useful Commands

```bash
# Start local server
npm run dev

# Start ngrok (in separate terminal)
ngrok http 3000

# Check ngrok status
curl http://localhost:4040/api/tunnels

# Test webhook locally
curl -X POST http://localhost:3000/api/whatsapp/webhook \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "From=whatsapp:+919876543210&Body=find AI experts"

# Kill ngrok
pkill ngrok
```

## Cost Breakdown (Testing Phase)

- ngrok free: **FREE** (URL changes on restart)
- Twilio Sandbox: **FREE**
- Total: **$0** 🎉

## Production Costs (Future)

- ngrok static domain: ~$8/month (optional)
- Twilio WhatsApp messages: $0.005/message
- For 500 messages/month: ~$2.50
- **Your Docker server: $0 (self-hosted)**

## Important Notes

1. **ngrok URL changes** every time you restart ngrok (free plan)
   - You'll need to update Twilio webhook URL each time
   - Keep ngrok running during testing sessions

2. **Sandbox limitations:**
   - Can only message numbers that joined sandbox
   - Sandbox code expires in 3 days (rejoin if needed)
   - For production, apply for WhatsApp Business API

3. **Phone number format:**
   - In database: 10 digits (e.g., `9876543210`)
   - From WhatsApp: `whatsapp:+919876543210`
   - Code handles conversion automatically

4. **Testing data:**
   - Ensure test phone numbers are in `community_members` table
   - Check member data has location, skills for better results

## Support

If you encounter issues:
1. Check ngrok web interface: http://localhost:4040
2. Check server logs in terminal
3. Check Twilio debugger: https://www.twilio.com/console/runtime/debugger
4. Verify webhook URL is correct in Twilio console

---

**Ready to start?** Follow steps 1-7 and you'll be testing in ~15 minutes! 🚀
