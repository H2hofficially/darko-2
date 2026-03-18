# DARKO — Build Progress

## What Is This
A React Native (Expo) app that decodes text messages and situations through cold Machiavellian psychological analysis. Powered by Gemini 2.5 Flash with a 5-book context cache, backed by Supabase for auth, storage, and edge function routing.

---

## Stack
| Layer | Technology |
|---|---|
| Mobile framework | Expo SDK 54 / React Native 0.81.5 |
| Routing | expo-router ~6.0.23 (file-based) |
| AI model | Gemini 2.5 Flash |
| Backend / Auth / DB | Supabase (Edge Functions + Auth + Postgres) |
| Image input | expo-image-picker |
| Voice input | expo-audio |
| Language | TypeScript |

---

## File Map

### App screens — `app/`
| File | Purpose |
|---|---|
| `app/_layout.tsx` | Stack navigator root. Registers all 4 screens with `headerShown: false`. Required for expo-router navigation to work. |
| `app/auth.tsx` | Login / signup screen. Email + password. Shows "check your email" pending state after signup if confirmation is required. Redirects to `/` on session. |
| `app/auth/callback.tsx` | Deep link handler for email confirmation. Exchanges `code` param for session via `supabase.auth.exchangeCodeForSession`, then redirects to `/`. |
| `app/index.tsx` | Target profiles home screen. Auth-gated — redirects to `/auth` if no session. Lists all targets with decode counts. Create targets (name + leverage + objective). Delete targets. Sign out. |
| `app/decode.tsx` | Main decode screen per target. Full conversation history (FlatList, memoized), image picker, voice recorder, single-line cycling loader, target profile card with MBTI section, decode button routed through Supabase Edge Function. Mode is auto-detected server-side — no manual toggle. |

### Services — `services/`
| File | Purpose |
|---|---|
| `services/decoder.ts` | `decodeMessage()` — invokes `decode-intel` edge function with full history, dossier context, and relationship brief. No `mode` param — detection is server-side. `transcribeAudio()` — invokes `transcribe-audio` edge function with base64 + mimeType. `generateTargetProfile()` — invokes `generate-profile` edge function. No Gemini API key in frontend. |
| `services/storage.ts` | All Supabase CRUD. Manages `Target`, `DecodeEntry`, `TargetProfile`, and `MbtiProfile` types. `DecodeEntry` stores `auto_detected_mode?: string` (replaces `mode`). Targets in `targets` table, history in `intelligence_logs`, behavioral profile in `targets.behavioral_profile` JSONB. |

### Edge Functions — `supabase/functions/`
| Function | Purpose |
|---|---|
| `decode-intel/` | Main decode engine. Auth + tier check. Rate limiting (20/day free, unlimited pro). Blocked-words preflight. **Auto-detects mode** from content (`isLeak` regex → strategic_advice, `isDebrief` length/keyword → full_debrief, else → tactical). Injects dossier context + relationship brief + full history block into prompt. 3 system prompts: `PRO_SYSTEM_PROMPT`, `FREE_SYSTEM_PROMPT`, `FULL_DEBRIEF_SYSTEM_PROMPT`. Returns `DecoderResult` JSON including `auto_detected_mode` and optional `debrief` object. |
| `generate-profile/` | Behavioral profile generation. Reads cache name from `app_config`. Returns profile JSON including `mbti_profile` and `relationship_brief`. Falls back gracefully if Gemini cache is expired. |
| `transcribe-audio/` | Audio → text. Receives `{ audioBase64, mimeType }` from app, sends to Gemini as inline audio data with correct mimeType, returns `{ text }`. |
| `refresh-cache/` | **STALE — needs update.** Creates a Gemini context cache and writes the name to `app_config`. Currently hardcodes only 2 book URIs (art_of_seduction, totem_taboo) with file refs that have expired. Not yet wired to pg_cron. See outstanding items. |

### Scripts — `scripts/`
| File | Purpose |
|---|---|
| `scripts/upload-books.js` | Uploads all 5 PDFs from `/knowledge` to Gemini File API. Auto-maps filenames to clean keys. Saves fresh URIs to `file-refs.json`. Run whenever files expire (~48h TTL). |
| `scripts/create-cache.js` | Creates a Gemini context cache with all 5 books + system prompt. Writes cache name to Supabase `app_config` (for edge functions) and `knowledge/cache-ref.json` (local mirror). Run after `upload-books.js`. |

