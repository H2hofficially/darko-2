import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { TargetProfile, saveTargetProfile, getConversation } from './storage';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface DarkoResponse {
  text: string;
  scripts: string[];
  alerts: string[];
  phaseUpdate: number | null;
  reads: string[];
  isCampaign: boolean;
}

export interface MessageInput {
  message: string;
  targetId: string;
  leverage?: string;
  objective?: string;
  missionPhase?: number;
  targetCommunicationStyle?: string;
  imageBase64?: string;
  imageMimeType?: string;
}

// ── Block parser ───────────────────────────────────────────────────────────────

export function parseDarkoResponse(raw: string): DarkoResponse {
  const scripts: string[] = [];
  const alerts: string[] = [];
  const reads: string[] = [];
  let phaseUpdate: number | null = null;
  let isCampaign = false;

  // Normalize line endings so the regex works regardless of platform
  const normalised = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Match // TYPE or // PHASE UPDATE [N] ... // END  (// END may be followed by anything)
  const blockPattern =
    /\/\/ (SCRIPT|ALERT|PHASE UPDATE(?: \[(\d+)\])?|READ|CAMPAIGN)\n([\s\S]*?)\/\/ END(?:\n|$)/g;

  let match: RegExpExecArray | null;

  while ((match = blockPattern.exec(normalised)) !== null) {
    const type = match[1];
    const phaseNum = match[2]; // group 2 = (\d+) inside PHASE UPDATE [N]
    const content = (match[3] ?? '').trim(); // group 3 = ([\s\S]*?) block body

    if (type === 'SCRIPT') {
      scripts.push(content);
    } else if (type === 'ALERT') {
      alerts.push(content);
    } else if (type.startsWith('PHASE UPDATE')) {
      phaseUpdate = phaseNum ? parseInt(phaseNum, 10) : null;
    } else if (type === 'READ') {
      reads.push(content);
    } else if (type === 'CAMPAIGN') {
      isCampaign = true;
    }
  }

  // Remove extracted blocks from prose, collapse excess blank lines
  const cleanText = normalised
    .replace(blockPattern, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return { text: cleanText, scripts, alerts, phaseUpdate, reads, isCampaign };
}

// Strip block markers from in-progress streaming text for cleaner display
export function stripStreamMarkers(text: string): string {
  return text
    .replace(/\/\/ (SCRIPT|ALERT|READ|PHASE UPDATE[^\n]*|CAMPAIGN)\n/g, '')
    .replace(/\/\/ END\n?/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ── Profile refresh — debounced 3 min ─────────────────────────────────────────

let _profileTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleProfileRefresh(
  targetId: string,
  leverage?: string,
  objective?: string,
): void {
  if (_profileTimer) clearTimeout(_profileTimer);
  _profileTimer = setTimeout(async () => {
    _profileTimer = null;
    try {
      const history = await getConversation(targetId, 30);
      if (history.length === 0) return;
      const profile = await generateTargetProfile(history, leverage, objective);
      if (profile) await saveTargetProfile(targetId, profile);
    } catch {
      // non-fatal
    }
  }, 3 * 60 * 1000);
}

// ── Edge function URL ──────────────────────────────────────────────────────────

function edgeUrl(name: string): string {
  const base = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
  return `${base}/functions/v1/${name}`;
}

// ── sendMessage — SSE streaming ────────────────────────────────────────────────
// Web: native fetch() + ReadableStream (browsers support it natively)
// Native: react-native-sse

export function sendMessage(
  input: MessageInput,
  onChunk: (accumulatedText: string) => void,
  onComplete: (response: DarkoResponse) => void,
  onError: (error: string) => void,
): () => void {
  let cancelled = false;
  // Native ESS handle
  let es: any = null;
  // Web fetch abort controller
  const abortController = Platform.OS === 'web' ? new AbortController() : null;

  supabase.auth.getSession().then(({ data: { session } }) => {
    if (cancelled) return;
    if (!session) { onError('Not authenticated'); return; }

    const body: Record<string, unknown> = {
      message: input.message,
      target_id: input.targetId,
    };
    if (input.leverage) body.leverage = input.leverage;
    if (input.objective) body.objective = input.objective;
    if (input.missionPhase) body.mission_phase = input.missionPhase;
    if (input.targetCommunicationStyle)
      body.target_communication_style = input.targetCommunicationStyle;
    if (input.imageBase64) {
      body.imageBase64 = input.imageBase64;
      body.imageMimeType = input.imageMimeType ?? 'image/jpeg';
    }

    let accumulated = '';
    let completed = false;

    const finish = () => {
      if (cancelled || completed) return;
      completed = true;
      es?.close();
      const darkoResponse = parseDarkoResponse(accumulated);
      scheduleProfileRefresh(input.targetId, input.leverage, input.objective);
      onComplete(darkoResponse);
    };

    const processChunk = (jsonStr: string) => {
      if (cancelled || completed) return;
      if (!jsonStr) return;
      if (jsonStr === '[DONE]') { finish(); return; }
      try {
        const parsed = JSON.parse(jsonStr);
        const text: string = parsed?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        if (text) { accumulated += text; onChunk(accumulated); }
        const finishReason: string | undefined = parsed?.candidates?.[0]?.finishReason;
        if (finishReason && finishReason !== 'STOP_REASON_UNSPECIFIED') finish();
      } catch {
        // malformed chunk — skip
      }
    };

    if (Platform.OS === 'web') {
      // ── Web path: fetch + ReadableStream ────────────────────────────────────
      (async () => {
        try {
          const res = await fetch(edgeUrl('decode-intel'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify(body),
            signal: abortController!.signal,
          });

          if (!res.ok) {
            let errMsg = '// signal lost';
            try {
              const errBody = await res.json();
              if (errBody.error) errMsg = errBody.error;
            } catch {}
            if (!cancelled) onError(errMsg);
            return;
          }

          const reader = res.body!.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            if (cancelled) { reader.cancel(); break; }
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop()!; // keep incomplete last line
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                processChunk(line.slice(6).trim());
              }
            }
          }
          // Process any remaining buffer
          if (buffer.startsWith('data: ')) processChunk(buffer.slice(6).trim());
          finish();
        } catch (err: any) {
          if (err?.name === 'AbortError' || cancelled) return;
          console.error('[DARKO] web sendMessage error:', err);
          if (!cancelled) onError('// signal lost');
        }
      })();
    } else {
      // ── Native path: react-native-sse ───────────────────────────────────────
      const EventSource = require('react-native-sse').default;
      es = new EventSource(edgeUrl('decode-intel'), {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        method: 'POST',
        body: JSON.stringify(body),
        pollingInterval: 0,
      });

      es.addEventListener('message', (event: any) => {
        processChunk(event.data ?? '');
      });

      es.addEventListener('error', (event: any) => {
        if (cancelled || completed) return;
        const status: number | undefined = event?.status ?? event?.xhrStatus;
        if (status && status !== 200) {
          let errMsg = '// signal lost';
          try {
            const parsed = JSON.parse(event?.message ?? '');
            if (parsed.error) errMsg = parsed.error;
          } catch {}
          onError(errMsg);
        } else {
          finish();
        }
      });

      es.addEventListener('close', () => finish());
      es.addEventListener('done', () => finish());
    }
  }).catch((err) => {
    if (!cancelled) {
      console.error('[DARKO] sendMessage error:', err);
      onError('// signal lost');
    }
  });

  return () => {
    cancelled = true;
    es?.close();
    abortController?.abort();
  };
}

// ── Audio transcription ────────────────────────────────────────────────────────

export async function transcribeAudio(
  audioBase64: string,
  mimeType = 'audio/m4a',
): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke('transcribe-audio', {
      body: { audioBase64, mimeType },
    });
    if (error) {
      console.error('[DARKO] transcribeAudio error:', JSON.stringify(error));
      return null;
    }
    return data?.text ?? null;
  } catch (err) {
    console.error('[DARKO] transcribeAudio error:', err);
    return null;
  }
}

// ── Target profile generation ─────────────────────────────────────────────────

export async function generateTargetProfile(
  history: Array<{ role: string; content: string; created_at: string }>,
  leverage?: string,
  objective?: string,
): Promise<TargetProfile | null> {
  try {
    // generate-profile expects the legacy history format — adapt from conversation messages
    const legacyHistory = history
      .filter((m) => m.role === 'darko')
      .map((m) => ({
        inputMessage: '',
        timestamp: m.created_at,
        result: { the_psyche: m.content },
      }));

    const body: Record<string, unknown> = { history: legacyHistory };
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
