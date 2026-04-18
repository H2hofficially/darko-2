"""
DARKO INTELLIGENCE SCRAPER — MODULE 1
======================================
Feeds the pipeline with two input types:
  1. SEO Queries   — long-tail keywords for blog generation
  2. Social Scenarios — realistic toxic texts for social content generation

Input sources (in priority order):
  1. Reddit live scraper (requires REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET in .env)
  2. Expanded static bank — 60+ curated, realistic scenarios (always available)

Deduplication is enforced via StateManager — already-generated content is
automatically skipped so every run produces fresh output.
"""

import json
import os
import re
import random
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Literal

from rich.console import Console
from rich.panel import Panel
from rich.table import Table

console = Console()


# ──────────────────────────────────────────────────────────────────────────────
# DATA MODELS
# ──────────────────────────────────────────────────────────────────────────────

@dataclass
class SEOQuery:
    keyword: str
    search_intent: str
    monthly_volume_estimate: int
    difficulty: Literal["low", "medium", "high"]
    category: str


@dataclass
class SocialScenario:
    toxic_text: str
    sender_archetype: str
    dynamic: str
    urgency: Literal["low", "medium", "high"]


# ──────────────────────────────────────────────────────────────────────────────
# SEO QUERY BANK  (expanded — high-intent, long-tail, brand-aligned)
# ──────────────────────────────────────────────────────────────────────────────

SEO_QUERY_BANK: list[SEOQuery] = [
    # texting anxiety
    SEOQuery("why did she leave me on read", "informational", 14800, "low", "texting-anxiety"),
    SEOQuery("why does she take hours to text back", "informational", 11000, "medium", "texting-anxiety"),
    SEOQuery("she replied with one word what does it mean", "informational", 6500, "low", "signal-decoding"),
    SEOQuery("why do girls take so long to reply", "informational", 9800, "low", "texting-anxiety"),
    SEOQuery("she used to text me first now she doesn't", "informational", 5400, "low", "texting-anxiety"),
    SEOQuery("she texts me every day but won't date me", "informational", 7200, "medium", "signal-decoding"),
    # frame control
    SEOQuery("how to not look desperate over text", "informational", 9300, "medium", "frame-control"),
    SEOQuery("how to make her chase you over text", "informational", 18700, "high", "frame-control"),
    SEOQuery("how to pass a shit test over text", "informational", 8200, "low", "shit-tests"),
    SEOQuery("why do women test you over text", "informational", 4400, "low", "shit-tests"),
    SEOQuery("how to respond to mixed signals text messages", "informational", 7200, "medium", "signal-decoding"),
    SEOQuery("how to maintain frame when she pulls away", "informational", 3900, "low", "frame-control"),
    SEOQuery("what to text a girl who is losing interest", "informational", 12100, "medium", "frame-control"),
    SEOQuery("how to stop being needy over text", "informational", 8600, "medium", "frame-control"),
    # ghosting
    SEOQuery("what to say when a girl ghosts you then comes back", "informational", 12400, "medium", "ghosting"),
    SEOQuery("she ghosted me for a week then texted back", "informational", 8900, "low", "ghosting"),
    SEOQuery("should I text her after being ghosted", "informational", 15600, "high", "ghosting"),
    SEOQuery("why do girls ghost and come back", "informational", 11200, "medium", "ghosting"),
    # post-breakup
    SEOQuery("she said she misses me after breaking up", "informational", 9100, "medium", "post-breakup"),
    SEOQuery("ex texted me out of nowhere what does it mean", "informational", 13500, "medium", "post-breakup"),
    SEOQuery("how to respond to ex who wants to be friends", "informational", 7800, "medium", "post-breakup"),
    SEOQuery("she broke up with me but still texts me daily", "informational", 6300, "low", "post-breakup"),
    # specific scenarios
    SEOQuery("she said she needs space what to text back", "informational", 7800, "low", "shit-tests"),
    SEOQuery("why does she keep texting me when she has a boyfriend", "informational", 5600, "low", "signal-decoding"),
    SEOQuery("she said lets just be friends what to reply", "informational", 10400, "medium", "frame-control"),
    SEOQuery("she takes 3 days to reply but acts normal when she does", "informational", 4100, "low", "signal-decoding"),
    SEOQuery("she said im not ready for a relationship how to respond", "informational", 8700, "medium", "shit-tests"),
    SEOQuery("what to do when she posts on instagram but ignores you", "informational", 5200, "low", "texting-anxiety"),
]


