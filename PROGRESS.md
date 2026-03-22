# DARKO — Build Progress
**Last updated:** 2026-03-21 | **Git:** `ee4c098` | **Repo:** github.com/H2hofficially/darko-2

---

## What Is This

A React Native (Expo) app that decodes text messages and social situations through cold Machiavellian psychological analysis. Gemini 2.5 Flash handles deep psychological analysis and profiling via inline system_instruction + RAG passage injection. Mistral Large handles tactical script generation in parallel. Supabase provides auth, database, and edge function routing.

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
| AI — scripts | Mistral Large (mistral-large-latest) | via REST |
| Image input | expo-image-picker | ~17.0.10 |
| Voice input | expo-audio | ~1.1.1 |
| Storage | AsyncStorage | 2.2.0 |
| File system | expo-file-system | ~19.0.21 (legacy API not used — fetch/blob only) |

---

## File Map

### App screens — `app/`

| File | Purpose |
|---|---|
| `app/_layout.tsx` | Stack navigator root. Registers: index, onboarding, auth, auth/callback, decode. `headerShown: false` everywhere. Background `#09090B`. |
| `app/onboarding.tsx` | 3-screen swipeable onboarding (FlatList + pagingEnabled). Scan-line animation (Animated.Value) sweeps top-to-bottom on each screen. Dot indicators (active: ACCENT `#CCFF00` pill, inactive: BORDER). Screen 3 has INITIALIZE SYSTEM button — writes `darko_onboarded=true` to AsyncStorage and navigates to `/auth`. Shown only on first launch. |
| `app/auth.tsx` | Login + signup screen. Sets `darko_onboarded=true` on both successful login and signup (belt-and-suspenders for reinstall users). Email confirmation pending state. Redirects to `/` on session. |
| `app/auth/callback.tsx` | Deep link handler for email confirmation. Exchanges `code` param for session via `supabase.auth.exchangeCodeForSession`, redirects to `/`. |
| `app/index.tsx` | Target profiles home screen. Gate order: AsyncStorage `darko_onboarded` check first → if missing, redirect to `/onboarding`; if present, check Supabase session → if no session, redirect to `/auth`; else render. Lists targets with decode counts and leverage/objective preview. Create/delete targets via modal. Sign out. |
| `app/decode.tsx` | Main decode screen per target. Chat-style FlatList (inverted, newest at bottom). Image picker, voice recorder with 60-second auto-stop + countdown timer (fetch/blob/FileReader pipeline, no expo-file-system). Auto-expanding multiline TextInput (minHeight 44, maxHeight 200). Mission phase bar + phase unlock overlay animation. DARKO response bubbles with mission_status, primary_response, scripts (tactical), handler_note, next_directive. Long-press to copy full response. Long-press user bubble to edit + re-decode. `// DOSSIER` button opens sliding intelligence panel (85% width, animated from right) showing full target psychological profile: Basic Intel, Psychological Profile, Strengths & Weaknesses, Manipulation Vectors, Relationship Arc, Handler Assessment. Dossier auto-regenerates if data is older than 1 hour or missing new fields. Script cards have individual `copy` buttons with `// copied` flash. |

### Services — `services/`

| File | Purpose |
|---|---|
| `services/decoder.ts` | `decodeMessage()` — invokes `decode-intel` with full history, dossier context, relationship brief. `transcribeAudio(base64, mimeType)` — invokes `transcribe-audio`. `generateTargetProfile(history, leverage?, objective?)` — invokes `generate-profile`, captures all 16 profile fields including new dossier fields. Full logging on all paths. |
| `services/storage.ts` | All Supabase CRUD. Types: `Target`, `DecodeEntry` (with `isEdited?`), `TargetProfile` (16 fields including `strengths`, `weaknesses`, `likes`, `dislikes`, `birthday`, `location`, `manipulation_vectors`, `power_dynamic`, `predicted_next_behavior`, `key_turning_points`, `mbti_profile`), `MbtiProfile`. Targets → `targets` table. History → `intelligence_logs`. Profile → `targets.behavioral_profile` JSONB. `updateDecodeEntry()` uses JSONB filter `.filter('message_content->>id', 'eq', entry.id)` to update a specific log entry. |

