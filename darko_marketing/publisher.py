"""
DARKO PUBLISHER — DISTRIBUTION MODULE
=======================================
Distributes generated content to:
  - X (Twitter): posts threads via API v2 (requires tweepy + credentials)
  - Ghost CMS: publishes blog posts via Admin API (requires Ghost keys)
  - Video queue: logs video scripts for manual TikTok/Reels upload

All platforms degrade gracefully — if credentials are missing, the module
skips that platform and logs the content path for manual distribution.
"""

import json
import os
import time
from pathlib import Path
from typing import Any

from rich.console import Console
from rich.panel import Panel
from rich.table import Table

console = Console()


# ──────────────────────────────────────────────────────────────────────────────
# GHOST CMS CLIENT
# ──────────────────────────────────────────────────────────────────────────────

class GhostClient:
    """
    Publishes Markdown blog posts to Ghost CMS via the Admin API.
    Requires GHOST_API_URL and GHOST_ADMIN_API_KEY in .env.
    """

    def __init__(self):
        self.api_url = os.getenv("GHOST_API_URL", "").rstrip("/")
        self.admin_key = os.getenv("GHOST_ADMIN_API_KEY", "")
        self._available = bool(self.api_url and self.admin_key and "your_" not in self.admin_key)

    def is_available(self) -> bool:
        return self._available

    def _generate_token(self) -> str:
        """Generate a short-lived JWT for Ghost Admin API."""
        try:
            import jwt
        except ImportError:
            console.print("[red]ERROR:[/red] PyJWT not installed. Run: pip install PyJWT")
            return ""

        key_id, secret = self.admin_key.split(":")
        iat = int(time.time())

        header = {"alg": "HS256", "typ": "JWT", "kid": key_id}
        payload = {
            "iat": iat,
            "exp": iat + 300,  # 5 minutes
            "aud": "/admin/",
        }

        return jwt.encode(payload, bytes.fromhex(secret), algorithm="HS256", headers=header)

    def publish_post(
        self,
        title: str,
        markdown_content: str,
        slug: str,
        status: str = "draft",
        tags: list[str] | None = None,
    ) -> dict | None:
        """Publish a post to Ghost. Returns the Ghost post object or None."""
        if not self._available:
            return None

        try:
            import httpx
        except ImportError:
            console.print("[red]ERROR:[/red] httpx not installed.")
            return None

        token = self._generate_token()
        if not token:
            return None

        url = f"{self.api_url}/ghost/api/admin/posts/?source=html"
        headers = {"Authorization": f"Ghost {token}"}

        post_body = {
            "posts": [
                {
                    "title": title,
                    "slug": slug,
                    "mobiledoc": json.dumps({
                        "version": "0.3.1",
                        "markups": [],
                        "atoms": [],
                        "cards": [["markdown", {"markdown": markdown_content}]],
                        "sections": [[10, 0]],
                    }),
                    "status": status,
                    "tags": [{"name": t} for t in (tags or ["darko", "decode", "texting"])],
                }
            ]
        }

        try:
            resp = httpx.post(url, json=post_body, headers=headers, timeout=30)
            if resp.status_code in (200, 201):
                data = resp.json()
                post = data["posts"][0]
                console.print(f"  [green]✓[/green] Ghost: [white]{post['url']}[/white] ({status})")
                return post
            else:
                console.print(f"  [red]✗[/red] Ghost error {resp.status_code}: {resp.text[:200]}")
                return None
        except Exception as e:
            console.print(f"  [red]✗[/red] Ghost connection failed: {e}")
            return None


# ──────────────────────────────────────────────────────────────────────────────
# X (TWITTER) CLIENT
# ──────────────────────────────────────────────────────────────────────────────

