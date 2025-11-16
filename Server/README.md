# Community Connect - Backend Server

Enterprise-grade backend for Community Connect WhatsApp bot with semantic search, multi-provider LLM integration, and phone-based authentication.

## 🚀 Features

### Core Capabilities
- **WhatsApp Integration** - Twilio-powered natural language interface
- **Semantic Search** - pgvector-based member discovery with 768-dim embeddings
- **Multi-Provider LLM System** - Automatic fallback between DeepInfra and Google Gemini
- **Smart Authentication** - Phone-based role resolution without passwords
- **Conversation Context** - Redis-backed session management
- **Rate Limiting** - Configurable per-user limits for messages and searches

### LLM Architecture
- **Primary**: DeepInfra (Llama 3.1 8B Instruct)
- **Fallback**: Google Gemini 2.0 Flash Experimental
- **Circuit Breaker** - Automatic provider health tracking
- **Configurable Retries** - Exponential backoff or fixed delay modes
- **Embeddings**: BAAI/bge-base-en-v1.5 (768-dim) with Gemini fallback

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js 20+ with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL 14+ with pgvector extension
- **Cache/Sessions**: Redis
- **LLM Providers**: DeepInfra, Google Gemini

### AI/ML
- **Inference**: Llama 3.1 8B (DeepInfra) → Gemini 2.0 Flash (fallback)
- **Embeddings**: BAAI/bge-base-en-v1.5 → text-embedding-004 (fallback)
- **Intent Classification**: Naive Bayes with TF-IDF (81.5% accuracy)
- **Vector Search**: pgvector with IVFFlat indexing

### External Services
- **WhatsApp**: Twilio API
- **Development**: ngrok (local tunneling)

## 📁 Directory Structure

```
Server/
├── src/
│   ├── controllers/      # Request handlers
│   ├── routes/           # API endpoints
│   ├── services/         # Business logic
│   │   ├── llm/         # Multi-provider LLM system ⭐
│   │   │   ├── types.ts           # LLM interfaces
│   │   │   ├── deepInfraProvider.ts
│   │   │   ├── geminiProvider.ts
│   │   │   ├── llmFactory.ts      # Provider orchestration
│   │   │   └── index.ts
│   │   ├── llmService.ts          # Domain-specific prompts
│   │   ├── semanticSearch.ts      # Vector search
│   │   ├── sessionService.ts      # Redis sessions
│   │   └── conversationService.ts # Context management
│   ├── middlewares/      # Auth, validation
│   ├── utils/            # Helpers, types
│   ├── config/           # Database, Redis
│   └── scripts/          # Setup utilities
├── tests/                # Jest test suites
├── docs/                 # Extended documentation
└── data/                 # CSV imports
```

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 14+ with pgvector
- Redis 6+
- DeepInfra API key
- Google API key (optional, for fallback)

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your API keys and database URL

# 3. Setup database
npm run db:setup

# 4. Import sample data
npm run import:members

# 5. Generate embeddings
npm run generate:embeddings

# 6. Start development server
npm run dev
```

Server runs on `http://localhost:3000`

## 🔑 Environment Configuration

### Required Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/community_connect

# Redis
REDIS_URL=redis://localhost:6379

# LLM Configuration
LLM_PROVIDER_PRIMARY=deepinfra        # Primary LLM provider
LLM_PROVIDER_FALLBACK=google_gemini   # Fallback provider
DEEPINFRA_API_KEY=your_key_here       # Required
GOOGLE_API_KEY=your_key_here          # Optional (for fallback)

# LLM Retry Configuration
LLM_ENABLE_RETRY_BACKOFF=true    # Exponential backoff (false for fixed delay)
LLM_RETRY_DELAY_MS=1000          # Base delay (100ms for testing)
LLM_MAX_RETRIES=3                # Maximum retry attempts

# Rate Limiting
RATE_LIMIT_MESSAGES_PER_HOUR=50
RATE_LIMIT_SEARCHES_PER_HOUR=30
```

### Testing Configuration

For faster test execution, create `.env.test`:

```bash
LLM_ENABLE_RETRY_BACKOFF=false
LLM_RETRY_DELAY_MS=100
LLM_MAX_RETRIES=2
```

## 🤖 Multi-Provider LLM System

### Architecture Overview

```
WhatsApp Query
    ↓
Intent Classifier (Naive Bayes)
    ↓
Domain-Specific Prompt
    ↓
LLM Factory
    ├── Primary: DeepInfra (Llama 3.1 8B)
    │   └── On Failure → Circuit Breaker
    └── Fallback: Google Gemini 2.0 Flash
        └── Response
