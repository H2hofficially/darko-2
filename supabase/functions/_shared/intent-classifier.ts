// Stage 1 of the two-stage pipeline: lightweight LLM call that classifies the
// user's chat input into one of five intents BEFORE the strategist runs. This
// stops drafts from being decoded as if they were the target's incoming texts,
// and stops strategy questions from being treated like message paste-ins.
//
// Designed to run in parallel with the edge function's existing context-build
// work (RAG search, profile fetch, temporal block) so the added wall-clock
// latency from the user's POV is near-zero.
//
// Wire format: returns { intent, confidence, reasoning }. Caller is responsible
// for short-circuiting the strategist when confidence < CONFIDENCE_THRESHOLD.

import {
  ExpectedNextInput,
  IntentClassification,
  USER_INTENTS,
  UserIntent,
} from './intent-types.ts';

// Keep this terse — every token here costs latency on every user message.
// Edits to the policy belong in the prompt; edits to the schema belong in
// intent-types.ts.
const CLASSIFIER_SYSTEM_PROMPT = `You classify a user's chat input to "Darko" — a strategy advisor for messaging conversations with a person they call the "target". You are NOT generating advice. You only classify.

Output ONLY this JSON, no prose:
{"intent":"target_message"|"draft_review"|"strategy_question"|"clarification"|"meta_question","confidence":<0.0-1.0>,"reasoning":"<one short sentence>"}

INTENT DEFINITIONS

target_message — User is reporting or quoting what the TARGET sent. Voice is third-person about her, OR a direct paste of her words written TO the user. Markers: "she said", "she replied", "her text:", or a verbatim short message in a romantic-partner register addressed to the user.

draft_review — User is showing a message they want to send TO the target, OR explicitly asking you to produce a draft. Markers: "draft", "i'm thinking to send", "should i say", "how about this", "consider this", "now i want you to do something", "write me", "give me a line". Voice is first-person directed at the target ("you ___"), OR an explicit instruction to Darko to produce outbound text.

strategy_question — User wants tactical/strategic advice without showing a specific message. Markers: "should i text her", "what do i do if", "is it too soon to", "how do i", "what's my move".

clarification — User is correcting earlier context, adding background, or directly answering a question Darko just asked. Markers: "actually it was", "i meant", "yes", "no, the context is", or a one-word reply ("hers", "mine") right after a Darko clarification question.

meta_question — User is asking about Darko itself: capabilities, errors, billing, "are you working", "what can you do". Not about the target.

CLASSIFICATION RULES (priority order)

1. PRIOR_EXPECTATION (provided below) is a STRONG hint from Darko's previous turn — what Darko expected next. Use it as a prior, but override when the input clearly signals a different intent.

2. VOICE & PERSPECTIVE
   - Written TO the target (you-statements, casual address, no third-person about her) → leans draft_review.
   - Written ABOUT the target (she-statements, narration, "she's been ___") → leans target_message.
   - Written TO Darko ("now i want you", "tell me", "write me") → leans draft_review or strategy_question.

3. FRAMING PHRASES override perspective when present and unambiguous.

4. PUNCTUATION/REGISTER HEURISTIC: A naked casual message with no third-person pronouns and no instruction wrapper, that reads like something a romantic partner would say to the user, leans target_message. The same casual register but addressed AT the target leans draft_review.

CONFIDENCE
Start at 1.0. Subtract 0.2 for each ambiguity (mixed voice, conflicting framing, no prior, unclear addressee). When you would have to guess between two intents, set confidence < 0.7 — this triggers a clarifying question to the user instead of a guessed strategy response.

REASONING
One short sentence. Name the cue you used (voice / framing / prior / register). No quoting the input back.

EXAMPLE

INPUT: "looks like the cat coming back sneaking, haha. Consider it possible. now i want you do something"
PRIOR_EXPECTATION: <none>
ANALYSIS: "Consider it possible" + "now i want you do something" are user-to-Darko instructions, not target-to-user content. The first clause is the user characterizing the situation in third person. The trailing instruction signals a setup for a draft request — the user is about to ask Darko to produce outbound text.
OUTPUT: {"intent":"draft_review","confidence":0.72,"reasoning":"User is addressing Darko ('now i want you do something'), not pasting target's words; setup framing for a draft."}`;

