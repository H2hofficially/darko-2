# DARKO — Developer Handoff Document

**App:** Psychological relationship strategy advisor
**Entity:** Nxgen Media LLC
**Last updated:** 2026-04-15

---

## 1. Access & Credentials

> Fill in values manually. Never commit secrets to the repo.

| Resource | Value |
|---|---|
| **GitHub repo** | https://github.com/H2hofficially/darko-2 (private) |
| **Supabase project URL** | https://adyebdcyqczhkluqgwvv.supabase.co |
| **Supabase project ref** | `adyebdcyqczhkluqgwvv` |
| **Supabase dashboard** | https://supabase.com/dashboard/project/adyebdcyqczhkluqgwvv |
| **Vercel project** | _fill in manually_ |
| **Domain** | darkoapp.com — registrar: IONOS |
| **Stripe account** | Nxgen Media — _fill in login_ |
| **Expo EAS project ID** | `d9531d74-c9f3-486b-a10d-f836e7f12a0f` |
| **EAS owner** | `h2hofficially` |
| **Support email** | donniedarkoapp@gmail.com |

### Supabase Edge Function Secrets

Set these in Supabase Dashboard → Edge Functions → Secrets (or via CLI `supabase secrets set`):

| Secret Name | Description |
|---|---|
| `DEEPSEEK_API_KEY` | DeepSeek API key — used by decode-intel for chat completions |
| `GEMINI_API_KEY` | Google AI Studio API key — used by decode-intel (image extraction + RAG embeddings), generate-profile, transcribe-audio |
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_live_...`) — used by create-checkout, stripe-webhook |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret (`whsec_...`) — used by stripe-webhook to verify events |

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are auto-injected by Supabase into all edge functions.

### Local `.env.local`

```
EXPO_PUBLIC_SUPABASE_URL=https://adyebdcyqczhkluqgwvv.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key from Supabase dashboard>
```

---

## 2. Architecture Overview

### Stack

| Layer | Technology |
|---|---|
| Framework | Expo SDK 54 (React Native + web) |
| Language | TypeScript |
| Routing | expo-router v6 (SPA mode for web) |
| Auth / DB / Backend | Supabase (auth, postgres, edge functions) |
| AI — chat | DeepSeek V3.2 via REST (`api.deepseek.com/chat/completions`, streaming) |
| AI — image extraction + RAG embeddings | Gemini 2.0 Flash (vision) + Gemini Embedding 001 (RAG) |
| Payments | Stripe Checkout (raw REST — no SDK) |
| Web deploy | Vercel (static SPA, `dist/` output) |
| Native deploy | Expo EAS (iOS/Android) |

### How It Works End-to-End

```
User types message (or attaches image) in app/decode.tsx
  │
  ▼
services/darko.ts — sendMessage()
  │  POST to supabase/functions/decode-intel with { message, target_id, imageBase64?, tier, ... }
  │
  ▼
decode-intel edge function (Deno)
  │
  ├─ [if imageBase64 present]
  │    Hash image → check app_config cache
  │    Cache miss → classifyImageType() via Gemini 2.0 Flash (screenshot | photo)
  │                → extractImageContext() via Gemini 2.0 Flash (structured JSON)
  │                → cache result in app_config
  │    Inject [IMAGE_ANALYSIS: type=...] block into user message
  │
  ├─ Fetch conversation history from conversation_messages (10 free / 50 pro)
  ├─ Build RAG: getQueryEmbedding() → Gemini Embedding 001 → search_book_passages RPC → top 5 passages
  ├─ Build temporal intelligence block (days since last message, silence alerts)
  ├─ getCampaignState() → inject [CONTEXT: tier=X, target_archetype=Y, ...] prefix
  │
  ├─ Assemble messages array (OpenAI-compatible):
  │    system: DARKO v4.0 prompt + context blocks
  │    history: conversation_messages (darko → assistant, user → user)
  │    user: stateBlock + imageContext + [USER MESSAGE]: <text>
  │
  │  POST https://api.deepseek.com/chat/completions (model: deepseek-chat, stream: true)
  │  Pipes SSE response stream directly back to client
  │
  ▼
