import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Platform,
  Animated,
  KeyboardAvoidingView,
  Image,
  Alert,
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
  1: '[ OPERATIVE ONLINE ] > TARGET ACQUIRED.',
  2: '[ PHASE 2 UNLOCKED ] > BEHAVIORAL PATTERN IDENTIFIED.',
  3: '[ PHASE 3 UNLOCKED ] > PSYCHOLOGICAL PROFILE ESTABLISHED.',
  4: '[ PHASE 4 UNLOCKED ] > FRAME DOMINANCE PROTOCOL ACTIVE.',
  5: '[ PHASE 5 UNLOCKED ] > MAXIMUM INTELLIGENCE CLEARANCE GRANTED.',
};

// ─── Phase computation ────────────────────────────────────────────────────────

function computePhase(history: DecodeEntry[]): number {
  const count = history.length;
  if (count === 0) return 1;
  if (count >= 20) return 5;
  if (count >= 10) return 4;
  const hasHighThreat = history.some((e) => {
    const score = parseFloat(e.result.threat_level);
    return !isNaN(score) && score >= 7.0;
  });
  if (hasHighThreat) return 3;
  if (count >= 2) return 2;
  return 1;
}

// ─── Chat message types ───────────────────────────────────────────────────────

type ChatMsg =
  | { id: string; type: 'user'; text: string; timestamp: string }
  | { id: string; type: 'darko'; result: DecoderResult; phase: number; timestamp: string };

