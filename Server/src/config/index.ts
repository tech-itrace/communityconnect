import dotenv from 'dotenv';
dotenv.config();

export const PORT = process.env.PORT || 3000;
export const DEEPINFRA_API_KEY = process.env.DEEPINFRA_API_KEY;
