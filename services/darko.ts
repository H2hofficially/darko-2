import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { TargetProfile, saveTargetProfile, getConversation } from './storage';

// ── Types ──────────────────────────────────────────────────────────────────────

// Mirrors the UserIntent taxonomy in supabase/functions/_shared/intent-types.ts.
// Kept inline here (rather than imported from a shared module) because the
// client and edge function can't share Deno/Node module paths cleanly without
// build tooling — a five-string union is cheap to duplicate.
export type ExpectedNextInput =
  | 'target_message'
  | 'draft_review'
  | 'strategy_question'
  | 'clarification'
  | 'meta_question'
  | null;

export type DueWindow =
  | 'now'
  | 'tonight'
  | 'tomorrow_morning'
  | 'tomorrow_afternoon'
  | 'tomorrow_evening'
  | 'in_2_days'
  | 'in_3_days'
  | 'when_she_replies';

export interface ActionDirective {
  instruction: string;
  script_to_send: string;
  due_window: DueWindow;
  deadline_iso: string;
  created_at: string;
  notified_at?: string | null;
}

export interface DarkoResponse {
  text: string;
  scripts: string[];
  alerts: string[];
  phaseUpdate: number | null;
  phaseConfidence: number | null;
  reads: string[];
  isCampaign: boolean;
  // Strategist's prediction of the next user input, used by the classifier on
  // the next turn as a prior. Null on legacy rows or when the strategist
  // didn't emit it.
  expectedNextInput: ExpectedNextInput;
  // Time-bound commitment Darko makes for the operator. When non-null the
  // client persists to targets.pending_action and surfaces it as the
  // ACTIVE DIRECTIVE card in the Playbook.
  actionDirective: ActionDirective | null;
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
// Step-4 of the render pipeline: JSON-shaped output that neither parses nor
// yields handler_note via regex rescue. NEVER expose raw JSON in the bubble —
// surface a clearly-actionable re-run line instead. Distinct from
// NEUTRAL_FALLBACK, which is for the soft "model returned nothing usable"
// case rather than a render-side failure.
const RENDER_ERROR_FALLBACK = '// INTEL RECEIVED — render error, tap to re-run';

const EMPTY_RESPONSE: DarkoResponse = {
  text: '',
  scripts: [],
  alerts: [],
  phaseUpdate: null,
  phaseConfidence: null,
  reads: [],
  isCampaign: false,
  expectedNextInput: null,
  actionDirective: null,
};

const VALID_DUE_WINDOWS: ReadonlyArray<string> = [
  'now',
  'tonight',
  'tomorrow_morning',
  'tomorrow_afternoon',
  'tomorrow_evening',
  'in_2_days',
  'in_3_days',
  'when_she_replies',
];

// Translate a due_window into a concrete deadline ISO. Falls back to whatever
// the model emitted as deadline_iso if that already parses; otherwise computes
// from "now" using the conventional window. Keeps Darko's commitments
// machine-actionable for check-campaigns even when the model omits a stamp.
function resolveDeadlineIso(window: string, modelEmitted: unknown): string {
  if (typeof modelEmitted === 'string') {
    const t = Date.parse(modelEmitted);
    if (!isNaN(t)) return new Date(t).toISOString();
  }
  const now = new Date();
  const d = new Date(now);
  switch (window) {
    case 'now':
      d.setMinutes(d.getMinutes() + 30); break;
    case 'tonight':
      d.setHours(21, 0, 0, 0); break;
    case 'tomorrow_morning':
      d.setDate(d.getDate() + 1); d.setHours(10, 0, 0, 0); break;
    case 'tomorrow_afternoon':
      d.setDate(d.getDate() + 1); d.setHours(15, 0, 0, 0); break;
    case 'tomorrow_evening':
      d.setDate(d.getDate() + 1); d.setHours(20, 0, 0, 0); break;
    case 'in_2_days':
      d.setDate(d.getDate() + 2); d.setHours(15, 0, 0, 0); break;
    case 'in_3_days':
      d.setDate(d.getDate() + 3); d.setHours(15, 0, 0, 0); break;
    case 'when_she_replies':
      // Open-ended — no deadline. Use 7 days as outer bound for the cron sweep.
      d.setDate(d.getDate() + 7); break;
    default:
      d.setDate(d.getDate() + 1); d.setHours(15, 0, 0, 0);
  }
  return d.toISOString();
}

function readActionDirective(parsed: any): ActionDirective | null {
  const ad = parsed?.action_directive;
  if (!ad || typeof ad !== 'object') return null;
  const instruction = typeof ad.instruction === 'string' ? ad.instruction.trim() : '';
  if (!instruction) return null;
  const due = typeof ad.due_window === 'string' ? ad.due_window.trim() : '';
  if (!VALID_DUE_WINDOWS.includes(due)) return null;
  const script = typeof ad.script_to_send === 'string' ? ad.script_to_send.trim() : '';
  return {
    instruction,
    script_to_send: script,
    due_window: due as DueWindow,
    deadline_iso: resolveDeadlineIso(due, ad.deadline_iso),
    created_at: new Date().toISOString(),
    notified_at: null,
  };
}

const VALID_EXPECTED_NEXT_INPUTS: ReadonlyArray<string> = [
  'target_message',
  'draft_review',
  'strategy_question',
  'clarification',
  'meta_question',
];

// Pull the strategist's expected_next_input out of either the new
// state_update.expected_next_input field or the deprecated top-level
// expected_next_input field (some legacy responses). Returns null on
// anything malformed.
function readExpectedNextInput(parsed: any): ExpectedNextInput {
  const raw =
    parsed?.state_update?.expected_next_input ??
    parsed?.expected_next_input ??
    null;
  if (typeof raw !== 'string') return null;
  return VALID_EXPECTED_NEXT_INPUTS.includes(raw)
    ? (raw as ExpectedNextInput)
    : null;
}

// Strip a wrapping Markdown code fence (```json ... ``` or ``` ... ```).
// DeepSeek occasionally fences JSON output despite system-prompt instructions
// telling it not to. Without this, fenced JSON slips past every JSON-shape
// check below (which all test for a leading '{' or '['), leaving raw JSON to
// be rendered as a Markdown code block in the chat bubble. Exported so the
// render layer can apply the same defense before its own JSON checks.
export function stripCodeFence(text: string): string {
  const t = (text ?? '').trim();
  if (!t.startsWith('```')) return t;
  // ```lang? \n body \n ```   — body may itself contain ``` only if the outer
  // fence was the model's own wrapping (one wrap deep is the case we've seen).
  const m = t.match(/^```[a-zA-Z0-9_-]*\s*\n?([\s\S]*?)\n?```\s*$/);
  return m ? m[1].trim() : t;
}

// Keys that mark a `{...}` object as Darko's JSON contract envelope (vs. some
// incidental brace block in prose). At least one must be present before
// extractEmbeddedEnvelope will treat a parsed object as the real envelope.
const ENVELOPE_KEYS = [
  'handler_note', 'next_directive', 'visible_arsenal', 'hidden_intel',
  'state_update', 'action_directive', 'intent', 'mission_status',
] as const;

// Some models (DeepSeek especially) ignore the JSON-only instruction and emit
// a free-prose answer FOLLOWED BY the JSON contract envelope, concatenated.
// The combined blob starts with prose, so it fails every leading-'{' check and
// would otherwise render the raw JSON in the chat bubble. This carves out the
// trailing brace-balanced envelope so the JSON branch can parse it; the prose
// leak is discarded. Returns null when no parseable Darko envelope is embedded.
export function extractEmbeddedEnvelope(text: string): string | null {
  const t = (text ?? '').trim();
  // The real envelope is the trailing object — slicing from its '{' to the end
  // of the string parses cleanly. Try each '{' in turn; earlier ones (stray
  // braces in prose) fail JSON.parse and are skipped.
  for (let i = t.indexOf('{'); i !== -1; i = t.indexOf('{', i + 1)) {
    const candidate = t.slice(i).trimEnd();
    if (!candidate.endsWith('}')) continue;
    try {
      const parsed = JSON.parse(candidate);
      if (
        parsed && typeof parsed === 'object' && !Array.isArray(parsed) &&
        ENVELOPE_KEYS.some((k) => k in parsed)
      ) {
        return candidate;
      }
    } catch {
      // Not a valid object from this '{' — try the next one.
    }
  }
  return null;
}

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

// Rescue handler_note from a malformed JSON blob. The body pattern
// (?:[^"\\]|\\.)* correctly walks a JSON string literal: any char that
// isn't a quote or backslash, OR a backslash followed by any single char
// (an escape sequence). This survives handler_note prose full of
// 'quoted' words and embedded backslashes that would trip a lazier
// matcher. The trailing `"` anchors on the real terminator.
function rescueHandlerNote(raw: string): string | null {
  const m = raw.match(/"handler_note"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (!m) return null;
  return unescapeJsonStringBody(m[1]);
}

export function parseDarkoResponse(raw: string): DarkoResponse {
  const normalised = (raw ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  // Strip Markdown code fence first — otherwise fenced JSON ('```json {...}')
  // fails the leading-{ check below and falls through to the plain-text branch,
  // which renders the raw JSON to the user.
  const trimmed = stripCodeFence(normalised);
  if (!trimmed) return { ...EMPTY_RESPONSE };

  const looksLikeJson = trimmed.startsWith('{') || trimmed.startsWith('[');

  // Prose-then-JSON leak: the model emitted a free-prose answer followed by
  // the JSON envelope. The blob fails the leading-'{' test above, so without
  // this it would fall to Case D and render the raw JSON. Carve out the
  // envelope and parse that; the leading prose leak is discarded.
  if (!looksLikeJson) {
    const embedded = extractEmbeddedEnvelope(trimmed);
    if (embedded) return parseDarkoResponse(embedded);
  }

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
          expectedNextInput: readExpectedNextInput(parsed),
          actionDirective: readActionDirective(parsed),
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

    // JSON-shaped but unrecoverable (parse failed AND regex rescue failed).
    // This is the step-4 render-error sink — surface the re-run literal.
    // NEVER surface raw JSON.
    return { ...EMPTY_RESPONSE, text: RENDER_ERROR_FALLBACK };
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
    // Plain-text / block-marker responses don't carry expected_next_input
    // or action_directive; null is the correct legacy default for both.
    expectedNextInput: null,
    actionDirective: null,
  };
}

// Progressive renderer for in-flight streams. Returns the text to display in
// the streaming bubble. Caller is responsible for appending a cursor/ellipsis
// when the return value is empty.
//
// Contract: NEVER returns raw JSON. If the stream is JSON-shaped but the
// handler_note key hasn't arrived yet, returns '' so the bubble just shows
// a cursor.
// Detects schema-keyword fragments leaking into operator-facing prose during
// stream. Matches both JSON-style ("action_directive":) and prose-style
// (action_directive = ..., due_window: tomorrow_afternoon) leaks. Used by
// stripStreamMarkers to hide partial garbage until the full parse resolves
// to clean content.
const SCHEMA_KEYWORDS = [
  'action_directive',
  'due_window',
  'deadline_iso',
  'script_to_send',
  'next_directive',
  'strategic_directive',
  'phase_update',
  'state_update',
  'visible_arsenal',
  'hidden_intel',
  'handler_note',
  'expected_next_input',
] as const;

function containsSchemaLeakage(text: string): boolean {
  if (!text) return false;
  for (const kw of SCHEMA_KEYWORDS) {
    // Match the keyword followed by ':', '=', or '":"' — any pattern that
    // signals the model wrote a schema-field reference into prose.
    const re = new RegExp(`\\b${kw}\\b\\s*[:=]`, 'i');
    if (re.test(text)) return true;
  }
  return false;
}

export function stripStreamMarkers(text: string): string {
  const normalised = (text ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  // Strip Markdown code fence so a fenced JSON stream is treated as JSON
  // (and therefore hidden behind the cursor) instead of leaking through as
  // a Markdown code block.
  const fenceStripped = stripCodeFence(normalised);
  const trimmed = fenceStripped.trimStart();
  if (!trimmed) return '';

  // ── JSON-shaped stream ──────────────────────────────────────────────────────
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    // Match an open-ended handler_note value: captures whatever has streamed
    // so far, up to an unescaped closing quote OR end-of-buffer.
    const m = trimmed.match(/"handler_note"\s*:\s*"([\s\S]*?)(?:(?<!\\)"|$)/);
    if (m) {
      const body = unescapeJsonStringBody(m[1]);
      // Defensive: if the model leaked schema-keyword fragments INTO the
      // handler_note prose (e.g. "action_directive = ..." or
      // "due_window: tomorrow_afternoon"), hide it during stream — the
      // final parse falls back to a clean field. Better cursor-only than
      // raw schema text flashing through the bubble.
      if (containsSchemaLeakage(body)) return '';
      return body;
    }

    // JSON started but handler_note hasn't streamed yet → empty buffer,
    // so the caller renders only the blinking cursor. NEVER expose raw JSON.
    return '';
  }

  // ── Plain text / legacy v3 block-marker format ──────────────────────────────
  // A prose answer may be followed (mid-stream) by the JSON contract envelope
  // — a model leak. Cut everything from the envelope's opening brace so raw
  // JSON never streams into the bubble; the final parse recovers clean fields.
  const envelopeStart = normalised.search(/\{\s*"/);
  const proseOnly = envelopeStart >= 0 ? normalised.slice(0, envelopeStart) : normalised;
  return proseOnly
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

    // ── Progressive handler_note extraction ─────────────────────────────
    // The model emits JSON like {"intent":"...","handler_note":"...",...}.
    // The chat bubble must NEVER see raw JSON during stream — it only sees
    // the decoded handler_note body. We carve it out char-by-char as
    // chunks arrive, decoding JSON string escapes inline, and pass the
    // growing decoded text to onChunk. parseDarkoResponse runs on the
    // full accumulated buffer at finish() and handles the regex/legacy
    // fallback when the marker never arrived.
    // Whitespace-tolerant: matches `"handler_note":"`, `"handler_note": "`,
    // `"handler_note" : "`, etc. A literal indexOf was too strict — when the
    // model emitted any space around the colon the marker missed and the
    // bubble fell through to rendering raw accumulated JSON.
    const HANDLER_NOTE_RE = /"handler_note"\s*:\s*"/;
    let inHandlerNote = false;
    let handlerNoteDone = false;
    let pendingEscape = false;
    let handlerNoteText = '';

    const feedHandlerNoteChars = (chars: string): boolean => {
      let changed = false;
      for (let i = 0; i < chars.length && !handlerNoteDone; i++) {
        const c = chars[i];
        if (pendingEscape) {
          pendingEscape = false;
          switch (c) {
            case 'n':  handlerNoteText += '\n'; break;
            case 't':  handlerNoteText += '\t'; break;
            case 'r':  handlerNoteText += '\r'; break;
            case 'b':  handlerNoteText += '\b'; break;
            case 'f':  handlerNoteText += '\f'; break;
            case '"':  handlerNoteText += '"';  break;
            case '\\': handlerNoteText += '\\'; break;
            case '/':  handlerNoteText += '/';  break;
            // \uXXXX is vanishingly rare in handler_note prose; emit raw
            // and let parseDarkoResponse decode on completion.
            case 'u':  handlerNoteText += '\\u'; break;
            default:   handlerNoteText += c;
          }
          changed = true;
          continue;
        }
        if (c === '\\') { pendingEscape = true; continue; }
        if (c === '"')  { handlerNoteDone = true; return changed; }
        handlerNoteText += c;
        changed = true;
      }
      return changed;
    };

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
        if (text) {
          accumulated += text;
          let changed = false;
          if (!inHandlerNote && !handlerNoteDone) {
            // The marker may straddle chunk boundaries — search the full
            // accumulator, not the delta.
            const m = HANDLER_NOTE_RE.exec(accumulated);
            if (m) {
              inHandlerNote = true;
              const startPos = m.index + m[0].length;
              changed = feedHandlerNoteChars(accumulated.substring(startPos));
            }
          } else if (inHandlerNote && !handlerNoteDone) {
            changed = feedHandlerNoteChars(text);
          }
          // Only emit prose if we've actually entered and are building the
          // handler_note body. If the marker hasn't arrived yet, keep the
          // bubble hidden (LoadingBubble covers the gap). This prevents any
          // accumulated JSON from leaking through during the prefix phase.
          if (inHandlerNote && changed) {
            onChunk(handlerNoteText);
          }
        }
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
