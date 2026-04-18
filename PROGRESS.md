# DARKO — Master Project Document
**Last updated:** 2026-03-26 | **Branch:** `main` | **Repo:** github.com/H2hofficially/darko-2

---

## What Is This

DARKO is a psychological relationship strategy app. Users paste text messages from a target person; DARKO responds as a cold Machiavellian analyst with tactical scripts, psychological assessments, and a 5-phase mission arc. Built on Expo (React Native + web), Supabase (auth/DB/edge functions), Gemini 2.5 Flash (AI), and Stripe (payments).

**Live web URL:** https://darkoapp.com (Vercel, SPA deploy)

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
| AI — analysis | Gemini 2.5 Flash | via REST (`streamGenerateContent?alt=sse`) |
| Payments | Stripe | via raw REST fetch (no SDK) |
| Image input | expo-image-picker | ~17.0.10 |
| Voice input | expo-audio | ~1.1.1 |
| Push notifications | expo-notifications | ~0.30.0 |
| Storage | AsyncStorage | 2.2.0 |
| File system | expo-file-system | ~19.0.21 |
| Web bundler | Metro + Expo web (`output: "single"`) | — |
| Deploy | Vercel (static SPA) | — |

---

## Deployment

### Web (Vercel)
| Field | Value |
|---|---|
| URL | https://darkoapp.com |
| Build command | `npx expo export --platform web` |
| Output directory | `dist/` |
| Routing | SPA — `vercel.json` rewrites `/*` → `/index.html` |
| Static assets | `public/` copied to `dist/` (includes `legal.html`) |

### Native (EAS)
| Field | Value |
|---|---|
| EAS Project ID | `d9531d74-c9f3-486b-a10d-f836e7f12a0f` |
| Owner | `h2hofficially` |
| Bundle ID (iOS) | `com.h2hofficially.darko` |
| Build profile | `preview` (internal distribution) |
| Push notifications | Requires EAS build — not available in Expo Go |

### Supabase
| Field | Value |
|---|---|
| Project ref | `adyebdcyqczhkluqgwvv` |
| URL | `https://adyebdcyqczhkluqgwvv.supabase.co` |
| Region | us-east-1 |
| Auth — Site URL | `https://darkoapp.com` |
| Auth — Redirect URL | `https://darkoapp.com/auth/callback` |

### GitHub
| Field | Value |
|---|---|
| Repo | github.com/H2hofficially/darko-2 |
| Branch | `main` |
| Visibility | Private |
| GitHub Actions | `refresh-cache.yml` — runs `node scripts/create-cache.js` daily at 2am UTC |

---

## File Map

### App screens — `app/`

