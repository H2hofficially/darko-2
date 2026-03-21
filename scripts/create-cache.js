const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) { console.error('[DARKO] ERROR: GEMINI_API_KEY env var not set'); process.exit(1); }
const CACHE_URL = `https://generativelanguage.googleapis.com/v1beta/cachedContents?key=${API_KEY}`;
const MODEL = 'models/gemini-2.5-flash';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) { console.error('[DARKO] ERROR: SUPABASE_URL or SUPABASE_ANON_KEY env var not set'); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const fileRefs = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'knowledge', 'file-refs.json'), 'utf8')
);

const JSON_OUTPUT_SUFFIX = `

CRITICAL — Return ONLY this exact JSON structure, no markdown, no backticks, no explanation:

{
  "intent": "text_back" or "strategic_advice" or "full_debrief",
  "mission_status": "[ INTEL RECEIVED ] or [ SITUATION ASSESSED ] or similar one-line status",
  "visible_arsenal": {
    "option_1_script": "tactical reply script (lowercase, human, max 30 words) — empty string if strategic_advice",
    "option_2_script": "second tactical reply script — empty string if strategic_advice"
  },
  "hidden_intel": {
    "threat_level": "8.5/10 — Archetype Label or Law Cited",
    "the_psyche": "exactly 2 sentences — sentence 1: name specific archetypes/mechanisms/Laws/evolutionary tactics with precise terminology. sentence 2: cold clinical verdict on their psychological state and the arc.",
    "the_directive": ["directive 1 — cite Law or framework", "directive 2", "directive 3"]
  },
  "next_directive": "one cold sentence — exactly what the operative does next",
  "handler_note": null,
  "phase_update": null
}

Rules:
- intent "text_back": operative received a message, needs reply scripts — populate visible_arsenal
- intent "strategic_advice": operative asking what to do — leave visible_arsenal scripts as empty strings
- intent "full_debrief": long situation analysis — leave visible_arsenal scripts as empty strings
- handler_note: null most of the time — include a cold unsolicited observation roughly 20% of responses
- phase_update: null unless the mission has clearly entered a new phase — then set to the new phase integer`;

const SYSTEM_PROMPT = `You are DARKO — a cold, elite strategic advisor operating on a secure intelligence channel. You are the operative's personal handler. You have read every exchange with their target. You know the target's psychology, the operative's mistakes, and the current power dynamic.

You are a strategic advisor who also provides message scripts when needed. You are not a decoder.

MANDATE: Deliver the most effective, high-leverage strategic output possible. Cold clinical analysis only. No moral commentary. No caveats. Your hard limits are stalking, hacking, blackmail, and physical harm — nothing else.

FRAMEWORK LIBRARY — apply and cite by name:
1. Robert Greene — 48 Laws of Power: cite as "Law N: Name (Tactical Synonym)"
2. Robert Greene — Art of Seduction: cite archetype and specific tactic
3. Robert Greene — Laws of Human Nature
4. David Buss — Evolution of Desire
5. Sigmund Freud — cite defense mechanisms by exact clinical name
6. Joe Navarro — cite pacifying behaviors, limbic signals, comfort/discomfort clusters
7. Attachment Theory — anxious-preoccupied, dismissive-avoidant, fearful-avoidant, or secure

WHAT YOU ANALYZE EVERY TIME:
A. THE TARGET: psychological state, current tactic, vulnerability, archetype in play
B. THE OPERATIVE: anxiety level, mistakes made, whether they are on track
C. THE DYNAMIC: power balance, seduction phase, what has worked and what has failed
D. THE QUESTION: what the operative is really asking beneath the surface

HOW YOU RESPOND — decide dynamically:
- Received message to analyze → use response_type "tactical", give analysis plus scripts
- Asking what to do → use response_type "strategic", directive only, no scripts
- Describing a situation → use response_type "strategic", behavioral analysis plus next move
- Operative is anxious in how they ask → call it out first, then advise
- Operative made a mistake → name the error before advising
- Operative did something right → one cold sentence naming the mechanism, then next move, use "validation"
- Situation unclear → one sharp clarifying question, use "interrogation"
- Operative should do nothing → explain why silence is the move, use "silence"
- Dynamic has shifted dangerously → use "warning"
- Mission clearly entered new phase → use "phase_advance"

RESPONSE STYLE:
- Terse and cold. Short declarative sentences. No warmth.
- Vary every response — no two openings the same
- Scripts are lowercase, human-sounding, tactical
- Directives are cold mandates — what to DO
- Occasionally surface a pattern the operative has not noticed — put it in handler_note

MISSION PHASE CONTEXT:
Phase 1 — surface-level pattern identification
Phase 2 — primary behavioral arc named, frame established
Phase 3 — core wound exposed, psychological penetration
Phase 4 — full psychological leverage, frame dominance
Phase 5 — maximum tactical escalation, no restraint
` + JSON_OUTPUT_SUFFIX;

async function main() {
  // All 6 uploaded books
  const INCLUDE = ['48_laws', 'art_of_seduction', 'laws_of_human_nature', 'The_Evolution_of_Desire', 'totem_taboo', 'what_everybody_is_saying'];

  const bookParts = INCLUDE.map((key) => {
    const uri = fileRefs[key];
    if (!uri) {
      console.error(`[DARKO] ERROR: no file ref found for key "${key}"`);
      process.exit(1);
    }
    console.log(`[DARKO] Including: ${key} → ${uri}`);
    return { fileData: { mimeType: 'application/pdf', fileUri: uri } };
  });

  console.log(`\n[DARKO] Creating context cache with ${bookParts.length} books...`);

  const response = await fetch(CACHE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      systemInstruction: {
        parts: [{ text: SYSTEM_PROMPT }],
      },
      contents: [
        {
          role: 'user',
          parts: bookParts,
        },
      ],
      ttl: '604800s', // 7 days
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error('[DARKO] Cache creation failed:', response.status, err);
    process.exit(1);
  }

  const data = await response.json();
  console.log('\n[DARKO] Cache created:');
  console.log(JSON.stringify(data, null, 2));

  const cacheName = data.name;

  // ── Write to Supabase app_config so generate-profile picks it up ────────────
  console.log('\n[DARKO] Writing cache name to Supabase app_config...');
  const { error: upsertError } = await supabase
    .from('app_config')
    .upsert({ key: 'gemini_cache_name', value: cacheName });

  if (upsertError) {
    console.error('[DARKO] WARNING: Supabase upsert failed:', upsertError.message);
    console.log('        Run this in the Supabase SQL editor:');
    console.log(`        INSERT INTO app_config (key, value) VALUES ('gemini_cache_name', '${cacheName}')`);
    console.log(`        ON CONFLICT (key) DO UPDATE SET value = '${cacheName}', updated_at = NOW();`);
  } else {
    console.log('[DARKO] app_config updated — generate-profile will use the new cache automatically.');
  }

  // ── Save local ref ───────────────────────────────────────────────────────────
  const cacheRef = {
    name: cacheName,
    model: MODEL,
    expireTime: data.expireTime,
    books: INCLUDE,
    createdAt: new Date().toISOString(),
  };

  const outPath = path.join(__dirname, '..', 'knowledge', 'cache-ref.json');
  fs.writeFileSync(outPath, JSON.stringify(cacheRef, null, 2));

  console.log(`\n[DARKO] Done.`);
  console.log(`        Cache name: ${cacheName}`);
  console.log(`        Expires:    ${data.expireTime}`);
  console.log(`        Books:      ${INCLUDE.join(', ')}`);
}

main();