# ──────────────────────────────────────────────────────────────────────────────
# SOCIAL SCENARIO BANK  (60+ realistic, diverse, high-virality scenarios)
# ──────────────────────────────────────────────────────────────────────────────

SOCIAL_SCENARIO_BANK: list[SocialScenario] = [

    # ── BREADCRUMBING ────────────────────────────────────────────────────────
    SocialScenario("I'm not ready for a relationship but I like hanging out with you", "Avoidant", "breadcrumbing", "high"),
    SocialScenario("I've been thinking about you but I'm just really busy right now", "Avoidant", "breadcrumbing", "high"),
    SocialScenario("We should definitely hang out again soon", "Avoidant", "breadcrumbing", "medium"),
    SocialScenario("You're literally the only person who actually gets me", "Covert Narcissist", "breadcrumbing", "high"),
    SocialScenario("Miss you", "Power Player", "breadcrumbing", "high"),
    SocialScenario("I keep starting a text to you then deleting it", "Fearful-Avoidant", "breadcrumbing", "medium"),

    # ── PUSH-PULL ────────────────────────────────────────────────────────────
    SocialScenario("Sorry just saw this 12 hours later lol", "Power Player", "push-pull", "high"),
    SocialScenario("I miss you but I don't think we should be together", "Fearful-Avoidant", "push-pull", "high"),
    SocialScenario("You're amazing but the timing is just wrong", "Fearful-Avoidant", "push-pull", "high"),
    SocialScenario("I was going to call you but then I got scared", "Fearful-Avoidant", "push-pull", "medium"),
    SocialScenario("Every time we talk I remember why I liked you", "Avoidant", "push-pull", "high"),
    SocialScenario("I can't stop thinking about you but I need to", "Fearful-Avoidant", "push-pull", "high"),
    SocialScenario("You make things complicated in the best and worst way", "Covert Narcissist", "push-pull", "medium"),

    # ── GUILT-TRIP ───────────────────────────────────────────────────────────
    SocialScenario("I think we need to talk... can we call later?", "Anxious-Preoccupied", "guilt-trip", "medium"),
    SocialScenario("I just feel like you don't really care sometimes", "Anxious-Preoccupied", "guilt-trip", "medium"),
    SocialScenario("I guess I just expected more from you", "Anxious-Preoccupied", "guilt-trip", "high"),
    SocialScenario("Everyone in my life eventually lets me down", "Anxious-Preoccupied", "guilt-trip", "medium"),
    SocialScenario("I waited all day for you to reach out", "Anxious-Preoccupied", "guilt-trip", "high"),
    SocialScenario("It's fine. I'll figure it out on my own like always.", "Anxious-Preoccupied", "guilt-trip", "high"),

    # ── LOVE-BOMBING ─────────────────────────────────────────────────────────
    SocialScenario("You're honestly not like other guys, you actually get it", "Covert Narcissist", "love-bombing", "high"),
    SocialScenario("I've never connected with anyone like this before", "Covert Narcissist", "love-bombing", "high"),
    SocialScenario("You make everything better just by existing", "Covert Narcissist", "love-bombing", "high"),
    SocialScenario("I was telling my friends about you and they said I sound obsessed lol", "Covert Narcissist", "love-bombing", "medium"),
    SocialScenario("Honestly I don't know what I'd do without you at this point", "Anxious-Preoccupied", "love-bombing", "medium"),

    # ── STONEWALLING ─────────────────────────────────────────────────────────
    SocialScenario("I'm not mad. I just need some time.", "Fearful-Avoidant", "stonewalling", "medium"),
    SocialScenario("I don't really want to talk about it", "Avoidant", "stonewalling", "medium"),
    SocialScenario("I'm fine.", "Fearful-Avoidant", "stonewalling", "high"),
    SocialScenario("You wouldn't understand", "Avoidant", "stonewalling", "medium"),
    SocialScenario("Can we just not do this right now", "Fearful-Avoidant", "stonewalling", "high"),

    # ── TRIANGULATION ────────────────────────────────────────────────────────
    SocialScenario("My ex just texted me out of nowhere... this is so stressful", "Covert Narcissist", "triangulation", "high"),
    SocialScenario("This guy from work keeps asking me out, it's honestly annoying", "Covert Narcissist", "triangulation", "high"),
    SocialScenario("I was out with [name] last night, sorry I missed your text", "Power Player", "triangulation", "high"),
    SocialScenario("Honestly you remind me of my ex so much it's scary", "Covert Narcissist", "triangulation", "medium"),
    SocialScenario("Someone asked me out today. I didn't know what to say.", "Covert Narcissist", "triangulation", "high"),

    # ── SURVEILLANCE-ESCALATION ──────────────────────────────────────────────
    SocialScenario("I saw you were active on instagram but didn't reply to me", "Anxious-Preoccupied", "surveillance-escalation", "high"),
    SocialScenario("You liked her photo at 11pm", "Anxious-Preoccupied", "surveillance-escalation", "high"),
    SocialScenario("Your snap score went up by like 50 since we last talked", "Anxious-Preoccupied", "surveillance-escalation", "high"),
    SocialScenario("You were online at 2am but left me on delivered", "Anxious-Preoccupied", "surveillance-escalation", "high"),

    # ── FRAME-DOWNGRADE ──────────────────────────────────────────────────────
    SocialScenario("Can we just be friends with benefits? I think that would be easier", "Avoidant", "frame-downgrade", "high"),
    SocialScenario("What if we just kept it casual?", "Avoidant", "frame-downgrade", "high"),
    SocialScenario("I like you but I'm not looking for anything serious right now", "Avoidant", "frame-downgrade", "high"),
    SocialScenario("Let's just see what happens", "Avoidant", "frame-downgrade", "medium"),
    SocialScenario("I think we should just be friends", "Avoidant", "frame-downgrade", "high"),

    # ── GASLIGHTING ──────────────────────────────────────────────────────────
    SocialScenario("You always do this. You never listen to me.", "Anxious-Preoccupied", "gaslighting", "medium"),
    SocialScenario("I never said that, you're remembering it wrong", "Covert Narcissist", "gaslighting", "high"),
    SocialScenario("You're too sensitive, I was just joking", "Covert Narcissist", "gaslighting", "high"),
    SocialScenario("You're overthinking this as usual", "Covert Narcissist", "gaslighting", "high"),
    SocialScenario("Why do you always make everything so dramatic", "Covert Narcissist", "gaslighting", "high"),
    SocialScenario("That's not what happened and you know it", "Covert Narcissist", "gaslighting", "medium"),

    # ── PLAUSIBLE DENIABILITY ────────────────────────────────────────────────
    SocialScenario("We should hang out sometime :)", "Avoidant", "plausible-deniability", "medium"),
    SocialScenario("Maybe we could grab coffee or something idk", "Avoidant", "plausible-deniability", "medium"),
    SocialScenario("If you're ever in my area feel free to hit me up", "Avoidant", "plausible-deniability", "low"),
    SocialScenario("We should do something at some point", "Avoidant", "plausible-deniability", "low"),

    # ── POST-BREAKUP REENTRY ─────────────────────────────────────────────────
    SocialScenario("I've been thinking about us a lot lately", "Fearful-Avoidant", "post-breakup-reentry", "high"),
    SocialScenario("I think I made a mistake", "Fearful-Avoidant", "post-breakup-reentry", "high"),
    SocialScenario("I miss how things were with us", "Anxious-Preoccupied", "post-breakup-reentry", "high"),
    SocialScenario("Are you seeing anyone?", "Covert Narcissist", "post-breakup-reentry", "high"),
    SocialScenario("I saw something today that reminded me of you", "Fearful-Avoidant", "post-breakup-reentry", "medium"),

    # ── FUTURE-FAKING ────────────────────────────────────────────────────────
    SocialScenario("We should go to [place] together someday", "Avoidant", "future-faking", "medium"),
    SocialScenario("When things calm down I want to take you on a real date", "Avoidant", "future-faking", "high"),
    SocialScenario("I want us to be something, just not right now", "Fearful-Avoidant", "future-faking", "high"),

    # ── SOFT REJECTION ───────────────────────────────────────────────────────
    SocialScenario("I'm just in a really weird place right now", "Avoidant", "soft-rejection", "medium"),
    SocialScenario("I need to focus on myself for a while", "Avoidant", "soft-rejection", "high"),
    SocialScenario("You deserve someone who can give you what you need", "Fearful-Avoidant", "soft-rejection", "high"),
    SocialScenario("I don't think I'm emotionally available right now", "Avoidant", "soft-rejection", "medium"),

    # ── FRAME TESTS ──────────────────────────────────────────────────────────
    SocialScenario("If you actually cared you would have called by now", "Anxious-Preoccupied", "frame-test", "high"),
    SocialScenario("Other guys don't make me feel like this", "Power Player", "frame-test", "high"),
    SocialScenario("My friends think I should stop talking to you", "Anxious-Preoccupied", "frame-test", "medium"),
    SocialScenario("I don't know why I always end up talking to you", "Fearful-Avoidant", "frame-test", "medium"),
]