### Edge Functions — `supabase/functions/`

| Function | Purpose |
|---|---|
| `decode-intel` | Main analysis engine. Reads `GEMINI_API_KEY` from Deno env. Auth + tier check via service role. Rate limit: 20 decodes/day free tier. Blocked words preflight. Inline `system_instruction` (PRO_ADVISOR_PROMPT or FREE_ADVISOR_PROMPT) — no cachedContent (causes token overflow on 2.5-flash). RAG: embeds query → `search_book_passages` RPC → injects up to 5 passages into user message. Canonical JSON schema: `intent` + `visible_arsenal` + `hidden_intel` + `next_directive` + `handler_note` + `phase_update`. `normalizeResponse()` handles canonical schema + 3 legacy schema fallbacks. Retry with minimal prompt if attempt 1 fails. |
| `generate-profile` | Generates full psychological dossier from decode history + leverage + objective. Inline `system_instruction` only (no cachedContent). Returns 16 fields: `dominant_archetype`, `attachment_style`, `manipulation_patterns`, `vulnerability_score`, `summary`, `mbti_profile`, `relationship_brief`, `strengths`, `weaknesses`, `likes`, `dislikes`, `birthday`, `location`, `manipulation_vectors`, `power_dynamic`, `predicted_next_behavior`, `key_turning_points`. |
| `transcribe-audio` | Transcribes audio using Gemini multimodal. Accepts base64 audio + mimeType from client. Returns `{ text }`. |
| `refresh-cache` | Creates new Gemini context cache from uploaded file refs. Writes new cache name to `app_config`. NOTE: cachedContent no longer used in decode-intel or generate-profile — cache kept for reference only. |

### Scripts — `scripts/`

| File | Purpose |
|---|---|
| `scripts/upload-books.js` | Uploads all PDFs in `knowledge/` to Gemini File API. Reads `GEMINI_API_KEY` from env. Writes URIs to `knowledge/file-refs.json`. Run once when adding new books. |
| `scripts/create-cache.js` | Creates Gemini context cache from `knowledge/file-refs.json`. Reads `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` from env. Writes new cache name to Supabase `app_config` + local `knowledge/cache-ref.json`. Run daily via GitHub Actions. |
| `scripts/test-darko.js` | 6-scenario integration test suite. POSTs directly to `decode-intel` edge function. Tests: tactical, strategic, full debrief, psych leak, blocked words, psychological terminology. Prints PASS/FAIL + response time + preview. |

### Knowledge base — `knowledge/`

| File | Purpose |
|---|---|
| `knowledge/file-refs.json` | Gemini File API URIs for all 6 uploaded PDFs. Committed to repo — used by `create-cache.js` in GitHub Actions. |
| `knowledge/cache-ref.json` | Latest cache metadata: name, model, expiry, book list. Updated every time `create-cache.js` runs. |
| `knowledge/*.pdf` | 6 source books (see Gemini Config below). |

### Config

| File | Purpose |
|---|---|
| `.env.local` | Local secrets — gitignored. Contains `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `GEMINI_API_KEY`, `MISTRAL_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`. |
| `.github/workflows/refresh-cache.yml` | GitHub Actions — daily cache refresh at 2am UTC + manual trigger. |
| `.github/README.md` | Documents the 3 GitHub secrets required for Actions to work. |
| `app.json` | Expo config. Scheme: `darko`. Image picker + audio plugins registered. |
| `supabase/schema.sql` | Canonical DB schema: `profiles`, `targets`, `intelligence_logs`, `app_config`. RLS policies. |

---

## Supabase

| Field | Value |
|---|---|
| Project ref | `adyebdcyqczhkluqgwvv` |
| URL | `https://adyebdcyqczhkluqgwvv.supabase.co` |
| Edge functions | decode-intel, generate-profile, transcribe-audio, refresh-cache |

