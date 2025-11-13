// Load environment variables before tests run
require('dotenv').config();

console.log('[Jest Setup] Environment variables loaded');
console.log('[Jest Setup] DEEPINFRA_API_KEY set:', !!process.env.DEEPINFRA_API_KEY);