# ──────────────────────────────────────────────────────────────────────────────
# DYNAMIC / ARCHETYPE CLASSIFIER  (for Reddit-sourced scenarios)
# ──────────────────────────────────────────────────────────────────────────────

_DYNAMIC_PATTERNS: list[tuple[str, list[str]]] = [
    ("surveillance-escalation", ["active on", "snap score", "liked her photo", "seen at", "online but"]),
    ("love-bombing",           ["never connected", "only person", "make everything better", "obsessed"]),
    ("gaslighting",            ["you always", "too sensitive", "overthinking", "you're remembering", "dramatic", "never said"]),
    ("triangulation",          ["my ex", "guy from work", "someone else", "keeps asking me out", "reminds me of my ex"]),
    ("frame-downgrade",        ["casual", "friends with benefits", "not serious", "see what happens", "just friends"]),
    ("guilt-trip",             ["expected more", "lets me down", "waited all day", "don't care", "like always"]),
    ("stonewalling",           ["i'm fine", "need time", "don't want to talk", "wouldn't understand", "not right now"]),
    ("future-faking",          ["someday", "when things calm", "one day", "eventually", "at some point"]),
    ("post-breakup-reentry",   ["i made a mistake", "thinking about us", "miss how things were", "are you seeing"]),
    ("soft-rejection",         ["weird place", "focus on myself", "emotionally available", "deserve better"]),
    ("frame-test",             ["if you actually", "other guys", "my friends think", "don't know why i"]),
    ("breadcrumbing",          ["busy", "miss you but", "like hanging out", "thinking about you but", "the only person"]),
    ("push-pull",              ["miss you but", "scared", "amazing but", "can't stop thinking", "best and worst"]),
    ("plausible-deniability",  ["sometime", "idk", "feel free", "at some point", "if you want"]),
]

