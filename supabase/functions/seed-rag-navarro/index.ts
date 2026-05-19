/**
 * seed-rag-navarro — Ingests a paraphrased layer of Joe Navarro's
 * "What Every Body Is Saying" into book_passages.
 *
 * Source: navarro_chunks/*.md (12 pre-chunked paraphrase passages —
 * 3 foundational + 7 region modules + 2 interaction patterns).
 * All bodies passed a 5-word verbatim check vs the source PDF
 * (0 matches across 8,084 total paraphrase words).
 *
 * High-signal for DARKO: replaces the raw What-Every-Body-Is-Saying PDF
 * (purged 2026-05-15 for OCR/chapter-null noise). Restores body-language
 * coverage as clean prose with semantic chapter labels and
 * `retrieve_when` hints tuned for romantic / interpersonal observation.
 *
 * Coexists with seed-rag, seed-rag-aos, seed-rag-psycyber, seed-rag-mace
 * under a distinct book_name. Idempotent; skips if any row with this
 * book_name already exists.
 *
 * Embedding boost: per-chunk `retrieve_when` hint is concatenated into
 * the embedding input (improves recall) but NOT stored in the passage
 * (keeps operator-facing context clean at inference time).
 *
 * Invoke once:
 *   curl -X POST 'https://adyebdcyqczhkluqgwvv.supabase.co/functions/v1/seed-rag-navarro'
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BOOK_NAME = 'Navarro — What Every Body Is Saying (paraphrased)';

const PASSAGES: Array<{ chapter: string; retrieve_when: string; passage: string }> = [
  {
    chapter: `Foundations: Limbic System & Freeze-Flight-Fight`,
    retrieve_when: `user asks why body language is reliable, why someone said one thing but did another, or how to read someone who is verbally guarded`,
    passage: `Nonverbal behavior is reliable because it originates in the limbic system, the neural region responsible for emotional processing and survival responses. Unlike the neocortex — the thinking brain that crafts speech and manages deliberate self-presentation — the limbic system reacts automatically, instantly, and with no conscious filtering. This is why the body can communicate genuine emotional states even when words are carefully controlled.

The limbic brain evolved to detect and respond to threat long before the neocortex developed the capacity for language or strategic deception. Its responses are hardwired, instantaneous, and difficult to suppress. When a person verbally affirms comfort while simultaneously displaying limbic discomfort signals — torso turning away, hands withdrawing, breathing shallowing — the limbic signals are the more trustworthy channel. Words are products of the neocortex, which can construct falsehoods; the limbic body leaks truth.

Three primary limbic response patterns govern nonverbal behavior in the face of perceived threat: freeze, flight, and fight. These occur in that order.

Freeze is the first and most ancient response. Movement attracts attention in the animal world, and predators orient toward motion. When the limbic system detects a potential threat — including an emotionally charged topic, a direct question about intentions, or confrontation — the body may suddenly become still. In romantic contexts, freeze manifests as a person going motionless mid-gesture when a sensitive topic surfaces. Hands that had been animated stop mid-air. Feet that had been bouncing go still. Breathing becomes shallow or is held briefly. This stillness is not relaxation; it is the limbic system attempting to avoid detection.

Flight is the second response, engaged when freezing is insufficient. The limbic system prepares the body to distance itself from the threat. In modern settings where physical escape is rarely practical, flight manifests as subtle distancing behaviors. The feet rotate toward an exit. The torso leans or blades away. The person places objects — a drink, a phone, a bag — between themselves and the conversational topic. The eyes search for escape routes or fix on a distant point. In romantic contexts, flight signals often appear when the conversation turns toward commitment, exclusivity, or other topics the person is not ready to engage.

Fight is the final response, activated when freeze and flight have failed. The ancient impulse to physically confront a threat is rarely acted upon in social or romantic settings, but its limbic precursors appear nonetheless. Jaw tension, visible muscle tightening in the masseter, lowering of the brow, and finger pointing or jabbing gestures are all fight-response fragments. Postural inflation — expanding the chest, squaring the shoulders, taking up more space — signals the limbic system preparing for confrontation. In romantic contexts, fight fragments typically indicate not aggression toward the partner but defensive arousal triggered by a perceived attack on the person's position or self-concept.

The limbic system does not only signal distress. It also generates the signals of safety and attraction. When the limbic brain registers that a person is safe and that the environment holds no threat, it permits behaviors that would be too vulnerable under stress: ventral fronting (exposing the torso toward the other person), head tilting (exposing the neck), pupil dilation, relaxed muscle tone, and spontaneous mirroring. These signals cannot be reliably faked because the limbic system must clear them. A person who feels threatened or uncomfortable will not produce safety signals no matter how much the neocortex wants to appear at ease.

Understanding this limbic framework resolves a common puzzle in romantic observation: why a person can say one thing while the body clearly says another. The neocortex can generate a socially appropriate verbal response. The limbic system, which does not negotiate, responds with the truth. The skilled observer learns to trust the limbic channel.`,
  },
  {
    chapter: `Foundations: Baseline & Deviation`,
    retrieve_when: `user describes a single observation in isolation, asks 'what does it mean when she...', or is trying to read a target they don't know well`,
    passage: `A single nonverbal signal observed in isolation carries almost no diagnostic weight. The first principle of reading body language in any context — romantic, social, or otherwise — is that deviation cannot be recognized without first knowing the norm. This is the baseline principle.

In the first two to ten minutes of an interaction, the observer should resist the temptation to interpret any specific gesture or posture. Instead, the goal is to establish how the person appears when they are neutral, unguarded, and not yet reacting to emotionally charged content. This neutral state becomes the reference point against which all subsequent signals are measured.

Several observable dimensions should be baselined before any reading begins. Speech tempo provides a rhythm baseline — some people speak quickly when animated, others are naturally slow and deliberate. A sudden shift in pace during a specific topic is meaningful only if the natural tempo is known. Blink rate follows a similar logic: normal resting blink rate ranges from twelve to twenty blinks per minute under relaxed conditions. Acceleration signals arousal, but only if the resting rate has been established.

Postural set refers to how a person typically holds their body when comfortable. The position of the shoulders — relaxed versus elevated — the tilt of the head, the orientation of the torso, and the placement of the arms all form a signature posture. Changes from this set, particularly those that occur abruptly following a specific remark or question, are the events worth tracking.

Touch frequency in early romantic contexts is an especially useful baseline dimension. Some individuals are naturally tactile; others avoid physical contact even when interested. The baseline touch rate during neutral conversation (introduction, small talk about safe topics) reveals the person's default comfort with proximity. Any increase or decrease in touch frequency when the conversation turns intimate is diagnostic only against this starting point.

Gaze patterns during the baseline period reveal typical visual behavior. The ratio of eye contact to gaze aversion, the direction of gaze breaks (upward, sideways, downward), and the duration of sustained looks all vary significantly across individuals. A person who naturally looks away while thinking is not showing disinterest — that is their processing style. The same behavior appearing mid-conversation after a specific question, when the person had been maintaining steady eye contact, carries meaning.

Voice pitch is the least obvious but most revealing baseline marker. Under relaxation, vocal pitch remains relatively stable. Under stress, the vocal cords tighten and pitch rises. The baseline pitch, established during low-stakes conversation, makes pitch shifts detectable when emotionally charged topics surface.

Why baseline matters more than any single tell cannot be overstated. A person may cross their arms because the room is cold, scratch their nose because it itches, or shift in their seat because the chair is uncomfortable. These are not signals of deception, discomfort with the partner, or disinterest. Without baseline knowledge, every natural movement becomes a false positive. With baseline knowledge, the observer can focus attention exclusively on behaviors that represent genuine departures from the person's neutral state — and those departures are where the reliable information resides.`,
  },
  {
    chapter: `Foundations: Cluster Principle`,
    retrieve_when: `user reports a single observation as evidence of something OR asks about the meaning of one specific gesture in isolation`,
    passage: `A single nonverbal cue observed in isolation is not a reliable indicator of anything. Individual gestures, postures, or facial movements can have multiple causes, and reading diagnostic meaning from one signal alone is the most common error in behavioral observation. The cluster principle holds that a tell carries weight only when it appears in combination with at least two or three other same-direction signals across different body regions within a short time window.

Why isolated signals lie is a matter of basic physiology and circumstance. A person may cross their arms because the room temperature is low, not because they are closed off. They may touch their face because of a minor skin irritation, not because they are nervous. They may shift in their seat because the chair is uncomfortable, not because a topic makes them uneasy. Idiosyncratic habits add further noise: some people gesture constantly as part of their conversational style; others sit motionless even when fully engaged. Environmental factors — ambient noise, lighting, seating arrangement, physical fatigue — all produce nonverbal behaviors that mimic the signals of emotional states.

The cluster principle requires the observer to look for convergence. When multiple body regions produce signals pointing in the same direction simultaneously or within a few seconds of each other, the reliability of the interpretation increases sharply. A single foot pointing toward an exit could mean someone has somewhere else to be. When that same foot shift is accompanied by the torso rotating away, the shoulders elevating toward the ears, a lip compression, a shallowing of breath, and a gaze break toward the same exit, the combined picture is diagnostically meaningful.

A worked example of a discomfort cluster in a romantic context: during a conversation about future plans, a person's feet, which had been pointing toward their partner, rotate to point toward the nearest door. Simultaneously, the torso shifts from a squared, open position to a bladed angle of roughly fifteen degrees. The full lips that were visible during small talk compress into a thin line. Breathing, previously at a normal rhythm, becomes visibly shallower. The hands, which had been relaxed on the table, withdraw into the lap or interlock tightly. Any one of these signals alone could be dismissed. The convergence of all five within ten seconds of a specific topic shift creates a reliable pattern.

Positive clusters work the same way. When a person is genuinely engaged and comfortable, the signals converge across regions. The feet point toward the conversation partner. The torso opens — chest exposed, shoulders back and down, no twist away from the other person. The hands remain visible, palms occasionally opening. The face shows relaxed muscle tone around the eyes and mouth. The head tilts slightly, exposing the neck. Vocal pitch stays at baseline or drops. Again, any one of these alone could mean nothing. Their simultaneous presence across multiple body regions confirms a state of comfort.

The practical rule for the observer is straightforward. When a single behavior catches attention, catalog it as a data point but do not assign meaning. Wait. Watch for confirmatory or disconfirmatory signals from other body parts. If confirmatory signals appear within a few seconds, the combined evidence can be interpreted. If they do not, the initial observation should be treated as noise.`,
  },
  {
    chapter: `Region: Feet & Legs (most honest)`,
    retrieve_when: `user describes anything about the target's feet, legs, knees, posture below the waist, foot direction, fidgeting, stillness in the lower body`,
    passage: `The lower limbs — feet plus legs — form the most truthful region of the body during social interaction. They are farthest from the neocortex, which means conscious control over them is weakest. While the face is trained from childhood to display socially appropriate expressions, the lower limbs receive minimal conscious attention and therefore leak genuine emotional states with high reliability.

The primary signal from the feet is direction. Feet point toward what the person finds interesting and away from what they wish to escape. During a romantic conversation, foot direction toward the partner signals engagement. When the feet rotate toward an exit or point away from the other person, the limbic system is registering a desire to leave, even if the upper body remains politely oriented toward the conversation partner. This foot-away posture can be an early indicator of waning interest, discomfort with a specific topic, or a lack of genuine investment in the interaction.

Happy feet are characterized by bouncing, wiggling, or rocking motions when something pleasing occurs. A person whose feet begin to bounce or sway after hearing a compliment, receiving good news, or anticipating something enjoyable is displaying positive limbic arousal. The motion is often visible through subtle vibration of the shoulders or shirt fabric even when the feet are under a table. Happy feet signal confidence and satisfaction with how things are presently unfolding.

Foot freeze is the opposite signal and carries significant diagnostic weight. When feet that had been moving — bouncing, shuffling, shifting position — suddenly become completely still, the limbic freeze response has activated. In romantic contexts, foot freeze typically occurs the moment a sensitive or threatening topic enters the conversation. The person may continue smiling and speaking normally, but the lower body has already signaled a threat response.

Feet retracting under the chair is a ventral denial signal from the lower body. When a person pulls their feet back so that they are no longer visible forward of the chair, the limbic system is attempting to minimize exposure and create distance. This signal often appears when a person feels cornered by a question or uncomfortable with the direction of the interaction.

Knee splay versus knee lock provides information about emotional state. Splayed knees — legs apart, taking up space — signal comfort, confidence, or territorial assertion. In dating contexts, a person who maintains an open leg posture is generally comfortable. When the knees are locked together tightly or the legs are crossed in a rigid manner, particularly in males, the posture signals tension or defensive withdrawal.

Leg crossing direction is informative when two people are seated side by side. The top leg tends to cross toward the person the individual feels more positive about. A leg crossed away from the conversation partner creates a subtle barrier using the thigh. When a person shifts their leg cross from toward the partner to away, it can mark the exact moment a topic caused discomfort or disengagement.

Foot-to-foot contact during romantic interaction is a high-comfort signal. When seated across from each other, couples who feel connected will allow their feet to touch or brush against each other without withdrawal. The absence of retraction when accidental foot contact occurs confirms comfort. Withdrawal after contact signals that the physical proximity is unwelcome.

The leg cleanser — a hand wiping down the thigh — is a self-soothing maneuver typically overlooked because it occurs under a table. The motion involves placing the palm on the thigh and sliding it toward the knee in a wiping or stroking motion. This pacifies through tactile stimulation and also dries sweaty palms. In romantic contexts, the leg cleanser appears when a person is asked about something that makes them uncomfortable, such as past relationships, financial status, or intentions.

Gravity-defying foot behaviors — toes lifting, rocking onto the forefoot, a bounce in the step — signal positive emotion. When a person's foot shifts so that only the ball of the foot contacts the ground with the heel raised, the limbic system is preparing for action driven by enthusiasm rather than fear. This starter's position can indicate readiness to move closer, to act, or to engage more deeply, depending on other cluster signals.`,
  },
  {
    chapter: `Region: Torso & Ventral Orientation`,
    retrieve_when: `user describes the target's torso, chest direction, shoulder position, lean, body angle, or how they were oriented during a conversation`,
    passage: `The torso is the most honest indicator of engagement because the limbic system prioritizes its protection. The ventral side — the front of the body containing the eyes, throat, chest, abdomen, and genitals — is the most vulnerable surface. The brain allows this surface to be exposed only toward people and topics that feel safe. When a person or subject feels threatening, the torso shifts to shield the ventral side.

Ventral fronting occurs when a person squares their torso directly toward another person. The chest faces forward, the shoulders are open, and the navel points at the conversation partner. This is a high-comfort, high-interest signal. In romantic contexts, ventral fronting is the body's way of saying that the person is welcome into intimate space. Two people who are genuinely engaged with each other will unconsciously mirror each other's ventral orientation, creating a shared space between them.

Ventral denial is the counter-movement. When the torso rotates even slightly away — one shoulder turning toward the other person while the chest faces elsewhere — the limbic system is creating distance. Ventral denial can be subtle: a shift of just a few degrees. It often appears when a topic makes the person uncomfortable, when they disagree with what is being said, or when their interest is fading. Verbal warmth paired with ventral denial is a mismatch that should be resolved in favor of the torso signal.

The torso lean is a continuous signal that updates in real time. Leaning forward — toward the other person — indicates interest, engagement, and positive reception. During courtship, forward leans are common during the early stages of connection. Leaning backward suggests evaluation, relaxation if the torso remains open, or withdrawal if accompanied by ventral denial. A sudden lean back after a specific statement marks that statement as the trigger.

The turtle effect involves the shoulders lifting upward as the head appears to retract into the torso. This is a limbic protection response that appears when a person feels criticized, humiliated, or caught off guard. In romantic contexts, the turtle effect can appear when past mistakes are brought up, when a compliment feels undeserved, or when the person is bracing for negative feedback. Shoulders dropping from an elevated position back to normal signals relief that the threat has passed.

Torso splays — spreading out across a seat or leaning back with arms extended — are territorial displays that signal either high comfort or an assertion of dominance, depending on context. In early dating, a person who takes up significant space may be comfortable and confident. However, if the torso splay appears during a disagreement, it signals a refusal to yield or be persuaded. The distinction lies in whether the splay is accompanied by relaxed facial cues (comfort) or tension (dominance assertion).

Breathing patterns visible in the torso provide additional information. Shallow, rapid breathing concentrated in the upper chest signals limbic arousal, often from anxiety or stress. Deep, slow breathing from the diaphragm indicates relaxation. A sudden breath-hold or sharp exhale can mark the moment a sensitive topic landed.

Puffing of the chest — expanding the rib cage and pushing the chest forward — is a preparatory posture linked to fight-mode arousal. It increases apparent size and signals readiness for confrontation. In romantic settings, chest puffing is rarely directed at the partner as aggression; it more commonly appears when a person feels their status or competence is being challenged. It can also appear during competitive social situations such as meeting a rival.

The torso bow — a slight forward bend at the waist — conveys deference, respect, or submission. In dating contexts, a person who subtly dips their torso when greeting or listening is signaling social attunement. When the bow is deep or prolonged beyond social convention, it may indicate insecurity or an excessive desire to please.

Clothing choices on the torso also carry information. What a person wears and how they wear it — buttoned or unbuttoned, jacket on or off, collar open or closed — reflects their comfort level and their intent to present a particular image. Removing a jacket or unbuttoning the top button of a shirt during an interaction can signal increasing comfort or a desire to signal relaxation.`,
  },
  {
    chapter: `Region: Arms`,
    retrieve_when: `user describes the target's arms, arm position, crossing, spreading, holding, or arm-based gestures`,
    passage: `Arms function as both territorial markers and emotional gates. Because the limbic system treats the arms as a first line of defense — they rise to block projectiles, wrap around the torso for protection, and extend outward to claim space — their positioning reveals comfort level, confidence, and intent with high reliability.

Arm crossing is the most recognized arm signal but the most frequently misinterpreted. Context determines meaning. When a person crosses their arms while leaning back and looking comfortable, the posture may reflect habit or cold rather than defensiveness. When arm crossing appears suddenly the moment a particular topic surfaces, accompanied by tension in the hands or shoulders, it signals a protective barrier. In romantic contexts, sudden arm crossing after a question about feelings, exclusivity, or the past marks that topic as threatening.

Arm akimbo — hands on hips with elbows flared outward — is a territorial claim. The posture increases the person's apparent size and signals readiness to assert dominance or address an issue. In dating contexts, arm akimbo appears when a person feels challenged or when they are establishing boundaries. The position of the thumbs differentiates intent: thumbs facing backward toward the spine signal a more confrontational stance, while thumbs forward suggest curiosity or evaluation rather than aggression.

Arms spread along the back of a couch or booth seat is a high-comfort territorial display. The person is claiming space and signaling that they are sufficiently at ease to take up room. In romantic settings, a person who drapes their arm behind their date rather than around them is claiming territory while allowing the other person space to move closer if they choose. An arm placed directly around the partner's shoulders is a more overt claim.

Arms pulled tight against the torso — elbows pressed to the ribs, arms hugging close to the body — signal withdrawal and low comfort. The limbic system is reducing the body's profile, making it smaller and less visible. This posture appears in romantic contexts when a person feels insecure, when they are being evaluated, or when they are holding back information they do not want to share.

Sudden arm withdrawal during conversation is a topic-level marker. When a person who had been gesturing openly or resting their arms on the table pulls them back — tucking hands into the lap or crossing them tightly — the change signals that something in the conversation triggered discomfort. The timing of the withdrawal pinpoints the trigger.

The self-administered body hug — arms crossed with hands gripping opposite shoulders — is a self-soothing posture mimicking being held. It appears when a person feels exposed, vulnerable, or in need of comfort that is not available from the other person. In romantic settings, this posture often appears during discussions of rejection, past hurt, or uncertainty about the relationship.

Arm positioning during walking provides additional information. Arms that swing freely with the gait signal openness and comfort. Arms held stiffly at the sides or clasped behind the back signal restraint. Arms clasped behind the back is sometimes called the regal stance; it conveys higher status and a don't-approach signal. When two people walking together keep their arms close to their bodies rather than allowing them to brush or touch, the physical distance they maintain mirrors emotional distance.

Arm touching between partners is a reliable intimacy barometer. The arms contain dense sensory receptors; brushing against arm hairs or touching the skin of the forearm produces sensory pleasure. Couples who are connected will allow and seek arm contact. A decrease in arm touching during conversation — especially when one partner pulls an arm away after it has been touching — signals a shift in comfort.

Territorial arm displays at tables reveal status and comfort. A person who spreads their belongings across the table, extends their elbows into shared space, or claims the armrest is asserting dominance or high comfort. A person who keeps their arms confined to their own lap or tucked between their knees is signaling lower status, insecurity, or submission.`,
  },
  {
    chapter: `Region: Hands & Fingers`,
    retrieve_when: `user describes the target's hands, fingers, grip, gestures, touching their own face/neck, fidgeting with objects, or hand position during a conversation`,
    passage: `Hands and fingers are high-resolution emotional indicators. The human brain dedicates disproportionate neural space to the hands, making them finely tuned instruments that reflect subtle shifts in confidence, stress, and intent. Because hand movements are harder to consciously control than facial expressions, they often reveal what the face conceals.

Steepling — bringing the fingertips of both hands together in a pyramidal shape without interlocking the fingers — ranks among the most reliable high-confidence signals. The steeple says the person is certain of their position. In romantic contexts, steepling appears when a person feels they have the upper hand in a negotiation about the relationship, or when they are evaluating their partner's proposal with self-assured detachment. The height of the steeple matters: a high steeple (at chest level) projects more confidence than a low steeple (at waist level). Women in mixed-gender settings often steeple lower or below the table, which can obscure the signal.

The sudden collapse of a steeple into interlocked fingers signals a drop in confidence. The transition from steepling to finger interlacing or hand-wringing happens in milliseconds and accurately tracks the person's emotional shift. When a person who was steepling begins interlacing their fingers and squeezing, something in the conversation destabilized their confidence.

Thumb displays carry disproportionate weight because thumbs are gravity-defying when the person feels positive and disappear when confidence drops. Visible thumbs — hooked in pockets with thumbs out, clasping a lapel with thumbs up, or resting on a table with thumbs pointing upward — correlate with positive self-regard and comfort. In romantic contexts, a person who displays their thumbs while talking about their feelings is likely comfortable with the topic. Thumb withdrawal — the thumb disappearing into a pocket or curling inward behind the fingers — marks the moment confidence in what is being said falters.

Neck touching is a high-frequency pacifying behavior with distinct gender patterns. Men typically touch the front of the throat or massage the sides of the neck. Women typically touch the suprasternal notch — the small dip at the base of the throat between the collarbones. Both behaviors increase when the person is under stress, feels uncertain, or is trying to suppress a reaction. In romantic settings, neck touching during a conversation about commitment, fidelity, or the future of the relationship warrants attention: the person is pacifying because the topic produces discomfort.

Hand-to-face touching — stroking the cheek, rubbing the jaw, massaging the temple, or covering the mouth — serves as both pacifying behavior and a barrier. The face is rich in nerve endings, and touching it provides sensory comfort. When hand-to-face contact occurs immediately after a question or statement, it marks that input as stressful. Mouth covering during speech, in particular, suggests the person is filtering what they say or is uncertain about speaking freely.

Fidgeting with rings, watches, bracelets, or other jewelry is a displacement behavior — a self-soothing activity that occupies the hands during mild limbic arousal. The specific trigger for the fidgeting can often be identified by watching when it starts and stops.

Open palms directed toward the other person signal openness and honesty. Palm concealment — tucking hands under the table, sitting on hands, or keeping palms hidden in pockets — triggers suspicion in observers, even when the person has nothing to hide. In romantic settings, visible palms during emotional disclosures increase perceived sincerity.

Hand temperature shifts provide autonomic information. The limbic system redirects blood flow to large muscles during stress, cooling the skin surface. Cold hands during a conversation that should feel warm indicate limbic arousal — the body is preparing for action despite calm words.

Trembling hands — whether from excitement or anxiety — must be interpreted by context. Excitement trembling is accompanied by positive facial cues and forward engagement. Anxiety trembling pairs with pacifying behaviors, compressed lips, or gaze aversion. A hand tremor that starts or stops at a specific conversational moment marks that moment as emotionally significant.`,
  },
  {
    chapter: `Region: Forehead, Jaw, Nose, Chin, Coloring`,
    retrieve_when: `user describes the target's forehead, brow, jaw, nose, chin, blushing, facial coloring, or facial tension not covered by eye/mouth signals`,
    passage: `The face provides a layered display of emotional information. Beyond the eyes and mouth, the forehead, jaw, nose, chin, and overall facial coloring each contribute signals that, read in cluster, reveal the person's underlying state.

Forehead tension manifests as vertical lines between the brows — the glabellar furrow — that appear when a person is focusing, stressed, or irritated. These lines are distinct from the horizontal forehead lines produced by raised eyebrows during surprise or fear. The differentiation matters: vertical tension lines indicate sustained effort or negative emotion, while horizontal lines indicate transient reaction. In romantic conversations, a partner whose glabellar lines appear and persist when discussing a particular topic is experiencing ongoing tension about that subject.

Horizontal forehead lines created by raised brows are a gravity-defying display. They appear during surprise, curiosity, or positive anticipation. The duration is typically brief — under a second for a flash of surprise, longer for sustained curiosity. The eyebrow flash described in the eye chunk is the most common form.

Jaw tension is among the most physically visible stress signals. When a person clenches their jaw, the masseter muscle on the side of the face becomes prominent. In people with lean facial structure, the muscle can visibly bunch and release with each clench. Jaw tension signals suppressed anger, frustration, or effortful restraint. In romantic contexts, a partner whose jaw tightens when hearing about an ex-partner, a financial decision, or a relationship boundary is experiencing an emotional reaction they are choosing not to verbalize. The tighter and more prolonged the clench, the stronger the suppressed response.

Nose flare — dilation of the nasal wings — occurs when the body oxygenates in preparation for physical action. This signals an impending intention. It appears before a person makes a sudden move, whether to advance, retreat, or speak. In romantic settings, nose flare can indicate emotional arousal — not necessarily sexual, but any state that primes the body for action. Nose flare paired with forward lean signals impending engagement; nose flare paired with backward lean signals preparation to withdraw.

The nose wrinkle — a brief upward compression of the nose accompanied by a slight raising of the upper lip — signals disgust or dislike, even when mild. The disgust response originates in the limbic brain's rejection of spoiled food but generalizes to any unpleasant input — an idea, a person's name, a suggestion, an action. The nose wrinkle can be extremely brief, lasting less than a second, making it easy to miss. When it appears during a specific conversational topic, the person is registering dislike for that content regardless of what their words say. In relationships, a nose wrinkle when discussing a partner's habit, friend, or proposal is a reliable negative signal.

Chin position tracks confidence and emotional state. Chin tucking — drawing the chin down toward the chest — is a defensive or submissive posture. It appears when a person feels threatened, embarrassed, or defeated. The chin lowering simultaneously protects the throat and signals vulnerability. In romantic arguments, a partner whose chin drops is experiencing a loss of confidence in their position or a feeling of being overwhelmed.

Chin jutting — pushing the chin forward and upward — signals confidence, defiance, or challenge. It is a gravity-defying display asserting dominance or certainty. In courtship, chin jutting appears when a person is trying to project confidence or when they feel they have the upper hand in an exchange.

Facial reddening — blushing — is an autonomic response controlled by the sympathetic nervous system. It cannot be consciously produced or suppressed. Blushing occurs during embarrassment, attraction, shame, or anger. The context differentiates the cause. A blush during a compliment signals pleasure or shyness. A blush with lowered gaze signals embarrassment or guilt. A blush with fixed stare and jaw tension signals anger. Blushing is more visible on lighter skin but occurs in all skin types; in darker skin, it may manifest as a warm flush around the cheeks and ears.

Facial paling — blanching — results from blood being shunted from the skin to large muscles during the fight-or-flight response. It appears during intense fear, shock, or anger. A person whose face drains of color during a relationship conversation is experiencing a strong limbic reaction — the body believes it is under threat.

Overall facial muscle tone provides a summary signal. When comfortable, the facial muscles are relaxed, the eyes are soft, and the forehead is smooth. When uncomfortable, the face appears tighter, the skin may pull around the eyes and mouth, and microtensions appear in the jaw and brow. The face can be read at a glance for this comfort-versus-discomfort contrast without needing to identify individual signals.`,
  },
  {
    chapter: `Region: Eyes & Gaze`,
    retrieve_when: `user describes the target's eyes, eye contact, gaze, blinking, eyebrow movement, looking away, pupil changes, or visual attention`,
    passage: `Eye behavior in romantic contexts is a rich source of information, but also the most culturally variable and easiest to misinterpret. The eyes are controlled partly by autonomic mechanisms — pupil dilation and constriction, blink rate, and the eye-blocking reflex — which means some signals are hard to fake. Others, like deliberate gaze patterns, can be consciously managed.

Pupil dilation signals arousal or interest. When the brain registers something pleasing — whether a familiar face, an attractive person, or positive news — the pupils enlarge to let in more light and visual information. This response is not under conscious control and occurs within fractions of a second. In romantic settings, dilated pupils are associated with attraction and emotional engagement. However, pupil size is affected by ambient light, certain medications, and individual variation, making it an unreliable standalone signal. The direction of gaze matters more than the dilation itself when assessing interest.

Eye blocking — sudden eyelid closure, sustained squinting, or covering the eyes with the hands — is a limbic response to undesirable input. The brain attempts to protect itself from something it does not want to see or process. In conversation, eye blocking that coincides with a specific topic or question marks that topic as stressful or unwelcome. A person whose eyes close briefly when asked about their weekend is likely reacting to something about that topic, not pausing to think. The timing of eye blocking relative to speech is what makes it diagnostic.

Prolonged gaze in romantic contexts can signal interest, intimacy, or challenge. The meaning depends on the facial cluster that accompanies it. Gaze paired with a relaxed smile, softened facial muscles, and head tilt signals warmth and attraction. Gaze paired with lowered brows, compressed lips, or a fixed stare signals evaluation or threat. The duration of gaze alone cannot differentiate these states.

Gaze breaks provide additional information. A short break with a quick return to the partner's eyes signals comfort and engagement. A long break followed by a delayed return suggests the person is withdrawing mentally. Gaze aversion that occurs immediately after a specific statement — especially when paired with a downward head movement — suggests the statement caused discomfort or shame.

The eyebrow flash — a quick upward raise of both eyebrows that lasts less than a second — is a universal greeting signal that indicates recognition and openness. In romantic contexts, the eyebrow flash appears when two people who are attracted to each other make eye contact from a distance. Its absence in a reunion setting can signal disinterest or discomfort.

Squinting at a specific statement signals doubt or negative evaluation. The squint narrows the visual aperture, sharpening focus while simultaneously communicating disagreement or suspicion. When squinting appears only during certain conversational topics and not others, the person is signaling a problem with that content.

Eye widening — beyond what normal social interaction requires — accompanies surprise, fear, or intense attraction. The flashbulb eyes response, where the eyes open maximally for a split second, occurs when someone sees something they find intensely positive or unexpected. In romantic contexts, a woman whose eyes widen upon seeing her date enter the room is signaling something different from a woman whose eyes widen in fear at a sudden noise. Context and accompanying facial cues differentiate the two.

The softening of the eyes — the relaxation of the muscles around the eyes that produces a warmer, less guarded appearance — occurs when a person feels safe and connected. This is often called the puppy-dog look. It appears most reliably in established relationships where trust is high, but it can also appear during early attraction when the person feels unusually comfortable. The absence of eye softening in a person who otherwise seems engaged is worth noting; it may indicate guardedness rather than genuine connection.

Blink rate increases under stress and decreases during focused concentration. A sudden increase in blinking during a specific conversational topic signals arousal — positive or negative — that warrants investigation. Eyelid flutter — rapid, incomplete blinks — suggests the person is struggling with internal conflict or distress.

The direction of gaze during conversation is not a reliable indicator of deception contrary to popular belief. People look away to think, to recall information, and to regulate conversational pacing. Looking down can signal submission, reflection, or cultural deference. What matters diagnostically is not whether the person looks away, but when.`,
  },
  {
    chapter: `Region: Mouth & Lips`,
    retrieve_when: `user describes the target's mouth, lips, smile, lip movement, mouth covering, or any speech-adjacent facial signal`,
    passage: `The mouth and lips are among the most expressive features on the face, and also among the most controllable. People learn from childhood to suppress honest facial reactions and produce polite substitutes. The mouth's value as an observational target comes not from reading isolated expressions but from noting discrepancies — the smile that does not reach the eyes, the lip compression that appears only at certain topics, the purse that precedes disagreement.

Lip compression — pressing the lips together until they thin or seem to disappear — ranks among the most reliable signals of withheld thought. When a person compresses their lips in response to a question or statement, they are holding something back. The harder the compression, the stronger the suppression. In romantic contexts, lip compression during discussions of fidelity, feelings, or future plans marks those topics as areas where the person is not fully transparent. The lips disappear because the limbic system clamps the mouth shut, preventing words from escaping.

Lip pursing — a puckering or rounding of the mouth without compression — signals disagreement forming, often before the person has articulated their objection. The purse is a pre-debate signal: the person is preparing their counterargument or rejecting what they just heard. When pursing appears on a date during a story or opinion being shared, the other person is forming a negative reaction that may or may not come out verbally.

Lip licking has two distinct causes that must be distinguished by context. Dry-mouth stress response occurs when the autonomic nervous system reduces salivation under pressure; the person licks their lips to moisten them. Self-soothing lip licking involves slower, more deliberate tongue movements across the lips and serves a pacifying function. The speed and intentionality of the movement differentiate the two. Both increase when the person is uncomfortable.

Full lips versus disappeared lips is a meaningful distinction that tracks comfort level. When relaxed and comfortable, the lips are full and the mouth is soft. Under stress, the lips thin, the mouth tightens, and the lip border sharpens. This shift can occur within seconds in response to a topic change. A person whose lips become full again after a stressful topic passes has returned to comfort.

The smile is the most studied facial signal and the most frequently faked. The Duchenne smile — the genuine expression of enjoyment — engages the zygomaticus major (lifting the mouth corners) and the orbicularis oculi (crinkling the outer corners of the eyes). A fake or social smile involves only the mouth, with the corners pulling sideways toward the ears rather than upward toward the cheekbones. The crow's feet at the eye corners are the critical differentiator. In romantic contexts, a genuine smile on greeting is one of the strongest indicators of positive sentiment. Its absence — a tight, side-pulled smile when the person should be happy to see you — signals either discomfort or weak attachment.

The asymmetrical smile, where one side of the mouth lifts more than the other, often accompanies contempt. The smile may be combined with a slight sneer or eye roll. This is a reliable negative signal. It appears when the person feels superior, dismissive, or amused at the other's expense.

Mouth covering during speech — the hand coming up to shield the mouth mid-sentence — suggests the person is filtering their words or feels unsafe speaking freely. It is distinct from the thoughtful chin touch. Mouth covering is a barrier behavior: the person or the brain is trying to hold back what is being said. In romantic conversations, mouth covering during emotional disclosures should be interpreted as guardedness.

The tongue jut — a brief emergence of the tongue between the teeth without making contact with the lips — often appears when someone has made a mistake, gotten away with something, or feels playfully caught. It is a transaction-completion signal that says, in effect, "I got away with it" or "oops." In romantic settings, tongue jutting after a compliment or a confession can suggest the person was not entirely forthcoming.

Lip biting — drawing the lower lip under the upper teeth — can indicate insecurity, flirtation, or thoughtful hesitation. The context and accompanying signals differentiate the three. When paired with direct gaze and a slight smile, it often signals coy interest. When paired with gaze aversion and shoulder elevation, it signals nervousness or submission.`,
  },
  {
    chapter: `Interaction: Proxemics & Distance`,
    retrieve_when: `user describes physical distance, leaning in, pulling away, seating choices, objects placed between two people, personal space, or how close the target stood/sat`,
    passage: `Proxemics — the study of interpersonal distance — provides a spatial map of comfort, interest, and boundary negotiation. The four interpersonal distance zones, originally defined by Edward Hall, structure all face-to-face interaction: intimate distance (under 18 inches), personal distance (18 inches to 4 feet), social distance (4 to 12 feet), and public distance (over 12 feet). Romantic interest is signaled primarily by the compression of these distances — moving from social or personal into intimate territory earlier than social convention requires.

The most operationally useful observation in romantic contexts is encroachment tolerance. When one person moves into another's intimate space and the other does not retreat, the limbic system has accepted the proximity. The body does not allow someone unwelcome inside intimate distance. A date who allows close seating, does not pull away when faces are near, and does not create distance with their body has signaled comfort with intimacy regardless of what they say.

Retreat is equally informative. A subtle backward lean, a shift of the chair, or a repositioning of the body after close proximity was established indicates boundary marking. The person is reestablishing their preferred distance. This can be a reaction to the specific topic being discussed rather than to the person — a partner who leans away when the conversation turns to marriage is reacting to the topic, not to their partner. The distinction is critical and can only be made by observing whether the distance returns when the topic changes.

Territorial markers provide visible evidence of comfort and claim. Placing a jacket on a chair, spreading personal items across a table, or resting an arm along the back of a booth are all territorial behaviors that signal ownership of the space. In early dating, a person who claims territory around their partner — draping an arm behind them, placing a drink on their side of the table — is signaling ownership to observers and comfort to their partner. The partner who allows these encroachments without withdrawing is accepting the claim.

Barrier objects — drinks, bags, phones, menus, or napkins placed between two people — function as defensive signaling. When a person places an object on the table between themselves and the other person, they are creating a physical boundary. This can be unconscious or deliberate. In romantic settings, the appearance of barrier objects after they were absent signals discomfort or a desire for distance. A phone placed on the table face-up where it was previously in a pocket, or a drink moved to the center of the table, marks a shift in the interaction. The timing of barrier placement relative to conversational topics is more informative than the barrier itself.

Side-by-side versus face-to-face seating preferences indicate different comfort levels and interaction goals. Face-to-face seating facilitates direct conversation and eye contact; it is the default for serious discussion or initial meetings. Side-by-side seating reduces direct eye pressure and allows for physical contact; it is preferred when comfort is high and the interaction is collaborative or intimate. A couple who chooses side-by-side seating at a bar or restaurant — particularly when they could have sat across from each other — is signaling high comfort. A couple who shifts from side-by-side to face-to-face during a conversation may be preparing for a serious discussion.

Sudden proxemic shifts — a person who was sitting close suddenly shifting away, or someone who was at a distance moving in — serve as topic-level reaction markers. The shift almost always follows a specific statement. The observer's task is to identify the statement that preceded the shift. A partner who has been sitting close throughout dinner but shifts away when one topic is introduced has registered that topic as uncomfortable.

When physical movement of the torso is constrained — in a crowded booth, during a movie, or in close quarters — the feet become the distance proxy. Feet pulled back under the chair serve the same function as a torso lean-back: they create distance between the person and the stimulus they find uncomfortable. Feet planted forward toward the other person, by contrast, signal engagement even when the upper body cannot move freely.

The shake-and-wait technique provides a read on initial comfort. After an introduction and handshake, take one step back and observe what the other person does. If they stay in place, they are comfortable at that distance. If they step closer, they want more proximity. If they step back or turn slightly, they need more space. The feet remain the truest channel in this response — they will indicate the person's preferred distance before the upper body has time to perform a social override.`,
  },
  {
    chapter: `Interaction: Mirroring (Isopraxism) & Sync`,
    retrieve_when: `user describes two people seeming to move in sync, postures matching, breathing together, or a sudden shift in how matched the interaction felt`,
    passage: `Isopraxism — the unconscious mirroring of posture, gesture, breathing patterns, speech tempo, and vocabulary between two people — ranks among the most reliable indicators of genuine rapport. When two people are in sync, their limbic systems have aligned, signaling that each perceives the other as safe and familiar. The body treats isopraxism as evidence that the other person belongs to the same social unit.

Mirroring operates outside conscious awareness. Two people in a comfortable conversation will, within minutes, adopt similar postures. If one crosses their legs, the other will cross theirs within one to three seconds. When one partner leans in, their counterpart follows. The head angle, arm position, and even blink rate begin to synchronize. This occurs spontaneously when comfort is present. When it is absent — when one person is guarded, uncomfortable, or disengaged — mirroring breaks down or never starts.

The diagnostic value of mirroring in romantic contexts operates at three levels.

First, the presence of spontaneous mirroring from a target is a stronger indicator of genuine engagement than any verbal affirmation. Words cost nothing and can be produced on demand. Mirroring cannot be consciously sustained for long periods and requires no conscious effort when it is authentic. A date who mirrors posture and gesture is limbically engaged, no matter what their words convey.

Second, the mirror break — a sudden divergence after sync was established — is the most precise marker of a conversational turning point. When two people who have been mirroring suddenly desynchronize — one leans back while the other stays forward, one crosses arms while the other remains open — something in the interaction shifted. The person who broke the mirror is likely reacting to the previous statement or event. Mirror breaks are more reliable than verbal cues for identifying problem topics because they occur before the person has cognitively processed their reaction.

Third, leading by changing posture and watching whether the target follows provides a passive test of rapport depth. If a person shifts their seated position and the target shifts similarly within a few seconds, comfort is high. If the target does not follow, rapport at that moment is weaker than it appeared. This leading test works best when performed naturally — adjusting posture during a pause or after a laugh — so the behavior does not appear deliberate.

Distinguishing genuine isopraxism from performative mirroring requires observation of timing and completeness. Genuine mirroring is delayed by one to three seconds, partial rather than exact, and natural in execution. Performative mirroring — the conscious copying of another person's movements, sometimes called the chameleon effect when deliberate — is immediate, exact, and often slightly off-rhythm. A person who mirrors every gesture within half a second is likely trying to create the appearance of rapport rather than experiencing it. Genuine mirroring also fluctuates; it is not constant. Performative mirroring tends to be relentless.

Breathing synchronization represents the deepest level of isopraxism. When two people are fully comfortable, their breathing rates converge. This is observable as the rise and fall of the chest or shoulders matching between partners. Breathing sync is the last mirroring behavior to develop and the first to break under stress. During a romantic argument, two people who have stopped mirroring posture may still show breathing sync if underlying attachment remains intact. When breathing sync breaks, the emotional disconnect is significant.

Isopraxism extends to vocabulary and speech patterns. Two people in rapport unconsciously adopt similar word choices, sentence length, and conversational pacing. A date who begins using the same phrases or metaphors as their partner is signaling comfort at a linguistic level.

The absence of isopraxism in a relationship that previously had it signals a change in the emotional climate. If two people who used to mirror each other no longer do, something has altered the perception of safety between them. The mirroring may return if the issue is resolved, or it may be permanently lost if trust is broken.`,
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
      console.error('[seed-rag-navarro] embed failed:', await res.text());
      return null;
    }
    const data = await res.json();
    return data?.embedding?.values ?? null;
  } catch (e) {
    console.error('[seed-rag-navarro] embed exception:', e);
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
      console.error('[seed-rag-navarro] insert error:', error.message);
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
