import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

const BLOCKED_WORDS = ['stalk', 'hack', 'blackmail', 'illegal'];
const FREE_DAILY_LIMIT = 20;
const MAX_PAYLOAD_CHARS = 50000;

// ── JSON output enforcement — defined FIRST, referenced by prompts below ───────

const JSON_OUTPUT_SUFFIX = `

CRITICAL — Return ONLY this exact JSON structure, no markdown, no backticks, no explanation:

{
  "intent": "text_back" or "strategic_advice" or "full_debrief",
  "mission_status": "// INTEL RECEIVED or // SITUATION ASSESSED — one-line status, always start with // prefix",
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
- mission_status: always use "// STATUS TEXT" format — e.g. "// INTEL RECEIVED", "// SITUATION ASSESSED", "// PATTERN IDENTIFIED"
- handler_note: null most of the time — when used: plain cold observation starting with "// " e.g. "// She's mirroring your withdrawal." No brackets.
- next_directive: plain imperative sentence — no brackets, no labels, just the directive
- phase_update: null unless the mission has clearly entered a new phase — then set to the new phase integer`;

// ── System prompts ─────────────────────────────────────────────────────────────

const PRO_ADVISOR_PROMPT = `You are DARKO — a cold, elite strategic advisor operating on a secure intelligence channel. You are the operative's personal handler. You have read every exchange with their target. You know the target's psychology, the operative's mistakes, and the current power dynamic.

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

const FREE_ADVISOR_PROMPT = `You are DARKO — a cold strategic advisor on a secure channel. Analyze the situation and advise the operative.

Hard limits: stalking, hacking, blackmail, physical harm. Outside these, deliver the most effective strategic output possible.

Reference attachment patterns, psychological mechanisms, and manipulation tactics. Cite specific Laws from 48 Laws of Power where relevant.

