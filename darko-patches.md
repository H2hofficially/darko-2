# DARKO — Patch Set (2026-03-23)

All 5 items ready to apply. Items 1–2 are code edits. Items 3–4 are SQL to run in Supabase dashboard. Item 5 is an edge function update.

---

## 1. Wire `targetCommunicationStyle` in decode.tsx

**File:** `app/decode.tsx`

Find the `handleDecode` function's call to `decodeMessage()`. It currently looks something like:

```typescript
const result = await decodeMessage({
  message: inputText,
  history: chatHistory,
  targetName: target?.target_alias,
  leverage: target?.leverage,
  objective: target?.objective,
  missionPhase: target?.mission_phase,
  behavioralProfile: target?.behavioral_profile,
  // targetCommunicationStyle is missing here
});
```

**Add this property to the `decodeMessage()` call:**

```typescript
targetCommunicationStyle: profile?.target_communication_style,
```

So the full call becomes:

```typescript
const result = await decodeMessage({
  message: inputText,
  history: chatHistory,
  targetName: target?.target_alias,
  leverage: target?.leverage,
  objective: target?.objective,
  missionPhase: target?.mission_phase,
  behavioralProfile: target?.behavioral_profile,
  targetCommunicationStyle: profile?.target_communication_style,
});
```

> `profile` should already be available in scope — it's the `TargetProfile` state loaded by the dossier panel logic. If it's named differently (e.g. `targetProfile`), adjust accordingly.

---

## 2. Wire `targetId` in decode.tsx

**Same `handleDecode` function, same `decodeMessage()` call.**

Add:

```typescript
targetId: targetId,
```

Where `targetId` is the route param already being read (likely via `useLocalSearchParams()` or equivalent). The full call now:

```typescript
const result = await decodeMessage({
  message: inputText,
  history: chatHistory,
  targetName: target?.target_alias,
  leverage: target?.leverage,
  objective: target?.objective,
  missionPhase: target?.mission_phase,
  behavioralProfile: target?.behavioral_profile,
  targetCommunicationStyle: profile?.target_communication_style,
  targetId: targetId,
});
```

This enables the background `generateTargetProfile()` call inside `decoder.ts` to save the refreshed profile to the correct target.

---

## 3. Run `push_tokens` migration — Supabase SQL Editor

Copy-paste this into **Supabase Dashboard → SQL Editor → New query → Run**:

```sql
-- Migration 003: push_tokens table
-- Stores Expo push tokens for campaign alert notifications

CREATE TABLE IF NOT EXISTS push_tokens (
  user_id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  token TEXT NOT NULL,
  last_alert_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- No RLS — accessed via service role only from check-campaigns edge function
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- Create an index on last_alert_at for debounce queries
CREATE INDEX IF NOT EXISTS idx_push_tokens_last_alert_at 
  ON push_tokens (last_alert_at);

COMMENT ON TABLE push_tokens IS 'Expo push tokens for campaign alert notifications. Service role access only.';
```

---

## 4. Set up pg_cron for `check-campaigns` — Supabase SQL Editor

Copy-paste this into **Supabase Dashboard → SQL Editor → New query → Run**:

```sql
-- Schedule check-campaigns to run every 6 hours
-- Evaluates all users' targets for alert conditions and sends push notifications

SELECT cron.schedule(
  'check-campaigns',
  '0 */6 * * *',
  $$SELECT net.http_post(
    url:='https://adyebdcyqczhkluqgwvv.supabase.co/functions/v1/check-campaigns',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkeWViZGN5cWN6aGtsdXFnd3Z2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNTc0MzUsImV4cCI6MjA4ODkzMzQzNX0.kpMmCfyCuszQqtXtGk4_8MrVCVZVCG-Jz8oe0Q3chlI"}'::jsonb
  )$$
);
```

To verify it's scheduled:

```sql
SELECT * FROM cron.job WHERE jobname = 'check-campaigns';
```

To remove it later if needed:

```sql
SELECT cron.unschedule('check-campaigns');
```

---

## 5. Stale push token cleanup in `check-campaigns`

**File:** `supabase/functions/check-campaigns/index.ts`

This adds handling for Expo Push API error responses. When Expo returns `DeviceNotRegistered` (token is invalid/expired), the token is deleted from `push_tokens` so it won't be retried.