### Schema — `supabase/`
| File | Purpose |
|---|---|
| `supabase/schema.sql` | Canonical V2 schema. Tables: `profiles`, `targets`, `intelligence_logs`, `app_config`. RLS on first three; `app_config` is service-role only. |
| `supabase/migrations/001_v2_schema.sql` | Applied. Added `tier`, `leverage`, `objective`, `behavioral_profile` columns and `app_config` table. |

### Knowledge — `knowledge/`
| File | Purpose |
|---|---|
| `knowledge/file-refs.json` | Fresh Gemini File API URIs for all 5 PDFs. Last updated 2026-03-16. Expires ~48h — re-run `upload-books.js` to refresh. |
| `knowledge/cache-ref.json` | Local mirror of active cache ref. Authoritative value is in Supabase `app_config` table (`gemini_cache_name` key). |
| `*.pdf` (5 books) | 48 Laws of Power, Art of Seduction, Laws of Human Nature, The Evolution of Desire, Totem and Taboo. |

### Lib — `lib/`
| File | Purpose |
|---|---|
| `lib/supabase.ts` | Supabase client. URL + anon key (public keys, safe to commit). |

---

## Supabase Project
- **URL:** `https://adyebdcyqczhkluqgwvv.supabase.co`
- **Schema:** fully applied (V2) — profiles, targets, intelligence_logs, app_config
- **Edge Functions deployed:** decode-intel, generate-profile, transcribe-audio, refresh-cache (all `--no-verify-jwt`)
- **Secrets set:** `GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- **Active cache name:** stored in `app_config` table under key `gemini_cache_name`

---

## AI / Gemini Configuration
- **Model:** `gemini-2.5-flash`
- **Context cache:** 486,051 tokens — all 5 books + system prompt
- **Books in cache:** 48 Laws of Power, Art of Seduction, Laws of Human Nature, Evolution of Desire, Totem and Taboo
- **Cache TTL:** 24 hours — refresh by running `node scripts/upload-books.js && node scripts/create-cache.js`
- **File API TTL:** ~48 hours — PDFs must be re-uploaded before creating a new cache
- **Transcription:** `transcribe-audio` edge function — base64 audio with explicit mimeType → plain text, no cache used
- **Profile generation:** `generate-profile` edge function — uses book cache, falls back gracefully without it

### System prompts
- **`PRO_SYSTEM_PROMPT`** — mandatory citation of: Law N + Name + (Tactical Synonym), seduction archetype + sub-tactic, Freudian defense mechanisms, attachment style, behavioral arc across history if present
- **`FREE_SYSTEM_PROMPT`** — basic pattern analysis, no framework citation requirements
- **`FULL_DEBRIEF_SYSTEM_PROMPT`** — same citation mandates as PRO + 5-section debrief JSON schema

### Law citation format (PRO + FULL DEBRIEF)
All Law citations formatted as: `Law N: Name (Tactical Synonym)` — synonym is a 2-5 word cold reframe of the Law's core mechanism, generated dynamically (e.g. Law 16 (Weaponize Absence), Law 3 (Mask Your Agenda), Law 6 (Force Attention)).

### Auto intent detection (server-side, `decode-intel`)
```ts
const isLeak = /(thinks|feels|said|claims|is acting|sensitive|is a|she is|he is|they are|told me|I want|I did|I said|should I|what should|I feel|I think|she thinks|he thinks)/i.test(content);
const isDebrief = content.length > 300 || /analyse|analyze|full debrief|breakdown/i.test(content);

let detectedMode = 'tactical';
if (isDebrief)       detectedMode = 'full_debrief';
else if (isLeak)     detectedMode = 'strategic_advice';
```
- Result is returned as `auto_detected_mode` in the response and displayed on each history card as `// AUTO-DETECTED: TACTICAL / STRATEGIC ADVICE / FULL DEBRIEF`

---