_ARCHETYPE_PATTERNS: list[tuple[str, list[str]]] = [
    ("Covert Narcissist",    ["only person", "never connected", "reminds me of my ex", "obsessed", "my ex texted"]),
    ("Anxious-Preoccupied",  ["waited", "active on", "snap score", "expected more", "my friends think", "you always"]),
    ("Fearful-Avoidant",     ["scared", "amazing but", "can't commit", "want to but", "made a mistake", "weird place"]),
    ("Power Player",         ["late reply", "lol", "saw this", "12 hours", "other guys"]),
    ("Avoidant",             ["need space", "not ready", "busy", "overwhelmed", "need time", "not serious", "casual"]),
]


def _classify_dynamic(text: str) -> str:
    lower = text.lower()
    for dynamic, keywords in _DYNAMIC_PATTERNS:
        if any(kw in lower for kw in keywords):
            return dynamic
    return "mixed-signals"


def _classify_archetype(text: str) -> str:
    lower = text.lower()
    for archetype, keywords in _ARCHETYPE_PATTERNS:
        if any(kw in lower for kw in keywords):
            return archetype
    return "Fearful-Avoidant"


# ──────────────────────────────────────────────────────────────────────────────
# REDDIT SCRAPER  (live — requires credentials in .env)
# ──────────────────────────────────────────────────────────────────────────────

