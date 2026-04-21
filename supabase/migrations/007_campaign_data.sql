-- Campaign checklist and notes for campaign planner screen
ALTER TABLE targets ADD COLUMN IF NOT EXISTS campaign_checklist JSONB DEFAULT '{}'::jsonb;
ALTER TABLE targets ADD COLUMN IF NOT EXISTS campaign_notes TEXT;