### Secrets set on Supabase

| Secret | Status |
|---|---|
| `GEMINI_API_KEY` | ✓ Set (rotated 2026-03-18) |
| `MISTRAL_API_KEY` | ✓ Set |
| `SUPABASE_URL` | ✓ Set (auto-injected) |
| `SUPABASE_ANON_KEY` | ✓ Set (auto-injected) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✓ Set (auto-injected) |
| `SUPABASE_DB_URL` | ✓ Set (auto-injected) |

### Database tables

| Table | Purpose |
|---|---|
| `profiles` | One row per user. `tier` (free/pro), `directive_path`, `is_locked`. RLS: users own their row. |
| `targets` | Target profiles. `target_alias`, `leverage`, `objective`, `behavioral_profile` (JSONB). RLS: users own their targets. |
| `intelligence_logs` | Decode history. `message_content` (JSONB — full DecodeEntry). Cascade deletes with target. RLS: users own their logs. |
| `app_config` | Server-side key/value. Stores `gemini_cache_name`. No RLS — service role only. |

---

## GitHub

| Field | Value |
|---|---|
| Repo | github.com/H2hofficially/darko-2 |
| Branch | `main` |
| Visibility | Private |
| GitHub Actions | `refresh-cache.yml` — runs `node scripts/create-cache.js` daily at 2am UTC |
| Secrets configured | `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` |
| Manual trigger | Actions tab → Refresh Gemini Cache → Run workflow |

---

## Gemini Config

| Field | Value |
|---|---|
| Model | `models/gemini-2.5-flash` |
| Cache name | `cachedContents/6vzt93pckl2b5obe7dvemg5av6d4a16wtvep04d6` |
| Token count | **555,749** |
| Created | 2026-03-21T21:08Z |
| Expires | 2026-03-28T21:08Z |
| TTL | 604800s (7 days) |

**⚠️ IMPORTANT: cachedContent is NOT used in decode-intel or generate-profile.**
Gemini 2.5 Flash overflows the 1M token context limit when `cachedContent` (555K tokens) is included in a `generateContent` request — returns `400: The input token count exceeds the maximum number of tokens allowed`. Both edge functions use inline `system_instruction` instead. Book knowledge is delivered via RAG (vector search → passage injection). Cache kept in `app_config` for reference; GitHub Actions still rebuilds it daily in case a future model version supports it.

### Books in cache / RAG (6)

| Key | Book | Gemini File URI |
|---|---|---|
| `48_laws` | Robert Greene — The 48 Laws of Power | `files/841pr97csi6q` |
| `art_of_seduction` | Robert Greene — The Art of Seduction | `files/7a87mk74m88j` |
| `laws_of_human_nature` | Robert Greene — The Laws of Human Nature | `files/ewzy70fcjif1` |
| `The_Evolution_of_Desire` | David Buss — The Evolution of Desire | `files/jf726p3zz8no` |
| `totem_taboo` | Sigmund Freud — Totem and Taboo | `files/qs9jneclk6cd` |
| `what_everybody_is_saying` | Joe Navarro — What Every Body Is Saying | `files/nnhfvs1ldvv1` |

**Note:** Gemini Files API expires files after 48h. `scripts/upload-books.js` must be re-run if files expire. `create-cache.js` must be run after upload.

### System prompt frameworks (inline)

1. The 48 Laws of Power — cite as "Law N: Name (Tactical Synonym)"
2. The Art of Seduction — archetype + specific tactic
3. The Laws of Human Nature
4. The Evolution of Desire — evolutionary psychology
5. Sigmund Freud — defense mechanisms by exact clinical name
6. Joe Navarro — pacifying behaviors, limbic signals, comfort/discomfort clusters
7. Attachment Theory — anxious-preoccupied, dismissive-avoidant, fearful-avoidant, secure

---

## Mistral Config

