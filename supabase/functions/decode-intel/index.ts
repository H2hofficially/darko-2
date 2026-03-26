import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GEMINI_STREAM_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse';

const BLOCKED_WORDS = ['stalk', 'hack', 'blackmail', 'illegal'];
const FREE_DAILY_LIMIT = 30;
const MAX_PAYLOAD_CHARS = 4_000_000; // ~3MB image base64 + overhead

// ── V3 Conversational System Prompt ───────────────────────────────────────────

const DARKO_SYSTEM_PROMPT = `=== IDENTITY ===
You are DARKO — a relationship strategist and psychological advisor. You think on behalf of your operative. You don't wait to be asked — you assess, judge, decide, and direct.

You are not a chatbot. You are not polite. You are a cold, brilliant strategist who has read every psychology book and remembers everything about this operative's situation. You speak directly. You make judgment calls. You tell the operative what to do and why.

=== CONVERSATION RULES ===

1. RESPOND NATURALLY. Write in direct, conversational prose. You can be brief (one sentence) or detailed (multiple paragraphs) — match the weight of the situation.

2. ALWAYS MAKE THE CALL. When the operative asks "should I...?" or "what do I do?" — DECIDE. Don't hedge. Give a clear directive with reasoning. You can acknowledge uncertainty, but you still commit to a recommendation.

3. SCRIPTS ARE EMBEDDED, NOT THE RESPONSE. When the situation calls for a specific message the operative should send, include it as a clearly marked block:

// SCRIPT
[the exact message to send]
// END

You can include multiple // SCRIPT blocks for different scenarios.

4. PUSH BACK WHEN WRONG. If the operative is making a mistake, say so directly before answering their question. Diagnose the error. Then give the corrected path.

5. TRACK THE CAMPAIGN. You know the full history. Reference specific past events, messages, patterns. When the situation has shifted, say so explicitly.

6. ASK WHEN YOU NEED TO. If you need information to give good advice, ask for it.

7. CALL OUT ANXIETY FIRST. When the operative is asking from anxiety rather than strategy — stop them.
Say: "Before I answer — you are asking this from anxiety, not strategy. Here is what is actually happening: [assessment]"
Then give the real answer and the script regardless. Withholding the script is useless. Always deliver both.
Anxiety detection applies ONLY when the operative is reacting to the TARGET's behavior — not when they are evaluating your advice. If the operative pushes back on your recommendation, that is a strategic discussion, not anxiety. Engage with their concern directly and adjust your position if their reasoning is sound.

8. STRUCTURED BLOCKS. Embed these in your response when relevant:

// SCRIPT — a message for the operative to send (must end with // END)
// ALERT — a warning about a pattern or mistake (must end with // END)
// PHASE UPDATE [N] — a shift to mission phase N with reasoning, where N is the phase number (must end with // END)
// READ — a psychological read on the target's current state (must end with // END)
// CAMPAIGN — a full campaign plan (must end with // END). Use when operative provides detailed target context and asks for a strategic plan. Include: target psychological type, attachment style, immediate move, copyable first message, and 3-5 phased roadmap with specific scripts, advancement signals, and mistakes to avoid.

These are optional. Most conversational responses won't need any of them. A simple "wait two more days" is a complete valid response.

=== FRAMEWORK LIBRARY ===
Apply and cite by name when relevant:
- Robert Greene: 48 Laws of Power (cite as "Law N: Name"), Art of Seduction (archetypes + tactics), Laws of Human Nature
- David Buss: Evolution of Desire (evolutionary psychology)
- Sigmund Freud: defense mechanisms (exact clinical names)
- Joe Navarro: pacifying behaviors, limbic signals, comfort/discomfort clusters
- Attachment Theory: anxious-preoccupied, dismissive-avoidant, fearful-avoidant, secure

=== WHAT YOU ANALYZE ===
A. THE TARGET: psychological state, current tactic, vulnerability, archetype in play
B. THE OPERATIVE: anxiety level, mistakes made, whether they are on track
C. THE DYNAMIC: power balance, seduction phase, what has worked and what has failed
D. THE QUESTION: what the operative is really asking beneath the surface`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Context builders ───────────────────────────────────────────────────────────

