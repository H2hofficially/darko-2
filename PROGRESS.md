# DARKO — Build Progress
**Last updated:** 2026-03-26 | **Git:** `web-launch` | **Repo:** github.com/H2hofficially/darko-2

---

## What Is This

A React Native (Expo) app that decodes text messages and social situations through cold Machiavellian psychological analysis. Gemini 2.5 Flash handles deep psychological analysis and profiling via inline system_instruction + RAG passage injection. Supabase provides auth, database, and edge function routing.

---

## Stack

| Layer | Technology | Version |
|---|---|---|
| Mobile framework | Expo | ^54.0.33 |
| React Native | react-native | 0.81.5 |
| React | react | 19.1.0 |
| Routing | expo-router | ~6.0.23 |
| Language | TypeScript | ~5.9.2 |
| Auth + DB + Edge | Supabase | @supabase/supabase-js ^2.99.3 |
| AI — analysis | Gemini 2.5 Flash | via REST |
| Image input | expo-image-picker | ~17.0.10 |
| Voice input | expo-audio | ~1.1.1 |
| Push notifications | expo-notifications | ~0.30.0 |
| Storage | AsyncStorage | 2.2.0 |
| File system | expo-file-system | ~19.0.21 |

---

## File Map

### App screens — `app/`

| File | Purpose |
|---|---|
| `app/_layout.tsx` | Stack navigator root. Registers all screens. Sets foreground notification handler. Adds `addNotificationResponseReceivedListener` — on notification tap, navigates to `/decode?targetId=...&targetName=...&darkoAlert=TYPE`. |
| `app/onboarding.tsx` | 3-screen swipeable onboarding (FlatList + pagingEnabled). Scan-line animation sweeps top-to-bottom. Dot indicators. Screen 3: INITIALIZE SYSTEM → writes `darko_onboarded=true` to AsyncStorage → navigates to `/auth`. |
| `app/auth.tsx` | Login + signup screen. Email confirmation pending state. Redirects to `/` on session. |
| `app/auth/callback.tsx` | Deep link handler for email confirmation. Exchanges `code` param for session via `supabase.auth.exchangeCodeForSession`. |
| `app/index.tsx` | Target profiles home screen. Gate: onboarding → auth → render. Lists targets with decode counts. Create/delete targets. After auth: calls `registerPushToken()` non-blocking. |
| `app/decode.tsx` | Main conversational screen (V3). Chat-style inverted FlatList. Streaming DARKO responses with live cursor. Image picker, voice recorder (60s auto-stop). Mission phase bar + phase unlock overlay. `DarkoBubble` renders prose + `ScriptCard` per script + alert/read blocks. Long-press to copy. `// DOSSIER` sliding panel. `// BRIEF` button submits campaign brief as structured user message. `darkoAlert` param: injects synthetic DARKO warning bubble. Edit-and-re-decode flow removed. |

### Services — `services/`

| File | Purpose |
|---|---|
| `services/darko.ts` | V3 service layer. `sendMessage()` — streaming fetch to `decode-intel`, SSE reader via `response.body.getReader()`, calls `onChunk(accumulated)` per chunk, `onComplete(DarkoResponse)` on stream end. `parseDarkoResponse()` — extracts `// SCRIPT`, `// ALERT`, `// PHASE UPDATE [N]`, `// READ`, `// CAMPAIGN` blocks with `// END` terminators. `transcribeAudio()` — invokes `transcribe-audio`. `generateTargetProfile()` — invokes `generate-profile`. Debounced profile refresh: 3 min after last message. |
| `services/decoder.ts` | Legacy V2 service. `decodeMessage()` — invokes `decode-intel`. Returns `DecoderResult \| CampaignBriefResult \| null`. Still referenced only by any remaining V2 code paths. |
| `services/storage.ts` | All Supabase CRUD. V3 additions: `ConversationMessage` type; `saveMessage()` — inserts into `conversation_messages`; `getConversation()` — fetches messages ordered by `created_at`. `getDecodeCount()` tries `conversation_messages` first, falls back to `intelligence_logs`. Legacy: `Target`, `DecodeEntry`, `TargetProfile` (20 fields), `getHistory()`, `addDecodeEntry()`, `updateDecodeEntry()`. |
| `services/notifications.ts` | `registerPushToken()` — requests permission, gets Expo push token via `getExpoPushTokenAsync`, upserts to `push_tokens` table. Fails silently if no EAS projectId configured. |

### Edge Functions — `supabase/functions/`