services/darko.ts — SSE reader
  │  Web: fetch() + ReadableStream + TextDecoder, line-by-line parsing
  │  Native: react-native-sse
  │  Parses DeepSeek SSE: choices[0].delta.content (OpenAI-compatible format)
  │  Calls onChunk(accumulated) on each SSE event (streaming display)
  │  Calls onComplete(DarkoResponse) when stream ends (finish_reason === 'stop' or [DONE])
  │
  ▼
app/decode.tsx — renders response
   Saves user message + DARKO response to conversation_messages (Supabase)
   Triggers non-blocking auto profile refresh (generate-profile) every 3 min
```

### Payments Flow

```
User hits tier limit → PaywallModal shown
  │
  ▼
[ START FREE TRIAL ] pressed
  │
  ▼
supabase.functions.invoke('create-checkout')
  │  Raw fetch to api.stripe.com/v1/checkout/sessions
  │  4-day trial, $15/month after
  │
  ▼
Linking.openURL(stripe_checkout_url)
  │
  ▼
User pays on Stripe-hosted page → redirected to /payment-success
  │
  ▼
Stripe fires webhook → stripe-webhook edge function
  │  Verifies signature (npm:stripe@14)
  │  checkout.session.completed → profiles.tier = 'pro', stores stripe_customer_id
  │
  ▼
app/payment-success.tsx calls refreshTier() after 2s → UserContext updates → gates lift
```

### Database Schema

| Table | Purpose |
|---|---|
| `profiles` | One row per user. Stores `tier` ('free'/'pro'/'executive'), `stripe_customer_id`, `full_name`, `age`, `phone`. RLS: users own their row. |
| `targets` | User's people (targets). Fields: `target_alias`, `leverage`, `objective`, `behavioral_profile` (JSONB), `mission_phase`. CASCADE deletes messages. |
| `conversation_messages` | V3 chat history. Columns: `target_id`, `user_id`, `role` ('user'/'darko'), `content`, `structured_data` (JSONB), `entry_type` ('message'/'campaign_brief'/'alert'). Indexed on (target_id, created_at). |
| `intelligence_logs` | V2 legacy history. Superseded by conversation_messages. Do not write to this. |
| `app_config` | Server-side key-value store. Currently holds `gemini_cache_name` (unused). |
| `push_tokens` | Push notification tokens. `user_id` PK, `token`, `last_alert_at`. Service role only. |
| `decode_counts` | Server-side daily rate limit tracking per user. |
| `book_passages` | RAG source. pgvector embeddings of 6 psychology/strategy books. Queried via `search_book_passages` RPC. |

### Edge Functions

| Function | What It Does |
|---|---|
| `decode-intel` | **Main AI engine.** Assembles context (system prompt v4.0 + RAG + history + user input), streams DeepSeek V3.2 response via SSE (OpenAI-compatible format). Image input: classify via Gemini Flash → extract structured JSON → inject as [IMAGE_ANALYSIS] block → hash-cached in app_config. Campaign state injected as [CONTEXT] prefix per request. Rate limit: 30/day free. Blocked words preflight. Temporal intelligence block on every call. |
| `generate-profile` | Generates 20-field psychological dossier from conversation history. Returns MBTI, communication style, manipulation vectors, emotional state, etc. |
| `transcribe-audio` | Receives `{ audioBase64, mimeType }`, sends to Gemini multimodal, returns `{ text }`. |
| `create-checkout` | Creates Stripe Checkout Session via raw fetch (no SDK). Returns `{ url }`. 4-day free trial. Success/cancel URLs point to darkoapp.com. |
| `stripe-webhook` | Handles Stripe events: `checkout.session.completed` → upgrades tier. `customer.subscription.updated` → re-checks price. `customer.subscription.deleted` → downgrades to free. |
| `check-campaigns` | Scheduled every 6h via pg_cron. Checks alert conditions per target (silence, advancement signals) and sends push notifications via Expo Push API. |

> `health` and `refresh-cache` are auxiliary — health pings the DB, refresh-cache was used for Gemini context caching (abandoned due to token overflow; kept for reference).

### File Structure Map

```
darko/
├── app/
│   ├── _layout.tsx          # Root navigator, UserProvider, global web CSS
│   ├── index.tsx            # Entry — LandingPage (unauthed) OR target list (authed)
│   ├── auth.tsx             # Login + signup (name, age, email, phone, password)
│   ├── auth/callback.tsx    # Email verification handler (code → session → upsert profile)
│   ├── decode.tsx           # ★ Main chat screen (see Key Files)
│   ├── onboarding.tsx       # Native-only 3-screen intro
│   ├── pricing.tsx          # FREE/PRO cards, Stripe upgrade flow
│   ├── payment-success.tsx  # Post-payment, calls refreshTier()
│   ├── payment-cancel.tsx   # Cancelled payment screen
│   ├── contact.tsx          # Support page with mailto link
│   ├── privacy.tsx          # Privacy policy (Nxgen Media LLC)
│   └── terms.tsx            # Terms of service (Nxgen Media LLC)
│
├── services/
│   ├── darko.ts             # ★ AI service layer — sendMessage(), SSE streaming, parseDarkoResponse()
│   ├── storage.ts           # ★ Supabase CRUD — messages, targets, profiles, phases
│   └── notifications.ts     # Push token registration
│
├── context/
│   └── UserContext.tsx      # Tier context (free/pro/executive), TIER_LIMITS, refreshTier()
│
├── components/
│   └── PaywallModal.tsx     # Shown when free user hits any tier gate
│
├── hooks/
│   ├── useImagePicker.ts    # Platform-safe image picker (web: file input, native: expo-image-picker)
│   ├── useVoiceRecorder.ts  # Platform-safe recorder (web: MediaRecorder, native: expo-audio)
│   └── useClipboard.ts      # Platform-safe clipboard
│
├── supabase/
│   ├── functions/
│   │   ├── decode-intel/index.ts      # ★ Main AI engine (DeepSeek V3.2 + Gemini image pipeline)
│   │   ├── generate-profile/index.ts
│   │   ├── transcribe-audio/index.ts
│   │   ├── create-checkout/index.ts
│   │   ├── stripe-webhook/index.ts
│   │   └── check-campaigns/index.ts
│   └── migrations/
│       ├── 001_v2_schema.sql
│       ├── 002_book_passages.sql
│       ├── 003_push_tokens.sql
│       ├── 004_conversation_messages.sql
│       ├── 005_stripe.sql
│       └── 006_profile_fields.sql
│
├── scripts/
│   ├── upload-books.js      # Upload PDFs to Gemini File API, write URIs to knowledge/file-refs.json
│   └── create-cache.js      # Build Gemini context cache (not currently used)
│
├── public/
│   └── legal.html           # Standalone legal page — served at /legal.html, has #privacy and #tos anchors
│
├── lib/
│   └── supabase.ts          # Supabase client (reads EXPO_PUBLIC_ env vars)
│
├── app.json                 # Expo config (scheme: darko, EAS projectId, web output: single)
├── eas.json                 # EAS build profiles
├── vercel.json              # Build command, outputDir: dist, SPA rewrite /* → /index.html
├── .env.local               # Local secrets — gitignored
├── PROGRESS.md              # Full project state document (detailed, authoritative)
└── HANDOFF.md               # This file
```

---

## 3. How to Run Locally

```bash
# Install dependencies
npm install

