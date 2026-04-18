# DARKO — RELATIONAL INTELLIGENCE ENGINE
## Multi-Agent Content Generation System

```
██████╗  █████╗ ██████╗ ██╗  ██╗ ██████╗
██╔══██╗██╔══██╗██╔══██╗██║ ██╔╝██╔═══██╗
██║  ██║███████║██████╔╝█████╔╝ ██║   ██║
██║  ██║██╔══██║██╔══██╗██╔═██╗ ██║   ██║
██████╔╝██║  ██║██║  ██║██║  ██╗╚██████╔╝
╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝
```

Automates SEO blog generation and short-form social content (TikTok/Reels/X threads)
at scale. Powered by Anthropic Claude or OpenAI GPT-4o. All outputs are calibrated to
the Darko brand identity and drive traffic to the closed beta at **darkoapp.kit.com**.

---

## ARCHITECTURE

```
darko/
├── main.py                   ← Orchestrator (run this)
├── intelligence_scraper.py   ← Module 1: Input layer
├── seo_engine.py             ← Module 2: Blog post generator
├── social_weaponizer.py      ← Module 3: Video scripts + X threads
├── requirements.txt
├── .env.example              ← Copy to .env and add your API key
└── output/
    ├── intelligence.json     ← Scraped intel (auto-generated)
    ├── blogs/                ← Markdown blog posts
    │   └── _manifest.json
    ├── social/               ← TikTok/Reels video scripts
    ├── threads/              ← X (Twitter) threads
    └── social_manifest.json
```

---

## SETUP

### 1. Create & activate a virtual environment

```bash
python -m venv .venv

# macOS / Linux
source .venv/bin/activate

# Windows
.venv\Scripts\activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure your API key

```bash
cp .env.example .env
```

Edit `.env` and set your key:

```
# For Anthropic (recommended):
ANTHROPIC_API_KEY=sk-ant-...
LLM_PROVIDER=anthropic

# OR for OpenAI:
OPENAI_API_KEY=sk-...
LLM_PROVIDER=openai
```

---

## RUNNING THE PIPELINE

### Full pipeline (all 3 modules)
```bash
python main.py
```

### SEO blog posts only
```bash
python main.py --seo-only
```

### Social content only (video scripts + X threads)
```bash
python main.py --social-only
```

### Dry run (scraper only, no LLM calls — test your setup)
```bash
python main.py --dry-run
```

### Limit items (useful for testing cost before full run)
```bash
python main.py --limit 2
```

### Run individual modules directly
```bash
python intelligence_scraper.py    # view intel, export to output/intelligence.json
python seo_engine.py              # requires output/intelligence.json
python social_weaponizer.py       # requires output/intelligence.json
```

---

## OUTPUT FORMAT

### Blog Posts (`output/blogs/*.md`)
Full Markdown with frontmatter, structured as:
- Opening power-dynamic thesis
- Psychological mechanism breakdown
- The 3-Part Payload: [The Psyche] → [The Script] → [Why It Works]
- The Darko Protocol (action framework)
- CTA → darkoapp.kit.com

### Video Scripts (`output/social/*_video.md`)
Timestamped production scripts for TikTok/Reels:
- 0:00–0:02 — iOS notification visual hook
- 0:02–0:05 — Cold audio hook
- 0:05–0:25 — The Psyche (psychological breakdown, terminal aesthetic)
- 0:25–0:38 — The Darko Script (exact reply, blinking cursor)
- 0:38–0:48 — Why It Works
- 0:48–0:55 — CTA → darkoapp.kit.com

### X Threads (`output/threads/*_thread.md`)
8-tweet threads:
- Tweet 1: Hook (toxic text + cold verdict)
- Tweets 2–4: Archetype, power dynamic, common mistake
- Tweet 5: [The Psyche]
- Tweet 6: [The Script]
- Tweet 7: [Why It Works]
- Tweet 8: CTA → darkoapp.kit.com

---

## PRODUCTION EXTENSIONS

Replace the static data banks in `intelligence_scraper.py` with:

| Source | Library | What to pull |
|---|---|---|
| Google Search | `serpapi` | Rising long-tail queries |
| Reddit | `praw` | r/dating, r/relationship_advice top posts |
| X/Twitter | `tweepy` | Trending relationship discourse |
| Google Search Console | GSC API | Your own impression/click data |

---

## TOKEN COST ESTIMATES

| Run | Queries | Approx Tokens | Approx Cost (Claude Opus) |
|---|---|---|---|
| Test (`--limit 2`) | 2 SEO + 2 Social | ~12,000 | ~$0.18 |
| Full SEO only | 12 queries | ~36,000 | ~$0.54 |
| Full Social only | 12 scenarios × 2 | ~48,000 | ~$0.72 |
| Full pipeline | 12 + 12 | ~84,000 | ~$1.26 |

*Estimates based on Claude claude-opus-4-5 pricing as of mid-2025. Actual costs vary.*

---

## BRAND PROTOCOL SUMMARY

Every LLM system prompt in this codebase enforces:

- **Tone:** Cold, calculated, Machiavellian — zero softness, zero emojis
- **Framework:** Robert Greene × Freud × Attachment Theory
- **3-Part Payload:** [The Psyche] → [The Script] → [Why It Works]
- **Forbidden:** "communicate your feelings," "just be yourself," therapy-speak
- **CTA:** All content drives to `darkoapp.kit.com`
