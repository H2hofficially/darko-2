-- ============================================================================
-- DARKO — STRICT RLS POLICIES
-- ----------------------------------------------------------------------------
-- Replaces existing too-permissive policies that let authenticated users
-- modify rows they shouldn't be able to (their own subscription tier, their
-- own daily decode quota, their own conversation history retroactively).
--
-- Run via Supabase Dashboard → SQL Editor (postgres role bypasses RLS, so
-- this migrates safely). All writes from the React Native client continue to
-- work because they're scoped to the user's own data with auth.uid().
--
-- Service role (used by edge functions like decode-intel, stripe-webhook,
-- decode-counts increments) bypasses RLS entirely, so server-side code is
-- unaffected.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- profiles — user can READ + UPDATE own row, but only safe columns.
-- The auth callback in app/auth/callback.tsx legitimately writes
-- full_name/age/phone after OAuth signup, so we can't lock UPDATE entirely.
-- Instead we use column-level GRANTs as a whitelist: revoke UPDATE on every
-- column, then grant back ONLY the user-editable ones. This way, a future
-- new column added to profiles is locked-by-default until you explicitly
-- decide it's safe.
--
-- Sensitive columns left ungranted:
--   tier              — subscription bypass (free → executive)
--   stripe_customer_id — billing impersonation
--   is_locked          — bypass account locks
--   directive_path     — internal flag
--   id, created_at     — immutable PK + audit
--
-- The stripe-webhook edge function uses service role, which bypasses both
-- RLS and column GRANTs, so tier updates from Stripe still work.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users own their profile" ON profiles;

CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Column-level whitelist: only these three columns are user-writable.
-- An UPDATE attempting to touch tier/stripe_customer_id/etc. will be rejected
-- with "permission denied for column ..." regardless of the row policy.
REVOKE UPDATE ON profiles FROM authenticated, anon;
GRANT UPDATE (full_name, age, phone) ON profiles TO authenticated;

-- No INSERT or DELETE policies for clients. The auth signup trigger creates
-- the profile row server-side; account deletion goes through a dedicated
-- edge function (or admin tooling), not direct client DELETE.

-- ----------------------------------------------------------------------------
-- decode_counts — user can READ own quota counter (so the UI can show
-- "X/30 used today"), but cannot WRITE it. The decode-intel edge function
-- increments via service role. Without this, a user can run:
--   UPDATE decode_counts SET count=0 WHERE user_id = auth.uid()
-- to wipe their daily counter and get unlimited free decodes.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users own their counts" ON decode_counts;
DROP POLICY IF EXISTS "Users own their decode counts" ON decode_counts;

CREATE POLICY "decode_counts_select_own"
  ON decode_counts FOR SELECT
  USING (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE for clients. Service role still writes freely.

-- ----------------------------------------------------------------------------
-- conversation_messages — user can READ + INSERT own. UPDATE and DELETE
-- blocked: chat history is immutable. Target deletion still cleans up
-- messages via foreign-key CASCADE (which runs as the table owner, not the
-- user, so RLS doesn't block it).
--
-- Why not allow UPDATE/DELETE: the handler reads conversation history as
-- context for every decode. If a user could rewrite past messages, they
-- could manipulate the handler's read of the campaign — e.g., delete a
-- "DO NOT escalate" directive, or change "she said no" into "she said yes".
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users own their messages" ON conversation_messages;

CREATE POLICY "conversation_messages_select_own"
  ON conversation_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "conversation_messages_insert_own"
  ON conversation_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- targets — user owns full lifecycle of their own target rows. Existing
-- policy is correct; recreating with explicit per-command policies for
-- clarity instead of catch-all ALL.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users own their targets" ON targets;

CREATE POLICY "targets_select_own"
  ON targets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "targets_insert_own"
  ON targets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "targets_update_own"
  ON targets FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "targets_delete_own"
  ON targets FOR DELETE
  USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- intelligence_logs — V2 legacy table. Migration already copied all rows
-- into conversation_messages. Lock down to SELECT-only so historical
-- references still work, no new writes from clients.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users own their logs" ON intelligence_logs;

CREATE POLICY "intelligence_logs_select_own"
  ON intelligence_logs FOR SELECT
  USING (
    target_id IN (SELECT id FROM targets WHERE user_id = auth.uid())
  );

-- No INSERT/UPDATE/DELETE for clients. Once you're confident V3 has every
-- needed row, you can DROP TABLE intelligence_logs entirely.

-- ----------------------------------------------------------------------------
-- push_tokens — currently RLS on with NO policies, meaning client writes
-- are blocked. Add SELECT+INSERT+DELETE for own rows so users can register
-- their device for push notifications and remove tokens on logout.
-- (Adjust column name if your schema uses something other than user_id.)
-- ----------------------------------------------------------------------------
CREATE POLICY "push_tokens_select_own"
  ON push_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "push_tokens_insert_own"
  ON push_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "push_tokens_delete_own"
  ON push_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- No UPDATE policy: rotate tokens via DELETE + INSERT instead.

-- ----------------------------------------------------------------------------
-- app_config / book_passages — already locked to service_role. Leave alone.
-- ----------------------------------------------------------------------------

COMMIT;

-- ============================================================================
-- VERIFY — run after committing to confirm the new policy state
-- ============================================================================
-- SELECT tablename, policyname, cmd
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, cmd;