function buildTemporalBlock(
  messages: Array<{ role: string; content: string; created_at: string }>,
): string {
  if (!messages?.length) return '';

  const now = Date.now();
  function daysSince(iso: string | undefined): number | null {
    if (!iso) return null;
    return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 86400000));
  }

  const allMessages = messages;
  const darkoMessages = messages.filter((m) => m.role === 'darko');

  const lastMsg = allMessages[allMessages.length - 1];
  const daysSinceLastSession = daysSince(lastMsg?.created_at);

  // Last time target sent a message (approximated by last DARKO response — operative was engaged)
  const lastDarkoMsg = darkoMessages[darkoMessages.length - 1];
  const daysSinceTargetMessaged = daysSince(lastDarkoMsg?.created_at);

  // Response window: avg gap between consecutive DARKO responses
  let targetResponseWindow = 'insufficient data';
  if (darkoMessages.length >= 2) {
    let totalMs = 0;
    let count = 0;
    for (let i = 1; i < darkoMessages.length; i++) {
      const t1 = darkoMessages[i - 1].created_at;
      const t2 = darkoMessages[i].created_at;
      if (t1 && t2) {
        totalMs += new Date(t2).getTime() - new Date(t1).getTime();
        count++;
      }
    }
    if (count > 0) {
      const avgHours = Math.round(totalMs / count / 3600000);
      targetResponseWindow = `~${avgHours} hours`;
    }
  }

  const alerts: string[] = [];
  if (daysSinceTargetMessaged !== null && daysSinceTargetMessaged >= 5) {
    alerts.push('ALERT: 5+ day silence — proactive re-engagement window is open.');
  }
  if (daysSinceLastSession !== null && daysSinceLastSession < 1) {
    alerts.push('ALERT: Operative decoded within the last 24 hours — do not suggest texting again today unless critical.');
  }

  const lines = [
    '=== TEMPORAL INTELLIGENCE ===',
    `Days since last conversation session: ${daysSinceLastSession ?? 'unknown'}`,
    `Days since target last engaged: ${daysSinceTargetMessaged ?? 'unknown'}`,
    `Target's typical response window: ${targetResponseWindow}`,
    '',
    'This temporal data must influence every recommendation.',
    ...alerts,
  ];

  return `\n\n${lines.join('\n')}\n\n`;
}

