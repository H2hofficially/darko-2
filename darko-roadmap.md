# Darko — Consistency Audit & Roadmap

Date: 18 May 2026
Scope: marketing site (darkoapp.com), terminal app (terminal.darkoapp.com), and the mockup files in this folder
Files reviewed: `darko-final.html`, `darko-terminal.html`, `darko-redesign.html`, the live production site

---

## 1. Consistency Check — Mockups vs Production

The mockups in this folder (`darko-final.html` and `darko-terminal.html`) are internally consistent. They share design tokens (glass surfaces, ambient page glow, layered shadows, sharp edges, the same typography pairing), and they read as one product across marketing and app.

Production is not yet consistent with the mockups, and there are real inconsistencies inside production itself. The list below is what to reconcile.

### 1.1 Pricing units — critical trust break

Marketing `/pricing` describes the product in **decodes** ("5 decodes per month", "150 decodes per month", "unlimited decodes"). In-app `/pricing` describes the same plans in **messages** and **sessions** ("3 sessions/day", "150 messages per month", "last 100 messages memory"). A user who signs up expecting one unit and discovers another mid-flow has been mis-sold.

Decision required: pick one unit (decode is the on-brand one — it implies an analytic act, not a metered text) and use it on both surfaces. The in-app feature comparison table also uses both units interchangeably; that needs to be aligned at the same time.

### 1.2 Doctrine vs. Acquire-Target modal — positioning tension

The doctrine page publishes the four refutations under "What Darko is not," explicitly disclaiming "manipulation engine," "pickup product," "wellness coaching," "therapy." Then the in-app `ACQUIRE TARGET` modal asks for `LEVERAGE — what they have over you` and `OBJECTIVE — what you want from them`. The two surfaces argue against each other. The modal language wins the argument because UI is more credible than prose.

This is a positioning decision, not a copy fix. Two clean resolutions:

Option A — soften the modal copy (the version applied in `darko-terminal.html`): `CONTEXT — what's the dynamic` + `OBJECTIVE — what you'd like to read clearly`. Keeps the operator chrome, removes the predator framing.

Option B — drop the "Not a manipulation engine" line from the doctrine and own the operator framing throughout. Riskier from a payment-processor / app-store / press standpoint, more honest if it's the actual product.

Holding both is the worst outcome.

### 1.3 Thinker deep-dive pages are 404

The doctrine page's seven canon entries each show a `deep dive →` arrow. Following any of them currently redirects to `terminal.darkoapp.com` (the app, not a content page). That means seven long-tail keyword targets (`48 laws of power applied to dating`, `Cialdini influence in modern relationships`, etc.) are dead air, and the marketing page is making a content promise it doesn't keep.

Fix one of two ways: build the seven pages (mockup pattern shown in `darko-redesign.html` under the THINKER tab) or remove the `deep dive →` arrows from the doctrine page until they exist.

### 1.4 Glossary structure — partial SEO leak

The glossary index page has solid bones (each term has its own URL, individual entries have full content + source citation + "the psychology" section + related terms). Two structural fixes are still needed in production:

The term names on the index page are inside `<a class="card">` elements with no `<h2>` wrapping. Crawlers and AI engines parse glossary structure through heading hierarchy. Wrapping each term name in `<h2>` is a single-file fix.

The category chips (ATTACHMENT / CONFLICT / MANIPULATION / STRATEGY) are JS-only filters with no routes. Each one should be a real URL (`/glossary/attachment/`, etc.) — four free SEO landing pages with their own meta + schema.

The current count is 9 terms. The mockup expands to 22; competitors in the space typically run 40–100. Each missing term is a missing long-tail keyword.

### 1.5 Off-brand color in production dossier

The dossier's `BUILD` phase pill is purple in production. Every other accent surface uses neon yellow-green. Either standardize all phase pills to the brand neon, or commit to a four-color semantic system (Approach blue / Build neon / Decide amber / Commit green — the pattern applied in `darko-terminal.html`). Either is fine; mixing one purple pill with otherwise-monochrome neon brand is the worst spot.

### 1.6 Phase reference system

The dossier panel shows phase tabs labeled `APPROACH / BUILD / DECIDE / COMMIT` (names). The same panel has a button labeled `ADVANCE TO PHASE 3 →` (numbers). Pick one referent system on both surfaces.

### 1.7 Hero subtitle vs doctrine grid vs meta description

The current hero subtitle on `darko-final.html` names three thinkers (Greene, Cialdini, Machiavelli). The doctrine grid below names seven (adds Sun Tzu, Bowlby, Freud, Gottman). The `<meta name="description">` tag still names all seven. The trimmed hero reads better visually, but the inconsistency means a sharp reader sees "real psychology frameworks from three people" up top and "Seven minds. One engine." three sections down.

Minor. Either bring the hero subtitle back in line ("Built on the canon of power and attachment — Greene, Cialdini, Bowlby, Gottman, and others.") or let the inconsistency stand as a deliberate funnel — short hero, deep doctrine.

### 1.8 The "no signup · no card" promise