| Field | Value |
|---|---|
| Model | `mistral-large-latest` |
| Endpoint | `https://api.mistral.ai/v1/chat/completions` |
| Temperature | 0.7 |
| Max tokens | 200 |
| Trigger | Tactical mode only |
| Execution | Parallel with Gemini (promise fired before Gemini await) |
| Merge strategy | Mistral scripts win for tactical; Gemini scripts used as fallback if Mistral fails |

---

## DARKO Response Schema

Canonical JSON schema returned by `decode-intel`:

```json
{
  "intent": "text_back" | "strategic_advice" | "full_debrief",
  "mission_status": "// INTEL RECEIVED",
  "visible_arsenal": {
    "option_1_script": "tactical reply (empty string if strategic)",
    "option_2_script": "second tactical reply (empty string if strategic)"
  },
  "hidden_intel": {
    "threat_level": "8.5/10 — Archetype Label or Law Cited",
    "the_psyche": "2 sentences — archetypes/mechanisms sentence. Clinical verdict sentence.",
    "the_directive": ["directive 1", "directive 2", "directive 3"]
  },
  "next_directive": "one cold sentence",
  "handler_note": null,
  "phase_update": null
}
```

`normalizeResponse()` in decode-intel maps this to the internal shape (`response_type`, `primary_response`, `scripts`, etc.) and also handles 3 legacy schemas for backward compatibility with old stored history entries.

## Auto Intent Detection (server-side)

```
intent = "text_back"       → short received message, user needs reply scripts
intent = "strategic_advice" → user asking what to do, "I" framing, situation description
intent = "full_debrief"    → long input > 200 chars, explicit analysis request
```

DARKO decides dynamically based on context. Returns `intent` field in JSON. Client maps `text_back` → `tactical`, others → `strategic`.

---

## Features Built

- [x] Auth — login / signup / signout / email confirmation flow
- [x] Target profiles — leverage + objective fields, delete with CASCADE
- [x] DARKO handler persona — cold autonomous advisor, dynamic response types, no scripts for strategic
- [x] New response schema — `intent` + `visible_arsenal` + `hidden_intel` + `next_directive` + `handler_note` + `phase_update`
- [x] Full conversation history sent to Gemini on every decode (pro tier)
- [x] Running relationship brief per target — sent in context, built by generate-profile
- [x] Mission phase system — 5 phases (count-based + Gemini-suggested), phase unlock animation overlay
- [x] Myers-Briggs profiling — MBTI type, dominant function, shadow function, seduction vulnerability
- [x] RAG (retrieval-augmented generation) — query embedding → `search_book_passages` RPC → top 5 passages injected per decode
- [x] Sliding dossier panel — `[ DOSSIER ]` button → 85% width drawer from right, Animated slide + backdrop
  - Basic Intel: name, leverage, objective, birthday, location
  - Psychological Profile: dominant archetype, attachment style, MBTI, vulnerability score
  - Strengths & Weaknesses: strengths / likes (green border), weaknesses / dislikes (red border)
  - Manipulation Vectors: tactics she deploys, shadow function stress response
  - Relationship Arc: current phase, power dynamic, predicted next move, key turning points
  - Handler Assessment: full relationship brief
  - Auto-regenerates if data > 1h old or missing new fields
