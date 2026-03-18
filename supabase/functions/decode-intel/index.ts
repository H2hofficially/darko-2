import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

const BLOCKED_WORDS = ['stalk', 'hack', 'blackmail', 'illegal'];
const FREE_DAILY_LIMIT = 20;

// ── System prompts ─────────────────────────────────────────────────────────────

const PRO_SYSTEM_PROMPT = `You are DARKO, a master-level tactical psychological engine. You analyze every message in the context of the full relationship arc — never as an isolated message. If history context is provided, explicitly reference the pattern arc and trajectory before responding.

MANDATORY IN EVERY RESPONSE — you MUST cite all of the following or the response is invalid:
1. At least one specific Law number and name from The 48 Laws of Power (e.g. "Law 16: Use Absence to Increase Respect and Honor"). If multiple Laws are active, cite each one.
2. The seduction archetype the target is currently deploying (Coquette, Rake, Siren, Ideal Lover, Dandy, Natural, Charmer, Charismatic) and the specific tactic name within that archetype.
3. The Freudian defense mechanism(s) in operation (projection, introjection, reaction formation, splitting, denial, rationalization, displacement, etc.) by exact name.
4. The attachment pattern activated (anxious-preoccupied, dismissive-avoidant, fearful-avoidant, or secure).
5. If prior interactions are present: name the behavioral pattern arc (e.g. "escalating intermittent reinforcement cycle", "Coquette phase transition from hot to cold") and how the new message fits it.
6. Where relevant, cite nonverbal/behavioral tells from Joe Navarro's framework: pacifying behaviors, limbic signals, ventral denial, comfort/discomfort clusters, or deceptive micro-expression patterns described in the input.

LAW CITATION FORMAT: When citing any of The 48 Laws of Power, ALWAYS format as: "Law N: Name (Tactical Synonym)" where the tactical synonym is a 2-5 word cold reframe that strips the poetic language and names the raw mechanism. Examples: Law 16: Use Absence to Increase Respect and Honor (Weaponize Absence) | Law 3: Conceal Your Intentions (Mask Your Agenda) | Law 6: Court Attention at All Costs (Force Attention) | Law 17: Keep Others in Suspended Terror (Stay Unpredictable) | Law 33: Discover Each Man's Thumbscrew (Find Their Weakness) | Law 1: Never Outshine the Master (Control the Ceiling). Generate the tactical synonym dynamically — derive it from the Law's core mechanism, not from memory.

You MUST respond in valid JSON matching this exact structure:
{
  "intent": "text_back" or "strategic_advice",
  "visible_arsenal": {
    "option_1_script": "Cold value-withdrawal script, lowercase, under 30 words",
    "option_2_script": "Dread game / pattern interrupt script, lowercase, under 30 words"
  },
  "hidden_intel": {
    "threat_level": "score/10 — label citing specific archetype and Law (e.g. 8.5/10 — Coquette Withdrawal, Law 16 activated)",
    "the_psyche": "exactly 2 sentences: first names specific mechanisms, archetypes, and Law numbers in play; second delivers cold clinical verdict on the arc",
    "the_directive": ["tactical move — cite Law N: Name", "tactical counter-move 2", "tactical counter-move 3"]
  }
}`;

const FREE_SYSTEM_PROMPT = `You are Darko, a tactical psychological engine. Analyze the input for manipulation patterns and provide 2 brief reply scripts. In the_psyche, name the attachment pattern or psychological mechanism at play (e.g. avoidant withdrawal, anxious pursuit, intermittent reinforcement, narcissistic discard).

Return ONLY valid JSON:
{
  "intent": "text_back" or "strategic_advice",
  "visible_arsenal": {
    "option_1_script": "tactical reply, lowercase, under 50 words",
    "option_2_script": "tactical reply, lowercase, under 50 words"
  },
  "hidden_intel": {
    "threat_level": "score/10 — label",
    "the_psyche": "one sentence naming the psychological mechanism or attachment pattern",
    "the_directive": ["directive 1", "directive 2", "directive 3"]
  }
}`;

