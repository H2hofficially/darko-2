import { supabase, SUPABASE_ANON_KEY } from '../lib/supabase';
import { DecodeEntry, TargetProfile } from './storage';

export type DecoderResult = {
  intent: 'text_back' | 'strategic_advice' | 'full_debrief';
  option_1_script: string;
  option_2_script: string;
  threat_level: string;
  the_psyche: string;
  the_directive: [string, string, string];
  auto_detected_mode?: string;
  debrief?: {
    power_dynamic_audit: string;
    psychological_profile: string;
    errors_made: string[];
    current_phase: string;
    next_move: string;
  };
};

export type DecodeInput = {
  text?: string;
  imageBase64?: string;
  imageMimeType?: string;
  historyContext?: DecodeEntry[];
  leverage?: string;
  objective?: string;
  relationshipBrief?: string;
};

function buildHistory(history: DecodeEntry[]) {
  // Send the full history — no slice cap
  return history.map((e) => ({
    inputMessage: e.inputMessage,
    result: {
      threat_level: e.result.threat_level,
      the_psyche: e.result.the_psyche,
      the_directive: e.result.the_directive,
    },
  }));
}

// ── Main decode — routed through Supabase Edge Function ─────────────────────

export async function decodeMessage(
  input: DecodeInput,
): Promise<DecoderResult | null> {
  try {
    const body: Record<string, unknown> = {
      message: input.text ?? '',
      history: buildHistory(input.historyContext ?? []),
    };

    if (input.imageBase64) {
      body.imageBase64 = input.imageBase64;
      body.imageMimeType = input.imageMimeType ?? 'image/jpeg';
    }
    if (input.leverage) body.leverage = input.leverage;
    if (input.objective) body.objective = input.objective;
    if (input.relationshipBrief) body.relationshipBrief = input.relationshipBrief;

    const { data: { session } } = await supabase.auth.getSession();
    const authToken = session?.access_token ?? SUPABASE_ANON_KEY;

    const { data, error } = await supabase.functions.invoke('decode-intel', {
      body,
      headers: { Authorization: `Bearer ${authToken}` },
    });

    if (error) {
      try {
        const errorBody = await (error as any).context?.text?.();
        console.log('[DARKO] Edge function error body:', errorBody);
      } catch {}
      return null;
    }

    if (data?.error) {
      console.log('[DARKO] Decode blocked:', data.error);
      return null;
    }

    const validIntents = ['text_back', 'strategic_advice', 'full_debrief'] as const;
    return {
      intent: validIntents.includes(data.intent) ? data.intent : 'text_back',
      option_1_script: data.option_1_script ?? '',
      option_2_script: data.option_2_script ?? '',
      threat_level: data.threat_level,
      the_psyche: data.the_psyche,
      the_directive: data.the_directive,
      auto_detected_mode: data.auto_detected_mode ?? undefined,
      ...(data.debrief ? { debrief: data.debrief } : {}),
    };
  } catch (err) {
    console.log('[DARKO] Caught error:', err);
    return null;
  }
}

// ── Audio transcription — Supabase Edge Function ──────────────────────────────

export async function transcribeAudio(audioBase64: string, mimeType = 'audio/m4a'): Promise<string | null> {
  try {
    console.log('[DARKO] transcribeAudio — sending request, base64 length:', audioBase64.length, 'mimeType:', mimeType);

    const { data, error } = await supabase.functions.invoke('transcribe-audio', {
      body: { audioBase64, mimeType },
    });

    console.log('[DARKO] transcribeAudio — raw response data:', JSON.stringify(data));

    if (error) {
      console.log('[DARKO] transcribeAudio — edge function error:', JSON.stringify(error));
      try {
        const detail = await (error as any).context?.text?.();
        console.log('[DARKO] transcribeAudio — error body:', detail);
      } catch {}
      return null;
    }

    if (!data?.text) {
      console.log('[DARKO] transcribeAudio — no text in response, full data:', JSON.stringify(data));
      return null;
    }

    console.log('[DARKO] transcribeAudio — success, text:', data.text);
    return data.text;
  } catch (err) {
    console.log('[DARKO] transcribeAudio — caught error:', err);
    return null;
  }
}

// ── Target profile generation — Supabase Edge Function ───────────────────────

export async function generateTargetProfile(
  history: DecodeEntry[],
): Promise<TargetProfile | null> {
  try {
    const { data, error } = await supabase.functions.invoke('generate-profile', {
      body: {
        history: history.map((e) => ({
          inputMessage: e.inputMessage,
          result: {
            threat_level: e.result.threat_level,
            the_psyche: e.result.the_psyche,
          },
        })),
      },
    });
    if (error || !data) return null;
    return {
      dominant_archetype: data.dominant_archetype,
      attachment_style: data.attachment_style,
      manipulation_patterns: data.manipulation_patterns,
      vulnerability_score: data.vulnerability_score,
      summary: data.summary,
      relationship_brief: data.relationship_brief,
      generatedAt: data.generatedAt ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