- [x] Law reframing with tactical synonyms — "Law N: Name (Tactical Synonym)" format mandated
- [x] Screenshot upload — expo-image-picker, inline data sent to Gemini
- [x] Voice recording + transcription — expo-audio HIGH_QUALITY → .m4a → fetch/blob/FileReader → base64 → transcribe-audio → Gemini multimodal
- [x] Voice recording auto-stop at 60 seconds — countdown timer `// REC 0:45`, `// max duration reached` message
- [x] Auto-expanding TextInput — multiline, minHeight 44, maxHeight 200, scrolls internally
- [x] Chat UI — inverted FlatList (newest at bottom), user bubbles right-aligned, DARKO bubbles left with accent border
- [x] Handler note — unsolicited observation rendered ~20% of responses
- [x] Zinc palette design — BG `#09090B`, card `#18181B`, border `#27272A`
- [x] Hybrid typography — Courier New / monospace for UI chrome, System / sans-serif for content
- [x] Cycling loader animation — 5 messages, 800ms interval
- [x] Blocked words preflight — stalk / hack / blackmail / illegal → 400 SECURE OVERRIDE
- [x] Rate limiting — 20 decodes/day on free tier, 429 with upgrade message
- [x] Long-press to copy full DARKO response to clipboard
- [x] Mistral tactical scripts — parallel execution with Gemini, Mistral scripts win
- [x] 3-screen swipeable onboarding with scan-line animation (AsyncStorage gated)
- [x] GitHub Actions daily cache refresh — 2am UTC + manual trigger
- [x] All API keys in environment variables — no hardcoded secrets
- [x] Code on GitHub: github.com/H2hofficially/darko-2
- [x] Editable user messages — long-press user bubble → edit modal → `re-decode` button; updates storage via `updateDecodeEntry`, replaces adjacent DARKO response in-place; shows `// edited` label
- [x] Copyable script cards — `ScriptCard` component per script; `copy` button top-right; `// copied` flash for 1.5s; long-press as alternative copy gesture
- [x] `// notation system` — all `[ ]` bracket labels replaced with `//` prefix (headers, section titles, status indicators); action buttons are plain lowercase (copy, cancel, re-decode); `// prefix` labels are Courier New, #A1A1AA, 10px, letterSpacing 2; action buttons are System font, 13px, no letterSpacing; edge function updated to return `// INTEL RECEIVED` etc.

---

## Design System

| Token | Value | Usage |
|---|---|---|
| `BG` | `#09090B` | Screen backgrounds |
| `CARD_BG` | `#18181B` | Card backgrounds |
| `BORDER` | `#27272A` | Borders, dividers |
| `TEXT_PRIMARY` | `#E4E4E7` | Main text |
| `TEXT_DIM` | `#A1A1AA` | Labels, metadata |
| `ACCENT` | `#CCFF00` | CTA buttons, active indicators, logo |
| `ERROR_RED` | `#FF4444` | Error messages |
| `MONO` | Courier New / monospace | Headers, labels, codes, UI chrome |
| `SANS` | System / sans-serif | Analysis content, directives, scripts |

---

## What Needs To Be Done Next

### High priority (shipping blockers)
- [ ] **Paywall / RevenueCat** — $15/month after 3 free decodes (not 20/day). Requires RevenueCat SDK + `tier` flip in Supabase on purchase.
- [ ] **App Store build** — EAS Build + Apple Developer account ($99/year). Need app icons, splash screen, privacy policy URL.
- [ ] **Remove `console.log` statements** before production — currently in storage.ts, decoder.ts, index.tsx, decode.tsx.
- [ ] **Push notifications** — decode complete, daily tactical briefing.
- [ ] **Re-run integration tests** — `node scripts/test-darko.js` needs to be updated for new response schema (intent/visible_arsenal/hidden_intel) instead of old response_type/primary_response schema.

### Medium priority
- [ ] **Share / Export feature** — share decode result as image or text. Native share sheet.
- [ ] **Conversation import** — paste a WhatsApp/iMessage chat export and decode the entire arc as a full debrief.
- [ ] **Dossier panel data persistence** — birthday and location currently only populated if Gemini extracts them from history. Could add manual input fields.

### Lower priority / future
- [ ] **Hindi / Hinglish routing** — detect language, route to Sarvam AI for transcription + possibly analysis.
- [ ] **Voice output** — ElevenLabs TTS reading back the tactical script.
- [ ] **pg_cron** — alternative to GitHub Actions for cache refresh. Requires pg_cron + pg_net extensions in Supabase.
- [ ] **Deep link** — register `darko://` scheme in Supabase Auth redirect URLs for email confirmation on device.
- [ ] **EAS configuration** — `eas.json` with development / preview / production profiles.
- [ ] **Mistral for strategic_advice mode** — currently only tactical mode uses Mistral. Could extend.
- [ ] **Gemini 2.5 Flash context caching** — blocked by 1M token overflow bug (555K cache + inference overhead > 1M limit). Monitor future model updates; re-enable in both edge functions by adding `body.cachedContent = cacheName` when supported.

