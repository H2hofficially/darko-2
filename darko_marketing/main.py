"""
DARKO PIPELINE — MAIN ORCHESTRATOR
=====================================
Runs the full multi-agent content generation and distribution pipeline.

  [Module 1] IntelligenceScraper   →  gather & deduplicate intel
  [Module 2] SEOEngine             →  generate blog posts
  [Module 3] SocialWeaponizer      →  generate video scripts + X threads
  [Module 4] Publisher             →  distribute to X, Ghost CMS, video queue

USAGE:
    python main.py                          # full pipeline (generate only)
    python main.py --publish                # generate + publish all content
    python main.py --publish-only           # publish already-generated content
    python main.py --publish-status draft   # publish blogs as drafts (default)
    python main.py --seo-only               # blog posts only
    python main.py --social-only            # social content only
    python main.py --limit 3                # cap items per module (cost control)
    python main.py --dry-run                # scraper only, no LLM calls
    python main.py --status                 # show pipeline state and queue
    python main.py --schedule daily         # run pipeline on a daily schedule
    python main.py --schedule 6h            # run every 6 hours
"""

import argparse
import os
import sys
import time
from pathlib import Path

from dotenv import load_dotenv
load_dotenv()

from rich.console import Console
from rich.panel import Panel
from rich.rule import Rule
from rich.table import Table

console = Console(force_terminal=True)

DARKO_BANNER = r"""
 ██████╗  █████╗ ██████╗ ██╗  ██╗ ██████╗
 ██╔══██╗██╔══██╗██╔══██╗██║ ██╔╝██╔═══██╗
 ██║  ██║███████║██████╔╝█████╔╝ ██║   ██║
 ██║  ██║██╔══██║██╔══██╗██╔═██╗ ██║   ██║
 ██████╔╝██║  ██║██║  ██║██║  ██╗╚██████╔╝
 ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝
"""


def print_banner():
    console.print(f"[yellow]{DARKO_BANNER}[/yellow]")
    console.print(
        Panel.fit(
            "[white]RELATIONAL INTELLIGENCE ENGINE[/white]\n"
            "[dim]autonomous marketing system // v2.0[/dim]",
            border_style="yellow",
        )
    )


def validate_env() -> bool:
    provider = os.getenv("LLM_PROVIDER", "google").lower()
    if provider == "google":
        key = os.getenv("GOOGLE_API_KEY", "")
    elif provider == "anthropic":
        key = os.getenv("ANTHROPIC_API_KEY", "")
    else:
        key = os.getenv("OPENAI_API_KEY", "")
    if not key or key.startswith("your_"):
        console.print(
            f"[red]ERROR:[/red] No valid API key for provider '{provider}'.\n"
            f"       Copy [white].env.example[/white] → [white].env[/white] and add your key."
        )
        return False
    return True


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Darko Autonomous Marketing Pipeline",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    # Generation flags
    parser.add_argument("--seo-only", action="store_true", help="Run SEO engine only")
    parser.add_argument("--social-only", action="store_true", help="Run social weaponizer only")
    parser.add_argument("--dry-run", action="store_true", help="Run scraper only, skip LLM calls")
    parser.add_argument("--limit", type=int, default=None, help="Limit items per module")
    parser.add_argument("--delay", type=float, default=1.5, help="Delay between API calls (seconds)")

    # Distribution flags
    parser.add_argument("--publish", action="store_true", help="Publish content after generation")
    parser.add_argument("--publish-only", action="store_true", help="Skip generation, publish existing content")
    parser.add_argument(
        "--publish-status",
        choices=["draft", "published"],
        default="draft",
        help="Ghost CMS publish status (default: draft)",
    )

    # Utility flags
    parser.add_argument("--status", action="store_true", help="Show pipeline state and exit")
    parser.add_argument(
        "--schedule",
        metavar="INTERVAL",
        help="Run on schedule: 'daily', 'weekly', '6h', '12h'",
    )

    return parser.parse_args()


def run_pipeline(args) -> tuple[int, int, int, int]:
    """
    Execute one full pipeline run.
    Returns (seo_count, social_count, blogs_published, threads_published).
    """
    from state_manager import StateManager
    from intelligence_scraper import IntelligenceScraper
    from publisher import Publisher

    state = StateManager()

    # ── MODULE 1: SCRAPER ────────────────────────────────────────────────────
    console.print(Rule("[yellow]MODULE 1 // INTELLIGENCE SCRAPER[/yellow]"))
    scraper = IntelligenceScraper(seed=None, state=state)  # no fixed seed = fresh each run
    payload = scraper.export_to_json(output_dir="output")
    scraper.display_intel()

    if args.dry_run:
        console.print("\n[yellow]>[/yellow] Dry-run — stopping after scraper.\n")
        state.print_stats(console)
        return 0, 0, 0, 0

    seo_queries = payload["seo_queries"]
    social_scenarios = payload["social_scenarios"]

    if args.limit:
        seo_queries = seo_queries[: args.limit]
        social_scenarios = social_scenarios[: args.limit]
        console.print(f"[yellow]>[/yellow] Limit: {args.limit} items per module\n")

    seo_count = 0
    social_count = 0
    blogs_published = 0
    threads_published = 0

    # ── MODULE 2: SEO ENGINE ─────────────────────────────────────────────────
    if not args.social_only:
        console.print(Rule("[yellow]MODULE 2 // SEO ENGINE[/yellow]"))
        from seo_engine import SEOEngine
        engine = SEOEngine(state=state)
        posts = engine.run_batch(seo_queries, delay=args.delay)
        seo_count = len(posts)

    # ── MODULE 3: SOCIAL WEAPONIZER ──────────────────────────────────────────
    if not args.seo_only:
        console.print(Rule("[yellow]MODULE 3 // SOCIAL WEAPONIZER[/yellow]"))
        from social_weaponizer import SocialWeaponizer
        weaponizer = SocialWeaponizer(state=state)
        results = weaponizer.run_batch(social_scenarios, delay=args.delay * 2)
        social_count = len(results)

    # ── MODULE 4: PUBLISHER ──────────────────────────────────────────────────
    if args.publish or args.publish_only:
        console.print(Rule("[yellow]MODULE 4 // PUBLISHER[/yellow]"))
        pub = Publisher(state)

        if not args.social_only:
            console.print(f"\n[yellow]>[/yellow] Publishing blogs to Ghost ({args.publish_status})...")
            blogs_published = pub.publish_all_blogs(status=args.publish_status)

        if not args.seo_only:
            console.print(f"\n[yellow]>[/yellow] Posting threads to X...")
            threads_published = pub.publish_all_threads()

        pub.print_video_queue()

    return seo_count, social_count, blogs_published, threads_published


