# DARKO — Build Progress
**Last updated:** 2026-03-18 | **Git:** `master (root-commit) 5702483`

---

## What Is This
A React Native (Expo) app that decodes text messages and social situations through cold Machiavellian psychological analysis. Gemini 2.5 Flash handles deep psychological analysis and profiling. Mistral Large handles tactical script generation. Supabase provides auth, database, and edge function routing.

---

## Stack

| Layer | Technology | Version |
|---|---|---|
| Mobile framework | Expo | ^54.0.33 |
| React Native | react-native | 0.81.5 |
| React | react | 19.1.0 |
| Routing | expo-router | ~6.0.23 |
| Language | TypeScript | ~5.9.2 |
| Auth + DB + Edge | Supabase | @supabase/supabase-js ^2.99.1 |
| AI — analysis | Gemini 2.5 Flash | via REST |
| AI — scripts | Mistral Large | via REST |
| Image input | expo-image-picker | ~17.0.10 |
| Voice input | expo-audio | ~1.1.1 |
| Storage | AsyncStorage | 2.2.0 |
| File system | expo-file-system | ~19.0.21 (legacy API not used — using fetch/blob) |

---

## File Map

### App screens — `app/`

| File | Purpose |
|---|---|
| `app/_layout.tsx` | Stack navigator root. Registers: index, onboarding, auth, auth/callback, decode. `headerShown: false` everywhere. Background `#09090B`. |
| `app/onboarding.tsx` | 3-screen swipeable onboarding (FlatList + pagingEnabled). Scan-line animation sweeps on each screen change. Dot indicators (active: ACCENT pill, inactive: BORDER). Screen 3 has INITIALIZE SYSTEM button — writes `darko_onboarded=true` to AsyncStorage and navigates to `/auth`. Shown only on first launch. |
| `app/auth.tsx` | Login + signup screen. Sets `darko_onboarded=true` on both successful login and signup (belt-and-suspenders for reinstall users). Email confirmation pending state. Redirects to `/` on session. |
| `app/auth/callback.tsx` | Deep link handler for email confirmation. Exchanges `code` param for session via `supabase.auth.exchangeCodeForSession`, redirects to `/`. |
| `app/index.tsx` | Target profiles home screen. Gate order: AsyncStorage `darko_onboarded` check first → if missing, redirect to `/onboarding`; if present, check Supabase session → if no session, redirect to `/auth`; else render. Lists targets with decode counts, leverage/objective preview. Create/delete targets. Sign out. |
| `app/decode.tsx` | Main decode screen per target. FlatList history (memoized HistoryCard, React.memo + useCallback). Image picker, voice recorder (fetch/blob/FileReader pipeline), single-line cycling loader, target profile card (collapsible, MBTI section), decode button. Mode is auto-detected server-side — no manual toggle. `// AUTO-DETECTED: {MODE}` label above threat level on each history card. |

### Services — `services/`

| File | Purpose |
|---|---|
| `services/decoder.ts` | `decodeMessage()` — invokes `decode-intel` with history, dossier context, relationship brief. No mode param. Maps `auto_detected_mode` from response. `transcribeAudio(base64, mimeType)` — invokes `transcribe-audio`. `generateTargetProfile()` — invokes `generate-profile`. Full error logging on all paths. |
| `services/storage.ts` | All Supabase CRUD. Types: `Target`, `DecodeEntry` (with `auto_detected_mode?: string`), `TargetProfile`, `MbtiProfile`. Targets → `targets` table. History → `intelligence_logs`. Profile → `targets.behavioral_profile` JSONB. |

### Edge Functions — `supabase/functions/`