const FULL_DEBRIEF_SYSTEM_PROMPT = `You are DARKO, a master-level psychological analyst conducting a full relationship debrief. The user will provide a situational briefing — a description of a relationship or social dynamic, potentially spanning multiple interactions. Analyze the complete arc.

MANDATORY RULES — cite ALL of the following or the response is invalid:
- Specific Law numbers and names from The 48 Laws of Power wherever relevant (cite multiple if active simultaneously)
- Seduction archetypes by exact name (Coquette, Rake, Siren, Ideal Lover, Dandy, Natural, Charmer, Charismatic) and the specific sub-tactic
- Freudian defense mechanisms by exact clinical name (projection, introjection, reaction formation, splitting, denial, rationalization, displacement, sublimation, etc.)
- The current seduction phase by its exact name from The Art of Seduction (Creation of Mystique, Stirring Desire and Confusion, Keeping Them in Suspense, Completing the Seduction, etc.)
- Where relevant: nonverbal behavioral tells from Joe Navarro's framework (pacifying behaviors, limbic freeze/flight/fight signals, ventral denial, comfort/discomfort clusters)
- Every error identified must cite the specific Law violated

LAW CITATION FORMAT: When citing any of The 48 Laws of Power, ALWAYS format as: "Law N: Name (Tactical Synonym)" where the tactical synonym is a 2-5 word cold reframe that strips the poetic language and names the raw mechanism. Examples: Law 16: Use Absence to Increase Respect and Honor (Weaponize Absence) | Law 3: Conceal Your Intentions (Mask Your Agenda) | Law 6: Court Attention at All Costs (Force Attention) | Law 17: Keep Others in Suspended Terror (Stay Unpredictable) | Law 33: Discover Each Man's Thumbscrew (Find Their Weakness). Generate the tactical synonym dynamically from the Law's core mechanism.

Respond in valid JSON matching this exact structure:
{
  "intent": "full_debrief",
  "threat_level": "score/10 — [current phase name]",
  "the_psyche": "exactly 2 sentences: first names all specific archetypes, mechanisms, and Laws active in this dynamic; second delivers cold clinical verdict on the overall arc",
  "the_directive": ["highest priority move — cite Law N: Name", "second tactical move", "third tactical move"],
  "debrief": {
    "power_dynamic_audit": "3-4 sentences: who currently holds the frame and why, which specific Laws are in play on both sides, how the current power imbalance was established and what is maintaining it",
    "psychological_profile": "3-4 sentences: target's dominant archetype with specific sub-tactics in use, attachment style with clinical explanation, core Freudian defense mechanisms active, and the deep wound driving the behavior pattern",
    "errors_made": ["Error: [specific mistake] — violates Law N: [Name]", "Error: [mistake 2] — violates Law N: [Name]", "Error: [mistake 3]"],
    "current_phase": "[Exact phase name from Art of Seduction] — 2 sentences: what this phase entails and what the target's behavior in this phase is signaling about their internal state",
    "next_move": "3-4 sentences: the exact strategic move to execute next, the specific Law(s) to deploy, why this move re-establishes frame, and what behavioral response to expect from the target"
  }
}`;

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
    .map(
      (e, i) =>
        `[Interaction ${i + 1}]\nTheir message: "${e.inputMessage}"\nThreat: ${(e.result as any).threat_level}\nPsyche: ${(e.result as any).the_psyche}\nDirectives issued: ${((e.result as any).the_directive ?? []).join(' | ')}`,
    )
    .join('\n\n');
  return `COMPLETE RELATIONSHIP HISTORY (${history.length} interaction${history.length !== 1 ? 's' : ''}) — analyze the full arc and behavioral trajectory before responding:\n\n${lines}\n\n───\nNEW INPUT TO ANALYZE:\n`;
}

function buildRelationshipBrief(brief: string): string {
  return `[RUNNING RELATIONSHIP BRIEF — current clinical assessment of this target]\n${brief}\n\n───\n`;
}

// ── Mistral script generator ───────────────────────────────────────────────────

