import React, { useEffect, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

const ACCENT = '#CCFF00';
const BG = '#09090b';
const CARD_BG = '#111113';
const BORDER = '#27272a';
const MUTED = '#52525b';
const SUBTEXT = '#a1a1aa';

function BlinkingCursor() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const id = setInterval(() => setVisible((v) => !v), 530);
    return () => clearInterval(id);
  }, []);
  return <Text style={styles.cursor}>{visible ? '█' : ' '}</Text>;
}

// ─── Demo Section ────────────────────────────────────────────────────────────

const DEMO_STEPS = [
  {
    label: 'PASTE HER MESSAGE',
    content: (
      <View style={demoStyles.bubbleReceived}>
        <Text style={demoStyles.bubbleText}>idk maybe, I'll let you know lol</Text>
      </View>
    ),
  },
  {
    label: 'GET THE READ',
    content: (
      <Text style={demoStyles.analysisText}>
        She's testing whether you'll chase. The "lol" softens a rejection she hasn't committed
        to. Window still open.
      </Text>
    ),
  },
  {
    label: 'SEND THE MOVE',
    content: (
      <View style={demoStyles.bubbleSent}>
        <Text style={demoStyles.bubbleTextSent}>
          No pressure. I'll be at [place] Saturday if you want to come through.
        </Text>
      </View>
    ),
  },
];