| Function | Purpose |
|---|---|
| `decode-intel` | V3 main engine. `DARKO_SYSTEM_PROMPT` — conversational identity, 8 rules, block markers, framework library. Reads conversation history from `conversation_messages` DB (pro: last 50 msgs, free: last 10). Builds multi-turn Gemini `contents` array. RAG heuristic: skip for messages under 20 words. Rate limit: 30/day free. Blocked words preflight. Streams via `streamGenerateContent?alt=sse` — SSE body forwarded directly to client. Image input supported. |
| `generate-profile` | Generates psychological dossier from decode history. Returns 20 fields including `operative_mistakes`, `target_communication_style`, `relationship_momentum`, `last_known_emotional_state`. History entries include timestamps for date-anchored mistake tracking. |
| `transcribe-audio` | Transcribes audio via Gemini multimodal. Returns `{ text }`. |
| `check-campaigns` | Scheduled (pg_cron every 6h). Reads all `push_tokens`, checks each user's targets for alert conditions: SILENCE_WINDOW (exact threshold day crossing by phase), ADVANCEMENT_SIGNAL (momentum advancing + recent decode), MISTAKE_FOLLOWUP (errors flagged + recent decode), RE_ENGAGEMENT (extended silence + operative inactive). Sends via Expo Push API. Debounces: max 1 alert per user per 20 hours via `last_alert_at`. |
| `refresh-cache` | Creates Gemini context cache. NOTE: cachedContent not used (token overflow on 2.5-flash). Kept for reference. |

### Campaign Brief System

`CampaignBriefModal` — full-screen modal triggered by `// BRIEF` button in decode screen header:
- 7 guided fields: WHO IS SHE / HOW SHE KNOWS YOU / THE HISTORY / HER SITUATION / YOUR SITUATION / YOUR OBJECTIVE / THE COMPLEXITY
- Internal field state; builds structured brief string on submit
- Submits with `brief_mode: true` → `CAMPAIGN_BRIEF_SYSTEM_PROMPT` on edge function

`CampaignBriefBubble` — renders campaign result in chat:
- Target profile card: psychological type, attachment style, archetype to deploy, key insight (ACCENT)
- Current position: phase + cold assessment
- Immediate action + copyable first message + rationale
- Collapsible roadmap phases (current phase auto-expanded, tap others to expand)
  - Each phase: objective, directives, message scripts (copyable), advancement signals, mistakes to avoid

`CampaignBriefResult` type (in `decoder.ts`): intent, target_profile, current_phase, phase_name, phase_assessment, immediate_next_move, first_message_to_send, first_message_rationale, campaign_roadmap[], handler_note.

Campaign brief entries saved to `intelligence_logs` with `entryType: 'campaign_brief'` on `DecodeEntry`. `historyToChatMsgs` reads `entryType` and routes to `CampaignBriefBubble` on reload.

### Temporal Intelligence System

Every Gemini call receives a `=== TEMPORAL INTELLIGENCE ===` block calculated from history timestamps:
- Days since target last messaged (last `tactical` response entry)
- Days since operative last messaged (proxy: last tactical entry)
- Days since last decode session (most recent entry)
- Target's typical response window (avg gap between tactical entries)
- Current silence duration
- Auto-alerts: 5+ day silence → re-engagement flag; sub-24h decode → no-text-again flag

### Auto Profile Refresh

After every successful decode: `generateTargetProfile()` fires non-blocking → `saveTargetProfile()` saves result. Profile always reflects latest state. New fields: `operative_mistakes`, `target_communication_style`, `relationship_momentum`, `last_known_emotional_state`.

Communication style feeds back into decode: `target_communication_style` from `behavioral_profile` passed as `targetCommunicationStyle` in `DecodeInput` → injected into Gemini as `=== TARGET COMMUNICATION STYLE ===` block with script rules (casual/formal/emoji/language-mix mirroring).

### Scripts — `scripts/`

| File | Purpose |
|---|---|
| `scripts/upload-books.js` | Uploads PDFs to Gemini File API. Writes URIs to `knowledge/file-refs.json`. |
| `scripts/create-cache.js` | Creates Gemini context cache. Writes cache name to Supabase `app_config`. |
| `scripts/test-darko.js` | 6-scenario integration test suite. |
| `scripts/migrate-to-conversations.ts` | One-time migration: `intelligence_logs` → `conversation_messages`. Each DecodeEntry becomes two rows (user + darko). Preserves timestamps and entryType. Run with `npx ts-node scripts/migrate-to-conversations.ts`. Requires `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`. |

### Config

