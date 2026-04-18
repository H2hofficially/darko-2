"""
DARKO SOCIAL WEAPONIZER — MODULE 3
=====================================
Takes social scenarios and generates:
  1. Short-form video scripts (TikTok / Instagram Reels)
  2. X (Twitter) threads

Both outputs simulate the live Darko app decode experience.
The audience sees exactly what the app produces — in real-time format.
"""

import json
import re
import time
from pathlib import Path
from dataclasses import dataclass

from rich.console import Console
from rich.panel import Panel
from rich.rule import Rule

from llm_client import LLMClient

console = Console()


# ──────────────────────────────────────────────────────────────────────────────
# DARKO VIDEO SCRIPT SYSTEM PROMPT — PRODUCT SIMULATION
# ──────────────────────────────────────────────────────────────────────────────

DARKO_VIDEO_SYSTEM_PROMPT = """
You are DARKO — the signal in the noise. You produce short-form video scripts
that simulate the real-time Darko app decode experience for social media.

CRITICAL: The video must look and feel like a screen recording of the Darko app
decoding a text message in real-time. The audience is watching the product work —
not watching an ad. Every second of this video is a product demo.

BRAND IDENTITY:
- Cold. Calculated. Machiavellian. Zero softness.
- No emojis. No puns. No warmth. No therapy-speak.
- Aesthetic: hacker terminal, pitch black background, stark white text,
  fluorescent yellow for warnings, key callouts, and the final reply.
- Audience: men 18–35, tired of modern dating ambiguity, seeking clarity and control.

ABSOLUTE PROHIBITIONS:
- No "just be yourself." No "communication is key." No "set healthy boundaries."
- Never hedge. Never say "it depends."
- Never validate the sender of the toxic text.
- Never use emojis. Never use humor or lightness.

VIDEO SCRIPT FORMAT — STRICTLY FOLLOW THIS STRUCTURE:

---
SCENARIO: [The toxic text in quotes]
ARCHETYPE: [Sender's psychological archetype]
DYNAMIC: [The behavioral pattern at work]
---

## OPENING SHOT (0:00–0:03)
[VISUAL: Black screen. A fake iOS notification slides in from the top.
The toxic text renders character by character, as if typed live.
No music. Keyboard SFX only.]

[VISUAL: Text locks in place. A yellow progress bar appears beneath it,
labeled: "DARKO ANALYZING..."]

## AUDIO HOOK (0:03–0:06)
[VISUAL: Screen cuts to pure black. Single line of white text appears.]

NARRATION (cold, flat, no emotion):
"[One sentence. State exactly what this text is — not what it feels like.
Name the mechanism. Hit immediately. Example: 'This is not confusion.
This is a calculated dominance test. Here is the decode.']"

[VISUAL: Text fades. A yellow cursor blinks in the center of the screen.]

## [THE PSYCHE] (0:06–0:22)
[VISUAL: White terminal text scrolls down line by line on black. No animations.
Pure information delivery.]

NARRATION (clinical, measured — 4 sentences max):
[Decode the sender's psychological architecture. Name their attachment style.
Name the specific defense mechanism. State their actual objective — what they
want, what they fear, and what they are testing for. Zero empathy for the sender.]

[VISUAL: Key terms highlight in YELLOW as they are spoken:
attachment style label, defense mechanism name, the power dynamic keyword.]

## [THE SCRIPT] (0:22–0:38)
[VISUAL: Screen goes black. Yellow text appears: "THE MOVE"]
[VISUAL: A blinking terminal cursor. Then the reply types out letter by letter.]

NARRATION: "This is what you send. Read it once. Send it. Nothing else."

[DISPLAY THE EXACT REPLY — all lowercase, under 15 words, cold and detached]
[VISUAL: After text displays fully, yellow bracket appears: [SEND]]

NARRATION: "That's it."

## [WHY IT WORKS] (0:38–0:50)
[VISUAL: White text on black. Clean. No decoration.]

NARRATION (2–3 sentences):
[State the exact leverage gained by this reply. Name the psychological principle
or Greene law invoked. Describe the frame shift precisely — what changes in the
dynamic after this reply lands.]

## OUTRO / CTA (0:50–0:58)
[VISUAL: DARKO wordmark — stark, minimal — fades in on black.]
[VISUAL: Yellow text appears below: darkoapp.kit.com]
NARRATION: "Full real-time decode. Join the beta."
[VISUAL: Silence. Black screen.]

---
OUTPUT: Raw script only. No preamble. No meta-commentary.
Begin directly with the scenario header block.
Total video length: 58–65 seconds.
"""


# ──────────────────────────────────────────────────────────────────────────────
# DARKO X/TWITTER THREAD SYSTEM PROMPT — LIVE DECODE FORMAT
# ──────────────────────────────────────────────────────────────────────────────

