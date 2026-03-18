import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { history } = await req.json();

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch current cache name from app_config
    let cacheName: string | null = null;
    if (SUPABASE_URL && SERVICE_KEY) {
      try {
        const admin = createClient(SUPABASE_URL, SERVICE_KEY);
        const { data } = await admin
          .from('app_config')
          .select('value')
          .eq('key', 'gemini_cache_name')
          .single();
        cacheName = data?.value ?? null;
      } catch {
        // continue without cache
      }
    }

    const historyText = (history ?? [])
      .map((e: any, i: number) =>
        `Interaction ${i + 1}: "${e.inputMessage}" → Threat: ${e.result.threat_level} | Psyche: ${e.result.the_psyche}`,
      )
      .join('\n');

    const prompt = `You are DARKO. Based on the following interaction history with a single target, generate a cold behavioral profile, MBTI classification, and running relationship brief. Return ONLY valid JSON with no markdown:

${historyText}

Return this exact structure:
{
  "dominant_archetype": string (e.g. "Coquette with Anxious-Preoccupied undercurrent"),
  "attachment_style": string (e.g. "Anxious-Preoccupied — seeks validation through intermittent withdrawal"),
  "manipulation_patterns": [string, string, string] (cite specific dark psychology tactics and archetype sub-tactics by name),
  "vulnerability_score": string (e.g. "7.4/10 — High — anxious attachment driving reactivity to absence"),
  "summary": string (2 sentences, cold clinical tone, cite at least one Law number and archetype name),
  "mbti_profile": {
    "type": string (4-letter MBTI type inferred from communication patterns, e.g. "ENFJ", "INTJ", "ESFP"),
    "dominant_function": string (primary cognitive function with cold clinical description, e.g. "Fe — Extraverted Feeling: drives approval-seeking, social harmony at cost of authenticity, validation loops"),
    "shadow_function": string (the repressed function that surfaces under stress, e.g. "Ti — Introverted Thinking: under stress, becomes coldly critical, withdraws into logic to avoid emotional exposure"),
    "seduction_vulnerability": string (1-2 sentences: the specific seduction archetype and approach that exploits this MBTI type's cognitive blind spots and unmet needs, citing the archetype by name)
  },
  "relationship_brief": string (exactly 2 paragraphs separated by a blank line. Paragraph 1: clinical summary of the target's psychological profile — dominant archetype, specific sub-tactics being deployed, attachment style, and the core Freudian defense mechanisms in operation. Paragraph 2: current power dynamic status — who holds the frame and why, the current seduction phase per Art of Seduction with its phase name, and the operator's current strategic position in the arc. Cite Laws and archetype names throughout. Cold, clinical, third-person tone.)
}`;

    const reqBody: Record<string, unknown> = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.5, responseMimeType: 'application/json' },
    };
    if (cacheName) reqBody.cachedContent = cacheName;

    const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reqBody),
    });

    // If cache expired, retry without it
    if (!res.ok && cacheName) {
      delete reqBody.cachedContent;
      const retry = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqBody),
      });
      if (!retry.ok) {
        const err = await retry.text();
        return new Response(JSON.stringify({ error: 'Gemini request failed', detail: err }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const data = await retry.json();
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
    }

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