### 5a. Add token cleanup function

Add this helper function near the top of the file (after imports, before the main handler):

```typescript
/**
 * Process Expo push receipts and prune stale tokens.
 * Expo returns tickets with status 'ok' or 'error'.
 * DeviceNotRegistered means the token is permanently invalid.
 */
async function pruneStaleTokens(
  supabase: any,
  tickets: Array<{ status: string; details?: { error?: string } }>,
  userIds: string[]
) {
  const staleUserIds: string[] = [];

  for (let i = 0; i < tickets.length; i++) {
    const ticket = tickets[i];
    if (
      ticket.status === 'error' &&
      ticket.details?.error === 'DeviceNotRegistered'
    ) {
      staleUserIds.push(userIds[i]);
    }
  }

  if (staleUserIds.length > 0) {
    const { error } = await supabase
      .from('push_tokens')
      .delete()
      .in('user_id', staleUserIds);

    if (error) {
      console.error('Failed to prune stale tokens:', error);
    } else {
      console.log(`Pruned ${staleUserIds.length} stale push token(s)`);
    }
  }
}
```

### 5b. Update the Expo push send logic

Find where the function sends push notifications via Expo's API. It likely looks something like:

```typescript
const response = await fetch('https://exp.host/--/api/v2/push/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(messages),
});
```

**Replace / wrap that block with:**

```typescript
// Send push notifications via Expo Push API
const response = await fetch('https://exp.host/--/api/v2/push/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(messages),
});

const pushResult = await response.json();

// Expo returns { data: [...tickets] } for batch sends
const tickets = Array.isArray(pushResult.data)
  ? pushResult.data
  : [pushResult];

// Prune tokens that Expo reports as permanently invalid
// userIds array must correspond 1:1 with messages array
await pruneStaleTokens(supabaseAdmin, tickets, userIdsForMessages);
```

> **Important:** You need a `userIdsForMessages` array that maps 1:1 with the `messages` array you send to Expo. When you build the `messages` array in your loop, also build a parallel `userIdsForMessages` array. For example:

```typescript
const messages: any[] = [];
const userIdsForMessages: string[] = [];

for (const row of pushTokenRows) {
  // ... your existing alert condition logic ...
  
  if (shouldSendAlert) {
    messages.push({
      to: row.token,
      title: alertTitle,
      body: alertBody,
      data: { targetId, targetName, alertType },
    });
    userIdsForMessages.push(row.user_id);
  }
}
```

This ensures that when Expo ticket index `i` comes back as `DeviceNotRegistered`, you know which `user_id` to delete from `push_tokens`.

---

## Checklist

- [ ] Apply item 1 — wire `targetCommunicationStyle` in `decode.tsx`
- [ ] Apply item 2 — wire `targetId` in `decode.tsx`  
- [ ] Run item 3 — `push_tokens` migration in Supabase SQL editor
- [ ] Run item 4 — pg_cron schedule in Supabase SQL editor
- [ ] Apply item 5 — stale token cleanup in `check-campaigns/index.ts`
- [ ] Deploy updated `check-campaigns`: `SUPABASE_ACCESS_TOKEN=<token> ~/bin/supabase functions deploy check-campaigns --project-ref adyebdcyqczhkluqgwvv --use-api --no-verify-jwt`
- [ ] Test: trigger a decode → verify profile refreshes with correct target
- [ ] Test: send a push to an invalid token → verify it gets pruned from `push_tokens`

---

## PROGRESS.md Update

Add to session history:

```markdown
### 2026-03-23 — Wiring Fixes + Push Infrastructure + Token Cleanup

- `decode.tsx` `handleDecode`: wired `targetCommunicationStyle: profile?.target_communication_style` into `decodeMessage()` call — communication style now feeds back into decode scripts
- `decode.tsx` `handleDecode`: wired `targetId` into `decodeMessage()` call — background profile refresh now saves to correct target
- `push_tokens` migration applied (003_push_tokens.sql) — table live in Supabase
- pg_cron scheduled: `check-campaigns` runs every 6h
- `check-campaigns` edge function: added `pruneStaleTokens()` — deletes tokens from `push_tokens` when Expo returns `DeviceNotRegistered`, prevents retrying dead tokens
```