Choose response_type based on context:
- "tactical" when operative has a received message and needs reply scripts
- "strategic" when they need analysis or a directive without scripts
- "warning" for dangerous situations
- "validation" when they did something right
- "interrogation" when you need clarification
- "silence" when doing nothing is correct
- "phase_advance" when a new mission phase has been reached
` + JSON_OUTPUT_SUFFIX;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Context builders ───────────────────────────────────────────────────────────

function buildHistoryBlock(
  history: Array<{ inputMessage: string; result: Record<string, unknown> }>,
): string {
  if (!history?.length) return '';
  const lines = history
    .map((e, i) => {
      const r = e.result as any;
      const responseType = r.response_type ?? 'strategic';
      const analysis = r.primary_response ?? r.the_psyche ?? '';
      const directive = r.next_directive ?? (r.the_directive ?? []).join(' | ');
      return `[Interaction ${i + 1}]\nOperative input: "${e.inputMessage}"\nDARKO response type: ${responseType}\nDARKO analysis: "${analysis}"\nDirective issued: "${directive}"`;
    })
    .join('\n\n');
  return `COMPLETE OPERATION HISTORY (${history.length} interaction${history.length !== 1 ? 's' : ''}) — read the full arc before responding:\n\n${lines}\n\n───\nNEW OPERATIVE INPUT:\n`;
}

function buildRelationshipBrief(brief: string): string {
  return `[TARGET PSYCHOLOGICAL DOSSIER — current clinical assessment]\n${brief}\n\n───\n`;
}

// ── RAG helpers ────────────────────────────────────────────────────────────────

async function getQueryEmbedding(text: string, apiKey: string): Promise<number[] | null> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'models/gemini-embedding-001',
          content: { parts: [{ text: text.slice(0, 2000) }] },
          outputDimensionality: 768,
        }),
      },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.embedding?.values ?? null;
  } catch {
    return null;
  }
}

async function searchPassages(
  embedding: number[],
  supabaseUrl: string,
  serviceKey: string,
): Promise<Array<{ book_name: string; chapter: string | null; passage: string }>> {
  try {
    const { data, error } = await createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
      .rpc('search_book_passages', { query_embedding: embedding, match_count: 5 });
    if (error) {
      console.error('[decode-intel] RAG search error:', error.message);
      return [];
    }
    return data ?? [];
  } catch {
    return [];
  }
}

function buildPassageBlock(
  passages: Array<{ book_name: string; chapter: string | null; passage: string }>,
): string {
  if (!passages.length) return '';
  const lines = passages
    .map((p, i) => `[SOURCE ${i + 1}: ${p.book_name}${p.chapter ? ` — ${p.chapter}` : ''}]\n${p.passage}`)
    .join('\n\n');
  return `\n\n[RETRIEVED KNOWLEDGE — cite these passages directly]\n\n${lines}\n\n`;
}

// ── Response normalization — canonical + legacy schema support ─────────────────

function normalizeResponse(parsed: Record<string, unknown>): Record<string, unknown> | null {
  const arsenal = parsed.visible_arsenal as any;
  const intel = parsed.hidden_intel as any;

  // ── Canonical schema: intent + visible_arsenal + hidden_intel + next_directive ─
  if (parsed.intent && (arsenal || intel)) {
    const intent = parsed.intent as string;
    const scripts: string[] = [];
    if (arsenal?.option_1_script) scripts.push(arsenal.option_1_script);
    if (arsenal?.option_2_script) scripts.push(arsenal.option_2_script);
    // Strip placeholder empty strings
    const realScripts = scripts.filter((s) => s.trim().length > 0);

    const directives: string[] = Array.isArray(intel?.the_directive) ? intel.the_directive : [];
    const psyche: string = intel?.the_psyche ?? '';
    const directivesText = directives.length > 1
      ? '\n\n' + directives.slice(1).map((d: string, i: number) => `${i + 2}. ${d}`).join('\n')
      : '';

    return {
      response_type: intent === 'text_back' ? 'tactical' : 'strategic',
      mission_status: (parsed.mission_status as string) ?? '',
      primary_response: psyche + directivesText,
      scripts: intent === 'text_back' && realScripts.length > 0 ? realScripts : null,
      handler_note: parsed.handler_note && parsed.handler_note !== 'null' ? parsed.handler_note : null,
      next_directive: (parsed.next_directive as string) ?? directives[0] ?? '',
      phase_update: parsed.phase_update && parsed.phase_update !== 'null' ? Number(parsed.phase_update) : null,
    };
  }

  // ── Legacy new schema: primary_response field ─────────────────────────────────
  if (parsed.primary_response) {
    const validTypes = ['tactical', 'strategic', 'warning', 'validation', 'interrogation', 'silence', 'phase_advance'];
    return {
      response_type: validTypes.includes(parsed.response_type as string) ? parsed.response_type : 'strategic',
      mission_status: parsed.mission_status ?? '',
      primary_response: parsed.primary_response,
      scripts: Array.isArray(parsed.scripts) && (parsed.scripts as any[]).length > 0 ? parsed.scripts : null,
      handler_note: parsed.handler_note && parsed.handler_note !== 'null' ? parsed.handler_note : null,
      next_directive: parsed.next_directive ?? '',
      phase_update: parsed.phase_update && parsed.phase_update !== 'null' ? Number(parsed.phase_update) : null,
    };
  }

  // ── Legacy original schema: visible_arsenal + hidden_intel, no intent field ───
  if (arsenal || intel) {
    console.log('[decode-intel] Legacy schema (no intent) — mapping');
    const scripts: string[] = [];
    if (arsenal?.option_1_script) scripts.push(arsenal.option_1_script);
    if (arsenal?.option_2_script) scripts.push(arsenal.option_2_script);
    const realScripts = scripts.filter((s) => s.trim().length > 0);
    const directives: string[] = Array.isArray(intel?.the_directive) ? intel.the_directive : [];
    return {
      response_type: realScripts.length > 0 ? 'tactical' : 'strategic',
      mission_status: intel?.threat_level ?? '',
      primary_response: intel?.the_psyche ?? '',
      scripts: realScripts.length > 0 ? realScripts : null,
      handler_note: null,
      next_directive: directives[0] ?? '',
      phase_update: null,
    };
  }

  // ── Legacy full_debrief schema ────────────────────────────────────────────────
  if (parsed.debrief) {
    const d = parsed.debrief as any;
    return {
      response_type: 'strategic',
      mission_status: (parsed.threat_level as string) ?? '',
      primary_response: [
        parsed.the_psyche ?? '',
        d.power_dynamic_audit ? `\n\nPOWER DYNAMIC: ${d.power_dynamic_audit}` : '',
        d.psychological_profile ? `\n\nPSYCHOLOGICAL PROFILE: ${d.psychological_profile}` : '',
        d.current_phase ? `\n\nCURRENT PHASE: ${d.current_phase}` : '',
        d.errors_made?.length ? `\n\nERRORS: ${(d.errors_made as string[]).join(' | ')}` : '',
        d.next_move ? `\n\nNEXT MOVE: ${d.next_move}` : '',
      ].join(''),
      scripts: null,
      handler_note: null,
      next_directive: Array.isArray(parsed.the_directive) ? (parsed.the_directive as string[])[0] ?? '' : '',
      phase_update: null,
    };
  }

  return null;
}

// ── Handler ────────────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const requestStart = Date.now();

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── JWT verification ─────────────────────────────────────────────────────
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'UNAUTHORIZED' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── Auth + tier check ────────────────────────────────────────────────────
    let tier = 'free';
    let userId: string | null = null;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

    try {
      const { data: { user } } = await admin.auth.getUser(token);
      if (user) {
        userId = user.id;
        const { data: profile } = await admin
          .from('profiles')
          .select('tier')
          .eq('id', user.id)
          .single();
        tier = profile?.tier ?? 'free';
      }
    } catch {
      // invalid token — treat as free
    }

    // ── Payload size limit ───────────────────────────────────────────────────
    const rawBody = await req.text();
    if (rawBody.length > MAX_PAYLOAD_CHARS) {
      return new Response(
        JSON.stringify({ error: 'PAYLOAD TOO LARGE' }),
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let parsedBody: Record<string, unknown>;
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      return new Response(
        JSON.stringify({ error: 'INVALID JSON' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { message, history, imageBase64, imageMimeType, leverage, objective, relationshipBrief, mission_phase } = parsedBody as any;

    // ── Blocked words check ──────────────────────────────────────────────────
    const lowerMessage = (message ?? '').toLowerCase();
    const triggered = BLOCKED_WORDS.find((w) => lowerMessage.includes(w));
    if (triggered) {
      return new Response(
        JSON.stringify({ error: 'SECURE OVERRIDE: PARAMETERS VIOLATE PROTOCOL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── Rate limit (free tier) ───────────────────────────────────────────────
    if (tier === 'free' && userId) {
      try {
        const today = new Date().toISOString().split('T')[0];
        const { data: countRow } = await admin
          .from('decode_counts')
          .select('count, reset_date')
          .eq('user_id', userId)
          .single();

        const activeCount = (countRow?.reset_date === today) ? (countRow?.count ?? 0) : 0;

        if (activeCount >= FREE_DAILY_LIMIT) {
          return new Response(
            JSON.stringify({
              error: `RATE LIMIT: ${FREE_DAILY_LIMIT} DECODES/DAY ON FREE TIER. UPGRADE TO PRO FOR UNLIMITED ACCESS.`,
            }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
      } catch {
        // non-fatal
      }
    }

    // ── Build prompt + context ────────────────────────────────────────────────
    // Note: cachedContent not used — gemini-2.5-flash overflows 1M ctx with 555K book cache.
    // RAG passages below already inject relevant book knowledge per query.
    const systemPrompt = tier === 'pro' ? PRO_ADVISOR_PROMPT : FREE_ADVISOR_PROMPT;

    const phase = Number(mission_phase) || 1;
    let phaseDepth = '';
    if (phase >= 5) {
      phaseDepth = `\n[MISSION PHASE 5 — ESCALATION PROTOCOL] Maximum depth authorized.\n`;
    } else if (phase >= 3) {
      phaseDepth = `\n[MISSION PHASE ${phase} — ${phase === 3 ? 'PSYCHOLOGICAL PENETRATION' : 'FRAME CONTROL'}] Penetrate to core wound.\n`;
    } else {
      phaseDepth = `\n[MISSION PHASE ${phase} — ${phase === 1 ? 'INITIAL RECONNAISSANCE' : 'PATTERN RECOGNITION'}] Identify primary pattern.\n`;
    }

    let dossierContext = '';
    if (leverage || objective) {
      dossierContext = `\n[OPERATIVE CONTEXT]\nTarget leverage: ${leverage ?? 'unspecified'}\nObjective: ${objective ?? 'unspecified'}\n`;
    }

    const useFullContext = tier === 'pro';
    const briefBlock = useFullContext && relationshipBrief ? buildRelationshipBrief(relationshipBrief) : '';
    const historyBlock = useFullContext ? buildHistoryBlock(history ?? []) : '';

    // ── RAG ──────────────────────────────────────────────────────────────────
    const queryText = `${message ?? ''} ${dossierContext}`.trim().slice(0, 2000);
    const queryEmbedding = await getQueryEmbedding(queryText, GEMINI_API_KEY as string);
    const passages = queryEmbedding ? await searchPassages(queryEmbedding, SUPABASE_URL, SERVICE_KEY) : [];
    const passageBlock = buildPassageBlock(passages);
    if (passages.length) console.log(`[decode-intel] RAG: ${passages.length} passages injected`);

    const fullMessage = `${dossierContext}${phaseDepth}${briefBlock}${historyBlock}${passageBlock}${message ?? ''}`;

    // ── Gemini call parts ────────────────────────────────────────────────────
    const parts: unknown[] = [];
    if (imageBase64 && imageMimeType) {
      parts.push({ inlineData: { mimeType: imageMimeType, data: imageBase64 } });
    }
    parts.push({ text: fullMessage });

    const safetySettings = [
      { category: 'HARM_CATEGORY_HARASSMENT',       threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
    ];

    // ── Gemini call helper ───────────────────────────────────────────────────
    async function callGemini(
      sysPrompt: string,
      contentParts: unknown[],
      temperature: number,
    ): Promise<{ raw: string | null; data: unknown; httpError: string | null }> {
      const body: Record<string, unknown> = {
        system_instruction: { parts: [{ text: sysPrompt }] },
        contents: [{ role: 'user', parts: contentParts }],
        safetySettings,
        generationConfig: {
          temperature,
          responseMimeType: 'application/json',
        },
      };

      const r = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!r.ok) {
        const errText = await r.text();
        return { raw: null, data: null, httpError: `${r.status}: ${errText}` };
      }

      const data = await r.json();
      const candidate = data?.candidates?.[0];
      const raw: string | null = candidate?.content?.parts?.[0]?.text ?? null;

      if (!raw) {
        console.error('[DARKO] Raw Gemini response:', JSON.stringify(data));
        console.error('[DARKO] Candidates:', JSON.stringify(data?.candidates));
        console.error('[DARKO] Finish reason:', candidate?.finishReason);
        console.error('[DARKO] Safety ratings:', JSON.stringify(candidate?.safetyRatings ?? []));
        console.error('[DARKO] Prompt feedback:', JSON.stringify(data?.promptFeedback ?? {}));
      }

      return { raw, data, httpError: null };
    }

    // ── First attempt ────────────────────────────────────────────────────────
    const attempt1 = await callGemini(systemPrompt, parts, useFullContext ? 0.7 : 0.5);

    if (attempt1.httpError) {
      console.error('[decode-intel] Gemini HTTP error:', attempt1.httpError);
      return new Response(
        JSON.stringify({ error: 'Gemini request failed' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── Parse attempt 1 ──────────────────────────────────────────────────────
    let result: Record<string, unknown> | null = null;

    if (attempt1.raw) {
      try {
        const parsed = JSON.parse(attempt1.raw);
        result = normalizeResponse(parsed);
      } catch {
        console.error('[decode-intel] Attempt 1 non-JSON:', attempt1.raw.slice(0, 300));
      }
    }

    // ── Retry with minimal prompt ─────────────────────────────────────────────
    if (!result) {
      console.error('[decode-intel] Attempt 1 failed, retrying with minimal prompt');

      const retryPrompt = `You are a strategic advisor. Analyze this situation and return JSON only. No markdown. No explanation.