| Function | Status | Purpose |
|---|---|---|
| `decode-intel/` | ✅ Live | Main decode engine. Auth + tier check. Rate limit (20/day free). Blocked-words preflight. Auto-detects mode from content (`isLeak` regex → strategic_advice; length>300 or debrief keywords → full_debrief; else → tactical). **Tactical:** fires Mistral (scripts) + Gemini (analysis) in parallel; merges results; falls back to Gemini scripts if Mistral fails. **Strategic/Debrief:** Gemini only. Returns `auto_detected_mode` in every response. |
| `generate-profile/` | ✅ Live | Generates MBTI + behavioral profile after every 3 decodes. Reads Gemini cache name from `app_config`. Falls back without cache if expired. Returns full profile JSON including `mbti_profile` and `relationship_brief`. |
| `transcribe-audio/` | ✅ Live | Receives `{ audioBase64, mimeType }`. Sends to Gemini as inline audio. Returns `{ text }`. Logs base64 length, mimeType, Gemini parts, extracted text. |
| `refresh-cache/` | ⚠️ STALE | Hardcodes only 2 of 5 book URIs (art_of_seduction + totem_taboo). File refs have expired. Not wired to pg_cron. Use local scripts instead. |

### Scripts — `scripts/`

| File | Purpose |
|---|---|
| `scripts/upload-books.js` | Uploads all 5 PDFs from `/knowledge` to Gemini File API. Saves URIs to `knowledge/file-refs.json`. Run when files expire (~48h TTL). |
| `scripts/create-cache.js` | Creates Gemini context cache with all 5 books + DARKO system prompt. Writes cache name to Supabase `app_config` table and `knowledge/cache-ref.json`. TTL: 24h. Run after `upload-books.js`. |

### Knowledge — `knowledge/`

| File | Purpose |
|---|---|
| `48 Laws of Power — Robert Greene.pdf` | Robert Greene — primary framework for Law citations |
| `The Art of Seduction — Robert Greene.pdf` | Robert Greene — seduction archetypes + phases |
| `Laws of Human Nature — Robert Greene.pdf` | Robert Greene — human drives, shadow, status |
| `The_Evolution_of_Desire.pdf` | David Buss — evolutionary psychology, mate retention |
| `Totem and Taboo — Sigmund Freud.pdf` | Freud — defense mechanisms, drives, psychoanalysis |
| `file-refs.json` | Gemini File API URIs for all 5 PDFs. Last uploaded 2026-03-16. Expires ~48h — re-run `upload-books.js` to refresh. |
| `cache-ref.json` | Local mirror of active Gemini cache. **Cache expired 2026-03-17T13:24:48Z** — needs refresh. Authoritative value is in Supabase `app_config`. |

### Schema — `supabase/`

| File | Purpose |
|---|---|
| `supabase/schema.sql` | Canonical schema. Tables: `profiles` (tier, directive_path, is_locked), `targets` (target_alias, leverage, objective, behavioral_profile JSONB), `intelligence_logs` (target_id FK cascade, message_content JSONB), `app_config` (key/value for gemini_cache_name). RLS on profiles/targets/logs. |
| `supabase/migrations/001_v2_schema.sql` | Applied migration. Added tier, leverage, objective, behavioral_profile, app_config. pg_cron setup instructions included. |

### Lib — `lib/`

| File | Purpose |
|---|---|
| `lib/supabase.ts` | Supabase client init. URL + anon key (public, safe to commit). Exports `supabase` and `SUPABASE_ANON_KEY`. |

---

## Supabase Project

