"""
DARKO STATE MANAGER
====================
Tracks generated and published content across all pipeline runs.
Prevents duplicate generation and manages the video upload queue.

State is persisted to output/state.json — do not delete this file
between runs or deduplication will reset.
"""

import hashlib
import json
import time
from pathlib import Path
from typing import Any


class StateManager:
    """
    JSON-backed state tracker for the Darko pipeline.

    Structure:
        {
            "generated": { "<content_hash>": { ...metadata, "generated_at": ... } },
            "published": { "<content_hash>": { ...metadata, "published_at": ... } },
            "video_queue": [ { "key": ..., "filepath": ..., "scenario": ..., "queued_at": ... } ],
            "runs": [ { "started_at": ..., "items_generated": ..., "items_published": ... } ]
        }
    """

    def __init__(self, state_path: str = "output/state.json"):
        self.path = Path(state_path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.state = self._load()

    def _load(self) -> dict:
        if self.path.exists():
            try:
                return json.loads(self.path.read_text(encoding="utf-8"))
            except (json.JSONDecodeError, OSError):
                pass
        return {
            "generated": {},
            "published": {},
            "video_queue": [],
            "runs": [],
        }

    def _save(self):
        self.path.write_text(
            json.dumps(self.state, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )

    @staticmethod
    def _hash(content_key: str) -> str:
        return hashlib.sha256(content_key.strip().lower().encode()).hexdigest()[:16]

    # ── GENERATION TRACKING ──────────────────────────────────────────────────

    def is_generated(self, content_key: str) -> bool:
        return self._hash(content_key) in self.state["generated"]

    def mark_generated(self, content_key: str, metadata: dict[str, Any] | None = None):
        h = self._hash(content_key)
        entry = {
            "key": content_key.strip(),
            "generated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        }
        if metadata:
            entry.update(metadata)
        self.state["generated"][h] = entry
        self._save()

    # ── PUBLISH TRACKING ─────────────────────────────────────────────────────

    def is_published(self, content_key: str) -> bool:
        return self._hash(content_key) in self.state["published"]

    def mark_published(self, content_key: str, metadata: dict[str, Any] | None = None):
        h = self._hash(content_key)
        entry = {
            "key": content_key.strip(),
            "published_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        }
        if metadata:
            entry.update(metadata)
        self.state["published"][h] = entry
        self._save()

    # ── VIDEO QUEUE ──────────────────────────────────────────────────────────

    def queue_video(self, key: str, filepath: str, scenario: str):
        self.state["video_queue"].append({
            "key": key.strip(),
            "filepath": filepath,
            "scenario": scenario.strip(),
            "queued_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "uploaded": False,
        })
        self._save()

    def get_video_queue(self) -> list[dict]:
        return [v for v in self.state["video_queue"] if not v.get("uploaded")]

    def mark_video_uploaded(self, key: str):
        for v in self.state["video_queue"]:
            if v["key"].strip().lower() == key.strip().lower():
                v["uploaded"] = True
        self._save()

    # ── RUN LOG ──────────────────────────────────────────────────────────────

    def log_run(self, items_generated: int, items_published: int):
        self.state["runs"].append({
            "started_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "items_generated": items_generated,
            "items_published": items_published,
        })
        self._save()

    # ── STATS ────────────────────────────────────────────────────────────────

    def print_stats(self, console):
        from rich.table import Table

        table = Table(
            title="[yellow]PIPELINE STATE[/yellow]",
            border_style="yellow",
            header_style="bold yellow",
        )
        table.add_column("METRIC", style="white")
        table.add_column("VALUE", style="yellow", justify="right")

        table.add_row("Content generated (total)", str(len(self.state["generated"])))
        table.add_row("Content published (total)", str(len(self.state["published"])))
        table.add_row("Videos in queue", str(len(self.get_video_queue())))
        table.add_row("Pipeline runs", str(len(self.state["runs"])))

        console.print(table)