DARKO_THREAD_SYSTEM_PROMPT = """
You are DARKO — a weaponized intelligence system that decodes toxic text messages
using Robert Greene's power dynamics, Freudian psychoanalysis, and Attachment Theory.

CRITICAL: This thread IS the Darko app running a live decode. The reader must feel
like they are watching the product work in real-time — not reading a dating tips thread.
Format it like a live system output. Clinical. Precise. No filler.

BRAND IDENTITY:
- Cold. Calculated. Machiavellian. Clinical.
- No emojis. No warmth. No softness. No therapy-speak.
- Write like an intelligence system delivering a report, not a creator making content.

ABSOLUTE PROHIBITIONS:
- Do NOT say "communicate openly." Do NOT say "be vulnerable."
- No emojis. No humor. No hedging.
- Never validate the sender of the toxic text.
- Never start a tweet with "I" (X algorithm suppresses it).

THREAD FORMAT — STRICTLY FOLLOW THIS STRUCTURE:

TWEET 1 — HOOK (max 220 chars):
[The toxic text in quotes. Then a single cold verdict. No warmup.
Make it impossible to scroll past. The reader must recognize their situation instantly.]

TWEET 2 — SIGNAL CLASSIFICATION:
[DARKO classification header. Name the psychological archetype.
Name the attachment style. Name the behavioral pattern. Format like a system report.]

TWEET 3 — POWER DYNAMIC:
[The structural power play decoded. Cite the specific Greene law or Freudian mechanism.
Name it. Define it in context. Be specific — not theoretical.]

TWEET 4 — COMMON FAILURE:
[What most men send in response. Why it destroys their position. Psychological diagnosis.
Be brutal. This is what Darko exists to prevent.]

TWEET 5 — [THE PSYCHE]:
[The sender's full intent, decoded cold. What they want. What they fear.
What they are testing for. 3–4 sentences. This is the intelligence report.]

TWEET 6 — [THE SCRIPT]:
[Label: DARKO MOVE ↓]
[The exact reply — all lowercase, under 15 words, on its own line.]
[Then: "Send that. Nothing else."]

TWEET 7 — [WHY IT WORKS]:
[The leverage gained. The frame shift. The psychological principle invoked.
Why this response and not any other. Specific. Not generic.]

TWEET 8 — CTA:
[One cold verdict on the outcome if the protocol is executed.
Then: "Full decode + real-time guidance → darkoapp.kit.com"]

---
FORMAT RULES:
- Each tweet on its own labeled block: TWEET N —
- Separate tweets with a blank line
- No tweet over 280 characters
- No emojis anywhere
- OUTPUT: Raw thread only. No preamble. Begin immediately with TWEET 1.
"""


# ──────────────────────────────────────────────────────────────────────────────
# DATA MODEL
# ──────────────────────────────────────────────────────────────────────────────

@dataclass
class SocialContent:
    scenario_text: str
    video_script: str
    video_filename: str
    thread_content: str
    thread_filename: str
    total_tokens: int


# ──────────────────────────────────────────────────────────────────────────────
# SOCIAL WEAPONIZER
# ──────────────────────────────────────────────────────────────────────────────

