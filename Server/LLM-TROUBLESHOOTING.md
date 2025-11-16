# Multi-Provider LLM Troubleshooting Guide

This guide helps diagnose and fix issues with the multi-provider LLM system (DeepInfra + Google Gemini).

## 🔍 Quick Diagnostics

### Test Provider Connectivity

```bash
cd Server

# Test DeepInfra
node -e "
require('dotenv').config();
const https = require('https');
const options = {
  hostname: 'api.deepinfra.com',
  path: '/v1/inference/meta-llama/Meta-Llama-3.1-8B-Instruct',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + process.env.DEEPINFRA_API_KEY
  }
};
const req = https.request(options, (res) => {
  console.log('DeepInfra Status:', res.statusCode);
});
req.write(JSON.stringify({ input: 'Hello', max_new_tokens: 10 }));
req.end();
"

# Test Google Gemini
node -e "
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
(async () => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    const result = await model.generateContent('Hi');
    console.log('✓ Gemini works:', result.response.text().substring(0, 50));
  } catch (e) {
    console.log('✗ Gemini failed:', e.message);
  }
})();
"
```

## ❌ Common Errors & Solutions

### 1. DeepInfra 429 (Rate Limit Exceeded)

**Symptoms:**
```
LLMProviderError: timeout of 15000ms exceeded
Provider: deepinfra, Status: 429
```

**Causes:**
- Free tier limit: 50 requests/minute
- Concurrent requests exceeding quota
- No API key or invalid key

**Solutions:**

**A. Enable Automatic Fallback (Recommended)**
```bash
# .env
LLM_PROVIDER_FALLBACK=google_gemini
GOOGLE_API_KEY=your_google_key
```

**B. Increase Retry Delays**
```bash
LLM_ENABLE_RETRY_BACKOFF=true
LLM_RETRY_DELAY_MS=2000  # Start with 2s
LLM_MAX_RETRIES=5
```

**C. Reduce Concurrent Requests**
```typescript
// In your application code
const rateLimiter = require('bottleneck');
const limiter = new rateLimiter({
  minTime: 1200,  // 1.2s between requests = 50/min
  maxConcurrent: 1
});
```

**D. Upgrade DeepInfra Plan**
- Visit: https://deepinfra.com/pricing
- Pro tier: 200 req/min

---

### 2. Google Gemini 404 (Model Not Found)

**Symptoms:**
```
Error fetching from https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent
[404 Not Found] models/gemini-1.5-flash is not found for API version v1beta
```

**Causes:**
- Incorrect model name
- Generative Language API not enabled
- Billing not configured

**Solutions:**

**A. Use Correct Model Name**
```typescript
// ✗ Wrong
model: 'gemini-1.5-flash'

// ✓ Correct
model: 'gemini-2.0-flash-exp'
```

**B. Enable Generative Language API**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project
3. Navigate to: **APIs & Services** → **Library**
4. Search: "Generative Language API"
5. Click **Enable**

**C. Setup Billing**
1. Google Cloud Console → **Billing**
2. Link a billing account
3. Wait 5-10 minutes for propagation

**D. Verify API Key Permissions**
```bash
# Test with curl
curl -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'
```

---

### 3. Google Gemini 400 (Invalid API Key)

**Symptoms:**
```
[400 Bad Request] API key not valid. Please pass a valid API key.
```

**Solutions:**

**A. Generate New API Key**
1. Visit: https://makersuite.google.com/app/apikey
2. Create new API key
3. Update `.env`:
```bash
GOOGLE_API_KEY=AIzaSy...
```

**B. Check Key Restrictions**
- Ensure no IP/domain restrictions
- API key should have "Generative Language API" enabled

**C. Verify Environment Variable**
```bash
# Check if loaded correctly
node -e "require('dotenv').config(); console.log('Key:', process.env.GOOGLE_API_KEY?.substring(0, 10))"
```

---

### 4. Circuit Breaker Open

**Symptoms:**
```
[LLM Factory] Provider deepinfra has open circuit breaker, skipping
All LLM providers failed
```

**Explanation:**
After 5 consecutive failures, the circuit breaker opens for 60 seconds to prevent cascade failures.

**Solutions:**

**A. Wait for Reset**
- Circuit automatically resets after 60 seconds
- Check logs for: `[LLM Factory] Circuit breaker reset for deepinfra`

**B. Check Provider Status**
```typescript
const llmFactory = getLLMFactory();
const status = llmFactory.getProviderStatus();
console.log(status);
// [{ name: 'deepinfra', circuitOpen: true, failures: 5 }]
```

**C. Restart Application**
```bash
# Forces circuit breaker reset
npm run dev
```

---

### 5. JSON Parsing Errors

**Symptoms:**
```
[LLM Service] Failed to parse query: Unexpected token 'H', "Here's the"... is not valid JSON
```

**Causes:**
- LLM returning markdown-wrapped JSON
- Conversational text before/after JSON
- Incomplete JSON response

**Solutions:**

