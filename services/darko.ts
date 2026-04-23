import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { TargetProfile, saveTargetProfile, getConversation } from './storage';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface DarkoResponse {
  text: string;
  scripts: string[];
  alerts: string[];
  phaseUpdate: number | null;
  phaseConfidence: number | null;
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

const NEUTRAL_FALLBACK = 'Intel received. Send your next input.';

const EMPTY_RESPONSE: DarkoResponse = {
  text: '',
  scripts: [],
  alerts: [],
  phaseUpdate: null,
  phaseConfidence: null,
  reads: [],
  isCampaign: false,
};

// Decode the escape sequences present inside a JSON string literal we've
// carved out with a regex (i.e. without the surrounding quotes).
function unescapeJsonStringBody(body: string): string {
  try {
    return JSON.parse('"' + body + '"');
  } catch {
    return body
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\');
  }
}

// Rescue handler_note from a malformed or truncated JSON blob. Matches an
// unescaped closing quote OR end-of-string so partial streams still work.
function rescueHandlerNote(raw: string): string | null {
  const m = raw.match(/"handler_note"\s*:\s*"([\s\S]*?)(?<!\\)"/);
  if (!m) return null;
  return unescapeJsonStringBody(m[1]);
}

export function parseDarkoResponse(raw: string): DarkoResponse {
  const trimmed = (raw ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (!trimmed) return { ...EMPTY_RESPONSE };

  const looksLikeJson = trimmed.startsWith('{') || trimmed.startsWith('[');

  // ── Cases A / B: well-formed JSON ─────────────────────────────────────────────
  if (looksLikeJson) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object') {
        const scripts: string[] = [];
        if (parsed.visible_arsenal?.option_1_script)
          scripts.push(String(parsed.visible_arsenal.option_1_script));
        if (parsed.visible_arsenal?.option_2_script)
          scripts.push(String(parsed.visible_arsenal.option_2_script));

        const alerts: string[] = Array.isArray(parsed.hidden_intel?.the_directive)
          ? parsed.hidden_intel.the_directive.map(String)
          : [];

        // Phase update — accept numeric (phase_update) or Greene name (state_update.current_phase)
        let phaseUpdate: number | null = null;
        const greeneToNumber: Record<string, number> = {
          stray: 1, approach: 2, decide: 3, fall: 4,
        };
        const rawPhase = parsed.phase_update ?? parsed.state_update?.current_phase;
        if (rawPhase !== null && rawPhase !== undefined) {
          const asStr = String(rawPhase).trim().toLowerCase();
          if (asStr in greeneToNumber) {
            phaseUpdate = greeneToNumber[asStr];
          } else {
            const n = parseInt(asStr, 10);
            if (!isNaN(n)) phaseUpdate = n;
          }
        }

        // Phase confidence — 0.0-1.0 float emitted by handler on advance
        let phaseConfidence: number | null = null;
        const rawConf = parsed.phase_confidence ?? parsed.state_update?.phase_confidence;
        if (rawConf !== null && rawConf !== undefined) {
          const c = Number(rawConf);
          if (!isNaN(c)) phaseConfidence = Math.max(0, Math.min(1, c));
        }

        // Case A: handler_note present and non-empty
        let text =
          typeof parsed.handler_note === 'string' ? parsed.handler_note.trim() : '';

        // Case B: handler_note null/empty → try next_directive, then first
        // non-empty string in visible_arsenal.
        if (!text && typeof parsed.next_directive === 'string') {
          text = parsed.next_directive.trim();
        }
        if (
          !text &&
          parsed.visible_arsenal &&
          typeof parsed.visible_arsenal === 'object'
        ) {
          for (const val of Object.values(parsed.visible_arsenal)) {
            if (typeof val === 'string' && val.trim().length > 0) {
              text = val.trim();
              break;
            }
          }
        }

        if (!text) text = NEUTRAL_FALLBACK;

        return {
          text,
          scripts,
          alerts,
          phaseUpdate,
          phaseConfidence,
          reads: [],
          isCampaign: parsed.intent === 'campaign_brief',
        };
      }
    } catch {
      // fall through to Case C
    }

    // ── Case C: malformed/truncated JSON — regex-rescue handler_note ───────────
    const rescued = rescueHandlerNote(trimmed);
    if (rescued && rescued.trim().length > 0) {
      return { ...EMPTY_RESPONSE, text: rescued };
    }

    // JSON-shaped but unrecoverable → neutral fallback. NEVER surface raw JSON.
    return { ...EMPTY_RESPONSE, text: NEUTRAL_FALLBACK };
  }

  // ── Case D: plain text (or legacy v3 block-marker format) ─────────────────────
  const scripts: string[] = [];
  const alerts: string[] = [];
  const reads: string[] = [];
  let phaseUpdate: number | null = null;
  let isCampaign = false;

  const blockPattern =
    /\/\/ (SCRIPT|ALERT|PHASE UPDATE(?: \[(\d+)\])?|READ|CAMPAIGN)\n([\s\S]*?)\/\/ END(?:\n|$)/g;

  let match: RegExpExecArray | null;
  while ((match = blockPattern.exec(trimmed)) !== null) {
    const type = match[1];
    const phaseNum = match[2];
    const content = (match[3] ?? '').trim();
    if (type === 'SCRIPT') scripts.push(content);
    else if (type === 'ALERT') alerts.push(content);
    else if (type.startsWith('PHASE UPDATE'))
      phaseUpdate = phaseNum ? parseInt(phaseNum, 10) : null;
    else if (type === 'READ') reads.push(content);
    else if (type === 'CAMPAIGN') isCampaign = true;
  }

  const cleanText = trimmed
    .replace(blockPattern, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return {
    text: cleanText || NEUTRAL_FALLBACK,
    scripts,
    alerts,
    phaseUpdate,
    phaseConfidence: null,
    reads,
    isCampaign,
  };
}