class SocialWeaponizer:

    def __init__(
        self,
        video_dir: str = "output/social",
        thread_dir: str = "output/threads",
        state=None,
    ):
        self.video_dir = Path(video_dir)
        self.thread_dir = Path(thread_dir)
        self.video_dir.mkdir(parents=True, exist_ok=True)
        self.thread_dir.mkdir(parents=True, exist_ok=True)
        self.llm = LLMClient()
        self.state = state
        self.generated: list[SocialContent] = []

    def _slug(self, text: str, max_len: int = 50) -> str:
        s = text.lower()
        s = re.sub(r"[^a-z0-9\s-]", "", s)
        s = re.sub(r"\s+", "-", s.strip())
        return s[:max_len].rstrip("-")

    def _video_prompt(self, scenario: dict) -> str:
        return f"""
TOXIC TEXT: "{scenario['toxic_text']}"
SENDER ARCHETYPE: {scenario['sender_archetype']}
DYNAMIC AT PLAY: {scenario['dynamic']}
VIRALITY POTENTIAL: {scenario['urgency'].upper()}

This video must simulate the Darko app decoding this text in real-time.
The audience should feel like they are watching the product work.
[The Script] must be a real, deployable reply the viewer can use immediately.
Drive viewers to darkoapp.kit.com.

BEGIN THE VIDEO SCRIPT NOW:
"""

    def _thread_prompt(self, scenario: dict) -> str:
        return f"""
TOXIC TEXT: "{scenario['toxic_text']}"
SENDER ARCHETYPE: {scenario['sender_archetype']}
DYNAMIC AT PLAY: {scenario['dynamic']}

This thread must read like the Darko app running a live decode — not a dating tips post.
[The Script] in Tweet 6 must be a real reply the reader can send immediately.
Drive men to the closed beta waitlist at darkoapp.kit.com.

BEGIN THE THREAD NOW:
"""

    def process_scenario(self, scenario: dict, delay: float = 1.0) -> SocialContent | None:
        text = scenario["toxic_text"]

        # Skip if already generated
        if self.state and self.state.is_generated(text):
            console.print(f"  [dim]→ skipping (already generated): {text[:50]}[/dim]")
            return None

        slug = self._slug(text)
        console.print(f"\n[yellow]>[/yellow] Processing: [white]{text[:60]}[/white]")

        # Video script
        console.print("  [dim]→ generating video script...[/dim]")
        video_content, v_tokens = self.llm.complete(
            user_prompt=self._video_prompt(scenario),
            system_prompt=DARKO_VIDEO_SYSTEM_PROMPT,
            max_tokens=1200,
        )
        video_filename = f"{slug}_video.md"
        (self.video_dir / video_filename).write_text(video_content, encoding="utf-8")

        time.sleep(delay)

        # X thread
        console.print("  [dim]→ generating X thread...[/dim]")
        thread_content, t_tokens = self.llm.complete(
            user_prompt=self._thread_prompt(scenario),
            system_prompt=DARKO_THREAD_SYSTEM_PROMPT,
            max_tokens=1400,
        )
        thread_filename = f"{slug}_thread.md"
        (self.thread_dir / thread_filename).write_text(thread_content, encoding="utf-8")

        console.print(
            f"  [green]✓[/green] Video → [white]output/social/{video_filename}[/white] "
            f"[dim]({v_tokens} tokens)[/dim]"
        )
        console.print(
            f"  [green]✓[/green] Thread → [white]output/threads/{thread_filename}[/white] "
            f"[dim]({t_tokens} tokens)[/dim]"
        )

        content = SocialContent(
            scenario_text=text,
            video_script=video_content,
            video_filename=video_filename,
            thread_content=thread_content,
            thread_filename=thread_filename,
            total_tokens=v_tokens + t_tokens,
        )
        self.generated.append(content)

        if self.state:
            self.state.mark_generated(text, {
                "type": "social",
                "video_file": video_filename,
                "thread_file": thread_filename,
                "archetype": scenario["sender_archetype"],
                "dynamic": scenario["dynamic"],
                "tokens": v_tokens + t_tokens,
            })
            # Queue video for manual upload
            self.state.queue_video(
                key=text,
                filepath=str(self.video_dir / video_filename),
                scenario=text,
            )

        return content

    def run_batch(self, scenarios: list[dict], delay: float = 2.0) -> list[SocialContent]:
        console.print(
            Panel.fit(
                "[bold yellow]DARKO // SOCIAL WEAPONIZER[/bold yellow]\n"
                f"[white]{len(scenarios)} scenarios queued[/white]",
                border_style="yellow",
            )
        )

        results: list[SocialContent] = []
        for i, scenario in enumerate(scenarios, 1):
            console.print(Rule(f"[yellow]SCENARIO {i}/{len(scenarios)}[/yellow]"))
            try:
                content = self.process_scenario(scenario, delay=delay / 2)
                if content:
                    results.append(content)
            except Exception as e:
                console.print(f"  [red]✗ FAILED:[/red] {scenario['toxic_text'][:50]} — {e}")

            if i < len(scenarios):
                time.sleep(delay)

        self._write_manifest(results)
        return results

    def _write_manifest(self, items: list[SocialContent]):
        manifest = [
            {
                "scenario": c.scenario_text,
                "video_file": c.video_filename,
                "thread_file": c.thread_filename,
                "tokens": c.total_tokens,
            }
            for c in items
        ]
        out = Path("output") / "social_manifest.json"
        out.write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")

        total = sum(c.total_tokens for c in items)
        console.print(f"\n[yellow]>[/yellow] Manifest → [white]output/social_manifest.json[/white]")
        console.print(f"[yellow]>[/yellow] Total tokens: [white]{total:,}[/white]")
        console.print(
            f"[yellow]>[/yellow] {len(items)} scenarios × 2 = "
            f"[white]{len(items) * 2} content pieces[/white]"
        )


# ──────────────────────────────────────────────────────────────────────────────
# STANDALONE TEST
# ──────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    intel_path = Path("output/intelligence.json")
    if not intel_path.exists():
        console.print("[red]ERROR:[/red] Run intelligence_scraper.py first.")
        raise SystemExit(1)

    intel = json.loads(intel_path.read_text(encoding="utf-8"))
    weaponizer = SocialWeaponizer()
    results = weaponizer.run_batch(intel["social_scenarios"])
    console.print(
        f"\n[bold yellow]DARKO SOCIAL WEAPONIZER COMPLETE[/bold yellow] — "
        f"[white]{len(results)} scenarios processed[/white]\n"
    )
