import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  StyleSheet,
  Platform,
  Animated,
  KeyboardAvoidingView,
  Dimensions,
  Image,
  Alert,
  Modal,
  useWindowDimensions,
} from 'react-native';
import { AppNav } from '../components/AppNav';
import { AppStatusBar } from '../components/AppStatusBar';
import Markdown from 'react-native-markdown-display';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { useAudioRecorder, AudioModule, RecordingPresets } from 'expo-audio';
import * as Clipboard from 'expo-clipboard';
import {
  sendMessage,
  transcribeAudio,
  generateTargetProfile,
  parseDarkoResponse,
  stripStreamMarkers,
  type DarkoResponse,
  type MessageInput,
} from '../services/darko';
import {
  saveMessage,
  getConversation,
  getTargetProfile,
  saveTargetProfile,
  getTarget,
  getMissionPhase,
  saveMissionPhase,
  type ConversationMessage,
  type TargetProfile,
} from '../services/storage';
import { useUser, TIER_LIMITS } from '../context/UserContext';
import { PaywallModal } from '../components/PaywallModal';

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCENT = '#CCFF00';
const BG = '#09090B';
const CARD_BG = '#18181B';
const BORDER = '#27272A';
const TEXT_PRIMARY = '#E4E4E7';
const TEXT_DIM = '#A1A1AA';
const ERROR_RED = '#FF4444';
const RECORD_RED = '#FF3333';
const MONO = Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' });
const SANS = Platform.select({ ios: 'System', android: 'sans-serif', default: 'sans-serif' });
const SCREEN_WIDTH = Dimensions.get('window').width;
const PANEL_WIDTH = SCREEN_WIDTH * 0.85;

// react-native-markdown-display style overrides to match app design
const markdownStyles = {
  body: { color: TEXT_PRIMARY, fontFamily: SANS, fontSize: 14, lineHeight: 22 },
  strong: { color: TEXT_PRIMARY, fontWeight: '700' as const },
  em: { color: TEXT_PRIMARY, fontStyle: 'italic' as const },
  bullet_list: { marginVertical: 4 },
  ordered_list: { marginVertical: 4 },
  list_item: { color: TEXT_PRIMARY, fontFamily: SANS, fontSize: 14, lineHeight: 22 },
  paragraph: { color: TEXT_PRIMARY, fontFamily: SANS, fontSize: 14, lineHeight: 22, marginVertical: 2 },
  code_inline: { color: ACCENT, fontFamily: MONO, fontSize: 13, backgroundColor: 'transparent' },
  fence: { color: TEXT_DIM, fontFamily: MONO, fontSize: 13, backgroundColor: CARD_BG, padding: 8, borderRadius: 4 },
  heading1: { color: TEXT_PRIMARY, fontFamily: MONO, fontSize: 16, fontWeight: '700' as const, marginVertical: 4 },
  heading2: { color: TEXT_PRIMARY, fontFamily: MONO, fontSize: 15, fontWeight: '700' as const, marginVertical: 4 },
  heading3: { color: TEXT_DIM, fontFamily: MONO, fontSize: 14, fontWeight: '700' as const, marginVertical: 2 },
};

const LOADER_MESSAGES = [
  '> ANALYZING...',
  '> CROSS-REFERENCING FRAMEWORK LIBRARY...',
  '> READING BEHAVIORAL VECTORS...',
  '> COMPILING STRATEGIC ASSESSMENT...',
  '> DRAFTING RESPONSE...',
];

const PHASE_NAMES = [
  '',
  'INITIAL RECONNAISSANCE',
  'PATTERN RECOGNITION',
  'PSYCHOLOGICAL PENETRATION',
  'FRAME CONTROL',
  'ESCALATION PROTOCOL',
];

const PHASE_UNLOCK_LINE1: Record<number, string> = {
  1: '// OPERATIVE ONLINE > TARGET ACQUIRED.',
  2: '// PHASE 2 UNLOCKED > BEHAVIORAL PATTERN IDENTIFIED.',
  3: '// PHASE 3 UNLOCKED > PSYCHOLOGICAL PROFILE ESTABLISHED.',
  4: '// PHASE 4 UNLOCKED > FRAME DOMINANCE PROTOCOL ACTIVE.',
  5: '// PHASE 5 UNLOCKED > MAXIMUM INTELLIGENCE CLEARANCE GRANTED.',
};

// ─── Phase computation ────────────────────────────────────────────────────────

function computePhase(msgCount: number): number {
  if (msgCount === 0) return 1;
  if (msgCount >= 20) return 5;
  if (msgCount >= 10) return 4;
  if (msgCount >= 5) return 3;
  if (msgCount >= 2) return 2;
  return 1;
}

// ─── Chat message types ───────────────────────────────────────────────────────

type ChatMsg =
  | { id: string; type: 'user'; text: string; imageUri?: string; timestamp: string }
  | {
      id: string;
      type: 'darko';
      response: DarkoResponse;
      isStreaming?: boolean;
      streamText?: string;
      timestamp: string;
    };

function conversationToChatMsgs(messages: ConversationMessage[]): ChatMsg[] {
  return messages.map((msg) => {
    if (msg.role === 'user') {
      return {
        id: msg.id + '_u',
        type: 'user' as const,
        text: msg.content,
        timestamp: msg.created_at,
      };
    }
    const response: DarkoResponse = {
      text: msg.content,
      scripts: (msg.structured_data?.scripts ?? []).filter(Boolean),
      alerts: (msg.structured_data?.alerts ?? []).filter(Boolean),
      phaseUpdate: msg.structured_data?.phaseUpdate ?? null,
      reads: (msg.structured_data?.reads ?? []).filter(Boolean),
      isCampaign: msg.entry_type === 'campaign_brief',
    };
    return {
      id: msg.id + '_d',
      type: 'darko' as const,
      response,
      timestamp: msg.created_at,
    };
  });
}

// ─── Phase bar ────────────────────────────────────────────────────────────────

function PhaseBar({ phase }: { phase: number }) {
  const pct = (phase / 5) * 100;
  return (
    <View style={styles.phaseBarTrack}>
      <View style={[styles.phaseBarFill, { width: `${pct}%` as any }]} />
    </View>
  );
}

// ─── Phase unlock overlay ─────────────────────────────────────────────────────

function PhaseUnlockOverlay({ phase, onComplete }: { phase: number; onComplete: () => void }) {
  const line1Full = PHASE_UNLOCK_LINE1[phase] ?? `// PHASE ${phase} UNLOCKED`;
  const line2Full = `> ${PHASE_NAMES[phase] ?? ''} INITIATED`;
  const [displayed1, setDisplayed1] = useState('');
  const [displayed2, setDisplayed2] = useState('');
  const [showLine2, setShowLine2] = useState(false);
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(overlayOpacity, { toValue: 1, duration: 150, useNativeDriver: true }).start();

    let i = 0;
    const iv1 = setInterval(() => {
      i++;
      setDisplayed1(line1Full.slice(0, i));
      if (i >= line1Full.length) {
        clearInterval(iv1);
        setTimeout(() => {
          setShowLine2(true);
          let j = 0;
          const iv2 = setInterval(() => {
            j++;
            setDisplayed2(line2Full.slice(0, j));
            if (j >= line2Full.length) {
              clearInterval(iv2);
              setTimeout(() => {
                Animated.timing(overlayOpacity, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => {
                  onComplete();
                });
              }, 500);
            }
          }, 20);
        }, 150);
      }
    }, 22);

    return () => clearInterval(iv1);
  }, []);

  return (
    <Animated.View style={[styles.phaseOverlay, { opacity: overlayOpacity }]}>
      <Text style={styles.phaseOverlayText}>{displayed1}</Text>
      {showLine2 && <Text style={styles.phaseOverlaySubText}>{displayed2}</Text>}
    </Animated.View>
  );
}

// ─── User bubble ──────────────────────────────────────────────────────────────

