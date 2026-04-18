"""
DARKO SEO ENGINE — MODULE 2
=============================
Takes SEO queries from the Intelligence Scraper and generates
full Markdown blog posts that simulate the Darko decode experience.

Each post is structured as an actual Darko analysis — not marketing copy —
so the reader experiences the product while consuming the content.
"""

import json
import time
from pathlib import Path
from dataclasses import dataclass

from rich.console import Console
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn

from llm_client import LLMClient

console = Console()


# ──────────────────────────────────────────────────────────────────────────────
# DARKO SEO SYSTEM PROMPT — PRODUCT SIMULATION PROTOCOL
# ──────────────────────────────────────────────────────────────────────────────

DARKO_SEO_SYSTEM_PROMPT = """
You are DARKO — a weaponized intelligence system that decodes relationship dynamics
using Robert Greene's power frameworks, Freudian psychoanalysis, and Attachment Theory.

Your job: write a long-form SEO blog post that DOMINATES Google results for a given keyword,
while converting anxious men into Darko closed-beta waitlist signups.

BRAND IDENTITY:
- Cold. Calculated. Machiavellian. Zero softness.
- You are NOT a therapist. You are NOT a life coach. You do NOT validate emotions.
  You decode power structures and deliver leverage.

CRITICAL: This blog post IS the Darko product experience. The reader must feel
like they are using the app right now — receiving a real decode, not reading
marketing content. The post structure mirrors the app's output format exactly.
Every section should feel like a direct transmission from an intelligence system,
not an article.

ABSOLUTE PROHIBITIONS:
- Do NOT say "just communicate your feelings openly."
- Do NOT say "have an honest conversation about your needs."
- Do NOT suggest therapy, journaling, or vulnerability exercises.
- Do NOT use emojis. Ever.
- Do NOT use puns, wordplay, or humor.
- Do NOT use therapy-speak: "boundaries," "self-care," "healing," "toxic" used softly.
- Do NOT hedge. No "it depends" or "every situation is different."
- Do NOT be encouraging or warm. Warmth is weakness here.
- Do NOT write like a blogger. Write like an intelligence system delivering a report.

BLOG POST FORMAT — STRICTLY FOLLOW THIS STRUCTURE:

---
title: [KEYWORD reframed as a power-dynamic statement, all caps, cold]
meta_description: [1 sentence. State the brutal truth. No filler. Under 160 chars.]
---

# [TITLE]

> [Opening thesis — 1–2 sentences. Strip the emotional framing. State what is
>  actually happening in terms of power, frame, and incentive structures.
>  This is the hook. Make it impossible to scroll past.]

---

## [SIGNAL DETECTED]

[Paragraph: Name exactly what signal the reader is responding to. Be specific.
Decode the behavior in clinical terms. No comfort. Pure diagnosis.]

## [PSYCHOLOGICAL ARCHITECTURE]

[Paragraph: Identify the sender's attachment style and the defense mechanism
at play. Name it precisely. Freudian lens. Greene lens. Both where applicable.]

## [POWER DYNAMIC BREAKDOWN]

**[The Psyche]** — [2–3 sentences. The sender's actual intent decoded cold and clinical.
What they want. What they fear. What they are testing for.]

**[The Script]** — [The exact reply the reader should send. Under 15 words.
All lowercase. No punctuation flourishes. Present it on its own line.
This IS the Darko output — format it like the app would display it.]

> `[exact reply text here]`

**[Why It Works]** — [2–3 sentences. The specific leverage gained. Reference a law
of power or psychological principle. State the frame shift precisely.]

## [COMMON FAILURE MODE]

[Paragraph: Describe the weak, reactive move most men make in this situation.
Diagnose it psychologically. Show exactly how it accelerates their loss of leverage.
Be brutal. This is what Darko exists to prevent.]

## [THE DARKO PROTOCOL]

[4–5 short, numbered directives. Cold. Tactical. No motivation. No pep talk.
These are instructions from a system that has processed thousands of these dynamics.
Each directive should feel like a command, not a suggestion.]

## [FINAL ASSESSMENT]

[1–2 paragraphs. A verdict. State the outcome if the protocol is executed correctly.
Reference a power principle. End cold. No warmth.]

---
*DARKO decodes these dynamics in real-time. Join the closed beta:*
**[darkoapp.kit.com](https://darkoapp.kit.com)**

---

WORD COUNT TARGET: 950–1400 words.
OUTPUT: Raw Markdown only. No preamble. No explanation. Start with the frontmatter dashes.
"""


# ──────────────────────────────────────────────────────────────────────────────
# DATA MODEL
# ──────────────────────────────────────────────────────────────────────────────

@dataclass
class BlogPost:
    keyword: str
    slug: str
    filename: str
    content: str
    tokens_used: int


# ──────────────────────────────────────────────────────────────────────────────
# SEO ENGINE
# ──────────────────────────────────────────────────────────────────────────────