function historyToChatMsgs(history: DecodeEntry[]): ChatMsg[] {
  const msgs: ChatMsg[] = [];
  history.forEach((entry, idx) => {
    msgs.push({
      id: entry.id + '_u',
      type: 'user',
      text: entry.inputMessage || '[ image / audio input ]',
      timestamp: entry.timestamp,
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
  const line1Full = PHASE_UNLOCK_LINE1[phase] ?? `[ PHASE ${phase} UNLOCKED ]`;
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
        <Text style={styles.userBubbleText}>{msg.text}</Text>
      </View>
    </View>
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
  const isDebrief = result.intent === 'full_debrief';
  const isAdvice = result.intent === 'strategic_advice';
  const label1 = isAdvice ? '// STRATEGIC DIRECTIVE 01' : '// OPTION 01';
  const label2 = isAdvice ? '// STRATEGIC DIRECTIVE 02' : '// OPTION 02';
  const nextProtocol =
    phase < 5
      ? `\uD83D\uDD12 ${PHASE_NAMES[phase + 1]} — STAND BY`
      : 'MAXIMUM CLEARANCE ACTIVE — ALL PROTOCOLS UNLOCKED';

  return (
    <TouchableOpacity
      style={styles.darkoBubble}
      onLongPress={onLongPress}
      delayLongPress={400}
      activeOpacity={0.9}
    >
      {/* Mission status header */}
      <Text style={styles.darkoBubbleLabel}>
        {'[ MISSION STATUS ]: '}
        <Text style={{ color: ACCENT }}>
          {'PHASE ' + phase + ' — ' + phaseName}
        </Text>
      </Text>
      <Text style={styles.darkoBubbleLabel}>
        {'[ VALIDATION ]: '}
        <Text style={styles.darkoBubbleBody}>SIGNAL RECEIVED. ANALYSIS COMPILED.</Text>
      </Text>

      <View style={styles.darkoBubbleDivider} />

      {/* Threat level */}
      <Text style={styles.threatLevel}>{result.threat_level}</Text>

      {/* Response content */}
      {isDebrief && result.debrief ? (
        <>
          <Text style={styles.darkoBubbleSectionLabel}>POWER DYNAMIC AUDIT</Text>
          <Text style={styles.darkoBubbleBody}>{result.debrief.power_dynamic_audit}</Text>

          <Text style={[styles.darkoBubbleSectionLabel, { marginTop: 12 }]}>PSYCHOLOGICAL PROFILE</Text>
          <Text style={styles.darkoBubbleBody}>{result.debrief.psychological_profile}</Text>

          <Text style={[styles.darkoBubbleSectionLabel, { marginTop: 12 }]}>CURRENT PHASE</Text>
          <Text style={styles.darkoBubbleBody}>{result.debrief.current_phase}</Text>

          <Text style={[styles.darkoBubbleSectionLabel, { marginTop: 12, color: ERROR_RED }]}>ERRORS MADE</Text>
          {(result.debrief.errors_made ?? []).map((e: string, i: number) => (
            <View key={i} style={styles.directiveRow}>
              <Text style={[styles.directiveBullet, { color: ERROR_RED }]}>&gt;</Text>
              <Text style={[styles.darkoBubbleBody, { color: '#CC4422', flex: 1 }]}>{e}</Text>
            </View>
          ))}

          <Text style={[styles.darkoBubbleSectionLabel, { marginTop: 12 }]}>NEXT MOVE</Text>
          <Text style={[styles.darkoBubbleBody, { color: TEXT_PRIMARY }]}>{result.debrief.next_move}</Text>
        </>
      ) : (
        <>
          <Text style={styles.darkoBubbleSectionLabel}>{label1}</Text>
          <Text style={styles.darkoBubbleBody}>{result.option_1_script}</Text>

          <Text style={[styles.darkoBubbleSectionLabel, { marginTop: 12 }]}>{label2}</Text>
          <Text style={styles.darkoBubbleBody}>{result.option_2_script}</Text>
        </>
      )}

      {/* Psychology block */}
      <View style={styles.psycheBlock}>
        <Text style={styles.darkoBubbleSectionLabel}>PSYCHE ANALYSIS</Text>
        <Text style={styles.darkoBubbleBody}>{result.the_psyche}</Text>

        <Text style={[styles.darkoBubbleSectionLabel, { marginTop: 10 }]}>DIRECTIVES</Text>
        {(result.the_directive ?? []).map((d: string, i: number) => (
          <View key={i} style={styles.directiveRow}>
            <Text style={styles.directiveBullet}>&gt;</Text>
            <Text style={[styles.darkoBubbleBody, { flex: 1 }]}>{d}</Text>
          </View>
        ))}
      </View>

      <View style={styles.darkoBubbleDivider} />

      {/* Next protocol */}
      <Text style={styles.nextProtocol}>
        {'[ NEXT PROTOCOL ]: ' + nextProtocol}
      </Text>
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

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function DecodeScreen() {
  const { targetId, targetName } = useLocalSearchParams<{ targetId: string; targetName: string }>();
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
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [transcribing, setTranscribing] = useState(false);
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
      setChatMessages(historyToChatMsgs(hist));
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
    } catch (err) {
      console.error('[DARKO] Recording start error:', err);
    }
  };

  const stopRecording = async () => {
    try {
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
      setError('[ DECODE FAILED — SIGNAL LOST ]');
      return;
    }

    // Persist
    const entry: DecodeEntry = {
      id: msgId,
      inputMessage: inputSnapshot,
      result,
      timestamp: new Date().toISOString(),
      auto_detected_mode: result.auto_detected_mode,
    };
    await addDecodeEntry(targetId, entry);
    const updatedHistory = await getHistory(targetId);
    setHistory(updatedHistory);

    // Phase advancement check
    const newPhase = computePhase(updatedHistory);
    const phaseAdvanced = newPhase > currentPhase;

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
      const newProfile = await generateTargetProfile(updatedHistory);
      if (newProfile) {
        saveTargetProfile(targetId, newProfile);
        setProfile(newProfile);
      }
    }
  };

  // ── Long press copy ────────────────────────────────────────────────────────

  const handleDarkoBubbleLongPress = useCallback(async (msg: Extract<ChatMsg, { type: 'darko' }>) => {
    const { result } = msg;
    const isDebrief = result.intent === 'full_debrief';
    const text = isDebrief && result.debrief
      ? [
          `THREAT: ${result.threat_level}`,
          '',
          'POWER DYNAMIC AUDIT',
          result.debrief.power_dynamic_audit,
          '',
          'PSYCHOLOGICAL PROFILE',
          result.debrief.psychological_profile,
          '',
          'ERRORS MADE',
          ...(result.debrief.errors_made ?? []).map((e: string) => `  > ${e}`),
          '',
          'NEXT MOVE',
          result.debrief.next_move,
        ].join('\n')
      : [
          `THREAT: ${result.threat_level}`,
          '',
          result.option_1_script,
          '',
          result.option_2_script,
          '',
          result.the_psyche,
          '',
          ...(result.the_directive ?? []).map((d: string) => `  > ${d}`),
        ].join('\n');
    await Clipboard.setStringAsync(text);
    Alert.alert('COPIED', 'Intelligence copied to clipboard.');
  }, []);

  // ── Render item ────────────────────────────────────────────────────────────

  const renderItem = useCallback(({ item }: { item: ChatMsg }) => {
    if (item.type === 'user') return <UserBubble msg={item} />;
    if (item.type === 'darko') {
      return <DarkoBubble msg={item} onLongPress={() => handleDarkoBubbleLongPress(item)} />;
    }
    return null;
  }, [handleDarkoBubbleLongPress]);

  const canDecode = (!!inputText.trim() || !!selectedImage) && !loading && !phaseUnlocking;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.backBtn}>← TARGETS</Text>
        </TouchableOpacity>
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
              <Text style={styles.emptyChatText}>[ OPERATIVE ONLINE ]</Text>
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

            {isRecording && <Text style={styles.recordingLabel}>REC ●</Text>}

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
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG, paddingTop: 60 },

  header: { paddingHorizontal: 20, marginBottom: 8 },
  backBtn: { fontFamily: MONO, fontSize: 10, color: TEXT_DIM, letterSpacing: 2, marginBottom: 8 },
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
  darkoBubbleLabel: {
    fontFamily: MONO,
    fontSize: 10,
    color: TEXT_DIM,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  darkoBubbleSectionLabel: {
    fontFamily: MONO,
    fontSize: 10,
    color: TEXT_DIM,
    letterSpacing: 2,
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  darkoBubbleBody: {
    fontFamily: SANS,
    fontSize: 15,
    color: TEXT_PRIMARY,
    lineHeight: 22,
  },
  darkoBubbleDivider: { height: 1, backgroundColor: BORDER, marginVertical: 10 },

  threatLevel: {
    fontFamily: MONO,
    fontSize: 16,
    fontWeight: '700',
    color: ACCENT,
    letterSpacing: 1,
    marginBottom: 12,
  },

  psycheBlock: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },

  directiveRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 5 },
  directiveBullet: { fontFamily: MONO, fontSize: 11, color: TEXT_DIM, marginRight: 8, marginTop: 2 },

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

  // ── CMD input row ──
  cmdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: CARD_BG,
    marginBottom: 10,
    paddingLeft: 10,
  },
  cmdPrefix: { fontFamily: MONO, fontSize: 13, color: ACCENT, marginRight: 6 },
  cmdInput: {
    flex: 1,
    fontFamily: MONO,
    fontSize: 13,
    color: TEXT_PRIMARY,
    paddingVertical: 12,
    paddingRight: 10,
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
});
