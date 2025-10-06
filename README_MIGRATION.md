Supabase migration for Trovabot

This project can persist data in Supabase (Postgres). If you enable Supabase by setting the environment variables SUPABASE_URL and SUPABASE_SERVICE_KEY (or SUPABASE_KEY), the bot will read/write the following tables:

- authorized_users (id, username, created_at)
- messages (id, channel, username, message, ts)
- bot_state (key, value JSONB)

How to run the migration

1) Using the Supabase SQL editor (recommended):
   - Open your Supabase project dashboard
   - Go to the SQL Editor
   - Copy-paste the contents of migrate.sql and run it

2) Using the supabase CLI:
   - Install the Supabase CLI: https://supabase.com/docs/guides/cli
   - Authenticate and select your project
   - Run: supabase db query "$(cat migrate.sql)"

3) Using psql (if you have a direct DB connection string):
   - psql <CONNECTION_STRING> -f migrate.sql

Notes:
- The SQL is idempotent (uses IF NOT EXISTS)
- If you change the schema later, use ALTER TABLE or create a new migration file
- Keep your service key private (store it in Render/Environment settings)
