-- Supabase / Postgres migration for Trovabot
-- Creates tables used by bot.js when SUPABASE_URL and SUPABASE_SERVICE_KEY are configured

-- authorized_users: stores explicitly granted usernames (normalized, lowercase, no @)
CREATE TABLE IF NOT EXISTS authorized_users (
  id BIGSERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- messages: stores chat messages received for context persistence
CREATE TABLE IF NOT EXISTS messages (
  id BIGSERIAL PRIMARY KEY,
  channel TEXT NOT NULL,
  username TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'chat',
  ts TIMESTAMPTZ DEFAULT now()
);

-- bot_state: key/value store for small bot state items (JSONB)
CREATE TABLE IF NOT EXISTS bot_state (
  key TEXT PRIMARY KEY,
  value JSONB
);
