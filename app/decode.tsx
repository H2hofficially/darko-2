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
  Share,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { useAudioRecorder, AudioModule, RecordingPresets } from 'expo-audio';
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
  type DecodeEntry,
  type TargetProfile,
  type MbtiProfile,
} from '../services/storage';

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
  '> CROSS-REFERENCING BEHAVIORAL VECTORS...',
  '> ISOLATING VULNERABILITY...',
  '> COMPILING TACTICAL RESPONSE...',
];

// ─── Typing indicator ────────────────────────────────────────────────────────

function TypingIndicator({ label = 'ANALYZING' }: { label?: string }) {
  const dots = [
    useRef(new Animated.Value(0.15)).current,
    useRef(new Animated.Value(0.15)).current,
    useRef(new Animated.Value(0.15)).current,
  ];

  useEffect(() => {
    const anims = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 180),
          Animated.timing(dot, { toValue: 1, duration: 380, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.15, duration: 380, useNativeDriver: true }),
          Animated.delay((dots.length - i) * 180),
        ]),
      ),
    );
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, []);

  return (
    <View style={styles.typingRow}>
      <Text style={styles.typingLabel}>{label}</Text>
      {dots.map((dot, i) => (
        <Animated.Text key={i} style={[styles.typingDot, { opacity: dot }]}>.</Animated.Text>
      ))}
    </View>
  );
}

// ─── Target profile card ─────────────────────────────────────────────────────