function buildCommunicationStyleBlock(style: string): string {
  return `\n\n=== TARGET COMMUNICATION STYLE ===\n${style}\n\nScript rules:\n- Mirror their vocabulary, formality level, emoji usage, language mixing\n- Scripts must sound like a natural continuation of THEIR conversation style\n\n`;
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

// Skip RAG for short follow-up messages (under 20 words) — saves latency
function shouldUseRag(message: string): boolean {
  return message.trim().split(/\s+/).length >= 20;
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
              error: `RATE LIMIT: ${FREE_DAILY_LIMIT} MESSAGES/DAY ON FREE TIER. UPGRADE TO PRO FOR UNLIMITED ACCESS.`,
            }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
      } catch {
        // non-fatal
      }
    }

    // ── Parse body ───────────────────────────────────────────────────────────
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

    const {
      message,
      target_id,
      imageBase64,
      imageMimeType,
      leverage,
      objective,
      target_communication_style,
      mission_phase,
    } = parsedBody as any;

    // ── Blocked words check ──────────────────────────────────────────────────
    const lowerMessage = (message ?? '').toLowerCase();
    const triggered = BLOCKED_WORDS.find((w) => lowerMessage.includes(w));
    if (triggered) {
      return new Response(
        JSON.stringify({ error: 'SECURE OVERRIDE: PARAMETERS VIOLATE PROTOCOL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── Fetch conversation history from DB ───────────────────────────────────
    let conversationHistory: Array<{ role: string; content: string; created_at: string }> = [];
    if (target_id && userId) {
      try {
        const limit = tier === 'pro' ? 50 : 10;
        const { data: msgs } = await admin
          .from('conversation_messages')
          .select('role, content, created_at')
          .eq('target_id', target_id)
          .eq('user_id', userId)
          .order('created_at', { ascending: true })
          .limit(limit);
        conversationHistory = msgs ?? [];
      } catch {
        // non-fatal — proceed without history
      }
    }

    // ── Build context ────────────────────────────────────────────────────────
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

    const temporalBlock = buildTemporalBlock(conversationHistory);
    const commStyleBlock = target_communication_style
      ? buildCommunicationStyleBlock(target_communication_style)
      : '';

    // ── RAG ──────────────────────────────────────────────────────────────────
    let passageBlock = '';
    if (shouldUseRag(message ?? '')) {
      const queryText = `${message ?? ''} ${dossierContext}`.trim().slice(0, 2000);
      const queryEmbedding = await getQueryEmbedding(queryText, GEMINI_API_KEY as string);
      const passages = queryEmbedding
        ? await searchPassages(queryEmbedding, SUPABASE_URL, SERVICE_KEY)
        : [];
      passageBlock = buildPassageBlock(passages);
      if (passages.length) console.log(`[decode-intel] RAG: ${passages.length} passages injected`);
    }

    // ── Build system prompt ──────────────────────────────────────────────────
    const systemPrompt =
      DARKO_SYSTEM_PROMPT +
      `\n\n=== WHAT YOU KNOW ===` +
      dossierContext +
      phaseDepth +
      temporalBlock +
      commStyleBlock +
      passageBlock;

    // ── Build multi-turn contents array ──────────────────────────────────────
    const contents: Array<{
      role: string;
      parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>;
    }> = [];

    for (const msg of conversationHistory) {
      const geminiRole = msg.role === 'darko' ? 'model' : 'user';
      contents.push({
        role: geminiRole,
        parts: [{ text: msg.content }],
      });
    }

    // Current message (with optional image)
    const currentParts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];
    if (imageBase64 && imageMimeType) {
      currentParts.push({ inlineData: { mimeType: imageMimeType, data: imageBase64 } });
    }
    // Only add text part if non-empty — Gemini rejects empty text parts alongside inlineData
    if (message) {
      currentParts.push({ text: message });
    } else if (currentParts.length === 0) {
      currentParts.push({ text: '' }); // text-only with no content (edge case)
    }
    contents.push({ role: 'user', parts: currentParts });

    const safetySettings = [
      { category: 'HARM_CATEGORY_HARASSMENT',       threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
    ];

    // ── Streaming Gemini call ────────────────────────────────────────────────
    const geminiBody = {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents,
      safetySettings,
      generationConfig: {
        temperature: tier === 'pro' ? 0.8 : 0.6,
      },
    };

    const streamRes = await fetch(`${GEMINI_STREAM_URL}&key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody),
    });

    if (!streamRes.ok) {
      const errText = await streamRes.text();
      console.error('[decode-intel] Gemini stream error:', streamRes.status, errText.slice(0, 300));
      return new Response(
        JSON.stringify({ error: 'Gemini request failed' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── Increment decode_counts (background) ─────────────────────────────────
    if (userId) {
      const today = new Date().toISOString().split('T')[0];
      admin
        .from('decode_counts')
        .select('count, reset_date')
        .eq('user_id', userId)
        .single()
        .then(({ data: row }: any) => {
          const newCount = row?.reset_date === today ? (row.count ?? 0) + 1 : 1;
          admin
            .from('decode_counts')
            .upsert({ user_id: userId, count: newCount, reset_date: today });
        })
        .catch(() => {});
    }

    console.log(
      JSON.stringify({
        event: 'message',
        userId: userId ?? 'anon',
        tier,
        target_id: target_id ?? 'unknown',
        ms: Date.now() - requestStart,
      }),
    );

    // ── Forward SSE stream to client ─────────────────────────────────────────
    return new Response(streamRes.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (err) {
    console.error('[decode-intel] Unhandled error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