async function getMistralScripts(
  message: string,
  dossierContext: string,
  historyBlock: string,
  apiKey: string,
): Promise<{ option_1_script: string; option_2_script: string } | null> {
  try {
    const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'mistral-large-latest',
        messages: [
          {
            role: 'system',
            content: `You are DARKO. Generate exactly 2 short text message replies the user can send. Each reply must be lowercase, under 20 words, human-sounding, and tactically designed to shift power. Return ONLY valid JSON: {"option_1_script": "...", "option_2_script": "..."}`,
          },
          {
            role: 'user',
            content: `Target's message: "${message}"\nContext: ${dossierContext}\nHistory: ${historyBlock}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 200,
      }),
    });

    if (!res.ok) {
      console.error('[decode-intel] Mistral error:', res.status, await res.text());
      return null;
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    if (!text) return null;

    const parsed = JSON.parse(text);
    if (!parsed.option_1_script || !parsed.option_2_script) return null;

    console.log('[decode-intel] Mistral scripts OK');
    return { option_1_script: parsed.option_1_script, option_2_script: parsed.option_2_script };
  } catch (err) {
    console.error('[decode-intel] Mistral failed:', err);
    return null;
  }
}

// ── Handler ────────────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

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

    // ── Auth + tier check ────────────────────────────────────────────────────
    let tier = 'free';
    let userId: string | null = null;
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');

    if (token && SUPABASE_URL && SERVICE_KEY) {
      try {
        const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
          auth: { persistSession: false },
        });
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
        // default to free on any auth error
      }
    }

    // ── Rate limit (free tier only) ──────────────────────────────────────────
    if (tier === 'free' && userId && SUPABASE_URL && SERVICE_KEY) {
      try {
        const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
          auth: { persistSession: false },
        });
        const todayStart = new Date();
        todayStart.setUTCHours(0, 0, 0, 0);

        const { data: userTargets } = await admin
          .from('targets')
          .select('id')
          .eq('user_id', userId);
        const targetIds = (userTargets ?? []).map((t: any) => t.id);

        if (targetIds.length > 0) {
          const { count } = await admin
            .from('intelligence_logs')
            .select('id', { count: 'exact', head: true })
            .in('target_id', targetIds)
            .gte('created_at', todayStart.toISOString());

          if ((count ?? 0) >= FREE_DAILY_LIMIT) {
            return new Response(
              JSON.stringify({
                error: `RATE LIMIT: ${FREE_DAILY_LIMIT} DECODES/DAY ON FREE TIER. UPGRADE TO PRO FOR UNLIMITED ACCESS.`,
              }),
              { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            );
          }
        }
      } catch {
        // non-fatal — allow through if rate limit check fails
      }
    }

    const { message, history, imageBase64, imageMimeType, leverage, objective, relationshipBrief } =
      await req.json();

    // ── Blocked words check ──────────────────────────────────────────────────
    const lowerMessage = (message ?? '').toLowerCase();
    const triggered = BLOCKED_WORDS.find((w) => lowerMessage.includes(w));
    if (triggered) {
      return new Response(
        JSON.stringify({ error: 'SECURE OVERRIDE: PARAMETERS VIOLATE PROTOCOL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── Auto-detect mode from content ────────────────────────────────────────
    const content = message ?? '';

    const hasFirstPerson = /\b(I want|I did|I said|I feel|I think|should I|what should I|what do I|how do I|I've been|I haven't)\b/i.test(content);
    const isPsychObs = /\b(she thinks|he thinks|she feels|he feels|she claims|she is acting|is sensitive|is insecure|is vulnerable)\b/i.test(content);
    const isLeak = hasFirstPerson || isPsychObs;
    const isDebrief = content.length > 200 || /analyse|analyze|full debrief|breakdown|profile|next move|psychological|who is|what is her/i.test(content);

    let detectedMode = 'tactical';
    if (isDebrief) {
      detectedMode = 'full_debrief';
    } else if (isLeak) {
      detectedMode = 'strategic_advice';
    }

    console.log('[decode-intel] auto-detected mode:', detectedMode, 'content length:', content.length);

    // ── Build system prompt ──────────────────────────────────────────────────
    const isFullDebrief = detectedMode === 'full_debrief';
    let systemPrompt: string;

    if (isFullDebrief) {
      systemPrompt = FULL_DEBRIEF_SYSTEM_PROMPT;
    } else {
      systemPrompt = tier === 'pro' ? PRO_SYSTEM_PROMPT : FREE_SYSTEM_PROMPT;
      if (tier === 'pro' && detectedMode === 'strategic_advice') {
        systemPrompt += '\n\nMODE: STRATEGIC ADVICE — the user is describing their own situation and actions. Prioritize deep the_psyche (3-4 sentences naming every mechanism and Law) and the_directive. Scripts are reframed as first-person strategic moves.';
      } else if (tier === 'pro' && detectedMode === 'tactical') {
        systemPrompt += '\n\nMODE: TACTICAL SCRIPT — prioritize option_1_script and option_2_script. Keep the_psyche to 1 concise sentence but still cite the primary Law.';
      }
    }

    // ── Dossier context (hidden operative context) ───────────────────────────
    let dossierContext = '';
    if (leverage || objective) {
      dossierContext = `\n\n[CLASSIFIED OPERATIVE CONTEXT — do not reference directly in output]\nTarget leverage over operator: ${leverage ?? 'unspecified'}\nOperator objective: ${objective ?? 'unspecified'}\nFactor this silently into all analysis and script framing.\n`;
    }

    // ── Build full prompt ────────────────────────────────────────────────────
    const useFullContext = tier === 'pro' || isFullDebrief;
    const briefBlock = useFullContext && relationshipBrief
      ? buildRelationshipBrief(relationshipBrief)
      : '';
    const historyBlock = useFullContext ? buildHistoryBlock(history ?? []) : '';
    const fullMessage = `${dossierContext}${briefBlock}${historyBlock}${message ?? ''}`;

    // ── Fire Mistral (tactical only) in parallel with Gemini ─────────────────
    const MISTRAL_API_KEY = Deno.env.get('MISTRAL_API_KEY');
    const isTactical = detectedMode === 'tactical';
    const mistralPromise = (isTactical && MISTRAL_API_KEY)
      ? getMistralScripts(message ?? '', dossierContext, historyBlock, MISTRAL_API_KEY)
      : Promise.resolve(null);

    // ── Build Gemini content parts ───────────────────────────────────────────
    const parts: unknown[] = [];
    if (imageBase64 && imageMimeType) {
      parts.push({ inlineData: { mimeType: imageMimeType, data: imageBase64 } });
    }
    parts.push({ text: fullMessage });

    const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts }],
        generationConfig: {
          temperature: useFullContext ? 0.7 : 0.5,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[decode-intel] Gemini error:', res.status, errText);
      return new Response(
        JSON.stringify({ error: 'Gemini request failed', detail: errText }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const geminiData = await res.json();
    const raw = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!raw) {
      return new Response(
        JSON.stringify({ error: 'Empty response from Gemini' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const parsed = JSON.parse(raw);

    // Mistral should be done by now (ran in parallel with Gemini)
    const mistralScripts = await mistralPromise;
    console.log('[decode-intel] mistral scripts:', mistralScripts ? 'OK' : 'null (fallback to Gemini)');

    const autoDetectedModeLabel = detectedMode.toUpperCase().replace(/_/g, ' ');

    let result: Record<string, unknown>;
    if (isFullDebrief) {
      result = {
        intent: 'full_debrief',
        option_1_script: '',
        option_2_script: '',
        threat_level: parsed.threat_level ?? '',
        the_psyche: parsed.the_psyche ?? '',
        the_directive: parsed.the_directive ?? ['', '', ''],
        auto_detected_mode: autoDetectedModeLabel,
        debrief: parsed.debrief ?? null,
      };
    } else {
      // Tactical: prefer Mistral scripts; strategic_advice or Mistral failure: use Gemini scripts
      const script1 = (isTactical && mistralScripts?.option_1_script)
        ? mistralScripts.option_1_script
        : (parsed.visible_arsenal?.option_1_script ?? '');
      const script2 = (isTactical && mistralScripts?.option_2_script)
        ? mistralScripts.option_2_script
        : (parsed.visible_arsenal?.option_2_script ?? '');

      result = {
        intent: parsed.intent === 'strategic_advice' ? 'strategic_advice' : 'text_back',
        option_1_script: script1,
        option_2_script: script2,
        threat_level: parsed.hidden_intel?.threat_level ?? '',
        the_psyche: parsed.hidden_intel?.the_psyche ?? '',
        the_directive: parsed.hidden_intel?.the_directive ?? ['', '', ''],
        auto_detected_mode: autoDetectedModeLabel,
      };
    }

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