function ProfileCard({ profile, updatingProfile }: { profile: TargetProfile; updatingProfile: boolean }) {
  const [open, setOpen] = useState(true);

  return (
    <View style={styles.profileCard}>
      <TouchableOpacity style={styles.profileHeader} onPress={() => setOpen((v) => !v)} activeOpacity={0.7}>
        <Text style={styles.profileHeaderLabel}>[ TARGET PROFILE ]</Text>
        <Text style={styles.profileChevron}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {updatingProfile && <TypingIndicator label="UPDATING PROFILE" />}

      {open && !updatingProfile && (
        <View style={styles.profileBody}>
          <View style={styles.profileRow}>
            <Text style={styles.profileKey}>ARCHETYPE</Text>
            <Text style={styles.profileValue}>{profile.dominant_archetype}</Text>
          </View>
          <View style={styles.profileRow}>
            <Text style={styles.profileKey}>ATTACHMENT</Text>
            <Text style={styles.profileValue}>{profile.attachment_style}</Text>
          </View>
          <View style={styles.profileRow}>
            <Text style={styles.profileKey}>VULNERABILITY</Text>
            <Text style={[styles.profileValue, { color: ACCENT }]}>{profile.vulnerability_score}</Text>
          </View>
          <View style={styles.profileDivider} />
          <Text style={styles.profileKey}>MANIPULATION PATTERNS</Text>
          {profile.manipulation_patterns.map((p, i) => (
            <View key={i} style={styles.directiveRow}>
              <Text style={styles.directiveBullet}>&gt;</Text>
              <Text style={styles.directiveText}>{p}</Text>
            </View>
          ))}
          <View style={styles.profileDivider} />
          <Text style={styles.profileKey}>BEHAVIORAL SUMMARY</Text>
          <Text style={styles.profileSummary}>{profile.summary}</Text>

          {profile.mbti_profile && (
            <>
              <View style={styles.profileDivider} />
              <Text style={[styles.profileKey, { marginBottom: 10 }]}>MBTI CLASSIFICATION</Text>
              <View style={styles.profileRow}>
                <Text style={styles.profileKey}>TYPE</Text>
                <Text style={[styles.profileValue, styles.mbtiType]}>{profile.mbti_profile.type}</Text>
              </View>
              <View style={styles.profileRow}>
                <Text style={styles.profileKey}>DOMINANT</Text>
                <Text style={styles.profileValue}>{profile.mbti_profile.dominant_function}</Text>
              </View>
              <View style={styles.profileRow}>
                <Text style={styles.profileKey}>SHADOW</Text>
                <Text style={[styles.profileValue, { color: '#AA8800' }]}>{profile.mbti_profile.shadow_function}</Text>
              </View>
              <View style={styles.profileDivider} />
              <Text style={styles.profileKey}>SEDUCTION VULNERABILITY</Text>
              <Text style={[styles.profileSummary, { color: '#CCAA00', marginTop: 6 }]}>
                {profile.mbti_profile.seduction_vulnerability}
              </Text>
            </>
          )}

          <Text style={styles.profileTimestamp}>
            last updated {new Date(profile.generatedAt).toLocaleDateString()}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Debrief section block ────────────────────────────────────────────────────

function DebriefSection({ label, content, accent = false }: { label: string; content: string; accent?: boolean }) {
  return (
    <View style={styles.debriefBlock}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <Text style={[styles.debriefText, accent ? { color: TEXT_PRIMARY } : null]}>{content}</Text>
    </View>
  );
}

// ─── History card ─────────────────────────────────────────────────────────────

const HistoryCard = React.memo(function HistoryCard({ entry, index }: { entry: DecodeEntry; index: number }) {
  const [psycheOpen, setPsycheOpen] = useState(false);
  const { result } = entry;
  const isDebrief = result.intent === 'full_debrief';
  const isAdvice = result.intent === 'strategic_advice';
  const label1 = isAdvice ? '// STRATEGIC DIRECTIVE 01' : '// OPTION 01';
  const label2 = isAdvice ? '// STRATEGIC DIRECTIVE 02' : '// OPTION 02';


  const handleCopy = () => {
    let text: string;
    if (isDebrief && result.debrief) {
      text = [
        `THREAT: ${result.threat_level}`,
        '',
        '// POWER DYNAMIC AUDIT',
        result.debrief.power_dynamic_audit,
        '',
        '// PSYCHOLOGICAL PROFILE',
        result.debrief.psychological_profile,
        '',
        '// ERRORS MADE',
        ...(result.debrief.errors_made ?? []).map((e: string) => `  > ${e}`),
        '',
        '// CURRENT PHASE',
        result.debrief.current_phase,
        '',
        '// NEXT MOVE',
        result.debrief.next_move,
        '',
        'PSYCHE:',
        result.the_psyche,
      ].join('\n');
    } else {
      text = [
        `THREAT: ${result.threat_level}`,
        '',
        label1,
        result.option_1_script,
        '',
        label2,
        result.option_2_script,
        '',
        'PSYCHE:',
        result.the_psyche,
      ].join('\n');
    }
    Share.share({ message: text });
  };

  return (
    <View style={styles.historyCard}>
      <View style={styles.historyCardHeader}>
        <Text style={styles.historyCardLabel}>// STRATEGIC ANALYSIS</Text>
        <TouchableOpacity onPress={handleCopy} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.copyBtn}>COPY</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.historyInput} numberOfLines={3}>{entry.inputMessage || '[ image / audio input ]'}</Text>

      <View style={styles.historyDivider} />

      <Text style={{ color: '#A1A1AA', fontSize: 10, fontFamily: MONO, letterSpacing: 2, marginBottom: 8, textTransform: 'uppercase' }}>
        {`// AUTO-DETECTED: ${entry.auto_detected_mode || 'TACTICAL'}`}
      </Text>

      <Text style={styles.historyThreat}>{result.threat_level}</Text>

      {isDebrief && result.debrief ? (
        <>
          <DebriefSection label="POWER DYNAMIC AUDIT" content={result.debrief.power_dynamic_audit} />
          <DebriefSection label="PSYCHOLOGICAL PROFILE" content={result.debrief.psychological_profile} />
          <DebriefSection label="CURRENT PHASE" content={result.debrief.current_phase} />
          <View style={styles.debriefBlock}>
            <Text style={styles.sectionLabel}>ERRORS MADE</Text>
            {(result.debrief.errors_made ?? []).map((e: string, i: number) => (
              <View key={i} style={styles.directiveRow}>
                <Text style={[styles.directiveBullet, { color: '#FF5533' }]}>&gt;</Text>
                <Text style={[styles.directiveText, { color: '#CC4422' }]}>{e}</Text>
              </View>
            ))}
          </View>
          <DebriefSection label="NEXT MOVE" content={result.debrief.next_move} accent />
        </>
      ) : (
        <>
          <View style={styles.scriptCard}>
            <Text style={styles.scriptTag}>{label1}</Text>
            <Text style={styles.scriptText}>{result.option_1_script}</Text>
          </View>
          <View style={styles.scriptCard}>
            <Text style={styles.scriptTag}>{label2}</Text>
            <Text style={styles.scriptText}>{result.option_2_script}</Text>
          </View>
        </>
      )}

      <TouchableOpacity
        style={styles.psycheToggle}
        onPress={() => setPsycheOpen((v) => !v)}
        activeOpacity={0.7}
      >
        <Text style={styles.psycheToggleText}>
          [ {psycheOpen ? 'HIDE PSYCHOLOGY' : 'VIEW PSYCHOLOGY'} ]
        </Text>
      </TouchableOpacity>

      {psycheOpen && (
        <View style={styles.psychePanel}>
          <Text style={styles.sectionLabel}>PSYCHE ANALYSIS</Text>
          <View style={styles.psycheContainer}>
            <Text style={styles.psycheText}>{result.the_psyche}</Text>
          </View>
          <Text style={[styles.sectionLabel, { marginTop: 14 }]}>DIRECTIVES</Text>
          {result.the_directive.map((d, i) => (
            <View key={i} style={styles.directiveRow}>
              <Text style={styles.directiveBullet}>&gt;</Text>
              <Text style={styles.directiveText}>{d}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}, (prev, next) => prev.entry.id === next.entry.id && prev.index === next.index);

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function DecodeScreen() {
  const { targetId, targetName } = useLocalSearchParams<{
    targetId: string;
    targetName: string;
  }>();
  const router = useRouter();

  const [history, setHistory] = useState<DecodeEntry[]>([]);
  const [profile, setProfile] = useState<TargetProfile | null>(null);
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<{ base64: string; mimeType: string; uri: string } | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [transcribing, setTranscribing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loaderText, setLoaderText] = useState(LOADER_MESSAGES[0]);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [targetLeverage, setTargetLeverage] = useState<string | undefined>();
  const [targetObjective, setTargetObjective] = useState<string | undefined>();

  const flatListRef = useRef<FlatList>(null);
  const recordPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    console.log('[DARKO] decode mount — targetId:', targetId, 'targetName:', targetName);
    if (targetId) {
      getHistory(targetId).then(setHistory);
      getTargetProfile(targetId).then(setProfile);
      getTarget(targetId).then((t) => {
        if (t) {
          setTargetLeverage(t.leverage);
          setTargetObjective(t.objective);
        }
      });
    }
  }, [targetId]);

  // Single-line loader cycling
  useEffect(() => {
    if (!loading) return;
    let idx = 0;
    const iv = setInterval(() => {
      idx = (idx + 1) % LOADER_MESSAGES.length;
      setLoaderText(LOADER_MESSAGES[idx]);
    }, 800);
    return () => clearInterval(iv);
  }, [loading]);

  // Recording pulse animation
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

  // ── Image picker ──────────────────────────────────────────────────────────

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Photo library access is required to analyze screenshots.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      base64: true,
      quality: 0.6,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setSelectedImage({
        base64: asset.base64!,
        mimeType: asset.mimeType ?? 'image/jpeg',
        uri: asset.uri,
      });
    }
  };

  // ── Voice recorder ────────────────────────────────────────────────────────

  const handleMicPress = async () => {
    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  };

  const startRecording = async () => {
    try {
      const { granted } = await AudioModule.requestRecordingPermissionsAsync();
      if (!granted) {
        Alert.alert('Permission needed', 'Microphone access is required for voice input.');
        return;
      }
      await AudioModule.setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setIsRecording(true);
    } catch (err) {
      console.log('[DARKO] Recording start error:', err);
    }
  };

  const stopRecording = async () => {
    try {
      setIsRecording(false);
      await recorder.stop();
      await AudioModule.setAudioModeAsync({ allowsRecording: false });

      const uri = recorder.uri;
      console.log('[DARKO] stopRecording — recorder.uri:', uri);

      if (!uri) {
        console.log('[DARKO] stopRecording — no URI after stop, aborting');
        Alert.alert('Recording error', 'No audio file was created. Try again.');
        return;
      }

      setTranscribing(true);

      let base64: string;
      try {
        await new Promise((resolve) => setTimeout(resolve, 500));

        console.log('[DARKO] stopRecording — reading audio via fetch:', uri);

        const response = await fetch(uri);
        if (!response.ok) throw new Error(`Failed to fetch audio file: ${response.status}`);

        const blob = await response.blob();
        console.log('[DARKO] stopRecording — blob size:', blob.size);

        base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
          };
          reader.onerror = () => reject(new Error('FileReader failed'));
          reader.readAsDataURL(blob);
        });
        console.log('[DARKO] stopRecording — base64 length:', base64.length);
      } catch (fsErr) {
        console.log('[DARKO] stopRecording — file read error:', fsErr);
        setTranscribing(false);
        Alert.alert('Recording error', 'Could not read audio file. Try again.');
        return;
      }

      // Pass platform-appropriate mimeType — HIGH_QUALITY gives .m4a on both platforms
      const mimeType = Platform.OS === 'android' ? 'audio/m4a' : 'audio/m4a';
      const transcribed = await transcribeAudio(base64, mimeType);
      console.log('[DARKO] stopRecording — transcribeAudio returned:', transcribed);
      setTranscribing(false);

      if (transcribed) {
        setInputText(transcribed);
      } else {
        Alert.alert('Transcription failed', 'Could not transcribe audio. Try again.');
      }
    } catch (err) {
      setIsRecording(false);
      setTranscribing(false);
      console.log('[DARKO] stopRecording — outer catch:', err);
      Alert.alert('Recording error', 'Something went wrong. Try again.');
    }
  };

  // ── Decode ─────────────────────────────────────────────────────────────────

  const handleDecode = async () => {
    if (loading || (!inputText.trim() && !selectedImage)) return;
    setLoading(true);
    setError(null);
    setLoaderText(LOADER_MESSAGES[0]);

    const result = await decodeMessage({
      text: inputText.trim() || undefined,
      imageBase64: selectedImage?.base64,
      imageMimeType: selectedImage?.mimeType,
      historyContext: history,
      leverage: targetLeverage,
      objective: targetObjective,
      relationshipBrief: profile?.relationship_brief,
    });

    setLoading(false);

    if (!result) {
      setError('[ DECODE FAILED — SIGNAL LOST ]');
      return;
    }

    const entry: DecodeEntry = {
      id: Date.now().toString(),
      inputMessage: inputText.trim(),
      result,
      timestamp: new Date().toISOString(),
      auto_detected_mode: result.auto_detected_mode,
    };

    await addDecodeEntry(targetId, entry);
    const updated = await getHistory(targetId);
    setHistory(updated);
    setInputText('');
    setSelectedImage(null);

    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    // Regenerate profile every 3 decodes
    if (updated.length % 3 === 0) {
      setUpdatingProfile(true);
      const newProfile = await generateTargetProfile(updated);
      setUpdatingProfile(false);
      if (newProfile) {
        await saveTargetProfile(targetId, newProfile);
        setProfile(newProfile);
      }
    }
  };

  const canDecode = (!!inputText.trim() || !!selectedImage) && !loading;

  const renderHistoryItem = useCallback(
    ({ item, index }: { item: DecodeEntry; index: number }) => (
      <HistoryCard entry={item} index={index} />
    ),
    [],
  );

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.backBtn}>← TARGETS</Text>
        </TouchableOpacity>
        <Text style={styles.targetTitle}>{(targetName ?? '').toUpperCase()}</Text>
      </View>

      <View style={styles.divider} />

      {/* History + profile */}
      <FlatList
        ref={flatListRef}
        data={history}
        keyExtractor={(item) => item.id}
        renderItem={renderHistoryItem}
        contentContainerStyle={styles.historyContent}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={5}
        windowSize={7}
        initialNumToRender={8}
        ListHeaderComponent={
          profile ? (
            <ProfileCard profile={profile} updatingProfile={updatingProfile} />
          ) : updatingProfile ? (
            <View style={styles.profileCard}>
              <TypingIndicator label="BUILDING TARGET PROFILE" />
            </View>
          ) : null
        }
        ListEmptyComponent={
          !profile ? (
            <View style={styles.emptyHistory}>
              <Text style={styles.emptyHistoryText}>NO DECODES YET</Text>
              <Text style={styles.emptyHistorySubtext}>
                profile generates after 3 decodes
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          loading ? (
            <Text style={styles.loaderText}>{loaderText}</Text>
          ) : null
        }
      />

      {/* Input area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <View style={styles.inputArea}>
          {error && <Text style={styles.errorText}>{error}</Text>}

          {/* Image thumbnail */}
          {selectedImage && (
            <View style={styles.imageThumbnailRow}>
              <Image source={{ uri: selectedImage.uri }} style={styles.imageThumbnail} />
              <TouchableOpacity
                style={styles.imageRemove}
                onPress={() => setSelectedImage(null)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.imageRemoveText}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.imageLabel}>screenshot attached</Text>
            </View>
          )}

          {/* Transcribing indicator */}
          {transcribing && <TypingIndicator label="TRANSCRIBING" />}

          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder={
                selectedImage
                  ? 'add context or leave blank...'
                  : 'paste message, describe situation, or use voice...'
              }
              placeholderTextColor={TEXT_DIM}
              multiline
              textAlignVertical="top"
            />
          </View>

          {/* Action row */}
          <View style={styles.actionRow}>
            {/* Camera button */}
            <TouchableOpacity
              style={[styles.iconButton, selectedImage ? styles.iconButtonActive : null]}
              onPress={handlePickImage}
              disabled={loading}
            >
              <Text style={styles.iconButtonText}>
                📷
              </Text>
            </TouchableOpacity>

            {/* Mic button */}
            <TouchableOpacity
              style={[styles.iconButton, isRecording ? styles.iconButtonRecording : null]}
              onPress={handleMicPress}
              disabled={loading || transcribing}
            >
              <Animated.Text
                style={[
                  styles.iconButtonText,
                  isRecording ? { color: RECORD_RED } : null,
                  isRecording ? { transform: [{ scale: recordPulse }] } : null,
                ]}
              >
                🎤
              </Animated.Text>
            </TouchableOpacity>

            {isRecording && <Text style={styles.recordingLabel}>REC ●</Text>}

            {/* Decode button */}
            <TouchableOpacity
              style={[styles.decodeButton, !canDecode && styles.decodeButtonDisabled]}
              onPress={handleDecode}
              activeOpacity={0.85}
              disabled={!canDecode}
            >
              <Text style={styles.decodeButtonText}>{loading ? 'DECODING' : 'DECODE'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG, paddingTop: 60 },

  header: { paddingHorizontal: 20, marginBottom: 4 },
  backBtn: { fontFamily: MONO, fontSize: 10, color: TEXT_DIM, letterSpacing: 2, marginBottom: 8 },
  targetTitle: { fontFamily: MONO, fontSize: 22, fontWeight: '700', color: TEXT_PRIMARY, letterSpacing: 4 },

  divider: { height: 1, backgroundColor: BORDER, marginHorizontal: 20, marginVertical: 16 },

  historyContent: { paddingHorizontal: 20, paddingBottom: 12 },

  emptyHistory: { paddingVertical: 40, alignItems: 'center' },
  emptyHistoryText: { fontFamily: MONO, fontSize: 11, color: TEXT_DIM, letterSpacing: 3 },
  emptyHistorySubtext: { fontFamily: MONO, fontSize: 10, color: '#3D3D40', letterSpacing: 2, marginTop: 6 },

  // ── Profile card ──
  profileCard: {
    backgroundColor: '#0D1A00',
    borderWidth: 1,
    borderColor: '#2A3A00',
    borderRadius: 4,
    padding: 14,
    marginBottom: 16,
    overflow: 'hidden',
    maxWidth: '100%',
  },
  profileHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  profileHeaderLabel: { fontFamily: MONO, fontSize: 10, color: TEXT_DIM, letterSpacing: 3 },
  profileChevron: { fontFamily: MONO, fontSize: 10, color: TEXT_DIM },
  profileBody: { marginTop: 14, overflow: 'hidden' },
  profileRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 8 },
  profileKey: { fontFamily: MONO, fontSize: 9, color: TEXT_DIM, letterSpacing: 2, marginBottom: 4, flexShrink: 0, width: 100 },
  profileValue: { fontFamily: MONO, fontSize: 12, color: TEXT_PRIMARY, letterSpacing: 1, flex: 1, flexShrink: 1, textAlign: 'right' },
  profileDivider: { height: 1, backgroundColor: '#1A2A00', marginVertical: 10 },
  profileSummary: { fontFamily: SANS, fontSize: 15, color: TEXT_DIM, lineHeight: 22 },
  profileTimestamp: { fontFamily: MONO, fontSize: 9, color: '#3D3D40', letterSpacing: 1, marginTop: 10 },
  mbtiType: { color: ACCENT, fontSize: 15, fontWeight: '700', letterSpacing: 4 },

  // ── History card ──
  historyCard: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 4,
    padding: 16,
    marginBottom: 12,
  },
  historyCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
  historyCardLabel: { fontFamily: MONO, fontSize: 11, color: TEXT_DIM, letterSpacing: 2, flex: 1 },
  historyMode: { fontFamily: MONO, fontSize: 8, color: '#3D3D40', letterSpacing: 2 },
  copyBtn: { fontFamily: MONO, fontSize: 8, color: '#3D3D40', letterSpacing: 2 },
  historyInput: { fontFamily: MONO, fontSize: 12, color: TEXT_DIM, lineHeight: 18, fontStyle: 'italic' },
  historyDivider: { height: 1, backgroundColor: BORDER, marginVertical: 12 },
  historyThreat: { fontFamily: MONO, fontSize: 18, fontWeight: '700', color: ACCENT, letterSpacing: 1, marginBottom: 12 },

  scriptCard: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 3,
    padding: 12,
    marginBottom: 10,
  },
  scriptTag: { fontFamily: MONO, fontSize: 10, color: TEXT_DIM, letterSpacing: 3, marginBottom: 4 },
  scriptText: { fontFamily: SANS, fontSize: 15, color: TEXT_PRIMARY, lineHeight: 22 },

  psycheToggle: { marginTop: 4, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: BORDER, borderRadius: 4 },
  psycheToggleText: { fontFamily: MONO, fontSize: 10, color: TEXT_DIM, letterSpacing: 2 },
  psychePanel: { marginTop: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: BORDER },
  psycheContainer: {
    backgroundColor: BG,
    borderLeftWidth: 2,
    borderLeftColor: ACCENT,
    padding: 12,
    marginBottom: 4,
  },
  psycheText: { fontFamily: SANS, fontSize: 15, color: TEXT_PRIMARY, lineHeight: 22 },

  sectionLabel: { fontFamily: MONO, fontSize: 10, color: TEXT_DIM, letterSpacing: 3, marginBottom: 6 },

  directiveRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  directiveBullet: { fontFamily: MONO, fontSize: 11, color: TEXT_DIM, marginRight: 8, marginTop: 1 },
  directiveText: { fontFamily: SANS, fontSize: 14, color: TEXT_DIM, flex: 1, lineHeight: 20 },

  // ── Typing indicator ──
  typingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 4 },
  typingLabel: { fontFamily: MONO, fontSize: 10, color: TEXT_DIM, letterSpacing: 3, marginRight: 6 },
  typingDot: { fontFamily: MONO, fontSize: 18, color: TEXT_DIM, lineHeight: 18, marginHorizontal: 2 },

  // ── Single-line loader ──
  loaderText: { fontFamily: MONO, fontSize: 13, color: TEXT_DIM, paddingVertical: 20, paddingHorizontal: 4 },

  // ── Input area ──
  inputArea: {
    paddingHorizontal: 20,
    paddingBottom: 36,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    backgroundColor: BG,
  },
  errorText: { fontFamily: MONO, fontSize: 11, color: ERROR_RED, letterSpacing: 2, textAlign: 'center', marginBottom: 8 },

  imageThumbnailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  imageThumbnail: { width: 44, height: 44, borderRadius: 4, borderWidth: 1, borderColor: BORDER },
  imageRemove: { marginLeft: 8 },
  imageRemoveText: { fontFamily: MONO, fontSize: 12, color: TEXT_DIM },
  imageLabel: { fontFamily: MONO, fontSize: 10, color: TEXT_DIM, letterSpacing: 2, marginLeft: 8 },

  // ── Debrief blocks ──
  debriefBlock: {
    marginBottom: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  debriefText: {
    fontFamily: SANS,
    fontSize: 14,
    color: TEXT_DIM,
    lineHeight: 22,
  },

  inputWrapper: { backgroundColor: CARD_BG, borderWidth: 1, borderColor: BORDER, borderRadius: 4, marginBottom: 10 },
  input: { fontFamily: MONO, fontSize: 13, color: TEXT_PRIMARY, padding: 12, minHeight: 60, maxHeight: 120, lineHeight: 20 },

  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  iconButton: {
    width: 42,
    height: 42,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 4,
    backgroundColor: CARD_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonActive: { borderColor: BORDER },
  iconButtonRecording: { borderColor: RECORD_RED },
  iconButtonText: { fontSize: 18 },

  recordingLabel: { fontFamily: MONO, fontSize: 9, color: RECORD_RED, letterSpacing: 2 },

  decodeButton: {
    flex: 1,
    backgroundColor: ACCENT,
    borderRadius: 4,
    paddingVertical: 13,
    alignItems: 'center',
    overflow: 'hidden',
  },
  decodeButtonDisabled: { backgroundColor: '#557000' },
  decodeButtonText: { fontFamily: MONO, fontSize: 13, fontWeight: '700', color: BG, letterSpacing: 4 },
});