class XClient:
    """
    Posts threads to X (Twitter) via tweepy v2.
    Requires TWITTER_API_KEY, TWITTER_API_SECRET,
    TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_TOKEN_SECRET in .env.
    """

    def __init__(self):
        self.api_key = os.getenv("TWITTER_API_KEY", "")
        self.api_secret = os.getenv("TWITTER_API_SECRET", "")
        self.access_token = os.getenv("TWITTER_ACCESS_TOKEN", "")
        self.access_secret = os.getenv("TWITTER_ACCESS_TOKEN_SECRET", "")
        self._available = all([
            self.api_key, self.api_secret,
            self.access_token, self.access_secret,
            "your_" not in self.api_key,
        ])
        self._client = None

    def is_available(self) -> bool:
        return self._available

    def _get_client(self):
        if self._client is None:
            try:
                import tweepy
                self._client = tweepy.Client(
                    consumer_key=self.api_key,
                    consumer_secret=self.api_secret,
                    access_token=self.access_token,
                    access_token_secret=self.access_secret,
                )
            except ImportError:
                console.print("[red]ERROR:[/red] tweepy not installed. Run: pip install tweepy")
                self._available = False
                return None
        return self._client

    def post_thread(self, thread_text: str) -> list[str]:
        """
        Parse a thread file and post tweet-by-tweet.
        Returns list of tweet IDs posted.
        """
        if not self._available:
            return []

        client = self._get_client()
        if not client:
            return []

        tweets = self._parse_thread(thread_text)
        if not tweets:
            console.print("  [red]✗[/red] Could not parse thread into tweets")
            return []

        tweet_ids: list[str] = []
        reply_to = None

        for i, tweet_text in enumerate(tweets):
            try:
                if reply_to:
                    resp = client.create_tweet(text=tweet_text, in_reply_to_tweet_id=reply_to)
                else:
                    resp = client.create_tweet(text=tweet_text)

                tweet_id = str(resp.data["id"])
                tweet_ids.append(tweet_id)
                reply_to = tweet_id

                console.print(f"  [green]✓[/green] Tweet {i + 1}/{len(tweets)} posted (ID: {tweet_id})")

                if i < len(tweets) - 1:
                    time.sleep(2)  # Rate limit safety

            except Exception as e:
                console.print(f"  [red]✗[/red] Tweet {i + 1} failed: {e}")
                break

        return tweet_ids

    @staticmethod
    def _parse_thread(text: str) -> list[str]:
        """Extract individual tweets from a thread markdown file."""
        import re
        # Split on TWEET N patterns
        parts = re.split(r"TWEET\s+\d+[^:]*:", text)
        tweets = []
        for part in parts[1:]:  # skip preamble
            cleaned = part.strip()
            # Remove any trailing tweet label
            cleaned = re.sub(r"\n\s*TWEET\s+\d+.*$", "", cleaned, flags=re.MULTILINE)
            cleaned = cleaned.strip()
            if cleaned and len(cleaned) <= 280:
                tweets.append(cleaned)
            elif cleaned:
                # Truncate to 280
                tweets.append(cleaned[:277] + "...")
        return tweets


# ──────────────────────────────────────────────────────────────────────────────
# PUBLISHER (orchestrator)
# ──────────────────────────────────────────────────────────────────────────────

