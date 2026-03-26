-- Add user profile fields collected at signup
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS full_name  TEXT,
  ADD COLUMN IF NOT EXISTS age        INTEGER,
  ADD COLUMN IF NOT EXISTS phone      TEXT;
