/**
 * seed-rag-aos — Ingests the Art of Seduction paraphrased layer into book_passages.
 *
 * Source: knowledge/The Art of Seduction — Paraphrased for Darko.md (human reference).
 * Passages below are the RAG-optimized version: cold-voiced, self-contained,
 * ~150-250 words each, no dangling cross-references.
 *
 * Coexists with the existing `seed-rag` Greene/Body-Language entries — does NOT
 * delete prior data. Distinct book_name so retrieval ranking can prefer the
 * newer paraphrase when relevance is tied.
 *
 * Invoke once:
 *   curl -X POST 'https://adyebdcyqczhkluqgwvv.supabase.co/functions/v1/seed-rag-aos'
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BOOK_NAME = 'Greene — Art of Seduction (paraphrased)';

const PASSAGES: Array<{ chapter: string; passage: string }> = [
  // ── PHASE 1 (APPROACH) — 8 maneuvers ──────────────────────────────────────

  {
    chapter: 'Maneuver 1 — Choose The Right Victim (Phase 1: APPROACH)',
    passage: 'The first strategic decision is who to pursue. The right target has a void you can fill — adventure, validation, escape from routine, unspent intensity. The fully contented person is unseducible. Look for the gap between her current life and what she stopped saying she wanted. Susceptibility is not weakness — it is the precondition for movement. Diagnose before deployment. Read the first two interactions as signal data: how she opens, what she dwells on, what she dismisses. A faint signal in the opening is rarely a strong signal three weeks in. If the void cannot be named and the signal is flat, walk. Running a full campaign on the wrong target wastes weeks and miscalibrates your read on what works.',
  },
  {
    chapter: 'Maneuver 2 — Create A False Sense Of Security (Phase 1: APPROACH)',
    passage: 'A direct approach triggers her defenses before the conversation has started. The opening must not signal pursuit. Enter the periphery — a neutral context, a non-romantic frame, a reason to talk that has nothing to do with desire. Become present without being demanding. Let her think she discovered you. The frame at first should be friendly, slightly distracted, low-stakes. She lowers her guard because there is nothing to guard against. From inside the friend frame, you have months of low-resistance access to study her, plant ideas, and shift the dynamic at a time of your choosing. Skip this step and you spend the rest of the campaign trying to dismantle a wall you built on day one.',
  },
  {
    chapter: 'Maneuver 3 — Send Mixed Signals (Phase 1: APPROACH)',
    passage: 'Simplicity bores. Depth fascinates. Be hard to figure out. Mix qualities she does not expect to coexist — strength and care, edge and restraint, intellect and physicality. The target who can describe you in one sentence loses interest. The target who keeps revising her model of you stays focused. Do not announce your contradictions — let her find them. Reveal one unexpected dimension after she has formed an initial read, then another. The contradictions read as depth, which reads as worth investigating. Ambiguity is not vagueness; it is calibrated incompleteness. Give her enough data to be curious, not enough to close the file.',
  },
  {
    chapter: 'Maneuver 4 — Appear To Be An Object Of Desire (Phase 1: APPROACH)',
    passage: 'Your value is partly determined by who else wants you. Do not perform availability. Display, indirectly, that you have options — social, romantic, professional. References to other plans, other people interested in your time, a life that does not pause for her, all calibrate her perception upward. This is not lying; it is honesty about the fact that you are a person with a life. The target who feels she has competition treats you as a finite resource. The target who feels she is your only outcome treats you as a permanent option. Permanent options have no urgency. Make scarcity visible without ever discussing it.',
  },
  {
    chapter: 'Maneuver 5 — Create A Need; Stir Discontent (Phase 1: APPROACH)',
    passage: 'A satisfied target is immovable. The work in the opening phase is to surface a dissatisfaction she has stopped naming — a deferred ambition, a part of her life that has gone quiet, a fantasy that got shelved. Do not attack what she has. Describe, in passing, what she could have — an experience, a feeling, a version of herself — and let the contrast do the work. The gap between her current reality and the alternative you sketched is the engine. Once she feels the gap, you are positioned as the route across it. Without the gap, you are a pleasant distraction. Create the question before offering yourself as the answer.',
  },
  {
    chapter: 'Maneuver 6 — Master The Art Of Insinuation (Phase 1: APPROACH)',
    passage: 'Direct statements trigger evaluation. Insinuation slips past evaluation entirely. Plant the idea in language ambiguous enough to deny, specific enough to land. "There is something about the way you handled that situation that most people would have missed." "I get the sense you are bored, but you do not say it." She processes the suggestion days later as her own thought. If she calls it out, retreat without commitment — the seed has already been planted. The most powerful suggestion is the one she believes she discovered. Use sublanguage: bold statement, then partial retraction, then return to it later from a different angle. The retraction is theatre; the seed is the move.',
  },
  {
    chapter: 'Maneuver 7 — Enter Her Spirit (Phase 1: APPROACH)',
    passage: 'Most people are locked in their own world and resist anyone who tries to drag them into a different one. The way past resistance is the opposite of resistance: enter her world first. Mirror her interests, her language, her energy, her preoccupations. Validate her view of herself before you ever ask her to entertain yours. Stroke the parts of her self-image she wants reinforced. Once she feels you understand her — really understand her, not perform understanding — the inner gate opens. From inside her spirit, you can lead her anywhere. The error is trying to bring her into your world before she trusts that you have seen hers. Build the rapport first; lead with it later.',
  },
  {
    chapter: 'Maneuver 8 — Create Temptation (Phase 1: APPROACH)',
    passage: 'Find the specific fantasy she has not realized — the experience she has stopped asking for, the version of herself she only flashes at in private. Hint that you are the gateway. Do not promise the fantasy; suggest its proximity. The forbidden made accessible through you creates a charge no logical appeal can match. Be specific enough that her imagination engages, vague enough that she has to lean in. She fills the gaps with her own desire, and the desire she constructs is more powerful than anything you could describe. Tempt by association — your presence implies the possibility — not by declaration. Declaration kills temptation.',
  },

  // ── PHASE 2 (BUILD) — 7 maneuvers ─────────────────────────────────────────

  {
    chapter: 'Maneuver 9 — Keep Her In Suspense (Phase 2: BUILD)',
    passage: 'The moment she knows what to expect from you, you are no longer interesting. Predictability collapses the dynamic. Once a pattern stabilizes — warm replies, consistent timing, predictable affection — break it. A sudden cool day after a hot week. A withdrawal after a warm moment. Not because you are unstable, but because you are not on her schedule. The break does not need explanation. The unexplained shift is the move. She fills the silence with hypothesis: did I do something, is he losing interest, is there someone else. Whatever she invents, you stay on her mind. Suspense is not cruelty — it is the deliberate management of attention.',
  },
  {
    chapter: 'Maneuver 10 — Use Words To Sow Confusion (Phase 2: BUILD)',
    passage: 'Words are not for conveying information; they are for creating emotional states. Choose them for the feeling they produce, not for their literal meaning. Specific flattery aimed at what she actually values about herself disarms faster than any general praise. Vague promises of future possibility excite more than concrete commitments. Comfort her unstated insecurity in a single sentence and she will follow you anywhere. Avoid analytical language in this phase — explanation lowers temperature. Use evocative, sensory, slightly elevated phrasing. The right word at the right moment rewires the conversation. Speak to her emotional self; her rational self will catch up later.',
  },
  {
    chapter: 'Maneuver 11 — Pay Attention To Detail (Phase 2: BUILD)',
    passage: 'Grand gestures signal effort and trigger evaluation. Small details signal attention and bypass evaluation entirely. Remember the offhand thing she mentioned two weeks ago and reference it without announcement. Track her micro-moods and respond to the shift before she has named it. Notice the small habit she does not realize she has, and let her see that you noticed without making it weird. Small specific noticing is rare. Most people are too self-absorbed to track another person at this level. When she experiences it, the message lands deeper than any statement of feeling: this one watches, this one remembers, this one is different. Detail is what intimacy is actually built of.',
  },
  {
    chapter: 'Maneuver 12 — Poeticize Your Presence (Phase 2: BUILD)',
    passage: 'Constant availability breeds familiarity, and familiarity is the death of fantasy. After a good encounter, withdraw. Let her sit with the feeling. The gap between encounters is where she idealizes you — her memory edits out the boring parts and amplifies the resonant ones. Associate yourself with environments and moments that carry weight: a beautiful setting, a moment of unexpected depth, a small ritual that becomes "ours." When she thinks of you in your absence, the version she pictures is wrapped in the idealization the gap created. Never confuse availability with closeness. Strategic absence makes presence valuable.',
  },
  {
    chapter: 'Maneuver 13 — Disarm Through Strategic Vulnerability (Phase 2: BUILD)',
    passage: 'Too much maneuvering raises suspicion. Counteract by appearing slightly affected — show that she has gotten through your composure in a small, controlled way. A moment of revealed nerves, a confession of a flaw she would not have guessed, a brief loss of your usual frame. This signals: I am not above this, I am not strategic, I am moved by you. Her defenses lower because she stops seeing the campaign behind the moves. Strategic vulnerability is not real weakness — it is the disclosure of one calibrated thing at the moment it does the most work. Show her you are capable of being affected, then return to your frame. The contrast amplifies both.',
  },
  {
    chapter: 'Maneuver 14 — Confuse Desire And Reality (Phase 2: BUILD)',
    passage: 'Reality is disappointing — people retreat from it constantly into fantasy. Build experiences with her that feel slightly unreal: heightened, atmospheric, like a scene from a film she would have wanted to be in. Choose settings deliberately. Introduce small touches that signal this is not ordinary time. Let her experience moments with you that are difficult to slot back into her normal life. The memory of those moments becomes a fantasy she wants to re-enter. The gap between her ordinary life and the time spent with you becomes the engine. Once she cannot tell where the experience ends and her imagination of it begins, the surrender is mechanical.',
  },
  {
    chapter: 'Maneuver 15 — Isolate The Victim (Phase 2: BUILD)',
    passage: 'You do not need to attack her relationships. You need to be more compelling than the alternatives. As the campaign deepens, become the most stimulating, most emotionally rewarding presence in her field. Her friends and her routines become slightly less interesting by comparison. The isolation happens by itself — she chooses you over them, not because you asked, but because the math is obvious. Once she is centered on you, outside perspective drops away. She cannot easily cross-check her experience against anyone else who knows what is happening. In that vacuum, you are her primary source of meaning. Do not be cruel about the relationships you displace — be uninterested in them. The displacement is the move.',
  },

  // ── PHASE 3 (DECIDE) — 5 maneuvers ────────────────────────────────────────

  {
    chapter: 'Maneuver 16 — Prove Yourself (Phase 3: DECIDE)',
    passage: 'By this phase, she has doubts she may not articulate. Words cannot resolve them — only a specific action can. Identify the doubt. Then perform a single move that directly answers it. Not several moves — one well-aimed act she cannot dismiss. If she suspects your intentions, show up for her when there is no romantic payoff visible. If she doubts your investment, make the costly choice in her favor before she asks. The proof must be concrete and slightly excessive. Resistance dissolves under a clean, undeniable act. After it, you have weeks of accumulated trust that no further argument can produce. Save the prove-yourself move for the moment its absence is what is blocking advancement.',
  },
  {
    chapter: 'Maneuver 17 — Effect A Regression (Phase 3: DECIDE)',
    passage: 'The deepest emotional bonds are templated by childhood. Find the emotional register she felt safest in as a child — protected, delighted, adventurous, cherished — and re-create that quality in your dynamic. Not by imitating a parent, but by becoming the figure who provides the same feeling. Sensory triggers help: places, textures, foods, activities that evoke the period. She will not consciously know why being with you feels right. It bypasses her adult reasoning entirely. Once the regression is established, she is operating on bonds older and stronger than rational evaluation. The attachment that forms in this register is the kind people describe as "fated" — because it does not feel chosen.',
  },
  {
    chapter: 'Maneuver 18 — Stir The Transgressive (Phase 3: DECIDE)',
    passage: 'Shared transgression — even minor — creates a bond stronger than pleasure alone. Find the boundary she is curious about but afraid to cross alone. Lead her toward it with the implicit assurance that you are safe to do it with. The transgression need not be large; the feeling of doing something slightly forbidden together is enough. A confidence shared that should not be shared. An impulse acted on that her ordinary frame would forbid. A small rule broken under your direction. The complicity creates intimacy: you both did something the rest of the world cannot know about. From here, the relationship has its own private territory. She cannot easily leave a territory only the two of you inhabit.',
  },
  {
    chapter: 'Maneuver 19 — Use Spiritual Lures (Phase 3: DECIDE)',
    passage: 'Physical seduction triggers her defenses; spiritual framing dissolves them. Elevate the connection above the body. Speak as if what is happening between you is fated, rare, larger than ordinary romance. Use language that points at meaning, destiny, mutual recognition. Frame moments of intimacy as meetings of souls, not events of the body. The higher the frame, the harder it is to retreat — backing out feels like dismissing something sacred, not just declining a man. Make her feel chosen by something larger, not just by you. The chosen-ness is the bind. She wants to be the woman who would not refuse a connection like this.',
  },
  {
    chapter: 'Maneuver 20 — Mix Pleasure With Pain (Phase 3: DECIDE)',
    passage: 'Constant kindness becomes invisible. The greatest single error in the late campaign is being too consistently warm. Introduce pain in small, controlled doses — a sudden coolness, a distracted day, a moment of seeming interest in someone else. Let her feel the loss before you return. The return, when it comes, lands harder than any sustained warmth could. Her relief is the engine: she gets back what she briefly thought she had lost, and the emotional voltage of recovery cements the attachment. Do not be cruel; be calibrated. The pain must be small enough to recover from but real enough to register. The contrast between the lows and the highs is what makes the highs unforgettable.',
  },

  // ── PHASE 4 (COMMIT) — 4 maneuvers ────────────────────────────────────────

  {
    chapter: 'Maneuver 21 — The Pursuer Is Pursued (Phase 4: COMMIT)',
    passage: 'After a long stretch of leading, reverse. Step back. Become slightly bored, slightly distracted, slightly interested in something else. Let her notice the shift and react. The target who has spent weeks being pursued will, when the pursuit stops, begin to pursue. She will reach for you, initiate, escalate. Allow it. Receive her effort without immediately reciprocating at her intensity. Her own investment in chasing you seals the surrender — she has now done so much work that retreating feels like loss. By the end, she believes she chose you, even though every step was your design. The most powerful position is the one being chased. Engineer the reversal before the campaign reaches its natural climax.',
  },
  {
    chapter: 'Maneuver 22 — Use Physical Lures (Phase 4: COMMIT)',
    passage: 'The mind objects long after the body has agreed. To bypass her remaining mental resistance, route through the senses. Lower your voice to a register her body recognizes as intimate. Hold eye contact longer than the conversation requires. Position yourself in her proximity until physical closeness becomes the default. Do not force physical escalation — create the atmosphere in which it becomes inevitable. The escalation should feel like something neither of you exactly decided. Her body wants this before her mind admits it. Give the body its evidence and the mind will stop arguing. The error is asking permission. The move is creating the condition where the question never arises.',
  },
  {
    chapter: 'Maneuver 23 — Master The Bold Move (Phase 4: COMMIT)',
    passage: 'A moment arrives when her signals are clear but her words have not caught up. She wants you to act, and waiting for verbal confirmation will collapse the moment. Read the signs — sustained proximity, voice drop, repeated touch, gaze hold — and act decisively. Hesitation now reads as insecurity and reverses everything you have built. The bold move is not aggressive; it is confident, clear, and unhesitating. Make the move clean: say what you want, do what you want, take the space. Targets at this stage want to be relieved of the burden of deciding. Boldness, at the right second, is the most seductive single act in the campaign. Do not ask. Do.',
  },
  {
    chapter: 'Maneuver 24 — Beware The Aftereffects (Phase 4: COMMIT)',
    passage: 'The seduction does not end with surrender — that is where the second seduction begins. After the climax of any campaign comes a dangerous drop: lassitude, doubt, disappointment, creeping familiarity. Treat the relationship as an ongoing seduction, not a settled outcome. Do not become uniformly available, uniformly warm, uniformly predictable. Keep some of the mystery that drew her in. Maintain the practice of strategic absence. Introduce small frictions to keep desire alive. Long-term attraction is not maintenance — it is the continuation of the dynamics that created the attraction in the first place. The men whose women lose interest are the men who stopped seducing the moment they thought they had won.',
  },

  // ── ANTI-SEDUCER TYPES (combined) ─────────────────────────────────────────

  {
    chapter: 'Anti-Seducer — The Poor Me',
    passage: 'The Poor Me uses guilt and sympathy to extract attention. Self-pity is the least attractive quality a man can display. It signals low status, low agency, and an inability to handle his own emotional reality. Women feel cornered by it — they sense the implicit demand for caretaking and resent it. Even when sympathy is given, it does not convert to attraction. The cure is to handle your own pain in private. When you communicate about hardship, do it briefly, factually, and without seeking comfort. The man who acknowledges difficulty without performing it commands respect. The man who performs it loses every dynamic he enters.',
  },
  {
    chapter: 'Anti-Seducer — The Bore and The Self-Absorbed',
    passage: 'Two related failure modes. The Bore talks too much, leaves no mystery, fills every silence, provides no friction for the imagination to grip. The Self-Absorbed talks only about themselves, asks nothing, listens only to plan the next thing they will say. Both communicate the same underlying truth: the other person is not the point. Seduction requires that she be the point. The cure is calibrated brevity and external attention. Say less than you want to say. Ask specific questions about her experience. Reference what she said earlier. Make her feel that the conversation could not have happened with anyone else. Boredom and self-absorption both lose to focused noticing.',
  },
  {
    chapter: 'Anti-Seducer — The Insecure and The Desperate',
    passage: 'The Insecure needs constant reassurance and drains energy from every interaction. The Desperate radiates need so strong that the target reflexively pulls away. They are the same failure at different volumes. Both communicate: I require something from you that you cannot easily refuse. The target feels the demand, and the demand triggers the opposite of desire. The cure is to genuinely solve the underlying problem before attempting any campaign. Work on the insecurity in private. Build a life that is not centered on her response. The non-needy man is attractive not because he performs non-neediness — but because he has actually built something that makes her response non-critical. Then her response becomes a bonus, not a verdict.',
  },
  {
    chapter: 'Anti-Seducer — The Rigid and The Overeager',
    passage: 'The Rigid cannot adapt, cannot play, cannot shift register when the moment calls for it. Every conversation runs on his terms or not at all. The Overeager tries too obviously — every move shows the effort, every line is calibrated for impact, the whole performance becomes visible. Both ruin the dynamic by destroying the illusion of effortlessness. Seduction requires fluidity (Rigid lacks it) and concealment of effort (Overeager fails it). The cure: practice until the moves are automatic, then let them flow without thinking. Be willing to break your own frame when a better move presents itself. Stop optimizing every line and start trusting the run.',
  },

  // ── VICTIM TYPES — 14 missing types, in 3 chunks of 4-5 ───────────────────

  {
    chapter: 'Victim Types — Bundle A (Conquered, Discontented, Self-Conscious, Sensualist)',
    passage: 'The Conquered needs to be desired and pursued intensely; pursue them, then withdraw — they will chase what threatens to leave. The Discontented is unhappy but cannot name why; show them a better world and position yourself as the gateway, without ever attacking what they have. The Self-Conscious is insecure about appearance or worth; make them feel rare in your eyes through specific, accurate noticing, not flattery — flattery confirms the insecurity, accurate seeing dissolves it. The Sensualist is starved for physical pleasure and beauty; appeal to the senses directly with texture, taste, sound, scenery — they will follow whoever feeds the appetite that has gone quiet.',
  },
  {
    chapter: 'Victim Types — Bundle B (Romantic, Hero Worshiper, Protector, Intellectual)',
    passage: 'The Romantic lives for fantasy and idealized love; become the romantic lead in their personal story, but never confirm you are the role they project — let the projection do its work. The Hero Worshiper needs someone to admire and follow; project competence, vision, and unwavering certainty — they will commit to a man who seems to know where he is going. The Protector needs to feel needed; show small controlled vulnerabilities they can care for, and they will fall in love with their own generosity. The Intellectual lives in their head and is disconnected from emotion; appeal to the mind first with sharp ideas, then slowly introduce feeling — once their thinking accepts you, the body follows.',
  },
  {
    chapter: 'Victim Types — Bundle C (Starved, Destructive, Bored, Vain, Trophy Collector, Vulnerable)',
    passage: 'The Starved is emotionally deprived and will become addicted to consistent warmth. The Destructive is attracted to chaos; be dangerous but controlled, and they will follow you into the abyss — withdraw the control and you lose them. The Bored is suffocating from routine; be unpredictable and offer escape — predictability is the one thing they cannot tolerate. The Vain needs admiration; admire them publicly and specifically, but never seem to need their admiration in return. The Trophy Collector wants status, not connection; become the status symbol, then begin to withdraw — possessing you should feel like a constant achievement, not a settled outcome. The Vulnerable is recently hurt; be patient, safe, and gentle; heal them first, seduce them later.',
  },
  {
    chapter: 'Victim Types — Bundle D (Dependent, Greedy, Grandiose, Collector)',
    passage: 'The Dependent cannot function alone; be the strong reliable figure they can lean on, but always maintain your own external life so they do not absorb you. The Greedy always wants more; dole out rewards in small calibrated doses and make them work for each one — abundance kills their hunger, scarcity feeds it. The Grandiose thinks they are superior and loves those who agree; validate the grand self-image fully — they will commit to whoever sees them as they see themselves. The Collector is a serial seducer who always moves on; the only winning move is either to be unmovable in their eyes, or to let them collect you and then withdraw first — they cannot tolerate being left.',
  },

  // ── APPENDIX — Environment + Mass Seduction (condensed) ───────────────────

  {
    chapter: 'Seductive Environment And Time',
    passage: 'The setting is not neutral — every element of the environment either advances or undermines the campaign. Choose places that feel slightly removed from ordinary life: intimate lighting, atmospheric textures, music chosen deliberately. A familiar environment gives the target home-field advantage; an unfamiliar one gives you control. Time matters equally. Late evening lowers inhibitions and creates intimacy by default. Long, unstructured time — a night that bleeds into morning, a weekend that loses its clock — allows seduction to develop at the pace it needs. Rushed time works against you. The right environment plus the right time multiplies every move you make; the wrong combination handicaps even excellent moves. Stage the encounters; do not leave the setting to chance.',
  },
  {
    chapter: 'Soft Seduction — Influence At Scale',
    passage: 'The same psychological mechanisms that seduce one person can move a market, a movement, or a following. The differences are operational, not structural. Mass seduction requires an archetypal persona — qualities the audience wants to see in themselves — rather than the individualized read. Use spectacle, theatricality, and deliberate staging. Appeal to shared fantasies of transformation: aligning with the message will make the audience into a version of themselves they want to be. Create symbolic opponents that unify the following — a shared enemy or obstacle. Maintain mystery: leaders fully transparent lose magnetic power. Symbols beat arguments because they bypass evaluation and speak to emotion. The principles do not change between one target and one million; only the medium does.',
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
      console.error('[seed-rag-aos] embed failed:', await res.text());
      return null;
    }
    const data = await res.json();
    return data?.embedding?.values ?? null;
  } catch (e) {
    console.error('[seed-rag-aos] embed exception:', e);
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

  // Idempotency: if any passage with this book_name already exists, skip the whole run.
  // Re-runs require manual deletion first.
  const { count: existingCount } = await admin
    .from('book_passages')
    .select('id', { count: 'exact', head: true })
    .eq('book_name', BOOK_NAME);

  if (existingCount && existingCount > 0) {
    return new Response(
      JSON.stringify({
        status: 'skipped',
        reason: `${existingCount} passages already exist under book_name='${BOOK_NAME}'. Delete them first to re-run.`,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  let inserted = 0;
  let failed = 0;

  for (const entry of PASSAGES) {
    const embedding = await embed(entry.passage, GEMINI_API_KEY);
    if (!embedding) { failed++; continue; }

    const { error } = await admin
      .from('book_passages')
      .insert({
        book_name: BOOK_NAME,
        chapter: entry.chapter,
        passage: entry.passage,
        embedding,
      });

    if (error) {
      console.error('[seed-rag-aos] insert error:', error.message);
      failed++;
    } else {
      inserted++;
    }

    await new Promise((r) => setTimeout(r, 120));
  }

  return new Response(
    JSON.stringify({
      status: 'done',
      total: PASSAGES.length,
      inserted,
      failed,
      book_name: BOOK_NAME,
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
