/**
 * DARKO — Core Decoder Screen
 * Drop this file into: app/index.tsx
 * Uses mocked JSON. No backend required at this stage.
 */

import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  StatusBar,
  SafeAreaView,
  Platform,
} from "react-native";

// ─── MOCK PAYLOAD ────────────────────────────────────────────────────────────
const MOCK_RESPONSE = {
  visible_arsenal: {
    option_1_script: "noted. i'll decide when i'm ready, not you.",
    option_2_script: "interesting. i had plans anyway. enjoy your night.",
  },
  hidden_intel: {
    threat_level: "8.5/10 — High Evasion",
    the_psyche:
      "Subject employs deliberate ambiguity as a dominance lever, creating anxiety to manufacture compliance. Classic anxious-avoidant loop — they need your pursuit to regulate their own emotional state.",
    the_directive: [
      "Do not double-text. Silence is your highest-value move here.",
      "Mirror their energy exactly — vague for vague, brief for brief.",
      "Reframe the dynamic: you are not waiting. You are evaluating.",
    ],
  },
};

// ─── TOKENS ──────────────────────────────────────────────────────────────────
const T = {
  black: "#000000",
  white: "#FFFFFF",
  gray: "#1A1A1A",
  grayMid: "#2A2A2A",
  grayText: "#888888",
  accent: "#CCFF00",
  accentDim: "#99BF00",
  border: "#2A2A2A",
  danger: "#FF4444",
};