def print_summary(
    seo_count: int,
    social_count: int,
    blogs_published: int,
    threads_published: int,
    elapsed: float,
):
    table = Table(
        title="[yellow]PIPELINE SUMMARY[/yellow]",
        border_style="yellow",
        header_style="bold yellow",
    )
    table.add_column("MODULE", style="white")
    table.add_column("GENERATED", style="yellow", justify="right")
    table.add_column("PUBLISHED", style="green", justify="right")
    table.add_column("LOCATION", style="dim white")

    if seo_count:
        table.add_row("SEO Engine", str(seo_count), str(blogs_published) or "—", "output/blogs/")
    if social_count:
        table.add_row(
            "Social Weaponizer",
            f"{social_count * 2} ({social_count}v + {social_count}t)",
            str(threads_published) if threads_published else "—",
            "output/social/ + output/threads/",
        )
    table.add_row("Elapsed", "—", "—", f"{elapsed:.1f}s")

    console.print(table)
    console.print(
        f"\n[yellow]>[/yellow] CTA: [white]darkoapp.kit.com[/white]\n"
        f"[yellow]>[/yellow] State tracked in: [white]output/state.json[/white]\n"
    )


def parse_schedule_interval(schedule_str: str) -> int:
    """Convert schedule string to seconds."""
    s = schedule_str.lower().strip()
    if s == "daily":
        return 86400
    if s == "weekly":
        return 604800
    if s.endswith("h"):
        return int(s[:-1]) * 3600
    if s.endswith("m"):
        return int(s[:-1]) * 60
    raise ValueError(f"Unknown schedule interval: {schedule_str}. Use: daily, weekly, 6h, 12h, 30m")


def run_scheduled(args):
    """Run the pipeline on a recurring schedule."""
    try:
        interval_seconds = parse_schedule_interval(args.schedule)
    except ValueError as e:
        console.print(f"[red]ERROR:[/red] {e}")
        sys.exit(1)

    console.print(
        Panel.fit(
            f"[bold yellow]DARKO // SCHEDULER ACTIVE[/bold yellow]\n"
            f"[white]Interval: {args.schedule} ({interval_seconds}s)[/white]\n"
            f"[dim]Press Ctrl+C to stop.[/dim]",
            border_style="yellow",
        )
    )

    run_count = 0
    while True:
        run_count += 1
        console.print(Rule(f"[yellow]SCHEDULED RUN #{run_count}[/yellow]"))
        start = time.time()

        try:
            seo_count, social_count, blogs_pub, threads_pub = run_pipeline(args)
            elapsed = time.time() - start
            print_summary(seo_count, social_count, blogs_pub, threads_pub, elapsed)
        except Exception as e:
            console.print(f"[red]ERROR in scheduled run:[/red] {e}")

        next_run = time.strftime(
            "%Y-%m-%d %H:%M:%S",
            time.localtime(time.time() + interval_seconds),
        )
        console.print(f"\n[yellow]>[/yellow] Next run: [white]{next_run}[/white]")

        try:
            time.sleep(interval_seconds)
        except KeyboardInterrupt:
            console.print("\n[yellow]>[/yellow] Scheduler stopped.\n")
            break


def main():
    args = parse_args()
    print_banner()

    # ── STATUS MODE ──────────────────────────────────────────────────────────
    if args.status:
        from state_manager import StateManager
        from publisher import Publisher
        state = StateManager()
        pub = Publisher(state)
        pub.print_status()
        return

    # ── PUBLISH-ONLY MODE ────────────────────────────────────────────────────
    if args.publish_only:
        console.print(Rule("[yellow]MODULE 4 // PUBLISHER (PUBLISH-ONLY MODE)[/yellow]"))
        from state_manager import StateManager
        from publisher import Publisher
        state = StateManager()
        pub = Publisher(state)

        blogs_pub = pub.publish_all_blogs(status=args.publish_status)
        threads_pub = pub.publish_all_threads()
        pub.print_video_queue()
        pub.print_status()
        return

    # ── ENV CHECK ────────────────────────────────────────────────────────────
    if not args.dry_run and not validate_env():
        sys.exit(1)

    # ── SCHEDULED MODE ───────────────────────────────────────────────────────
    if args.schedule:
        run_scheduled(args)
        return

    # ── SINGLE RUN ───────────────────────────────────────────────────────────
    start = time.time()
    seo_count, social_count, blogs_pub, threads_pub = run_pipeline(args)
    elapsed = time.time() - start

    console.print(Rule("[yellow]PIPELINE COMPLETE[/yellow]"))
    print_summary(seo_count, social_count, blogs_pub, threads_pub, elapsed)


if __name__ == "__main__":
    main()