function UserBubble({ msg }: { msg: Extract<ChatMsg, { type: 'user' }> }) {
  return (
    <View style={styles.userBubbleContainer}>
      <View style={styles.userBubble}>
        {msg.imageUri ? (
          <Image
            source={{ uri: msg.imageUri }}
            style={styles.userBubbleImage}
            resizeMode="cover"
          />
        ) : null}
        {msg.text && msg.text !== '[ image input ]' ? (
          <Text style={[styles.userBubbleText, msg.imageUri ? styles.userBubbleTextWithImage : null]}>
            {msg.text}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

// ─── Script card ──────────────────────────────────────────────────────────────

function ScriptCard({ script, index }: { script: string; index: number }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await Clipboard.setStringAsync(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [script]);

  return (
    <TouchableOpacity
      style={styles.scriptBox}
      onLongPress={handleCopy}
      delayLongPress={300}
      activeOpacity={0.85}
    >
      <View style={styles.scriptBoxHeader}>
        <Text style={styles.scriptBoxLabel}>{'// SCRIPT ' + String(index + 1).padStart(2, '0')}</Text>
        <TouchableOpacity onPress={handleCopy} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={[styles.scriptCopyBtn, copied && styles.scriptCopyBtnCopied]}>
            {copied ? '// copied' : 'copy'}
          </Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.scriptBoxText}>{script}</Text>
    </TouchableOpacity>
  );
}

// ─── DARKO response bubble ────────────────────────────────────────────────────

const DarkoBubble = React.memo(function DarkoBubble({
  msg,
  onLongPress,
}: {
  msg: Extract<ChatMsg, { type: 'darko' }>;
  onLongPress: () => void;
}) {
  const { response, isStreaming, streamText } = msg;

  // Streaming: strip block markers, render cleaned prose + cursor
  if (isStreaming) {
    const displayText = stripStreamMarkers(streamText ?? '');
    return (
      <View style={[styles.darkoBubble, { borderLeftColor: BORDER }]}>
        {displayText ? (
          <Markdown style={markdownStyles}>{displayText}</Markdown>
        ) : null}
        <Text style={styles.streamingCursor}>▊</Text>
      </View>
    );
  }

  const borderColor = response.alerts.length > 0 ? ERROR_RED : ACCENT;

  return (
    <TouchableOpacity
      style={[styles.darkoBubble, { borderLeftColor: borderColor }]}
      onLongPress={onLongPress}
      delayLongPress={400}
      activeOpacity={0.9}
    >
      {/* Main prose with markdown rendering */}
      {response.text ? (
        <Markdown style={markdownStyles}>{response.text}</Markdown>
      ) : null}

      {/* Reads — psychological analysis callouts */}
      {response.reads.map((read, i) => (
        <View key={i} style={styles.readBlock}>
          <Text style={styles.readLabel}>{'// READ'}</Text>
          <Text style={styles.readText}>{read}</Text>
        </View>
      ))}

      {/* Scripts */}
      {response.scripts.length > 0 && (
        <View style={styles.scriptsContainer}>
          {response.scripts.map((script, i) => (
            <ScriptCard key={i} script={script} index={i} />
          ))}
        </View>
      )}

      {/* Alerts */}
      {response.alerts.map((alert, i) => (
        <View key={i} style={styles.alertBlock}>
          <Text style={styles.alertLabel}>{'// ALERT'}</Text>
          <Text style={styles.alertText}>{alert}</Text>
        </View>
      ))}

      {/* Phase update */}
      {response.phaseUpdate !== null && (
        <View style={styles.phaseUpdateBlock}>
          <Text style={styles.phaseUpdateText}>{`// PHASE ${response.phaseUpdate} INITIATED`}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

// ─── Loading bubble ───────────────────────────────────────────────────────────

function LoadingBubble({ text }: { text: string }) {
  return (
    <View style={[styles.darkoBubble, { borderLeftColor: BORDER }]}>
      <Text style={styles.loaderLine}>{text}</Text>
    </View>
  );
}

// ─── Dossier panel ────────────────────────────────────────────────────────────

type DossierPanelProps = {
  visible: boolean;
  onClose: () => void;
  loading: boolean;
  targetName: string;
  leverage?: string;
  objective?: string;
  currentPhase: number;
  profile: TargetProfile | null;
};

function DossierSection({
  title,
  items,
  sentiment = 'neutral',
  mono = false,
}: {
  title: string;
  items: (string | null | undefined)[];
  sentiment?: 'positive' | 'negative' | 'neutral';
  mono?: boolean;
}) {
  const filled = items.filter(Boolean) as string[];
  if (!filled.length) return null;
  const borderColor = sentiment === 'positive' ? ACCENT : sentiment === 'negative' ? ERROR_RED : BORDER;
  return (
    <View style={[styles.dossierCard, { borderLeftColor: borderColor }]}>
      <Text style={styles.dossierCardTitle}>{title}</Text>
      {filled.map((item, i) => (
        <Text key={i} style={mono ? styles.dossierItemMono : styles.dossierItem}>
          {'› ' + item}
        </Text>
      ))}
    </View>
  );
}

function DossierPanel({ visible, onClose, loading, targetName, leverage, objective, currentPhase, profile }: DossierPanelProps) {
  const slideAnim = useRef(new Animated.Value(PANEL_WIDTH)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: PANEL_WIDTH, duration: 220, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const phaseName = PHASE_NAMES[currentPhase] ?? '';

  return (
    <>
      {/* Backdrop */}
      <Animated.View
        pointerEvents={visible ? 'auto' : 'none'}
        style={[styles.dossierBackdrop, { opacity: backdropAnim }]}
      >
        <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={onClose} activeOpacity={1} />
      </Animated.View>

      {/* Panel */}
      <Animated.View style={[styles.dossierPanel, { transform: [{ translateX: slideAnim }] }]}>
        {/* Panel header */}
        <View style={styles.dossierHeader}>
          <Text style={styles.dossierHeaderTitle}>{'// TARGET INTELLIGENCE FILE'}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.dossierCloseBtn}>{'×'}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.dossierDivider} />

        <ScrollView style={styles.dossierScroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.dossierScrollContent}>
          {loading ? (
            <View style={styles.dossierLoadingBox}>
              <Text style={styles.dossierLoadingText}>{'> COMPILING INTELLIGENCE...'}</Text>
              <Text style={styles.dossierLoadingSubtext}>{'> CROSS-REFERENCING BEHAVIORAL VECTORS...'}</Text>
            </View>
          ) : (
            <>
              {/* ── BASIC INTEL ── */}
              <Text style={styles.dossierSectionHeader}>{'// BASIC INTEL'}</Text>
              <View style={[styles.dossierCard, { borderLeftColor: BORDER }]}>
                <Text style={styles.dossierCardTitle}>TARGET ALIAS</Text>
                <Text style={styles.dossierItem}>{targetName.toUpperCase()}</Text>
                {leverage ? (
                  <>
                    <Text style={[styles.dossierCardTitle, { marginTop: 10 }]}>OPERATIVE LEVERAGE</Text>
                    <Text style={styles.dossierItem}>{leverage}</Text>
                  </>
                ) : null}
                {objective ? (
                  <>
                    <Text style={[styles.dossierCardTitle, { marginTop: 10 }]}>OBJECTIVE</Text>
                    <Text style={styles.dossierItem}>{objective}</Text>
                  </>
                ) : null}
                {profile?.birthday ? (
                  <>
                    <Text style={[styles.dossierCardTitle, { marginTop: 10 }]}>BIRTHDAY</Text>
                    <Text style={styles.dossierItem}>{profile.birthday}</Text>
                  </>
                ) : null}
                {profile?.location ? (
                  <>
                    <Text style={[styles.dossierCardTitle, { marginTop: 10 }]}>LOCATION</Text>
                    <Text style={styles.dossierItem}>{profile.location}</Text>
                  </>
                ) : null}
              </View>

              {/* ── PSYCHOLOGICAL PROFILE ── */}
              {profile && (
                <>
                  <Text style={styles.dossierSectionHeader}>{'// PSYCHOLOGICAL PROFILE'}</Text>
                  <View style={[styles.dossierCard, { borderLeftColor: ACCENT }]}>
                    {profile.dominant_archetype ? (
                      <>
                        <Text style={styles.dossierCardTitle}>DOMINANT ARCHETYPE</Text>
                        <Text style={styles.dossierItem}>{profile.dominant_archetype}</Text>
                      </>
                    ) : null}
                    {profile.attachment_style ? (
                      <>
                        <Text style={[styles.dossierCardTitle, { marginTop: 10 }]}>ATTACHMENT STYLE</Text>
                        <Text style={styles.dossierItem}>{profile.attachment_style}</Text>
                      </>
                    ) : null}
                    {profile.mbti_profile?.type ? (
                      <>
                        <Text style={[styles.dossierCardTitle, { marginTop: 10 }]}>MBTI TYPE</Text>
                        <Text style={styles.dossierItemMono}>{profile.mbti_profile.type}</Text>
                        {profile.mbti_profile.seduction_vulnerability ? (
                          <Text style={[styles.dossierItem, { marginTop: 4, color: TEXT_DIM }]}>
                            {profile.mbti_profile.seduction_vulnerability}
                          </Text>
                        ) : null}
                      </>
                    ) : null}
                    {profile.vulnerability_score ? (
                      <>
                        <Text style={[styles.dossierCardTitle, { marginTop: 10 }]}>VULNERABILITY SCORE</Text>
                        <Text style={styles.dossierItemMono}>{profile.vulnerability_score}</Text>
                      </>
                    ) : null}
                  </View>
                </>
              )}

              {/* ── STRENGTHS & WEAKNESSES ── */}
              {profile && (
                <>
                  <Text style={styles.dossierSectionHeader}>{'// STRENGTHS & WEAKNESSES'}</Text>
                  <DossierSection title="STRENGTHS" items={profile.strengths ?? []} sentiment="positive" />
                  <DossierSection title="LIKES" items={profile.likes ?? []} sentiment="positive" />
                  <DossierSection title="WEAKNESSES" items={profile.weaknesses ?? []} sentiment="negative" />
                  <DossierSection title="DISLIKES" items={profile.dislikes ?? []} sentiment="negative" />
                </>
              )}

              {/* ── MANIPULATION VECTORS ── */}
              {profile && (profile.manipulation_vectors?.length || profile.manipulation_patterns?.length) ? (
                <>
                  <Text style={styles.dossierSectionHeader}>{'// MANIPULATION VECTORS'}</Text>
                  <DossierSection
                    title="VECTORS SHE DEPLOYS"
                    items={profile.manipulation_vectors?.length ? profile.manipulation_vectors : profile.manipulation_patterns}
                    sentiment="negative"
                  />
                  {profile.mbti_profile?.shadow_function ? (
                    <View style={[styles.dossierCard, { borderLeftColor: ERROR_RED }]}>
                      <Text style={styles.dossierCardTitle}>SHADOW FUNCTION (STRESS RESPONSE)</Text>
                      <Text style={styles.dossierItem}>{profile.mbti_profile.shadow_function}</Text>
                    </View>
                  ) : null}
                </>
              ) : null}

              {/* ── RELATIONSHIP ARC ── */}
              <Text style={styles.dossierSectionHeader}>{'// RELATIONSHIP ARC'}</Text>
              <View style={[styles.dossierCard, { borderLeftColor: ACCENT }]}>
                <Text style={styles.dossierCardTitle}>CURRENT MISSION PHASE</Text>
                <Text style={styles.dossierItemMono}>{`PHASE ${currentPhase} — ${phaseName}`}</Text>
                {profile?.power_dynamic ? (
                  <>
                    <Text style={[styles.dossierCardTitle, { marginTop: 10 }]}>POWER DYNAMIC</Text>
                    <Text style={styles.dossierItem}>{profile.power_dynamic}</Text>
                  </>
                ) : null}
                {profile?.predicted_next_behavior ? (
                  <>
                    <Text style={[styles.dossierCardTitle, { marginTop: 10 }]}>PREDICTED NEXT MOVE</Text>
                    <Text style={[styles.dossierItem, { color: ACCENT }]}>{profile.predicted_next_behavior}</Text>
                  </>
                ) : null}
              </View>
              <DossierSection title="KEY TURNING POINTS" items={profile?.key_turning_points ?? []} sentiment="neutral" />

              {/* ── HANDLER ASSESSMENT ── */}
              {profile?.relationship_brief ? (
                <>
                  <Text style={styles.dossierSectionHeader}>{'// HANDLER ASSESSMENT'}</Text>
                  <View style={[styles.dossierCard, { borderLeftColor: BORDER }]}>
                    <Text style={styles.dossierBriefText}>{profile.relationship_brief}</Text>
                  </View>
                </>
              ) : null}

              {profile?.generatedAt ? (
                <Text style={styles.dossierTimestamp}>
                  {'DOSSIER COMPILED: ' + new Date(profile.generatedAt).toLocaleString()}
                </Text>
              ) : null}
            </>
          )}
        </ScrollView>
      </Animated.View>
    </>
  );
}

// ─── Campaign brief modal ─────────────────────────────────────────────────────

type CampaignBriefModalProps = {
  visible: boolean;
  submitting: boolean;
  onSubmit: (briefContent: string) => void;
  onClose: () => void;
};

function CampaignBriefModal({ visible, submitting, onSubmit, onClose }: CampaignBriefModalProps) {
  const [who, setWho] = useState('');
  const [howSheKnowsYou, setHowSheKnowsYou] = useState('');
  const [hist, setHist] = useState('');
  const [herSituation, setHerSituation] = useState('');
  const [yourSituation, setYourSituation] = useState('');
  const [objective, setObjective] = useState('');
  const [complexity, setComplexity] = useState('');

  const canSubmit = who.trim().length > 0 && objective.trim().length > 0 && !submitting;

  const handleSubmit = () => {
    const content = [
      `// WHO IS SHE\n${who.trim()}`,
      howSheKnowsYou.trim() ? `// HOW SHE KNOWS YOU\n${howSheKnowsYou.trim()}` : '',
      hist.trim() ? `// THE HISTORY\n${hist.trim()}` : '',
      herSituation.trim() ? `// HER SITUATION\n${herSituation.trim()}` : '',
      yourSituation.trim() ? `// YOUR SITUATION\n${yourSituation.trim()}` : '',
      `// YOUR OBJECTIVE\n${objective.trim()}`,
      complexity.trim() ? `// THE COMPLEXITY\n${complexity.trim()}` : '',
    ].filter(Boolean).join('\n\n');
    onSubmit(content);
  };

  const Field = ({
    label, value, onChange, placeholder, minLines = 2, singleLine = false,
  }: {
    label: string; value: string; onChange: (t: string) => void;
    placeholder: string; minLines?: number; singleLine?: boolean;
  }) => (
    <View style={styles.briefFieldBlock}>
      <Text style={styles.briefFieldLabel}>{label}</Text>
      <TextInput
        style={[styles.briefFieldInput, singleLine ? styles.briefFieldInputSingle : { minHeight: minLines * 22 + 20 }]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={BORDER}
        multiline={!singleLine}
        scrollEnabled={false}
      />
    </View>
  );

  return (
    <Modal visible={visible} transparent={false} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: BG }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.briefHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.briefHeaderTitle}>{'// INITIALIZE CAMPAIGN BRIEF'}</Text>
            <Text style={styles.briefHeaderSub}>Brief DARKO on the full situation. The more intel you provide, the more precise the campaign.</Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.briefCloseBtn}>{'✕'}</Text>
          </TouchableOpacity>
        </View>
        <View style={{ height: 1, backgroundColor: BORDER }} />

        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.briefScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Field label="// WHO IS SHE" value={who} onChange={setWho} placeholder="Describe her personality, how she carries herself, what makes her different..." minLines={3} />
          <Field label="// HOW SHE KNOWS YOU" value={howSheKnowsYou} onChange={setHowSheKnowsYou} placeholder="How does she see you? What role do you play in her life right now?" minLines={2} />
          <Field label="// THE HISTORY" value={hist} onChange={setHist} placeholder="How did you meet? What has happened between you? Key moments..." minLines={3} />
          <Field label="// HER SITUATION" value={herSituation} onChange={setHerSituation} placeholder="Family, work, emotional state, what she is going through right now..." minLines={2} />
          <Field label="// YOUR SITUATION" value={yourSituation} onChange={setYourSituation} placeholder="Your context, what she knows about you, your strengths in this dynamic..." minLines={2} />
          <Field label="// YOUR OBJECTIVE" value={objective} onChange={setObjective} placeholder="What specifically do you want from this? Be precise." singleLine />
          <Field label="// THE COMPLEXITY" value={complexity} onChange={setComplexity} placeholder="What makes this difficult? What is working against you?" minLines={2} />
        </ScrollView>

        <View style={styles.briefFooter}>
          <TouchableOpacity
            style={[styles.briefSubmitBtn, !canSubmit && styles.briefSubmitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit}
            activeOpacity={0.85}
          >
            <Text style={styles.briefSubmitText}>{submitting ? '> ANALYZING...' : '// SUBMIT INTEL'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Web right panel (60/40 layout, wide screens only) ───────────────────────

const DECODE_MONO = Platform.select({
  ios: 'Courier New',
  android: 'monospace',
  default: "'JetBrains Mono', monospace",
});

function WebRightPanel({
  profile,
  lastScripts,
  targetName,
  phase,
}: {
  profile: TargetProfile | null;
  lastScripts: string[];
  targetName: string;
  phase: number;
}) {
  const PHASE_LABEL: Record<number, string> = {
    1: 'APPROACH', 2: 'BUILD', 3: 'DECIDE', 4: 'COMMIT', 5: 'COMMIT',
  };

  const rows1 = [
    { k: 'ATTACHMENT_STYLE', v: profile?.attachment_style },
    { k: 'COMM_STYLE', v: profile?.target_communication_style },
    { k: 'VULNERABILITY', v: profile?.vulnerability_score },
  ].filter((r) => r.v);

  const rows2 = [
    { k: 'ARCHETYPE', v: profile?.dominant_archetype },
    { k: 'CAMPAIGN_PHASE', v: PHASE_LABEL[phase] ?? 'APPROACH' },
    { k: 'POWER_DYNAMIC', v: profile?.power_dynamic },
    { k: 'MOMENTUM', v: profile?.relationship_momentum },
  ].filter((r) => r.v);

  const script = lastScripts[0] ?? null;

  return (
    <View style={rp.panel}>
      {/* Ambient glow */}
      <View style={rp.glow} pointerEvents="none" />

      {/* Header */}
      <View style={rp.header}>
        <Text style={rp.headerTitle}>// LIVE DOSSIER</Text>
        <View style={rp.headerRight}>
          <View style={rp.liveDot} />
          <Text style={rp.liveText}>ACTIVE</Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Empty state */}
        {!profile && (
          <View style={rp.empty}>
            <Text style={rp.emptyTitle}>AWAITING INTEL</Text>
            <Text style={rp.emptySub}>Send a message to begin profiling {targetName.toUpperCase()}</Text>
          </View>
        )}

        {/* Behavioral profile */}
        {rows1.length > 0 && (
          <View style={rp.section}>
            <Text style={rp.secLabel}>// BEHAVIORAL PROFILE</Text>
            {rows1.map((r) => (
              <View key={r.k} style={rp.row}>
                <Text style={rp.rowKey}>{r.k}</Text>
                <Text style={rp.rowVal}>{r.v}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Operational vectors */}
        {rows2.length > 0 && (
          <View style={rp.section}>
            <Text style={rp.secLabel}>// OPERATIONAL VECTORS</Text>
            {rows2.map((r) => (
              <View key={r.k} style={rp.row}>
                <Text style={rp.rowKey}>{r.k}</Text>
                <Text style={[rp.rowVal, r.k === 'ARCHETYPE' && { color: ACCENT }]}>{r.v}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Manipulation patterns */}
        {profile?.manipulation_patterns && profile.manipulation_patterns.length > 0 && (
          <View style={rp.section}>
            <Text style={rp.secLabel}>// MANIPULATION VECTORS</Text>
            {profile.manipulation_patterns.slice(0, 3).map((mp, i) => (
              <View key={i} style={rp.bulletRow}>
                <Text style={rp.bullet}>▸</Text>
                <Text style={rp.bulletText}>{mp}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Recommended move — script */}
        {script && (
          <View style={rp.section}>
            <Text style={rp.secLabel}>// RECOMMENDED MOVE</Text>
            <View style={rp.scriptBlock}>
              <Text style={rp.scriptText}>{script}</Text>
            </View>
          </View>
        )}

        {/* Emotional state */}
        {profile?.last_known_emotional_state && (
          <View style={rp.section}>
            <Text style={rp.secLabel}>// EMOTIONAL STATE</Text>
            <Text style={rp.summaryText}>{profile.last_known_emotional_state}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const rp = StyleSheet.create({
  panel: {
    flex: 0.4,
    backgroundColor: 'rgba(24,24,27,0.6)' as any,
    borderLeftWidth: 0, // left border is ACCENT on container
    flexDirection: 'column',
    position: 'relative' as any,
    overflow: 'hidden' as any,
  },
  glow: {
    position: 'absolute' as any,
    bottom: -60,
    right: -60,
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: 'transparent' as any,
    shadowColor: '#CCFF00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.07,
    shadowRadius: 80,
  },
  header: {
    height: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#27272A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    flexShrink: 0,
  },
  headerTitle: {
    fontFamily: DECODE_MONO as any,
    fontSize: 9,
    color: '#52525b',
    letterSpacing: 2,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#CCFF00' },
  liveText: { fontFamily: DECODE_MONO as any, fontSize: 8, color: '#52525b', letterSpacing: 2 },
  empty: { padding: 32, alignItems: 'center', gap: 10, marginTop: 40 },
  emptyTitle: { fontFamily: DECODE_MONO as any, fontSize: 10, color: '#3f3f46', letterSpacing: 3 },
  emptySub: { fontFamily: DECODE_MONO as any, fontSize: 9, color: '#3f3f46', letterSpacing: 1, textAlign: 'center', lineHeight: 16 },
  section: {
    borderBottomWidth: 1,
    borderBottomColor: '#27272A',
    padding: 14,
    paddingHorizontal: 16,
  },
  secLabel: {
    fontFamily: DECODE_MONO as any,
    fontSize: 8,
    color: '#CCFF00',
    letterSpacing: 2,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(39,39,42,0.5)',
  },
  rowKey: { fontFamily: DECODE_MONO as any, fontSize: 8, color: '#a1a1aa', letterSpacing: 1, flex: 0.45 },
  rowVal: { fontFamily: DECODE_MONO as any, fontSize: 9, color: '#fafafa', fontWeight: '500', flex: 0.55 },
  bulletRow: { flexDirection: 'row', gap: 8, marginBottom: 5 },
  bullet: { fontFamily: DECODE_MONO as any, fontSize: 9, color: '#CCFF00' },
  bulletText: { fontFamily: DECODE_MONO as any, fontSize: 9, color: '#a1a1aa', flex: 1, lineHeight: 14 },
  scriptBlock: {
    borderLeftWidth: 2,
    borderLeftColor: '#CCFF00',
    paddingLeft: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(204,255,0,0.03)' as any,
  },
  scriptText: { fontFamily: DECODE_MONO as any, fontSize: 11, color: '#fafafa', lineHeight: 18, fontStyle: 'italic' },
  summaryText: { fontFamily: DECODE_MONO as any, fontSize: 10, color: '#a1a1aa', lineHeight: 16 },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

const DARKO_ALERT_BODIES: Record<string, string> = {
  SILENCE_WINDOW: 'Re-engagement window detected. Target silence threshold for this phase has been crossed.',
  ADVANCEMENT_SIGNAL: 'Target showing advancement signals in the arc. Strike while momentum holds — do not wait.',
  MISTAKE_FOLLOWUP: 'Last decode flagged operative errors. Course correction required before your next move.',
  RE_ENGAGEMENT: 'Target silence extending past threshold. The window is closing — act now or lose the frame.',
};

export default function DecodeScreen() {
  const { targetId, targetName, darkoAlert } = useLocalSearchParams<{ targetId: string; targetName: string; darkoAlert?: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = Platform.OS === 'web' && width >= 1024;
  const isWebMobile = Platform.OS === 'web' && width < 1024;

  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [currentPhase, setCurrentPhase] = useState(1);
  const [phaseUnlocking, setPhaseUnlocking] = useState<number | null>(null);
  const pendingResultRef = useRef<{ newPhase: number } | null>(null);

  const [profile, setProfile] = useState<TargetProfile | null>(null);
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<{ base64: string; mimeType: string; uri: string } | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSecondsLeft, setRecordingSecondsLeft] = useState(60);
  const [maxDurationReached, setMaxDurationReached] = useState(false);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [transcribing, setTranscribing] = useState(false);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [dossierOpen, setDossierOpen] = useState(false);
  const [dossierEverOpened, setDossierEverOpened] = useState(false);
  const [dossierLoading, setDossierLoading] = useState(false);

  const [campaignBriefOpen, setCampaignBriefOpen] = useState(false);
  const [briefSubmitting, setBriefSubmitting] = useState(false);

  const [paywallVisible, setPaywallVisible] = useState(false);
  const [paywallReason, setPaywallReason] = useState('');
  const [lastDarkoScripts, setLastDarkoScripts] = useState<string[]>([]);
  const { tier } = useUser();

  const showPaywall = (reason: string) => {
    setPaywallReason(reason);
    setPaywallVisible(true);
  };

  const [loading, setLoading] = useState(false);
  const [loaderText, setLoaderText] = useState(LOADER_MESSAGES[0]);
  const [error, setError] = useState<string | null>(null);
  const [targetLeverage, setTargetLeverage] = useState<string | undefined>();
  const [targetObjective, setTargetObjective] = useState<string | undefined>();

  const flatListRef = useRef<FlatList>(null);
  const webScrollRef = useRef<ScrollView>(null);
  const recordPulse = useRef(new Animated.Value(1)).current;
  const [cmdFocused, setCmdFocused] = useState(false);
  const [sendHovered, setSendHovered] = useState(false);
  const cancelStreamRef = useRef<(() => void) | null>(null);

  // ── Unmount — cancel any in-flight stream ───────────────────────────────────

  useEffect(() => {
    return () => {
      cancelStreamRef.current?.();
    };
  }, []);

  // ── Mount ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!targetId) return;
    (async () => {
      const [msgs, storedPhase, tgt, prof] = await Promise.all([
        getConversation(targetId),
        getMissionPhase(targetId),
        getTarget(targetId),
        getTargetProfile(targetId),
      ]);

      const userMsgCount = msgs.filter((m) => m.role === 'user').length;
      const computedPhase = computePhase(userMsgCount);
      const effectivePhase = Math.max(storedPhase, computedPhase);
      setCurrentPhase(effectivePhase);

      const chatMsgs = conversationToChatMsgs(msgs);

      // If navigated from a push notification, inject DARKO alert as newest message
      if (darkoAlert) {
        const alertBody = DARKO_ALERT_BODIES[darkoAlert] ?? 'Proactive alert from DARKO handler.';
        const alertMsg: ChatMsg = {
          id: 'darko_push_alert_' + Date.now(),
          type: 'darko',
          response: {
            text: `Operative — ${alertBody}`,
            scripts: [],
            alerts: [alertBody],
            phaseUpdate: null,
            reads: [],
            isCampaign: false,
          },
          timestamp: new Date().toISOString(),
        };
        chatMsgs.push(alertMsg);
      }

      setChatMessages(chatMsgs);
      if (tgt) {
        setTargetLeverage(tgt.leverage);
        setTargetObjective(tgt.objective);
      }
      if (prof) setProfile(prof);
    })();
  }, [targetId]);

  // ── Loader cycling ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!loading) return;
    let idx = 0;
    const iv = setInterval(() => {
      idx = (idx + 1) % LOADER_MESSAGES.length;
      setLoaderText(LOADER_MESSAGES[idx]);
    }, 800);
    return () => clearInterval(iv);
  }, [loading]);

  // ── Recording pulse ────────────────────────────────────────────────────────

  useEffect(() => {
    if (isRecording) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(recordPulse, { toValue: 1.3, duration: 500, useNativeDriver: true }),
          Animated.timing(recordPulse, { toValue: 1, duration: 500, useNativeDriver: true }),
        ]),
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      recordPulse.setValue(1);
    }
  }, [isRecording]);

  // ── Phase unlock complete ──────────────────────────────────────────────────

  const handlePhaseUnlockComplete = useCallback(() => {
    pendingResultRef.current = null;
    setPhaseUnlocking(null);
  }, []);

  // ── Image picker ───────────────────────────────────────────────────────────

  const handlePickImage = () => {
    if (tier === 'free') {
      showPaywall('Screenshot analysis requires DARKO PRO.');
      return;
    }

    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          const [header, base64] = dataUrl.split(',');
          const mimeType = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg';
          setSelectedImage({ base64, mimeType, uri: dataUrl });
        };
        reader.readAsDataURL(file);
      };
      input.click();
      return;
    }

    // Native
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Photo library access required.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], base64: true, quality: 0.4, exif: false });
      if (!res.canceled && res.assets[0]) {
        const a = res.assets[0];
        setSelectedImage({ base64: a.base64!, mimeType: a.mimeType ?? 'image/jpeg', uri: a.uri });
      }
    })();
  };

  // ── Voice recorder ─────────────────────────────────────────────────────────

  const handleMicPress = async () => {
    if (tier === 'free') {
      showPaywall('Voice input requires DARKO PRO.');
      return;
    }
    if (isRecording) await stopRecording();
    else await startRecording();
  };

  const startRecording = async () => {
    try {
      const { granted } = await AudioModule.requestRecordingPermissionsAsync();
      if (!granted) { Alert.alert('Permission needed', 'Microphone access required.'); return; }
      await AudioModule.setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setIsRecording(true);
      setMaxDurationReached(false);
      setRecordingSecondsLeft(60);
      let secondsLeft = 60;
      recordingTimerRef.current = setInterval(() => {
        secondsLeft -= 1;
        setRecordingSecondsLeft(secondsLeft);
        if (secondsLeft <= 0) {
          clearInterval(recordingTimerRef.current!);
          recordingTimerRef.current = null;
          setMaxDurationReached(true);
          stopRecording();
        }
      }, 1000);
    } catch (err) {
      console.error('[DARKO] Recording start error:', err);
    }
  };

  const stopRecording = async () => {
    try {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      setIsRecording(false);
      await recorder.stop();
      await AudioModule.setAudioModeAsync({ allowsRecording: false });
      const uri = recorder.uri;
      if (!uri) { Alert.alert('Recording error', 'No audio file. Try again.'); return; }
      setTranscribing(true);
      let base64: string;
      try {
        await new Promise((resolve) => setTimeout(resolve, 500));
        const response = await fetch(uri);
        if (!response.ok) throw new Error(`fetch failed: ${response.status}`);
        const blob = await response.blob();
        base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = () => reject(new Error('FileReader failed'));
          reader.readAsDataURL(blob);
        });
      } catch {
        setTranscribing(false);
        Alert.alert('Recording error', 'Could not read audio. Try again.');
        return;
      }
      const transcribed = await transcribeAudio(base64, 'audio/m4a');
      setTranscribing(false);
      if (transcribed) setInputText(transcribed);
      else Alert.alert('Transcription failed', 'Could not transcribe. Try again.');
    } catch (err) {
      setIsRecording(false);
      setTranscribing(false);
      Alert.alert('Recording error', 'Something went wrong.');
    }
  };

  // ── Send message ───────────────────────────────────────────────────────────

  const handleSend = async () => {
    if (loading || phaseUnlocking || (!inputText.trim() && !selectedImage)) return;

    // Daily message gate — count today's user messages in this conversation
    const todayStr = new Date().toDateString();
    const todayUserMsgs = chatMessages.filter(
      (m) => m.type === 'user' && new Date(m.timestamp).toDateString() === todayStr,
    ).length;
    const msgLimit = TIER_LIMITS[tier].messagesPerTargetPerDay;
    if (todayUserMsgs >= msgLimit) {
      showPaywall(
        tier === 'free'
          ? `Free tier allows ${msgLimit} messages per target per day. Upgrade for more.`
          : `Daily message limit reached (${msgLimit}). Upgrade to Executive for unlimited access.`,
      );
      return;
    }

    setLoading(true);
    setError(null);
    setLoaderText(LOADER_MESSAGES[0]);

    const msgId = Date.now().toString();
    const inputSnapshot = inputText.trim();
    const imageSnapshot = selectedImage;
    setInputText('');
    setSelectedImage(null);

    const userContent = inputSnapshot || '[ image input ]';

    // Persist user message
    await saveMessage(targetId, 'user', userContent);

    // Add user bubble optimistically
    const userMsg: ChatMsg = {
      id: msgId + '_u',
      type: 'user',
      text: userContent,
      imageUri: imageSnapshot?.uri,
      timestamp: new Date().toISOString(),
    };
    setChatMessages((prev) => [...prev, userMsg]);
    setTimeout(() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true }), 50);

    // Add streaming DARKO bubble placeholder
    const darkoMsgId = msgId + '_d';
    const streamingMsg: ChatMsg = {
      id: darkoMsgId,
      type: 'darko',
      response: { text: '', scripts: [], alerts: [], phaseUpdate: null, reads: [], isCampaign: false },
      isStreaming: true,
      streamText: '',
      timestamp: new Date().toISOString(),
    };
    setChatMessages((prev) => [...prev, streamingMsg]);

    cancelStreamRef.current = sendMessage(
      {
        message: inputSnapshot,
        targetId,
        leverage: targetLeverage,
        objective: targetObjective,
        missionPhase: currentPhase,
        targetCommunicationStyle: profile?.target_communication_style,
        imageBase64: imageSnapshot?.base64,
        imageMimeType: imageSnapshot?.mimeType,
      },
      // onChunk — update streaming bubble with accumulated text
      (accumulatedText) => {
        setChatMessages((prev) =>
          prev.map((m) =>
            m.id === darkoMsgId ? { ...m, streamText: accumulatedText } : m,
          ),
        );
        flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
      },
      // onComplete — upgrade streaming bubble to full render
      async (darkoResponse) => {
        setLoading(false);

        // Persist DARKO response
        await saveMessage(targetId, 'darko', darkoResponse.text, {
          scripts: darkoResponse.scripts.filter(Boolean),
          alerts: darkoResponse.alerts.filter(Boolean),
          phaseUpdate: darkoResponse.phaseUpdate,
          reads: darkoResponse.reads.filter(Boolean),
        });

        setChatMessages((prev) =>
          prev.map((m) =>
            m.id === darkoMsgId
              ? { ...m, response: darkoResponse, isStreaming: false, streamText: undefined }
              : m,
          ),
        );

        // Update right panel scripts
        if (darkoResponse.scripts?.length) {
          setLastDarkoScripts(darkoResponse.scripts.filter(Boolean));
        }

        // Phase update
        if (darkoResponse.phaseUpdate && darkoResponse.phaseUpdate > currentPhase) {
          const newPhase = darkoResponse.phaseUpdate;
          setCurrentPhase(newPhase);
          saveMissionPhase(targetId, newPhase);
          pendingResultRef.current = { newPhase };
          setPhaseUnlocking(newPhase);
        }

        setTimeout(() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true }), 80);
      },
      // onError
      (errMsg) => {
        setLoading(false);
        setChatMessages((prev) => prev.filter((m) => m.id !== darkoMsgId));
        let display: string;
        if (errMsg.startsWith('RATE LIMIT')) {
          display = '// ' + errMsg.slice(0, 60).toLowerCase() + '...';
        } else if (errMsg === 'Not authenticated' || errMsg === 'UNAUTHORIZED' || errMsg.toLowerCase().includes('jwt')) {
          display = '// session expired — sign out and back in';
        } else if (errMsg.toLowerCase().includes('unavailable') || errMsg.toLowerCase().includes('timed out')) {
          display = '// engine busy — tap to retry';
        } else {
          display = '// signal lost';
        }
        setError(display);
      },
    );
  };

  // ── Dossier ────────────────────────────────────────────────────────────────

  const openDossier = useCallback(async () => {
    if (tier === 'free') {
      showPaywall('// DOSSIER requires DARKO PRO. Full psychological profiling is a Pro feature.');
      return;
    }
    setDossierEverOpened(true);
    setDossierOpen(true);
    const isStale =
      !profile?.generatedAt ||
      !profile?.strengths ||
      Date.now() - new Date(profile.generatedAt).getTime() > 3600000;
    if (isStale) {
      const history = await getConversation(targetId, 30);
      if (history.length > 0) {
        setDossierLoading(true);
        const newProfile = await generateTargetProfile(history, targetLeverage, targetObjective);
        if (newProfile) {
          saveTargetProfile(targetId, newProfile);
          setProfile(newProfile);
        }
        setDossierLoading(false);
      }
    }
  }, [profile, targetId, targetLeverage, targetObjective]);

  const closeDossier = useCallback(() => setDossierOpen(false), []);

  // ── Campaign brief ──────────────────────────────────────────────────────────

  const handleSubmitBrief = useCallback(async (briefContent: string) => {
    setCampaignBriefOpen(false);
    setBriefSubmitting(true);
    setLoading(true);
    setError(null);
    setLoaderText('> ANALYZING CAMPAIGN BRIEF...');

    const msgId = Date.now().toString();
    const briefMessage = `CAMPAIGN BRIEF REQUEST:\n${briefContent}`;

    // Persist user message
    await saveMessage(targetId, 'user', '// CAMPAIGN BRIEF SUBMITTED', null, 'campaign_brief');

    const userMsg: ChatMsg = {
      id: msgId + '_u',
      type: 'user',
      text: '// CAMPAIGN BRIEF SUBMITTED',
      timestamp: new Date().toISOString(),
    };
    setChatMessages((prev) => [...prev, userMsg]);
    setTimeout(() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true }), 50);

    const darkoMsgId = msgId + '_d';
    const streamingMsg: ChatMsg = {
      id: darkoMsgId,
      type: 'darko',
      response: { text: '', scripts: [], alerts: [], phaseUpdate: null, reads: [], isCampaign: false },
      isStreaming: true,
      streamText: '',
      timestamp: new Date().toISOString(),
    };
    setChatMessages((prev) => [...prev, streamingMsg]);

    cancelStreamRef.current = sendMessage(
      {
        message: briefMessage,
        targetId,
        leverage: targetLeverage,
        objective: targetObjective,
        missionPhase: currentPhase,
        targetCommunicationStyle: profile?.target_communication_style,
      },
      (accumulatedText) => {
        setChatMessages((prev) =>
          prev.map((m) => m.id === darkoMsgId ? { ...m, streamText: accumulatedText } : m),
        );
      },
      async (darkoResponse) => {
        setLoading(false);
        setBriefSubmitting(false);
        await saveMessage(targetId, 'darko', darkoResponse.text, {
          scripts: darkoResponse.scripts.filter(Boolean),
          alerts: darkoResponse.alerts.filter(Boolean),
        }, 'campaign_brief');
        setChatMessages((prev) =>
          prev.map((m) =>
            m.id === darkoMsgId
              ? { ...m, response: darkoResponse, isStreaming: false, streamText: undefined }
              : m,
          ),
        );
        setTimeout(() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true }), 80);
      },
      (errMsg) => {
        setLoading(false);
        setBriefSubmitting(false);
        setChatMessages((prev) => prev.filter((m) => m.id !== darkoMsgId));
        setError('// campaign brief failed — retry');
      },
    );
  }, [targetId, targetLeverage, targetObjective, currentPhase, profile]);

  // ── Long press copy ────────────────────────────────────────────────────────

  const handleDarkoBubbleLongPress = useCallback(async (msg: Extract<ChatMsg, { type: 'darko' }>) => {
    const { response } = msg;
    const lines: string[] = [response.text ?? ''];
    if (response.scripts.length > 0) {
      response.scripts.forEach((s, i) => {
        lines.push(`\n// SCRIPT ${String(i + 1).padStart(2, '0')}\n${s}`);
      });
    }
    await Clipboard.setStringAsync(lines.join('\n'));
    Alert.alert('COPIED', 'Intelligence copied to clipboard.');
  }, []);

  // ── Render item ────────────────────────────────────────────────────────────

  const renderItem = useCallback(({ item }: { item: ChatMsg }) => {
    if (item.type === 'user') {
      return <UserBubble msg={item} />;
    }
    if (item.type === 'darko') {
      return <DarkoBubble msg={item} onLongPress={() => handleDarkoBubbleLongPress(item)} />;
    }
    return null;
  }, [handleDarkoBubbleLongPress]);

  const canSend = (!!inputText.trim() || !!selectedImage) && !loading && !phaseUnlocking;

  // ── Render ─────────────────────────────────────────────────────────────────

  // ── Wide web layout (60/40 two-column) ────────────────────────────────────
  if (isWide) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, flexDirection: 'column' }}>
        <StatusBar style="light" />
        <AppNav />
        {/* Two-column workspace */}
        <View style={{ flex: 1, flexDirection: 'row', overflow: 'hidden' as any }}>
          {/* Left 60% — chat */}
          <View style={{ flex: 0.6, flexDirection: 'column', borderRightWidth: 1, borderRightColor: ACCENT }}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerTopRow}>
                <TouchableOpacity onPress={() => router.push('/targets' as any)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                  <Text style={styles.backBtn}>← TARGETS</Text>
                </TouchableOpacity>
                <View style={{ flexDirection: 'row', gap: 16 }}>
                  <TouchableOpacity
                    onPress={() => {
                      if (tier === 'free') { showPaywall('// BRIEF campaign planning requires DARKO PRO.'); return; }
                      setCampaignBriefOpen(true);
                    }}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <Text style={styles.dossierToggleBtn}>// BRIEF</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={styles.targetTitle}>{(targetName ?? '').toUpperCase()}</Text>
            </View>
            <PhaseBar phase={currentPhase} />
            <View style={styles.phaseLabelRow}>
              <Text style={styles.phaseLabelText}>{'PHASE ' + currentPhase + ' — ' + (PHASE_NAMES[currentPhase] ?? '')}</Text>
            </View>
            <View style={styles.divider} />
            {/* Chat */}
            <ScrollView
              ref={webScrollRef}
              style={{ flex: 1 }}
              contentContainerStyle={styles.chatContent}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => (webScrollRef.current as any)?.scrollToEnd({ animated: false })}
            >
              {chatMessages.length === 0 && !loading ? (
                <View style={styles.emptyChat}>
                  <Text style={styles.emptyChatText}>// OPERATIVE ONLINE</Text>
                  <Text style={styles.emptyChatSubtext}>&gt; BRIEF DARKO ON THE TARGET. BEGIN RECONNAISSANCE.</Text>
                </View>
              ) : null}
              {chatMessages.map((item) => (
                item.type === 'user'
                  ? <UserBubble key={item.id} msg={item} />
                  : <DarkoBubble key={item.id} msg={item} onLongPress={() => handleDarkoBubbleLongPress(item)} />
              ))}
              {loading && !chatMessages.some((m) => m.type === 'darko' && (m as any).isStreaming) && (
                <LoadingBubble text={loaderText} />
              )}
            </ScrollView>
            {/* Input */}
            <KeyboardAvoidingView behavior={undefined}>
              <View style={styles.inputArea}>
                {error && <Text style={styles.errorText}>{error}</Text>}
                {selectedImage && (
                  <View style={styles.imageThumbnailRow}>
                    <Image source={{ uri: selectedImage.uri }} style={styles.imageThumbnail} />
                    <TouchableOpacity onPress={() => setSelectedImage(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Text style={styles.imageRemoveText}>✕</Text>
                    </TouchableOpacity>
                    <Text style={styles.imageLabel}>screenshot attached</Text>
                  </View>
                )}
                {transcribing && <Text style={styles.transcribingText}>&gt; TRANSCRIBING AUDIO...</Text>}
                <View style={[styles.cmdRow, cmdFocused && styles.cmdRowFocused]}>
                  <Text style={styles.cmdPrefix}>CMD &gt;</Text>
                  <TextInput
                    style={styles.cmdInput}
                    value={inputText}
                    onChangeText={setInputText}
                    placeholder={selectedImage ? 'add context...' : '// talk to darko'}
                    placeholderTextColor={BORDER}
                    multiline
                    scrollEnabled
                    returnKeyType="send"
                    onSubmitEditing={canSend ? handleSend : undefined}
                    blurOnSubmit={false}
                    onFocus={() => setCmdFocused(true)}
                    onBlur={() => setCmdFocused(false)}
                  />
                </View>
                <View style={styles.actionRow}>
                  <TouchableOpacity style={styles.iconButton} onPress={handlePickImage} disabled={loading}>
                    <Text style={styles.iconButtonText}>📷</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.iconButton, isRecording && styles.iconButtonRecording]} onPress={handleMicPress} disabled={loading || transcribing}>
                    <Animated.Text style={[styles.iconButtonText, isRecording && { color: RECORD_RED }]}>🎤</Animated.Text>
                  </TouchableOpacity>
                  {isRecording && (
                    <Text style={styles.recordingLabel}>{'// REC ' + Math.floor(recordingSecondsLeft / 60) + ':' + String(recordingSecondsLeft % 60).padStart(2, '0')}</Text>
                  )}
                  <TouchableOpacity
                    style={[styles.decodeButton, !canSend && styles.decodeButtonDisabled, sendHovered && canSend && styles.decodeButtonHovered]}
                    onPress={handleSend}
                    activeOpacity={0.85}
                    disabled={!canSend}
                    {...({ onMouseEnter: () => setSendHovered(true), onMouseLeave: () => setSendHovered(false) } as any)}
                  >
                    <Text style={styles.decodeButtonText}>{loading ? 'SENDING...' : 'DECODE'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>

          {/* Right 40% — live dossier */}
          <WebRightPanel
            profile={profile}
            lastScripts={lastDarkoScripts}
            targetName={targetName ?? ''}
            phase={currentPhase}
          />
        </View>
        <AppStatusBar />

        {/* Overlays */}
        {phaseUnlocking !== null && <PhaseUnlockOverlay phase={phaseUnlocking} onComplete={handlePhaseUnlockComplete} />}
        <CampaignBriefModal visible={campaignBriefOpen} submitting={briefSubmitting} onSubmit={handleSubmitBrief} onClose={() => setCampaignBriefOpen(false)} />
        <PaywallModal visible={paywallVisible} onClose={() => setPaywallVisible(false)} reason={paywallReason} />
      </View>
    );
  }

  // ── Narrow / native layout ─────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: BG, flexDirection: 'column' }}>
      {isWebMobile && <AppNav />}
    <View style={[styles.root, Platform.OS === 'web' && styles.webColumn]}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={styles.backBtn}>← TARGETS</Text>
            </TouchableOpacity>
            <View style={styles.betaBadge}>
              <Text style={styles.betaBadgeText}>BETA v1.0</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <TouchableOpacity
              onPress={() => {
                if (tier === 'free') {
                  showPaywall('// BRIEF campaign planning requires DARKO PRO.');
                  return;
                }
                setCampaignBriefOpen(true);
              }}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={styles.dossierToggleBtn}>// BRIEF</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={openDossier} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={styles.dossierToggleBtn}>// DOSSIER</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.targetTitle}>{(targetName ?? '').toUpperCase()}</Text>
      </View>

      {/* Phase bar */}
      <PhaseBar phase={currentPhase} />

      {/* Phase label */}
      <View style={styles.phaseLabelRow}>
        <Text style={styles.phaseLabelText}>
          {'PHASE ' + currentPhase + ' — ' + (PHASE_NAMES[currentPhase] ?? '')}
        </Text>
      </View>

      <View style={styles.divider} />

      {/* Chat list */}
      {Platform.OS === 'web' ? (
        // Web: plain ScrollView, scroll to bottom on content change
        <ScrollView
          ref={webScrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => (webScrollRef.current as any)?.scrollToEnd({ animated: false })}
        >
          {chatMessages.length === 0 && !loading ? (
            <View style={styles.emptyChat}>
              <Text style={styles.emptyChatText}>// OPERATIVE ONLINE</Text>
              <Text style={styles.emptyChatSubtext}>&gt; BRIEF DARKO ON THE TARGET. BEGIN RECONNAISSANCE.</Text>
            </View>
          ) : null}
          {chatMessages.map((item) => (
            item.type === 'user'
              ? <UserBubble key={item.id} msg={item} />
              : <DarkoBubble key={item.id} msg={item} onLongPress={() => handleDarkoBubbleLongPress(item)} />
          ))}
          {loading && !chatMessages.some((m) => m.type === 'darko' && (m as any).isStreaming) && (
            <LoadingBubble text={loaderText} />
          )}
        </ScrollView>
      ) : (
        // Native: inverted FlatList (newest at bottom)
        <FlatList
          ref={flatListRef}
          data={[...chatMessages].reverse()}
          inverted
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews
          maxToRenderPerBatch={10}
          windowSize={10}
          ListHeaderComponent={loading && !chatMessages.some((m) => m.type === 'darko' && (m as any).isStreaming) ? <LoadingBubble text={loaderText} /> : null}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyChat}>
                <Text style={styles.emptyChatText}>// OPERATIVE ONLINE</Text>
                <Text style={styles.emptyChatSubtext}>&gt; BRIEF DARKO ON THE TARGET. BEGIN RECONNAISSANCE.</Text>
              </View>
            ) : null
          }
        />
      )}

      {/* Input area */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
        <View style={styles.inputArea}>
          {error && <Text style={styles.errorText}>{error}</Text>}

          {selectedImage && (
            <View style={styles.imageThumbnailRow}>
              <Image source={{ uri: selectedImage.uri }} style={styles.imageThumbnail} />
              <TouchableOpacity onPress={() => setSelectedImage(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.imageRemoveText}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.imageLabel}>screenshot attached</Text>
            </View>
          )}

          {maxDurationReached && !transcribing && (
            <Text style={styles.maxDurationText}>// max duration reached</Text>
          )}
          {transcribing && <Text style={styles.transcribingText}>&gt; TRANSCRIBING AUDIO...</Text>}

          {/* CMD input row */}
          <View style={[styles.cmdRow, cmdFocused && styles.cmdRowFocused]}>
            <Text style={styles.cmdPrefix}>CMD &gt;</Text>
            <TextInput
              style={styles.cmdInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder={selectedImage ? 'add context...' : '// talk to darko'}
              placeholderTextColor={BORDER}
              multiline={true}
              scrollEnabled={true}
              returnKeyType="send"
              onSubmitEditing={canSend ? handleSend : undefined}
              blurOnSubmit={false}
              onFocus={() => setCmdFocused(true)}
              onBlur={() => setCmdFocused(false)}
            />
          </View>

          {/* Action row */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={handlePickImage}
              disabled={loading}
              {...(Platform.OS === 'web' ? { title: 'Attach screenshot' } as any : {})}
            >
              <Text style={styles.iconButtonText}>📷</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.iconButton, isRecording && styles.iconButtonRecording]}
              onPress={handleMicPress}
              disabled={loading || transcribing}
              {...(Platform.OS === 'web' ? { title: isRecording ? 'Stop recording' : 'Record voice' } as any : {})}
            >
              <Animated.Text
                style={[
                  styles.iconButtonText,
                  isRecording && { color: RECORD_RED, transform: [{ scale: recordPulse }] },
                ]}
              >
                🎤
              </Animated.Text>
            </TouchableOpacity>

            {isRecording && (
              <Text style={styles.recordingLabel}>
                {'// REC ' + Math.floor(recordingSecondsLeft / 60) + ':' + String(recordingSecondsLeft % 60).padStart(2, '0')}
              </Text>
            )}

            <TouchableOpacity
              style={[
                styles.decodeButton,
                !canSend && styles.decodeButtonDisabled,
                Platform.OS === 'web' && sendHovered && canSend && styles.decodeButtonHovered,
              ]}
              onPress={handleSend}
              activeOpacity={0.85}
              disabled={!canSend}
              {...(Platform.OS === 'web' ? {
                onMouseEnter: () => setSendHovered(true),
                onMouseLeave: () => setSendHovered(false),
              } as any : {})}
            >
              <Text style={styles.decodeButtonText}>{loading ? 'SENDING...' : 'SEND'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Phase unlock overlay */}
      {phaseUnlocking !== null && (
        <PhaseUnlockOverlay phase={phaseUnlocking} onComplete={handlePhaseUnlockComplete} />
      )}

      {/* Dossier panel */}
      {dossierEverOpened && (
        <DossierPanel
          visible={dossierOpen}
          onClose={closeDossier}
          loading={dossierLoading}
          targetName={targetName ?? ''}
          leverage={targetLeverage}
          objective={targetObjective}
          currentPhase={currentPhase}
          profile={profile}
        />
      )}

      {/* Campaign brief modal */}
      <CampaignBriefModal
        visible={campaignBriefOpen}
        submitting={briefSubmitting}
        onSubmit={handleSubmitBrief}
        onClose={() => setCampaignBriefOpen(false)}
      />

      {/* Paywall */}
      <PaywallModal
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
        reason={paywallReason}
      />
    </View>
      {isWebMobile && <AppStatusBar />}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG, paddingTop: Platform.OS !== 'web' ? 60 : 0 },
  webColumn: { maxWidth: 760, alignSelf: 'center' as const, width: '100%' as any },

  header: { paddingHorizontal: 20, marginBottom: 8 },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  backBtn: { fontFamily: MONO, fontSize: 10, color: TEXT_DIM, letterSpacing: 2 },
  betaBadge: { borderWidth: 1, borderColor: ACCENT, borderRadius: 2, paddingHorizontal: 5, paddingVertical: 2 },
  betaBadgeText: { fontFamily: MONO, fontSize: 8, color: ACCENT, letterSpacing: 1 },
  dossierToggleBtn: { fontFamily: MONO, fontSize: 10, color: TEXT_DIM, letterSpacing: 2 },
  targetTitle: { fontFamily: MONO, fontSize: 22, fontWeight: '700', color: TEXT_PRIMARY, letterSpacing: 4 },

  phaseBarTrack: { height: 2, backgroundColor: BORDER, marginHorizontal: 20 },
  phaseBarFill: { height: 2, backgroundColor: ACCENT },

  phaseLabelRow: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 2 },
  phaseLabelText: { fontFamily: MONO, fontSize: 9, color: TEXT_DIM, letterSpacing: 2 },

  divider: { height: 1, backgroundColor: BORDER, marginHorizontal: 20, marginTop: 10, marginBottom: 0 },

  chatContent: { paddingHorizontal: 16, paddingBottom: 12, paddingTop: 12 },

  emptyChat: { paddingVertical: 60, alignItems: 'center' },
  emptyChatText: { fontFamily: MONO, fontSize: 11, color: TEXT_DIM, letterSpacing: 3, marginBottom: 8 },
  emptyChatSubtext: { fontFamily: MONO, fontSize: 10, color: '#3D3D40', letterSpacing: 2 },

  // ── User bubble ──
  userBubbleContainer: { alignItems: 'flex-end', marginBottom: 8 },
  userBubble: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 0,
    padding: 12,
    maxWidth: '78%',
  },
  userBubbleImage: {
    width: 200,
    height: 150,
    borderRadius: 2,
    marginBottom: 0,
  },
  userBubbleTextWithImage: { marginTop: 8 },
  userBubbleText: { fontFamily: SANS, fontSize: 15, color: TEXT_PRIMARY, lineHeight: 22 },
  userBubbleEdited: {
    fontFamily: MONO,
    fontSize: 9,
    color: TEXT_DIM,
    letterSpacing: 2,
    marginTop: 6,
  },

  // ── DARKO bubble ──
  darkoBubble: {
    backgroundColor: BG,
    borderLeftWidth: 2,
    borderLeftColor: ACCENT,
    borderRadius: 0,
    padding: 14,
    marginBottom: 8,
    marginRight: 20,
  },
  darkoBubbleDivider: { height: 1, backgroundColor: BORDER, marginVertical: 10 },

  missionStatusLabel: {
    fontFamily: MONO,
    fontSize: 10,
    color: TEXT_DIM,
    letterSpacing: 2,
    marginBottom: 2,
  },

  primaryResponse: {
    fontFamily: SANS,
    fontSize: 15,
    color: TEXT_PRIMARY,
    lineHeight: 23,
    marginBottom: 4,
  },
  primaryResponseWarning: {
    fontSize: 16,
    color: '#FF6644',
    lineHeight: 24,
  },
  primaryResponseSilence: {
    color: TEXT_DIM,
    fontStyle: 'italic' as const,
  },
  primaryResponseInterrogation: {
    color: TEXT_PRIMARY,
    fontStyle: 'italic' as const,
  },

  // Streaming cursor
  streamingCursor: { color: ACCENT, fontSize: 16 },

  // Read blocks
  readBlock: {
    backgroundColor: '#0F0F12',
    borderLeftWidth: 2,
    borderLeftColor: TEXT_DIM,
    padding: 10,
    marginTop: 10,
  },
  readLabel: { fontFamily: MONO, fontSize: 9, color: TEXT_DIM, letterSpacing: 2, marginBottom: 4 },
  readText: { fontFamily: SANS, fontSize: 14, color: TEXT_DIM, lineHeight: 20 },

  // Alert blocks
  alertBlock: {
    backgroundColor: '#1A0808',
    borderLeftWidth: 2,
    borderLeftColor: ERROR_RED,
    padding: 10,
    marginTop: 10,
  },
  alertLabel: { fontFamily: MONO, fontSize: 9, color: ERROR_RED, letterSpacing: 2, marginBottom: 4 },
  alertText: { fontFamily: SANS, fontSize: 14, color: ERROR_RED, lineHeight: 20 },

  // Phase update block
  phaseUpdateBlock: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: BORDER },
  phaseUpdateText: { fontFamily: MONO, fontSize: 10, color: ACCENT, letterSpacing: 2 },

  // Scripts
  scriptsContainer: { marginTop: 12 },
  scriptBox: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 0,
    padding: 12,
    marginBottom: 8,
  },
  scriptBoxHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  scriptBoxLabel: { fontFamily: MONO, fontSize: 9, color: TEXT_DIM, letterSpacing: 3 },
  scriptCopyBtn: { fontFamily: SANS, fontSize: 13, color: TEXT_DIM },
  scriptCopyBtnCopied: { color: ACCENT },
  scriptBoxText: { fontFamily: SANS, fontSize: 15, color: TEXT_PRIMARY, lineHeight: 22 },

  // Handler note (kept for style compat)
  handlerNoteBox: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  handlerNoteText: {
    fontFamily: MONO,
    fontSize: 11,
    color: TEXT_DIM,
    lineHeight: 18,
    fontStyle: 'italic' as const,
  },

  // Next directive (kept for style compat)
  nextDirective: {
    fontFamily: MONO,
    fontSize: 11,
    color: TEXT_DIM,
    letterSpacing: 1,
    lineHeight: 18,
  },
  nextDirectiveAccent: {
    fontFamily: MONO,
    fontSize: 11,
    color: ACCENT,
    letterSpacing: 1,
    lineHeight: 18,
  },
  nextProtocol: {
    fontFamily: MONO,
    fontSize: 10,
    color: TEXT_DIM,
    letterSpacing: 1.5,
    marginTop: 2,
  },

  // ── Loading bubble ──
  loaderLine: { fontFamily: MONO, fontSize: 13, color: ACCENT, letterSpacing: 1 },

  // ── Phase overlay ──
  phaseOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
    paddingHorizontal: 30,
  },
  phaseOverlayText: {
    fontFamily: MONO,
    fontSize: 16,
    color: ACCENT,
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 10,
  },
  phaseOverlaySubText: {
    fontFamily: MONO,
    fontSize: 13,
    color: TEXT_DIM,
    letterSpacing: 2,
    textAlign: 'center',
  },

  // ── Input area ──
  inputArea: {
    paddingHorizontal: 20,
    paddingBottom: 36,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    backgroundColor: BG,
  },
  errorText: { fontFamily: MONO, fontSize: 11, color: ERROR_RED, letterSpacing: 2, textAlign: 'center', marginBottom: 8 },

  imageThumbnailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  imageThumbnail: { width: 40, height: 40, borderRadius: 0, borderWidth: 1, borderColor: BORDER },
  imageRemoveText: { fontFamily: MONO, fontSize: 12, color: TEXT_DIM, marginLeft: 8 },
  imageLabel: { fontFamily: MONO, fontSize: 10, color: TEXT_DIM, letterSpacing: 2, marginLeft: 8 },

  transcribingText: { fontFamily: MONO, fontSize: 11, color: ACCENT, letterSpacing: 2, marginBottom: 6 },
  maxDurationText: { fontFamily: MONO, fontSize: 11, color: ERROR_RED, letterSpacing: 2, marginBottom: 6 },

  // ── CMD input row ──
  cmdRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: CARD_BG,
    marginBottom: 10,
    paddingLeft: 10,
  },
  cmdRowFocused: {
    borderColor: ACCENT,
  },
  cmdPrefix: { fontFamily: MONO, fontSize: 13, color: ACCENT, marginRight: 6, paddingTop: 12 },
  cmdInput: {
    flex: 1,
    fontFamily: MONO,
    fontSize: 13,
    color: TEXT_PRIMARY,
    paddingVertical: 12,
    paddingRight: 10,
    minHeight: 44,
    maxHeight: 200,
  },

  // ── Action row ──
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconButton: {
    width: 42,
    height: 42,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 0,
    backgroundColor: CARD_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonRecording: { borderColor: RECORD_RED },
  iconButtonText: { fontSize: 18 },
  recordingLabel: { fontFamily: MONO, fontSize: 9, color: RECORD_RED, letterSpacing: 2 },

  decodeButton: {
    flex: 1,
    backgroundColor: ACCENT,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
  },
  decodeButtonDisabled: { backgroundColor: BORDER },
  decodeButtonHovered: { backgroundColor: '#D4FF00' },
  decodeButtonText: { fontFamily: MONO, fontSize: 12, color: BG, fontWeight: '700', letterSpacing: 3 },

  // ── Dossier panel ──
  dossierBackdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.72)',
    zIndex: 100,
  },
  dossierPanel: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: PANEL_WIDTH,
    backgroundColor: BG,
    borderLeftWidth: 2,
    borderLeftColor: ACCENT,
    zIndex: 101,
  },
  dossierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 14,
  },
  dossierHeaderTitle: {
    fontFamily: MONO,
    fontSize: 11,
    color: ACCENT,
    letterSpacing: 1,
    flex: 1,
    flexWrap: 'wrap',
  },
  dossierCloseBtn: {
    fontFamily: MONO,
    fontSize: 11,
    color: TEXT_DIM,
    letterSpacing: 2,
    marginLeft: 12,
  },
  dossierDivider: { height: 1, backgroundColor: BORDER, marginHorizontal: 16 },
  dossierScroll: { flex: 1 },
  dossierScrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },

  dossierSectionHeader: {
    fontFamily: MONO,
    fontSize: 10,
    color: TEXT_DIM,
    letterSpacing: 2,
    marginTop: 20,
    marginBottom: 8,
  },
  dossierCard: {
    borderLeftWidth: 2,
    borderLeftColor: BORDER,
    backgroundColor: CARD_BG,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  dossierCardTitle: {
    fontFamily: MONO,
    fontSize: 8,
    color: TEXT_DIM,
    letterSpacing: 2,
    marginBottom: 4,
  },
  dossierItem: {
    fontFamily: SANS,
    fontSize: 14,
    color: TEXT_PRIMARY,
    lineHeight: 20,
    marginBottom: 2,
  },
  dossierItemMono: {
    fontFamily: MONO,
    fontSize: 12,
    color: TEXT_PRIMARY,
    letterSpacing: 1,
    marginBottom: 2,
  },
  dossierBriefText: {
    fontFamily: SANS,
    fontSize: 13,
    color: TEXT_DIM,
    lineHeight: 20,
  },
  dossierTimestamp: {
    fontFamily: MONO,
    fontSize: 8,
    color: '#3D3D40',
    letterSpacing: 1,
    marginTop: 20,
    textAlign: 'center',
  },
  dossierLoadingBox: {
    paddingTop: 40,
    alignItems: 'flex-start',
    gap: 10,
  },
  dossierLoadingText: {
    fontFamily: MONO,
    fontSize: 11,
    color: ACCENT,
    letterSpacing: 2,
  },
  dossierLoadingSubtext: {
    fontFamily: MONO,
    fontSize: 11,
    color: TEXT_DIM,
    letterSpacing: 2,
  },

  // ── Campaign brief modal ──
  briefHeader: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    alignItems: 'flex-start',
    gap: 12,
  },
  briefHeaderTitle: {
    fontFamily: MONO,
    fontSize: 13,
    color: ACCENT,
    letterSpacing: 2,
    marginBottom: 6,
  },
  briefHeaderSub: {
    fontFamily: SANS,
    fontSize: 13,
    color: TEXT_DIM,
    lineHeight: 19,
  },
  briefCloseBtn: {
    fontFamily: MONO,
    fontSize: 18,
    color: TEXT_DIM,
    marginTop: 2,
  },
  briefScroll: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  briefFieldBlock: {
    marginBottom: 20,
  },
  briefFieldLabel: {
    fontFamily: MONO,
    fontSize: 9,
    color: ACCENT,
    letterSpacing: 2,
    marginBottom: 8,
  },
  briefFieldInput: {
    fontFamily: SANS,
    fontSize: 15,
    color: TEXT_PRIMARY,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: CARD_BG,
    paddingHorizontal: 12,
    paddingVertical: 10,
    lineHeight: 22,
    textAlignVertical: 'top',
  },
  briefFieldInputSingle: {
    minHeight: 44,
  },
  briefFooter: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  briefSubmitBtn: {
    backgroundColor: ACCENT,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  briefSubmitBtnDisabled: {
    backgroundColor: BORDER,
  },
  briefSubmitText: {
    fontFamily: MONO,
    fontSize: 13,
    fontWeight: '700',
    color: BG,
    letterSpacing: 3,
  },
});