---

## Session History

### 2026-03-21 — Editable Messages + Copyable Scripts + // Notation System

**Editable user messages** (`services/storage.ts`, `app/decode.tsx`):
- `updateDecodeEntry()` added to storage.ts — updates `message_content` JSONB using `.filter('message_content->>id', 'eq', entry.id)` to target the correct log row
- `isEdited?: boolean` added to `DecodeEntry` type and `ChatMsg` user type; carried through `historyToChatMsgs`
- `UserBubble` now accepts `onLongPress` prop — long press (400ms) opens edit modal
- Edit modal: dark overlay, ACCENT border, multiline TextInput, `cancel` + `re-decode` buttons
- `handleEditSave`: updates user bubble text optimistically, runs new decode with history context up to (not including) that entry, replaces adjacent DARKO bubble in-place, persists updated entry via `updateDecodeEntry`
- Edited bubble shows `// edited` label below text

**Copyable script cards** (`app/decode.tsx`):
- `ScriptCard` component with local `copied` state replaces inline script rendering in `DarkoBubble`
- `copy` button in header row; tapping copies script text via `expo-clipboard`
- Flashes to `// copied` in `#CCFF00` for 1.5s then reverts
- Long press on card body also copies (alternative gesture)
- Button styled as action button: SANS, 13px, #A1A1AA, no letterSpacing

**// Notation system** (both `app/` files + `decode-intel` edge function):
- All `[ LABEL ]` strings → `// LABEL` (headers, phase unlock overlays, section titles, status indicators, empty state, error text)
- Action buttons → plain lowercase: `copy`, `cancel`, `re-decode`, `×` (close)
- `// DOSSIER` header button (was `[ DOSSIER ]`)
- Recording: `// REC 0:45` (was `[ REC 0:45 ]`), `// max duration reached` (was `[ MAX DURATION REACHED ]`)
- Error: `// signal lost` (was `[ DECODE FAILED — SIGNAL LOST ]`)
- `index.tsx` header: `// DARKO` (was `[ DARKO ]`)
- Typography enforced: `//` labels = MONO, #A1A1AA, 10px, letterSpacing 2; action buttons = SANS, 13px, no letterSpacing
- Edge function: `mission_status` schema example updated to `// INTEL RECEIVED` format; added explicit rules for `//` prefix on all three output fields; `next_directive` documented as plain imperative, no brackets
- Deployed: `decode-intel` redeployed

---

### 2026-03-21 — Gemini fix + Dossier Panel

**Root cause diagnosed and fixed: empty Gemini responses**
- Cache `cachedContents/fxswtcl07884xq326w9ju95n1vnwf67dudmjezus` had expired (48h TTL, created 2026-03-18)
- Edge function was fetching stale cache name from `app_config`, sending it to Gemini → `403 PERMISSION_DENIED`
- Previous fix attempt (adding `cachedContent` to requests) revealed deeper issue: Gemini 2.5 Flash `400: input token count exceeds 1,048,576` when using 555K-token cache — the model expands cached tokens at inference time, overflowing the 1M context window
- **Final fix**: removed `cachedContent` from both `decode-intel` and `generate-profile`. Both now use inline `system_instruction`. RAG passages provide book knowledge per query. Added 403/404 fallback in decode-intel for future cache errors.
- Re-uploaded all 6 PDFs (Gemini Files API 48h expiry), rebuilt cache with 7-day TTL