# Start dev server (web + iOS/Android)
npx expo start

# Web only
npx expo start --web

# iOS simulator
npx expo start --ios

# Android emulator
npx expo start --android
```

### Required `.env.local`

Create this file in the project root (it is gitignored):

```
EXPO_PUBLIC_SUPABASE_URL=https://adyebdcyqczhkluqgwvv.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<get from Supabase Dashboard → Settings → API>
```

> The app will compile without these but all Supabase calls will fail silently.

### Notes

- Node 20+ recommended.
- iOS/Android require a physical device or simulator with Expo Go, or an EAS build for push notification testing.
- Edge functions run in Supabase's Deno environment — they cannot be run locally without `supabase start` (Docker). For dev, point at the live Supabase project.

---

## 4. How to Deploy

### Frontend (Web)

**Automatic:** Push to `main` → Vercel auto-deploys.

Manual build:
```bash
npx expo export --platform web
# Output is in dist/
```

Vercel config (`vercel.json`):
- Build command: `npx expo export --platform web`
- Output directory: `dist`
- SPA rewrite: `/*` → `/index.html` (catches all routes)

Static files in `public/` (e.g. `legal.html`) are copied into `dist/` at build time and served directly — the SPA rewrite does not intercept them.

### Edge Functions

Deploy from PowerShell (Windows) using the Supabase access token stored in memory:

```powershell
$env:SUPABASE_ACCESS_TOKEN="<your-supabase-access-token>"

npx supabase functions deploy decode-intel --project-ref adyebdcyqczhkluqgwvv --no-verify-jwt
npx supabase functions deploy generate-profile --project-ref adyebdcyqczhkluqgwvv --no-verify-jwt
npx supabase functions deploy transcribe-audio --project-ref adyebdcyqczhkluqgwvv --no-verify-jwt
npx supabase functions deploy create-checkout --project-ref adyebdcyqczhkluqgwvv --no-verify-jwt
npx supabase functions deploy stripe-webhook --project-ref adyebdcyqczhkluqgwvv --no-verify-jwt
npx supabase functions deploy check-campaigns --project-ref adyebdcyqczhkluqgwvv --no-verify-jwt
```

Or via Supabase Dashboard → Edge Functions → Deploy.

### SQL Migrations

Run in order in Supabase Dashboard → SQL Editor:

```
supabase/migrations/001_v2_schema.sql
supabase/migrations/002_book_passages.sql
supabase/migrations/003_push_tokens.sql
supabase/migrations/004_conversation_messages.sql
supabase/migrations/005_stripe.sql
supabase/migrations/006_profile_fields.sql
```

Each file is idempotent (`IF NOT EXISTS`, `IF NOT EXISTS`). Safe to re-run.

### Native Builds (iOS/Android)

```bash
# Preview build (internal distribution)
eas build --profile preview --platform ios
eas build --profile preview --platform android

# Production
eas build --profile production --platform all
```

Requires EAS CLI authenticated with the `h2hofficially` Expo account.

### Stripe Webhook Setup (one-time, manual)

1. Go to Stripe Dashboard → Developers → Webhooks → Add endpoint
2. Endpoint URL: `https://adyebdcyqczhkluqgwvv.supabase.co/functions/v1/stripe-webhook`
3. Events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy the signing secret (`whsec_...`) and set it as `STRIPE_WEBHOOK_SECRET` in Supabase edge function secrets.

### Supabase Auth Configuration (manual, Dashboard only)

Go to Supabase Dashboard → Authentication → URL Configuration:
- **Site URL:** `https://darkoapp.com`
- **Redirect URLs:** add `https://darkoapp.com/auth/callback`

---

## 5. Current State

### What's Working

- Full web app deployed at https://darkoapp.com
- Auth: email/password login + signup with name/age/email/phone (18+ gate), email verification via `/auth/callback`
- Target management: create up to 1 (free) or 3 (pro) targets
- AI chat: streaming DeepSeek V3.2 responses (OpenAI-compatible SSE), system prompt v4.0, campaign state injection
- RAG: 6 psychology/strategy books embedded in pgvector, top 5 passages injected per request
- // DOSSIER: 20-field psychological profile panel (pro only)
- // BRIEF: full campaign planning modal with 7-phase roadmap (pro only)
- Voice input + transcription via Gemini multimodal (pro only)
- Screenshot/photo analysis — Gemini 2.0 Flash classifies + extracts structured JSON → injected as [IMAGE_ANALYSIS] block into DeepSeek context. Hash-cached per image in app_config (pro only)
- Stripe Checkout with 4-day free trial → $15/month, webhook upgrades tier in DB
- PaywallModal triggers at all tier gates
- Pricing page with FREE/PRO cards
- Payment success/cancel screens
- Push notifications via Expo Push API + pg_cron campaign checker (native EAS builds only)
- /legal.html static page with Privacy Policy and Terms (Nxgen Media LLC)
- Contact/support page
- BETA v1.0 badge throughout
- Responsive web layout (≥640px side-by-side cards, hairline-border centered column)

### Known Issues

- **Supabase CLI auth in dev**: `supabase login` required before deploying edge functions locally. Use the access token pattern shown in the deploy section above.
- **Migrations 005 and 006**: May not be applied yet if the project DB is in an older state — run them manually in SQL Editor if `stripe_customer_id` or `full_name` columns don't exist.
- **Push notifications**: Only work in EAS builds (not Expo Go). `expo-notifications` is fully excluded from web builds via `Platform.OS !== 'web'` guard.
- **Gemini File API expiry**: The 6 book PDFs uploaded to Gemini Files API expire after 48 hours. Re-run `node scripts/upload-books.js` then `node scripts/create-cache.js` when RAG stops returning results. Note: this only affects RAG embeddings — main chat now runs on DeepSeek.
- **DEEPSEEK_API_KEY must be set** as a Supabase edge function secret. Without it, decode-intel returns 500. Get a key at platform.deepseek.com.
- **Executive tier**: No signup flow — tier must be set manually in Supabase DB (`UPDATE profiles SET tier = 'executive' WHERE id = '...'`).
- **Stripe webhook**: Must be configured in Stripe Dashboard manually (see deploy section). Until configured, successful payments will not upgrade the user's tier in the DB.

### Planned But Not Built

| Feature | Notes |
|---|---|
| **Model upgrade** | Main chat now on DeepSeek V3.2 (`deepseek-chat`). Future: DeepSeek R2 or swap back to Gemini 2.5 Pro for specific use cases. Change `model` in the DeepSeek fetch body in `decode-intel/index.ts`. |
| **Phone OTP verification** | Auth currently uses email verification only. Phone OTP via Supabase Auth (Twilio) was planned but not implemented. `phone` field is collected in signup and stored in profiles. |
| **Executive invite system** | Executive tier is manually set in DB. A proper invite flow (invite code → auto tier upgrade on signup) is planned. |
| **parseDarkoResponse client update** | The v4.0 prompt outputs JSON (`handler_note` as primary, `visible_arsenal` for scripts, `state_update` for campaign state). The client `parseDarkoResponse()` still looks for `// SCRIPT` block markers — needs rewriting to extract fields from the JSON. `decode.tsx` will also need updates to consume `suggested_followups` and `state_update`. |
| **Web push notifications** | Currently native-only. Web Push API support would require a service worker. |
| **Admin dashboard** | No internal tooling for viewing users, tiers, or usage. All admin is via Supabase SQL Editor. |

---

## 6. Key Files to Understand First

### `app/decode.tsx` — Main Conversation Screen

The largest and most complex file. Understand this first.

**What it does:**
- Renders the chat UI for a single target
- Platform split: web uses forward `ScrollView` + `scrollToEnd`; native uses inverted `FlatList`
- Streaming: calls `sendMessage()` from `services/darko.ts`, updates a `streamingContent` state on each chunk, appends finalized response on complete
- Feature gates: checks `TIER_LIMITS[tier]` before voice, image, dossier, brief, and daily message count — shows `PaywallModal` on violations
- Daily message count: filters `chatMessages` for `type === 'user'` entries where `timestamp.toDateString() === today`
- Phase bar: 5 phases, animated unlock overlay on phase advance
- `DossierPanel`: always-mounted sliding panel, auto-regenerates if stale (>1h or missing `strengths` field)
- `CampaignBriefModal`: 7-field form that generates a full campaign roadmap via `// BRIEF` intent
- BETA v1.0 badge in header

### `services/darko.ts` — Streaming + Parsing

**What it does:**
- `sendMessage(targetId, message, onChunk, onComplete, options)` — the core function
- Fetches last N conversation messages from Supabase (10 free / 50 pro)
- Calls `search_book_passages` RPC for RAG context
- POSTs to `decode-intel` edge function with assembled payload
- Web SSE reader: `response.body.getReader()` + `TextDecoder`, splits on `\n`, parses `data:` lines, accumulates JSON
- `parseDarkoResponse(raw)`: extracts structured fields from the streamed JSON string
- `generateTargetProfile(targetId)`: calls `generate-profile` edge function
- `transcribeAudio(base64, mimeType)`: calls `transcribe-audio` edge function

### `services/storage.ts` — Database Operations

**What it does:**
- All Supabase reads/writes go through here — never call `supabase` directly from screens
- Key functions: `saveMessage()`, `getConversation()`, `getTarget()`, `saveTarget()`, `deleteTarget()`, `getTargetProfile()`, `saveTargetProfile()`, `getMissionPhase()`, `saveMissionPhase()`
- All functions handle errors internally and return `null` on failure (screens check for null)

### `supabase/functions/decode-intel/index.ts` — The Brain

**What it does:**
- Receives `{ message, target_id, imageBase64?, imageMimeType?, leverage?, objective?, target_communication_style?, mission_phase? }`
- Image pipeline (if imageBase64 present): hash → check app_config cache → `classifyImageType()` (Gemini 2.0 Flash) → `extractImageContext()` (Gemini 2.0 Flash) → cache result → inject `[IMAGE_ANALYSIS]` block
- Campaign state: `getCampaignState()` stub (returns defaults; real implementation pending) → `[CONTEXT: tier=X, ...]` prefix
- Fetches conversation history from `conversation_messages` (10 free / 50 pro)
- RAG: `getQueryEmbedding()` → Gemini Embedding 001 → `search_book_passages` RPC → top 5 passages
- Builds OpenAI-compatible messages array: `system` (v4.0 prompt + context) → history (darko → assistant) → `user` (stateBlock + imageContext + [USER MESSAGE])
- Streams `api.deepseek.com/chat/completions` (model: `deepseek-chat`, stream: true) response directly back as SSE
- Blocked words: returns 400 with `SECURE OVERRIDE` before calling DeepSeek

**DARKO System Prompt v4.0** (inside `index.ts`):
- Voice rules + forbidden/allowed vocabulary
- Six-beat response structure (read, mistake, move, branch, do-not, hand-off)
- Tier length rules (Tier 1: 80-150w, Tier 2: 250-400w, Tier 3: 600w+)
- Two profiling layers: attachment (hidden) + archetype (visible, 12 named types)
- Two registers: ANIMAL (hot/in-moment) and OPERATOR (planning/post-mortem)
- Body language read framework
- Signal threshold rule (no escalation without target signals)
- Text generation rules (match his voice, her register)
- Hard stops + in-voice pivots (minors, active institutional authority, restraining order)
- JSON output schema: `handler_note` (primary) + `visible_arsenal`, `hidden_intel`, `state_update`, `suggested_followups`
- Three worked examples (benchmark Tier 2, Tier 1 quick hit, hot signal read)

---

## Stripe Price IDs

| Plan | Price ID |
|---|---|
| Pro ($15/month, 4-day trial) | `price_1TFJfkEmZWsJibucl22phWB3` |
| Executive | `price_1TFJfkEmZWsJibucAw0qXn6q` |

---

## Color Palette

All screens use the same zinc-dark palette defined as constants at the top of each file:

```ts
const ACCENT       = '#CCFF00';  // lime green — CTAs, badges, active states
const BG           = '#09090B';  // near-black background
const CARD_BG      = '#18181B';  // card/panel surfaces
const BORDER       = '#27272A';  // hairline borders
const TEXT_PRIMARY = '#E4E4E7';  // main body text
const TEXT_DIM     = '#A1A1AA';  // secondary/muted text
```

Font: `Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' })` for all UI text (monospace terminal aesthetic).

---

## Important Gotchas

1. **Never use Stripe SDK in Supabase edge functions.** Both `esm.sh/stripe` and `npm:stripe` crash the Supabase Deno runtime with `Deno.core.runMicrotasks() is not supported`. `create-checkout` uses raw `fetch` to Stripe REST API. `stripe-webhook` uses `npm:stripe@14` for signature verification only (no full SDK).

2. **`expo-notifications` must never be imported at module level on web.** It crashes the web build. Always `require()` it inside a `Platform.OS !== 'web'` check.

3. **`react-native-sse` is broken on web.** The SSE client in `darko.ts` uses native `fetch()` + `ReadableStream` on web, and `react-native-sse` on native.

4. **SPA rewrite vs static files.** Vercel rewrites `/*` → `index.html` but static files in `dist/` are served before rewrites apply. So `legal.html` works correctly at `/legal.html`.

5. **Gemini is still required even with DeepSeek.** `GEMINI_API_KEY` must stay set — it powers RAG embeddings (`gemini-embedding-001`) and image extraction (`gemini-2.0-flash`). Only the main chat completion moved to DeepSeek.

6. **Daily message count is client-side.** The free tier 5-message limit is enforced in `decode.tsx` by counting today's user messages in local state. Server-side rate limiting also exists in `decode-intel` (30/day) but the client-side check fires first.

---

*For full feature history, schema details, and pending items see `PROGRESS.md`.*
