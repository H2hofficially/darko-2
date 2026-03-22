-- ============================================================
-- DARKO — Push Tokens & Campaign Alerts
-- ============================================================

CREATE TABLE IF NOT EXISTS push_tokens (
  user_id       UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  token         TEXT NOT NULL,
  last_alert_at TIMESTAMP WITH TIME ZONE,
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- No RLS: accessed only via service_role key inside edge functions.
