# DARKO V3 — Architecture: Conversational Strategist

**Date:** 2026-03-23
**Scope:** Transform DARKO from a decode-and-respond tool into a persistent AI relationship strategist you talk to like a genius friend on retainer.

---

## The Shift

**V2 (current):** User pastes a message → DARKO returns a structured JSON report → user copies a script. Every interaction is a transaction. DARKO reacts but never initiates within a conversation. Follow-ups require a new decode.

**V3 (target):** DARKO is a conversational partner per target. You talk to it. You say "she just sent me this, what do I do?" and DARKO responds in natural language with a judgment call, a script, and the reasoning. You push back — "that's too aggressive" — and DARKO adjusts. You ask "should I reach out today or wait?" and DARKO makes the call based on everything it knows. The structured data (scripts, threat levels, phase updates) still exists but is embedded in conversation, not the conversation itself.

---

## What Changes (and What Doesn't)

### Stays the same
- Supabase auth, database, edge functions architecture
- Target profiles, dossier panel, campaign brief mode
- RAG pipeline (book passages)
- Temporal intelligence calculations
- Auto profile refresh after exchanges
- Push notifications / check-campaigns
- Design system (zinc palette, monospace headers, ACCENT)
- Voice input + image input
- Rate limiting (20/day free, unlimited pro)

### Changes

| Layer | V2 | V3 |
|---|---|---|
| **Mental model** | Decode tool | Strategist on retainer |
| **Input** | Paste a message to decode | Talk to DARKO — paste messages, ask questions, push back, explore scenarios |
| **Edge function** | Returns rigid JSON schema | Returns flexible response — natural language with optional structured blocks |
| **System prompt** | Forces JSON output format | Conversational persona prompt with structured blocks when relevant |
| **Response rendering** | Parse JSON → map to UI components | Render DARKO's natural language + detect and render embedded structured blocks (scripts, alerts, phase updates) |
| **History model** | Each decode = isolated entry | Continuous conversation thread per target |
| **Intent detection** | 3 fixed intents (text_back, strategic_advice, full_debrief) | DARKO decides what the situation needs — could be a script, a judgment call, a question back to you, a warning, a scenario analysis, or a combination |
| **User can** | Submit → receive | Submit, follow up, push back, ask "what if", request alternatives, ask DARKO to think through a scenario |

---

## Architecture

### 1. Conversation Model

**Current:** Each decode saves a `DecodeEntry` to `intelligence_logs`. History is rebuilt as a flat array of user-input + darko-response pairs and sent to Gemini as context.

**V3:** The conversation is a true multi-turn thread. Each message (user or DARKO) is a row in a conversation log, not a paired decode entry.

#### Database change

New table `conversation_messages` (or repurpose `intelligence_logs`):

```sql
CREATE TABLE conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  target_id UUID REFERENCES targets ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'darko')),
  content TEXT NOT NULL,
  -- Optional structured data embedded in DARKO responses
  structured_data JSONB,
  -- Preserve entry type for special renders
  entry_type TEXT DEFAULT 'message' CHECK (entry_type IN ('message', 'campaign_brief', 'alert')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_conv_msgs_target ON conversation_messages (target_id, created_at);

ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their messages"
  ON conversation_messages FOR ALL
  USING (auth.uid() = user_id);
```

**Migration path:** Write a one-time script that converts existing `intelligence_logs` entries into `conversation_messages` rows (one user row + one darko row per decode entry), preserving timestamps. Then the app reads from the new table going forward.

#### History assembly for Gemini

Instead of building a flat context string, assemble a proper multi-turn `contents` array:

```typescript
// V2: flat string injection
const history = entries.map(e => `USER: ${e.userMessage}\nDARKO: ${e.darkoResponse}`).join('\n');

// V3: multi-turn conversation
const contents = messages.map(msg => ({
  role: msg.role === 'darko' ? 'model' : 'user',
  parts: [{ text: msg.content }]
}));
```

This is how Gemini's multi-turn API is designed to work — each message is a separate turn with a role. DARKO gets true conversational context, not a reconstructed log.

**Context window management:** For pro users with long histories, send the full behavioral profile + temporal block + last N messages (e.g., 50). Older messages are summarized in the profile, not sent raw.

---

### 2. System Prompt Redesign

The biggest single change. The current `PRO_ADVISOR_PROMPT` forces a rigid JSON schema. V3 needs a conversational persona prompt that produces natural language with structured elements when appropriate.

#### Core prompt structure

