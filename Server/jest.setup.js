// Load environment variables before tests run
// First try .env.test, then fall back to .env
const fs = require('fs');
const path = require('path');

const testEnvPath = path.resolve(__dirname, '.env.test');
const defaultEnvPath = path.resolve(__dirname, '.env');

if (fs.existsSync(testEnvPath)) {
    require('dotenv').config({ path: testEnvPath });
    console.log('[Jest Setup] Using .env.test for test configuration');
} else {
    require('dotenv').config({ path: defaultEnvPath });
    console.log('[Jest Setup] Using .env (no .env.test found)');
}

// Enable mock LLM for test runs to avoid external billing/errors
process.env.MOCK_LLM = process.env.MOCK_LLM || 'true';

// Increase timeout for slow tests if needed
jest.setTimeout(30000);
console.log('[Jest Setup] Environment variables loaded');
console.log('[Jest Setup] DEEPINFRA_API_KEY set:', !!process.env.DEEPINFRA_API_KEY);
console.log('[Jest Setup] GOOGLE_API_KEY set:', !!process.env.GOOGLE_API_KEY);
console.log('[Jest Setup] LLM_ENABLE_RETRY_BACKOFF:', process.env.LLM_ENABLE_RETRY_BACKOFF || 'true (default)');
console.log('[Jest Setup] LLM_RETRY_DELAY_MS:', process.env.LLM_RETRY_DELAY_MS || '1000 (default)');