The hero on the live marketing site says "one free decode · no signup · no card" and the CTA routes to a signup form. The mockup fixes this with an embedded inline decoder. Until production embeds an actual no-signup decode on the homepage, the microcopy is making a promise the next click breaks.

### 1.9 Sharp edges

The mockups in this folder now use `border-radius: 0` on every structural element. Production still uses rounded corners on cards, buttons, pills, and the dossier panel. Migrating production to sharp edges is a global CSS token change — about thirty lines of CSS in a typical design system file.

---

## 2. What's Designed vs What's Missing

This section inventories what's been built (in production or in mockups) and what's missing entirely.

### 2.1 Marketing surfaces

| Surface | In production | In mockups | Status |
|---|---|---|---|
| Homepage | yes | `darko-final.html` | mockup adds inline decode + glass + sharp edges |
| Pricing page | yes | `darko-final.html` | mockup unifies with in-app units |
| Doctrine page | yes | `darko-redesign.html` (DOCTRINE tab) | mockup adds TOC, byline, working deep-dive links |
| Glossary index | yes | `darko-redesign.html` (GLOSSARY tab) | mockup adds H2 wrapping, routed chips, 22 terms |
| Glossary entry pages | yes | `darko-redesign.html` (ENTRY tab) | mockup adds FAQ schema, DefinedTerm schema, expert quote |
| Thinker pages (`/doctrine/[name]`) | no — currently 404 | `darko-redesign.html` (THINKER tab) | needs to be built |
| Blog | yes (linked in nav) | not in mockups | needs content strategy + design pass |
| FAQ | yes (on homepage) | yes | aligned |
| Privacy / Terms | likely exists | not in mockups | needs design consistency pass |
| `/sitemap.xml`, `/robots.txt` | unknown | n/a | verify SEO infrastructure |

### 2.2 Auth flow

| Surface | In production | In mockups | Status |
|---|---|---|---|
| Sign-up | yes | `darko-redesign.html` (SIGN UP tab) | mockup removes phone, adds SSO, adds consent checkbox |
| Sign-in | yes | `darko-redesign.html` (SIGN IN tab) | mockup adds forgot-password, persistent toggle |
| Forgot password | no | not yet built | needs to be built |
| Email verification | unknown | not in mockups | needs to be built or verified |
| 2FA setup | no | mentioned only | needs to be built (optional) |
| SSO callback handler | no | not in mockups | needs to be built |

### 2.3 In-app surfaces

| Surface | In production | In mockups | Status |
|---|---|---|---|
| Targets list | yes | `darko-terminal.html` (TARGETS) | mockup adds empty state + glass treatment |
| Dossier panel | yes | `darko-terminal.html` | mockup fixes purple pill, widens column, consistent phase naming |
| Acquire-target modal | yes | `darko-terminal.html` | mockup softens predator field copy |
| In-app pricing | yes | `darko-terminal.html` | mockup aligns units with marketing |
| Decode screen (paste + analyze) | unknown — gated on test account | NOT in any mockup | **the single biggest design gap** — this is the core product action and there's no mockup for it |
| Onboarding / first-run | no | not in mockups | needs to be built |
| Settings / account | no — wasn't visible in nav | not in mockups | needs to be built |
| Billing / subscription management | no — outside Stripe-hosted | not in mockups | needs in-product surface |
| Campaign history view | no | not in mockups | promised in Executive tier; needs to exist |
| Phase tracking timeline | no | not in mockups | promised in Operator tier; needs to exist |
| Voice input UI | no | not in mockups | promised in Operator tier; entry point missing |
| Image input UI | no | not in mockups | promised in Operator tier; entry point missing |
| Crisis mode | no | not in mockups | promised in Executive tier; UI unknown |
| Teaching layer | no | not in mockups | promised in Executive tier; UI unknown |
| Monthly audits | no | not in mockups | promised in Executive tier; UI unknown |
| Proactive check-ins | no | not in mockups | promised in Executive tier; UI unknown |

### 2.4 System surfaces

| Surface | Status |
|---|---|
| Empty states (beyond `/targets`) | mostly missing |
| Error states (failed decode, network error, payment failed) | not designed |
| Loading states (real, not demo) | not designed |
| Confirmation modals (delete target, cancel subscription) | not designed |
| Toast / notification system | not designed |
| Search (across targets, decodes, glossary) | not built |
| Mobile views | mockups are responsive but no real mobile review done |

---

## 3. The Single Biggest Gap

**The decode screen.** The action a user actually takes — paste a thread, click run, see the engine return its read — has no mockup and I couldn't reach it in production on the Free account. Everything else on this list is supporting infrastructure for this one screen. The marketing site's live decode demo is doing a great job *previewing* it, but a Free user signing up and landing on `/targets` with no obvious "do the thing" path is the conversion failure mode this product is most exposed to.

The decode screen should reuse the live-decode-demo aesthetic from the marketing site one-to-one: the same operator log frame, the same column layout (thread on the left with disambiguated sender bubbles, verdict block on the right with archetype / power_dyn / momentum / next / do not / confidence), the same `// DIRECTIVE` block at the bottom typed out in mono. Same fonts, same colors, same layout. The demo is the spec. Most of the visual work is done — the engineering work is wiring real input and real model output into the same UI.

