-- ============================================================
-- DARKO — Full Canonical Schema (V2)
-- ============================================================

-- User profile — one row per auth.users entry
CREATE TABLE profiles (
  id               UUID REFERENCES auth.users PRIMARY KEY,
  tier             TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro')),
  directive_path   TEXT DEFAULT 'standard',
  is_locked        BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Targets — one per person the operator is analyzing
CREATE TABLE targets (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             UUID REFERENCES auth.users NOT NULL,
  target_alias        TEXT NOT NULL,
  leverage            TEXT,           -- what this target has over the operator
  objective           TEXT,           -- what the operator wants from this target
  behavioral_profile  JSONB,          -- latest generated TargetProfile JSON
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Intelligence logs — one row per decode operation
CREATE TABLE intelligence_logs (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  target_id        UUID REFERENCES targets ON DELETE CASCADE NOT NULL,
  role             TEXT CHECK (role IN ('user', 'system')) NOT NULL,
  message_content  JSONB NOT NULL,
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- App config — server-side key/value store (not user-scoped)
-- Used to persist the active Gemini context cache name across edge function invocations.
CREATE TABLE app_config (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── Row Level Security ───────────────────────────────────────────────────────

ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE targets          ENABLE ROW LEVEL SECURITY;
ALTER TABLE intelligence_logs ENABLE ROW LEVEL SECURITY;
-- app_config has no RLS — only accessible via service_role key in edge functions

CREATE POLICY "Users own their profile"
  ON profiles FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users own their targets"
  ON targets FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users own their logs"
  ON intelligence_logs FOR ALL USING (
    target_id IN (SELECT id FROM targets WHERE user_id = auth.uid())
  );

-- ── pg_cron: daily Gemini cache refresh ─────────────────────────────────────
-- See supabase/migrations/001_v2_schema.sql for setup instructions.
-- Requires pg_cron + pg_net extensions enabled in Supabase Dashboard.
