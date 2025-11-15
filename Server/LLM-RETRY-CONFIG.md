# Multi-Provider LLM System - Quick Configuration Guide

## Overview

The system now supports multiple LLM providers with automatic fallback:
- **DeepInfra** (Llama 3.1 8B) - Primary provider
- **Google Gemini** (1.5 Flash) - Fallback provider

## Retry Configuration

### For Production (Default)
```env
LLM_ENABLE_RETRY_BACKOFF=true  # Exponential backoff: 1s, 2s, 4s...
LLM_RETRY_DELAY_MS=1000         # 1 second base delay
LLM_MAX_RETRIES=3               # Retry up to 3 times
```

**Behavior**: When rate limited, waits 1s → 2s → 4s between retries (total ~7s overhead)

### For Fast Tests
```env
LLM_ENABLE_RETRY_BACKOFF=false  # Fixed delay, no exponential growth
LLM_RETRY_DELAY_MS=100          # 100ms between retries
LLM_MAX_RETRIES=1               # Fail fast after 1 retry
```

**Behavior**: When rate limited, waits 100ms → fails (total ~0.1s overhead)

## Quick Setup

### 1. For Development (.env)
```bash
# Use default retry settings
LLM_ENABLE_RETRY_BACKOFF=true
LLM_RETRY_DELAY_MS=1000
LLM_MAX_RETRIES=3
```

### 2. For Testing (.env.test)
```bash
# Copy the test template
cp .env.test.example .env.test

# Edit with your API keys
nano .env.test

# Add these fast test settings:
LLM_ENABLE_RETRY_BACKOFF=false
LLM_RETRY_DELAY_MS=100
LLM_MAX_RETRIES=1
```

### 3. Run Tests with Fast Config
```bash
# Option 1: Use .env.test (automatic)
npm test llmServiceDomainSpecific

# Option 2: Override environment inline
LLM_ENABLE_RETRY_BACKOFF=false LLM_RETRY_DELAY_MS=100 npm test

# Option 3: Temporarily disable retries entirely
LLM_MAX_RETRIES=0 npm test
```

## Configuration Matrix

| Setting | Production | Development | Fast Tests | No Retry |
|---------|-----------|-------------|------------|----------|
| `LLM_ENABLE_RETRY_BACKOFF` | `true` | `true` | `false` | - |
| `LLM_RETRY_DELAY_MS` | `1000` | `1000` | `100` | - |
| `LLM_MAX_RETRIES` | `3` | `3` | `1` | `0` |
| **Total Retry Time** | ~7 seconds | ~7 seconds | ~0.1 seconds | 0 seconds |
| **Best For** | Production reliability | Local development | Quick test iteration | Debugging failures |

## Retry Behavior Examples

### Example 1: Production (Exponential Backoff)
```
Request 1: ❌ Rate limited (429)
→ Wait 1000ms (1s)
Request 2: ❌ Rate limited (429)
→ Wait 2000ms (2s)
Request 3: ❌ Rate limited (429)
→ Wait 4000ms (4s)
Request 4: ✅ Success
Total time: ~7 seconds
```

### Example 2: Fast Tests (Fixed Delay)
```
Request 1: ❌ Rate limited (429)
→ Wait 100ms
Request 2: ❌ Rate limited (429)
→ Fail immediately
Total time: ~0.1 seconds
```

### Example 3: No Retry (Fail Fast)
```
Request 1: ❌ Rate limited (429)
→ Fail immediately
Total time: 0 seconds
```

## Provider Fallback

Regardless of retry settings, the system will automatically fallback to the secondary provider:

```
DeepInfra (with retries) → Fails
  ↓
Gemini (with retries) → Success
```

## Testing Scenarios

### Scenario 1: Test LLM Integration (Fast)
```bash
# Create .env.test with fast settings
echo "LLM_ENABLE_RETRY_BACKOFF=false" > .env.test
echo "LLM_RETRY_DELAY_MS=100" >> .env.test
echo "LLM_MAX_RETRIES=1" >> .env.test

# Run tests (uses .env.test automatically)
npm test llmFactory
```

### Scenario 2: Test Retry Logic (Realistic)
```bash
# Use production settings in .env
LLM_ENABLE_RETRY_BACKOFF=true npm test llmFactory
```

### Scenario 3: Test Immediate Failures
```bash
# Disable retries completely
LLM_MAX_RETRIES=0 npm test llmServiceDomainSpecific
```

## Troubleshooting

### Tests Are Too Slow
**Problem**: Tests taking 30+ seconds due to retries

**Solution**:
```bash
# Create .env.test with fast settings
cp .env.test.example .env.test

# Or run with inline override
LLM_ENABLE_RETRY_BACKOFF=false LLM_RETRY_DELAY_MS=50 npm test
```

### Want to See Retry Behavior
**Problem**: Need to debug retry logic

**Solution**:
```bash
# Enable retries with verbose logging
LLM_ENABLE_RETRY_BACKOFF=true npm test -- --verbose
```

### Production Errors
**Problem**: Hitting rate limits in production

**Solution**:
```bash
# Increase retry attempts and delays
LLM_MAX_RETRIES=5
LLM_RETRY_DELAY_MS=2000  # Start with 2s
```

## Environment Variable Precedence

1. `.env.test` (if exists, used by Jest)
2. `.env` (default)
3. System environment variables (highest priority)

## Best Practices

1. **Development**: Use default settings (`BACKOFF=true`, `DELAY=1000`)
2. **Testing**: Create `.env.test` with fast settings (`BACKOFF=false`, `DELAY=100`)
3. **CI/CD**: Set `LLM_MAX_RETRIES=1` to fail fast
4. **Production**: Use conservative settings (`RETRIES=5`, `DELAY=2000`)

## Quick Commands

```bash
# Test with no backoff (fastest)
LLM_ENABLE_RETRY_BACKOFF=false npm test

# Test with minimal delay
LLM_RETRY_DELAY_MS=50 npm test

# Test with no retries (instant fail)
LLM_MAX_RETRIES=0 npm test

# Test specific file with fast config
LLM_ENABLE_RETRY_BACKOFF=false npm test llmServiceDomainSpecific
```
