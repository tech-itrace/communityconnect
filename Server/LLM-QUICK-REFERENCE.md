# Multi-Provider LLM - Quick Reference Card

**📌 Pin this for daily reference**

## 🚀 Quick Commands

```bash
# Run tests (fast mode)
LLM_ENABLE_RETRY_BACKOFF=false LLM_RETRY_DELAY_MS=100 npm test llmFactory

# Test with specific provider
LLM_PROVIDER_PRIMARY=google_gemini npm test

# Generate embeddings
npm run generate:embeddings

# Check environment
npm run check:env
```

## ⚙️ Environment Variables

```bash
# Provider Selection
LLM_PROVIDER_PRIMARY=deepinfra | google_gemini
LLM_PROVIDER_FALLBACK=google_gemini | deepinfra | none

# Retry Configuration
LLM_ENABLE_RETRY_BACKOFF=true | false
LLM_RETRY_DELAY_MS=1000  # milliseconds
LLM_MAX_RETRIES=3        # attempts

# API Keys (get from links below)
DEEPINFRA_API_KEY=your_key
GOOGLE_API_KEY=your_key
```

## 🔗 Quick Links

| Resource | URL |
|----------|-----|
| DeepInfra API Key | https://deepinfra.com |
| Google API Key | https://makersuite.google.com/app/apikey |
| DeepInfra Pricing | https://deepinfra.com/pricing |
| Gemini Docs | https://ai.google.dev/docs |
| Enable Gemini API | https://console.cloud.google.com/apis |

## 🎯 Common Configurations

### Development (Fast, Cheap)
```bash
LLM_PROVIDER_PRIMARY=deepinfra
LLM_PROVIDER_FALLBACK=google_gemini
LLM_ENABLE_RETRY_BACKOFF=false
LLM_RETRY_DELAY_MS=100
LLM_MAX_RETRIES=2
```

### Production (Fast, Reliable)
```bash
LLM_PROVIDER_PRIMARY=google_gemini
LLM_PROVIDER_FALLBACK=deepinfra
LLM_ENABLE_RETRY_BACKOFF=true
LLM_RETRY_DELAY_MS=1000
LLM_MAX_RETRIES=5
```

### Testing (Speed Focus)
```bash
LLM_PROVIDER_PRIMARY=deepinfra
LLM_PROVIDER_FALLBACK=none
LLM_ENABLE_RETRY_BACKOFF=false
LLM_RETRY_DELAY_MS=50
LLM_MAX_RETRIES=1
```

## 🐛 Quick Troubleshooting

| Error | Quick Fix |
|-------|-----------|
| `429 Rate Limit` | Enable fallback or increase delays |
| `404 Model Not Found` | Use `gemini-2.0-flash-exp` |
| `400 Invalid API Key` | Regenerate key at makersuite |
| `Circuit Breaker Open` | Wait 60s or restart server |
| `Slow Tests (>5s)` | Use `.env.test` configuration |
| `JSON Parse Error` | Check LLM temperature (use 0.1) |

## 📊 Provider Quick Comparison

| Feature | DeepInfra | Gemini |
|---------|-----------|--------|
| Speed | 2-3s | 1-2s ⚡ |
| Cost/1K queries | $0.018 💰 | $0.045 |
| Free Tier | 50 req/min | 15 req/min |
| Setup | Easy ✅ | Medium (billing) |
| JSON Quality | Good | Excellent ⭐ |

## 💡 Pro Tips

1. **Always use fallback** in production
2. **Test with both providers** before deployment
3. **Monitor circuit breaker** status
4. **Use `.env.test`** for fast iteration
5. **Check cost projections** before scaling

## 📚 Full Documentation

- `README.md` - Architecture overview
- `SETUP.md` - Step-by-step setup
- `LLM-TROUBLESHOOTING.md` - Detailed error fixes
- `LLM-PROVIDER-COMPARISON.md` - Deep comparison
- `MULTI-PROVIDER-LLM-COMPLETE.md` - Implementation details

## 🎓 Code Snippets

### Check Provider Status
```typescript
import { getLLMFactory } from './services/llm';

const factory = getLLMFactory();
const status = factory.getProviderStatus();
console.log(status);
// [{ name: 'deepinfra', circuitOpen: false, failures: 0 }]
```

### Generate with Custom Config
```typescript
const response = await factory.generate({
  messages: [{
    role: 'system',
    content: 'Extract entities as JSON'
  }, {
    role: 'user',
    content: 'Find 1995 mechanical batch'
  }],
  temperature: 0.1,
  maxTokens: 500
});
```

### Get Embeddings
```typescript
const result = await factory.getEmbedding({
  text: 'Software engineer with React experience'
});
// result.embeddings[0] is 768-dimensional array
```

---

**Need Help?** Check `LLM-TROUBLESHOOTING.md` first!
