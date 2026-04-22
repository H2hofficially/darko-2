/**
 * seed-rag — One-shot edge function to embed and insert Greene + body-language passages
 * into the book_passages table for RAG retrieval in decode-intel.
 *
 * Invoke once:
 *   supabase functions invoke seed-rag --no-verify-jwt
 *
 * Passes a secret check to prevent accidental re-runs.
 * Uses ON CONFLICT DO NOTHING — safe to call multiple times (idempotent).
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Greene Paraphrase Layer ───────────────────────────────────────────────────
// Paraphrased entries — not quoted from the original text.
// Each entry is a self-contained tactical principle for semantic retrieval.

const GREENE_ENTRIES: Array<{ chapter: string; passage: string }> = [
  // 24 Laws of Power — Key tactical principles
  {
    chapter: 'Law 1 — Never Outshine the Master',
    passage: 'When dealing with someone who holds power over you, make them feel superior. People in authority are insecure about their position by default. The moment you make them feel outshined, they will find a way to remove you. The move is to make your brilliance look like their brilliance. Your wins should feel like their wins. This is not weakness — it is the long game.',
  },
  {
    chapter: 'Law 3 — Conceal Your Intentions',
    passage: 'Never reveal what you actually want from someone before they want it too. People unconsciously brace themselves against anything they can see coming. Desire for a specific outcome is most powerful when the other person discovers it as if by accident. Keep your strategic goal hidden behind a surface of openness, curiosity, or mild indifference. They should name the destination before you do.',
  },
  {
    chapter: 'Law 4 — Always Say Less Than Necessary',
    passage: 'Silence reads as depth. The more you say, the more you dilute your presence and the more material you hand to others to use against you. Powerful people say one thing clearly. They do not explain. They do not qualify. The person who speaks less appears to know more. Brevity applied to conversation is a dominance display — it says you have enough status that you do not need to fill silence.',
  },
  {
    chapter: 'Law 6 — Court Attention At All Costs',
    passage: 'Presence is the first prerequisite of power. Before influence, before persuasion, before seduction — there must be attention. Controversial, distinctive, polarizing, dramatic: all of these are better than invisible. The worst mistake in any social or romantic campaign is to be forgotten. Create a distinctive image, introduce an element of mystery, do something others remember. Attention can be engineered.',
  },
  {
    chapter: 'Law 7 — Get Others To Do The Work, Take The Credit',
    passage: 'Effort is invisible. Results are what others see. The skilled operator delegates, absorbs intelligence from others, and builds on their ideas while preserving the appearance of origination. In a campaign context: let her run toward you. The target who arrives at their own conclusion that they want you is far more committed than the target who was persuaded. Engineer the conditions for her conclusion, then step back.',
  },
  {
    chapter: 'Law 9 — Win Through Actions, Never Argument',
    passage: 'Arguments generate resistance regardless of their merit. Every direct challenge to someone\'s position hardens that position further. The move is to demonstrate, not to debate. If she believes something about herself or about you that you need changed, do not argue it — create the experience that rewrites it. Actions bypass the defenses that words trigger. Let her revise her opinion on her own — your job is to give her the data.',
  },
  {
    chapter: 'Law 14 — Pose As A Friend, Work As A Spy',
    passage: 'The most valuable intelligence about a target is gathered not through direct questioning but through creating the conditions where she reveals herself naturally. Listen more than you speak. Ask indirect questions that circle around what you actually want to know. People leak their anxieties, their desires, their pressure points in casual conversation when they feel safe. Build the safety first. Mine it later.',
  },
  {
    chapter: 'Law 16 — Use Absence To Increase Respect And Honor',
    passage: 'Presence makes people accustomed to you. Scarcity makes people want you. When you are always available, your value is calibrated at the current level — accessible, normal, unchallenging. Deliberate withdrawal forces reappraisal. The target who could always reach you begins to wonder what changed. The wondering creates attention. The attention creates value. Calculated absence is a pressure tactic disguised as doing nothing.',
  },
  {
    chapter: 'Law 17 — Keep Others In Suspended Terror',
    passage: 'Predictability is the enemy of desire. When someone can fully anticipate your behavior, you become furniture — comfortable but ignored. The introduction of unpredictability keeps others in a state of elevated attention. A move they did not expect, a silence after warmth, a sudden interest after indifference — these all create the uncertainty that keeps someone focused on you. Manage unpredictability the way a good storyteller manages suspense.',
  },
  {
    chapter: 'Law 19 — Know Who You Are Dealing With',
    passage: 'Every target is a different type of terrain. The approach that works on an anxious attachment type will backfire on a dismissive-avoidant. The move that opens a Coquette will close a Waif. Before any campaign, diagnose the primary archetype and attachment pattern. Read the behavioral signals more than the stated preferences — what she says she wants and what she responds to are often not the same. Treat the read as a prerequisite, not an afterthought.',
  },
  {
    chapter: 'Law 25 — Re-Create Yourself',
    passage: 'Identity is a performance, and performances can be redesigned. The man who arrives as one thing and transforms — who seems to deepen, surprise, or exceed expectations — creates a narrative that hooks the imagination. In seduction, this translates to controlled self-disclosure. Reveal layers over time. Let her discover dimensions of you that she did not anticipate. The discovery of unexpected depth is one of the most reliable triggers of attachment.',
  },
  {
    chapter: 'Law 28 — Enter Action With Boldness',
    passage: 'Timidity signals low status and invites the same treatment. A bold, direct move — even if imperfect in execution — reads as high-value because it demonstrates that you have enough confidence to risk rejection. People are instinctively drawn to those who act without needing permission. Hesitation costs more than a wrong move. A wrong move can be recovered. A pattern of hesitation changes how you are perceived.',
  },
  {
    chapter: 'Law 31 — Control The Options',
    passage: 'Rather than issuing direct commands, frame choices so that every available option serves your objective. In a romantic context, this means structuring situations so that her natural responses advance your campaign regardless of which option she takes. If she says yes, you move forward. If she says no, you extract signal data and run a different approach. Design the terrain so there is no truly neutral outcome.',
  },
  {
    chapter: 'Law 33 — Discover Each Man\'s Thumbscrew',
    passage: 'Every person carries a specific emotional pressure point — the insecurity, the unfulfilled hunger, the wound that has never healed clean. This is not information to exploit carelessly. It is the key to genuine impact. The handler who identifies the thumbscrew understands why the target responds the way she does. Address that pressure point — through validation, through challenge, through strategic mirroring — and you operate at a level others never reach.',
  },
  {
    chapter: 'Law 40 — Despise The Free Lunch',
    passage: 'Things that cost nothing are valued at nothing. In a seduction campaign, giving without limit — attention, time, effort, compliments — destroys your perceived value and creates a dynamic where the target believes she can have you for free. The scarcity principle applies to your own resources: time, attention, and presence should be rationed, not given freely. Make her work for something before she receives it.',
  },
  {
    chapter: 'Law 43 — Work On The Hearts And Minds Of Others',
    passage: 'Pure logic has no traction in emotional campaigns. To move someone, you must enter the emotional register first — identify what they care about deeply, what they fear, what they dream about — and work from inside that frame. Attempting to influence through argument and reason while ignoring emotional undercurrents is like trying to navigate with a map of the wrong territory. Read the emotional terrain first. Logic comes later as confirmation, not persuasion.',
  },
  {
    chapter: 'Law 44 — Disarm And Infuriate With The Mirror Effect',
    passage: 'Mirroring someone\'s behavior — returning exactly what they give you, matching their emotional energy — is deeply disorienting for people who expect either pursuit or withdrawal. The person who runs hot and then cold suddenly receives the same treatment back. This forces them to reappraise what they actually want. The mirror does not react, does not chase, does not collapse — it simply reflects. The target is left facing themselves.',
  },
  {
    chapter: 'Law 16 — Strategic Withdrawal Creates Pursuit',
    passage: 'After consistent presence, calculated withdrawal creates an asymmetry that forces action. The target who has grown accustomed to your availability suddenly notices the silence. Curiosity and mild anxiety produce the same behavioral result: they reach out. The withdrawal must be clean and without drama — no explanation, no farewell, no performance. Simply become less available. The silence does the work. This is not cruelty; it is understanding how attention and scarcity interact in the human nervous system.',
  },
  {
    chapter: 'Law 6 — Negative Presence',
    passage: 'Presence does not require being liked — it requires being noticed. Controversy, transgression, and even fear generate attention as reliably as admiration. The man who challenges a woman\'s certainties, who introduces a mild friction into a comfortable dynamic, who refuses to behave as expected, creates a version of presence that is more compelling than approval-seeking. Negative presence is still presence. Invisible is the only real failure.',
  },
  {
    chapter: 'Law 45 — Preach The Need For Change While Preserving The Old',
    passage: 'People want novelty without losing security. The seductive frame that works is one that offers transformation — new experience, new feeling, new version of themselves — while keeping enough familiar safety that they can take the risk. The move is to position yourself as the new and exciting element while making the leap feel safe enough to take. Create the hunger for change, then present yourself as the vehicle.',
  },

  // 9 Seducer Types
  {
    chapter: 'Seducer Type — The Siren',
    passage: 'The Siren operates through abundance of sensory and sexual energy. She draws men toward her by embodying what they most deeply want but cannot fully possess. Tactically, this type is approached through challenge and unpredictability — she has seen every form of pursuit and is bored by it. The man who does not chase, who holds his own independent reality while remaining genuinely interested in her, creates the one dynamic she cannot easily dismiss. Never become another circle of her orbit.',
  },
  {
    chapter: 'Seducer Type — The Rake',
    passage: 'The Rake seduces through intensity — focused, consuming attention that makes the target feel she is the only thing in the world that matters. This is dangerous energy because it burns bright and then disappears. Women who respond strongly to Rake energy are often anxious-preoccupied — they have been trained to mistake intensity for depth. To counter or mirror this archetype, match the intensity with your own presence but introduce the element of mystery and duration that the Rake never sustains.',
  },
  {
    chapter: 'Seducer Type — The Ideal Lover',
    passage: 'The Ideal Lover reads what someone wants to be rather than who they currently are, and reflects that back to them with exquisite precision. The target falls in love with the version of themselves they see in the Ideal Lover\'s eyes. Tactically: study what she wishes were true about her life, her identity, her potential. Then describe what you see in her that aligns with that vision — specifically, concretely, without flattery or performance. The move is accurate noticing, not complimenting.',
  },
  {
    chapter: 'Seducer Type — The Dandy',
    passage: 'The Dandy defies gender expectation in ways that unsettle and intrigue. He is neither purely masculine nor classically sensitive, but occupies a space that feels genuinely independent of social pressure. This creates fascination because it signals a person with their own internal compass. For a modern operator, the tactical principle is: do not perform masculinity for her approval. Have a genuine aesthetic, a considered perspective, something that is yours alone. The man who does not need to be legible is interesting.',
  },
  {
    chapter: 'Seducer Type — The Natural',
    passage: 'The Natural seduces through apparent unself-consciousness — the person who moves through the world without calculating, whose enjoyment is genuine, whose interest feels unguarded. The tactical lesson here is to stop over-managing your own image. Comfort in your own skin — including with your own flaws — reads as security. Security is attractive because it suggests someone who does not need the target to validate them, which is the precondition for any real pull.',
  },
  {
    chapter: 'Seducer Type — The Coquette',
    passage: 'The Coquette grants warmth and then withdraws it before it becomes certain. The uncertainty keeps the target attached — they become focused on re-earning the warmth. This is a deliberate emotional asymmetry. To counter a Coquette or to apply this principle: give real, meaningful attention that the target experiences as special, then become genuinely less available without explanation. The target\'s mind fills the silence with projection. Let them.',
  },
  {
    chapter: 'Seducer Type — The Charmer',
    passage: 'The Charmer operates through making people feel understood and at ease. The genius of charm is that it is entirely about the other person — the charmer appears deeply interested in whoever they are with. To deploy charm: ask specific questions about their experience, remember and reference small details, create the feeling that the conversation is different from every other conversation they had today. Real interest, even brief, is the most disarming force in human interaction.',
  },
  {
    chapter: 'Seducer Type — The Charismatic',
    passage: 'Charisma is the projection of a complete inner world — someone who is so fully committed to their own vision, their own energy, their own certainty that it creates a gravitational field. People are drawn to charismatic types because proximity to conviction feels like participation in something larger. Tactically: having a genuine purpose, belief, or project that you actually care about — something beyond the immediate campaign — creates the quality that no technique can replicate.',
  },
  {
    chapter: 'Seducer Type — The Star',
    passage: 'The Star creates a projected identity that others want to inhabit through association. She (or he) represents a fantasy — freedom, success, beauty, transgression — that the target wants access to. The tactical principle for a man is to cultivate an identity that has aspirational qualities: he lives interestingly, knows things others do not, moves through the world on his own terms. The target who wants access to that life becomes your target in the precise sense of the word.',
  },

  // Victim Types — most tactically relevant
  {
    chapter: 'Victim Type — The Disappointed Dreamer',
    passage: 'This target has a rich inner fantasy life and has been repeatedly disappointed by a reality that doesn\'t match it. She still believes something extraordinary is possible — she has just stopped trusting that ordinary men can deliver it. The move is to enter the conversation at the level of her imagination rather than her daily reality. Reference her unlived dreams. Describe possibilities she has stopped saying out loud. She will attach to whoever proves they can hear the dream.',
  },
  {
    chapter: 'Victim Type — The Pampered Royal',
    passage: 'The Pampered Royal has always had what she wanted and is bored by people who give her more of what she already has. She will not respond to effort, gifts, flattery, or accommodation — she has too much of all of it. The only move that registers is indifference, challenge, and refusal to be impressed. Do not try to please her. Have standards she has to meet. Make her feel something she doesn\'t usually feel: slightly uncertain.',
  },
  {
    chapter: 'Victim Type — The Crushed Star',
    passage: 'This target used to have more — more attention, more status, more vibrancy — and feels that what she has now is a diminishment of what she deserved. She is defined by a wound to her sense of specialness. The move is to see her as she was at her peak, or better, as she will be — to acknowledge the gap between her real worth and her current life. She will orient toward whoever reflects the version of herself she hasn\'t buried yet.',
  },
  {
    chapter: 'Victim Type — The Isolated King or Queen',
    passage: 'This target is capable, often successful, and genuinely alone — not because they are undesirable but because their level of function or intensity has created a situation where no one can fully keep up. They hunger not for attention but to be seen and matched. The approach is to demonstrate real depth, competence, and an inner life that can hold its own against theirs. The question this type asks, consciously or not, is: can you actually handle me?',
  },

  // Anti-Seducer warnings
  {
    chapter: 'Anti-Seducer — The Brute',
    passage: 'The Brute is the man who mistakes aggression for dominance. He pushes, demands, and takes space, confusing force with frame. Women do not respond to this with attraction — they respond with compliance driven by unease, or with withdrawal. The distinction between high-value directness and brute behavior is simple: directness is a signal of confidence, not a demand that she match your energy on your timeline. Pressure is not the same as pull.',
  },
  {
    chapter: 'Anti-Seducer — The Suffocator',
    passage: 'The Suffocator destroys tension through excess — too much contact, too much affection, too many messages, too much accommodation. The effect is the opposite of its intent: the target feels crowded and pulls back, which triggers more pursuit, which triggers more pullback. The fundamental error is confusing quantity with quality of connection. Less contact, more meaning per contact. The person who does not over-communicate is more interesting because their presence means something.',
  },
  {
    chapter: 'Anti-Seducer — The Moralizer',
    passage: 'The Moralizer lectures, corrects, and performs virtue. This behavior reads as condescension dressed as ethics, and kills desire at its root. Desire requires a space free of judgment. The target who feels she is being evaluated by a moral framework cannot relax into attraction. The operator who needs to communicate values does it through behavior — through the moves he makes or declines to make — never through speech. A man who explains his principles has none.',
  },
  {
    chapter: 'Anti-Seducer — The Boring Being',
    passage: 'The Boring Being offers no friction, no mystery, no resistance — he simply agrees, accommodates, and reflects back whatever she wants. This is perhaps the most common and most devastating error. Desire requires a distinct other — someone who does not bend to fit the target\'s preferences. The man who stands for nothing makes it impossible for a woman to stand next to him. Have genuine opinions, real limits, things you will not do. Be someone to push against.',
  },

  // Key tactical principles
  {
    chapter: 'Tactical Principle — The Theatrical Frame',
    passage: 'Seduction is inherently theatrical — it requires an implicit agreement that something extraordinary is happening between two specific people. The operator who introduces a private mythology, a specific language, a recurring reference only the two of them share creates a frame that separates this dynamic from everything ordinary in her life. This frame becomes the container for desire. Protect it by keeping it distinct: the world is one thing, this is another.',
  },
  {
    chapter: 'Tactical Principle — Demonic Words and Taboo',
    passage: 'Language that hints at transgression — the suggestion of something forbidden, the move that acknowledges what isn\'t supposed to be said — carries a charge that well-behaved language does not. This is not crudeness. It is the precise introduction of a taboo element that makes the conversation feel different from all her other conversations. Name what both people know but are not supposed to acknowledge. The naming creates complicity. Complicity creates intimacy.',
  },
  {
    chapter: 'Tactical Principle — Choose The Right Victim',
    passage: 'Not all targets are worth the campaign. The right target has some combination of susceptibility to your specific approach, real desire even if suppressed, and the psychological openness that makes movement possible. Running a full campaign against a target who has none of these qualities wastes time and teaches the wrong lessons. Diagnostic before deployment: read the initial signal quality carefully. A faint signal in the first two encounters often predicts a difficult entire campaign.',
  },
  {
    chapter: 'Tactical Principle — Create Triangles',
    passage: 'Social proof — evidence that others find you desirable — is one of the fastest ways to accelerate a slow-moving campaign. The target who feels she is competing for access to you (even mildly, even implicitly) adjusts her valuation upward automatically. This does not require lying or manipulation — simply being genuinely social, having real options, and not treating any one target as the only possible outcome creates the triangular dynamic that makes you more interesting.',
  },
  {
    chapter: 'Tactical Principle — Keep Them In Suspense',
    passage: 'A campaign that moves too quickly in one direction — either rapidly toward commitment or rapidly toward coldness — completes its arc prematurely and loses tension. Tension requires an unresolved question. The operator who keeps the question open — who is warm enough to maintain interest but unavailable enough to sustain doubt — prolongs the period of maximum psychological engagement. This is not game-playing; it is understanding the mechanics of how human desire actually operates.',
  },
  {
    chapter: 'Tactical Principle — Poeticize Your Presence',
    passage: 'The target remembers how you made her feel more than what you said. The operator who invests in the experience of being around him — who creates moments that have aesthetic weight, who chooses settings deliberately, who introduces small details that show he thought about her specifically — builds a presence that has emotional texture. She will return to the memory of time with you and find it different from ordinary life. That contrast is the hook.',
  },
  {
    chapter: 'The 4 Phases of Seduction — Phase 1: Separation',
    passage: 'The first phase of seduction is to disturb the target\'s psychological equilibrium — to create a small crisis of identity or desire that makes her question her current emotional state. This is not done through drama but through the introduction of something unexpected: a quality she didn\'t anticipate in you, a question she cannot easily answer, an absence of the behavior she expected. The goal is to separate her from the familiar. The familiar is comfortable; it is not seductive.',
  },
  {
    chapter: 'The 4 Phases of Seduction — Phase 2: Lead Astray',
    passage: 'The second phase is to feed the fantasy that was opened in phase one. The target has been unsettled; now she needs something to follow. This is the phase of suggestion, of symbolic gestures, of shared references that build a private world. Do not be explicit about what you want — imply it through context, tone, and carefully chosen detail. The target\'s imagination does more work than your speech. Give it good material and then step back.',
  },
  {
    chapter: 'The 4 Phases of Seduction — Phase 3: The Abyss',
    passage: 'The third phase introduces a deliberate confusion — pleasure mixed with the threat of its withdrawal, closeness followed by a sudden coolness. This is the phase that creates real emotional attachment because it activates the target\'s anxiety about loss. At this stage, the target is fully engaged but uncertain. The uncertainty is not cruelty — it is the condition under which deep attachment forms. Managed skillfully, this phase converts interest into something more difficult to walk away from.',
  },
  {
    chapter: 'The 4 Phases of Seduction — Phase 4: The Close',
    passage: 'The final phase creates the decisive moment — a clear break from what came before, an action that makes retreat psychologically costly. This might be a physical move, a direct declaration, or a situation constructed so that the target must choose. The transition from uncertainty to commitment is the most vulnerable point in the campaign — it can be collapsed by hesitation, by over-explaining, or by waiting for permission that was already granted. Bold, clean action is the only right move here.',
  },
];

// ── Body Language Layer ───────────────────────────────────────────────────────

const BODY_LANGUAGE_ENTRIES: Array<{ chapter: string; passage: string }> = [
  // Pre-approach / Initial contact
  {
    chapter: 'Body Language — Extended Eye Contact (Pre-Approach)',
    passage: 'Extended eye contact beyond the social norm (3+ seconds sustained without looking away first) is one of the clearest pre-approach attraction signals. Reliability: high when repeated or accompanied by secondary signals. Context modifier: professional settings create baseline eye contact norms that must be calibrated against. Tactical implication: when you receive extended eye contact, hold it for one beat longer than you normally would before looking away with purpose — not nervously. Her response to the hold tells you whether the signal was intentional.',
  },
  {
    chapter: 'Body Language — Orientation Signals: Feet and Body Direction (Pre-Approach)',
    passage: 'Feet are the most honest part of the body — they point toward where the person actually wants to be. In a group conversation, a woman whose feet or torso are oriented toward you even while talking to someone else is signaling interest that her words have not confirmed. Reliability: very high, as foot orientation is rarely consciously controlled. Context modifier: physical constraints (seating arrangements, tight spaces) can create false orientation. Tactical implication: observe foot direction in the first five minutes of any group interaction before reading anything from her face.',
  },
  {
    chapter: 'Body Language — Preening Before Approach',
    passage: 'Adjusting appearance — hair, clothing, posture — immediately before or during proximity to a person of interest is a subconscious preparation display. Reliability: medium-high. A woman who touches her hair, smooths her clothes, or straightens her posture when you enter her proximate space is responding to your presence. Context modifier: does not apply in settings where self-presentation is a professional requirement. Tactical implication: observe the preening signal before initiating conversation; it tells you you have more advantage than the situation suggests.',
  },
  {
    chapter: 'Body Language — Barrier Removal',
    passage: 'When someone removes physical objects between themselves and another person — putting down a phone, moving a purse, uncrossing arms — they are opening psychologically as well as physically. Reliability: high as a secondary confirmation signal. Context modifier: some barrier behavior is habit, not defense. Watch for the shift from barriers present to barriers absent as a campaign progresses. Tactical implication: if barriers go down without prompting as a conversation deepens, the dynamic is moving in the right direction without any specific action required from you.',
  },
  {
    chapter: 'Body Language — The Glance-Away-and-Back (Pre-Approach)',
    passage: 'The look-away-and-return — making eye contact, breaking it, and returning to it within a few seconds — is the classic covert interest signal. A single occurrence is ambiguous; two or three iterations within a short window is a reliable attraction indicator. Reliability: high with repetition. Context modifier: anxious types may look away more due to discomfort, not interest — calibrate against other signals. Tactical implication: three glances in a short window is a green light to approach. Do not wait for a fourth.',
  },

  // Approach / Opening
  {
    chapter: 'Body Language — Postural Opening During Conversation',
    passage: 'A closed posture (arms crossed, body angled away, shoulders contracted) converting to an open one (arms relaxed, torso fronted toward you, shoulders back) during a conversation is a reliable real-time attraction indicator. Reliability: high — postural opening is harder to fake than facial expression. Context modifier: posture also responds to temperature, fatigue, and topic discomfort. Tactical implication: track posture as a running gauge of where the conversation is landing. If she opens up physically as you speak on a specific topic, stay on that topic.',
  },
  {
    chapter: 'Body Language — Laughter Alignment',
    passage: 'When a target laughs at something you say that is not objectively funny, or laughs harder than the humor justifies, she is signaling social rapport and mild elevation of your status in her perception. Reliability: medium — some people are performatively sociable. The diagnostic is calibration against the group: does she laugh disproportionately more with you than with others? Tactical implication: don\'t confuse laugh-alignment with attraction confirmation on its own — it is one data point. It tells you the social channel is open; it does not tell you what\'s in the channel.',
  },
  {
    chapter: 'Body Language — Proximity Tolerance',
    passage: 'Personal space is an automatic and largely unconscious boundary. A target who allows, or gently engineers, closer physical proximity than the situation requires is signaling comfort and possibly interest. Reliability: high. People do not generally tolerate proximity from those they find repellent, regardless of what they say. Context modifier: crowded environments, professional cultures, and cultural backgrounds all affect baseline proximity norms. Tactical implication: gradually decrease distance across a conversation and note whether she adjusts toward or away from the new gap.',
  },
  {
    chapter: 'Body Language — Isopraxis: Mirroring',
    passage: 'Behavioral mirroring — unconsciously matching another person\'s posture, movement rhythm, or speech pattern — is one of the most reliable signs of deep rapport. When two people are mirroring each other, they are operating in the same psychological state. Reliability: very high — unlike most attraction signals, mirroring is extremely difficult to fake because it operates below awareness. Tactical implication: if you are mirroring each other, the campaign is functionally decided — you are executing not opening. Shift into close behavior.',
  },
  {
    chapter: 'Body Language — Self-Touch Above Shoulders (Neck, Throat, Hair)',
    passage: 'Touching the neck, throat, collarbone, or hair in response to something a specific person says or does is an involuntary arousal response — the nervous system redirecting energy upward. Reliability: very high when the touch occurs in clear response to something you said or did. Context modifier: habitual self-touch (someone who always plays with their hair) reduces the diagnostic value. Tactical implication: when the throat or neck touch follows something you said, do not acknowledge it verbally — ever. Note it, file it, stay calm, and continue. Do not escalate immediately; let her nervous system settle and then build again.',
  },

  // Building rapport
  {
    chapter: 'Body Language — Ventral Alignment (The Belly-Button Rule)',
    passage: 'When a person\'s abdomen is oriented toward you, their full psychological attention is engaged in the interaction. We instinctively protect the vulnerable ventral surface — turning it away from threat or disinterest and toward safety and engagement. Reliability: very high as a sustained signal. Context modifier: seating arrangements can constrain this. Tactical implication: in a standing or seated-freely conversation, ventral orientation after 10+ minutes means the full person is engaged with you. At this point, the risk in most moves is much lower than it appears.',
  },
  {
    chapter: 'Body Language — Leg Crossing Toward',
    passage: 'In a seated conversation, the direction of the top crossed leg is a reliable interest indicator. Crossed toward you: engaged and comfortable. Crossed away or shielded: some reservation present. Reliability: medium-high. More reliable when the direction changes during the conversation in response to a specific moment. Tactical implication: if the direction shifts toward you during a particular conversational turn, you are in the correct territory. Stay there.',
  },
  {
    chapter: 'Body Language — Open Palm Displays',
    passage: 'Showing open palms — whether through expressive gesturing or casual positioning — signals psychological openness and non-threat. When a target begins to gesture more openly with her hands as a conversation progresses, the defensive layer is coming down. Reliability: medium as a standalone signal, high as a trend over time. Tactical implication: a conversation that starts with closed, controlled hand behavior and ends with open, expressive gesturing has moved from guarded to engaged. The person you finish with is more reachable than the one you started with.',
  },
  {
    chapter: 'Body Language — Touch Initiation By Target',
    passage: 'Touch initiated by the target — a hand on your arm while making a point, a touch to confirm connection — is one of the highest-confidence attraction signals. Reliability: very high. Initiating touch is a risk, and people generally do not risk it without genuine engagement. Context modifier: high-touch cultural contexts reduce the diagnostic value. Tactical implication: when she initiates touch, return it in kind at the next natural opportunity — a brief, calibrated touch that acknowledges but does not overrespond. Then withdraw it. Let her notice the gap.',
  },
  {
    chapter: 'Body Language — Head Tilt',
    passage: 'Tilting the head to one side while listening exposes the carotid artery — one of the most vulnerable parts of the body. It is a submission and trust display that occurs naturally in the presence of someone the person feels safe with or attracted to. Reliability: high in consistent, sustained form. Context modifier: sometimes a response to hearing difficulty in loud environments. Tactical implication: a head tilt while you are speaking tells you she is not only listening but doing so from a position of openness. This is the moment to lower your voice.',
  },

  // Tension and escalation indicators
  {
    chapter: 'Body Language — Lip Touch or Lip Bite',
    passage: 'Touching, pressing, or biting the lip in response to something you say is an arousal signal — the autonomic nervous system redirecting blood flow in response to psychological stimulation. Reliability: high when situationally responsive. Context modifier: habitual lip-touching reduces diagnostic value. Tactical implication: observe whether the lip behavior is situationally specific — occurring in response to your specific words or proximity — or habitual. If situational, the arousal is real and present. Do not react to it in real time. Create the next interesting thing instead of capitalizing immediately.',
  },
  {
    chapter: 'Body Language — Pupil Dilation',
    passage: 'Pupils expand automatically in response to genuine interest, attraction, or cognitive engagement. This signal is completely involuntary and cannot be faked. Reliability: extremely high — but requires close enough proximity to observe, and adequate lighting conditions. Context modifier: pupils also dilate in dim light, with certain medications, and under emotional stress not related to attraction. Tactical implication: sustained pupil dilation in good light during a conversation with you is the clearest possible real-time interest signal. The challenge is getting close enough to observe it without creating awareness of the observation.',
  },
  {
    chapter: 'Body Language — Forward Lean Into Proximate Space',
    passage: 'A target who leans toward you during conversation is crossing the threshold of their own personal space — a move toward rather than away. This is one of the most reliable escalation signals because it is a physical expression of psychological movement. Reliability: very high in sustained form. Context modifier: distinguish between a lean to hear better (practical) and a lean that occurs without acoustic necessity. Tactical implication: a lean toward is the signal to shift register — lower your voice, slow the pace, introduce a more personal topic or closer proximity. The lean is permission for a small escalation.',
  },
  {
    chapter: 'Body Language — Voice Pitch Change',
    passage: 'Women\'s voices naturally lower slightly when speaking to someone they find attractive, shifting from a social register to a more intimate one. This is an involuntary acoustic change driven by changes in laryngeal tension. Reliability: medium-high, requires calibration against her baseline. Context modifier: voice changes also occur with emotional discomfort or situational noise. Tactical implication: when her pitch drops noticeably over the course of a conversation, the register has shifted from social to personal. Match the drop with your own voice. A conversation where both people are speaking quietly is on the right track.',
  },
  {
    chapter: 'Body Language — Anchoring and Tactile Response',
    passage: 'An anchor is a brief touch that tests response — a hand on her arm while making a point, a guiding touch to her lower back. The tactical value is in her response, not the touch itself. A target who responds neutrally or positively (maintains proximity, doesn\'t stiffen, continues the conversation naturally) has confirmed receptiveness to physical escalation. A target who subtly withdraws has given you information you needed. Tactical implication: anchor early and softly to calibrate receptiveness before committing to escalation. The anchor is intelligence-gathering.',
  },

  // Rejection and discomfort signals
  {
    chapter: 'Body Language — Crossed Arms With Body Orientation Away',
    passage: 'Arms crossed and body oriented away from you is a dual-signal barrier: emotional closure combined with physical withdrawal. Reliability: high when both signals are present together. Context modifier: crossed arms alone are sometimes a comfort gesture in cold environments or a habitual posture. The critical element is the combination with body orientation. Tactical implication: when you receive this dual signal, do not push — you will harden the position. Create space, introduce a different topic, or change the physical environment if possible. Give her room to re-open.',
  },
  {
    chapter: 'Body Language — Barrier Insertion (Phone, Drink, Purse)',
    passage: 'Placing an object between herself and you — pulling out a phone, holding a drink with two hands in front of the chest, repositioning a purse — is a barrier insertion behavior that signals discomfort with the current proximity or conversational content. Reliability: high when it occurs as a response to a specific moment in the conversation. Tactical implication: note what happened in the conversation immediately before the barrier appeared. That was the content or move that triggered the withdrawal. Adjust accordingly — do not continue in the same direction.',
  },
  {
    chapter: 'Body Language — Self-Pacification Gestures',
    passage: 'Rubbing the arm, stroking the neck from behind, pressing the lips together, or rocking slightly are self-soothing behaviors — the nervous system managing stress or discomfort. These signals tell you the nervous system is under load, but not necessarily from negative causes. Attraction itself creates the same nervous system load as anxiety. Tactical implication: when self-pacification appears alongside other positive signals, the cause is likely arousal-related stress, not rejection. When it appears alongside barrier insertion and gaze avoidance, it indicates genuine discomfort. Read the cluster, not the single signal.',
  },
  {
    chapter: 'Body Language — Gaze Avoidance and Exit Orientation',
    passage: 'A target whose eyes drift toward the exit, her phone, or others in the room during conversation is telling you that her attention is elsewhere. This is different from the brief glance-away of the interested person who is processing what you said. Sustained gaze wandering is the body\'s honest report that engagement has dropped. Tactical implication: when gaze avoidance appears, do not increase pressure — that will complete the exit. Instead, change the topic, introduce something unexpected, or create a natural pause that lets the conversation end gracefully. A graceful exit is always recoverable. A pressured exit rarely is.',
  },
  {
    chapter: 'Body Language — Physical Blocking With Objects or Body',
    passage: 'When a person turns her shoulder toward you, angles her body to create a physical wedge, or interposes a friend or object into the space between you, she is creating a social barrier. This is more deliberate than unconscious barrier insertion and indicates that proximity is unwanted. Reliability: high. Tactical implication: respect the block immediately and completely. Do not attempt to re-enter the space. The correct move is withdrawal with warmth — disengage cleanly and positively, leaving no tension behind. Targets who felt respected during a graceful exit often re-engage later. Targets who felt pressured do not.',
  },
];

// ── Embedding helper ──────────────────────────────────────────────────────────

async function embed(text: string, apiKey: string): Promise<number[] | null> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'models/gemini-embedding-001',
          content: { parts: [{ text: text.slice(0, 2000) }] },
          outputDimensionality: 768,
        }),
      },
    );
    if (!res.ok) {
      console.error('[seed-rag] embed failed:', await res.text());
      return null;
    }
    const data = await res.json();
    return data?.embedding?.values ?? null;
  } catch (e) {
    console.error('[seed-rag] embed exception:', e);
    return null;
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  if (!GEMINI_API_KEY) {
    return new Response(JSON.stringify({ error: 'GEMINI_API_KEY not set' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  const ALL_ENTRIES = [
    ...GREENE_ENTRIES.map((e) => ({ book_name: 'DARKO Intelligence Layer — Greene', ...e })),
    ...BODY_LANGUAGE_ENTRIES.map((e) => ({ book_name: 'DARKO Intelligence Layer — Body Language', ...e })),
  ];

  let inserted = 0;
  let skipped = 0;
  let failed = 0;

  for (const entry of ALL_ENTRIES) {
    const embedding = await embed(entry.passage, GEMINI_API_KEY);
    if (!embedding) { failed++; continue; }

    const { error } = await admin
      .from('book_passages')
      .insert({
        book_name: entry.book_name,
        chapter: entry.chapter,
        passage: entry.passage,
        embedding,
      });

    if (error) {
      console.error('[seed-rag] insert error:', error.message);
      skipped++;
    } else {
      inserted++;
    }

    // Tiny delay to stay within Gemini API rate limits
    await new Promise((r) => setTimeout(r, 120));
  }

  return new Response(
    JSON.stringify({
      status: 'done',
      total: ALL_ENTRIES.length,
      inserted,
      skipped,
      failed,
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