```
=== IDENTITY ===
You are DARKO — a relationship strategist and psychological advisor. You think on behalf of your operative. You don't wait to be asked — you assess, judge, decide, and direct.

You are not a chatbot. You are not polite. You are a cold, brilliant strategist who has read every psychology book and remembers everything about this operative's situation. You speak directly. You make judgment calls. You tell the operative what to do and why.

=== CONVERSATION RULES ===

1. RESPOND NATURALLY. Do not return JSON unless explicitly asked for structured output. Write in direct, conversational prose. You can be brief (one sentence) or detailed (multiple paragraphs) — match the weight of the situation.

2. ALWAYS MAKE THE CALL. When the operative asks "should I...?" or "what do I do?" — DECIDE. Don't hedge. Give a clear directive with reasoning. You can acknowledge uncertainty, but you still commit to a recommendation.

3. SCRIPTS ARE EMBEDDED, NOT THE RESPONSE. When the situation calls for a specific message the operative should send, include it as a clearly marked block within your response:

   // SCRIPT
   [the exact message to send]

   You can include multiple scripts for different scenarios. But the scripts live inside your strategic reasoning, not the other way around.

4. PUSH BACK WHEN WRONG. If the operative is making a mistake, say so directly before answering their question. Diagnose the error. Then give the corrected path.

5. TRACK THE CAMPAIGN. You know the full history. Reference specific past events, messages, patterns. When the situation has shifted, say so explicitly: "This changes things. Previously you were in [X position], now [Y]. Here's what that means."

6. ASK WHEN YOU NEED TO. If you need information to give good advice, ask for it. "Before I can tell you what to send, I need to know: did she respond to your last message or did you send this cold?"

7. SCENARIO ANALYSIS. When the operative asks "what if she says X?" — think it through. Give a branching analysis: if she responds [this way], do [X]; if she responds [that way], do [Y].

8. STRUCTURED BLOCKS. When relevant, embed these in your response:

   // SCRIPT — a message for the operative to send (copyable)
   // ALERT — a warning about a pattern or mistake
   // PHASE UPDATE — a shift in campaign phase with reasoning
   // READ — a psychological read on the target's current state
   // CAMPAIGN — a full campaign plan (target profile, phased roadmap with scripts, advancement signals, mistakes to avoid). Use when the operative provides detailed target context and asks for a strategic plan.

   These are formatting markers, not the skeleton of your response. Most messages won't need any of them. Some will need several. A campaign plan will use // CAMPAIGN extensively.

=== WHAT YOU KNOW ===
[Behavioral profile injected here]
[Temporal intelligence injected here]
[Communication style injected here]
[RAG passages injected here — when the query touches strategic/psychological territory]

=== CONVERSATION HISTORY ===
[Multi-turn history injected here]
```

#### What this replaces

- `PRO_ADVISOR_PROMPT` → replaced by the conversational prompt above
- `CAMPAIGN_BRIEF_SYSTEM_PROMPT` → folded into the main prompt. When the user submits brief context (from the modal), DARKO recognizes it as a campaign planning request and responds with a full strategic plan inline. No separate prompt or code path needed — the conversational prompt's rule 8 covers `// CAMPAIGN` blocks for structured campaign output within natural language.
- Rigid JSON schema enforcement → natural language with optional structured blocks
- `normalizeResponse()` with 3 legacy fallbacks → new parser that extracts `// SCRIPT`, `// ALERT`, `// PHASE UPDATE`, `// READ`, `// CAMPAIGN` blocks from natural language
- Fixed intent detection (`text_back`, `strategic_advice`, `full_debrief`) → DARKO decides what the response needs organically

#### What stays

- `CORE DIRECTIVE` + `BALANCE RULE` → folded into the new prompt's rules (already covered by rules 2 and 4)
- `// BRIEF` modal UI → still gathers 7 structured fields, but submits as a user message instead of routing to a separate prompt
- Blocked words preflight → stays
- Rate limiting → stays
- RAG injection → stays (but only triggered when the query touches strategic territory, not every message)

---

### 3. Edge Function Changes

#### `decode-intel` → rename to `darko-chat` (or keep name, change behavior)

**Current flow:**
1. Receive message + context
2. Build system prompt with rigid JSON schema
3. Call Gemini → get JSON
4. `normalizeResponse()` → parse JSON with fallbacks
5. Return structured `DecoderResult`

