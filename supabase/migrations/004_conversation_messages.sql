-- Migration 004: conversation_messages table
-- Replaces intelligence_logs with a true multi-turn conversation model

CREATE TABLE conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  target_id UUID REFERENCES targets ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'darko')),
  content TEXT NOT NULL,
  structured_data JSONB,
  entry_type TEXT DEFAULT 'message' CHECK (entry_type IN ('message', 'campaign_brief', 'alert')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_conv_msgs_target ON conversation_messages (target_id, created_at);

ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their messages"
  ON conversation_messages FOR ALL
  USING (auth.uid() = user_id);
