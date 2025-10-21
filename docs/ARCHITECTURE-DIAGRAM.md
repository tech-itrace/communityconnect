# System Architecture - Twilio WhatsApp with ngrok

## Current Setup (Local Development)

```
┌─────────────────────────────────────────────────────────────────┐
│                         YOUR PHONE                              │
│                                                                 │
│  ┌──────────────────────────────────────────────────────┐     │
│  │                    WhatsApp                          │     │
│  │  "find AI experts"                                   │     │
│  └──────────────────────┬───────────────────────────────┘     │
└─────────────────────────┼─────────────────────────────────────┘
                          │
                          │ Internet
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      TWILIO CLOUD                               │
│                                                                 │
│  ┌──────────────────────────────────────────────────────┐     │
│  │         WhatsApp Business API Sandbox                │     │
│  │  - Receives message from your phone                  │     │
│  │  - Formats as webhook POST request                   │     │
│  │  - Sends to configured webhook URL                   │     │
│  └──────────────────────┬───────────────────────────────┘     │
└─────────────────────────┼─────────────────────────────────────┘
                          │
                          │ HTTPS POST
                          │ https://abc123.ngrok-free.app/api/whatsapp/webhook
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                        NGROK CLOUD                              │
│                                                                 │
│  ┌──────────────────────────────────────────────────────┐     │
│  │              Secure Tunnel Service                   │     │
│  │  - Public URL: https://abc123.ngrok-free.app        │     │
│  │  - Forwards to: localhost:3000                       │     │
│  └──────────────────────┬───────────────────────────────┘     │
└─────────────────────────┼─────────────────────────────────────┘
                          │
                          │ HTTP Forward
                          │ localhost:3000/api/whatsapp/webhook
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      YOUR MACBOOK                               │
│                                                                 │
│  ┌─────────────────────────────────────────────────────┐      │
│  │  Terminal 2: ngrok                                  │      │
│  │  $ ngrok http 3000                                  │      │
│  │  Listening on: http://127.0.0.1:4040              │      │
│  └─────────────────────────────────────────────────────┘      │
│                          │                                      │
│                          ▼                                      │
│  ┌─────────────────────────────────────────────────────┐      │
│  │  Terminal 1: Express Server                         │      │
│  │  $ npm run dev                                      │      │
│  │                                                     │      │
│  │  ┌────────────────────────────────────────┐       │      │
│  │  │    /api/whatsapp/webhook               │       │      │
│  │  │  1. Extract phone & message            │       │      │
│  │  │  2. Validate member in DB              │       │      │
│  │  │  3. Build conversation context         │       │      │
│  │  │  4. Call nlSearchService               │       │      │
│  │  │  5. Format WhatsApp response           │       │      │
│  │  └──────────┬─────────────────────────────┘       │      │
│  └─────────────┼─────────────────────────────────────┘      │
│                │                                              │
│                ├──────────────────┐                           │
│                │                  │                           │
│                ▼                  ▼                           │
│  ┌──────────────────────┐  ┌──────────────────────┐         │
│  │   conversationService│  │   nlSearchService     │         │
│  │  - Validate member   │  │  - Process query      │         │
│  │  - Session mgmt      │  │  - Call DeepInfra     │         │
│  │  - History tracking  │  │  - Semantic search    │         │
│  └──────────────────────┘  └──────────┬────────────┘         │
└─────────────────────────────────────────┼────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      EXTERNAL SERVICES                          │
│                                                                 │
│  ┌─────────────────────┐        ┌──────────────────────┐      │
│  │  Supabase Database  │        │   DeepInfra API      │      │
│  │                     │        │   (Llama 3.1)        │      │
│  │  Tables:            │        │                      │      │
│  │  - community_members│        │  - Query processing  │      │
│  │  - member_embeddings│        │  - Intent extraction │      │
│  │  - conversations    │        │  - Response gen      │      │
│  │  - messages         │        │                      │      │
│  └─────────────────────┘        └──────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘

                          │
                          │ Response flows back up
                          ▼
                    
                    Your WhatsApp gets reply!
```

## Request Flow (Detailed)

```
1. USER ACTION
   │
   ├─► You: Send "find AI experts" via WhatsApp
   │
   └─► WhatsApp app sends to Twilio number (+1 415 523 8886)

2. TWILIO PROCESSING
   │
   ├─► Twilio receives message
   │
   ├─► Formats as POST request:
   │   Body: {
   │     From: "whatsapp:+919876543210",
   │     Body: "find AI experts",
   │     ProfileName: "Udhay"
   │   }
   │
   └─► POSTs to webhook: https://abc123.ngrok-free.app/api/whatsapp/webhook

3. NGROK TUNNEL
   │
   ├─► ngrok receives HTTPS request
   │
   ├─► Forwards to: localhost:3000/api/whatsapp/webhook
   │
   └─► Can monitor at: http://localhost:4040

4. EXPRESS SERVER (whatsapp.ts)
   │
   ├─► Extract: From, Body, ProfileName
   │
   ├─► Parse phone: "whatsapp:+919876543210" → "9876543210"
   │
   ├─► Log: "[WhatsApp] Message from Udhay (9876543210): find AI experts"
   │
   ├─► Call conversationService.validateMember(phone)
   │   │
   │   ├─► Query: SELECT * FROM community_members WHERE phone = ?
   │   │
   │   └─► Return: { isValid: true, memberName: "Udhay Kumar" }
   │
   ├─► Get/Create session
   │
   ├─► Build conversation context (last 5 messages)
   │
   ├─► Call nlSearchService.processNaturalLanguageQuery()
   │   │
   │   ├─► Call DeepInfra API (intent extraction)
   │   │
   │   ├─► Perform semantic search (vector similarity)
   │   │
   │   └─► Return: {
   │         understanding: { intent: "find_members", entities: {...} },
   │         results: { members: [...] },
   │         response: { conversational: "I found 5 members..." }
   │       }
   │
   ├─► Format WhatsApp response with emojis
   │
   └─► Return response (status 200)

5. RESPONSE BACK
   │
   ├─► Express sends response to ngrok
   │
   ├─► ngrok forwards to Twilio
   │
   ├─► Twilio sends WhatsApp message to your phone
   │
   └─► You receive: "🔍 I found 5 members..."
```