| File | Purpose |
|---|---|
| `app/_layout.tsx` | Root Stack navigator. Wraps entire app in `UserProvider`. Registers all routes. Guards `expo-notifications` behind `Platform.OS !== 'web'` (crashes on web). Injects global web CSS at module level: font smoothing, dark scrollbar, cursor pointer, outline none. |
| `app/index.tsx` | Entry point. On web: shows `LandingPage` (unauthenticated) or authenticated target list. On native: onboarding gate → auth gate → target list. `LandingPage` has full nav (pricing, support, privacy, terms), hero, feature grid, footer with legal text. Authenticated screen: target list with BETA badge, `↑ PRO` link for free users, `PaywallModal` for tier-limit hits. |
| `app/auth.tsx` | Two-mode auth screen. **Login:** email + password. **Signup:** Full Name, Age (18+ gate — blocks under-18 with explicit error), Email, Phone, Password. `supabase.auth.signUp({ email, password, options: { data: { full_name, age, phone } } })`. Shows email confirmation pending screen after signup. |
| `app/auth/callback.tsx` | Handles Supabase email verification redirect. Exchanges `code` param for session via `exchangeCodeForSession`. After success, reads `user_metadata` and upserts `full_name`, `age`, `phone` into `profiles` table. |
| `app/onboarding.tsx` | 3-screen swipeable onboarding (native only). FlatList + pagingEnabled. Scan-line animation. Screen 3: INITIALIZE SYSTEM → `darko_onboarded=true` → `/auth`. |
| `app/decode.tsx` | Main chat screen. Streaming DARKO responses (SSE). Feature-gated by tier: DOSSIER (pro+), BRIEF (pro+), voice (pro+), image (pro+), daily msg limit (5 free / 30 pro). `PaywallModal` triggered on limit hits. Web: plain ScrollView + `scrollToEnd`. Native: inverted FlatList. Phase bar + phase unlock overlay. Dossier sliding panel. `CampaignBriefModal`. `BETA v1.0` badge in header. |
| `app/pricing.tsx` | Pricing page. Two cards: FREE and PRO. Side-by-side at ≥640px, stacked on mobile, max-width 720px. PRO shows `$0 for 4 days / then $15/month`. UPGRADE button → `create-checkout` edge function → Stripe URL. Pre-checkout DARKO ENGINE BETA warning card. Trial note: "4-day free trial. No charge until trial ends. Cancel anytime." |
| `app/payment-success.tsx` | Post-payment success screen. Calls `refreshTier()` after 2s delay to pull updated tier from DB. |
| `app/payment-cancel.tsx` | Post-payment cancel screen. No charges made message. |
| `app/contact.tsx` | Support page. Displays `donniedarkoapp@gmail.com`. `[ SEND EMAIL ]` button opens `mailto:donniedarkoapp@gmail.com?subject=DARKO%20Support%20Request`. Max-width 480px. |
| `app/privacy.tsx` | Privacy Policy screen. Nxgen Media LLC attribution at top. |
| `app/terms.tsx` | Terms of Service screen. Nxgen Media LLC attribution at top. |

### Services — `services/`

| File | Purpose |
|---|---|
| `services/darko.ts` | V3 service layer. `sendMessage()` — streaming fetch to `decode-intel`, SSE reader. Web: `fetch()` + `ReadableStream` + `TextDecoder`. Native: `require('react-native-sse').default`. `onChunk(accumulated)` per SSE event, `onComplete(DarkoResponse)` on stream end. `parseDarkoResponse()` extracts `// SCRIPT`, `// ALERT`, `// PHASE UPDATE`, `// READ`, `// CAMPAIGN` blocks. `transcribeAudio()`, `generateTargetProfile()`. Debounced profile refresh (3 min). |
| `services/storage.ts` | All Supabase CRUD. `saveMessage()`, `getConversation()`, `getTarget()`, `getTargetProfile()`, `saveTargetProfile()`, `getMissionPhase()`, `saveMissionPhase()`. Legacy: `getHistory()`, `addDecodeEntry()`. |
| `services/notifications.ts` | `registerPushToken()` — requests permission, gets Expo push token, upserts to `push_tokens`. |
| `services/decoder.ts` | Legacy V2 service. Still referenced by V2 code paths. |

### Context — `context/`

| File | Purpose |
|---|---|
| `context/UserContext.tsx` | `UserProvider` wraps entire app. Provides `tier` (`'free' \| 'pro' \| 'executive'`), `userId`, `refreshTier()`. Loads tier from `profiles` on auth state change. `TIER_LIMITS` exported: `free: { targets: 1, messagesPerTargetPerDay: 5 }`, `pro: { targets: 3, messagesPerTargetPerDay: 30 }`, `executive: { targets: 999, messagesPerTargetPerDay: 999 }`. |

### Components — `components/`

| File | Purpose |
|---|---|
| `components/PaywallModal.tsx` | Full-screen modal shown when free user hits tier limits. Shows DARKO PRO benefits, `$0 for 4 days / then $15/month`. `[ START FREE TRIAL ]` button calls `supabase.functions.invoke('create-checkout')` → opens Stripe URL via `Linking.openURL`. Trial note below button. |

### Hooks — `hooks/`