class RedditScraper:
    """
    Pulls trending relationship scenarios from Reddit.
    Extracts quoted text messages from post bodies.
    Gracefully returns [] if credentials are missing or PRAW is unavailable.
    """

    SUBREDDITS = ["dating", "relationship_advice", "datingadvice", "texting"]
    QUOTE_RE = re.compile(r'"([^"]{20,200})"')

    def __init__(self):
        self.reddit = self._connect()

    def _connect(self):
        client_id = os.getenv("REDDIT_CLIENT_ID")
        client_secret = os.getenv("REDDIT_CLIENT_SECRET")
        if not (client_id and client_secret):
            return None
        try:
            import praw
            return praw.Reddit(
                client_id=client_id,
                client_secret=client_secret,
                user_agent=os.getenv("REDDIT_USER_AGENT", "darko-intel/1.0"),
            )
        except Exception:
            return None

    def is_available(self) -> bool:
        return self.reddit is not None

    def fetch(self, limit: int = 30) -> list[SocialScenario]:
        if not self.is_available():
            return []

        scenarios: list[SocialScenario] = []

        try:
            for sub_name in self.SUBREDDITS:
                subreddit = self.reddit.subreddit(sub_name)
                for post in subreddit.hot(limit=25):
                    scenario = self._extract_scenario(post)
                    if scenario and not self._is_duplicate(scenario, scenarios):
                        scenarios.append(scenario)
                    if len(scenarios) >= limit:
                        break
                if len(scenarios) >= limit:
                    break
        except Exception:
            pass

        return scenarios

    def _extract_scenario(self, post) -> SocialScenario | None:
        body = getattr(post, "selftext", "") or ""
        quoted = self.QUOTE_RE.findall(body)

        candidates = [q for q in quoted if len(q.split()) >= 4]
        if not candidates:
            return None

        text = candidates[0]
        combined = text + " " + (post.title or "")
        urgency = "high" if post.score > 1000 else "medium" if post.score > 200 else "low"

        return SocialScenario(
            toxic_text=text.strip(),
            sender_archetype=_classify_archetype(combined),
            dynamic=_classify_dynamic(combined),
            urgency=urgency,
        )

    def _is_duplicate(self, candidate: SocialScenario, existing: list[SocialScenario]) -> bool:
        c = candidate.toxic_text.lower()
        return any(c == s.toxic_text.lower() for s in existing)


# ──────────────────────────────────────────────────────────────────────────────
# INTELLIGENCE SCRAPER  (orchestrator)
# ──────────────────────────────────────────────────────────────────────────────

