import { supabase } from '../lib/supabase';
import { DecodeEntry, TargetProfile } from './storage';

export type DecoderResult = {
  response_type: 'tactical' | 'strategic' | 'warning' | 'validation' | 'interrogation' | 'silence' | 'phase_advance';
  mission_status: string;
  primary_response: string;
  scripts?: string[] | null;
  handler_note?: string | null;
  next_directive: string;
  phase_update?: number | null;
};

export type DecodeInput = {
  text?: string;
  imageBase64?: string;
  imageMimeType?: string;
  historyContext?: DecodeEntry[];
  leverage?: string;
  objective?: string;
  relationshipBrief?: string;
  missionPhase?: number;
};

function buildHistory(history: DecodeEntry[]) {
  return history.map((e) => ({
    inputMessage: e.inputMessage,
    result: {
      response_type: (e.result as any).response_type ?? 'strategic',
      primary_response: (e.result as any).primary_response ?? (e.result as any).the_psyche ?? '',
      next_directive: (e.result as any).next_directive ?? ((e.result as any).the_directive ?? []).join(' | '),
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
    if (input.missionPhase) body.mission_phase = input.missionPhase;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    let data: any, error: any;
    try {
      const res = await supabase.functions.invoke('decode-intel', {
        body,
        headers: { Authorization: `Bearer ${session.access_token}` },
        signal: controller.signal,
      });
      data = res.data;
      error = res.error;
    } finally {
      clearTimeout(timeout);
    }

    if (error) {
      try {
        const errorBody = await (error as any).context?.text?.();
        console.error('[DARKO] Edge function error:', errorBody);
      } catch {}
      return null;
    }

    if (data?.error) {
      console.error('[DARKO] Decode blocked:', data.error);
      return null;
    }

    const validTypes = ['tactical', 'strategic', 'warning', 'validation', 'interrogation', 'silence', 'phase_advance'] as const;
    return {
      response_type: validTypes.includes(data.response_type) ? data.response_type : 'strategic',
      mission_status: data.mission_status ?? '',
      primary_response: data.primary_response ?? '',
      scripts: Array.isArray(data.scripts) && data.scripts.length > 0 ? data.scripts : null,
      handler_note: data.handler_note ?? null,
      next_directive: data.next_directive ?? '',
      phase_update: data.phase_update ? Number(data.phase_update) : null,
    };
  } catch (err) {
    console.error('[DARKO] decodeMessage error:', err);
    return null;
  }
}

// ── Audio transcription — Supabase Edge Function ──────────────────────────────

export async function transcribeAudio(audioBase64: string, mimeType = 'audio/m4a'): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke('transcribe-audio', {
      body: { audioBase64, mimeType },
    });

    if (error) {
      console.error('[DARKO] transcribeAudio error:', JSON.stringify(error));
      try {
        const detail = await (error as any).context?.text?.();
        console.error('[DARKO] transcribeAudio detail:', detail);
      } catch {}
      return null;
    }

    if (!data?.text) return null;

    return data.text;
  } catch (err) {
    console.error('[DARKO] transcribeAudio error:', err);
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
            threat_level: (e.result as any).mission_status ?? '',
            the_psyche: (e.result as any).primary_response ?? (e.result as any).the_psyche ?? '',
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