| File | Purpose |
|---|---|
| `.env.local` | Local secrets — gitignored. |
| `app.json` | Expo config. Scheme: `darko`. EAS projectId: `d9531d74-c9f3-486b-a10d-f836e7f12a0f`. Plugins: expo-router, expo-image-picker, expo-audio, expo-notifications. iOS bundleIdentifier: `com.h2hofficially.darko`. `ITSAppUsesNonExemptEncryption: false`. |
| `eas.json` | EAS build profiles: development (internal), preview (internal), production (autoIncrement). |
| `supabase/migrations/001_v2_schema.sql` | Core schema: profiles, targets, intelligence_logs, app_config. |
| `supabase/migrations/002_book_passages.sql` | RAG: book_passages table + pgvector + search_book_passages RPC. |
| `supabase/migrations/003_push_tokens.sql` | push_tokens table (user_id PK, token, last_alert_at, updated_at). |
| `supabase/migrations/004_conversation_messages.sql` | V3 conversation_messages table. role CHECK ('user','darko'), entry_type CHECK ('message','campaign_brief','alert'), RLS: users own their messages. Index on (target_id, created_at). |

---

## Supabase

| Field | Value |
|---|---|
| Project ref | `adyebdcyqczhkluqgwvv` |
| URL | `https://adyebdcyqczhkluqgwvv.supabase.co` |
| Edge functions | decode-intel, generate-profile, transcribe-audio, check-campaigns, refresh-cache |

### Database tables

| Table | Purpose |
|---|---|
| `profiles` | One row per user. `tier` (free/pro). RLS: users own their row. |
| `targets` | Target profiles. `target_alias`, `leverage`, `objective`, `behavioral_profile` (JSONB), `mission_phase`. RLS: users own their targets. |
| `intelligence_logs` | V2 decode history. `message_content` (JSONB — full DecodeEntry including `entryType`). `created_at` used as authoritative timestamp. Cascade deletes with target. Superseded by `conversation_messages` in V3. |
| `conversation_messages` | V3 conversation history. `role` ('user'/'darko'), `content` (TEXT), `structured_data` (JSONB — scripts, phaseUpdate, etc.), `entry_type` ('message'/'campaign_brief'/'alert'). RLS. Index on (target_id, created_at). |
| `app_config` | Server-side key/value. `gemini_cache_name`. No RLS. |
| `push_tokens` | One row per user. `token` (Expo push token), `last_alert_at` (debounce), `updated_at`. No RLS — service role only. |
| `decode_counts` | Daily decode count per user for rate limiting. `count`, `reset_date`. |

### Secrets set on Supabase

| Secret | Status |
|---|---|
| `GEMINI_API_KEY` | ✓ Set |
| `SUPABASE_URL` | ✓ Set (auto-injected) |
| `SUPABASE_ANON_KEY` | ✓ Set (auto-injected) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✓ Set (auto-injected) |

---

## EAS / Build

| Field | Value |
|---|---|
| EAS Project ID | `d9531d74-c9f3-486b-a10d-f836e7f12a0f` |
| Owner | `h2hofficially` |
| Bundle ID (iOS) | `com.h2hofficially.darko` |
| Build profile | `preview` (internal distribution — install via link) |
| Push notifications | Requires EAS build (not Expo Go) |

---

## GitHub

| Field | Value |
|---|---|
| Repo | github.com/H2hofficially/darko-2 |
| Branch | `main` |
| Visibility | Private |
| GitHub Actions | `refresh-cache.yml` — runs `node scripts/create-cache.js` daily at 2am UTC |

---

## Gemini Config

| Field | Value |
|---|---|
| Model | `models/gemini-2.5-flash` |
| Cache | NOT used in decode-intel/generate-profile (555K token overflow on 2.5-flash) |
| Book knowledge | RAG only — query embedding → `search_book_passages` → top 5 passages injected |

### Books in RAG (6)

| Book | Gemini File URI |
|---|---|
| Robert Greene — The 48 Laws of Power | `files/841pr97csi6q` |
| Robert Greene — The Art of Seduction | `files/7a87mk74m88j` |
| Robert Greene — The Laws of Human Nature | `files/ewzy70fcjif1` |
| David Buss — The Evolution of Desire | `files/jf726p3zz8no` |
| Sigmund Freud — Totem and Taboo | `files/qs9jneclk6cd` |
| Joe Navarro — What Every Body Is Saying | `files/nnhfvs1ldvv1` |

---

## DARKO Response Schema