```

### Provider Comparison

| Feature | DeepInfra | Google Gemini |
|---------|-----------|---------------|
| **Model** | Llama 3.1 8B Instruct | Gemini 2.0 Flash Exp |
| **Speed** | ~2-3s per query | ~1-2s per query |
| **Cost** | $0.06 per 1M tokens | $0.075 per 1M tokens |
| **Rate Limits** | 50 req/min (free tier) | 15 req/min (free tier) |
| **Context** | 128K tokens | 1M tokens |
| **JSON Support** | Good (with prompt) | Excellent |
| **Embedding Model** | BAAI/bge-base-en-v1.5 | text-embedding-004 |
| **Embedding Dims** | 768 | 768 |

### Circuit Breaker Pattern

- **Failure Threshold**: 5 consecutive failures
- **Reset Timeout**: 60 seconds
- **Behavior**: Automatically skips unhealthy providers
- **Recovery**: Auto-resets after timeout period

### Usage Example

```typescript
import { getLLMFactory } from './services/llm';

// Automatic provider selection and fallback
const llmFactory = getLLMFactory();
const response = await llmFactory.generate({
  messages: [
    { role: 'system', content: 'You are a helpful assistant' },
    { role: 'user', content: 'Hello!' }
  ],
  temperature: 0.3,
  maxTokens: 1000
});

console.log(response.text);

// Check provider health
const status = llmFactory.getProviderStatus();
// [{ name: 'deepinfra', circuitOpen: false, failures: 0 }, ...]
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test suites
npm test llmFactory              # Multi-provider system
npm test llmServiceDomainSpecific # Domain prompts
npm test queryExtraction          # Regex extractors
npm test intentClassifier         # Intent classification

# Fast test mode (for development)
LLM_ENABLE_RETRY_BACKOFF=false LLM_RETRY_DELAY_MS=100 npm test

# Watch mode
npm test -- --watch
```

### Test Results
- **LLM Factory**: 7/7 tests passing ✅
- **Intent Classifier**: 81.5% accuracy ✅
- **Domain-Specific Prompts**: 12/23 tests passing (52% - improved from 4%)

## 📊 API Endpoints

### WhatsApp
- `POST /api/whatsapp/webhook` - Receive WhatsApp messages
- `GET /api/whatsapp/webhook` - Twilio verification

### Members (Protected)
- `GET /api/members` - List all members
- `POST /api/members` - Create member (admin)
- `PUT /api/members/:id` - Update member
- `DELETE /api/members/:id` - Delete member (super_admin)

### Search
- `POST /api/search` - Semantic search with natural language

## 🔐 Authentication

Phone-based "Smart Auth" - no passwords required:
1. Phone number extracted from request (`phoneNumber` or `From` fields)
2. Middleware queries database for user role
3. Role defaults to `member` if not found
4. All protected routes automatically resolve permissions

**Roles**: `member` | `admin` | `super_admin`

## 📈 Performance

- **Query Response Time**: 2-3s average (including LLM)
- **Semantic Search**: <500ms (pgvector IVFFlat)
- **Session Lookup**: <10ms (Redis)
- **Embedding Generation**: ~200ms per member

## 🐛 Troubleshooting

### DeepInfra Rate Limiting (429 Errors)
**Solution**: Automatic fallback to Gemini. If both fail:
```bash
# Increase retry delay
LLM_RETRY_DELAY_MS=2000
LLM_MAX_RETRIES=5
```

### Gemini API 404 Errors
**Issue**: Model name or API not enabled
**Solution**: 
1. Enable "Generative Language API" in Google Cloud Console
2. Enable billing
3. Verify model name: `gemini-2.0-flash-exp`

### Slow Test Execution
**Solution**: Use test configuration
```bash
LLM_ENABLE_RETRY_BACKOFF=false LLM_RETRY_DELAY_MS=100 npm test
```

### pgvector "extension not found"
```sql
-- In psql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Redis Connection Failed
```bash
# Check Redis is running
redis-cli ping  # Should return "PONG"

# Start Redis
redis-server
```

## 📚 Additional Documentation

- [`docs/START-HERE.md`](../docs/START-HERE.md) - Visual setup guide
- [`docs/SMART-AUTH-COMPLETE.md`](../docs/SMART-AUTH-COMPLETE.md) - Authentication details
- [`docs/ARCHITECTURE-DIAGRAM.md`](../docs/ARCHITECTURE-DIAGRAM.md) - System architecture
- [`SETUP.md`](./SETUP.md) - Detailed database setup
- [`LLM-RETRY-CONFIG.md`](./LLM-RETRY-CONFIG.md) - Retry configuration guide
- [`MULTI-PROVIDER-LLM-SUMMARY.md`](./MULTI-PROVIDER-LLM-SUMMARY.md) - LLM architecture deep dive

## 🤝 Contributing

1. Follow TypeScript best practices
2. Add tests for new features
3. Run `npm test` before committing
4. Update documentation for API changes

## 📄 License

Proprietary - Candorbees Technologies