- **Project ref:** `adyebdcyqczhkluqgwvv`
- **URL:** `https://adyebdcyqczhkluqgwvv.supabase.co`
- **Schema applied:** V2 — profiles, targets, intelligence_logs, app_config
- **Edge functions deployed:** decode-intel, generate-profile, transcribe-audio, refresh-cache (all `--no-verify-jwt`)
- **Secrets set:** `GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `MISTRAL_API_KEY`
- **app_config:** `gemini_cache_name` key holds the active Gemini cache name (expired, needs refresh)

---

## Gemini Configuration

- **Model:** `gemini-2.5-flash`
- **Context cache token count:** 486,051 tokens
- **Cache TTL:** 24 hours (`86400s`)
- **Last cache created:** 2026-03-16T13:24:48Z — **EXPIRED, needs refresh**
- **Cache name (last known):** `cachedContents/w0jdlus415b3s3cjypur5yumlq5leg2c3h7ta7t7`
- **File API TTL:** ~48 hours (re-upload required before creating new cache)

**Books in cache (all 5):**
| Key | Book |
|---|---|
| `48_laws` | The 48 Laws of Power — Robert Greene |
| `art_of_seduction` | The Art of Seduction — Robert Greene |
| `laws_of_human_nature` | The Laws of Human Nature — Robert Greene |
| `The_Evolution_of_Desire` | The Evolution of Desire — David Buss |
| `totem_taboo` | Totem and Taboo — Sigmund Freud |

**Usage in edge functions:**
- `generate-profile` — uses cache if available, graceful fallback without it
- `decode-intel` — does NOT use cache (sends raw prompts directly; too dynamic for cached context)

---

## Mistral Configuration

- **Model:** `mistral-large-latest`
- **Used for:** Tactical script generation only (`detectedMode === 'tactical'`)
- **Endpoint:** `https://api.mistral.ai/v1/chat/completions`
- **Secret:** `MISTRAL_API_KEY` (set in Supabase secrets)
- **Runs in parallel** with Gemini analysis call — no added latency
- **Output:** `{ option_1_script, option_2_script }` — lowercase, ≤20 words, human-sounding, power-shifting
- **Fallback:** If Mistral fails (any reason), Gemini's `visible_arsenal` scripts are used instead
- **strategic_advice + full_debrief:** Gemini only — Mistral not called

---

## System Prompts (decode-intel)

### PRO_SYSTEM_PROMPT (tactical + strategic_advice, pro tier)
Mandatory citations per response:
1. Law N: Name (Tactical Synonym) — dynamically derived, not from memory
2. Seduction archetype + specific sub-tactic by exact name
3. Freudian defense mechanism(s) by clinical name
4. Attachment pattern (anxious-preoccupied / dismissive-avoidant / fearful-avoidant / secure)
5. Behavioral pattern arc if history present

Mode suffixes appended:
- Tactical: "prioritize scripts, 1-sentence psyche citing primary Law"
- Strategic advice: "prioritize deep psyche (3-4 sentences), scripts reframed as first-person moves"

### FREE_SYSTEM_PROMPT
Basic pattern analysis, no framework citation requirements. Shorter output.

### FULL_DEBRIEF_SYSTEM_PROMPT
All PRO citation rules + 5-section debrief schema: power_dynamic_audit, psychological_profile, errors_made (each citing violated Law), current_phase (exact Art of Seduction phase name), next_move.

---

## Auto Intent Detection (decode-intel, server-side)

```ts
const isLeak = /(thinks|feels|said|claims|is acting|sensitive|is a|she is|he is|they are|told me|I want|I did|I said|should I|what should|I feel|I think|she thinks|he thinks)/i.test(content);
const isDebrief = content.length > 300 || /analyse|analyze|full debrief|breakdown/i.test(content);

let detectedMode = 'tactical';
if (isDebrief)    detectedMode = 'full_debrief';
else if (isLeak)  detectedMode = 'strategic_advice';
```

- **TACTICAL** → short received message, no first-person or analytical language → 2 reply scripts (Mistral) + analysis (Gemini)
- **STRATEGIC ADVICE** → first-person framing, psychology observations, situation descriptions → strategic behavioral directives (Gemini only)
- **FULL DEBRIEF** → >300 chars or explicit debrief keywords → 5-section structured report (Gemini only)

Result returned as `auto_detected_mode` string (e.g. `"TACTICAL"`, `"STRATEGIC ADVICE"`, `"FULL DEBRIEF"`), displayed on each history card.

---

## Design System (Zinc Palette)

