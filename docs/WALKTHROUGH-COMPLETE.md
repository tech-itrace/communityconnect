# Complete Walkthrough - Testing Twilio WhatsApp Locally

Follow this guide exactly for a smooth setup experience. Estimated time: **15 minutes**.

---

## 🎯 Goal

Test WhatsApp bot on your local server using ngrok before deploying to Docker.

---

## ✅ Prerequisites Check

Before starting, verify:

```bash
# 1. Check Node.js installed
node --version  # Should be v18 or higher

# 2. Check you're in the right directory
pwd
# Should show: /Users/udhay/Documents/Candorbees/communityConnect

# 3. Check server dependencies installed
cd Server
npm list express dotenv pg
# Should show installed versions

# 4. Check environment variables
cat .env | grep -E "DATABASE_URL|DEEPINFRA_API_KEY"
# Should show both values

# 5. Test database connection
npm run db:setup
# Should show: "Database setup complete"
```

If any of the above fail, fix them first before continuing.

---

## 📝 Step-by-Step Instructions

### Step 1: Install ngrok (5 minutes)

#### 1.1 Install via Homebrew

```bash
# Install ngrok
brew install ngrok/ngrok/ngrok

# Verify installation
ngrok --version
# Expected: ngrok version 3.x.x
```

#### 1.2 Create ngrok Account

1. Open browser: https://dashboard.ngrok.com/signup
2. Sign up with email (or GitHub)
3. Verify your email

#### 1.3 Get Authentication Token

1. After login, you'll see your authtoken on the dashboard
2. Or go to: https://dashboard.ngrok.com/get-started/your-authtoken
3. Copy your token (looks like: `2abc...XYZ123`)

#### 1.4 Configure ngrok

```bash
# Add your token
ngrok config add-authtoken YOUR_TOKEN_HERE

# Verify configuration
cat ~/.ngrok2/ngrok.yml
# Should show your authtoken
```

**✅ Step 1 Complete!** ngrok is ready.

---

### Step 2: Start Your Local Server (2 minutes)

#### 2.1 Open First Terminal Window

```bash
# Navigate to Server directory
cd /Users/udhay/Documents/Candorbees/communityConnect/Server

# Start development server
npm run dev
```

#### 2.2 Verify Server Started

You should see output like:
```
Server running on port 3000
Connected to database successfully
Routes registered:
  - GET  /health
  - POST /api/whatsapp/webhook
  - GET  /api/whatsapp/webhook
  ...
```

#### 2.3 Test Server Health

**Open a new terminal (Terminal 3)** and run:
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-21T..."
}
```

**✅ Step 2 Complete!** Server is running.

**KEEP TERMINAL 1 RUNNING** - Don't close it!

---

### Step 3: Start ngrok Tunnel (2 minutes)

#### 3.1 Open Second Terminal Window

```bash
# In a NEW terminal window
cd /Users/udhay/Documents/Candorbees/communityConnect/Server

# Start ngrok
ngrok http 3000
```

#### 3.2 Copy Your ngrok URL

You'll see output like:
```
ngrok                                                                           

Session Status                online
Account                       Your Name (Plan: Free)
Version                       3.x.x
Region                        United States (us)
Latency                       45ms
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://1a2b-3c4d-5e6f.ngrok-free.app -> http://localhost:3000

Connections                   ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

