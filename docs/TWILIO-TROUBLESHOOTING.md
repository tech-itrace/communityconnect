# Troubleshooting Guide - Twilio WhatsApp + ngrok

Common issues and solutions when testing WhatsApp bot locally.

## 🔴 Issue 1: ngrok not found

```bash
$ ngrok http 3000
zsh: command not found: ngrok
```

### Solutions:

**Option A: Install via Homebrew**
```bash
brew install ngrok/ngrok/ngrok
ngrok --version
```

**Option B: Install via npm**
```bash
npm install -g ngrok
ngrok --version
```

**Option C: Download manually**
```bash
# Download from https://ngrok.com/download
# Unzip and move to /usr/local/bin
unzip ~/Downloads/ngrok-v3-stable-darwin-amd64.zip
sudo mv ngrok /usr/local/bin/
```

---

## 🔴 Issue 2: "ERROR: authentication failed"

```bash
$ ngrok http 3000
ERROR: authentication failed: Your authtoken is not valid.
```

### Solution:

1. Get your token: https://dashboard.ngrok.com/get-started/your-authtoken
2. Add token:
   ```bash
   ngrok config add-authtoken YOUR_AUTH_TOKEN_HERE
   ```

---

## 🔴 Issue 3: Webhook not receiving messages

**Symptoms:**
- Send message on WhatsApp
- No response from bot
- No logs in server terminal

### Debug Steps:

**Step 1: Check ngrok is running**
```bash
# In Terminal 2, should see:
Forwarding    https://abc123.ngrok-free.app -> http://localhost:3000
```

**Step 2: Check ngrok web interface**
- Open: http://localhost:4040
- Send a test WhatsApp message
- Do you see the request?
  - ❌ No: Webhook URL is wrong in Twilio
  - ✅ Yes: Check response status

**Step 3: Verify webhook URL in Twilio**
- Go to Twilio Console → WhatsApp Sandbox Settings
- "When a message comes in" should be:
  ```
  https://YOUR_NGROK_URL/api/whatsapp/webhook
  ```
- Common mistakes:
  - ❌ `http://` instead of `https://`
  - ❌ Missing `/api/whatsapp/webhook`
  - ❌ Old ngrok URL (if you restarted ngrok)

**Step 4: Test webhook directly**
```bash
# In Terminal 3:
curl -X POST http://localhost:3000/api/whatsapp/webhook \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "From=whatsapp:+919876543210&Body=test"

# Should return a response
```

---

## 🔴 Issue 4: "Sorry, this service is only available to community members"

### Cause:
Your phone number is not in the database.

### Solution:

**Check database:**
```sql
SELECT phone, name, email 
FROM community_members 
WHERE phone = '9876543210';
```

**Add test user:**
```sql
INSERT INTO community_members (
  name, phone, email, city, country, 
  designation, organization, skills
) VALUES (
  'Test User',
  '9876543210',  -- Your phone number (10 digits, no +91)
  'test@example.com',
  'Chennai',
  'India',
  'Developer',
  'Test Org',
  ARRAY['Python', 'Node.js']
);
```

**Phone format reminder:**
- ✅ Database: `9876543210` (10 digits)
- ✅ WhatsApp sends: `whatsapp:+919876543210`
- ✅ Code handles conversion automatically

---

## 🔴 Issue 5: ngrok URL keeps changing

**Symptoms:**
- Restart ngrok
- Get new URL
- Webhook stops working

### Why:
Free ngrok plan gives random URLs on each restart.

### Solutions:

**Short-term (for testing):**
1. Keep ngrok running continuously
2. If ngrok restarts, update webhook in Twilio immediately

**Long-term:**
1. Deploy to your Docker server (your plan)
2. Or: Upgrade to ngrok paid plan ($8/month for static domain)

---

## 🔴 Issue 6: Server not starting

```bash
$ npm run dev
Error: connect ECONNREFUSED
```

### Check Database Connection:

**Test connection:**
```bash
cd Server
npm run db:setup
```

**Check DATABASE_URL:**
```bash
# In .env file, should be:
DATABASE_URL=postgresql://postgres:PASSWORD@db.vrowttyayycwufzlhrvo.supabase.co:5432/postgres
```

**Test DeepInfra API:**
```bash
curl https://api.deepinfra.com/v1/inference/meta-llama/Meta-Llama-3-8B-Instruct \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"input": "Hello"}'
```

---

## 🔴 Issue 7: "Cannot join sandbox"

**Symptoms:**
- Send join message to Twilio number
- No response

### Solutions:

**Check you're using WhatsApp (not SMS):**
- Must use WhatsApp app
- Send to WhatsApp number (has WhatsApp icon in Twilio console)

**Check join code:**
- Case-sensitive
- Format: `join your-code-here`
- Get fresh code from Twilio console

