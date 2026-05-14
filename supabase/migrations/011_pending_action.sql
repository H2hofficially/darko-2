-- 011_pending_action.sql
-- Adds a single-slot per-target pending action so Darko can commit to
-- time-bound directives ("send this tomorrow afternoon, report back")
-- and follow up next session instead of dropping continuity.

ALTER TABLE targets
  ADD COLUMN IF NOT EXISTS pending_action JSONB;

-- Shape (enforced by client + edge function, not the DB):
-- {
--   instruction:     string  -- "Send Option 1 as-is."
--   script_to_send:  string  -- "hey are you free thursday"
--   due_window:      string  -- 'now' | 'tonight' | 'tomorrow_morning' | 'tomorrow_afternoon'
--                                  | 'tomorrow_evening' | 'in_2_days' | 'in_3_days' | 'when_she_replies'
--   deadline_iso:    string  -- ISO 8601 timestamp
--   created_at:      string  -- ISO when emitted
--   notified_at:     string? -- ISO of the deadline push notification (null until fired)
-- }

-- Partial index for the push-notification cron — only rows with an unresolved
-- directive need to be scanned by check-campaigns.
CREATE INDEX IF NOT EXISTS targets_pending_action_idx
  ON targets ((pending_action IS NOT NULL))
  WHERE pending_action IS NOT NULL;