function DemoSection({ isDesktop }: { isDesktop: boolean }) {
  return (
    <View style={sectionStyles.section}>
      <View style={sectionStyles.sectionInner}>
        <Text style={sectionStyles.sectionTag}>// HOW IT WORKS</Text>
        <View style={[sectionStyles.cardRow, !isDesktop && sectionStyles.cardCol]}>
          {DEMO_STEPS.map((step) => (
            <View
              key={step.label}
              style={[sectionStyles.featureCard, isDesktop && sectionStyles.featureCardDesktop]}
            >
              <Text style={sectionStyles.cardStepLabel}>{step.label}</Text>
              {step.content}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

// ─── Feature Cards Section ────────────────────────────────────────────────────

const FEATURES = [
  { title: 'DECODE ANY MESSAGE', desc: 'Paste what she sent. Get the real read.' },
  { title: 'GET THE EXACT SCRIPT', desc: 'Darko writes the reply in your voice.' },
  { title: 'RUN THE CAMPAIGN', desc: 'Multi-week strategy with phase tracking.' },
  { title: 'INTELLIGENCE DOSSIERS', desc: 'Full psychological profile on every target.' },
];

function CapabilitiesSection({ isDesktop }: { isDesktop: boolean }) {
  return (
    <View style={sectionStyles.section}>
      <View style={sectionStyles.sectionInner}>
        <Text style={sectionStyles.sectionTag}>// CAPABILITIES</Text>
        <View style={[sectionStyles.grid, !isDesktop && sectionStyles.gridCol]}>
          {FEATURES.map((f) => (
            <View
              key={f.title}
              style={[sectionStyles.featureCard, isDesktop && sectionStyles.featureCardHalf]}
            >
              <Text style={sectionStyles.featureTitle}>{f.title}</Text>
              <Text style={sectionStyles.featureDesc}>{f.desc}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function LandingPageV2() {
  const { width } = useWindowDimensions();
  const isDesktop = width > 768;

  const heroStyle = [
    styles.hero,
    Platform.OS === 'web' ? ({ height: '100vh' } as object) : { minHeight: 600 },
  ];

  return (
    <ScrollView style={{ backgroundColor: BG }} contentContainerStyle={{ flexGrow: 1 }}>
      {/* Hero */}
      <View style={heroStyle}>
        <View style={[styles.inner, isDesktop ? styles.innerRow : styles.innerCol]}>
          <View style={[styles.left, isDesktop ? styles.leftDesktop : styles.leftMobile]}>
            <Text style={styles.tag}>// DARKO</Text>
            <View style={styles.headlineBlock}>
              <Text style={[styles.headline, isDesktop ? styles.headlineLg : styles.headlineSm]}>
                STOP GUESSING.
              </Text>
              <Text style={[styles.headline, isDesktop ? styles.headlineLg : styles.headlineSm]}>
                START OPERATING.
              </Text>
              <Text style={[styles.headline, isDesktop ? styles.headlineLg : styles.headlineSm]}>
                (AND GET RESULTS).
              </Text>
            </View>
            <Text style={styles.subtext}>
              Darko reads her messages and tells you exactly what to send back. Cold, specific, and
              always in your corner.
            </Text>
            <View style={styles.ctaRow}>
              <Pressable
                style={({ pressed }) => [styles.btnPrimary, pressed && styles.btnPrimaryPressed]}
              >
                <Text style={styles.btnPrimaryText}>INITIALIZE SYSTEM</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.btnSecondary, pressed && styles.btnSecondaryPressed]}
              >
                <Text style={styles.btnSecondaryText}>SEE HOW IT WORKS</Text>
              </Pressable>
            </View>
          </View>

          {isDesktop && (
            <View style={styles.right}>
              <View style={styles.card}>
                <View style={styles.cardRow}>
                  <Text style={styles.cardAccent}>// HANDLER ONLINE</Text>
                  <BlinkingCursor />
                </View>
                <Text style={styles.cardMuted}>// AWAITING OPERATOR</Text>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Demo */}
      <DemoSection isDesktop={isDesktop} />

      {/* Capabilities */}
      <CapabilitiesSection isDesktop={isDesktop} />
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  hero: {
    backgroundColor: BG,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  inner: {
    width: '100%',
    maxWidth: 1200,
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  innerRow: { flexDirection: 'row', alignItems: 'center' },
  innerCol: { flexDirection: 'column' },
  left: { gap: 24 },
  leftDesktop: { width: '60%', paddingRight: 48 },
  leftMobile: { width: '100%' },
  tag: {
    color: ACCENT,
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 12,
    letterSpacing: 4,
  },
  headlineBlock: { gap: 0 },
  headline: {
    color: '#ffffff',
    fontFamily: 'JetBrainsMono_700Bold',
    fontWeight: '700',
  },
  headlineLg: { fontSize: 48 },
  headlineSm: { fontSize: 28 },
  subtext: { color: SUBTEXT, fontSize: 16, maxWidth: 480, lineHeight: 24 },
  ctaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  btnPrimary: { backgroundColor: ACCENT, paddingVertical: 16, paddingHorizontal: 32 },
  btnPrimaryPressed: { opacity: 0.85 },
  btnPrimaryText: {
    color: BG,
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 13,
    letterSpacing: 2,
    fontWeight: '700',
  },
  btnSecondary: { borderWidth: 1, borderColor: ACCENT, paddingVertical: 16, paddingHorizontal: 32 },
  btnSecondaryPressed: { opacity: 0.75 },
  btnSecondaryText: {
    color: ACCENT,
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 13,
    letterSpacing: 2,
  },
  right: { width: '40%', alignItems: 'center', justifyContent: 'center' },
  card: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 32,
    width: '100%',
    gap: 12,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  cardAccent: { color: ACCENT, fontFamily: 'JetBrainsMono_400Regular', fontSize: 14 },
  cursor: { color: ACCENT, fontFamily: 'JetBrainsMono_400Regular', fontSize: 14 },
  cardMuted: { color: MUTED, fontFamily: 'JetBrainsMono_400Regular', fontSize: 14 },
});

const sectionStyles = StyleSheet.create({
  section: {
    backgroundColor: BG,
    paddingVertical: 80,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  sectionInner: {
    width: '100%',
    maxWidth: 1200,
    paddingHorizontal: 32,
    gap: 32,
  },
  sectionTag: {
    color: ACCENT,
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 11,
    letterSpacing: 4,
  },
  cardRow: { flexDirection: 'row', gap: 16 },
  cardCol: { flexDirection: 'column', gap: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  gridCol: { flexDirection: 'column', gap: 16 },
  featureCard: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 2,
    padding: 24,
    gap: 16,
    flex: 1,
  },
  featureCardDesktop: { flex: 1 },
  featureCardHalf: {
    flexBasis: 'calc(50% - 8px)' as any,
    flexGrow: 0,
    flexShrink: 0,
  },
  cardStepLabel: {
    color: '#ffffff',
    fontFamily: 'JetBrainsMono_700Bold',
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 2,
  },
  featureTitle: {
    color: '#ffffff',
    fontFamily: 'JetBrainsMono_700Bold',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 1,
  },
  featureDesc: {
    color: SUBTEXT,
    fontSize: 14,
    lineHeight: 22,
  },
});

const demoStyles = StyleSheet.create({
  bubbleReceived: {
    alignSelf: 'flex-start',
    backgroundColor: '#27272a',
    borderRadius: 12,
    borderBottomLeftRadius: 2,
    paddingVertical: 10,
    paddingHorizontal: 14,
    maxWidth: '85%',
  },
  bubbleSent: {
    alignSelf: 'flex-end',
    backgroundColor: '#1a2e00',
    borderRadius: 12,
    borderBottomRightRadius: 2,
    paddingVertical: 10,
    paddingHorizontal: 14,
    maxWidth: '85%',
  },
  bubbleText: {
    color: '#e4e4e7',
    fontSize: 14,
    lineHeight: 20,
  },
  bubbleTextSent: {
    color: ACCENT,
    fontSize: 14,
    lineHeight: 20,
  },
  analysisText: {
    color: SUBTEXT,
    fontSize: 14,
    lineHeight: 22,
    fontStyle: 'italic',
  },
});