## Future Setup (Docker Server)

```
┌─────────────┐
│  WhatsApp   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Twilio    │
└──────┬──────┘
       │
       │ HTTPS POST
       │ https://your-domain.com/api/whatsapp/webhook
       ▼
┌──────────────────────────────────┐
│    YOUR DOCKER SERVER            │
│                                  │
│  ┌────────────────────────────┐ │
│  │  Docker Container          │ │
│  │  - Express Server          │ │
│  │  - Port 3000 → 80/443     │ │
│  └────────────────────────────┘ │
└──────────────────────────────────┘
       │
       ▼
┌─────────────┐     ┌──────────────┐
│  Supabase   │     │  DeepInfra   │
└─────────────┘     └──────────────┘

NO ngrok needed! Direct HTTPS access.
```

## Component Responsibilities

### 1. WhatsApp (User Interface)
- User sends/receives messages
- Standard WhatsApp app on phone

### 2. Twilio (Gateway)
- WhatsApp Business API provider
- Handles WhatsApp protocol
- Converts to HTTP webhooks
- Sandbox for testing (free)
- Production requires approval

### 3. ngrok (Development Tunnel)
- Makes localhost accessible from internet
- Free tier: Random URL on restart
- Paid tier: Static domain
- **Only needed for local development**

### 4. Express Server (Application)
- REST API endpoints
- Business logic
- Conversation management
- Search orchestration

### 5. Conversation Service
- Member validation
- Session management
- History tracking
- Context building

### 6. NL Search Service
- Query processing
- LLM integration
- Semantic search
- Response formatting

### 7. Supabase (Database)
- Member data
- Embeddings
- Conversation history
- Persistent storage

### 8. DeepInfra (AI)
- LLM (Llama 3.1)
- Intent extraction
- Entity recognition
- Response generation

## Data Flow Example

```
INPUT: "find AI experts in Chennai"

1. WhatsApp → Twilio
   Raw message text

2. Twilio → ngrok → Server
   POST /api/whatsapp/webhook
   {
     From: "whatsapp:+919876543210",
     Body: "find AI experts in Chennai"
   }

3. Server → Database
   Query: SELECT * FROM community_members WHERE phone = '9876543210'
   Result: { id: 123, name: "Udhay", ... }

4. Server → DeepInfra
   POST /v1/inference/meta-llama/Meta-Llama-3.1-70B-Instruct
   {
     messages: [{
       role: "user",
       content: "Extract intent from: find AI experts in Chennai"
     }]
   }
   Result: {
     intent: "find_members",
     skills: ["AI"],
     location: "Chennai"
   }

5. Server → Database
   Query: Semantic search with embeddings
   SELECT * FROM community_members
   WHERE city = 'Chennai'
   AND skills && ARRAY['AI']
   ORDER BY embedding <-> query_embedding
   LIMIT 5
   
   Result: [
     { name: "John Doe", city: "Chennai", skills: ["AI", "ML"] },
     { name: "Jane Smith", city: "Chennai", skills: ["AI", "Python"] },
     ...
   ]

6. Server → Response
   Format WhatsApp message:
   "🔍 I found 5 members with AI expertise in Chennai
   
   1. *John Doe*
      📍 Chennai
      💼 AI Consultant
      🏢 Tech Corp
   ..."

7. Server → ngrok → Twilio → WhatsApp
   Response delivered to user's phone
```

## Monitoring Points

```
┌─────────────────────────────────────────┐
│  Monitor Point 1: ngrok Web Interface  │
│  http://localhost:4040                 │
│  - See all HTTP requests/responses     │
│  - Check timing                        │
│  - Debug webhook issues                │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Monitor Point 2: Server Logs          │
│  Terminal 1 (npm run dev)              │
│  - Application logs                    │
│  - Error messages                      │
│  - Query processing                    │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Monitor Point 3: Twilio Debugger      │
│  https://www.twilio.com/console/debugger│
│  - Webhook calls                       │
│  - Delivery status                     │
│  - Error details                       │
└─────────────────────────────────────────┘
```

---

This architecture allows you to develop and test locally before deploying to your Docker server!