class IntelligenceScraper:
    """
    Orchestrates all input sources and delivers a deduplicated, filtered
    payload to the rest of the pipeline.

    Args:
        seed: Random seed for reproducible static-bank shuffling.
        state: Optional StateManager. When provided, already-generated
               content is automatically excluded.
    """

    def __init__(self, seed: int | None = None, state=None):
        if seed is not None:
            random.seed(seed)
        self.state = state
        self._reddit = RedditScraper()

    # ── SEO ──────────────────────────────────────────────────────────────────

    def get_seo_queries(
        self,
        limit: int | None = None,
        category: str | None = None,
        min_volume: int = 0,
    ) -> list[SEOQuery]:
        pool = SEO_QUERY_BANK.copy()

        if category:
            pool = [q for q in pool if q.category == category]
        pool = [q for q in pool if q.monthly_volume_estimate >= min_volume]
        pool.sort(key=lambda q: q.monthly_volume_estimate, reverse=True)

        # Skip already-generated
        if self.state:
            pool = [q for q in pool if not self.state.is_generated(q.keyword)]

        if limit:
            pool = pool[:limit]

        return pool

    # ── SOCIAL ───────────────────────────────────────────────────────────────

    def get_social_scenarios(
        self,
        limit: int | None = None,
        urgency: Literal["low", "medium", "high"] | None = None,
        dynamic: str | None = None,
    ) -> list[SocialScenario]:

        # 1. Try Reddit live data first
        reddit_scenarios = self._reddit.fetch(limit=40) if self._reddit.is_available() else []

        # 2. Merge with static bank (Reddit first for freshness)
        static = SOCIAL_SCENARIO_BANK.copy()
        random.shuffle(static)
        pool = reddit_scenarios + static

        # 3. Deduplicate by text
        seen: set[str] = set()
        deduped: list[SocialScenario] = []
        for s in pool:
            key = s.toxic_text.strip().lower()
            if key not in seen:
                seen.add(key)
                deduped.append(s)

        # 4. Filter
        if urgency:
            deduped = [s for s in deduped if s.urgency == urgency]
        if dynamic:
            deduped = [s for s in deduped if dynamic.lower() in s.dynamic.lower()]

        # 5. Skip already-generated
        if self.state:
            deduped = [s for s in deduped if not self.state.is_generated(s.toxic_text)]

        if limit:
            deduped = deduped[:limit]

        return deduped

    # ── EXPORT ───────────────────────────────────────────────────────────────

    def export_to_json(self, output_dir: str = "output") -> dict:
        """Dump full intel payload to JSON for pipeline consumption."""
        Path(output_dir).mkdir(parents=True, exist_ok=True)

        seo = [asdict(q) for q in self.get_seo_queries()]
        social = [asdict(s) for s in self.get_social_scenarios()]

        payload = {"seo_queries": seo, "social_scenarios": social}

        out_path = Path(output_dir) / "intelligence.json"
        out_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
        return payload

    # ── DISPLAY ──────────────────────────────────────────────────────────────

    def display_intel(self) -> None:
        reddit_status = "[green]LIVE[/green]" if self._reddit.is_available() else "[yellow]OFFLINE — using static bank[/yellow]"

        console.print(
            Panel.fit(
                "[bold yellow]DARKO // INTELLIGENCE SCRAPER[/bold yellow]\n"
                f"[white]INPUT LAYER INITIALIZED[/white]   Reddit: {reddit_status}",
                border_style="yellow",
            )
        )

        seo_table = Table(
            title="[yellow]SEO QUERY BANK[/yellow]",
            border_style="white",
            header_style="bold yellow",
            show_lines=True,
        )
        seo_table.add_column("KEYWORD", style="white", min_width=45)
        seo_table.add_column("VOL/MO", style="yellow", justify="right")
        seo_table.add_column("DIFF", style="white")
        seo_table.add_column("CATEGORY", style="white")

        for q in self.get_seo_queries():
            diff_color = {"low": "green", "medium": "yellow", "high": "red"}[q.difficulty]
            seo_table.add_row(
                q.keyword,
                f"{q.monthly_volume_estimate:,}",
                f"[{diff_color}]{q.difficulty}[/{diff_color}]",
                q.category,
            )
        console.print(seo_table)

        social_table = Table(
            title="[yellow]SOCIAL SCENARIO BANK[/yellow]",
            border_style="white",
            header_style="bold yellow",
            show_lines=True,
        )
        social_table.add_column("TOXIC TEXT", style="white", min_width=55)
        social_table.add_column("ARCHETYPE", style="yellow")
        social_table.add_column("DYNAMIC", style="white")
        social_table.add_column("URGENCY", style="white")

        for s in self.get_social_scenarios():
            urg_color = {"low": "green", "medium": "yellow", "high": "red"}[s.urgency]
            social_table.add_row(
                f'"{s.toxic_text}"',
                s.sender_archetype,
                s.dynamic,
                f"[{urg_color}]{s.urgency}[/{urg_color}]",
            )
        console.print(social_table)


# ──────────────────────────────────────────────────────────────────────────────
# STANDALONE TEST
# ──────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    scraper = IntelligenceScraper(seed=42)
    scraper.display_intel()
    payload = scraper.export_to_json()
    console.print(f"\n[yellow]>[/yellow] Intel exported → [white]output/intelligence.json[/white]")
    console.print(f"[yellow]>[/yellow] {len(payload['seo_queries'])} SEO queries available")
    console.print(f"[yellow]>[/yellow] {len(payload['social_scenarios'])} social scenarios available\n")