| Token | Value | Usage |
|---|---|---|
| `BG` | `#09090B` | Screen background, psyche panel background |
| `CARD_BG` | `#18181B` | Cards, input wrapper, icon buttons |
| `BORDER` | `#27272A` | All borders, dividers, inactive dots |
| `TEXT_PRIMARY` | `#E4E4E7` | Body text, target names, input text |
| `TEXT_DIM` | `#A1A1AA` | Labels, metadata, dim text, inactive buttons |
| `ACCENT` | `#CCFF00` | DECODE button, threat level score, active mode indicator, psyche left border |
| `ERROR_RED` | `#FF4444` | Error messages |
| `RECORD_RED` | `#FF3333` | Recording indicator, mic button border |
| `MBTI amber` | `#CCAA00` | Seduction vulnerability text |
| `Shadow amber` | `#AA8800` | MBTI shadow function |
| `Errors red` | `#CC4422` | Errors made text in debrief |
| `Profile card` | `#0D1A00` / `#2A3A00` | Target profile card background / border |

### Font Variables
```ts
const MONO = Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' });
const SANS = Platform.select({ ios: 'System', android: 'sans-serif', default: 'sans-serif' });
```

### Font Isolation Rules
- **MONO:** Section headers (`// OPTION 01`, `// STRATEGIC ANALYSIS`, `// AUTO-DETECTED:`), button labels, metadata, timestamps, tags, input text, loading state
- **SANS:** `the_psyche` text, option scripts, directive items, profile summaries, debrief paragraphs — any content paragraph >~10 words

### ACCENT — Restricted to:
- DECODE button background
- Threat level score number
- Active mode toggle indicator (border + text)
- `the_psyche` block left border (2px)
- MBTI type value

---

## Features Built

### Onboarding
- [x] 3-screen swipeable onboarding (`app/onboarding.tsx`)
- [x] FlatList with `pagingEnabled`, `onViewableItemsChanged` (stable ref via useRef)
- [x] Scan-line animation — 1px ACCENT line sweeps full screen height, opacity 0.15, 1.5s, re-triggers on each screen change
- [x] Active dot expands to pill (width 20, ACCENT); inactive dot is 6×6 BORDER
- [x] Screen 3 only: INITIALIZE SYSTEM button (ACCENT bg, MONO label)
- [x] Tapping INITIALIZE SYSTEM: sets `darko_onboarded=true` in AsyncStorage → navigates to `/auth`
- [x] No skip button — user must swipe through all 3

### Authentication
- [x] Email + password login (`[ ACCESS SYSTEM ]`)
- [x] Email + password signup (`[ INITIALIZE PROFILE ]`)
- [x] Session persistence via Supabase Auth
- [x] Auth gate in index.tsx (after onboarding gate)
- [x] Onboarding gate in index.tsx (AsyncStorage `darko_onboarded` check, runs before auth)
- [x] `darko_onboarded=true` set on successful login AND signup in auth.tsx (covers reinstall case)
- [x] Email confirmation pending state
- [x] Deep link callback (`app/auth/callback.tsx`)
- [x] Sign out button

### Target Profiles
- [x] Create targets: name + leverage + objective (3-field modal)
- [x] Delete targets (cascades to intelligence_logs via FK ON DELETE CASCADE)
- [x] Decode count per target (COUNT query, not full history load)
- [x] Leverage + objective preview on card (dim, truncated)
- [x] After creation → navigates directly to decode screen
- [x] All data in Supabase `targets` table with RLS

### Decode Engine
- [x] Text input → `decode-intel` edge function
- [x] Screenshot upload (expo-image-picker) → base64 → Gemini vision part
- [x] Voice recording (expo-audio, HIGH_QUALITY) → 500ms delay → `fetch(uri)` → blob → FileReader base64 → `transcribe-audio` edge function → text populates input
- [x] Full conversation history — every prior decode sent as context (no cap)
- [x] Dossier context — leverage + objective injected as `[CLASSIFIED OPERATIVE CONTEXT]` block (never surfaced in output)
- [x] Relationship Brief — 2-paragraph clinical assessment prepended to every pro-tier decode
- [x] Auto intent detection — no manual mode toggle; server classifies on content
- [x] Rate limiting — 20 decodes/day free tier (server-side count against intelligence_logs)
- [x] Blocked-words preflight — stalk/hack/blackmail/illegal → 400
- [x] Mistral parallel execution for tactical scripts

