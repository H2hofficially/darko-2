/**
 * seed-rag-psycyber — Ingests Suler's Psychology of Cyberspace into book_passages.
 *
 * Source: knowledge/psycyber-parsed.md (25 frameworks, principle + behavioral
 * markers + diagnostic application).
 *
 * High-signal for DARKO: ghosting, left-on-read, hot/cold, won't-call-only-texts,
 * black-hole spirals, transference patterns, online vs in-person identity gaps.
 *
 * Coexists with seed-rag and seed-rag-aos — distinct book_name. Idempotent;
 * skips if any row with this book_name already exists.
 *
 * Invoke once:
 *   curl -X POST 'https://adyebdcyqczhkluqgwvv.supabase.co/functions/v1/seed-rag-psycyber'
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BOOK_NAME = 'Suler — Psychology of Cyberspace';

const PASSAGES: Array<{ chapter: string; passage: string }> = [
  {
    chapter: 'Online Disinhibition Effect',
    passage: 'People disclose more, attack harder, and behave more openly in text-based communication than they would in person. Six factors strip away the social brakes embodied interaction provides: dissociative anonymity, invisibility, asynchronicity, solipsistic introjection, dissociative imagination, and minimization of authority. The sender writes paragraphs they would never say to a face, confesses deep history within hours of matching, displays cruelty or contempt that vanishes the moment a call starts, drops the conversation cold without the friction of an in-person exit, and reads over text as a different person than the one you met. When a user reports the sender feels like "two different people," disinhibition is almost always operating — the text-self is the disinhibited self, not a mask. Treat the text-persona as a real but partial constellation of the sender, not as the full person and not as performance.',
  },
  {
    chapter: 'Dissociative Anonymity',
    passage: 'When people can separate online actions from their real-world identity, they feel less vulnerable about opening up or acting out because the behavior cannot be linked back to the rest of their life. They may convince themselves those actions "aren\'t really me." Markers: a profile with no real identifying information while oversharing emotionally, statements from a burner or anonymous handle they would never attach to their real name, denial of accountability for messages sent under a pseudonym, separate accounts for different relationship dynamics. When someone behaves dramatically differently across accounts or refuses to link their identity to their messages, dissociative anonymity is enabling the behavior gap. Do not assume the anonymous version represents a deeper truth — it represents the version of them that only exists when consequence is suspended.',
  },
  {
    chapter: 'Invisibility',
    passage: 'In text communication others cannot see your face, body language, or reactions, and you cannot see theirs. The absence of visible disapproval, boredom, or indifference removes the inhibitory feedback that moderates self-disclosure and emotional expression in face-to-face interaction. Markers: vulnerable messages they would choke on if forced to watch the recipient read them, avoidance of voice or video despite heavy texting, sharper confrontation in text than any in-person meeting would predict, leaving messages on read because there is no visible reaction to manage. A sender who is emotive and intense over text but visibly uncomfortable or avoidant on calls is leveraging invisibility — the absence of visible judgment enables the openness, and the prospect of visibility triggers retreat. The push for a call is the single fastest test of whether the text-intimacy is real or media-dependent.',
  },
  {
    chapter: 'Asynchronicity',
    passage: 'Communication that does not happen in real time — text, DMs — removes the pressure of immediate reaction. Delayed feedback lets users compose curated responses or post and "run away" from the emotional consequences. Online psychotherapist Kali Munro called this an "emotional hit and run." Markers: dropping a heavy emotional message then going silent for hours or days, responding to conflict with a delay so long the moment has passed, sending a long vent or accusation and not sticking around for the reply, composing and deleting multiple drafts before sending a seemingly casual message. Asynchronicity enables the hit-and-run — the sender offloads emotion into the digital void without witnessing its impact, leaving the receiver to sit with the weight alone. Do not chase a hit-and-run in real time; the sender is gone. Respond on a delay that matches theirs.',
  },
  {
    chapter: 'Solipsistic Introjection',
    passage: 'When reading another person\'s text, the reader experiences the message as a voice inside their own head. Because the actual voice, face, and body language are absent, the reader unconsciously assigns a voice, appearance, and personality to the sender — shaped more by the reader\'s own expectations, wishes, and memories than by the sender\'s actual identity. The companion becomes a character inside the reader\'s intrapsychic world. Markers: reading the other\'s messages in their own mental voice, building a detailed mental image of the person that feels wrong upon meeting, an uncanny sense of mind-merging or telepathic connection with the texter, assigning motives and emotions based on internal assumptions rather than what was actually typed. When a user says "they felt so familiar" or "I projected a whole personality onto them," solipsistic introjection was operating — the texter became a fantasy constructed from the reader\'s own needs.',
  },
  {
    chapter: 'Dissociative Imagination',
    passage: 'Users may experience their online persona and the people they interact with as existing in a separate, make-believe dimension — a game world with different rules. They dissociate online fiction from offline fact, believing they are not accountable for what happens in that play space. Markers: treating online relationships as "not real" even when emotional investment is heavy, dismissing hurtful digital behavior as "just how I am online" or "it\'s not that serious," maintaining a separate persona that feels like a character not themselves, engaging in romance or conflict online they would never participate in with someone in front of them. When a sender describes their online behavior as playing a role or game, dissociative imagination is bypassing guilt and accountability for actions that would otherwise conflict with their self-concept. They are not lying about the dissociation — they actually experience the two worlds as different jurisdictions.',
  },
  {
    chapter: 'Minimization of Authority',
    passage: 'In most online environments, status, wealth, race, gender, and offline power are invisible. Everyone starts on a level playing field, which removes the deference or fear of disapproval that usually restrains speech in the presence of authority figures. Influence is determined by communication skill, persistence, and technical know-how, not real-world standing. Markers: speaking to superiors, elders, or professionals with casual familiarity they would never use in person, correcting or arguing with figures who hold positional authority offline, assuming equal standing with someone who would have a power differential face to face, reacting poorly when offline status dynamics are reintroduced via voice or in-person meeting. When a user treats someone with significantly different offline status as a peer in text but becomes deferential or resentful when the dynamic shifts to voice, minimization of authority was enabling the perceived equality.',
  },
  {
    chapter: 'Self Constellations Across Media',
    passage: 'The self is not a single entity expressed differently online — different communication modalities activate different constellations of emotion, memory, and thinking. In-person shyness and online boldness are not one being true and the other false; both are real aspects of identity that surface under different environmental conditions. The disinhibition effect is a shift to an online personality constellation that may be more or less dissociated from the in-person constellation depending on the individual. Markers: extroverted and assertive in text but reserved and quiet in person, online-only friends describe a completely different person than offline friends, feeling like a "different version" of self on different apps, others remarking "you\'re not what I expected" after meeting. Rather than asking "which self is real," evaluate the gap between the in-person and text constellations — the size and rigidity of that gap reveals the degree of dissociation and the psychological function the online persona serves.',
  },
  {
    chapter: 'Self-Boundary Disruption',
    passage: 'Cyberspace disrupts the factors that support a stable self-boundary — the sense of what is me and what is not me. The physical body and five senses recede, what others know about the self becomes ambiguous, and linear time blurs. This destabilization shifts the person toward primary process thinking where self-other boundaries become diffuse, allowing hidden aspects of the self to surface while also generating suspicion and anxiety about the intrusion of unknown others into private psychic territory. Markers: alternating between extreme openness and sudden guardedness within the same exchange, revealing intimate details then immediately pulling back with suspicion, confusion about whether feelings originate from self or the other, statements like "I feel like you\'re inside my head" or "I don\'t know where I end and you begin." In-text oscillation between over-sharing and paranoia signals self-boundary disruption — the texter lacks stable markers of where they end and the other begins, producing both disinhibition and defensive retreat.',
  },
  {
    chapter: 'The Black Hole Experience',
    passage: 'When a message receives no reply — not even an error — the sender is left in complete uncertainty. The absence of response functions like a Rorschach inkblot: the sender projects their own wishes, fears, and insecurities onto the silence. Was the message received? Am I being ignored? Did I say something wrong? The black hole draws out whatever anxieties already exist in the sender\'s mind. Markers: obsessive reading of delivery receipts to infer meaning from silence, filling the gap with worst-case interpretations, resending the same message with escalating emotional tone when no reply comes, assuming intent ("they\'re ignoring me," "they\'re mad") when the only evidence is absence of response. When a user spirals into self-doubt or accusation after a message goes unanswered, the black hole is activating pre-existing relational anxiety — the silence is a screen onto which they project abandonment fears, guilt, or anger. The work is to refuse the projection and tolerate the ambiguity until real data arrives.',
  },
  {
    chapter: 'Cyberspace as Transitional Space',
    passage: 'Cyberspace functions as a "transitional space" between self and other — an intermediate zone that feels like an extension of the user\'s own mind. Reading another\'s typed message can feel like a blending or merging of minds. This space becomes a canvas for projecting unconscious fantasies and transference reactions, where the boundary between inner psychic reality and external other becomes porous. Markers: describing the phone or messaging interface as "part of me" or "an extension of my brain," feeling the other person\'s text as if it originates inside their own head, projecting elaborate personality traits onto someone they have never seen or heard, experiencing the digital space as a "place" they inhabit emotionally. When a user describes their phone or messaging app as psychologically inseparable from their mind, the transitional space is operating — text interactions are experienced less as external events and more as internal psychic dramas.',
  },
  {
    chapter: 'Transference to the Online Other',
    passage: 'The ambiguity of text-only communication — voice, face, and body language absent — makes it a powerful trigger for transference. Users unconsciously project templates formed in childhood relationships onto the shadowy figure on the screen, perceiving the online other through the lens of past attachments, wishes, and fears. The unconscious "homing device" draws users toward online partners who match their internal relational templates. Markers: consistently drawn to the same type of person online even when it does not work out, reacting to text partners with emotional intensity disproportionate to the actual history, realizing on reflection that the online friend "reminds me of my parent/ex/sibling," feeling uncanny familiarity with a stranger within minutes of messaging. When a user keeps "running into the same kinds of people" or responds with emotion that exceeds what the exchange warrants, transference is filtering their choices and coloring their perceptions — the current relationship is a stage for an unfinished dynamic from their past.',
  },
  {
    chapter: 'Integration Principle',
    passage: 'Healthy digital living requires bringing together one\'s online and offline worlds. It becomes pathological when cyberspace activity is dissociated from face-to-face life — kept secret, walled off, not integrated into overall identity. The remedy for problematic internet use is to bridge the two realities: talk about online life with real-world people, bring real identity into online spaces, and convert text relationships into voice or in-person contact. Markers: secret online relationships no one in real life knows about, refusal to call or meet despite months of daily texting, feeling like a completely different person in the two worlds and preferring it that way, becoming defensive or irritable when asked about online activities. When a user (or their target) keeps digital life completely separate from physical life, the dissociation is a red flag — the online activity is likely serving an escapist or compensatory function that would not survive integration. Push toward integration tests the relationship\'s ability to exist outside the text bubble.',
  },
  {
    chapter: 'Presence in Cyberspace',
    passage: 'Presence in online environments is constructed through sensory stimulation, change, interactivity, and familiarity — both in how the environment itself feels real (environmental presence) and how other people feel present within it (interpersonal presence). The sense that someone is "really here" depends on reciprocal interaction: when the other responds, their presence brightens; when ignored, the sense of self and other fades. Text alone can create powerful presence when the writer uses expressive range, but the experience is always mediated by the reader\'s interpretation, needs, and level of object relations. Markers: intense connection to a text partner never met or heard, experiencing the other as "fading" or "unreal" when responses become slow, needing consistent replies to feel the other is "still there," interpreting a typing indicator or read receipt as a palpable sign of presence. When a user reports that a slow texter feels "like they don\'t exist" or a fast texter feels "so present," they are constructing interpersonal presence entirely from responsiveness frequency — absence of response collapses the other\'s reality in their mind.',
  },
  {
    chapter: 'Equalized Status',
    passage: 'In most online environments, everyone starts on a level playing field regardless of status, wealth, race, or gender. Offline power and prestige have minimal impact on one\'s influence; instead, communication skill, persistence, idea quality, and technical know-how determine social standing. This flattening of hierarchy removes the deference that normally restrains speech in the presence of authority. Markers: approaching a highly accomplished or powerful person with casual familiarity, correcting or challenging someone they would defer to in person, speaking with confidence and authority on topics outside actual expertise, reacting with resentment when the power differential reasserts itself via voice or in-person meeting. Equalized status explains why a sender who is deferential in person becomes assertive, argumentative, or presumptuous in text — the absence of status cues removes the social brakes that normally moderate the interaction. The reassertion of those cues (a phone call, a meeting) collapses the equality and often produces resentment toward the person whose offline status is now visible.',
  },
  {
    chapter: 'Social Multiplicity',
    passage: 'The internet allows a person to maintain multiple simultaneous relationships with relative ease, often unbeknownst to the other parties. Users juggle conversations across apps and platforms, scanning vast social fields for connections that match conscious or unconscious preferences. This abundance amplifies transference: with infinite options, the unconscious filtering mechanism has a near-infinite selection pool. Markers: carrying on intimate conversations with multiple people simultaneously without any knowing about the others, keeping "options open" through parallel relationships across apps, telling each person they are "special" while distributing attention thinly, using the abundance of options to avoid committing to any single connection. Social multiplicity enables the breadcrumb strategy — the sender keeps multiple lines in the water, never investing enough in any one to risk loss, because the search itself has become the reward. When responsiveness is wildly inconsistent and depth never accumulates, suspect parallel pipelines rather than fluctuating mood.',
  },
  {
    chapter: 'Temporal Stretching',
    passage: 'Asynchronous communication creates a "zone for reflection" — minutes, hours, or days to compose a reply — which fundamentally changes the texture of conversation compared to real-time interaction. New users may expect immediate replies, reflecting an unconscious assumption that text approximates in-person pace. Experienced users understand that different people have their own texting rhythm. Markers: sending a message and immediately expecting a reply, getting anxious when it does not come; taking hours or days to respond and offering no acknowledgment of the gap; mismatched expectations around response time becoming a source of conflict; assuming delay equals disinterest when the other person just has a different pacing style. Temporal stretching produces asymmetrical expectations — one person treats texts like instant messengers while the other treats them like letters. The mismatch is often misinterpreted as disinterest when it is actually a pacing collision. Before assigning meaning to a delay, establish baseline cadence over a week of normal exchange.',
  },
  {
    chapter: 'Media Chosen Reflects Identity',
    passage: 'People gravitate toward the communication channels that align with their personality structure — verbalizers to text, visualizers to imagery and avatars, spontaneous personalities to synchronous chat, reflective personalities to asynchronous messaging. The media chosen reveals the aspects of identity the person is ready to express and those they prefer to conceal. Markers: someone who will text for hours but refuses a voice call, preferring voice notes or video over typing as a way to control how they are perceived, ghosting on one platform but active on another, choosing different platforms for different emotional modes (Twitter for venting, text for intimacy). A person\'s platform preference is diagnostic — the person who avoids voice calls is not just busy, they are selecting a channel that masks elements of their identity (tone, hesitancy, class markers, accent) that would be audible in speech. The channel they refuse tells you what they are hiding from being heard.',
  },
  {
    chapter: 'Temporarily Frozen Presence (Lag)',
    passage: 'When a connection lags or freezes, the entire scene stops responding — others become unresponsive, the environment freezes. This suspension of interactivity parallels paralysis nightmares and can be deeply frustrating, but it also provides an involuntary moment of reflection: precious seconds or minutes to decide what to say or do next without the pressure of real-time interaction. Markers: during a heated text exchange, a long pause from the other person feels like the digital equivalent of lag; using the "typing" indicator as a way to stall or control pacing; experiencing technical delays as intensely frustrating, especially during conflict; welcoming pauses as breathing room in emotionally charged conversations. The skilled operator weaponizes lag rather than fighting it — a deliberate, extended pause in a heated exchange acts on the other party the same way a real lag would, forcing them to sit in uncertainty while you compose the response that does the work.',
  },
  {
    chapter: 'The Uncanny in Cyberspace',
    passage: 'Anxiety arises when a user cannot be certain whether another person is present, who they are, or what their intentions are — a common situation in text-based environments. An avatar or username that sits motionless and ambiguous triggers a sense of the uncanny similar to the unease generated by monsters in film: the other is there-but-not-there, familiar-but-not. Markers: feeling creeped out by someone who is logged in but never responds, discomfort when a conversation partner changes their handle or profile picture without explanation, suspicion of a profile that is too polished or too sparse, unease when someone reads messages immediately but never types. When a user reports feeling "off" about an online contact despite no overt red flag, the uncanny response may be detecting something real — the person\'s inconsistent presence patterns are triggering a primitive alarm system designed to detect ambiguous threats. Do not dismiss the uncanny as paranoia; investigate what specific pattern is producing it.',
  },
  {
    chapter: 'Recordability — The Relationship As Document',
    passage: 'Every text exchanged creates a permanent record that can be replayed, analyzed, and used as evidence. In a fundamental sense, the relationship IS the document — there is no ephemeral interaction outside what was typed. This recordability means old messages can be resurrected as ammunition in conflict, producing the hallmark of flame wars: quoted text as weapons. The same record can evoke different emotional reactions depending on the reader\'s state of mind when they re-read it. Markers: pulling up months-old screenshots as evidence during an argument, re-reading old messages to verify whether emotional memory matches the text, sharing or forwarding private conversations to third parties for validation, using quoted text to weaponize the other person\'s own words. When a conflict involves "you said this on [date]" and screenshots are produced, recordability has transformed the relationship from a living interaction into a permanent record cited as evidence — the document has become the relationship. Compose every message under the assumption that it will be re-read in a hostile state.',
  },
  {
    chapter: 'Mischievous Pranks and Boundary Testing',
    passage: 'In visual chat environments, users engage in "getting away with something" — testing the limits of acceptable behavior by graffiti-ing backgrounds, dropping obscene props and fleeing, spoofing other users\' identities, or flooding rooms with avatars. These acts range from playful to hostile and serve as a way to assert agency, attention-seek, or express aggression under the cover of "just joking." Markers: provocative messages followed by "just kidding" or "testing you," fake profiles that mimic someone else\'s identity, flooding the chat with repeated messages or memes to disrupt conversation, boundary-pushing behavior that is technically within the rules but feels violating. When a sender consistently pushes boundaries and retreats behind plausible deniability, the pattern signals a need for control through attention-seeking — they create chaos because any reaction is better than being ignored. The deniability is the move; the disruption is the goal. Refusing to react is more disorienting to them than any direct confrontation.',
  },
  {
    chapter: 'Avatar as Identity Projection',
    passage: 'The avatar a person chooses is not random — it condenses multiple layers of meaning into a single visual symbol. Consciously or unconsciously, users select avatars that represent who they are, who they wish to be, what they fear, or what moves them. The avatar functions like a Rorschach inkblot: it is a projection of the user\'s intrapsychic world onto a visual form, and others\' reactions to it reveal their own transferences. Markers: profile picture choices feel significant but the user cannot explain why they chose them, others consistently interpret the profile picture in ways that surprise the user, avatar or image preferences shift noticeably during emotional transitions, the user\'s digital self-presentation differs starkly from how they describe their "real" self. Every profile picture, handle, and bio choice is a condensed identity signal — the user may not know what it communicates, but others often do. Treat the avatar as a projective test, not a random preference, and read it as a thin slice of the version of self they want to be perceived as.',
  },
  {
    chapter: 'Cyberspace as Dream World',
    passage: 'Cyberspace can induce an altered state of consciousness resembling the primary process thinking of dreams — where conventional rules of time, space, and logic dissolve. Users experience the suspension of physics, spontaneous generation of objects, loose self-boundaries, identity shifting, and a blending of inner and outer reality. This dreamlike quality is a major source of its attraction and may explain why some users become deeply immersed or "addicted." Markers: losing track of time for hours while scrolling or messaging, reporting that the line between thoughts and screen has dissolved, experiencing online interactions with hyper-real intensity that carries into offline mood, adopting different personas or emotional states depending on which platform they are on. When a user says "I don\'t even know where the time went" or describes their phone as a "portal," they are describing immersion in a dreamlike state where ordinary reality testing is suspended — which makes them highly susceptible to both deep emotional bonding and manipulation in that space.',
  },
  {
    chapter: 'Identity Dissociation Online',
    passage: 'Cyberspace allows users to split off and express different components of their identity in a disconnected fashion. A user may maintain multiple distinct online personas, each with its own emotional range and relational patterns, with strong dissociative barriers between them. This is not necessarily pathological — it can be a healthy exploration of identity facets — but when the bars between online and offline selves become rigid, the dissociation may serve an escapist or defensive function. Markers: completely different personalities across platforms, online friends who would not recognize the user\'s in-person self, using one handle for "real" connections and another for acting out, not feeling like themselves when switching between digital identities. A large and rigid gap between online and offline identity warrants attention — the dissociation may be protecting the user from integrating something they are not ready to face, or it may be enabling behavior they would not own in their physical life. Push for integration only when the operator can hold what surfaces.',
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
      console.error('[seed-rag-psycyber] embed failed:', await res.text());
      return null;
    }
    const data = await res.json();
    return data?.embedding?.values ?? null;
  } catch (e) {
    console.error('[seed-rag-psycyber] embed exception:', e);
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
      console.error('[seed-rag-psycyber] insert error:', error.message);
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