This is what I'd build next before anything else on this list.

---

## 4. Priority Order — What to Ship

Subtractive principle: each tier below should be fully shipped before the next is started. Half-shipping across tiers is what got the site into the current state where the marketing promises features the product doesn't make visible.

### Tier 1 — Trust-break fixes (do first; small)

1. Reconcile pricing units across marketing and in-app. Pick "decodes" and use it everywhere.
2. Either build the seven thinker pages or remove the `deep dive →` links from doctrine.
3. Resolve the doctrine-vs-acquire-modal manipulation tension. Pick a side.
4. Remove phone from signup. Add Google + Apple SSO. Add the terms+privacy consent checkbox. Add forgot-password.
5. Fix the "no signup · no card" promise on the hero. Either embed the inline decode, or change the microcopy.

None of these are redesigns. They are policy decisions and small code patches against existing surfaces. This whole tier should ship in a single sprint.

### Tier 2 — The core product action (do second; medium)

1. Build the decode screen. Use the marketing live-decode demo as the spec.
2. Build a first-run onboarding flow that lands a new user on a decode entry point, not on empty `/targets`.
3. Build the proper empty state for `/targets`.
4. Apply the sharp-edge, glass-surface, ambient-glow tokens from the mockups to all production surfaces.

After this tier, the product reads as complete to a new user.

### Tier 3 — The paid-tier features that pricing promises (do third; medium-large)

The marketing site sells these; the product doesn't yet show them. Order roughly by leverage:

1. Phase tracking timeline — visual progression of a campaign over time (promised at Operator). This is the differentiator pricing leans on.
2. Voice input entry point + transcription preview before decode.
3. Image input entry point + OCR preview before decode.
4. Campaign history view — list of past decodes per target.
5. Persistent dossier deepening — show how the behavioral profile grows over time.

Until these exist, Operator and Executive tiers can't be honestly defended in conversation. Right now the difference is mostly "more of the same plus features that aren't visible."

### Tier 4 — Account infrastructure (do fourth; medium)

1. Settings page (profile, account, privacy, notifications).
2. Billing / subscription management (likely a Stripe customer portal link, plus a thin in-app wrapper).
3. Data export.
4. Account deletion flow.
5. Email verification on signup (if not already wired).

This is where compliance and retention live. It's invisible until something goes wrong; when something goes wrong it's everything.

### Tier 5 — System polish (parallel to Tier 4)

1. Error states for the decode flow (engine timeout, network error, content too short, content too long).
2. Loading states (real ones — the marketing demo's stylized loading is for marketing).
3. Confirmation modals for destructive actions (delete target, cancel subscription).
4. Toast / notification system.
5. Search across targets and the glossary.
6. Mobile-specific review on every shipped surface.

### Tier 6 — The Executive-tier features (do last; large, defer until subscriber demand justifies)

1. Crisis mode. UI unknown — defining what this is, is the first step before designing it.
2. Teaching layer. Same.
3. Monthly campaign audits.
4. Proactive check-ins.

These are described in pricing but not defined in product. I'd remove the bullets from the pricing card until the features exist, rather than promise them and not deliver.

---

## 5. What Not to Do Next

Naming this explicitly because the conversational pattern that produced the current state of the site has been "build another prototype" — including in our exchanges this week.

Don't generate another mockup file until Tier 1 of the priority order above has shipped. The mockups in this folder cover everything Tier 1 needs as a visual spec. The next action is a code patch, not a prototype.

Don't add a ninth or tenth screen to the redesign tabs file (`darko-redesign.html`). The screens that file is missing — the decode screen, onboarding, settings — should not be designed in isolation. They should be designed against the live database, real plan limits, real model outputs, real auth state. Mockups of those screens without the underlying integrations are decoration.

Don't accept new feature pitches into the Executive tier until the existing features are visible in product. Every line item in that pricing card is currently a promise; the cumulative weight of unfulfilled promises is what makes the product feel less premium than its marketing.

---

## 6. Files in this folder

- `darko-final.html` — final marketing homepage mockup. Single file, one scroll. Glass surfaces, sharp edges, ambient glow. Use as the spec for the marketing redesign.
- `darko-terminal.html` — post-login app mockup. Targets + dossier, empty state, acquire modal (softened), in-app pricing (units aligned). Use as the spec for the app redesign.
- `darko-redesign.html` — earlier multi-tab exploration. Contains the doctrine, glossary, glossary-entry, thinker, sign-up, and sign-in mockups. Use as the spec for those surfaces, but be aware the home/decoder/auth panels were superseded by `darko-final.html` and `darko-terminal.html`.
- `darko-design-review.md` — original written review of the production site. Still accurate.
- `darko-roadmap.md` — this document.

If you implement in the priority order in section 4, by the end of Tier 2 every conversion-critical surface is consistent across marketing and product. By the end of Tier 4 the product is institutionally complete. Tiers 5 and 6 are polish and stretch.
