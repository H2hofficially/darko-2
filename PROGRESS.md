# DARKO — Build Progress
**Last updated:** 2026-03-19 | **Git:** `c3663eb` | **Repo:** github.com/H2hofficially/darko-2

---

## What Is This

A React Native (Expo) app that decodes text messages and social situations through cold Machiavellian psychological analysis. Gemini 2.5 Flash handles deep psychological analysis and profiling across a 555k-token cached knowledge base of 6 books. Mistral Large handles tactical script generation in parallel. Supabase provides auth, database, and edge function routing.

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
| `app/decode.tsx` | Main decode screen per target. FlatList history (React.memo HistoryCard + useCallback renderItem). Image picker, voice recorder (fetch/blob/FileReader pipeline, no expo-file-system), single-line cycling loader, target profile card (collapsible, MBTI section). Mode auto-detected server-side — no manual toggle. `// AUTO-DETECTED: {MODE}` label on each history card. Copy-to-clipboard on scripts. Full debrief renders 5-section accordion. |

### Services — `services/`

| File | Purpose |
|---|---|
| `services/decoder.ts` | `decodeMessage()` — invokes `decode-intel` with full history, dossier context, relationship brief. No mode param — server auto-detects. Maps `auto_detected_mode` + optional `debrief` object from response. `transcribeAudio(base64, mimeType)` — invokes `transcribe-audio`. `generateTargetProfile()` — invokes `generate-profile`. Full logging on all paths. |
| `services/storage.ts` | All Supabase CRUD. Types: `Target`, `DecodeEntry` (with `auto_detected_mode?: string`), `TargetProfile` (with optional `mbti_profile`), `MbtiProfile`. Targets → `targets` table. History → `intelligence_logs`. Profile → `targets.behavioral_profile` JSONB. |

### Edge Functions — `supabase/functions/`

| Function | Purpose |
|---|---|
| `decode-intel` | Main analysis engine. Reads `GEMINI_API_KEY` + `MISTRAL_API_KEY` from Deno env. Auth + tier check via service role. Rate limit: 20 decodes/day free tier. Blocked words preflight. Auto intent detection (tactical / strategic_advice / full_debrief). Fires Mistral in parallel with Gemini for tactical mode. Merges: Mistral scripts win, Gemini analysis wins. Returns unified result shape. |
| `generate-profile` | Generates behavioral target profile from decode history. Uses Gemini context cache (reads `gemini_cache_name` from `app_config`). Returns MBTI profile, dominant archetype, attachment style, manipulation patterns, vulnerability score, summary, relationship brief. |
| `transcribe-audio` | Transcribes audio using Gemini multimodal. Accepts base64 audio + mimeType from client. Returns `{ text }`. |
| `refresh-cache` | Creates new Gemini context cache from uploaded file refs. Writes new cache name to `app_config`. Used internally (GitHub Actions uses `scripts/create-cache.js` directly). |

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
| Cache name | `cachedContents/fxswtcl07884xq326w9ju95n1vnwf67dudmjezus` |
| Token count | **555,513** |
| Created | 2026-03-18T11:34Z |
| Expires | 2026-03-19T11:34Z (auto-refreshed daily by GitHub Actions) |
| TTL | 86400s (24h) |

### Books in cache (6)

| Key | Book |
|---|---|
| `48_laws` | Robert Greene — The 48 Laws of Power |
| `art_of_seduction` | Robert Greene — The Art of Seduction |
| `laws_of_human_nature` | Robert Greene — The Laws of Human Nature |
| `The_Evolution_of_Desire` | David Buss — The Evolution of Desire |
| `totem_taboo` | Sigmund Freud — Totem and Taboo |
| `what_everybody_is_saying` | Joe Navarro — What Every Body Is Saying |

### System prompt frameworks (in cache)

1. The 48 Laws of Power — Law number + tactical synonym citation required
2. The Art of Seduction — seduction archetypes + phase names
3. The Laws of Human Nature — drives, envy dynamics, shadow projection
4. The Evolution of Desire — evolutionary psychology, mate retention, devaluation signals
5. Totem and Taboo — Freudian defense mechanisms by exact clinical name
6. Dark Psychology — gaslighting, love bombing, intermittent reinforcement, DARVO
7. Modern Attachment Theory — attachment styles, trauma bonding
8. Joe Navarro — pacifying behaviors, limbic signals, ventral denial, comfort/discomfort clusters

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