### Standard decode
```json
{
  "intent": "text_back" | "strategic_advice" | "full_debrief",
  "mission_status": "// INTEL RECEIVED",
  "visible_arsenal": {
    "option_1_script": "tactical reply",
    "option_2_script": "second reply"
  },
  "hidden_intel": {
    "threat_level": "8.5/10 — Archetype Label",
    "the_psyche": "2 sentences",
    "the_directive": ["directive 1", "directive 2", "directive 3"]
  },
  "next_directive": "one cold sentence",
  "handler_note": null,
  "phase_update": null
}
```

### Campaign brief
```json
{
  "intent": "campaign_brief",
  "mission_status": "// CAMPAIGN INITIALIZED",
  "target_profile": {
    "psychological_type": "string",
    "attachment_style": "string",
    "primary_vulnerability": "string",
    "seduction_archetype_to_deploy": "string",
    "key_insight": "string"
  },
  "current_phase": 1,
  "phase_name": "string",
  "phase_assessment": "string",
  "immediate_next_move": "string",
  "first_message_to_send": "string",
  "first_message_rationale": "string",
  "campaign_roadmap": [
    {
      "phase": 1,
      "phase_name": "SEPARATION",
      "objective": "string",
      "estimated_duration": "string",
      "key_tactic": "string",
      "behavioral_directives": ["string"],
      "message_scripts": [{ "situation": "string", "message": "string", "effect": "string" }],
      "advancement_signals": ["string"],
      "mistakes_to_avoid": ["string"]
    }
  ],
  "handler_note": null
}
```

---

## Features Built

- [x] Auth — login / signup / signout / email confirmation flow
- [x] Target profiles — leverage + objective fields, delete with CASCADE
- [x] DARKO handler persona — cold autonomous advisor, dynamic response types
- [x] Full conversation history sent to Gemini on every decode (pro tier)
- [x] Running relationship brief per target — sent in context
- [x] Mission phase system — 5 phases (count-based + Gemini-suggested), phase unlock animation
- [x] Myers-Briggs profiling — MBTI type, dominant/shadow function, seduction vulnerability
- [x] RAG — query embedding → `search_book_passages` → top 5 passages injected per decode
- [x] Sliding dossier panel — 85% width drawer, all profile sections
- [x] Screenshot upload — expo-image-picker, base64 inline to Gemini
- [x] Voice recording + transcription — expo-audio → .m4a → base64 → Gemini multimodal, 60s auto-stop
- [x] Auto-expanding TextInput, CMD > prefix
- [x] Chat UI — inverted FlatList, user bubbles right, DARKO bubbles left with ACCENT border
- [x] Editable user messages — long-press → edit modal → re-decode → updates in-place
- [x] Copyable script cards — copy button per script, // copied flash
- [x] // Notation system — all labels use // prefix, action buttons plain lowercase
- [x] Blocked words preflight — 400 SECURE OVERRIDE
- [x] Rate limiting — 20 decodes/day free tier, 429 with upgrade prompt
- [x] Long-press to copy full DARKO response
- [x] 3-screen swipeable onboarding with scan-line animation
- [x] **CORE DIRECTIVE + BALANCE RULE** — DARKO calls out anxiety before answering, always delivers script regardless of emotional state
- [x] **Temporal Intelligence** — every Gemini call receives days-since-last-contact data; 5+ day silence alert; sub-24h re-decode flag
- [x] **Auto profile refresh** — `generateTargetProfile()` fires non-blocking after every decode; profile always current
- [x] **Communication style extraction** — `target_communication_style` extracted by generate-profile, injected into decode as script rules (casual/formal/emoji/language-mix mirroring)
- [x] **Push notifications** — `check-campaigns` edge function (pg_cron every 6h); 4 alert types; Expo Push API; debounced per user; `push_tokens` table
- [x] **Notification tap handling** — `_layout.tsx` listener navigates to correct target's decode screen with `darkoAlert` param; decode screen injects synthetic DARKO warning bubble
- [x] **Campaign Brief mode** — `// BRIEF` button → 7-field guided modal → `CAMPAIGN_BRIEF_SYSTEM_PROMPT` → structured campaign strategy: target profile, current phase assessment, immediate move, copyable first message, collapsible 3-5 phase roadmap with scripts
- [x] EAS project configured (`d9531d74`) — iOS bundle ID set, expo-notifications plugin registered
- [x] `eas.json` — development / preview / production build profiles
- [x] **V3 Conversational model** — DARKO is now a conversational AI strategist; natural language prose responses with embedded block markers; multi-turn Gemini `contents` array; history read from DB on edge function side
- [x] **Streaming responses** — `streamGenerateContent?alt=sse`; SSE forwarded to client; `DarkoBubble` shows live growing text with cursor during stream
- [x] **Block parser** — `parseDarkoResponse()` extracts `// SCRIPT`, `// ALERT`, `// PHASE UPDATE [N]`, `// READ`, `// CAMPAIGN` blocks; clean prose displayed separately
- [x] **`conversation_messages` table** — replaces `intelligence_logs` as V3 storage; individual user/darko rows with role, content, structured_data
- [x] **Debounced profile refresh** — 3-minute debounce after conversation settles (not after every message)
- [x] **RAG heuristic** — skip RAG for messages under 20 words (follow-up optimisation)
- [x] **Free tier rate limit raised** — 30 messages/day (was 20)

