// User-input intent taxonomy used by the two-stage classifier → strategist
// pipeline. Distinct from the strategist's own `intent` field (which describes
// Darko's *response* mode: text_back / strategic_advice / full_debrief /
// campaign_brief). This file is the single source of truth for the input-side
// intent vocabulary; both the classifier and the strategist's system prompt
// reference it.

export type UserIntent =
  | 'target_message'      // user is reporting/quoting what the target sent
  | 'draft_review'        // user is showing or asking Darko to produce a draft
  | 'strategy_question'   // user wants tactical advice without a specific msg
  | 'clarification'       // user is correcting context or answering Darko
  | 'meta_question';      // user is asking about Darko itself (capabilities, billing)

export const USER_INTENTS: ReadonlyArray<UserIntent> = [
  'target_message',
  'draft_review',
  'strategy_question',
  'clarification',
  'meta_question',
] as const;

// Confidence below this threshold triggers the clarification short-circuit
// instead of running the strategist with a guessed intent. Tune cautiously —
// raising it makes the bot ask "is that her message or your draft?" more
// often; lowering it lets misclassifications through.
export const CONFIDENCE_THRESHOLD = 0.7;

export interface IntentClassification {
  intent: UserIntent;
  confidence: number;        // 0.0 - 1.0
  reasoning: string;         // one short sentence — surfaced to logs only
}

// Shape of the prior the classifier reads from the previous Darko turn.
// Stored on conversation_messages.structured_data.expected_next_input.
// Null when there is no prior turn or the strategist didn't emit one.
export type ExpectedNextInput = UserIntent | null;

// Per-intent strategist guidance — the strategist system prompt embeds this
// block so its reasoning path branches on the classified intent. Keep these
// short; the bulk of Darko's behavior lives in the master prompt.
export const INTENT_STRATEGY_GUIDANCE: Record<UserIntent, string> = {
  target_message:
    'The user is reporting what the TARGET sent. Decode it. Return scripts ' +
    '(option_1_script, option_2_script) calibrated to the target\'s archetype, ' +
    'a threat-level read, and one directive. This is your default analytical mode.',

  draft_review:
    'The user is showing a message they want to send (or asking you to produce ' +
    'one). Critique their draft as a coach: identify the strongest beat, name ' +
    'the weak beat, and return a tightened option_1_script in the user\'s voice. ' +
    'Do NOT decode the draft as if it were the target\'s words. Keep the user\'s ' +
    'core intent intact unless it is strategically wrong.',

  strategy_question:
    'The user wants tactical guidance without a specific message in play. Lead ' +
    'with the directive (one cold sentence). Do NOT emit scripts unless the ' +
    'user explicitly asks for a scripted line. Frame your reasoning in terms of ' +
    'the current phase and her archetype.',

  clarification:
    'The user is correcting context, adding background, or answering a question ' +
    'you just asked. Update your internal read silently — do NOT restart the ' +
    'analysis from scratch. Acknowledge the new fact in one beat, then continue ' +
    'the line of reasoning from your prior turn.',

  meta_question:
    'The user is asking about you (capabilities, errors, what you can do, ' +
    'billing). Answer plainly. Step partially out of voice — still terse, still ' +
    'cold, but no scripts and no archetype reads. Do NOT pretend the question ' +
    'was about the target.',
};

// Clarification questions surfaced when classifier confidence < threshold.
// Picked based on the *highest-confidence* intent the classifier was leaning
// toward, framed as a binary so the user's reply lands cleanly in one bucket.
export function buildClarificationQuestion(c: IntentClassification): string {
  switch (c.intent) {
    case 'target_message':
      return 'Quick check — is that her message, or your draft? One word: hers or mine.';
    case 'draft_review':
      return 'Quick check — is that something you want to send, or something she sent? One word: mine or hers.';
    case 'strategy_question':
      return 'Are you asking for advice, or showing me something specific she sent? Tell me which.';
    case 'clarification':
      return 'Wait — are you correcting something I said, or is this new intel? One word: correcting or new.';
    case 'meta_question':
      return 'Is this a question about me (the app) or about her? Tell me which.';
  }
}
