# Quick Deploy to Railway + WhatsApp Setup

## Step 1: Deploy to Railway (5 min)

1. **Sign up & Connect**
   ```
   - Go to railway.app
   - Sign up with GitHub
   - New Project → Deploy from GitHub repo
   - Select: tech-itrace/communityconnect
   - Select folder: /Server
   ```

2. **Add Environment Variables**
   ```
   NODE_ENV=production
   PORT=8080
   DATABASE_URL=<your_supabase_url>
   DEEPINFRA_API_KEY=<your_key>
   ```

3. **Deploy** - Railway auto-builds and deploys

4. **Get URL**: Copy your Railway URL (e.g., `communityconnect-production.up.railway.app`)

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
   - When a message comes in: https://your-railway-app.up.railway.app/api/whatsapp/webhook
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

### Get Approved WhatsApp Business Number

1. **Apply for WhatsApp Business API**
   - Requires: Business verification
   - Cost: ~$0.005/message
   - Timeline: 1-2 weeks approval

2. **Update webhook URL** to your custom number

## Environment Variables Reference

```env
# Required
NODE_ENV=production
PORT=8080
DATABASE_URL=postgresql://...

# LLM
DEEPINFRA_API_KEY=...

# WhatsApp (Optional - for OTP)
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=...
```

## Webhook Endpoints

- `GET /api/whatsapp/webhook` - Verification
- `POST /api/whatsapp/webhook` - Message handler

## Testing Locally

```bash
# Terminal 1: Start server
npm run dev

# Terminal 2: Use ngrok for public URL
npx ngrok http 3000

# Use ngrok URL in Twilio webhook:
https://abc123.ngrok.io/api/whatsapp/webhook
```

## Troubleshooting

**Webhook not receiving messages:**
- Check Railway logs: `railway logs`
- Verify webhook URL has /api/whatsapp/webhook
- Ensure method is POST
- Check Twilio debugger

**Authentication errors:**
- Phone must be in community_members table
- Phone format: 10 digits (no +91)

**No response:**
- Check Railway logs for errors
- Verify DATABASE_URL is set
- Test /health endpoint first

## Costs

- Railway: FREE (then $5/month)
- Twilio Sandbox: FREE
- Twilio Production: $0.005/message
- Total for 500 msgs/month: ~$7.50

## Next Steps

1. Deploy to Railway ✅
2. Configure Twilio webhook ✅
3. Test with WhatsApp ✅
4. Add OTP authentication (Week 2)
5. Add admin dashboard (Week 3)
