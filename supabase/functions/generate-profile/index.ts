import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { history, leverage, objective } = await req.json();

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const historyText = (history ?? [])
      .map((e: any, i: number) => {
        const dateLabel = e.timestamp ? ` [${new Date(e.timestamp).toISOString().split('T')[0]}]` : '';
        return `Interaction ${i + 1}${dateLabel}: "${e.inputMessage}" → ${e.result.threat_level ?? e.result.mission_status ?? ''} | ${e.result.the_psyche ?? e.result.primary_response ?? ''}`;
      })
      .join('\n');

    const contextBlock = [
      leverage ? `Operative leverage over target: ${leverage}` : '',
      objective ? `Operative objective: ${objective}` : '',
    ].filter(Boolean).join('\n');

    const prompt = `You are DARKO. Based on the following intelligence, generate a comprehensive psychological dossier on the target. Return ONLY valid JSON with no markdown.

${contextBlock ? `[TARGET CONTEXT]\n${contextBlock}\n\n` : ''}[INTERACTION HISTORY]
${historyText || 'No interactions yet — infer from context only.'}

Return this exact JSON structure:
{
  "dominant_archetype": "e.g. Coquette with Anxious-Preoccupied undercurrent",
  "attachment_style": "e.g. Anxious-Preoccupied — seeks validation through intermittent withdrawal",
  "manipulation_patterns": ["tactic 1", "tactic 2", "tactic 3"],
  "vulnerability_score": "e.g. 7.4/10 — High — anxious attachment driving reactivity to absence",
  "summary": "2 sentences, cold clinical tone, cite at least one Law number and archetype name",
  "mbti_profile": {
    "type": "4-letter MBTI type inferred from communication patterns",
    "dominant_function": "primary cognitive function with cold clinical description",
    "shadow_function": "repressed function that surfaces under stress",
    "seduction_vulnerability": "1-2 sentences on which seduction archetype and approach exploits this type"
  },
  "relationship_brief": "exactly 2 paragraphs separated by a blank line. Paragraph 1: clinical summary of target psychological profile. Paragraph 2: current power dynamic and seduction phase.",
  "strengths": ["thing that makes her feel powerful", "thing that makes her feel confident", "thing that validates her"],
  "weaknesses": ["core insecurity", "known trigger", "emotional pressure point"],
  "likes": ["topic she responds positively to", "activity she engages with openly", "thing that lowers her guard"],
  "dislikes": ["thing that makes her withdraw", "thing that makes her defensive", "thing she avoids"],
  "birthday": null,
  "location": null,
  "manipulation_vectors": ["primary tactic she uses on operatives", "how she deploys withdrawal", "her guilt-induction method"],
  "power_dynamic": "one sentence — who holds frame and why",
  "predicted_next_behavior": "one sentence — what target does next based on current arc",
  "key_turning_points": ["most significant moment from history", "moment power shifted", "moment operative made an error"],
  "operative_mistakes": ["tactical error the operative made — include approximate date if available", "second error", "..."],
  "target_communication_style": "describe exactly how this target writes — vocabulary, emoji usage, language mixing, formality level, typical message length",
  "relationship_momentum": "ADVANCING | STALLING | REGRESSING — one sentence why",
  "last_known_emotional_state": "target's emotional state based on most recent messages in history",
  "relationship_narrative": "4 to 6 paragraphs. Write in cold, precise field-report prose — no therapy language, no flattery. Cover ALL of the following across the paragraphs: (1) Origin story — how they met or first connected, the circumstances, who initiated and why, what the early dynamic felt like; (2) Power dynamic — who holds frame and why, has it shifted, where the leverage sits right now; (3) Recurring patterns — the behavioral loops that repeat, what triggers them, what they reveal about her psychology; (4) What she responds to — specific inputs that move her, the register she opens up to, tactical approaches that have worked; (5) What she rejects or shuts down — approaches that cause withdrawal, what threatens her, her defensive postures; (6) The operative's specific frame with this target — if a named dynamic or frame has emerged (the forbidden thing, the safe confessor, the challenge she can't win), name it and describe how it functions; (7) Emotional undercurrent — the felt subtext beneath behavior. What is she actually getting from this connection that she is not getting elsewhere. Name the unmet need that this relationship satisfies for her; (8) Stated boundaries — lines she has drawn verbally, distinct from behavioral patterns. Direct quotes or close paraphrases of corrections she has issued (e.g. \\\"don't ask me about X\\\", \\\"I told you I'm not ready for Y\\\"). If none on record, say so explicitly — do not invent; (9) Current campaign phase based on behavioral evidence — not message count, but actual signal evidence. Map to one of stray | approach | decide | fall with a one-sentence justification citing specific moments from the conversation history (the message that confirmed the read, the moment the dynamic shifted). If history is thin, infer from archetype and attachment style and state your reasoning. Each paragraph 3-6 sentences. Total 300-450 words.",
  "current_phase": "stray | approach | decide | fall — must match the phase you justify in paragraph (9) of relationship_narrative. Use the lowercase Greene name only.",
  "phase_confidence": "0.0 to 1.0 — confidence in the current_phase read. >=0.75 means locked behavioral evidence, <0.75 means tentative or inferred from sparse data. Emit as a number, not a string."
}`;

    const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: 'You are DARKO — cold intelligence analyst. Return only valid JSON, no markdown, no backticks.' }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.5, responseMimeType: 'application/json' },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return new Response(JSON.stringify({ error: 'Gemini request failed', detail: err }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await res.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) {
      return new Response(JSON.stringify({ error: 'Empty response from Gemini' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const parsed = JSON.parse(raw);
    return new Response(
      JSON.stringify({ ...parsed, generatedAt: new Date().toISOString() }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[generate-profile] Unhandled error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