### AI Analysis Output
- [x] `// AUTO-DETECTED: {MODE}` label above threat level on every history card
- [x] Threat level: `score/10 — [archetype + Law citation]`
- [x] TACTICAL/STRATEGIC ADVICE: script cards `// OPTION 01` / `// OPTION 02` or `// STRATEGIC DIRECTIVE 01/02` (SANS font, 15px)
- [x] FULL DEBRIEF: 5-section structured report — power dynamic audit, psychological profile, errors made (red), current phase (Art of Seduction named phase), next move
- [x] `[ VIEW PSYCHOLOGY ]` collapsible panel — `the_psyche` (SANS, BG bg, 2px ACCENT left border), 3 directives (SANS, TEXT_DIM)
- [x] Copy/share button on every history card → `Share.share()` with full formatted text for the mode

### Target Profile Card
- [x] Auto-generated after every 3rd decode via `generate-profile`
- [x] Persisted in `targets.behavioral_profile` JSONB (cross-device sync)
- [x] Collapsible dark-green card pinned as FlatList ListHeaderComponent
- [x] Core fields: dominant archetype, attachment style, manipulation patterns, vulnerability score, behavioral summary (SANS)
- [x] Relationship Brief stored in profile JSONB, injected into next decode (pro tier)
- [x] MBTI section — type, dominant function, shadow function (stress behavior), seduction vulnerability. Renders only when present.
- [x] Typing indicator while updating

### Law Citation System
- [x] Format enforced in all pro/debrief prompts: `Law N: Name (Tactical Synonym)`
- [x] Tactical synonym is a 2-5 word cold reframe derived dynamically from the Law's mechanism (not from memory)
- [x] Examples: Law 16 (Weaponize Absence), Law 3 (Mask Your Agenda), Law 6 (Force Attention), Law 17 (Stay Unpredictable)

### UI / UX
- [x] Zinc palette (`#09090B` background throughout)
- [x] Hybrid typography — MONO for labels/headers/metadata, SANS for content paragraphs
- [x] Single-line cycling loader — 4 messages, 800ms interval, replaces terminal multi-line animation
- [x] `// STRATEGIC ANALYSIS` header on every history card
- [x] FlatList optimizations: `removeClippedSubviews`, `maxToRenderPerBatch=5`, `windowSize=7`, `initialNumToRender=8`
- [x] `HistoryCard` in `React.memo` with custom comparator on `entry.id`
- [x] `renderItem` in `useCallback([], [])` — stable reference

---

## What Needs To Be Done Next

### AI / Features
- [ ] **Hindi/Hinglish routing (Sarvam AI)** — detect Hinglish input, route to Sarvam AI for transcription + decode, return response in Hinglish. Requires Sarvam API key and new routing logic in decode-intel.
- [ ] **Voice output (ElevenLabs)** — read back decoded results in a cold, tactical voice. Requires ElevenLabs API key, edge function, and audio playback in app.
- [ ] **Conversation import** — paste or share a full WhatsApp/iMessage export into the app for bulk decode. Requires text parsing + chunked decode pipeline.
- [ ] **Dark psychology PDF** — add a 6th book to the Gemini context cache (dark psychology / coercive control text). Requires re-upload + cache rebuild.

