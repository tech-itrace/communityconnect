import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import logger from './middlewares/logger';
import errorHandler from './middlewares/errorHandler';
import routes from './routes';

// Load environment variables
const envPath = path.resolve(__dirname, '../.env');
console.log('[app.ts] Loading .env from:', envPath);
const result = dotenv.config({ path: envPath });
if (result.error) {
    console.error('[app.ts] Error loading .env:', result.error);
} else {
    console.log('[app.ts] .env loaded successfully');
    console.log('[app.ts] DEEPINFRA_API_KEY exists:', !!process.env.DEEPINFRA_API_KEY);
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Parse form data from Twilio
app.use(logger);
app.use('/api', routes);
app.use(errorHandler);

export default app;