---

## Design System

| Token | Value | Usage |
|---|---|---|
| `BG` | `#09090B` | Screen backgrounds |
| `CARD_BG` | `#18181B` | Card backgrounds |
| `BORDER` | `#27272A` | Borders, dividers |
| `TEXT_PRIMARY` | `#E4E4E7` | Main text |
| `TEXT_DIM` | `#A1A1AA` | Labels, metadata |
| `ACCENT` | `#CCFF00` | CTA buttons, active indicators, key insights |
| `ERROR_RED` | `#FF4444` | Errors, warnings, avoid lists |
| `MONO` | Courier New / monospace | Headers, labels, UI chrome |
| `SANS` | System / sans-serif | Analysis content, directives, scripts |

---

## What Needs To Be Done Next

### High priority (shipping blockers)
- [x] **Expo Web launch** — see session 2026-03-26 below.
- [ ] **Paywall / RevenueCat** — $15/month. RevenueCat SDK + `tier` flip in Supabase on purchase. Free tier: 30 decodes/day. Pro: unlimited + full history context.
- [ ] **App Store build** — `eas build --platform ios --profile preview` succeeds but needs Apple Developer account for certificates. Run interactively.
- [x] **Run `003_push_tokens.sql` migration** — table live in Supabase (applied 2026-03-23).
- [x] **Set up pg_cron for check-campaigns** — scheduled every 6h (applied 2026-03-23).
- [ ] **Run `004_conversation_messages.sql` migration** — V3 conversation table must exist. Run in Supabase SQL editor.
- [ ] **Run migration script** — after `conversation_messages` is live: `npx ts-node scripts/migrate-to-conversations.ts` (migrates intelligence_logs → conversation_messages)
- [x] **Deploy V3 edge functions** — `decode-intel` and `check-campaigns` deployed 2026-03-23
- [x] **Wire `targetCommunicationStyle` in decode.tsx** — pass `profile?.target_communication_style` as `targetCommunicationStyle` in `decodeMessage()` call inside `handleDecode`.
- [x] **Wire `targetId` in decode.tsx `handleDecode`** — pass `targetId` so background profile refresh saves correctly.

### Medium priority
- [ ] **Share / Export** — share decode result as image or text via native share sheet.
- [ ] **Conversation import** — paste WhatsApp/iMessage chat export, decode full arc as campaign brief.
- [ ] **Hindi / Hinglish routing** — detect language, route to Sarvam AI for transcription.

### Lower priority / future
- [ ] **Voice output** — ElevenLabs TTS reading back the tactical script.
- [ ] **Gemini 2.5 Flash context caching** — blocked by 1M token overflow. Monitor future model updates.

---

## Manual Setup Required

### Run conversation_messages migration (Supabase SQL editor)
```sql
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
CREATE POLICY "Users own their messages" ON conversation_messages FOR ALL USING (auth.uid() = user_id);
```