class Publisher:
    """
    Orchestrates distribution across all platforms.
    Reads generated content from output/ directories and publishes.
    """

    def __init__(self, state):
        self.state = state
        self.ghost = GhostClient()
        self.x = XClient()

    def publish_all_blogs(self, status: str = "draft") -> int:
        """Publish all unpublished blog posts to Ghost CMS."""
        blog_dir = Path("output/blogs")
        if not blog_dir.exists():
            console.print("  [dim]No blogs to publish.[/dim]")
            return 0

        if not self.ghost.is_available():
            console.print("  [yellow]Ghost CMS not configured — skipping blog publishing.[/yellow]")
            console.print("  [dim]Set GHOST_API_URL and GHOST_ADMIN_API_KEY in .env[/dim]")
            self._list_files(blog_dir, "Blog posts ready for manual upload")
            return 0

        published = 0
        for md_file in sorted(blog_dir.glob("*.md")):
            if md_file.name.startswith("_"):
                continue

            slug = md_file.stem
            if self.state.is_published(slug):
                console.print(f"  [dim]→ already published: {slug}[/dim]")
                continue

            content = md_file.read_text(encoding="utf-8")
            title = self._extract_title(content) or slug.replace("-", " ").title()

            result = self.ghost.publish_post(
                title=title,
                markdown_content=content,
                slug=slug,
                status=status,
            )

            if result:
                self.state.mark_published(slug, {
                    "platform": "ghost",
                    "ghost_id": result.get("id"),
                    "url": result.get("url"),
                    "status": status,
                })
                published += 1

        console.print(f"  [yellow]>[/yellow] {published} blog(s) published to Ghost ({status})")
        return published

    def publish_all_threads(self) -> int:
        """Post all unpublished threads to X."""
        thread_dir = Path("output/threads")
        if not thread_dir.exists():
            console.print("  [dim]No threads to publish.[/dim]")
            return 0

        if not self.x.is_available():
            console.print("  [yellow]X/Twitter not configured — skipping thread posting.[/yellow]")
            console.print("  [dim]Set TWITTER_API_KEY, etc. in .env[/dim]")
            self._list_files(thread_dir, "Threads ready for manual posting")
            return 0

        published = 0
        for thread_file in sorted(thread_dir.glob("*_thread.md")):
            key = thread_file.stem
            if self.state.is_published(key):
                console.print(f"  [dim]→ already posted: {key}[/dim]")
                continue

            content = thread_file.read_text(encoding="utf-8")
            tweet_ids = self.x.post_thread(content)

            if tweet_ids:
                self.state.mark_published(key, {
                    "platform": "x",
                    "tweet_ids": tweet_ids,
                    "tweet_count": len(tweet_ids),
                })
                published += 1

        console.print(f"  [yellow]>[/yellow] {published} thread(s) posted to X")
        return published

    def print_video_queue(self):
        """Display the video upload queue."""
        queue = self.state.get_video_queue()
        if not queue:
            return

        table = Table(
            title="[yellow]VIDEO UPLOAD QUEUE[/yellow]",
            border_style="yellow",
            header_style="bold yellow",
            show_lines=True,
        )
        table.add_column("#", style="yellow", justify="right")
        table.add_column("SCENARIO", style="white", min_width=50)
        table.add_column("FILE", style="dim white")
        table.add_column("QUEUED", style="dim white")

        for i, v in enumerate(queue, 1):
            table.add_row(
                str(i),
                v["scenario"][:60],
                v["filepath"],
                v["queued_at"],
            )

        console.print(table)
        console.print(
            f"\n[yellow]>[/yellow] {len(queue)} video(s) ready for manual TikTok/Reels upload"
        )

    def print_status(self):
        """Full pipeline status report."""
        self.state.print_stats(console)

        # Platform availability
        platforms = Table(
            title="[yellow]PLATFORM STATUS[/yellow]",
            border_style="yellow",
            header_style="bold yellow",
        )
        platforms.add_column("PLATFORM", style="white")
        platforms.add_column("STATUS", style="white")

        ghost_status = "[green]CONNECTED[/green]" if self.ghost.is_available() else "[yellow]NOT CONFIGURED[/yellow]"
        x_status = "[green]CONNECTED[/green]" if self.x.is_available() else "[yellow]NOT CONFIGURED[/yellow]"

        platforms.add_row("Ghost CMS", ghost_status)
        platforms.add_row("X (Twitter)", x_status)
        platforms.add_row("TikTok/Reels", "[yellow]MANUAL (video queue)[/yellow]")

        console.print(platforms)

    @staticmethod
    def _extract_title(markdown: str) -> str | None:
        """Pull title from frontmatter or first H1."""
        for line in markdown.split("\n"):
            if line.startswith("title:"):
                return line.split("title:", 1)[1].strip().strip('"').strip("'")
            if line.startswith("# "):
                return line[2:].strip()
        return None

    @staticmethod
    def _list_files(directory: Path, label: str):
        """List files for manual distribution."""
        files = sorted(directory.glob("*.md"))
        files = [f for f in files if not f.name.startswith("_")]
        if files:
            console.print(f"\n  [yellow]{label}:[/yellow]")
            for f in files:
                console.print(f"    → {f}")