| File | Purpose |
|---|---|
| `hooks/useImagePicker.ts` | Web: `<input type="file" accept="image/*">` + `FileReader.readAsDataURL()`. Native: dynamic `import('expo-image-picker')`. |
| `hooks/useVoiceRecorder.ts` | Web: `navigator.mediaDevices.getUserMedia()` + `MediaRecorder` → Blob → base64. Native: dynamic `import('expo-audio')` + expo-file-system. |
| `hooks/useClipboard.ts` | Web: `navigator.clipboard.writeText()` with `execCommand` fallback. Native: dynamic `import('expo-clipboard')`. |

### Edge Functions — `supabase/functions/`

| Function | Purpose |
|---|---|
| `decode-intel` | V3 main AI engine. Conversational identity + 8 rules + block markers + framework library in `DARKO_SYSTEM_PROMPT`. Reads conversation history from `conversation_messages` (pro: last 50 msgs, free: last 10). RAG heuristic: skip for <20 words. Rate limit: 30/day free. Blocked words preflight. Streams via `streamGenerateContent?alt=sse` — SSE body forwarded to client. Image input supported. Temporal intelligence block injected on every call. |
| `generate-profile` | Generates full psychological dossier from decode history. Returns 20 fields: `operative_mistakes`, `target_communication_style`, `relationship_momentum`, `last_known_emotional_state`, MBTI, strengths/weaknesses, manipulation vectors, power dynamic, etc. |
| `transcribe-audio` | Transcribes audio via Gemini multimodal. Returns `{ text }`. |
| `check-campaigns` | Scheduled via pg_cron every 6h. Reads all `push_tokens`, checks alert conditions per target: SILENCE_WINDOW, ADVANCEMENT_SIGNAL, MISTAKE_FOLLOWUP, RE_ENGAGEMENT. Sends via Expo Push API. Debounce: max 1 alert per user per 20h via `last_alert_at`. |
| `create-checkout` | Creates Stripe Checkout Session via raw `fetch` to `https://api.stripe.com/v1/checkout/sessions`. **No Stripe SDK** (caused `Deno.core.runMicrotasks()` crash with esm.sh/npm imports). Params: `mode=subscription`, price, `success_url=https://darkoapp.com/payment-success`, `cancel_url=https://darkoapp.com/payment-cancel`, `client_reference_id=userId`, `subscription_data[trial_period_days]=4`, `subscription_data[metadata][userId]=userId`. Returns `{ url }`. |
| `stripe-webhook` | Verifies Stripe webhook signature. Handles: `checkout.session.completed` → updates `profiles.tier` + stores `stripe_customer_id`. `customer.subscription.updated` → re-checks price ID → updates tier. `customer.subscription.deleted` → downgrades to `'free'`. Uses `npm:stripe@14` for signature verification only. Tier lookup by `stripe_customer_id` for subscription events. |
| `health` | Pings `profiles` table. Returns `{ status, db, ts }` with 200/503. |
| `refresh-cache` | Creates Gemini context cache. NOTE: cachedContent not used (token overflow on 2.5-flash). Kept for reference. |

### Scripts — `scripts/`

| File | Purpose |
|---|---|
| `scripts/upload-books.js` | Uploads PDFs to Gemini File API. Writes URIs to `knowledge/file-refs.json`. |
| `scripts/create-cache.js` | Creates Gemini context cache. Writes cache name to `app_config`. |
| `scripts/test-darko.js` | 6-scenario integration test suite. |
| `scripts/migrate-to-conversations.ts` | One-time migration: `intelligence_logs` → `conversation_messages`. |

### Static — `public/`

| File | Purpose |
|---|---|
| `public/legal.html` | Standalone full HTML legal page. Served directly by Vercel at `/legal.html`. Contains both Privacy Policy (`#privacy`) and Terms of Service (`#tos`) sections. Linked from landing page footer and nav. |

### Config