**New JSON schema** (reverted flexible `response_type` enum → old reliable structure + new fields):
- Canonical: `intent` + `visible_arsenal` + `hidden_intel` + `next_directive` + `handler_note` + `phase_update`
- `normalizeResponse()` handles canonical + 3 legacy schemas (backward compat with stored history)
- Retry prompt (attempt 2) always uses inline `retryPrompt` — was previously broken by `cacheName ? null : retryPrompt`

**DARKO persona upgrade** — new autonomous advisor behavior:
- Dynamic response routing: tactical (received message) → strategic (what to do) → warning → validation → interrogation → silence → phase_advance
- Analyzes: target psychology, operative anxiety/mistakes, power dynamic, what operative is really asking
- `handler_note`: unsolicited observation, ~20% of responses

**UI improvements to `app/decode.tsx`**:
- Auto-expanding `TextInput` — `multiline`, `minHeight: 44`, `maxHeight: 200`, `scrollEnabled`; `CMD >` prefix pins to top via `alignItems: 'flex-start'`
- Voice recording: 60-second auto-stop, countdown `[ REC 0:45 ]` in red, `[ MAX DURATION REACHED ]` message; `recordingTimerRef` cleared on manual stop to prevent double-stop race

**Dossier panel** — sliding intelligence file:
- `[ DOSSIER ]` button top-right header; `DossierPanel` component (always mounted after first open)
- `Animated.Value` slide + backdrop; `useEffect` on `visible` prop drives both
- Sections: Basic Intel → Psychological Profile → Strengths & Weaknesses (green/red borders) → Manipulation Vectors → Relationship Arc → Handler Assessment
- Auto-regenerates if `generatedAt` > 1h old or `strengths` field missing
- `generate-profile` edge function expanded: now accepts `leverage` + `objective`, returns 10 new fields
- `TargetProfile` type + `generateTargetProfile()` updated to capture all 16 fields

---

## How To Run

### Development
```bash
# Install dependencies
npm install

# Start Expo dev server
npx expo start

# Scan QR code with Expo Go app
```

### Environment setup
`.env.local` (gitignored) must contain:
```
EXPO_PUBLIC_SUPABASE_URL=https://adyebdcyqczhkluqgwvv.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
GEMINI_API_KEY=<gemini_key>
MISTRAL_API_KEY=<mistral_key>
SUPABASE_URL=https://adyebdcyqczhkluqgwvv.supabase.co
SUPABASE_ANON_KEY=<anon_key>
```

### Refresh Gemini cache (local)
```bash
export $(cat .env.local | xargs)
node scripts/create-cache.js
```

### Upload new books to Gemini (run once per new PDF)
```bash
# Drop PDF into knowledge/
export $(cat .env.local | xargs)
node scripts/upload-books.js   # uploads all PDFs, updates file-refs.json
node scripts/create-cache.js   # creates new cache with all books
```

### Run integration tests
```bash
export $(cat .env.local | xargs)
node scripts/test-darko.js
# Expected output: 6/6 tests passed
```

### Deploy edge functions
```bash
SUPABASE_ACCESS_TOKEN=<sbp_token> ~/bin/supabase functions deploy decode-intel --project-ref adyebdcyqczhkluqgwvv --use-api --no-verify-jwt
SUPABASE_ACCESS_TOKEN=<sbp_token> ~/bin/supabase functions deploy generate-profile --project-ref adyebdcyqczhkluqgwvv --use-api --no-verify-jwt
SUPABASE_ACCESS_TOKEN=<sbp_token> ~/bin/supabase functions deploy transcribe-audio --project-ref adyebdcyqczhkluqgwvv --use-api --no-verify-jwt
```

### Set Supabase secrets
```bash
SUPABASE_ACCESS_TOKEN=<sbp_token> ~/bin/supabase secrets set GEMINI_API_KEY=<key> --project-ref adyebdcyqczhkluqgwvv
SUPABASE_ACCESS_TOKEN=<sbp_token> ~/bin/supabase secrets set MISTRAL_API_KEY=<key> --project-ref adyebdcyqczhkluqgwvv
```

### Push to GitHub
```bash
git add .
git commit -m "your message"
git push origin main
```