// Progressive renderer for in-flight streams. Returns the text to display in
// the streaming bubble. Caller is responsible for appending a cursor/ellipsis
// when the return value is empty.
//
// Contract: NEVER returns raw JSON. If the stream is JSON-shaped but the
// handler_note key hasn't arrived yet, returns '' so the bubble just shows
// a cursor.
export function stripStreamMarkers(text: string): string {
  const normalised = (text ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const trimmed = normalised.trimStart();
  if (!trimmed) return '';

  // ── JSON-shaped stream ──────────────────────────────────────────────────────
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    // Match an open-ended handler_note value: captures whatever has streamed
    // so far, up to an unescaped closing quote OR end-of-buffer.
    const m = trimmed.match(/"handler_note"\s*:\s*"([\s\S]*?)(?:(?<!\\)"|$)/);
    if (m) return unescapeJsonStringBody(m[1]);

    // JSON started but handler_note hasn't streamed yet → empty buffer,
    // so the caller renders only the blinking cursor. NEVER expose raw JSON.
    return '';
  }

  // ── Plain text / legacy v3 block-marker format ──────────────────────────────
  return normalised
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

  supabase.auth.getSession().then(async ({ data: { session: existingSession } }) => {
    if (cancelled) return;

    let session = existingSession;

    // Force refresh if token is expired or expires within the next 60 seconds
    const nowSec = Math.floor(Date.now() / 1000);
    const expiresAt: number = (session as any)?.expires_at ?? 0;
    if (!session || expiresAt < nowSec + 60) {
      const { data: refreshed } = await supabase.auth.refreshSession();
      session = refreshed.session ?? session;
    }

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
        const text: string = parsed?.choices?.[0]?.delta?.content ?? '';
        if (text) { accumulated += text; onChunk(accumulated); }
        const finishReason: string | null | undefined = parsed?.choices?.[0]?.finish_reason;
        if (finishReason === 'stop') finish();
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
              // Our function uses .error; Supabase infrastructure uses .message
              errMsg = errBody.error ?? errBody.message ?? `HTTP ${res.status}`;
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
            // Our function uses .error; Supabase infrastructure uses .message
            errMsg = parsed.error ?? parsed.message ?? `HTTP ${status}`;
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
      relationship_narrative: data.relationship_narrative ?? undefined,
      generatedAt: data.generatedAt ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
