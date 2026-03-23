import { supabase } from '../lib/supabase';
import { DecodeEntry, TargetProfile, saveTargetProfile } from './storage';

export type CampaignBriefResult = {
  intent: 'campaign_brief';
  mission_status: string;
  target_profile: {
    psychological_type: string;
    attachment_style: string;
    primary_vulnerability: string;
    seduction_archetype_to_deploy: string;
    key_insight: string;
  };
  current_phase: number;
  phase_name: string;
  phase_assessment: string;
  immediate_next_move: string;
  first_message_to_send: string;
  first_message_rationale: string;
  campaign_roadmap: Array<{
    phase: number;
    phase_name: string;
    objective: string;
    estimated_duration: string;
    key_tactic: string;
    behavioral_directives: string[];
    message_scripts: Array<{ situation: string; message: string; effect: string }>;
    advancement_signals: string[];
    mistakes_to_avoid: string[];
  }>;
  handler_note: string | null;
};

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
  targetId?: string;
  targetCommunicationStyle?: string;
  briefMode?: boolean;
};

function buildHistory(history: DecodeEntry[]) {
  return history.map((e) => ({
    inputMessage: e.inputMessage,
    timestamp: e.timestamp,
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
): Promise<DecoderResult | CampaignBriefResult | null> {
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
    if (input.targetCommunicationStyle) body.target_communication_style = input.targetCommunicationStyle;
    if (input.briefMode) body.brief_mode = true;

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

    // Campaign brief mode — return structured result directly
    if (data?.intent === 'campaign_brief') {
      return data as CampaignBriefResult;
    }

    const validTypes = ['tactical', 'strategic', 'warning', 'validation', 'interrogation', 'silence', 'phase_advance'] as const;
    const result: DecoderResult = {
      response_type: validTypes.includes(data.response_type) ? data.response_type : 'strategic',
      mission_status: data.mission_status ?? '',
      primary_response: data.primary_response ?? '',
      scripts: Array.isArray(data.scripts) && data.scripts.length > 0 ? data.scripts : null,
      handler_note: data.handler_note ?? null,
      next_directive: data.next_directive ?? '',
      phase_update: data.phase_update ? Number(data.phase_update) : null,
    };

    // Background profile refresh — non-blocking, fires after every decode
    if (input.targetId && (input.historyContext?.length ?? 0) > 0) {
      generateTargetProfile(input.historyContext!, input.leverage, input.objective)
        .then((profile) => {
          if (profile) saveTargetProfile(input.targetId!, profile);
        })
        .catch(() => {});
    }

    return result;
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
  leverage?: string,
  objective?: string,
): Promise<TargetProfile | null> {
  try {
    const body: Record<string, unknown> = {
      history: history.map((e) => ({
        inputMessage: e.inputMessage,
        timestamp: e.timestamp,
        result: {
          threat_level: (e.result as any).mission_status ?? '',
          the_psyche: (e.result as any).primary_response ?? (e.result as any).the_psyche ?? '',
        },
      })),
    };
    if (leverage) body.leverage = leverage;
    if (objective) body.objective = objective;

    const { data, error } = await supabase.functions.invoke('generate-profile', { body });
    if (error || !data) return null;
    return {
      dominant_archetype: data.dominant_archetype ?? '',
      attachment_style: data.attachment_style ?? '',
      manipulation_patterns: data.manipulation_patterns ?? [],
      vulnerability_score: data.vulnerability_score ?? '',
      summary: data.summary ?? '',
      relationship_brief: data.relationship_brief,
      mbti_profile: data.mbti_profile ?? undefined,
      strengths: data.strengths ?? [],
      weaknesses: data.weaknesses ?? [],
      likes: data.likes ?? [],
      dislikes: data.dislikes ?? [],
      birthday: data.birthday ?? null,
      location: data.location ?? null,
      manipulation_vectors: data.manipulation_vectors ?? [],
      power_dynamic: data.power_dynamic ?? '',
      predicted_next_behavior: data.predicted_next_behavior ?? '',
      key_turning_points: data.key_turning_points ?? [],
      operative_mistakes: data.operative_mistakes ?? [],
      target_communication_style: data.target_communication_style ?? '',
      relationship_momentum: data.relationship_momentum ?? '',
      last_known_emotional_state: data.last_known_emotional_state ?? '',
      generatedAt: data.generatedAt ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
