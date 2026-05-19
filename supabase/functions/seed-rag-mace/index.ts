/**
 * seed-rag-mace — Ingests Mace's Dark Psychology and Gaslighting Manipulation
 * into book_passages.
 *
 * Source: mace_chunks/*.md (18 pre-chunked passages — diagnostics, methods,
 * mechanisms, vignettes — each with frontmatter `retrieve_when` hints).
 *
 * High-signal for DARKO: formal dark-triad diagnostics (Mach/Narc/Psyc),
 * the 10 manipulation methods (Long Con, Gradual Deception, Mirror, Guilt,
 * etc.), trauma-bonding via intermittent reinforcement, and Lifton's
 * 8-stage thought-reform arc for cult-like dynamics. Fills a gap that
 * Greene/Body-Language/Suler do not cover.
 *
 * Coexists with seed-rag, seed-rag-aos, seed-rag-psycyber — distinct
 * book_name. Idempotent; skips if any row with this book_name already exists.
 *
 * Embedding boost: the per-chunk `retrieve_when` hint is concatenated into
 * the embedding input (improves recall) but NOT stored in the passage
 * (keeps operator-facing context clean at inference time).
 *
 * Invoke once:
 *   curl -X POST 'https://adyebdcyqczhkluqgwvv.supabase.co/functions/v1/seed-rag-mace'
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BOOK_NAME = 'Mace — Dark Psychology & Gaslighting Manipulation';

const PASSAGES: Array<{ chapter: string; retrieve_when: string; passage: string }> = [
  // ── Chapter 2: Diagnostics ────────────────────────────────────────────────
  {
    chapter: 'Diagnostic: Machiavellianism (Mach IV)',
    retrieve_when: 'partner-pattern description includes calculated charm, strategic information control, image management, cold competition framing',
    passage: `Christie and Geis operationalized Machiavellianism as a personality trait through the Mach IV scale, a 20-item instrument loosely derived from passages in The Prince. Scores range from 20 to 100; individuals scoring above 60 are classified as high-Machs. These individuals exhibit a calculative, cynical worldview and a willingness to deploy deceit and manipulation as standard operating procedure.

Long-game strategy. The Machiavellian personality plans in extended temporal frames. Short-term gratification is subordinated to strategic objectives. Every interaction is assessed for its utility: what information can be extracted, what alliances can be formed, what leverage can be accumulated. Unlike the narcissist, who requires immediate validation, the Machiavellian is willing to wait months or years for the payoff.

Image management. High-Machs are acutely conscious of public perception. They curate their reputation deliberately, understanding that how they are seen determines what they can extract. They can appear charming, collaborative, and altruistic while maintaining internal emotional distance. The mask is not a sign of pathology but a tool.

Exploitation of ambiguous-rule environments. Machiavellians perform best where rules are unclear or unenforced. Ambiguity provides cover for strategic maneuvering. In highly structured environments with rigid oversight, their effectiveness diminishes. They gravitate toward creative industries, startup cultures, and political ecosystems where norms are fluid and enforcement is weak.

Alexithymia and anhedonia. Many high-Machs exhibit difficulty identifying and labeling their own emotional states (alexithymia) and reduced capacity for pleasure (anhedonia). Emotional experiences are shallow. This is not depression — it is a stable trait profile that enables the Machiavellian to make decisions unencumbered by affective interference.

Information as currency. Machiavellians hoard information and release it selectively. They understand that knowledge asymmetry creates power asymmetry. They are unlikely to share data unless doing so advances their position. They also manipulate context, presenting facts out of sequence or framing them to produce specific interpretations.

Charming until commitment is secured. The initial presentation is warm, engaging, and magnetic. Once the target is committed — emotionally, financially, or reputationally — the charm withdraws and the exploitation phase begins.

The distinguishing signal of Machiavellianism is the need to win. Every interaction is framed as a competition with stakes. Iago from Shakespeare's Othello is the archetypal literary representation: strategic, patient, image-conscious, and entirely indifferent to the destruction caused along the way.`,
  },
  {
    chapter: 'Diagnostic: Narcissism (NPI)',
    retrieve_when: 'partner-pattern description includes grandiosity, validation-seeking, fragile ego, victim-stance, sense of entitlement',
    passage: `The Narcissistic Personality Inventory (NPI) is the standard psychometric instrument for measuring subclinical narcissism. It assesses four dimensions: self-absorption, sense of superiority and authority, and propensity to exploit others for personal gain. Individuals scoring high on the NPI exhibit a persistent pattern of self-focus that exceeds ordinary selfishness.

Need for supremacy. The narcissist's internal hierarchy places them at the apex. They must be the finest, the most correct, the most capable. No rival can be acknowledged. The mere possibility that someone could surpass them is cognitively unacceptable. This differs from healthy self-confidence: the narcissist's universe operates on rigid dichotomies of superior/inferior, correct/incorrect, and the narcissist always occupies the privileged pole. Even being the "worst" can serve this need, as it provides grounds for demanding compensation or apology.

Validation as quota. Praise is never sufficient. The narcissist requires a continuous supply of external admiration, yet absorbs it as though it were owed rather than earned. Accomplishments are embellished; trivialities become major victories. Relationships are structured as one-sided performance venues where only the narcissist's needs matter. The other person exists as a supporting actor, whose value is contingent on their feeding the narcissist's self-regard.

Extreme sensitivity to slight. Perceived criticism triggers disproportionate responses. The narcissist interprets disagreement, boundary-setting, or even neutral feedback as a personal assault. This sensitivity creates a climate where those in the narcissist's orbit often comply preemptively to avoid rage or withdrawal.

Vulnerable/covert variant. Not all narcissists present with overt grandiosity. The vulnerable narcissist adopts a wounded-victim posture that functions as a weapon. They present themselves as misunderstood, unfairly treated, or uniquely burdened. This elicits caretaking from others while absolving the narcissist of accountability. The demand for supremacy remains intact — it is simply expressed through grievance rather than achievement.

Relationships as supporting cast. Partners, friends, and family members are evaluated by their utility in sustaining the narcissist's self-image. When a partner achieves independence or success, the narcissist perceives this as abandonment or betrayal rather than a neutral life event.

The distinguishing signal of narcissism relative to other dark-triad types is the need for supremacy. The narcissist must be on top. Richard Ramirez, the "Night Stalker," exemplified this: he cultivated his media persona, relished his notoriety, and performed for his courtroom groupies. For the narcissist, image management is not a means to an end — it is the end itself.`,
  },
  {
    chapter: 'Diagnostic: Psychopathy',
    retrieve_when: 'partner-pattern description includes charm without warmth, lack of remorse, thrill-seeking, calm under crisis, manufactured conflict between others',
    passage: `Psychopathy is twice as prevalent as bipolar disorder, schizophrenia, or anorexia. Only depression, PTSD, and substance-use disorders are more common. It has existed across cultures and historical periods: the Yoruba term aranakan describes someone who goes their own way regardless of harm to others; the Inuit kunlangeta refers to a person who lies, cheats, and steals habitually.

Neurobiological markers. The psychopathic brain differs measurably from normative structure. The prefrontal cortex, which regulates impulse control and planning, is smaller. The amygdala, critical for fear, guilt, and sadness processing, is deformed. Skin conductance (electrodermal activity) is lower at rest. Resting heart rate is lower than population norms. During acts of violence, heart rate and arousal increase, and the subject experiences pleasure rather than distress. This physiological profile means the psychopath is chronically under-aroused and seeks stimulation to reach baseline.

Boredom-driven stimulus seeking. Psychopaths require novelty and excitement. Routine life is intolerable. Stimulation may be sought through risk-taking, substance use, starting fights, humiliating others, or escalating to violence. The motive is not strategic — it is regulatory. The psychopath harms because stillness is unbearable.

Charm as performance. The psychopathic presentation is often charismatic, confident, and socially polished. This is not warmth but a learned performance. Psychopaths study emotional behavior clinically and replicate it. They can convincingly mimic empathy, remorse, and affection without experiencing any of these states. The mask of normality allows them to move undetected through social and professional environments.

Manufactured conflict. A characteristic pattern: the psychopath tells Person A that Person B has been speaking badly of them, then tells Person B the same about Person A. When the two confront each other, the psychopath watches. This serves multiple functions — it creates chaos (which is stimulating), weakens potential coalitions against the psychopath, and positions the psychopath as the calm center of the storm.

Lack of remorse. Apologies, when offered, are performative. The psychopath may say "I'm surprised this hurt you" or "you're being too sensitive." Lies are told even when truth would be easier — deception itself is gratifying. When cornered, the psychopath reframes reality, making the target feel responsible for the harm they have suffered. The target walks away confused, believing they have wronged an innocent person.

High-functioning variants. Hervey Cleckley documented psychopathic individuals who occupied respected positions in medicine, science, and academia. These high-functioning psychopaths are not incarcerated. They navigate society with their grandiosity and remorselessness intact, selecting professions where these traits are neutral or advantageous.

The distinguishing signal of psychopathy is the need for stimulation. Unlike the narcissist (supremacy) or Machiavellian (winning), the psychopath acts to escape boredom. Violence, deception, and chaos are tools for regulating internal arousal.`,
  },
  {
    chapter: 'Research: Dark-Triad Attractiveness & Emophilia',
    retrieve_when: 'user self-assessment OR repeated bad-relationship pattern OR onboarding probe for vulnerabilities',
    passage: `Four empirical findings explain why individuals with dark-triad traits are perceived as attractive despite being poor long-term partners.

Finding 1 — Self-presentation, not innate advantage. Strube and Holtzman (Washington University) photographed 111 college students upon arrival, then again after the students had removed makeup, jewelry, and accessories and changed into plain gray sweatpants and t-shirts. Strangers rated the "stripped-down" photographs. The dark-triad attractiveness advantage disappeared entirely in the unadorned condition. Participants high in dark-triad traits were not more physically attractive than others — they were more skilled at self-presentation. The advantage is in the packaging, not the product.

Finding 2 — First-impression decay curve. A 2010 study found that individuals scoring high on the narcissism spectrum were rated as more likable than peers on first impression. They dressed better, used confident body language, and displayed engaging facial expressions. However, as others spent more time with them, likability declined predictably. The curve is consistent: initial appeal, then steady erosion as the self-focus, lack of reciprocity, and exploitative patterns become visible. The halo effect fades when the data accumulates.

Finding 3 — Target-age skew. Carter (Durham University) documented that dark-triad attractiveness is not evenly distributed across age groups. The appeal skews toward younger targets, who may lack the experiential database to distinguish between confidence and pathology, or between performance and genuine warmth. Older individuals, having accumulated more pattern data, are less susceptible.

Finding 4 — Emophilia as risk variable. Emophilia — the trait of falling in love quickly, often, and easily — substantially elevates risk for dark-triad entrapment. Individuals high in emophilia form emotional commitments before pattern-matching can complete. They interpret intensity as intimacy, and the dark-triad individual's skilled performance at the early stage is taken at face value. Low-emophilia individuals, by contrast, require extended observation before forming attachment. They resist by default: they do not trust first impressions, they test consistency over time, and they are less likely to override red flags with romantic narratives.

Clinical implication. Emophilia is not a flaw but a risk factor that can be managed through deliberate pacing. The recommendation is not to change one's capacity for love but to impose a temporal buffer between attraction and commitment, allowing the decay curve to manifest if it is going to.`,
  },

  // ── Chapter 4: Methods ────────────────────────────────────────────────────
  {
    chapter: 'Method 1: The Long Con',
    retrieve_when: 'user describes gradual entrapment, feeling dependent on a person, or realizing too late that they are enmeshed',
    passage: `Mechanism. The Long Con establishes an emotional foundation before any request is made. The manipulator invests time, attention, and apparent goodwill to build trust. Only after the target is emotionally committed does the manipulator begin extracting value. The extraction phase is gradual — small requests escalate into larger ones, and by the time the target recognizes the pattern, they are too entangled to extract themselves.

Example. A recently widowed older woman receives sympathy and attention from a male acquaintance. He recommends minor financial changes — a better bank account, reduced expenses — which benefit her and build his credibility. Over months, he gains her full trust. He then proposes investing some of her savings. She agrees because past recommendations were sound. Once her money is under his control, he extracts as much as possible. The victim may never report the loss because she believes he genuinely tried to help but had bad luck — a testament to how thoroughly the Long Con reframes the target's perception of events.

Behavioral signature. The target experiences a slow, barely perceptible shift from autonomy to dependence. Early interactions feel generous and helpful. Requests escalate in cost but are always presented as reasonable in context. The target begins making excuses for the manipulator to others. There is no single moment of abuse — only a series of individually defensible compromises.

Counter-pattern. Resist isolation. Maintain independent relationships throughout any new connection. Pause before agreeing to financial or emotional commitments, especially when they are framed as urgent or exclusive. Audit relationships periodically: ask whether the balance of giving and receiving has shifted without consent. A legitimate partner will accommodate scrutiny; a Long Con artist will frame it as betrayal.`,
  },
  {
    chapter: 'Method 2: Gradual Deception',
    retrieve_when: 'user describes incremental boundary erosion, favors escalating in cost, or a partner who pushes limits over time',
    passage: `Mechanism. Dark persuasion operates like a stairwell: the target is led one step at a time, and each step is small enough to seem reasonable in isolation. No single request is shocking. The shock only appears in retrospect, when the cumulative distance traveled becomes visible. The manipulator never asks for the final concession directly — they ask for the predecessor to that concession, and then the predecessor to that.

Example. In political persuasion, gradual deception enables leaders to implement unpopular policies by breaking them into palatable increments. A politician cannot dismantle a public institution overnight, but they can defund it in phases, each justified by the previous phase's "failure." By the time the public recognizes the endpoint, the process is too far advanced to reverse. The same dynamic operates in personal relationships: a partner who begins by asking for small accommodations (skip a social event, share a password, tolerate a minor criticism) and escalates over months or years.

Behavioral signature. The target notices but dismisses each individual incident as trivial. Friends or family may express concern, but the target defends the behavior because no single act qualifies as abuse. The target experiences a growing unease that something is wrong, but cannot point to any one event as the cause. This ambiguity is the mechanism — the target gaslights themselves before the manipulator needs to.

Counter-pattern. Track boundary violations in writing, even minor ones. Establish explicit thresholds in advance: what is the line that cannot be crossed? When a single request triggers internal alarm, treat the alarm as data regardless of how small the request appears. Share concerns with a trusted third party early, before the cumulative weight of concessions makes disclosure feel impossible.`,
  },
  {
    chapter: 'Method 3: Masking and Reverse Psychology',
    retrieve_when: 'user wants to create intrigue, reverse a dynamic where they appear too available, or generate pursuit from a distant target',
    passage: `Mechanism. Masking conceals the manipulator's true intentions behind a performance of disinterest or opposition. The target is led to believe they are pursuing their own desire when, in fact, they are responding to cues the manipulator has planted. Reverse psychology exploits reactance — the human tendency to resist perceived restrictions on freedom. When a target is told not to do something, they are more likely to want to do it.

Example. A salesperson tells a prospective buyer that a particular model is probably "too much car" for their needs. The buyer, perceiving a challenge to their capability or status, becomes more interested in that model. The salesperson has not pushed — they have created resistance in the customer's own mind, which the customer experiences as their own desire. The same pattern appears in courtship: a person who appears indifferent or unavailable is perceived as higher value than one who is eager and accessible.

Behavioral signature. The target feels they are making independent choices, but those choices consistently align with the manipulator's interests. The target may describe the manipulator as "hard to read" or "mysterious." Friends may observe that the target is chasing someone who appears to pull away — this asymmetry is the intended effect, not a problem to be solved.

Counter-pattern. When someone's behavior oscillates between interest and withdrawal, recognize this as a structural pattern rather than a romantic signal. Ask directly: "What do you want from this relationship?" A legitimate answer involves clarity. Evasion or continued mystery is itself the answer. Do not mistake confusion for chemistry. The chase may be thrilling, but a pattern of sustained unpredictability is not courtship — it is manipulation by masking.`,
  },
  {
    chapter: 'Method 4: Leading Questions',
    retrieve_when: 'user describes feeling confused or misled by question phrasing, or wants to understand how language shapes perception',
    passage: `Mechanism. The structure of a question constrains the range of acceptable answers. Leading questions embed assumptions that the respondent must accept or explicitly challenge — and explicit challenge requires cognitive effort that most people will not expend in conversational contexts. The manipulator does not need to assert a falsehood; they only need to ask a question that presupposes it.

Example. Loftus and Palmer's 1974 car crash study (Reconstruction of Automobile Destruction) demonstrated the mechanism experimentally. Participants watched films of traffic accidents and were asked how fast the cars were going when they "smashed," "collided," "bumped," "hit," or "contacted" each other. The verb "smashed" produced a mean speed estimate of 40.8 mph; "contacted" produced 31.8 mph. In a follow-up, participants who heard "smashed" were significantly more likely to report seeing broken glass — which had not been present. The leading question did not merely bias reporting; it altered memory.

Behavioral signature. The target finds themselves answering questions that feel slightly off but cannot articulate why. Questions contain presuppositions the target did not agree to. For example: "Why do you keep sabotaging this relationship?" presupposes that the target is sabotaging it. A direct denial ("I am not sabotaging this") still operates within the frame the questioner established. The target is forced to defend against an accusation that was never explicitly made.

Counter-pattern. When a question feels loaded or presuppositional, decline to answer within its frame. Respond by identifying the presupposition: "I reject the premise that I am sabotaging anything. Please ask your question without that assumption." This forces the questioner to expose their strategy. In legal or high-stakes contexts, answer only the specific words used, not the implications behind them. Do not attempt to disprove an unstated accusation — that is the trap.`,
  },
  {
    chapter: 'Method 5: State Transference',
    retrieve_when: 'user describes sudden mood shifts in a partner, mirroring emotional states, or feeling drained after interactions',
    passage: `Mechanism. Emotional states are contagious. The manipulator deliberately induces a specific emotional state in the target — anxiety, excitement, confusion, or relief — and then positions themselves as the solution to that state. The law of state transference holds that whoever controls the emotional climate controls the decisions made within it. The manipulator creates the storm and then offers shelter.

Example. A manager calls an employee into a closed-door meeting and delivers distressing news about company performance or potential layoffs. The employee's anxiety spikes. The manager then pivots to a proposal: "But I've been advocating for you, and I think I can protect your position if you take on this additional project." The employee, in a state of relief, agrees to the project without evaluating whether it is reasonable or compensated. The manager did not need to convince — they only needed to shift the emotional state and let the target fill the void.

Behavioral signature. Interactions with the manipulator follow a predictable arc: tension rises, then the manipulator releases it. The target feels grateful to the manipulator for resolving a problem the manipulator may have created. Targets describe the manipulator as "intense" but also "the only one who understands." There is a pattern of crisis followed by bonding, which the target interprets as intimacy.

Counter-pattern. When an interaction generates strong emotion, especially a sudden shift from negative to positive, do not make decisions in the aftermath. Institute a cooling-off period: "Let me think about that and get back to you." A legitimate request will survive a 24-hour delay. A manipulative request will be framed as time-sensitive. Separate the emotional experience from the decision. Ask: "Did I feel this way before the conversation, or did the conversation create this feeling?"`,
  },
  {
    chapter: 'Method 6: Fear, Then Relief',
    retrieve_when: 'user describes hot-cold dynamics, walking on eggshells, or relief after tension that feels like love',
    passage: `Mechanism. The manipulator creates a threat — real or manufactured — and then removes it, positioning themselves as the agent of relief. The transition from fear to safety produces a neurochemical reward (dopamine, oxytocin) that the target misattributes to the manipulator. Over repeated cycles, the target becomes conditioned to associate the manipulator with safety, even though the manipulator was the source of the fear.

Example. A partner picks a fight over a minor issue — a dish left in the sink, a late response to a text. The fight escalates to the point where the target fears abandonment or punishment. The partner then "forgives" the target, becomes affectionate, and the evening ends with warmth. The target experiences profound relief and interprets the reconciliation as evidence of love. In reality, the target has been trained: the partner controls when the threat appears and when it is withdrawn. The target learns to avoid triggering the threat, shrinking their behavior to fit the partner's requirements.

Behavioral signature. The relationship follows a predictable cycle: tension builds, an explosion occurs, the manipulator withdraws or threatens consequences, then the manipulator returns with warmth and reassurance. The target describes the relationship as "intense" but worthwhile. Friends observe that the target seems anxious before interactions with the partner and relieved afterward. The target may say "when it's good, it's amazing" — not recognizing that the goodness is relief from the bad, not independent affection.

Counter-pattern. Track the sequence, not the content. When a conflict is followed by disproportionate relief or affection, recognize the pattern as structural rather than romantic. Do not accept reconciliation without resolution. A legitimate apology addresses the behavior and changes it; manipulative reconciliation bypasses the issue and returns to warmth. Ask: "What will be different next time?" A non-answer means the cycle will repeat.`,
  },
  {
    chapter: 'Method 7: Mirror Technique',
    retrieve_when: 'user describes feeling an instant connection, uncanny similarity, or a partner who seems to mirror their interests perfectly',
    passage: `Mechanism. Humans are drawn to others who resemble themselves. The mirror technique exploits this by consciously replicating the target's body language, speech patterns, values, and expressed preferences. The target experiences unconscious familiarity, which they interpret as rapport or compatibility. The manipulator does not need to actually share the target's traits — they only need to perform them convincingly during the rapport-building phase.

Example. A salesperson notices a customer's posture, speaking pace, and vocabulary. Over the course of a conversation, the salesperson subtly adjusts their own posture to match, adopts a similar speaking rhythm, and uses keywords the customer has used. The customer feels "understood" without knowing why. In dating contexts, a manipulator may adopt the target's hobbies, political views, and aesthetic preferences for the duration of courtship. Once commitment is secured, these mirrored traits disappear, and the target discovers they were never genuine.

Behavioral signature. The connection forms unusually fast — the target feels they have known the manipulator for longer than the actual time elapsed. Shared interests are uncannily precise. The target may say "I've never met anyone who gets me like this." However, the target knows very little about the manipulator's independent preferences or history; the entire conversation has been about the target.

Counter-pattern. Test for mirroring by expressing an unusual or minority opinion and watching whether it is reflected back. Express a preference and change it — a mirror will follow. Ask about the other person's independent interests, friends, and history before revealing your own. A low-mirroring individual will have stable, self-consistent preferences. A high-mirroring individual's expressed traits will shift depending on who they are with. Rapport built on mirroring is not connection — it is data collection.`,
  },
  {
    chapter: 'Method 8: The Guilt Approach',
    retrieve_when: 'user describes being made to feel responsible for their partner\'s emotions, or doing things out of obligation and shame',
    passage: `Mechanism. Guilt is a powerful regulatory emotion. The manipulator induces guilt in the target by framing the target's legitimate needs or boundaries as selfish, ungrateful, or harmful. The target then attempts to atone by complying with the manipulator's demands. The guilt approach converts the target's empathy into a weapon against their own interests.

Example. A partner asks for space to spend time with friends. The manipulator responds: "I guess I'm just not enough for you. I've been trying so hard to make you happy, but nothing I do matters." The target, experiencing guilt, cancels their plans to reassure the partner. The manipulator has not demanded anything — they have generated guilt, and the target has volunteered compliance. The guilt approach is effective because the target appears to choose their submission, making external intervention difficult.

Behavioral signature. The target frequently apologizes for normal behavior. Requests for autonomy are met with disproportionate emotional responses. The manipulator frames their own sacrifices as evidence of the target's indebtedness. The target may say "I feel like I can't do anything right" — which is the intended effect, not an unfortunate side effect. The manipulator never explicitly demands sacrifice; they create the conditions where sacrifice feels like the only way to restore emotional equilibrium.

Counter-pattern. Distinguish between genuine guilt (you did something wrong) and induced guilt (someone is treating your boundaries as an injury). When a partner responds to a boundary by invoking their own suffering, do not rush to comfort them. State the boundary again without apology. A healthy partner will negotiate boundaries; a guilt-using partner will escalate the emotional display. Recognize that you are not responsible for managing another adult's emotional state when you are acting within your rights.`,
  },
  {
    chapter: 'Method 9: Playing Victim',
    retrieve_when: 'user describes a partner who always has worse problems, deflects accountability by citing their own suffering, or weaponizes victimhood',
    passage: `Mechanism. The manipulator positions themselves as the injured party in every conflict, regardless of their actual responsibility. By occupying the victim role, they preempt criticism, generate sympathy, and place the target in the position of aggressor or rescuer. The target, seeking to escape the uncomfortable role of "perpetrator," capitulates or apologizes. The victim stance is not an expression of suffering — it is a positional strategy.

Example. In a workplace dispute, an employee who missed a deadline blames the colleague who asked for clarification: "I was working on it until you interrupted me with your questions. Now I'm the one who looks incompetent, and you're trying to make yourself look good at my expense." The colleague, now in the position of having to defend their legitimate need for information, drops the request to restore harmony. The victim-playing employee has successfully framed a failure of their own performance as an attack by a colleague.

Behavioral signature. The manipulator's stories consistently feature them as the person wronged — by ex-partners, bosses, family members, or systemic injustice. When confronted, they pivot to past trauma or current hardship as a shield against accountability. The target may find themselves comforting the person who harmed them. The emotional labor flows in one direction: toward the manipulator.

Counter-pattern. Assess conflicts using a strict behavioral ledger: what did each person do, not what did each person feel. When a conversation shifts from a specific issue to the manipulator's suffering, redirect: "I understand you're upset, and we can discuss that after we resolve the issue at hand." Do not accept victim status as a reason to drop a legitimate concern. A person who is genuinely harmed will be able to articulate harm without using it to evade accountability. The victim stance is a negotiation tactic, not a diagnosis.`,
  },
  {
    chapter: 'Method 10: "But I Love You"',
    retrieve_when: 'user describes threats of self-harm when leaving, declarations of undying love alternating with cruelty, or feeling trapped by stated love',
    passage: `Mechanism. The manipulator weaponizes the concept of love to prevent departure. When the target attempts to leave or set boundaries, the manipulator responds with declarations of devotion so intense that the target doubts their own perception of abuse. The phrase "but I love you" functions as a gaslighting anchor — it suggests that someone who loves another cannot also harm them, so the harm must not be real, or must be the target's fault.

Example. A partner has been consistently critical, withholding, and unfaithful. When the target finally decides to leave, the partner responds with tears, promises of change, and professions of love: "You're the only person who has ever understood me. I can't live without you. I know I've made mistakes, but my love for you is real." The target, who still has emotional investment, interprets this intensity as evidence that the partner truly cares. The cycle continues because the declaration of love is treated as a mitigating factor for harm.

Behavioral signature. The manipulator's love is stated loudly and frequently, but it is not demonstrated through consistent behavior. Promises of change are made in crisis and forgotten once the crisis passes. The target feels confused: the words say love, but the actions say something else. The target may say "I know he loves me, but..." — the "but" is carrying the accurate data. The declaration of love is used to close arguments, not to build understanding.

Counter-pattern. Define love behaviorally, not emotionally. Love is not a feeling that excuses harm — it is a pattern of conduct that supports the other person's wellbeing. If the conduct is absent, the word is irrelevant. When "I love you" is used to end a conversation about harm, name the pattern: "If you love me, you will hear this criticism without defending against it. You can tell me you love me after we resolve the issue." Do not accept declarations of love as substitutes for changed behavior.`,
  },

  // ── Chapter 4: Vignettes ──────────────────────────────────────────────────
  {
    chapter: 'Vignette: Ninon de Lenclos & the Marquis de Sevigne',
    retrieve_when: 'user is over-pursuing OR asking how to generate interest early-stage OR describing a target who went cold after a declaration',
    passage: `In 17th-century France, Ninon de Lenclos operated as a courtesan, philosopher, and patron of the arts. Her memoirs, published posthumously in 1761, document a career spanning six decades in which she advised many younger men on the dynamics of seduction. One such case involved the Marquis de Sevigne, who was unable to gain the attention of a countess.

The coaching. Ninon instructed the Marquis to adopt three strategic behaviors. First, feign distance: approach the countess with an air of nonchalance that suggested friendship rather than pursuit. The countess must not conclude that the Marquis was chasing her, because certainty kills tension. Second, manufacture jealousy: attend social events in the company of other desirable women. This demonstrated social proof — the countess would perceive the Marquis as high-value precisely because others wanted his attention. Third, disrupt expectations: withdraw from events where the countess anticipated seeing him, and appear instead at places where he was not expected. Predictability reduces mystery, and mystery is the engine of attraction.

The mechanism. The underlying principle is that the chase itself generates desire. When a target cannot predict the pursuer's next move, they remain cognitively engaged. They wonder, question, and imagine. This internal preoccupation creates attachment more reliably than any declaration of affection. The seduced party is not a passive recipient of attention but an active participant in solving the puzzle of the other person's intentions.

The collapse. The Marquis followed Ninon's instructions with initial success. The countess began asking about him, attending events where he might appear, and showing visible interest. Then the Marquis broke protocol. In a private moment, he took the countess's hand and declared his undying love. The countess withdrew immediately. She avoided him, excused herself from his presence, and the dynamic collapsed. The declaration had ended the chase, and with it, the engine of her interest.

Encoded principle. The pursuit must be sustained as long as the target remains uncertain. Sincerity declared prematurely breaks the seductive frame. The chase is not a preliminary phase to be endured before the real relationship begins — the chase is the relationship, until both parties have entered a new equilibrium. Once one party declares, the other is no longer pursuing and the tension dissipates. This pattern applies broadly across early-stage courtship dynamics, regardless of gender or orientation.`,
  },
  {
    chapter: 'Vignette: Selassie Disarms Balcha',
    retrieve_when: 'user is in power-asymmetry situation, dealing with a suspicious or guarded counterparty, or appears weaker than their adversary',
    passage: `In 1920s Ethiopia, Ras Tafari Makonnen (later Emperor Haile Selassie) was consolidating power against regional warlords who resisted central authority. One of the most formidable was Dejazmach Balcha, a governor who commanded substantial military forces and refused to recognize Tafari's authority.

The setup. Tafari extended an invitation to Balcha for a formal banquet. Balcha, suspicious by nature, arrived with 600 armed soldiers who accompanied him inside the venue. An additional 10,000 troops were stationed outside the city with orders to attack if Balcha did not return by nightfall. Balcha believed he had secured his position through overwhelming force and the threat of retaliation.

The performance. During the banquet, Tafari treated Balcha with deference and respect. He performed the role of the subordinate host, demonstrating no competitive or threatening posture. Balcha, perceiving that he controlled the situation, allowed himself to relax and enjoy the hospitality. His attention was on the feast and the social performance, not on his army.

The maneuver. While Balcha was inside, Tafari's agents moved through Balcha's encampment. They approached individual soldiers and purchased their weapons — one rifle, one soldier at a time. The soldiers, seeing no immediate threat and receiving cash for equipment they believed they could replace, sold their arms. By the time the banquet ended, Balcha's army had been systematically disarmed without a single shot fired.

The outcome. Balcha returned to his camp to find his troops without weapons. With no capacity to fight, he surrendered to Tafari. Rather than face execution or imprisonment, Balcha entered a monastery and ended his days as a monk. The rebellion was neutralized without battle.

Encoded principle. Wary and paranoid targets are most vulnerable to deception precisely because they focus their defenses on obvious threat vectors. Once they believe they have secured those — as Balcha did with his visible army — they relax. The mask of submission or deference functions as the actual smoke screen. The maneuver that matters happens below the adversary's line of sight, in the space they assumed was safe. In power-asymmetry situations, the weaker party can win by making the stronger party feel they have already won.`,
  },

  // ── Chapter 7: Mechanisms ─────────────────────────────────────────────────
  {
    chapter: 'Mechanism: Intermittent Reinforcement and Trauma Bonding',
    retrieve_when: 'user describes "when it\'s good it\'s amazing" / "he\'s not always like that" / "I need him to be the man he was at the start" / alternating warmth and cruelty / addicted to a relationship they know is bad',
    passage: `The mechanism operates like a slot machine. An unpredictable reward schedule is more addictive than a predictable one because the uncertainty itself drives dopamine release. In relationship contexts, this means the target does not bond to consistent affection but to the intermittent return of affection after withdrawal.

The cycle. Phase one — idealization. The manipulator showers the target with attention, praise, gifts, and declarations of devotion. This phase is sometimes called love bombing and creates a baseline of intensity that the target comes to expect as "normal." Phase two — devaluation. The manipulator withdraws warmth, becomes critical, dismissive, or cold. The target is left confused, trying to understand what went wrong. Phase three — intermittent return. The manipulator offers a small act of kindness: a compliment, a gift, a callback to the idealization phase ("I remember when we first met..."). The target experiences disproportionate relief and interprets this scrap as evidence that the "real" partner is still there.

Why unpredictability binds. Predictable affection does not produce trauma bonds. If a partner is consistently warm, the target can relax. If a partner is consistently cruel, the target will leave. But when cruelty is unpredictably interspersed with warmth, the target becomes hypervigilant for signs of the return to affection. Each positive moment is magnified because it is rare. The target works harder, gives more, shrinks their own needs — all in the hope of triggering the return of the idealized partner. This is not love; it is conditioned behavior.

Risk multiplier: developmental history. Individuals raised by narcissistic or otherwise unpredictable caregivers are at elevated risk. They have been trained from childhood to associate love with inconsistency. A parent who alternated between adulation and criticism created a neural template in which affection that must be earned through appeasement feels natural. When a manipulator reproduces this pattern in adulthood, the target does not recognize it as abuse — they recognize it as home. The dopamine pattern is familiar, and familiarity overrides conscious evaluation.

Encoded principle. The good days are not the relationship — the good days are the reinforcement schedule. The manipulator's warmth is not a sign of underlying love breaking through. It is a scheduled reward designed to maintain the target's investment. A relationship that cycles between idealization and devaluation is not "intense but worth it." It is a conditioning apparatus.`,
  },
  {
    chapter: 'Framework: Lifton\'s Thought-Reform Sequence (defense-only)',
    retrieve_when: 'user describes signs of being subjected to one OR worried about someone matching the pattern',
    passage: `The brainwashing framework described in this chapter is not original to Mace. It derives from Robert Jay Lifton's Thought Reform and the Psychology of Totalism (1961), which documented the eight-stage process used by Chinese Communist thought-reform programs on Korean War prisoners. These stages are presented here as an integrated framework.

Stage 1 — Total environmental control. The target's surroundings are brought under complete authority. Communication with the outside world is severed. The target's schedule, diet, sensory input, and social contact are determined entirely by the captor. This eliminates competing information and creates dependency.

Stage 2 — Repeated forced confession. The target is compelled to confess to offenses — often fabricated or exaggerated — repetitively. The content of the confession matters less than the act of submission. Each confession weakens the target's sense of integrity and normalizes compliance.

Stage 3 — Identity destabilization. Sleep deprivation, food restriction, extended standing, and isolation degrade the target's cognitive and emotional resources. Under prolonged stress, the target loses access to their pre-existing identity anchors. They cannot remember clearly who they were before the process began.

Stage 4 — Guilt loading on prior beliefs and relationships. The target is told that their former life, values, and attachments were corrupt, selfish, or harmful. Guilt is induced for past actions, relationships, and loyalties. This makes the old identity not just inaccessible but morally repugnant.

Stage 5 — Small kindness from captor as salvation cue. After extended deprivation, a minor act of leniency — food, rest, a kind word — is experienced as profound relief. The target attributes this relief to the captor's benevolence rather than to the captor's temporary cessation of cruelty. Gratitude and attachment begin to form.

Stage 6 — Illusion of choice. The target is presented with a binary: remain in the old identity (suffering, guilt, isolation) or adopt the new identity (peace, belonging, purpose). The choice is coerced but appears voluntary. Targets often report "choosing" to convert.

Stage 7 — Verbal denouncement of prior identity. The target publicly repudiates their former beliefs, values, and relationships. This act serves as a point of no return, both psychologically and socially.

Stage 8 — Ritual integration. The target is absorbed into the new group through ceremonies, shared language, and collective identity markers. The new identity is reinforced through repetition and social proof.

Susceptibility correlates. Individuals with weak self-concept, a history of abuse, or chronically low self-esteem are more vulnerable. Protective factors include a strong pre-existing identity, healthy self-confidence developed through genuine achievement, and an external faith anchor that is independent of the group attempting thought reform.`,
  },
];

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
      console.error('[seed-rag-mace] embed failed:', await res.text());
      return null;
    }
    const data = await res.json();
    return data?.embedding?.values ?? null;
  } catch (e) {
    console.error('[seed-rag-mace] embed exception:', e);
    return null;
  }
}

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
    // Embed chapter title + retrieve_when hint + passage body for stronger recall.
    // Store only the clean passage in the DB (operator context stays clean).
    const embedInput = `${entry.chapter}\n\nRetrieve when: ${entry.retrieve_when}\n\n${entry.passage}`;
    const embedding = await embed(embedInput, GEMINI_API_KEY);
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
      console.error('[seed-rag-mace] insert error:', error.message);
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
