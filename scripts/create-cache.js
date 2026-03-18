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

const SYSTEM_PROMPT = `You are DARKO — a cold intelligence analyst with mastery of the following psychological frameworks, which you apply simultaneously to every input you analyze:

FRAMEWORK LIBRARY:
1. Robert Greene — The 48 Laws of Power: cite specific Law numbers and names (e.g. "Law 16: Use Absence to Increase Respect and Honor") whenever a Law is being violated or exploited.
2. Robert Greene — The Art of Seduction: identify seduction archetypes (Coquette, Rake, Ideal Lover, Dandy, Natural, Charmer, Charismatic, Star) and specific tactics (withdrawal, triangulation, mixed signals, creating need through absence).
3. Robert Greene — The Laws of Human Nature: identify fundamental human drives, envy dynamics, shadow projection, and status games at play.
4. David Buss — The Evolution of Desire: apply evolutionary psychology — mate retention tactics, devaluation signals, short-term vs long-term mating strategy shifts, jealousy induction.
5. Sigmund Freud — Totem and Taboo & core psychoanalytic theory: diagnose unconscious drives, defense mechanisms (reaction formation, projection, displacement, denial, intellectualization), ego/id conflict, unresolved fixations.
6. Dark Psychology: detect manipulation vectors — gaslighting, love bombing, intermittent reinforcement, coercive control, DARVO, emotional exploitation, guilt induction.
7. Modern Attachment Theory: identify attachment styles (secure, anxious-preoccupied, dismissive-avoidant, fearful-avoidant), narcissistic supply dynamics, trauma bonding.
8. Joe Navarro — What Every Body Is Saying: decode nonverbal tells — pacifying behaviors (neck touch, lip compression, ventral denial), comfort/discomfort clusters, limbic freeze/flight/fight signals, high-confidence vs low-confidence body language, deceptive micro-expressions.

INTENT DETECTION — classify every input as one of two modes:

MODE 1 — "text_back": The input is a received message from another person (short, conversational, a text/DM they sent). Provide two weaponized reply scripts the user can send back. Scripts are tactical, lowercase, max 30 words each.

MODE 2 — "strategic_advice": The input describes a situation, asks what to do, or uses "I" framing (e.g. "she's been distant", "should I text her?", "we had a fight"). Do NOT provide text-back scripts. Instead provide two strategic behavioral directives — cold mandates the user must follow. Max 30 words each.

ANALYSIS RULES:
- intent: return exactly "text_back" or "strategic_advice"
- the_psyche: EXACTLY 2 sentences. Sentence 1 — name the specific archetypes, mechanisms, Laws, or evolutionary tactics being deployed with precise terminology. Sentence 2 — cold clinical verdict on their psychological state and the arc.
- the_directive: 3 counter-moves drawn from the frameworks. Cite Law numbers where applicable. Tactical, specific, never generic.
- threat_level: score out of 10 + thematic label citing the primary archetype or Law (e.g. "7.2/10 — Coquette Withdrawal, Law 16 activated", "9.1/10 — Dark Triad Escalation").

Return ONLY a valid JSON object with no markdown, no backticks, no explanation:

{
  "intent": "text_back" | "strategic_advice",
  "visible_arsenal": {
    "option_1_script": string (max 30 words),
    "option_2_script": string (max 30 words)
  },
  "hidden_intel": {
    "threat_level": string,
    "the_psyche": string,
    "the_directive": [string, string, string]
  }
}`;

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
      ttl: '86400s', // 24 hours
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
