-- ============================================================
-- DARKO — V2 Schema Migration
-- Run this against your existing Supabase project.
-- Safe to run multiple times (all changes use IF NOT EXISTS / IF EXISTS guards).
-- ============================================================

-- 1. Add tier column to profiles (free / pro)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'free'
  CHECK (tier IN ('free', 'pro'));

-- 2. Add dossier context columns to targets
ALTER TABLE targets ADD COLUMN IF NOT EXISTS leverage TEXT;
ALTER TABLE targets ADD COLUMN IF NOT EXISTS objective TEXT;

-- 3. Add behavioral_profile column to targets
--    Stores the generated TargetProfile JSON so it syncs across devices
--    (replaces AsyncStorage darko:profile:{id})
ALTER TABLE targets ADD COLUMN IF NOT EXISTS behavioral_profile JSONB;

-- 4. App config table — server-side key/value store
--    Used by refresh-cache edge function to persist the Gemini cache name,
--    and by generate-profile to look up the current cache name.
CREATE TABLE IF NOT EXISTS app_config (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- No RLS: only accessible via service_role key inside edge functions.

-- ============================================================
-- 5. pg_cron — Daily Gemini context cache refresh
-- ============================================================
-- Prerequisites (run once in Supabase Dashboard → Database → Extensions):
--   • Enable pg_cron
--   • Enable pg_net
--
-- Then run the block below in the SQL Editor, replacing <SERVICE_ROLE_KEY>
-- with your project's service_role key (Settings → API → service_role secret).
--
-- This schedules refresh-cache to fire at 00:00 UTC every day, which creates
-- a fresh Gemini cachedContent (TTL 24h) and writes the new name to app_config.
-- ============================================================

/*
SELECT cron.schedule(
  'refresh-gemini-cache',          -- job name (unique)
  '0 0 * * *',                     -- cron expression: daily at midnight UTC
  $$
  SELECT net.http_post(
    url     := 'https://adyebdcyqczhkluqgwvv.supabase.co/functions/v1/refresh-cache',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
    ),
    body    := '{}'::jsonb
  ) AS request_id;
  $$
);
*/

-- To verify the job is registered:
-- SELECT * FROM cron.job;

-- To remove the job if needed:
-- SELECT cron.unschedule('refresh-gemini-cache');