**A. Improve Prompt (Already Implemented)**
The system automatically extracts JSON from:
```
Here's the result:
```json
{"entities": {...}}
```
```

**B. Adjust Temperature**
Lower temperature = more structured responses
```typescript
// In llmService.ts
const response = await callLLM(systemPrompt, query, 0.1); // Very low for JSON
```

**C. Add Explicit JSON Instructions**
```typescript
const systemPrompt = `
CRITICAL: Respond ONLY with valid JSON. No markdown, no explanations.
Example: {"entities": {...}}
`;
```

---

### 6. Slow Response Times (>5 seconds)

**Symptoms:**
- Queries taking 5-10 seconds
- Timeout errors in production

**Causes:**
- Exponential backoff enabled during retries
- Multiple provider failures
- High network latency

**Solutions:**

**A. Optimize for Testing**
```bash
# .env.test
LLM_ENABLE_RETRY_BACKOFF=false
LLM_RETRY_DELAY_MS=100
LLM_MAX_RETRIES=2
```

**B. Increase Timeout**
```typescript
// In LLM factory config
{
  timeout: 30000,  // 30 seconds
  maxRetries: 2
}
```

**C. Use Faster Provider**
```bash
# Gemini is typically 30-40% faster
LLM_PROVIDER_PRIMARY=google_gemini
LLM_PROVIDER_FALLBACK=deepinfra
```

---

### 7. Embedding Generation Failures

**Symptoms:**
```
[Embedding] Failed to generate embedding: timeout
Error: Failed to generate embeddings for member batch
```

**Solutions:**

**A. Use Batch Retry Logic**
```bash
# The script automatically retries failed batches
npm run generate:embeddings
```

**B. Reduce Batch Size**
```typescript
// In generateEmbeddings.ts
const BATCH_SIZE = 5; // Reduce from 10
```

**C. Add Rate Limiting**
```typescript
// Between batches
await new Promise(resolve => setTimeout(resolve, 200));
```

**D. Switch Providers**
```bash
# Gemini has different rate limits
LLM_PROVIDER_PRIMARY=google_gemini
```

---

## 🔧 Configuration Tuning

### Development (Fast Iteration)
```bash
LLM_PROVIDER_PRIMARY=deepinfra
LLM_PROVIDER_FALLBACK=google_gemini
LLM_ENABLE_RETRY_BACKOFF=false
LLM_RETRY_DELAY_MS=100
LLM_MAX_RETRIES=2
```

### Production (Reliability)
```bash
LLM_PROVIDER_PRIMARY=google_gemini  # Faster, more reliable
LLM_PROVIDER_FALLBACK=deepinfra
LLM_ENABLE_RETRY_BACKOFF=true
LLM_RETRY_DELAY_MS=1000
LLM_MAX_RETRIES=5
```

### Testing (Speed)
```bash
LLM_PROVIDER_PRIMARY=deepinfra
LLM_PROVIDER_FALLBACK=none
LLM_ENABLE_RETRY_BACKOFF=false
LLM_RETRY_DELAY_MS=50
LLM_MAX_RETRIES=1
```

---

## 📊 Monitoring Provider Health

### Check Current Status
```bash
# Run test suite with status logging
npm test llmFactory

# Output shows provider health:
# { name: 'deepinfra', circuitOpen: false, failures: 0 }
# { name: 'google_gemini', circuitOpen: false, failures: 0 }
```

### Add Custom Health Endpoint
```typescript
// In routes/health.ts
import { getLLMFactory } from '../services/llm';

router.get('/health/llm', async (req, res) => {
  const llmFactory = getLLMFactory();
  const status = llmFactory.getProviderStatus();
  
  const healthy = status.every(p => !p.circuitOpen && p.failures < 3);
  
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'degraded',
    providers: status
  });
});
```

---

## 🚨 Emergency Fallback

If both providers fail completely:

### Option 1: Use Regex-Only Mode (Future)
```typescript
// Bypass LLM, use regex extractors only
const result = await regexExtractor.extract(query);
```

### Option 2: Return Cached Intent
```typescript
// Return based on keyword matching
if (query.includes('batch') || query.includes('passout')) {
  return { intent: 'find_peers', confidence: 0.5 };
}
```

### Option 3: Graceful Degradation
```typescript
// Return limited results with explanation
return {
  intent: 'search',
  entities: {},
  confidence: 0.3,
  message: 'LLM service temporarily unavailable. Try: "Find 1995 batch mechanical"'
};
```

---

## 📞 Getting Help

**Provider Status Pages:**
- DeepInfra: https://status.deepinfra.com
- Google Cloud: https://status.cloud.google.com

**Documentation:**
- DeepInfra API: https://deepinfra.com/docs
- Gemini API: https://ai.google.dev/docs

**Internal Docs:**
- `MULTI-PROVIDER-LLM-SUMMARY.md` - Architecture details
- `LLM-RETRY-CONFIG.md` - Retry configuration
- `README.md` - Quick reference

**Support:**
- Check logs in `npm test llmFactory`
- Review circuit breaker status
- Verify API keys and quotas
