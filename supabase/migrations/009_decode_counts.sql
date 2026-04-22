-- decode_counts: tracks daily message usage per user for rate limiting
-- Referenced by decode-intel edge function but was never created as a migration

CREATE TABLE IF NOT EXISTS decode_counts (
  user_id    UUID REFERENCES auth.users PRIMARY KEY,
  count      INTEGER NOT NULL DEFAULT 0,
  reset_date DATE NOT NULL DEFAULT CURRENT_DATE
);

ALTER TABLE decode_counts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their decode counts"
  ON decode_counts FOR ALL USING (auth.uid() = user_id);

-- Ensure the profiles row exists for the app owner (hps.bmw@gmail.com)
-- Safe to run even if the row already exists
INSERT INTO public.profiles (id, tier)
SELECT id, 'pro'
FROM auth.users
WHERE email = 'hps.bmw@gmail.com'
ON CONFLICT (id) DO UPDATE SET tier = 'pro';