### Monetisation
- [ ] **Paywall / RevenueCat** — free tier is rate-limited (20/day). Pro tier is unlimited. Wire RevenueCat SDK to flip `profiles.tier = 'pro'` in Supabase on purchase. Requires RevenueCat account, iOS/Android product IDs, and a webhook or edge function to verify receipts.
- [ ] **Share / Export feature** — export a full target dossier (profile + all history) as a formatted PDF or text file. Share via the system share sheet.

### Infrastructure
- [ ] **Fix `refresh-cache` edge function** — currently hardcodes only 2 of 5 book URIs and uses expired file refs. Needs to read fresh URIs from `app_config` (or accept them as request body) and include all 5 books. Until fixed, the only working cache refresh path is `node scripts/upload-books.js && node scripts/create-cache.js` run locally.
- [ ] **pg_cron for automatic daily cache refresh** — enable `pg_cron` + `pg_net` extensions in Supabase Dashboard, schedule daily HTTP call to `refresh-cache`. Blocked on the fix above.
- [ ] **Register `darko://` deep link in Supabase Auth** — add `darko://auth/callback` to allowed redirect URLs in Supabase Dashboard → Authentication → URL Configuration. Required for email confirmation links to redirect back into the app.
- [ ] **EAS build** — configure `eas.json` for iOS/Android distribution. Requires EAS CLI, Apple Developer account, Google Play account.
- [ ] **OTA updates** — configure `eas update` channel for hot updates without App Store review.
- [ ] **Push notifications** — alert when decode threat level crosses threshold. Requires `expo-notifications`, permission flow, notification trigger.

### Polish
- [ ] **Strip debug logs** — remove all `[DARKO]` `console.log` calls from `app/index.tsx`, `app/decode.tsx`, `services/storage.ts`, `services/decoder.ts` before any production build.
- [ ] **Mistral integration completion** — consider adding Mistral for strategic_advice mode too (not just tactical), or using it for directive generation.

---

## How To Run

```bash
# Start dev server
cd ~/Desktop/darko
npx expo start

# Refresh Gemini context cache (run when cache expires — roughly daily)
node scripts/upload-books.js     # re-upload all 5 PDFs to Gemini File API (~48h expiry)
node scripts/create-cache.js     # create new cache, writes name to Supabase app_config + knowledge/cache-ref.json

# Deploy edge functions
export TOKEN=sbp_0e73f0707d3e645b5af60d918e5dcbffbaf402b4
SUPABASE_ACCESS_TOKEN=$TOKEN ~/bin/supabase functions deploy decode-intel      --project-ref adyebdcyqczhkluqgwvv --use-api --no-verify-jwt
SUPABASE_ACCESS_TOKEN=$TOKEN ~/bin/supabase functions deploy generate-profile  --project-ref adyebdcyqczhkluqgwvv --use-api --no-verify-jwt
SUPABASE_ACCESS_TOKEN=$TOKEN ~/bin/supabase functions deploy transcribe-audio  --project-ref adyebdcyqczhkluqgwvv --use-api --no-verify-jwt
SUPABASE_ACCESS_TOKEN=$TOKEN ~/bin/supabase functions deploy refresh-cache     --project-ref adyebdcyqczhkluqgwvv --use-api --no-verify-jwt

# Set / update secrets
SUPABASE_ACCESS_TOKEN=$TOKEN ~/bin/supabase secrets set GEMINI_API_KEY=<key>             --project-ref adyebdcyqczhkluqgwvv
SUPABASE_ACCESS_TOKEN=$TOKEN ~/bin/supabase secrets set MISTRAL_API_KEY=<key>            --project-ref adyebdcyqczhkluqgwvv
SUPABASE_ACCESS_TOKEN=$TOKEN ~/bin/supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<key> --project-ref adyebdcyqczhkluqgwvv

# Upgrade a user to pro tier (Supabase SQL editor)
UPDATE profiles SET tier = 'pro' WHERE id = '<user_id>';

# Git
git add . && git commit -m "message"
```

---

## Git

- **Branch:** `master`
- **Commits:** 1 (root commit `5702483`)
- **Remote:** none configured
