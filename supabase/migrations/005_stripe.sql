-- Add executive tier support and Stripe customer tracking to profiles

ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_tier_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_tier_check CHECK (tier IN ('free', 'pro', 'executive'));

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