### Run push_tokens migration (Supabase SQL editor)
```sql
CREATE TABLE IF NOT EXISTS push_tokens (
  user_id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  token TEXT NOT NULL,
  last_alert_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Set up pg_cron (Supabase SQL editor)
```sql
SELECT cron.schedule(
  'check-campaigns',
  '0 */6 * * *',
  $$SELECT net.http_post(
    url:='https://adyebdcyqczhkluqgwvv.supabase.co/functions/v1/check-campaigns',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkeWViZGN5cWN6aGtsdXFnd3Z2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNTc0MzUsImV4cCI6MjA4ODkzMzQzNX0.kpMmCfyCuszQqtXtGk4_8MrVCVZVCG-Jz8oe0Q3chlI"}'::jsonb
  )$$
);
```

---

## How To Run

### Development
```bash
npm install
npx expo start
# Scan QR with Expo Go (push notifications require EAS build)
```

### Deploy edge functions
```bash
SUPABASE_ACCESS_TOKEN=<sbp_token> ~/bin/supabase functions deploy decode-intel --project-ref adyebdcyqczhkluqgwvv --use-api --no-verify-jwt
SUPABASE_ACCESS_TOKEN=<sbp_token> ~/bin/supabase functions deploy generate-profile --project-ref adyebdcyqczhkluqgwvv --use-api --no-verify-jwt
SUPABASE_ACCESS_TOKEN=<sbp_token> ~/bin/supabase functions deploy check-campaigns --project-ref adyebdcyqczhkluqgwvv --use-api --no-verify-jwt
```

### EAS build (iOS preview — run interactively in terminal)
```bash
eas build --platform ios --profile preview
```

### Push to GitHub
```bash
git add .
git commit -m "your message"
git push origin main
```

---

## Session History

### 2026-03-26 — Expo Web Launch

**Goal:** Run the existing app on web without model or prompt changes.

**`app.json`** *(updated)*:
- Added `"bundler": "metro"`, `"output": "single"` to web section — enables Metro-bundled SPA export.

**`vercel.json`** *(created)*:
- `buildCommand`: `npx expo export --platform web`
- `outputDirectory`: `dist`
- Rewrite: `/*` → `/index.html` for SPA client-side routing.

**`app/_layout.tsx`** *(updated)*:
- Moved `expo-notifications` initialization behind `Platform.OS !== 'web'` guard using `require()` — prevents crash on web.
- Added `privacy` and `terms` screen registrations to Stack.

**`services/darko.ts`** *(updated)*:
- Removed `react-native-sse` top-level import (was crashing on web).
- Added `Platform.OS === 'web'` branch in `sendMessage()`:
  - **Web**: `fetch()` + `response.body.getReader()` + `TextDecoder` SSE parsing.
  - **Native**: `require('react-native-sse')` loaded at call time.
- Both paths share the same `processChunk()` parser and `finish()` completion logic.

**`app/index.tsx`** *(updated)*:
- Added `showLanding` state.
- Web path: skip onboarding check, if no session → `setShowLanding(true)` instead of redirecting to `/auth`.
- `LandingPage` component: dark terminal aesthetic, headline, 3 feature callouts, "INITIALIZE SYSTEM" → `/auth` CTA, footer links to /privacy and /terms.
- Auth screen route `maxWidth: 600` responsive wrapper for web.

**`app/privacy.tsx`** *(created)*:
- `/privacy` route: data collected, Supabase/Gemini processing, no data selling, deletion instructions.

**`app/terms.tsx`** *(created)*:
- `/terms` route: personal development purposes, not professional advice, acceptable use, subscription terms.

**`hooks/useImagePicker.ts`** *(created)*:
- Web: `<input type="file" accept="image/*">` + `FileReader.readAsDataURL()`.
- Native: dynamic `import('expo-image-picker')`.

**`hooks/useVoiceRecorder.ts`** *(created)*:
- Web: `navigator.mediaDevices.getUserMedia()` + `MediaRecorder` → `Blob` → `FileReader` base64.
- Native: dynamic `import('expo-audio')` + `expo-file-system` for base64 read.

**`hooks/useClipboard.ts`** *(created)*:
- Web: `navigator.clipboard.writeText()` with `execCommand('copy')` fallback.
- Native: dynamic `import('expo-clipboard')`.

**`app/decode.tsx`** *(updated)*:
- Added `maxWidth: 600, alignSelf: 'center', width: '100%'` to root style on web via Platform check.

**`supabase/functions/health/index.ts`** *(created)*:
- Pings `profiles` table, returns `{ status, db, ts }` with 200/503.
- Deploy: `supabase functions deploy health --project-ref adyebdcyqczhkluqgwvv`

---


### 2026-03-23 — V3 Conversational Architecture

**Core concept:** DARKO transforms from a decode-and-respond tool into a conversational AI relationship strategist. Natural language prose with embedded block markers replaces rigid JSON output. Multi-turn conversation history replaces per-request context payloads.

**`supabase/migrations/004_conversation_messages.sql`** *(created)*:
- `conversation_messages` table: role ('user'/'darko'), content TEXT, structured_data JSONB, entry_type ('message'/'campaign_brief'/'alert')
- RLS: users own their messages. Index on (target_id, created_at).

**`scripts/migrate-to-conversations.ts`** *(created)*:
- One-time migration from `intelligence_logs` → `conversation_messages`
- Each DecodeEntry → two rows (user message + darko response), preserving timestamps and entryType

**`supabase/functions/decode-intel/index.ts`** *(complete rewrite)*:
- Removed: `PRO_ADVISOR_PROMPT`, `CAMPAIGN_BRIEF_SYSTEM_PROMPT`, `normalizeResponse()`, all legacy JSON schema, `brief_mode` path
- Added: `DARKO_SYSTEM_PROMPT` — conversational identity, 8 rules, block markers (`// SCRIPT...// END`, `// ALERT`, `// PHASE UPDATE [N]`, `// READ`, `// CAMPAIGN`)
- Reads conversation history from `conversation_messages` DB directly (pro: 50 msgs, free: 10)
- Builds multi-turn Gemini `contents` array (role: 'user'/'model')
- RAG heuristic: `shouldUseRag()` skips for messages under 20 words
- Switches from `generateContent` to `streamGenerateContent?alt=sse`
- Forwards raw SSE stream body to client (no JSON parsing on edge side)
- Free limit raised: 30/day (was 20)

**`services/darko.ts`** *(created — replaces decoder.ts for V3)*:
- `DarkoResponse` type: `{ text, scripts, alerts, phaseUpdate, reads, isCampaign }`
- `parseDarkoResponse()` — regex block extractor, strips blocks from prose
- `sendMessage()` — streaming fetch with SSE reader, calls `onChunk(accumulated)` / `onComplete(DarkoResponse)` / `onError()`
- `scheduleProfileRefresh()` — 3-minute debounce after conversation settles

**`services/storage.ts`** *(updated)*:
- Added `ConversationMessage` type
- Added `saveMessage(targetId, role, content, structuredData?, entryType?)`
- Added `getConversation(targetId, limit?)`
- Updated `getDecodeCount()` — tries `conversation_messages` first (V3), falls back to `intelligence_logs` (V2)

**`app/decode.tsx`** *(complete rewrite)*:
- Imports: `services/darko` (sendMessage, parseDarkoResponse, DarkoResponse) + `services/storage` (saveMessage, getConversation, ConversationMessage)
- `ChatMsg` simplified: `user` + `darko` types; darko type has `response: DarkoResponse`, `isStreaming?`, `streamText?`
- `conversationToChatMsgs()` replaces `historyToChatMsgs()`, takes `ConversationMessage[]`
- `DarkoBubble` rewritten: streaming → plain growing text + cursor; completed → prose + ScriptCard per script + alert/read blocks + phase update indicator
- `handleSend()` replaces `handleDecode()`: saves user message → adds streaming placeholder → calls `sendMessage()` → on complete saves DARKO response + upgrades bubble
- Campaign brief: `// BRIEF` modal submits as `CAMPAIGN BRIEF REQUEST:\n{content}` regular message (no `briefMode` flag)
- Edit-and-re-decode flow removed
- Mount effect: `getConversation()` instead of `getHistory()`

---

### 2026-03-23 — Wiring Fixes + Push Infrastructure + Token Cleanup

- `decode.tsx` `handleDecode`: wired `targetCommunicationStyle: profile?.target_communication_style` into `decodeMessage()` call — communication style now feeds back into decode scripts
- `decode.tsx` `handleDecode`: wired `targetId` into `decodeMessage()` call — background profile refresh now saves to correct target
- `push_tokens` migration applied (003_push_tokens.sql) — table live in Supabase
- pg_cron scheduled: `check-campaigns` runs every 6h
- `check-campaigns` edge function: added `pruneStaleTokens()` — deletes tokens from `push_tokens` when Expo returns `DeviceNotRegistered`, prevents retrying dead tokens

### 2026-03-22 — 5 Intelligence Features + Campaign Brief

**Part 1 — Stronger Judgment** (`supabase/functions/decode-intel/index.ts`):
- `CORE DIRECTIVE` added to top of `PRO_ADVISOR_PROMPT` — DARKO detects anxiety vs strategy before answering
- `BALANCE RULE` added — calling out anxiety does NOT mean withholding the script; always deliver both assessment and message

**Part 2 — Temporal Intelligence** (`decode-intel`, `services/decoder.ts`, `services/storage.ts`):
- `getHistory()` now selects `created_at` from DB row, stamps as `timestamp` on each `DecodeEntry`
- `buildHistory()` passes `timestamp` on every history entry to edge function
- `buildTemporalBlock()` added to edge function — calculates 6 temporal metrics from history timestamps
- Injected into every Gemini call: days since target/operative last messaged, response window, silence alerts (5+ days → re-engagement flag; sub-24h → no-text flag)

**Part 3 — Auto-Updating Relationship Brief** (`services/decoder.ts`, `services/storage.ts`, `supabase/functions/generate-profile`):
- `saveTargetProfile` imported in decoder.ts; fires non-blocking after every successful decode
- `DecodeInput` gets `targetId?: string`; callers pass it to enable background save
- `TargetProfile` gets 4 new fields: `operative_mistakes`, `target_communication_style`, `relationship_momentum`, `last_known_emotional_state`
- `generate-profile` prompt updated with 4 new JSON fields + date-labelled history entries
- `generateTargetProfile()` maps all 4 new fields

**Part 4 — Communication Style Extraction** (`decode-intel`):
- `buildCommunicationStyleBlock()` added — takes `target_communication_style` string, returns `=== TARGET COMMUNICATION STYLE ===` block with 5 script rules
- `DecodeInput` gets `targetCommunicationStyle?: string`; passed as `target_communication_style` to edge function
- Block injected between temporal block and history block in `fullMessage`

**Part 5 — Push Notifications** (`supabase/functions/check-campaigns`, `services/notifications.ts`, `app/_layout.tsx`, `app/index.tsx`, `app/decode.tsx`):
- `check-campaigns` edge function: reads all push tokens, evaluates 4 alert conditions per target (SILENCE_WINDOW, ADVANCEMENT_SIGNAL, MISTAKE_FOLLOWUP, RE_ENGAGEMENT), debounces per user (20h), sends via Expo Push API
- `services/notifications.ts`: `registerPushToken()` — permissions → `getExpoPushTokenAsync` → upsert to `push_tokens`
- `app/_layout.tsx`: `setNotificationHandler` for foreground alerts + `addNotificationResponseReceivedListener` tap handler → navigate to decode with `darkoAlert` param
- `app/index.tsx`: calls `registerPushToken()` non-blocking after auth
- `app/decode.tsx`: reads `darkoAlert` param, injects synthetic DARKO warning bubble as newest message
- `supabase/migrations/003_push_tokens.sql`: push_tokens table
- `expo-notifications` installed, plugin added to `app.json`
- EAS: `eas init`, bundleIdentifier set, `ITSAppUsesNonExemptEncryption: false`

**Campaign Brief Mode** (`decode-intel`, `services/decoder.ts`, `services/storage.ts`, `app/decode.tsx`):
- `CAMPAIGN_BRIEF_SYSTEM_PROMPT` added to edge function — full campaign strategy schema (target profile, phase assessment, roadmap 3-5 phases with scripts)
- `brief_mode === true` → early exit path in handler bypasses normal context building
- `CampaignBriefResult` type exported from `decoder.ts`; `decodeMessage` returns `DecoderResult | CampaignBriefResult | null`
- `DecodeInput` gets `briefMode?: boolean`
- `DecodeEntry` gets `entryType?: 'standard' | 'campaign_brief'`
- `ChatMsg` union gets `campaign_brief` type; `historyToChatMsgs` routes by `entryType`
- `CampaignBriefModal`: full-screen modal, 7 guided fields, builds structured brief string
- `CampaignBriefBubble`: target profile card, current position, immediate move, copyable first message, collapsible roadmap phases (current auto-expanded)
- `RoadmapPhaseCard`: tap to expand/collapse; directives, copyable scripts, signals (green), avoid (red)
- `handleSubmitBrief`: fires decode with `briefMode: true`, saves with `entryType: 'campaign_brief'`
- `// BRIEF` button added to header alongside `// DOSSIER`

---

### 2026-03-21 — Editable Messages + Copyable Scripts + // Notation System

- `updateDecodeEntry()` added — JSONB filter by entry id
- Long-press user bubble → edit modal → re-decode → in-place update; `// edited` label
- `ScriptCard` component — copy button per script, `// copied` flash 1.5s
- All `[ LABEL ]` → `// LABEL` throughout app + edge function
- Action buttons: plain lowercase (copy, cancel, re-decode)

---

### 2026-03-21 — Gemini fix + Dossier Panel

- Diagnosed cachedContent 1M token overflow on Gemini 2.5 Flash — removed from all edge functions
- RAG-only book knowledge: embedding → search_book_passages → passage injection
- New canonical JSON schema: `intent` + `visible_arsenal` + `hidden_intel`
- `normalizeResponse()` with 3 legacy schema fallbacks
- DARKO persona: dynamic response types, handler_note, autonomous advisor behavior
- Dossier panel: sliding drawer, all profile sections, auto-regenerates if stale
- `generate-profile` expanded to 16 fields
- Voice recording auto-stop at 60s, countdown timer