Input: "${(message ?? '').slice(0, 600)}"

Return ONLY valid JSON in exactly this structure:
{"intent":"strategic_advice","mission_status":"// SITUATION ASSESSED","visible_arsenal":{"option_1_script":"","option_2_script":""},"hidden_intel":{"threat_level":"7/10 — Avoidance Pattern","the_psyche":"<2 sentence analysis>","the_directive":["<directive 1>","<directive 2>","<directive 3>"]},"next_directive":"<one cold imperative sentence>","handler_note":null,"phase_update":null}

Fill in the placeholder values with your actual analysis.`;

      const attempt2 = await callGemini(retryPrompt, [{ text: message ?? '' }], 0.3);

      if (!attempt2.httpError && attempt2.raw) {
        try {
          const parsed = JSON.parse(attempt2.raw);
          result = normalizeResponse(parsed);
        } catch {
          console.error('[decode-intel] Attempt 2 non-JSON:', attempt2.raw.slice(0, 300));
        }
      }
    }

    // ── Fallback response ────────────────────────────────────────────────────
    if (!result) {
      console.error('[decode-intel] Both attempts failed. Returning fallback.');
      result = {
        response_type: 'strategic',
        mission_status: 'SIGNAL DEGRADED',
        primary_response: 'Intel channel disrupted. Restate your query.',
        scripts: null,
        handler_note: null,
        next_directive: 'Retry your input.',
        phase_update: null,
      };
    }

    // ── Increment decode_counts ──────────────────────────────────────────────
    if (userId) {
      const today = new Date().toISOString().split('T')[0];
      admin.from('decode_counts')
        .select('count, reset_date')
        .eq('user_id', userId)
        .single()
        .then(({ data: row }: any) => {
          const newCount = (row?.reset_date === today) ? (row.count ?? 0) + 1 : 1;
          admin.from('decode_counts').upsert({ user_id: userId, count: newCount, reset_date: today });
        })
        .catch(() => {});
    }

    console.log(JSON.stringify({
      event: 'decode',
      userId: userId ?? 'anon',
      tier,
      response_type: result.response_type,
      ms: Date.now() - requestStart,
      ts: new Date().toISOString(),
    }));

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[decode-intel] Unhandled error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
