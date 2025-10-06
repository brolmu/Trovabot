import dotenv from 'dotenv';
dotenv.config();

export const SUPABASE_URL = process.env.SUPABASE_URL;
export const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;
export const TWITCH_BOT_USERNAME = process.env.TWITCH_BOT_USERNAME;
export const TWITCH_ACCESS_TOKEN = process.env.TWITCH_ACCESS_TOKEN;
export const TARGET_CHANNELS = process.env.TARGET_CHANNELS || '';
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