**Try different phone:**
- Some numbers may be blocked
- Use personal phone number

---

## 🔴 Issue 8: Bot responds but search returns no results

**Symptoms:**
- Bot responds: "Found 0 members"
- But you know there are matching members

### Debug:

**Check embeddings exist:**
```sql
SELECT COUNT(*) FROM member_embeddings;
```

**Generate embeddings if missing:**
```bash
cd Server
npm run generate:embeddings
```

**Check member data:**
```sql
SELECT name, skills, city, designation 
FROM community_members 
LIMIT 5;
```

**Test search directly:**
```bash
curl -X POST http://localhost:3000/api/search/nl \
  -H "Content-Type: application/json" \
  -d '{"query": "find AI experts", "limit": 5}'
```

---

## 🔴 Issue 9: Twilio webhook timeout

**Symptoms:**
- Twilio debugger shows: "Error: Timeout"
- In ngrok: Request takes > 15 seconds

### Cause:
Twilio has 15-second timeout for webhooks.

### Solutions:

**Check query performance:**
```bash
# In server logs, look for:
[NLSearch] Processing query: find AI experts
[NLSearch] Query took: 12000ms  # Too slow!
```

**Optimize:**
1. Reduce limit in search (currently 5)
2. Check database indexes
3. Check DeepInfra API response time

**Quick fix:**
```typescript
// In nlSearchService.ts, reduce limit
const results = await performSearch(query, Math.min(limit, 3));
```

---

## 🔴 Issue 10: "Failed to send message"

**Symptoms:**
- Server logs: "Error processing message"
- Twilio debugger: 500 error

### Debug:

**Check server logs for full error:**
```bash
# In Terminal 1 (server), look for:
[WhatsApp] Error processing message: <error details>
```

**Common errors:**

**Database error:**
```
Error: Connection terminated unexpectedly
```
→ Check DATABASE_URL

**DeepInfra error:**
```
Error: 401 Unauthorized
```
→ Check DEEPINFRA_API_KEY

**Parsing error:**
```
TypeError: Cannot read property 'members' of undefined
```
→ Check nlSearchService response format

---

## 🧰 Debug Toolkit

### 1. ngrok Web Interface
```bash
# Open in browser:
http://localhost:4040

# See all requests/responses
# Click on any request to inspect
```

### 2. Test webhook locally (without WhatsApp)
```bash
cd Server
./test-whatsapp-local.sh "find AI experts" "9876543210"
```

### 3. Check Twilio Debugger
```
https://www.twilio.com/console/runtime/debugger
```

### 4. Monitor server logs
```bash
# In Terminal 1, watch for:
[WhatsApp] Message from...
[NLSearch] Processing query...
[NLSearch] Found X members
```

### 5. Check database
```bash
# Connect to Supabase
psql "postgresql://postgres:PASSWORD@db.vrowttyayycwufzlhrvo.supabase.co:5432/postgres"

# Check members
SELECT COUNT(*) FROM community_members;

# Check embeddings
SELECT COUNT(*) FROM member_embeddings;
```

---

## 📊 Health Check Commands

```bash
# 1. Check server is running
curl http://localhost:3000/health

# 2. Check ngrok tunnel
curl http://localhost:4040/api/tunnels | jq '.tunnels[0].public_url'

# 3. Test webhook endpoint
curl http://localhost:3000/api/whatsapp/webhook

# 4. Test full flow
./test-whatsapp-local.sh "test query" "9876543210"
```

---

## 🆘 Still Having Issues?

### Collect Debug Info:

```bash
# 1. Server logs
npm run dev > server.log 2>&1

# 2. ngrok status
curl http://localhost:4040/api/tunnels > ngrok-status.json

# 3. Environment check
echo "NODE_ENV: $NODE_ENV"
echo "PORT: $PORT"
echo "DB Connected: $(curl -s http://localhost:3000/health)"

# 4. Database check
npm run db:setup
```

### Check Configuration:

1. **Twilio Console:**
   - WhatsApp Sandbox settings
   - Webhook URL
   - Phone numbers joined

2. **ngrok Dashboard:**
   - Active tunnels
   - Request history

3. **Server Terminal:**
   - No errors on startup
   - "Server running on port 3000"
   - "Connected to database"

---

## ✅ Verification Checklist

Before asking for help, verify:

- [ ] Server starts without errors
- [ ] ngrok shows active tunnel
- [ ] Webhook URL correct in Twilio
- [ ] Phone number in database
- [ ] Can access http://localhost:4040
- [ ] Test phone joined WhatsApp sandbox
- [ ] DATABASE_URL and DEEPINFRA_API_KEY set

---

**Most issues are solved by:**
1. Restarting ngrok and updating webhook URL
2. Ensuring phone number is in database
3. Checking server logs for errors

Good luck! 🍀
