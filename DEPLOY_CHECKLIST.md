# Darko Deploy Checklist

**Scope:** web (the **app**, at `terminal.darkoapp.com` on Netlify) + Supabase Edge Functions. No EAS / App Store / Play Store steps — the phone uses the same web bundle.

> ⚠️ **Two separate sites — do not confuse them:**
> - **App** → `terminal.darkoapp.com` — Netlify project `lambent-pastelito-8f8b69`, repo `H2hofficially/darko-2` (this checkout). **This checklist is about this site.**
> - **Marketing** → `darkoapp.com` — Netlify project `darko-marketing`, repo `H2hofficially/darko-marketing` (Astro, separate).
> Verify app changes at `terminal.darkoapp.com`. `darkoapp.com` will never reflect app commits.

**Source branch:** `main`. Netlify auto-builds on push.
**Working dir:** `C:\Users\hpsbm\Desktop\darko\` (plain checkout — there is no worktree).
**Supabase project ref:** `adyebdcyqczhkluqgwvv`
**Deploy token:** lives in `SUPABASE_ACCESS_TOKEN` env var. If a deploy 401s, the token rotated — re-prompt for a fresh one rather than hardcoding.

---

## Pre-Deploy

- [ ] `git status` clean on `main`
- [ ] If any SVG in `public/` was touched, ran `node scripts/rasterize-icons.mjs` and committed the regenerated PNGs + `favicon.ico`
- [ ] If `app/+html.tsx` icon/OG meta changed, eyeballed the rendered HTML in dev
- [ ] If an edge function was touched (`decode-intel`, `check-campaigns`, `transcribe-audio`, `generate-profile`, `refresh-cache`, `seed-rag*`, `rag-probe`, `purge-rag-books`): tested locally or on a throwaway deploy before promoting
- [ ] If model wiring changed: verified model string in the function source matches intent (DeepSeek Reasoner primary on `decode-intel`, Gemini 2.5 Flash fallback)
- [ ] If schema/data changed: SQL ready to paste into Supabase Studio SQL Editor (postgres role bypasses RLS)
- [ ] If `cachedContent` is anywhere in a Gemini call path: **stop** — 2.5-flash overflows 1M tokens. Use inline `system_instruction` only.
- [ ] Secrets/env: any new keys added to Netlify project settings AND to Supabase function secrets

## Deploy

- [ ] **Edge functions first** (if any changed):
  ```
  SUPABASE_ACCESS_TOKEN=$env:SUPABASE_ACCESS_TOKEN ~/bin/supabase functions deploy <name> \
    --project-ref adyebdcyqczhkluqgwvv --use-api --no-verify-jwt
  ```
- [ ] **Migrations next** (if any): paste SQL into Supabase Dashboard → SQL Editor
- [ ] **Frontend last:** `git push origin main` — Netlify auto-builds, deploys `dist/` from `npx expo export --platform web`
- [ ] Watch the Netlify build log to green
- [ ] Hit `terminal.darkoapp.com` on desktop — app renders, no console errors
- [ ] Hit `terminal.darkoapp.com` on phone (Safari + Chrome) — same. Same web bundle, no separate native channel
- [ ] Smoke test the decode flow: paste a thread → decode-intel returns intel → DossierPanel slides in

## Post-Deploy

- [ ] If an edge function deployed, tail logs in Supabase Dashboard for ~5 min — no 5xx spike
- [ ] If a migration ran, sanity-check one or two affected rows
- [ ] If a RAG seed function deployed, hit it once (`curl -X POST https://adyebdcyqczhkluqgwvv.supabase.co/functions/v1/<name>`) and verify row count in `book_passages`
- [ ] If Gemini Files API was involved and >48h since last upload: re-run `upload-books.js` then `create-cache.js` — files expire after 48h

## Rollback Triggers

- `decode-intel` 5xx rate climbs noticeably above baseline within first 15 minutes
- Decode latency creeps past ~30s (baseline ~10–15s for DeepSeek, ~5–8s for Gemini fallback)
- Wordmark / favicon broken on `terminal.darkoapp.com` (font-metric trap on rasters)
- App blank or layout-broken on phone Safari
- RAG passage injection returns empty or off-topic results (use `rag-probe` to diagnose)

## Rollback Mechanics

- **Frontend:** Netlify Dashboard → Deploys → previous deploy → "Publish deploy"
- **Edge functions:** redeploy the prior version from git:
  ```
  git checkout <prev-sha> -- supabase/functions/<name>
  SUPABASE_ACCESS_TOKEN=$env:SUPABASE_ACCESS_TOKEN ~/bin/supabase functions deploy <name> \
    --project-ref adyebdcyqczhkluqgwvv --use-api --no-verify-jwt
  git checkout HEAD -- supabase/functions/<name>
  ```
- **Migrations:** write the inverse SQL ahead of time when the migration is destructive. DROP COLUMN / DROP TABLE need an explicit undo plan.
- **RAG seed accidents:** `purge-rag-books` with `{book_names: [...], confirm: true}` removes a book's passages; re-run the seed function to repopulate.