**V3 flow:**
1. Receive message + conversation history + context
2. Build conversational system prompt (identity + rules + profile + temporal + RAG)
3. Call Gemini with multi-turn `contents` array
4. Return raw text response + extract any structured blocks (`// SCRIPT`, `// ALERT`, etc.)
5. Background: profile refresh (same as current)

```typescript
// V3 response type
interface DarkoResponse {
  // The full natural language response
  text: string;
  // Extracted structured blocks (parsed from the response text)
  scripts?: string[];
  alerts?: string[];
  phaseUpdate?: { from: string; to: string; reasoning: string };
  reads?: string[];
  campaign?: CampaignPlan; // Parsed from // CAMPAIGN blocks when present
}
```

#### RAG trigger logic

Currently RAG fires on every decode. In V3, not every message needs book knowledge (e.g., "ok what if she doesn't reply?" doesn't need a passage from The Art of Seduction).

Add a lightweight intent check: only query `search_book_passages` when the message involves strategic planning, psychological analysis, or a new situation. Skip for follow-up questions, clarifications, and "what if" branches.

Simple heuristic: if the message is under 20 words and the previous DARKO response was under 60 seconds ago, skip RAG. Or let Gemini decide — add a `needsResearch` field in a quick pre-pass (but this adds latency, so the heuristic is better).

---

### 4. Response Parsing

Replace `normalizeResponse()` (rigid JSON parser) with a block extractor:

```typescript
interface ParsedDarkoResponse {
  text: string;           // Full response with blocks removed
  scripts: string[];      // Content between // SCRIPT markers
  alerts: string[];       // Content between // ALERT markers
  phaseUpdates: string[]; // Content between // PHASE UPDATE markers
  reads: string[];        // Content between // READ markers
}

function parseDarkoResponse(raw: string): ParsedDarkoResponse {
  // Extract blocks using // MARKER ... // END pattern
  // or // MARKER followed by indented/quoted content
  // Return clean text (blocks removed) + extracted structured content
}
```

The key insight: DARKO's natural language IS the primary response. Structured blocks are optional annotations that get special UI treatment (copyable scripts, alert badges, etc.). If DARKO just says "Wait two more days. She's testing your patience and you're about to fail the test." — that's a complete, valid response with no structured blocks needed.

---

### 4b. Streaming Architecture

Streaming is a Phase 2 priority — critical for the conversational feel.

#### Edge function (SSE)

The edge function uses Gemini's `streamGenerateContent` and forwards chunks to the client via Server-Sent Events:

```typescript
// supabase/functions/decode-intel/index.ts

// Use Gemini streaming API
const streamResponse = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${apiKey}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: conversationHistory,
      // ... generation config
    }),
  }
);

// Forward SSE chunks to client
return new Response(streamResponse.body, {
  headers: {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  },
});
```

#### Client-side (React Native)

React Native doesn't have native `EventSource`. Use a fetch-based SSE reader:

```typescript
// services/darko.ts

async function sendMessageStreaming(
  input: MessageInput,
  onChunk: (text: string) => void,
  onComplete: (fullResponse: ParsedDarkoResponse) => void,
) {
  const response = await fetch(edgeFunctionUrl, {
    method: 'POST',
    headers: { /* auth headers */ },
    body: JSON.stringify(input),
  });

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let accumulated = '';

  while (reader) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    // Parse SSE format: extract text from data: {...} lines
    const textChunk = extractTextFromSSE(chunk);
    accumulated += textChunk;
    onChunk(accumulated); // UI updates with accumulated text
  }

  // Once stream is complete, parse structured blocks
  const parsed = parseDarkoResponse(accumulated);
  onComplete(parsed);
}
```

#### Rendering strategy

1. **During stream:** Render accumulated text as a single growing DARKO bubble. No structured block parsing yet — just raw text appearing word by word.
2. **On stream complete:** Parse the full response for `// SCRIPT`, `// ALERT`, `// CAMPAIGN` etc. blocks. Re-render the bubble with proper structured UI components (copyable scripts, alert badges, campaign cards).
3. **Transition:** The swap from raw text to parsed+styled should be seamless. The text content doesn't change — structured blocks just get upgraded from plain text to interactive components.

This means structured blocks briefly appear as plain text during streaming, then "upgrade" to their styled versions. This is actually good UX — it feels like DARKO is thinking through the plan, then the final version snaps into its polished form.

---

### 5. Frontend Changes

#### Chat UX

The inverted FlatList chat UI **already works** for this model. The main changes:

**Input behavior:**
- Remove the "decode" mental model from the UI. The input field is just a text input — you're talking to DARKO.
- Keep the `CMD >` prefix (fits the aesthetic).
- Keep image picker and voice recorder (you're sending DARKO screenshots and voice notes as part of the conversation).
- Remove the "paste a message to decode" framing. The input placeholder becomes something like `// talk to darko` or `// brief darko`.

**Response rendering:**
- DARKO's natural language renders as a standard DARKO bubble (left side, ACCENT border).
- `// SCRIPT` blocks render as `ScriptCard` components (already built — copyable, styled).
- `// ALERT` blocks render with `ERROR_RED` styling.
- `// PHASE UPDATE` renders as a phase transition card.
- `// READ` blocks render with a subtle distinct style — psychological analysis callout.
- If no structured blocks exist, the response is just text. That's fine. Most conversational responses won't need them.

**Remove:**
- The concept of "decoding" a single message. You're having a conversation with your strategist.
- The edit-and-re-decode flow (long-press to edit a user message). In a conversation, you just send a follow-up: "actually, I said it differently — here's what I actually sent."

**Keep:**
- `// DOSSIER` panel (still valuable — it's the target's psychological profile)
- `// BRIEF` button and Campaign Brief modal (still a special structured mode)
- Long-press to copy any message
- Notification tap → navigate to target's conversation

#### Message types in the chat

```typescript
type ChatMessage = {
  id: string;
  role: 'user' | 'darko';
  text: string;
  scripts?: string[];
  alerts?: string[];
  phaseUpdate?: string;
  reads?: string[];
  entryType: 'message' | 'campaign_brief' | 'alert';
  timestamp: string;
};
```

---

### 6. Service Layer Changes

#### `services/decoder.ts` → `services/darko.ts`

Rename to reflect the new mental model. Core function:

```typescript
// V2
async function decodeMessage(input: DecodeInput): Promise<DecoderResult | CampaignBriefResult | null>

// V3
async function sendMessage(input: MessageInput): Promise<DarkoResponse | null>
```

Where `MessageInput` is:

```typescript
interface MessageInput {
  message: string;
  targetId: string;
  targetName?: string;
  // These are still fetched and injected server-side
  leverage?: string;
  objective?: string;
  missionPhase?: number;
  behavioralProfile?: any;
  targetCommunicationStyle?: string;
  // Brief context (from // BRIEF modal, sent as structured user message)
  briefContext?: string;
  // Image/audio attachments
  imageBase64?: string;
  audioBase64?: string;
}
```

The conversation history is no longer passed from the client. The edge function reads it directly from `conversation_messages` using the `targetId` (more secure, less payload over the wire, single source of truth).

#### `services/storage.ts`

Add:
- `saveMessage(targetId, role, content, structuredData?, entryType?)` — inserts into `conversation_messages`
- `getConversation(targetId, limit?)` — fetches recent messages for display
- Deprecate `saveDecodeEntry()` / `getHistory()` or keep as compatibility shims during migration

---

### 7. Rate Limiting Adjustment

Currently counts "decodes" — 20/day free. In V3, every message to DARKO is a Gemini call. Two options:

**Option A: Count messages.** 20 messages/day free. Simple but might feel restrictive for a conversational flow (a back-and-forth about one situation could burn 5-6 messages easily).

**Option B: Count "sessions."** A session = a burst of conversation activity (messages within 5 minutes of each other count as one session). 10 sessions/day free. More generous for conversation, harder to game.

**Recommendation:** Option A with a higher limit — 30 messages/day free. Simple, predictable, and a conversational exchange about one situation (4-5 messages) still leaves plenty of room. Pro is unlimited either way.

---

### 8. Migration Strategy

This is a significant change but can be done incrementally:

**Phase 1 — Edge function + prompt (backend only)**
1. Create the new conversational system prompt
2. Update `decode-intel` to accept multi-turn history and return natural language + structured blocks
3. Add the response parser (block extraction)
4. Create `conversation_messages` table
5. Write migration script: `intelligence_logs` → `conversation_messages` (one user row + one darko row per entry, timestamps preserved)
6. Drop `intelligence_logs` after verified migration
7. Deploy and test with existing UI (the current UI can render text responses even if they're not structured JSON — it'll just look different)

**Phase 2 — Frontend + Streaming**
1. **Streaming responses** — Gemini streaming via edge function SSE → client renders word-by-word. Critical for the "talking to a strategist" feel. Without this, V3 will feel slower than V2 because natural language responses are longer than JSON payloads.
2. Update chat UI to render natural language + embedded blocks (`// SCRIPT`, `// ALERT`, `// PHASE UPDATE`, `// READ`)
3. Change input UX (remove decode framing, add conversational placeholder)
4. Fold Campaign Brief into conversation — `// BRIEF` modal still gathers the 7 fields, but submits as a structured user message ("Here's a new target situation: [fields]") → DARKO responds with campaign plan inline → saved as regular conversation messages, rendered with campaign-specific UI components
5. Update `decoder.ts` → `darko.ts` service
6. Update `storage.ts` with new functions
7. Wire history from `conversation_messages`
8. Remove edit-and-re-decode flow

**Phase 3 — Polish**
1. RAG trigger optimization (skip for follow-ups)
2. Context window management (last N messages for long conversations)
3. Profile refresh batching (debounce: refresh only after 3+ minutes of silence in a conversation burst)
4. Rate limiting adjustment (30 messages/day free)
5. Update onboarding to reflect the new mental model
6. Update PROGRESS.md

---

## What This Unlocks

Once V3 is live, the interaction model supports everything from the original vision:

| "I want..." | V3 handles it via... |
|---|---|
| Decisions, not just scripts | DARKO makes judgment calls in natural language, scripts are embedded when needed |
| DARKO knows where I stand | Continuous conversation + temporal intelligence + auto-updating profile |
| DARKO thinks on my behalf | Conversational persona is directive — it tells you what to do without being asked |
| Real back-and-forth | True multi-turn conversation per target |
| Context quality matters | Same RAG + profile + temporal pipeline, now delivered as proper conversation context |
| Like a chatbot | It IS a chatbot — a strategist you talk to |

---

## Files Touched

| File | Change |
|---|---|
| `supabase/functions/decode-intel/index.ts` | New conversational system prompt, multi-turn history, streaming via SSE, return natural language with structured blocks |
| `supabase/migrations/004_conversation_messages.sql` | New table |
| `supabase/migrations/005_drop_intelligence_logs.sql` | Drop old table after migration verified |
| `services/decoder.ts` → `services/darko.ts` | Rename, new `sendMessage()` with streaming support, remove `decodeMessage()`, debounced profile refresh |
| `services/storage.ts` | Add `saveMessage()`, `getConversation()`, remove decode-specific functions |
| `app/decode.tsx` | Streaming render, natural language + block rendering, conversational input UX, campaign brief inline, remove edit-re-decode |
| `app/index.tsx` | Minor — update references from "decode" to "conversation" |
| `scripts/migrate-to-conversations.ts` | One-time migration: `intelligence_logs` → `conversation_messages`, then drop old table |

---

## Decisions (Resolved)

1. **Campaign Brief mode → folded into conversation.** The `// BRIEF` modal still exists as a structured entry point (7 guided fields), but instead of routing to a separate `CAMPAIGN_BRIEF_SYSTEM_PROMPT`, it sends the gathered context as a user message in the conversation thread. DARKO responds with the campaign plan inline — same strategic depth, but now it's part of the conversation you can reference and follow up on. "That phase 2 timeline feels too aggressive" → DARKO adjusts. The `CampaignBriefBubble` component is repurposed to render campaign-structured responses detected via `// CAMPAIGN` block markers.

2. **Profile refresh → batch debounced.** Don't refresh after every message in a rapid back-and-forth. Instead: set a 3-minute debounce timer after each DARKO response. If no new user message arrives within 3 minutes, fire the profile refresh. This means a 5-message exchange only triggers one refresh (after the conversation settles), not five. Implementation: `setTimeout` in the service layer, cleared and reset on each new message.

3. **Backward compatibility → drop `intelligence_logs` after migration.** No read-only archive. The migration script converts all existing entries to `conversation_messages` rows with timestamps preserved. After verification, drop the old table. Pre-launch with no paying users — clean cut, no dual-table maintenance.

4. **Streaming → Phase 2 priority.** Gemini streaming via edge function SSE → React Native client renders word-by-word. This is critical, not polish. A conversational strategist that makes you wait 3-5 seconds in silence before dumping a wall of text feels broken. Streaming makes DARKO feel like it's thinking and speaking in real time. Implementation: edge function uses Gemini's `streamGenerateContent`, chunks response via SSE, client accumulates and renders progressively. Structured blocks (`// SCRIPT` etc.) are parsed and rendered after the stream completes.