| File | Purpose |
|---|---|
| `vercel.json` | `buildCommand: npx expo export --platform web`, `outputDirectory: dist`, `rewrites: [{ source: "/(.*)", destination: "/index.html" }]`. |
| `app.json` | Expo config. Scheme: `darko`. Web: `bundler: metro`, `output: single`. EAS projectId: `d9531d74-c9f3-486b-a10d-f836e7f12a0f`. iOS bundleIdentifier: `com.h2hofficially.darko`. `ITSAppUsesNonExemptEncryption: false`. |
| `eas.json` | EAS build profiles: development (internal), preview (internal), production (autoIncrement). |
| `.env.local` | Local secrets — gitignored. |

---

## Database

### Tables

| Table | Key Columns | Notes |
|---|---|---|
| `profiles` | `id` (FK auth.users), `tier` ('free'/'pro'/'executive'), `stripe_customer_id`, `full_name`, `age`, `phone` | One row per user. RLS: users own their row. `tier` defaults to 'free'. |
| `targets` | `id`, `user_id`, `target_alias`, `leverage`, `objective`, `behavioral_profile` (JSONB), `mission_phase` | RLS: users own their targets. CASCADE delete clears messages. |
| `conversation_messages` | `id`, `target_id`, `user_id`, `role` ('user'/'darko'), `content`, `structured_data` (JSONB), `entry_type` ('message'/'campaign_brief'/'alert'), `created_at` | V3 history. Index on (target_id, created_at). RLS. |
| `intelligence_logs` | `id`, `target_id`, `user_id`, `message_content` (JSONB), `created_at` | V2 legacy history. Superseded by `conversation_messages`. |
| `app_config` | `key`, `value` | Server-side config. `gemini_cache_name`. No RLS. |
| `push_tokens` | `user_id` (PK), `token`, `last_alert_at`, `updated_at` | No RLS — service role only. |
| `decode_counts` | `user_id`, `count`, `reset_date` | Daily rate limit tracking. |
| `book_passages` | `id`, `content`, `embedding` (vector), `book_title`, `chapter` | RAG source. pgvector. `search_book_passages` RPC. |

### Migrations

| File | Changes |
|---|---|
| `001_v2_schema.sql` | Core schema: profiles, targets, intelligence_logs, app_config. |
| `002_book_passages.sql` | RAG: book_passages + pgvector + search_book_passages RPC. |
| `003_push_tokens.sql` | push_tokens table. |
| `004_conversation_messages.sql` | V3 conversation_messages table. |
| `005_stripe.sql` | Adds `'executive'` to profiles tier CHECK. Adds `stripe_customer_id TEXT` column. |
| `006_profile_fields.sql` | Adds `full_name TEXT`, `age INTEGER`, `phone TEXT` to profiles. |

---

## Secrets

### Supabase Edge Function Secrets

| Secret | Status | Used By |
|---|---|---|
| `GEMINI_API_KEY` | ✓ Set | decode-intel, generate-profile, transcribe-audio |
| `STRIPE_SECRET_KEY` | ✓ Set (must set) | create-checkout, stripe-webhook |
| `STRIPE_WEBHOOK_SECRET` | ✓ Set (must set) | stripe-webhook (signature verification) |
| `SUPABASE_URL` | ✓ Auto-injected | all functions |
| `SUPABASE_ANON_KEY` | ✓ Auto-injected | all functions |
| `SUPABASE_SERVICE_ROLE_KEY` | ✓ Auto-injected | generate-profile, check-campaigns, stripe-webhook, health |

---

## Stripe

| Field | Value |
|---|---|
| Pro price ID | `price_1TFJfkEmZWsJibucl22phWB3` |
| Executive price ID | `price_1TFJfkEmZWsJibucAw0qXn6q` |
| Trial period | 4 days (`subscription_data[trial_period_days]=4`) |
| Pro price | $15/month (after trial) |
| Webhook endpoint | `https://adyebdcyqczhkluqgwvv.supabase.co/functions/v1/stripe-webhook` |
| Webhook events | `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted` |
| Success URL | `https://darkoapp.com/payment-success` |
| Cancel URL | `https://darkoapp.com/payment-cancel` |