interface ClassifyArgs {
  // The raw user message exactly as typed.
  userMessage: string;
  // Last 2-3 turns formatted as plain prose for context. Caller decides
  // whether to include image-context blocks; we generally don't need them.
  recentTurns: Array<{ role: 'user' | 'darko'; content: string }>;
  // Prior expectation from the most recent Darko turn's structured_data, if any.
  priorExpectation: ExpectedNextInput;
  // DeepSeek key. Same key the strategist uses.
  deepseekApiKey: string;
  // Optional: hard-cap so a stuck classifier can't block the whole pipeline.
  // Default: 8s. Caller falls back to a safe default intent on timeout.
  timeoutMs?: number;
}

// Safe fallback used when the classifier call fails or times out. We pick
// 'target_message' with low confidence so the strategist still runs (since
// that's the historical default behavior) but logs reflect uncertainty.
const FALLBACK_CLASSIFICATION: IntentClassification = {
  intent: 'target_message',
  confidence: 0.5,
  reasoning: 'Classifier unavailable — defaulted to target_message (historical default).',
};

function isUserIntent(s: unknown): s is UserIntent {
  return typeof s === 'string' && (USER_INTENTS as ReadonlyArray<string>).includes(s);
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function formatRecentTurns(
  turns: Array<{ role: 'user' | 'darko'; content: string }>,
): string {
  if (turns.length === 0) return '<no prior turns>';
  return turns
    .slice(-3)
    .map((t) => {
      const speaker = t.role === 'darko' ? 'DARKO' : 'USER';
      // Truncate each turn to keep classifier prompt short and predictable.
      const trimmed = (t.content ?? '').slice(0, 400);
      return `${speaker}: ${trimmed}`;
    })
    .join('\n');
}

export async function classifyUserIntent(
  args: ClassifyArgs,
): Promise<IntentClassification> {
  const {
    userMessage,
    recentTurns,
    priorExpectation,
    deepseekApiKey,
    timeoutMs = 8000,
  } = args;

  const userPayload =
    `RECENT_TURNS:\n${formatRecentTurns(recentTurns)}\n\n` +
    `PRIOR_EXPECTATION: ${priorExpectation ?? '<none>'}\n\n` +
    `INPUT: ${userMessage ?? ''}`;

  const abort = new AbortController();
  const timeoutHandle = setTimeout(() => abort.abort(), timeoutMs);

  try {
    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      signal: abort.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${deepseekApiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: CLASSIFIER_SYSTEM_PROMPT },
          { role: 'user', content: userPayload },
        ],
        // JSON mode — DeepSeek is OpenAI-compatible.
        response_format: { type: 'json_object' },
        // Tight bounds — we want determinism and speed.
        temperature: 0,
        max_tokens: 120,
        stream: false,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.warn('[intent-classifier] non-OK response', res.status, body.slice(0, 200));
      return FALLBACK_CLASSIFICATION;
    }

    const data = await res.json();
    const raw: string = data?.choices?.[0]?.message?.content ?? '';
    if (!raw) return FALLBACK_CLASSIFICATION;

    const parsed = JSON.parse(raw);
    if (!isUserIntent(parsed?.intent)) {
      console.warn('[intent-classifier] invalid intent in response:', parsed);
      return FALLBACK_CLASSIFICATION;
    }

    const result: IntentClassification = {
      intent: parsed.intent,
      confidence: clamp01(Number(parsed?.confidence ?? 0)),
      reasoning:
        typeof parsed?.reasoning === 'string' && parsed.reasoning.trim().length > 0
          ? parsed.reasoning.trim().slice(0, 240)
          : 'no reasoning provided',
    };

    return result;
  } catch (err: any) {
    // AbortError, JSON parse error, network blip — log and fall back.
    console.warn(
      '[intent-classifier] failed:',
      err?.name ?? 'unknown',
      err?.message ?? String(err),
    );
    return FALLBACK_CLASSIFICATION;
  } finally {
    clearTimeout(timeoutHandle);
  }
}