// ─── COMPONENT ───────────────────────────────────────────────────────────────
export default function DecoderScreen() {
  const [inputText, setInputText] = useState("");
  const [decodeState, setDecodeState] = useState<"idle" | "scanning" | "done">("idle");
  const [showIntel, setShowIntel] = useState(false);
  const [data, setData] = useState(MOCK_RESPONSE);

  const intelHeight = useRef(new Animated.Value(0)).current;
  const scanOpacity = useRef(new Animated.Value(1)).current;
  const resultOpacity = useRef(new Animated.Value(0)).current;
  const accentPulse = useRef(new Animated.Value(1)).current;

  // Simulate the decode pipeline
  const handleDecode = () => {
    if (!inputText.trim()) return;

    setDecodeState("scanning");
    setShowIntel(false);
    Animated.loop(
      Animated.sequence([
        Animated.timing(accentPulse, { toValue: 0.3, duration: 400, useNativeDriver: true }),
        Animated.timing(accentPulse, { toValue: 1, duration: 400, useNativeDriver: true }),
      ])
    ).start();

    setTimeout(() => {
      Animated.loop(Animated.sequence([])).stop(); // stop pulse
      accentPulse.setValue(1);
      setDecodeState("done");
      Animated.timing(resultOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, 1800);
  };

  const toggleIntel = () => {
    const toValue = showIntel ? 0 : 1;
    setShowIntel(!showIntel);
    Animated.timing(intelHeight, {
      toValue,
      duration: 320,
      useNativeDriver: false,
    }).start();
  };

  // ─── SUB-COMPONENTS ────────────────────────────────────────────────────────

  const ThreatMeter = ({ score }: { score: string }) => {
    const numericScore = parseFloat(score); // e.g. 8.5
    const pct = (numericScore / 10) * 100;
    return (
      <View style={styles.meterContainer}>
        <View style={styles.meterTrack}>
          <View style={[styles.meterFill, { width: `${pct}%` as any }]} />
        </View>
      </View>
    );
  };

  const ScriptCard = ({
    label,
    script,
    primary,
  }: {
    label: string;
    script: string;
    primary?: boolean;
  }) => (
    <View style={[styles.scriptCard, primary && styles.scriptCardPrimary]}>
      <Text style={styles.scriptLabel}>{label}</Text>
      <Text style={[styles.scriptText, primary && styles.scriptTextPrimary]}>
        "{script}"
      </Text>
      <TouchableOpacity style={styles.copyBtn} activeOpacity={0.7}>
        <Text style={styles.copyBtnText}>[ COPY ]</Text>
      </TouchableOpacity>
    </View>
  );

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={T.black} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── HEADER ── */}
        <View style={styles.header}>
          <Text style={styles.logo}>DARKO</Text>
          <Text style={styles.tagline}>RELATIONAL INTELLIGENCE ENGINE</Text>
          <View style={styles.headerDivider} />
        </View>

        {/* ── INPUT ZONE ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>// TARGET INPUT</Text>
          <TextInput
            style={styles.input}
            multiline
            numberOfLines={5}
            placeholder="paste their message here..."
            placeholderTextColor={T.grayText}
            value={inputText}
            onChangeText={setInputText}
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[
              styles.decodeBtn,
              decodeState === "scanning" && styles.decodeBtnScanning,
            ]}
            onPress={handleDecode}
            activeOpacity={0.85}
            disabled={decodeState === "scanning"}
          >
            <Animated.Text
              style={[styles.decodeBtnText, { opacity: accentPulse }]}
            >
              {decodeState === "scanning" ? "[ SCANNING... ]" : "[ DECODE ]"}
            </Animated.Text>
          </TouchableOpacity>
        </View>

        {/* ── RESULTS ── */}
        {decodeState === "done" && (
          <Animated.View style={[styles.results, { opacity: resultOpacity }]}>
            {/* Threat Level */}
            <View style={styles.threatBlock}>
              <Text style={styles.sectionLabel}>// THREAT LEVEL</Text>
              <Text style={styles.threatScore}>{data.hidden_intel.threat_level}</Text>
              <ThreatMeter score={data.hidden_intel.threat_level} />
            </View>

            {/* Visible Arsenal */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>// RESPONSE ARSENAL</Text>
              <ScriptCard
                label="OPTION 01 — PRIMARY"
                script={data.visible_arsenal.option_1_script}
                primary
              />
              <ScriptCard
                label="OPTION 02 — SECONDARY"
                script={data.visible_arsenal.option_2_script}
              />
            </View>

            {/* Toggle: Deep Intel */}
            <TouchableOpacity
              style={styles.intelToggle}
              onPress={toggleIntel}
              activeOpacity={0.8}
            >
              <Text style={styles.intelToggleText}>
                {showIntel ? "[ HIDE PSYCHOLOGY ]" : "[ VIEW PSYCHOLOGY ]"}
              </Text>
            </TouchableOpacity>

            {/* Expandable Intel Panel */}
            <Animated.View
              style={[
                styles.intelPanel,
                {
                  maxHeight: intelHeight.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 600],
                  }),
                  opacity: intelHeight,
                },
              ]}
            >
              {/* The Psyche */}
              <View style={styles.intelBlock}>
                <Text style={styles.intelLabel}>// THE PSYCHE</Text>
                <Text style={styles.intelBody}>{data.hidden_intel.the_psyche}</Text>
              </View>

              {/* The Directives */}
              <View style={styles.intelBlock}>
                <Text style={styles.intelLabel}>// THE DIRECTIVES</Text>
                {data.hidden_intel.the_directive.map((d, i) => (
                  <View key={i} style={styles.directiveRow}>
                    <Text style={styles.directiveIndex}>
                      {String(i + 1).padStart(2, "0")}
                    </Text>
                    <Text style={styles.directiveText}>{d}</Text>
                  </View>
                ))}
              </View>
            </Animated.View>

            {/* Reset */}
            <TouchableOpacity
              style={styles.resetBtn}
              onPress={() => {
                setDecodeState("idle");
                setInputText("");
                setShowIntel(false);
                resultOpacity.setValue(0);
                intelHeight.setValue(0);
              }}
            >
              <Text style={styles.resetBtnText}>[ NEW TARGET ]</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: T.black,
  },
  scroll: {
    flex: 1,
    backgroundColor: T.black,
  },
  scrollContent: {
    paddingBottom: 60,
  },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? 24 : 16,
    paddingBottom: 20,
  },
  logo: {
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
    fontSize: 36,
    fontWeight: "900",
    color: T.accent,
    letterSpacing: 10,
  },
  tagline: {
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
    fontSize: 9,
    color: T.grayText,
    letterSpacing: 4,
    marginTop: 4,
  },
  headerDivider: {
    height: 1,
    backgroundColor: T.border,
    marginTop: 16,
  },

  // Sections
  section: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionLabel: {
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
    fontSize: 10,
    color: T.grayText,
    letterSpacing: 3,
    marginBottom: 10,
  },

  // Input
  input: {
    backgroundColor: T.gray,
    borderWidth: 1,
    borderColor: T.border,
    color: T.white,
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
    fontSize: 14,
    lineHeight: 22,
    padding: 14,
    minHeight: 120,
    borderRadius: 2,
  },

  // Decode button
  decodeBtn: {
    backgroundColor: T.accent,
    marginTop: 12,
    paddingVertical: 16,
    alignItems: "center",
    borderRadius: 2,
  },
  decodeBtnScanning: {
    backgroundColor: T.accentDim,
  },
  decodeBtnText: {
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
    fontSize: 14,
    fontWeight: "900",
    color: T.black,
    letterSpacing: 4,
  },

  // Results
  results: {
    paddingTop: 8,
  },

  // Threat
  threatBlock: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
  },
  threatScore: {
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
    fontSize: 28,
    fontWeight: "900",
    color: T.accent,
    marginBottom: 10,
    letterSpacing: 1,
  },
  meterContainer: {
    marginTop: 4,
  },
  meterTrack: {
    height: 3,
    backgroundColor: T.grayMid,
    borderRadius: 2,
    overflow: "hidden",
  },
  meterFill: {
    height: 3,
    backgroundColor: T.accent,
    borderRadius: 2,
  },

  // Script cards
  scriptCard: {
    backgroundColor: T.gray,
    borderWidth: 1,
    borderColor: T.border,
    padding: 16,
    marginBottom: 10,
    borderRadius: 2,
  },
  scriptCardPrimary: {
    borderColor: T.accent,
    borderWidth: 1,
  },
  scriptLabel: {
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
    fontSize: 9,
    color: T.grayText,
    letterSpacing: 3,
    marginBottom: 8,
  },
  scriptText: {
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
    fontSize: 15,
    color: T.white,
    lineHeight: 24,
    marginBottom: 12,
  },
  scriptTextPrimary: {
    color: T.accent,
  },
  copyBtn: {
    alignSelf: "flex-end",
  },
  copyBtnText: {
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
    fontSize: 10,
    color: T.grayText,
    letterSpacing: 2,
  },

  // Intel toggle
  intelToggle: {
    marginHorizontal: 20,
    marginTop: 8,
    borderWidth: 1,
    borderColor: T.border,
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 2,
  },
  intelToggleText: {
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
    fontSize: 11,
    color: T.white,
    letterSpacing: 3,
  },

  // Intel panel
  intelPanel: {
    overflow: "hidden",
    paddingHorizontal: 20,
  },
  intelBlock: {
    marginTop: 20,
  },
  intelLabel: {
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
    fontSize: 10,
    color: T.grayText,
    letterSpacing: 3,
    marginBottom: 10,
  },
  intelBody: {
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
    fontSize: 13,
    color: T.white,
    lineHeight: 22,
    backgroundColor: T.gray,
    padding: 14,
    borderLeftWidth: 2,
    borderLeftColor: T.accent,
  },
  directiveRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
    gap: 12,
  },
  directiveIndex: {
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
    fontSize: 11,
    color: T.accent,
    letterSpacing: 1,
    paddingTop: 1,
    minWidth: 24,
  },
  directiveText: {
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
    fontSize: 13,
    color: T.white,
    lineHeight: 20,
    flex: 1,
  },

  // Reset
  resetBtn: {
    marginHorizontal: 20,
    marginTop: 24,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: T.grayMid,
    borderRadius: 2,
  },
  resetBtnText: {
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
    fontSize: 10,
    color: T.grayText,
    letterSpacing: 4,
  },
});