### Tier Feature Gates (client-enforced)

| Feature | Free | Pro | Executive |
|---|---|---|---|
| Active targets | 1 | 3 | Unlimited |
| Messages/target/day | 5 | 30 | Unlimited |
| // DOSSIER | ✗ | ✓ | ✓ |
| // BRIEF | ✗ | ✓ | ✓ |
| Voice input | ✗ | ✓ | ✓ |
| Screenshot analysis | ✗ | ✓ | ✓ |
| Push notifications | ✗ | ✓ | ✓ |
| Conversation history (Gemini) | 10 msgs | 50 msgs | 50 msgs |

> Executive tier is invite-only. Not shown on pricing page.

---

## Gemini

| Field | Value |
|---|---|
| Model | `models/gemini-2.5-flash` |
| Context cache | NOT used (555K token overflow on 2.5-flash) |
| Book knowledge | RAG only — query embedding → `search_book_passages` → top 5 passages injected |
| Image input | Inline base64 in Gemini `contents` array |

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

## Auth Flow

1. **Signup:** Full Name + Age (18+ gate) + Email + Phone + Password → `supabase.auth.signUp()` with `user_metadata: { full_name, age, phone }` → confirmation email sent
2. **Email verification:** User clicks link → `https://darkoapp.com/auth/callback?code=...` → `exchangeCodeForSession(code)` → upserts `full_name`, `age`, `phone` from metadata to `profiles` table
3. **Login:** Email + password → `supabase.auth.signInWithPassword()` → redirect to `/`
4. **Session:** `UserProvider` loads `profiles.tier` on every auth state change → cached in React context

---

## Web Architecture

- **SPA mode:** `expo export --platform web` → `dist/` → Vercel serves `index.html` for all routes
- **Responsive pattern:** Outer `View` (flex:1, BG fills viewport) + inner column (maxWidth 480–720px, centered, hairline border on web)
- **Platform guards:** `Platform.OS === 'web'` throughout. `expo-notifications` and `react-native-sse` are `require()`d inside conditionals to avoid web crashes
- **Web SSE:** `fetch()` + `response.body.getReader()` + `TextDecoder` line-by-line SSE parsing
- **Web chat list:** Plain `ScrollView` + `onContentSizeChange → scrollToEnd`. Native uses inverted `FlatList`
- **Web modal:** `position: absolute` overlay inside the 480px column. Native uses `<Modal>`
- **Hover states:** `Pressable` `onHoverIn`/`onHoverOut` (RN 0.74+), no-op on native
- **Global CSS:** Injected at module level in `_layout.tsx` — font smoothing, dark scrollbar, cursor pointer

---

## Key Design Decisions & Known Issues

| Issue | Resolution |
|---|---|
| `expo-notifications` crashes on web | `require()` inside `Platform.OS !== 'web'` guard |
| `react-native-sse` broken on web | Replaced with native `fetch()` + `ReadableStream` SSE on web |
| Inverted FlatList broken on web | Platform-conditional: web uses forward ScrollView + scrollToEnd |
| Stripe SDK (`esm.sh` or `npm:`) crashed Supabase edge runtime with `Deno.core.runMicrotasks()` | Replaced with raw `fetch` to `api.stripe.com` — zero imports |
| `npm:stripe@14` also crashed on some deploys | create-checkout uses no SDK; stripe-webhook uses `npm:stripe@14` for signature verification only |
| SPA catch-all rewrite intercepts static files | Vercel serves static files before rewrites — `legal.html` serves correctly |

---

## DARKO Response Schema