## Design System (Zinc Palette — as of 2026-03-17)
| Token | Value |
|---|---|
| Background `BG` | `#09090B` |
| Card background `CARD_BG` | `#18181B` |
| Border `BORDER` | `#27272A` |
| Text primary `TEXT_PRIMARY` | `#E4E4E7` |
| Text dim `TEXT_DIM` | `#A1A1AA` |
| Accent | `#CCFF00` (fluorescent yellow-green) |
| Error red | `#FF4444` |
| Recording red | `#FF3333` |
| MBTI / vulnerability amber | `#CCAA00` |
| Shadow function amber | `#AA8800` |
| Errors made red | `#CC4422` |
| Profile card background | `#0D1A00` |
| Font MONO | `Courier New` (iOS) / `monospace` (Android) |
| Font SANS | `System` (iOS) / `sans-serif` (Android) |

### Font isolation rules
- **MONO:** loading states, section headers (`// OPTION 01`, `// THREAT LEVEL`), button labels, metadata, timestamps, tags
- **SANS:** `the_psyche` text, option script text, directive text, profile summaries, any paragraph longer than ~10 words

### ACCENT usage — restricted to:
- DECODE button background
- Threat level score number
- Active mode toggle indicator (mode toggles removed — kept for future use)
- `the_psyche` block left border
- MBTI type value

---

## Features Built

### Authentication
- [x] Email / password login (`[ ACCESS SYSTEM ]`)
- [x] Email / password signup (`[ INITIALIZE PROFILE ]`)
- [x] Session persistence via Supabase Auth
- [x] Auth gate on home screen — redirects unauthenticated users to `/auth`
- [x] Email confirmation pending state — shows "check your email" after signup before session exists
- [x] Deep link callback handler (`app/auth/callback.tsx`) — exchanges code for session, handles error params
- [x] Sign out button

### Target Profiles
- [x] Create targets with name, leverage, and objective fields (3-field modal)
- [x] Delete targets (cascades to `intelligence_logs` via FK `ON DELETE CASCADE`)
- [x] Decode count shown per target (fast `COUNT` query, not full history load)
- [x] Leverage + objective shown on target card (dim, truncated)
- [x] All target data persisted to Supabase `targets` table with RLS
- [x] After target creation, navigates directly to the decode screen

### Decode Engine
- [x] Text input → decode via `decode-intel` edge function
- [x] Screenshot upload (expo-image-picker) → base64 → sent to Gemini as image part
- [x] Voice recording (expo-audio) → 500ms delay → `fetch(uri)` → blob → FileReader base64 → `transcribe-audio` edge function → populates text input
- [x] **Full conversation history** — every prior decode for the target sent as context (no cap)
- [x] **Dossier context** — leverage + objective injected silently as `[CLASSIFIED OPERATIVE CONTEXT]` block — never appears in output
- [x] **Relationship Brief** — 2-paragraph running clinical assessment prepended to every pro-tier decode as `[RUNNING RELATIONSHIP BRIEF]`
- [x] **Auto-detected mode** — no manual toggle; server classifies input as TACTICAL / STRATEGIC ADVICE / FULL DEBRIEF
- [x] Rate limiting: 20 decodes/day free tier (server-side count against `intelligence_logs`)
- [x] Blocked-words preflight on edge function (stalk, hack, blackmail, illegal → 400)

### Decode Modes (auto-detected)
- [x] **TACTICAL** — two cold reply scripts (≤30 words), concise psyche, 3 directives. Triggered by short received messages with no first-person or analytical language.
- [x] **STRATEGIC ADVICE** — same scripts reframed as first-person strategic moves, expanded psyche. Triggered by `isLeak` regex (first-person phrases, psychology observations, situation descriptions).
- [x] **FULL DEBRIEF** — 5-section structured report. Triggered by messages >300 chars or explicit keywords (analyse, analyze, full debrief, breakdown).

### Results UI
- [x] `// AUTO-DETECTED: {MODE}` label above threat level on every history card
- [x] Threat level score with archetype + Law label
- [x] TACTICAL/STRATEGIC ADVICE: two response cards `// OPTION 01` / `// OPTION 02` or `// STRATEGIC DIRECTIVE 01/02`
- [x] FULL DEBRIEF: five section blocks — errors in red, next move in accent
- [x] `[ VIEW PSYCHOLOGY ]` collapsible panel with `the_psyche` (SANS, accent left border) + 3 directives (SANS)
- [x] COPY button on every history card → `Share.share()` with full formatted text
- [x] Single-line cycling loader during decode — cycles every 800ms through 4 messages
- [x] Error state in red monospace

