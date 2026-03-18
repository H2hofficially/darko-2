# GitHub Actions Setup

## Required Secrets

Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add these three secrets:

| Secret name | Where to find it |
|---|---|
| `GEMINI_API_KEY` | Google AI Studio → API keys |
| `SUPABASE_URL` | Supabase project → Settings → API → Project URL |
| `SUPABASE_ANON_KEY` | Supabase project → Settings → API → anon public key |

## Workflows

### `refresh-cache.yml`

Runs `node scripts/create-cache.js` every day at 2am UTC to keep the Gemini context cache alive (TTL is 24h). Also has a manual trigger button in the GitHub Actions tab.

The script reads `knowledge/file-refs.json` (committed to the repo) for the Gemini file URIs, then creates a new cache and writes the new cache name to Supabase `app_config`.

**Note:** The Gemini file uploads (`node scripts/upload-books.js`) do NOT need to run daily — uploaded files persist indefinitely. Only the cache needs daily renewal.