**IMPORTANT:** Copy the Forwarding URL (the https:// one)
Example: `https://1a2b-3c4d-5e6f.ngrok-free.app`

#### 3.3 Test ngrok Tunnel

**In Terminal 3:**
```bash
# Replace with YOUR ngrok URL
curl https://1a2b-3c4d-5e6f.ngrok-free.app/health
```

Expected: Same response as Step 2.3

#### 3.4 Open ngrok Web Interface

Open browser: http://localhost:4040

You should see the ngrok web interface showing tunnel status.

**✅ Step 3 Complete!** ngrok tunnel is active.

**KEEP TERMINAL 2 RUNNING** - Don't close it!

---

### Step 4: Create Twilio Account (5 minutes)

#### 4.1 Sign Up for Twilio

1. Open: https://www.twilio.com/try-twilio
2. Fill in:
   - First Name, Last Name
   - Email
   - Password
3. Click "Start your free trial"

#### 4.2 Verify Email

1. Check your email inbox
2. Click verification link
3. Return to Twilio

#### 4.3 Verify Phone Number

1. Twilio will ask for phone verification
2. Enter your phone number (the one you'll test with)
3. Receive SMS code
4. Enter code to verify

#### 4.4 Skip Additional Setup

- Choose product: "Messaging"
- Choose language: "Node.js" (doesn't matter)
- Skip other questions

**✅ Step 4 Complete!** Twilio account created.

---

### Step 5: Setup WhatsApp Sandbox (3 minutes)

#### 5.1 Navigate to WhatsApp Sandbox

In Twilio Console:
1. Left sidebar → **Develop**
2. Click **Messaging**
3. Click **Try it out**
4. Click **Send a WhatsApp message**

You'll see the WhatsApp sandbox page.

#### 5.2 Note Sandbox Details

You'll see:
```
To connect your sandbox, send:
join <sandbox-code>

to:
+1 415 523 8886
```

Write down:
- **Twilio WhatsApp Number:** `+1 415 523 8886` (example)
- **Join Code:** `join arrive-building` (example - yours will be different)

#### 5.3 Join Sandbox via WhatsApp

**On your phone:**
1. Open WhatsApp
2. Create new message
3. Recipient: `+1 415 523 8886` (your Twilio number)
4. Message: `join arrive-building` (your join code)
5. Send

**Expected response from Twilio:**
```
Awesome! You're all set.
Reply to this message to test your sandbox.
```

**✅ Step 5 Complete!** WhatsApp sandbox joined.

---

### Step 6: Configure Webhook (2 minutes)

#### 6.1 Still in WhatsApp Sandbox Page

Scroll down to find:
```
┌─────────────────────────────────────────┐
│ Sandbox Configuration                   │
├─────────────────────────────────────────┤
│ WHEN A MESSAGE COMES IN:                │
│ [                                     ] │
│ HTTP POST ▼                             │
└─────────────────────────────────────────┘
```

#### 6.2 Enter Webhook URL

In the input field, enter:
```
https://YOUR_NGROK_URL/api/whatsapp/webhook
```

**Example:**
```
https://1a2b-3c4d-5e6f.ngrok-free.app/api/whatsapp/webhook
```

**Make sure:**
- ✅ Starts with `https://` (not http://)
- ✅ Your actual ngrok URL
- ✅ Ends with `/api/whatsapp/webhook`

#### 6.3 Set Method

Ensure dropdown says: **HTTP POST**

#### 6.4 Save

Click **Save** button at the bottom.

You should see: "Configuration saved successfully"

**✅ Step 6 Complete!** Webhook configured.

---

### Step 7: Add Test User to Database (2 minutes)

#### 7.1 Check Your Phone Number

The phone number you verified with Twilio in Step 4.3.

Format: If your number is `+91 98765 43210`, use: `9876543210`
(10 digits, no country code, no spaces)

#### 7.2 Add to Database

**Option A: Using Supabase Dashboard**

1. Go to: https://supabase.com/dashboard
2. Select your project
3. Go to **Table Editor** → **community_members**
4. Click **Insert row**
5. Fill in:
   - name: `Your Name`
   - phone: `9876543210` (your number)
   - email: `your@email.com`
   - city: `Chennai` (or your city)
   - designation: `Developer`
   - skills: `["Python", "AI"]`
6. Click **Save**

**Option B: Using SQL**

In Supabase SQL Editor, run:
```sql
INSERT INTO community_members (
  name, phone, email, city, country,
  designation, organization, skills
) VALUES (
  'Your Name',           -- Your name
  '9876543210',          -- YOUR phone number (10 digits)
  'your@email.com',      -- Your email
  'Chennai',             -- Your city
  'India',
  'Developer',
  'Test Org',
  ARRAY['Python', 'Node.js', 'AI']
);
```

#### 7.3 Verify

```sql
SELECT name, phone, email, city, skills
FROM community_members
WHERE phone = '9876543210';  -- Your number
```

Should return your record.

**✅ Step 7 Complete!** Test user added.

---

### Step 8: Test the Bot! 🎉 (2 minutes)

#### 8.1 Send Test Message

**On your phone, in WhatsApp:**
1. Open chat with Twilio number (`+1 415 523 8886`)
2. Send message: `find AI experts`

#### 8.2 Expected Response

Within 1-2 seconds, you should receive:
```
🔍 I found members with AI expertise

Found 3 members:

1. *Your Name*
   📍 Chennai
   💼 Developer
   🏢 Test Org

... and 2 more

💡 Try asking:
- Find members in Chennai
- Show Python developers
```

#### 8.3 Check Terminal Logs

**In Terminal 1 (server), you should see:**
```
[WhatsApp] Message from Your Name (9876543210): "find AI experts"
[NLSearch] Processing query: find AI experts
[NLSearch] Intent: find_members, Skills: ["AI"]
[NLSearch] Found 3 members
[WhatsApp] Response sent successfully
```

#### 8.4 Check ngrok Interface

**In browser (http://localhost:4040):**
- Click on the request
- See full request/response details

**✅ Step 8 Complete!** Bot is working! 🎉

---

## 🧪 Additional Tests

Try these queries to verify full functionality:

```
Test 1: find Python developers
Test 2: members in Chennai
Test 3: show AI consultants
Test 4: who knows machine learning
Test 5: developers in Mumbai
```

Each should return relevant members from your database.

---

## 🔍 Monitoring Your Setup

### Terminal 1 (Server Logs)
Watch for:
```
[WhatsApp] Message from...
[NLSearch] Processing query...
[NLSearch] Found X members
```

### Terminal 2 (ngrok Status)
Watch for:
```
HTTP Requests
POST /api/whatsapp/webhook    200 OK
```

### Browser (ngrok Web UI - localhost:4040)
- See all requests in real-time
- Click any request to see details
- Check timing and response

### Twilio Debugger
- https://www.twilio.com/console/runtime/debugger
- Shows all webhook calls
- Displays any errors

---

## ⚠️ Common First-Time Issues

### Issue 1: "Sorry, this service is only available to community members"

**Cause:** Your phone number not in database

**Fix:**
```sql
-- Check your phone number
SELECT * FROM community_members WHERE phone = '9876543210';

-- If not found, add it (see Step 7)
```

### Issue 2: No response from bot

**Check:**
1. Is Terminal 1 running? (server)
2. Is Terminal 2 running? (ngrok)
3. Is webhook URL correct in Twilio?

**Fix:**
```bash
# In Terminal 3, test directly:
curl -X POST http://localhost:3000/api/whatsapp/webhook \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "From=whatsapp:+919876543210&Body=test"

# Should return a response
```

### Issue 3: ngrok "ERR_NGROK_108"

**Cause:** Free tier limit (40 requests/min)

**Fix:** Wait 1 minute, or upgrade ngrok

---

## 🎯 Success Checklist

Before considering setup complete:

- [ ] Server starts without errors
- [ ] ngrok shows active tunnel
- [ ] Webhook saved in Twilio
- [ ] Phone joined WhatsApp sandbox
- [ ] Test message received response
- [ ] Server logs show processing
- [ ] ngrok UI shows requests
- [ ] No errors in Twilio debugger

---

## 📸 What Success Looks Like

### Terminal 1 (Server)
```
Server running on port 3000
Connected to database successfully
[WhatsApp] Message from Your Name (9876543210): "find AI experts"
[NLSearch] Processing query: find AI experts
[NLSearch] Found 3 members
```

### Terminal 2 (ngrok)
```
HTTP Requests
-------------
POST /api/whatsapp/webhook    200 OK
```

### WhatsApp (Your Phone)
```
You: find AI experts

Bot: 🔍 I found members with AI expertise

Found 3 members:

1. *Your Name*
   📍 Chennai
   ...
```

---

## 🔄 Daily Workflow (After Initial Setup)

```bash
# Day 1: Full setup (done above)

# Day 2 onwards:

# Terminal 1:
cd Server
npm run dev

# Terminal 2:
ngrok http 3000
# Copy new ngrok URL

# Browser:
# Update webhook in Twilio with new ngrok URL

# WhatsApp:
# Start testing!
```

---

## 🚀 Next Steps

After successful testing:

1. **Document any issues** you encountered
2. **Test different query types** thoroughly
3. **Add more test users** to database
4. **Prepare for Docker deployment**
5. **Plan WhatsApp Business API** application

---

## 📚 Additional Resources

- [Full Guide](./LOCAL-TWILIO-NGROK-SETUP.md)
- [Troubleshooting](./TWILIO-TROUBLESHOOTING.md)
- [Quick Reference](./QUICK-REFERENCE.md)
- [Architecture Diagram](./ARCHITECTURE-DIAGRAM.md)

---

## 🆘 Need Help?

If stuck, check:
1. All three terminals are running
2. ngrok URL is correct in Twilio
3. Phone number in database
4. Server logs for errors
5. ngrok UI (localhost:4040) for requests

**Still stuck?** Check the troubleshooting guide!

---

**Congratulations! You're now ready to test WhatsApp bot locally! 🎉**

Next: Deploy to your Docker server when ready.
