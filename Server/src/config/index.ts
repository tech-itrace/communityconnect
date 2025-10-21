import dotenv from 'dotenv';
dotenv.config();

export const PORT = process.env.PORT || 3000;
export const DEEPINFRA_API_KEY = process.env.DEEPINFRA_API_KEY;

// Redis Configuration
export const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
export const REDIS_PASSWORD = process.env.REDIS_PASSWORD || '';
export const REDIS_TLS = process.env.REDIS_TLS === 'true';

// Rate Limiting Configuration
export const RATE_LIMIT_MESSAGES_PER_HOUR = parseInt(process.env.RATE_LIMIT_MESSAGES_PER_HOUR || '50', 10);
export const RATE_LIMIT_SEARCHES_PER_HOUR = parseInt(process.env.RATE_LIMIT_SEARCHES_PER_HOUR || '30', 10);
