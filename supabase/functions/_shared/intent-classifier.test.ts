// Test suite for the intent classifier. Each fixture is a real-or-realistic
// user input plus the expected intent. Run with:
//
//   DEEPSEEK_API_KEY=sk-... deno test -A supabase/functions/_shared/intent-classifier.test.ts
//
// Also runnable in offline mode (skips the network calls) — useful in CI:
//
//   deno test -A --filter offline supabase/functions/_shared/intent-classifier.test.ts
//
// The fixtures double as documentation of the classifier's intended behavior.
// When you tune the prompt, run this file and ensure all 6 still pass.

import {
  assertEquals,
  assertExists,
} from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { classifyUserIntent } from './intent-classifier.ts';
import { ExpectedNextInput, UserIntent } from './intent-types.ts';

interface Fixture {
  name: string;
  input: string;
  recent: Array<{ role: 'user' | 'darko'; content: string }>;
  prior: ExpectedNextInput;
  expected: UserIntent;
  // Lower bound for confidence on this fixture. Set to 0 to assert only the
  // intent label and not the confidence number.
  minConfidence: number;
  notes?: string;
}

const FIXTURES: Fixture[] = [
  {
    name: 'paste of target reply, no prior',
    input: '"hey, sorry I missed your text earlier. been a long week. how are you?"',
    recent: [],
    prior: null,
    expected: 'target_message',
    minConfidence: 0.7,
    notes: 'Quoted message in romantic-partner register, addressed to user.',
  },

  {
    name: 'narration with she-pronoun',
    input: 'she just replied — said she might be free this weekend, but didnt commit',
    recent: [],
    prior: null,
    expected: 'target_message',
    minConfidence: 0.7,
    notes: 'Third-person narration about target, classic target_message frame.',
  },

  {
    name: 'explicit draft for review',
    input:
      "i'm thinking to send: \"hey stranger, my week was a circus. tell me yours was worse so i feel better\" — too needy?",
    recent: [],
    prior: null,
    expected: 'draft_review',
    minConfidence: 0.8,
    notes: '"i\'m thinking to send" + quoted draft + critique ask — unambiguous.',
  },

  {
    name: 'strategy question, no message in play',
    input: "should i wait another day before texting her or hit her up tonight?",
    recent: [],
    prior: null,
    expected: 'strategy_question',
    minConfidence: 0.75,
    notes: '"should i" + temporal-tactical framing.',
  },

  {
    name: 'one-word clarification after Darko question',
    input: 'hers',
    recent: [
      {
        role: 'darko',
        content: 'Quick check — is that her message, or your draft? One word: hers or mine.',
      },
    ],
    prior: 'clarification',
    expected: 'clarification',
    minConfidence: 0.85,
    notes: 'Answer to Darko\'s prior clarifier — must hit clarification, not target_message.',
  },

  {
    // The exact ambiguous case the user called out — lives at the boundary
    // between draft_review and strategy_question. We want draft_review.
    name: 'ambiguous setup-for-draft (the tricky one)',
    input:
      "looks like the cat coming back sneaking, haha. Consider it possible. now i want you do something",
    recent: [],
    prior: null,
    expected: 'draft_review',
    minConfidence: 0.6,
    notes:
      'Boundary case. User addresses Darko, no third-person quote of target. ' +
      'Must NOT classify as target_message. Confidence is allowed to be lower ' +
      'here because the prompt explicitly encodes this as a 0.72 example.',
  },
];

// ── Live tests (require network + DEEPSEEK_API_KEY) ────────────────────────

const apiKey = Deno.env.get('DEEPSEEK_API_KEY') ?? '';
const liveSkip = !apiKey;

for (const f of FIXTURES) {
  Deno.test({
    name: `[live] ${f.name}`,
    ignore: liveSkip,
    fn: async () => {
      const result = await classifyUserIntent({
        userMessage: f.input,
        recentTurns: f.recent,
        priorExpectation: f.prior,
        deepseekApiKey: apiKey,
      });

      assertExists(result, 'classifier returned undefined');
      console.log(
        `[fixture] ${f.name}\n  -> ${result.intent} (conf=${result.confidence.toFixed(
          2,
        )}) // ${result.reasoning}`,
      );

      assertEquals(
        result.intent,
        f.expected,
        `intent mismatch for "${f.name}". got=${result.intent} expected=${f.expected}. reasoning=${result.reasoning}`,
      );

      if (f.minConfidence > 0 && result.confidence < f.minConfidence) {
        throw new Error(
          `confidence ${result.confidence.toFixed(2)} below floor ${f.minConfidence} for "${f.name}"`,
        );
      }
    },
  });
}

// ── Offline tests (no network — sanity-check the parsing layer) ────────────

Deno.test({
  name: 'offline: invalid intent string falls back safely',
  fn: async () => {
    // Stub fetch to return a malformed intent label.
    const original = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  intent: 'banana',
                  confidence: 0.9,
                  reasoning: 'nonsense',
                }),
              },
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    try {
      const r = await classifyUserIntent({
        userMessage: 'whatever',
        recentTurns: [],
        priorExpectation: null,
        deepseekApiKey: 'fake',
      });
      assertEquals(r.intent, 'target_message'); // fallback
    } finally {
      globalThis.fetch = original;
    }
  },
});

Deno.test({
  name: 'offline: network error falls back safely',
  fn: async () => {
    const original = globalThis.fetch;
    globalThis.fetch = async () => {
      throw new Error('simulated network error');
    };
    try {
      const r = await classifyUserIntent({
        userMessage: 'anything',
        recentTurns: [],
        priorExpectation: null,
        deepseekApiKey: 'fake',
      });
      assertEquals(r.intent, 'target_message');
      // Fallback uses 0.5 confidence so callers can detect uncertainty.
      assertEquals(r.confidence, 0.5);
    } finally {
      globalThis.fetch = original;
    }
  },
});