### Standard decode
```json
{
  "intent": "text_back | strategic_advice | full_debrief",
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
  "target_profile": { "psychological_type": "", "attachment_style": "", "primary_vulnerability": "", "seduction_archetype_to_deploy": "", "key_insight": "" },
  "current_phase": 1,
  "phase_name": "",
  "phase_assessment": "",
  "immediate_next_move": "",
  "first_message_to_send": "",
  "first_message_rationale": "",
  "campaign_roadmap": [
    {
      "phase": 1,
      "phase_name": "INITIAL RECONNAISSANCE",
      "objective": "",
      "estimated_duration": "",
      "key_tactic": "",
      "behavioral_directives": [],
      "message_scripts": [{ "situation": "", "message": "", "effect": "" }],
      "advancement_signals": [],
      "mistakes_to_avoid": []
    }
  ],
  "handler_note": null
}
```

---

## Features Built

### Core AI
- [x] DARKO handler persona — cold autonomous advisor, streaming response
- [x] Full conversation history → Gemini multi-turn (pro: 50 msgs, free: 10)
- [x] RAG — query embedding → `search_book_passages` → top 5 passages per decode
- [x] Temporal intelligence block — days since last message, silence duration, auto-alerts
- [x] Myers-Briggs profiling — MBTI type, dominant/shadow function, seduction vulnerability
- [x] Auto profile refresh — fires non-blocking after every decode, saves 20-field dossier
- [x] Target communication style fed back into decode context
- [x] Blocked words preflight — 400 SECURE OVERRIDE
- [x] Rate limiting — server-side (30/day free), client-side (5 msgs/target/day free)

### Screens & UI
- [x] Landing page (web) — hero, features, footer with legal attribution
- [x] Auth — login (email+password) / signup (name, age, email, phone, password, 18+ gate)
- [x] Target profiles — leverage + objective, decode count, delete with CASCADE
- [x] Decode — chat UI, streaming bubbles, phase bar, phase unlock animation
- [x] // DOSSIER — 85%-width sliding panel, full psychological profile
- [x] // BRIEF — campaign planning modal, 7 guided fields, full roadmap response
- [x] Pricing page — FREE/PRO cards, 4-day free trial, pre-checkout beta warning
- [x] PaywallModal — triggered at all tier gates, inline Stripe checkout flow
- [x] Payment success/cancel screens
- [x] Contact/Support page — mailto link
- [x] Privacy, Terms pages — Nxgen Media LLC attribution
- [x] /legal.html — standalone comprehensive legal page with anchor links
- [x] BETA v1.0 badge — on landing, target list, and decode screen headers
- [x] Responsive web layout — max-width columns, side-by-side pricing cards ≥640px

### Input & Media
- [x] Screenshot upload — expo-image-picker, base64 inline to Gemini (pro only)
- [x] Voice recording + transcription — expo-audio → .m4a → Gemini multimodal, 60s auto-stop (pro only)
- [x] CMD > input, multiline, auto-send on Return

### Platform
- [x] Web SPA — Expo Metro bundler, `output: single`, Vercel deploy
- [x] Web SSE streaming — native fetch + ReadableStream
- [x] Web hover states — Pressable onHoverIn/Out
- [x] Web responsive modals — absolute-position overlay in 480px column
- [x] Push notifications (native EAS build only)
- [x] Onboarding flow (native only)

### Payments
- [x] Stripe Checkout — 4-day free trial → $15/month Pro
- [x] Webhook handler — tier upgrade/downgrade on Stripe events
- [x] Tier context — loaded from profiles on app start, refreshed after payment
- [x] Feature gating — targets, daily messages, dossier, brief, voice, image

---

## Pending / Known Issues

- [ ] Supabase CLI not authenticated in dev environment — edge functions must be deployed via Dashboard or after `supabase login`
- [ ] Run migration `005_stripe.sql` and `006_profile_fields.sql` in Supabase SQL Editor if not yet applied
- [ ] Stripe webhook endpoint must be created in Stripe Dashboard pointing to `https://adyebdcyqczhkluqgwvv.supabase.co/functions/v1/stripe-webhook`
- [ ] Supabase Auth → URL Configuration must have Site URL `https://darkoapp.com` and Redirect URL `https://darkoapp.com/auth/callback`
- [ ] Executive tier signup flow — currently invite-only with no UI path; would need manual tier update in DB
