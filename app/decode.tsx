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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { useAudioRecorder, AudioModule, RecordingPresets } from 'expo-audio';
import * as Clipboard from 'expo-clipboard';
import {
  decodeMessage,
  transcribeAudio,
  generateTargetProfile,
  type DecoderResult,
} from '../services/decoder';
import {
  getHistory,
  addDecodeEntry,
  updateDecodeEntry,
  getTargetProfile,
  saveTargetProfile,
  getTarget,
  getMissionPhase,
  saveMissionPhase,
  type DecodeEntry,
  type TargetProfile,
} from '../services/storage';

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

const LOADER_MESSAGES = [
  '> INTERCEPTING PAYLOAD...',
  '> SCANNING BEHAVIORAL VECTORS...',
  '> CROSS-REFERENCING FRAMEWORK LIBRARY...',
  '> ISOLATING VULNERABILITY...',
  '> COMPILING TACTICAL RESPONSE...',
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

function computePhase(history: DecodeEntry[]): number {
  const count = history.length;
  if (count === 0) return 1;
  if (count >= 20) return 5;
  if (count >= 10) return 4;
  if (count >= 5) return 3;
  if (count >= 2) return 2;
  return 1;
}

// ─── Chat message types ───────────────────────────────────────────────────────

type ChatMsg =
  | { id: string; type: 'user'; text: string; timestamp: string; isEdited?: boolean }
  | { id: string; type: 'darko'; result: DecoderResult; phase: number; timestamp: string };

function historyToChatMsgs(history: DecodeEntry[]): ChatMsg[] {
  const msgs: ChatMsg[] = [];
  history.forEach((entry, idx) => {
    msgs.push({
      id: entry.id + '_u',
      type: 'user',
      text: entry.inputMessage || '[ image / audio input ]',
      timestamp: entry.timestamp,
      isEdited: entry.isEdited,
    });
    msgs.push({
      id: entry.id + '_d',
      type: 'darko',
      result: entry.result,
      phase: computePhase(history.slice(0, idx + 1)),
      timestamp: entry.timestamp,
    });
  });
  return msgs;
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

function UserBubble({
  msg,
  onLongPress,
}: {
  msg: Extract<ChatMsg, { type: 'user' }>;
  onLongPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.userBubbleContainer}
      onLongPress={onLongPress}
      delayLongPress={400}
      activeOpacity={0.9}
    >
      <View style={styles.userBubble}>
        <Text style={styles.userBubbleText}>{msg.text}</Text>
        {msg.isEdited && <Text style={styles.userBubbleEdited}>{'// EDITED'}</Text>}
      </View>
    </TouchableOpacity>
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
  const { result, phase } = msg;
  const phaseName = PHASE_NAMES[phase] ?? 'INITIAL RECONNAISSANCE';
  const rt = result.response_type ?? 'strategic';

  // Border color: red for warnings, accent for everything else
  const bubbleBorderColor = rt === 'warning' ? ERROR_RED : ACCENT;

  // Primary response text style varies by type
  const primaryTextStyle =
    rt === 'warning'
      ? [styles.primaryResponse, styles.primaryResponseWarning]
      : rt === 'silence'
      ? [styles.primaryResponse, styles.primaryResponseSilence]
      : rt === 'interrogation'
      ? [styles.primaryResponse, styles.primaryResponseInterrogation]
      : [styles.primaryResponse];

  const nextProtocol =
    phase < 5
      ? `\uD83D\uDD12 ${PHASE_NAMES[phase + 1]} — STAND BY`
      : 'MAXIMUM CLEARANCE ACTIVE — ALL PROTOCOLS UNLOCKED';

  return (
    <TouchableOpacity
      style={[styles.darkoBubble, { borderLeftColor: bubbleBorderColor }]}
      onLongPress={onLongPress}
      delayLongPress={400}
      activeOpacity={0.9}
    >
      {/* Mission status */}
      <Text style={styles.missionStatusLabel}>
        {result.mission_status || '// ANALYSIS COMPILED'}
      </Text>

      <View style={styles.darkoBubbleDivider} />

      {/* Primary response */}
      <Text style={primaryTextStyle as any}>{result.primary_response}</Text>

      {/* Scripts — only for tactical */}
      {rt === 'tactical' && result.scripts && result.scripts.length > 0 && (
        <View style={styles.scriptsContainer}>
          {result.scripts.map((script: string, i: number) => (
            <ScriptCard key={i} script={script} index={i} />
          ))}
        </View>
      )}

      {/* Handler note — unsolicited observation */}
      {result.handler_note && (
        <View style={styles.handlerNoteBox}>
          <Text style={styles.handlerNoteText}>
            {result.handler_note}
          </Text>
        </View>
      )}

      <View style={styles.darkoBubbleDivider} />

      {/* Next directive */}
      {result.next_directive ? (
        <Text style={rt === 'validation' ? styles.nextDirectiveAccent : styles.nextDirective}>
          {result.next_directive}
        </Text>
      ) : (
        <Text style={styles.nextProtocol}>{'// NEXT PROTOCOL: ' + nextProtocol}</Text>
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
  profile: import('../services/storage').TargetProfile | null;
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

              {/* ── RELATIONSHIP BRIEF (full) ── */}
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

  const [history, setHistory] = useState<DecodeEntry[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [currentPhase, setCurrentPhase] = useState(1);
  const [phaseUnlocking, setPhaseUnlocking] = useState<number | null>(null);
  const pendingResultRef = useRef<{ result: DecoderResult; newPhase: number } | null>(null);

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

  const [editingEntry, setEditingEntry] = useState<{ id: string; text: string } | null>(null);
  const [editText, setEditText] = useState('');

  const [loading, setLoading] = useState(false);
  const [loaderText, setLoaderText] = useState(LOADER_MESSAGES[0]);
  const [error, setError] = useState<string | null>(null);
  const [targetLeverage, setTargetLeverage] = useState<string | undefined>();
  const [targetObjective, setTargetObjective] = useState<string | undefined>();

  const flatListRef = useRef<FlatList>(null);
  const recordPulse = useRef(new Animated.Value(1)).current;

  // ── Mount ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!targetId) return;
    (async () => {
      const [hist, storedPhase, tgt, prof] = await Promise.all([
        getHistory(targetId),
        getMissionPhase(targetId),
        getTarget(targetId),
        getTargetProfile(targetId),
      ]);
      setHistory(hist);
      const computedPhase = computePhase(hist);
      const effectivePhase = Math.max(storedPhase, computedPhase);
      setCurrentPhase(effectivePhase);
      const msgs = historyToChatMsgs(hist);

      // If navigated from a push notification, inject DARKO alert as the newest message
      if (darkoAlert) {
        const alertBody = DARKO_ALERT_BODIES[darkoAlert] ?? 'Proactive alert from DARKO handler.';
        const alertMsg: ChatMsg = {
          id: 'darko_push_alert_' + Date.now(),
          type: 'darko',
          result: {
            response_type: 'warning',
            mission_status: '// DARKO ALERT — ' + darkoAlert.replace(/_/g, ' '),
            primary_response: alertBody,
            scripts: null,
            handler_note: null,
            next_directive: 'Assess the situation and decode your next move.',
            phase_update: null,
          },
          phase: effectivePhase,
          timestamp: new Date().toISOString(),
        };
        msgs.push(alertMsg);
      }

      setChatMessages(msgs);
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
    const pending = pendingResultRef.current;
    pendingResultRef.current = null;
    setPhaseUnlocking(null);
    if (!pending) return;
    setChatMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString() + '_d',
        type: 'darko',
        result: pending.result,
        phase: pending.newPhase,
        timestamp: new Date().toISOString(),
      },
    ]);
    setTimeout(() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true }), 80);
  }, []);

  // ── Image picker ───────────────────────────────────────────────────────────

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Photo library access required.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], base64: true, quality: 0.6 });
    if (!res.canceled && res.assets[0]) {
      const a = res.assets[0];
      setSelectedImage({ base64: a.base64!, mimeType: a.mimeType ?? 'image/jpeg', uri: a.uri });
    }
  };

  // ── Voice recorder ─────────────────────────────────────────────────────────

  const handleMicPress = async () => {
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

  // ── Decode ─────────────────────────────────────────────────────────────────

  const handleDecode = async () => {
    if (loading || phaseUnlocking || (!inputText.trim() && !selectedImage)) return;
    setLoading(true);
    setError(null);
    setLoaderText(LOADER_MESSAGES[0]);

    // Optimistic user bubble
    const msgId = Date.now().toString();
    const userMsg: ChatMsg = {
      id: msgId + '_u',
      type: 'user',
      text: inputText.trim() || '[ image input ]',
      timestamp: new Date().toISOString(),
    };
    setChatMessages((prev) => [...prev, userMsg]);
    setTimeout(() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true }), 50);

    const inputSnapshot = inputText.trim();
    const imageSnapshot = selectedImage;
    setInputText('');
    setSelectedImage(null);

    const result = await decodeMessage({
      text: inputSnapshot || undefined,
      imageBase64: imageSnapshot?.base64,
      imageMimeType: imageSnapshot?.mimeType,
      historyContext: history,
      leverage: targetLeverage,
      objective: targetObjective,
      relationshipBrief: profile?.relationship_brief,
      missionPhase: currentPhase,
    });

    setLoading(false);

    if (!result) {
      setError('// signal lost');
      return;
    }

    // Persist
    const entry: DecodeEntry = {
      id: msgId,
      inputMessage: inputSnapshot,
      result,
      timestamp: new Date().toISOString(),
    };
    await addDecodeEntry(targetId, entry);
    const updatedHistory = await getHistory(targetId);
    setHistory(updatedHistory);

    // Phase advancement check — count-based OR Gemini-suggested OR phase_advance response type
    const countPhase = computePhase(updatedHistory);
    const suggestedPhase = result.phase_update ?? 0;
    const newPhase = Math.max(countPhase, suggestedPhase);
    const phaseAdvanced = newPhase > currentPhase || result.response_type === 'phase_advance';

    if (phaseAdvanced) {
      setCurrentPhase(newPhase);
      saveMissionPhase(targetId, newPhase);
      pendingResultRef.current = { result, newPhase };
      setPhaseUnlocking(newPhase);
    } else {
      setChatMessages((prev) => [
        ...prev,
        {
          id: msgId + '_d',
          type: 'darko',
          result,
          phase: newPhase,
          timestamp: new Date().toISOString(),
        },
      ]);
      setTimeout(() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true }), 80);
    }

    // Profile update every 3 decodes
    if (updatedHistory.length % 3 === 0) {
      const newProfile = await generateTargetProfile(updatedHistory, targetLeverage, targetObjective);
      if (newProfile) {
        saveTargetProfile(targetId, newProfile);
        setProfile(newProfile);
      }
    }
  };

  // ── Dossier ────────────────────────────────────────────────────────────────

  const openDossier = useCallback(async () => {
    setDossierEverOpened(true);
    setDossierOpen(true);
    const isStale =
      !profile?.generatedAt ||
      !profile?.strengths ||
      Date.now() - new Date(profile.generatedAt).getTime() > 3600000;
    if (isStale && history.length > 0) {
      setDossierLoading(true);
      const newProfile = await generateTargetProfile(history, targetLeverage, targetObjective);
      if (newProfile) {
        saveTargetProfile(targetId, newProfile);
        setProfile(newProfile);
      }
      setDossierLoading(false);
    }
  }, [profile, history, targetId, targetLeverage, targetObjective]);

  const closeDossier = useCallback(() => {
    setDossierOpen(false);
  }, []);

  // ── Edit user message ──────────────────────────────────────────────────────

  const handleUserBubbleLongPress = useCallback((msg: Extract<ChatMsg, { type: 'user' }>) => {
    const entryId = msg.id.replace(/_u$/, '');
    setEditingEntry({ id: entryId, text: msg.text });
    setEditText(msg.text);
  }, []);

  const handleEditSave = useCallback(async () => {
    if (!editingEntry || !editText.trim() || loading) return;
    const entryId = editingEntry.id;
    const newText = editText.trim();
    setEditingEntry(null);

    // Optimistic update of user bubble
    setChatMessages((prev) =>
      prev.map((m) =>
        m.id === entryId + '_u' ? { ...m, text: newText, isEdited: true } : m,
      ),
    );

    // History context up to (not including) this entry
    const entryIndex = history.findIndex((e) => e.id === entryId);
    const contextHistory = entryIndex > 0 ? history.slice(0, entryIndex) : [];

    setLoading(true);
    setError(null);
    setLoaderText(LOADER_MESSAGES[0]);

    const result = await decodeMessage({
      text: newText,
      historyContext: contextHistory,
      leverage: targetLeverage,
      objective: targetObjective,
      relationshipBrief: profile?.relationship_brief,
      missionPhase: currentPhase,
    });

    setLoading(false);

    if (!result) {
      setError('// signal lost');
      return;
    }

    // Replace the adjacent DARKO bubble
    setChatMessages((prev) =>
      prev.map((m) =>
        m.id === entryId + '_d' ? { ...m, result, phase: currentPhase } : m,
      ),
    );

    // Persist updated entry
    const updatedEntry: DecodeEntry = {
      id: entryId,
      inputMessage: newText,
      result,
      timestamp: new Date().toISOString(),
      isEdited: true,
    };
    await updateDecodeEntry(targetId, updatedEntry);
    setHistory((prev) => prev.map((e) => (e.id === entryId ? updatedEntry : e)));

    setTimeout(() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true }), 80);
  }, [editingEntry, editText, loading, history, targetId, targetLeverage, targetObjective, profile, currentPhase]);

  // ── Long press copy ────────────────────────────────────────────────────────

  const handleDarkoBubbleLongPress = useCallback(async (msg: Extract<ChatMsg, { type: 'darko' }>) => {
    const { result } = msg;
    const lines: string[] = [
      `[ ${result.mission_status || 'DARKO'} ]`,
      '',
      result.primary_response,
    ];
    if (result.scripts && result.scripts.length > 0) {
      lines.push('');
      result.scripts.forEach((s: string, i: number) => {
        lines.push(`// SCRIPT ${String(i + 1).padStart(2, '0')}`);
        lines.push(s);
      });
    }
    if (result.handler_note) {
      lines.push('', `[ HANDLER NOTE ]: ${result.handler_note}`);
    }
    if (result.next_directive) {
      lines.push('', `> ${result.next_directive}`);
    }
    await Clipboard.setStringAsync(lines.join('\n'));
    Alert.alert('COPIED', 'Intelligence copied to clipboard.');
  }, []);

  // ── Render item ────────────────────────────────────────────────────────────

  const renderItem = useCallback(({ item }: { item: ChatMsg }) => {
    if (item.type === 'user') {
      return <UserBubble msg={item} onLongPress={() => handleUserBubbleLongPress(item)} />;
    }
    if (item.type === 'darko') {
      return <DarkoBubble msg={item} onLongPress={() => handleDarkoBubbleLongPress(item)} />;
    }
    return null;
  }, [handleUserBubbleLongPress, handleDarkoBubbleLongPress]);

  const canDecode = (!!inputText.trim() || !!selectedImage) && !loading && !phaseUnlocking;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.backBtn}>← TARGETS</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={openDossier} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.dossierToggleBtn}>// DOSSIER</Text>
          </TouchableOpacity>
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

      {/* Chat list — inverted so newest at bottom */}
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
        ListHeaderComponent={loading ? <LoadingBubble text={loaderText} /> : null}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyChat}>
              <Text style={styles.emptyChatText}>// OPERATIVE ONLINE</Text>
              <Text style={styles.emptyChatSubtext}>&gt; TARGET ACQUIRED. BEGIN RECONNAISSANCE.</Text>
            </View>
          ) : null
        }
      />

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
          <View style={styles.cmdRow}>
            <Text style={styles.cmdPrefix}>CMD &gt;</Text>
            <TextInput
              style={styles.cmdInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder={selectedImage ? 'add context...' : 'paste message or describe situation...'}
              placeholderTextColor={BORDER}
              multiline={true}
              scrollEnabled={true}
              returnKeyType="send"
              onSubmitEditing={canDecode ? handleDecode : undefined}
              blurOnSubmit={false}
            />
          </View>

          {/* Action row */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.iconButton} onPress={handlePickImage} disabled={loading}>
              <Text style={styles.iconButtonText}>📷</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.iconButton, isRecording && styles.iconButtonRecording]}
              onPress={handleMicPress}
              disabled={loading || transcribing}
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
              style={[styles.decodeButton, !canDecode && styles.decodeButtonDisabled]}
              onPress={handleDecode}
              activeOpacity={0.85}
              disabled={!canDecode}
            >
              <Text style={styles.decodeButtonText}>{loading ? 'DECODING...' : 'DECODE'}</Text>
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

      {/* Edit message modal */}
      <Modal
        visible={!!editingEntry}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingEntry(null)}
      >
        <View style={styles.editModalOverlay}>
          <View style={styles.editModalBox}>
            <Text style={styles.editModalTitle}>{'// EDIT MESSAGE'}</Text>
            <TextInput
              style={styles.editModalInput}
              value={editText}
              onChangeText={setEditText}
              multiline
              autoFocus
              placeholderTextColor={TEXT_DIM}
            />
            <View style={styles.editModalButtons}>
              <TouchableOpacity
                onPress={() => setEditingEntry(null)}
                style={styles.editModalCancelBtn}
              >
                <Text style={styles.editModalCancelText}>{'cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleEditSave}
                style={[styles.editModalSaveBtn, (!editText.trim() || loading) && styles.editModalSaveBtnDisabled]}
                disabled={!editText.trim() || loading}
              >
                <Text style={styles.editModalSaveText}>{loading ? 'decoding...' : 're-decode'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG, paddingTop: 60 },

  header: { paddingHorizontal: 20, marginBottom: 8 },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  backBtn: { fontFamily: MONO, fontSize: 10, color: TEXT_DIM, letterSpacing: 2 },
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

  // Primary response — varies by type
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

  // Scripts (tactical only)
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

  // Handler note
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

  // Next directive
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

  // ── Edit modal ──
  editModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  editModalBox: {
    width: '100%',
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: ACCENT,
    padding: 16,
  },
  editModalTitle: {
    fontFamily: MONO,
    fontSize: 10,
    color: ACCENT,
    letterSpacing: 2,
    marginBottom: 12,
  },
  editModalInput: {
    fontFamily: MONO,
    fontSize: 13,
    color: TEXT_PRIMARY,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: BG,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 80,
    maxHeight: 200,
    marginBottom: 14,
    lineHeight: 20,
  },
  editModalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  editModalCancelBtn: {
    flex: 1,
    height: 42,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editModalCancelText: {
    fontFamily: SANS,
    fontSize: 13,
    color: TEXT_DIM,
  },
  editModalSaveBtn: {
    flex: 1,
    height: 42,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editModalSaveBtnDisabled: {
    backgroundColor: BORDER,
  },
  editModalSaveText: {
    fontFamily: SANS,
    fontSize: 13,
    color: BG,
    fontWeight: '700',
  },
});