### Conversation History
- [x] All decodes persisted to Supabase `intelligence_logs` as JSONB (full `DecodeEntry` object including result, `auto_detected_mode`, timestamp)
- [x] Scrollable FlatList history with profile card pinned as `ListHeaderComponent`
- [x] `HistoryCard` in `React.memo` with custom comparator on `entry.id` — existing cards skip re-renders
- [x] `renderItem` in `useCallback([], [])` — stable reference across renders
- [x] FlatList: `removeClippedSubviews`, `maxToRenderPerBatch=5`, `windowSize=7`, `initialNumToRender=8`

### Target Profile Card
- [x] Auto-generated after every 3rd decode via `generate-profile` edge function
- [x] Persisted in `targets.behavioral_profile` JSONB — cross-device sync
- [x] Updating state shows typing indicator inside the card
- [x] Collapsible dark-green card pinned at top of decode screen
- [x] Core fields: dominant archetype, attachment style, manipulation patterns, vulnerability score, behavioral summary (SANS font)
- [x] **Relationship Brief** — 2-paragraph clinical assessment stored in profile JSONB, injected into next decode
- [x] **MBTI section** — type (e.g. INTJ), dominant cognitive function, shadow function, seduction vulnerability. Only renders when present.
- [x] Layout: `overflow: 'hidden'`, `maxWidth: '100%'`, fixed-width key column (100px), flex value column

---

## What Needs To Be Done Next

### Critical
- [ ] **Fix `refresh-cache` edge function** — hardcodes expired file URIs for only 2 books. Needs to read current file refs from `app_config` and include all 5 books. Until fixed, the only working cache refresh path is `node scripts/upload-books.js && node scripts/create-cache.js` run locally.
- [ ] **pg_cron for automatic daily cache refresh** — requires enabling `pg_cron` and `pg_net` extensions in Supabase Dashboard, then scheduling a daily HTTP call to `refresh-cache`. Blocked on the fix above.
- [ ] **Register `darko://` in Supabase Auth** — add `darko://auth/callback` to allowed redirect URLs in Supabase Dashboard → Authentication → URL Configuration.

### Features
- [ ] **Push notifications** — alert when a decode's threat level crosses a threshold.
- [ ] **History search** — search/filter across all decodes for a target by keyword.
- [ ] **Target notes** — free-form notes field per target. Requires `notes TEXT` column on `targets` table.
- [ ] **Onboarding** — first-launch screen explaining DARKO's modes and profile system.

### Infrastructure
- [ ] **EAS build** — configure `eas.json` for iOS/Android distribution.
- [ ] **OTA updates** — configure `eas update` channel.
- [ ] **Strip debug logs** — remove all `[DARKO]` console.logs before any production build.

---

## How To Run

```bash
# Start dev server
cd ~/Desktop/darko
npx expo start

# Refresh Gemini files + cache (run when cache expires — roughly daily)
node scripts/upload-books.js     # re-upload all 5 PDFs to Gemini File API (~48h expiry)
node scripts/create-cache.js     # create new cache with all 5 books, writes name to Supabase app_config

# Deploy edge functions
SUPABASE_ACCESS_TOKEN=<token> ~/bin/supabase functions deploy decode-intel --project-ref adyebdcyqczhkluqgwvv --use-api --no-verify-jwt
SUPABASE_ACCESS_TOKEN=<token> ~/bin/supabase functions deploy generate-profile --project-ref adyebdcyqczhkluqgwvv --use-api --no-verify-jwt
SUPABASE_ACCESS_TOKEN=<token> ~/bin/supabase functions deploy transcribe-audio --project-ref adyebdcyqczhkluqgwvv --use-api --no-verify-jwt
SUPABASE_ACCESS_TOKEN=<token> ~/bin/supabase functions deploy refresh-cache --project-ref adyebdcyqczhkluqgwvv --use-api --no-verify-jwt

# Upgrade a user to pro tier (run in Supabase SQL editor)
UPDATE profiles SET tier = 'pro' WHERE id = '<user_id>';
```
