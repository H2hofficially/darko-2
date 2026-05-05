-- Migration 010: allow 'clarification' as an entry_type on conversation_messages.
--
-- Background: the two-stage intent classifier (decode-intel) short-circuits
-- with a clarifying question to the user when classification confidence is
-- below the threshold. Those clarifier turns are persisted with
-- entry_type='clarification' so they don't pollute the strategist's
-- conversation history on subsequent turns.
--
-- The original CHECK constraint from migration 004 was defined inline (and
-- therefore named by Postgres as `conversation_messages_entry_type_check`).
-- We drop it and recreate it with the wider allow-list.

ALTER TABLE conversation_messages
  DROP CONSTRAINT IF EXISTS conversation_messages_entry_type_check;

ALTER TABLE conversation_messages
  ADD CONSTRAINT conversation_messages_entry_type_check
  CHECK (entry_type IN ('message', 'campaign_brief', 'alert', 'clarification'));