## Auto Intent Detection

Logic in `decode-intel` (server-side, no client toggle):

```
hasFirstPerson = /\b(I want|I did|I said|I feel|I think|should I|what should I|what do I|how do I|I've been|I haven't)\b/
isPsychObs     = /\b(she thinks|he thinks|she feels|he feels|she claims|she is acting|is sensitive|is insecure|is vulnerable)\b/
isLeak         = hasFirstPerson || isPsychObs

isDebrief      = content.length > 200
              || /analyse|analyze|full debrief|breakdown|profile|next move|psychological|who is|what is her/

detectedMode:
  isDebrief → "full_debrief"
  isLeak    → "strategic_advice"
  default   → "tactical"
```

Returned as `auto_detected_mode` string on every response. Displayed on each history card.

---

## Features Built

- [x] Auth — login / signup / signout / email confirmation flow
- [x] Target profiles with dossier — leverage + objective fields
- [x] Auto intent detection — tactical / strategic_advice / full_debrief (server-side)
- [x] Full conversation history sent to Gemini on every decode
- [x] Running relationship brief per target (generated by `generate-profile`, sent in context)
- [x] Myers-Briggs profiling in target profile card (MBTI type, dominant function, shadow function, seduction vulnerability)
- [x] Law reframing with tactical synonyms — "Law N: Name (Tactical Synonym)" format mandated
- [x] Screenshot upload — expo-image-picker, inline data sent to Gemini
- [x] Voice recording + transcription — expo-audio HIGH_QUALITY → .m4a → fetch/blob/FileReader → base64 → transcribe-audio edge function → Gemini multimodal
- [x] Zinc palette design — BG `#09090B`, card `#18181B`, border `#27272A`
- [x] Hybrid typography — Courier New / monospace for labels/headers, System / sans-serif for content paragraphs
- [x] Single-line cycling loader animation — 4 messages, 800ms interval
- [x] Full debrief 5-section report — power_dynamic_audit, psychological_profile, errors_made, current_phase, next_move
- [x] Blocked words preflight — stalk / hack / blackmail / illegal → 400 SECURE OVERRIDE
- [x] Rate limiting — 20 decodes/day on free tier, 429 error with upgrade message
- [x] Copy to clipboard on tactical scripts
- [x] Mistral tactical scripts — parallel execution with Gemini, Mistral wins
- [x] Navarro nonverbal framework — pacifying behaviors, limbic signals in all system prompts
- [x] 3-screen swipeable onboarding with scan-line animation (shown once, AsyncStorage gated)
- [x] 6/6 automated integration tests passing (`node scripts/test-darko.js`)
- [x] GitHub Actions daily cache refresh — runs at 2am UTC, manual trigger available
- [x] All API keys secured in environment variables — no hardcoded secrets in codebase
- [x] Code on GitHub: github.com/H2hofficially/darko-2

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

### Medium priority
- [ ] **Share / Export feature** — share decode result as image or text. Native share sheet.
- [ ] **Conversation import** — paste a WhatsApp/iMessage chat export and decode the entire arc as a full debrief.
- [ ] **Dark psychology PDF** — 6th knowledge book slot still available (currently only 5 framework books + Navarro). Upload and add to cache.

### Lower priority / future
- [ ] **Hindi / Hinglish routing** — detect language, route to Sarvam AI for transcription + possibly analysis.
- [ ] **Voice output** — ElevenLabs TTS reading back the tactical script.
- [ ] **pg_cron** — alternative to GitHub Actions for cache refresh if repo ever goes private or Actions quota is hit. Requires pg_cron + pg_net extensions in Supabase.
- [ ] **Deep link** — register `darko://` scheme in Supabase Auth redirect URLs for email confirmation on device.
- [ ] **EAS configuration** — `eas.json` with development / preview / production profiles.
- [ ] **Mistral for strategic_advice mode** — currently only tactical mode uses Mistral. Could extend.

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