class SEOEngine:

    def __init__(self, output_dir: str = "output/blogs", state=None):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.llm = LLMClient()
        self.state = state
        self.generated: list[BlogPost] = []

    def _build_user_prompt(self, query: dict) -> str:
        return f"""
ASSIGNMENT: Generate a full Darko SEO blog post for the following keyword.

TARGET KEYWORD: "{query['keyword']}"
SEARCH INTENT: {query['search_intent']}
CATEGORY: {query['category']}
ESTIMATED MONTHLY SEARCHES: {query['monthly_volume_estimate']}

READER PROFILE:
The man searching this keyword is 18–35. He is in a state of anxious uncertainty
about a specific texting dynamic. He is looking for emotional answers. What he
actually needs is a power-dynamic reframe that shifts him from emotional reaction
to calculated leverage.

This post must simulate the actual Darko product experience. The [The Script]
section must contain a real, deployable reply he can send right now.
The [The Darko Protocol] must be specific to this exact scenario, not generic advice.

Drive him to the waitlist at darkoapp.kit.com.

BEGIN THE BLOG POST NOW:
"""

    def generate_blog(self, query: dict) -> BlogPost | None:
        keyword = query["keyword"]

        # Skip if already generated
        if self.state and self.state.is_generated(keyword):
            console.print(f"  [dim]→ skipping (already generated): {keyword}[/dim]")
            return None

        slug = keyword.lower().replace(" ", "-").replace("'", "").replace(",", "").replace("?", "")
        console.print(f"\n[yellow]>[/yellow] Generating: [white]{keyword}[/white]")

        content, tokens = self.llm.complete(
            user_prompt=self._build_user_prompt(query),
            system_prompt=DARKO_SEO_SYSTEM_PROMPT,
            max_tokens=2200,
        )

        filename = f"{slug}.md"
        (self.output_dir / filename).write_text(content, encoding="utf-8")

        post = BlogPost(
            keyword=keyword,
            slug=slug,
            filename=filename,
            content=content,
            tokens_used=tokens,
        )
        self.generated.append(post)

        if self.state:
            self.state.mark_generated(keyword, {
                "type": "blog",
                "filename": filename,
                "category": query.get("category"),
                "tokens": tokens,
            })

        return post

    def run_batch(self, queries: list[dict], delay: float = 1.5) -> list[BlogPost]:
        console.print(
            Panel.fit(
                "[bold yellow]DARKO // SEO ENGINE[/bold yellow]\n"
                f"[white]{len(queries)} keywords queued[/white]",
                border_style="yellow",
            )
        )

        results: list[BlogPost] = []
        with Progress(
            SpinnerColumn(style="yellow"),
            TextColumn("[progress.description]{task.description}"),
            console=console,
        ) as progress:
            task = progress.add_task("Generating...", total=len(queries))
            for i, query in enumerate(queries, 1):
                progress.update(task, description=f"[{i}/{len(queries)}] {query['keyword'][:50]}")
                try:
                    post = self.generate_blog(query)
                    if post:
                        results.append(post)
                        console.print(
                            f"  [green]✓[/green] Saved → [white]output/blogs/{post.filename}[/white] "
                            f"[dim]({post.tokens_used} tokens)[/dim]"
                        )
                except Exception as e:
                    console.print(f"  [red]✗[/red] Failed: {query['keyword']} — {e}")

                progress.advance(task)
                if i < len(queries):
                    time.sleep(delay)

        self._write_manifest(results)
        return results

    def _write_manifest(self, posts: list[BlogPost]):
        manifest = [
            {
                "keyword": p.keyword,
                "slug": p.slug,
                "filename": p.filename,
                "tokens_used": p.tokens_used,
            }
            for p in posts
        ]
        (self.output_dir / "_manifest.json").write_text(
            json.dumps(manifest, indent=2), encoding="utf-8"
        )
        console.print(
            f"\n[yellow]>[/yellow] Manifest → [white]output/blogs/_manifest.json[/white]"
        )
        total_tokens = sum(p.tokens_used for p in posts)
        console.print(f"[yellow]>[/yellow] Total tokens: [white]{total_tokens:,}[/white]")


# ──────────────────────────────────────────────────────────────────────────────
# STANDALONE TEST
# ──────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    intel_path = Path("output/intelligence.json")
    if not intel_path.exists():
        console.print("[red]ERROR:[/red] Run intelligence_scraper.py first.")
        raise SystemExit(1)

    intel = json.loads(intel_path.read_text(encoding="utf-8"))
    engine = SEOEngine()
    posts = engine.run_batch(intel["seo_queries"])
    console.print(
        f"\n[bold yellow]DARKO SEO ENGINE COMPLETE[/bold yellow] — "
        f"[white]{len(posts)} blog posts generated[/white]\n"
    )
