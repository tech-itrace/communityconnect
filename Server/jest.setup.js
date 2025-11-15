// Load environment variables before tests run
require('dotenv').config();

// Enable mock LLM for test runs to avoid external billing/errors
process.env.MOCK_LLM = process.env.MOCK_LLM || 'true';

// Increase timeout for slow tests if needed
jest.setTimeout(30000);