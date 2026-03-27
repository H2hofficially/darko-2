import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Linking,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../lib/supabase';
import { useUser } from '../context/UserContext';

const ACCENT = '#CCFF00';
const BG = '#09090B';
const CARD_BG = '#18181B';
const BORDER = '#27272A';
const TEXT_PRIMARY = '#E4E4E7';
const TEXT_DIM = '#A1A1AA';
const ERROR_RED = '#FF4444';
const MONO = Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' });

const PRO_PRICE_ID = 'price_1TFJfkEmZWsJibucl22phWB3';

function FeatureLine({ text, accent }: { text: string; accent?: boolean }) {
  return (
    <View style={f.row}>
      <Text style={[f.bullet, accent && { color: ACCENT }]}>▸</Text>
      <Text style={[f.text, accent && { color: TEXT_PRIMARY }]}>{text}</Text>
    </View>
  );
}

const f = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, marginBottom: 10, alignItems: 'flex-start' },
  bullet: { fontFamily: MONO as any, fontSize: 10, color: '#3D3D40', marginTop: 1 },
  text: { fontFamily: MONO as any, fontSize: 12, color: TEXT_DIM, letterSpacing: 0.3, flex: 1, lineHeight: 18 },
});

export default function PricingScreen() {
  const router = useRouter();
  const { tier } = useUser();
  const { width } = useWindowDimensions();
  const isWide = width >= 640;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpgrade = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth' as any);
        return;
      }
      const { data, error: fnErr } = await supabase.functions.invoke('create-checkout', {
        body: { priceId: PRO_PRICE_ID, userId: session.user.id },
      });
      if (fnErr || !data?.url) {
        setError((fnErr?.message ?? data?.error ?? 'CHECKOUT FAILED').toUpperCase());
      } else {
        Linking.openURL(data.url);
      }
    } catch (err: any) {
      setError((err.message ?? 'SOMETHING WENT WRONG').toUpperCase());
    } finally {
      setLoading(false);
    }
  };

  const isPro = tier === 'pro' || tier === 'executive';

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.pageHeader}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.back}>← BACK</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.divider} />

        <Text style={styles.title}>// PRICING</Text>
        <Text style={styles.subtitle}>
          {'Start free. Upgrade when you\'re ready to operate at full capacity.'}
        </Text>

        {/* Cards */}
        <View style={[styles.cards, isWide && styles.cardsRow]}>

          {/* FREE */}
          <View style={[styles.card, isWide && styles.cardWide]}>
            <View style={styles.cardHeader}>
              <Text style={styles.tierLabel}>FREE</Text>
              <Text style={styles.tierPrice}>$0</Text>
              <Text style={styles.tierPriceSub}>forever</Text>
            </View>
            <View style={styles.cardDivider} />
            <View style={styles.features}>
              <FeatureLine text="1 active target" />
              <FeatureLine text="5 messages per target per day" />
              <FeatureLine text="Basic psychological analysis" />
              <FeatureLine text="Script generation" />
              <FeatureLine text="Mission phase tracking" />
            </View>
            <View style={styles.cardFooter}>
              <View style={[styles.btn, styles.btnDisabled]}>
                <Text style={styles.btnDisabledText}>
                  {tier === 'free' ? 'CURRENT PLAN' : 'FREE TIER'}
                </Text>
              </View>
            </View>
          </View>

          {/* PRO */}
          <View style={[styles.card, styles.cardAccent, isWide && styles.cardWide]}>
            <View style={styles.cardHeader}>
              <View style={styles.proBadge}>
                <Text style={styles.proBadgeText}>MOST POPULAR</Text>
              </View>
              <Text style={[styles.tierLabel, { color: TEXT_PRIMARY }]}>PRO</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                <Text style={[styles.tierPrice, { color: ACCENT }]}>$15</Text>
                <Text style={styles.tierPriceSub}>/ month</Text>
              </View>
            </View>
            <View style={styles.cardDivider} />
            <View style={styles.features}>
              <FeatureLine text="3 active targets" accent />
              <FeatureLine text="30 messages per day" accent />
              <FeatureLine text="Full conversation history (50 msgs)" accent />
              <FeatureLine text="// DOSSIER — full psychological profile" accent />
              <FeatureLine text="// BRIEF — campaign planning system" accent />
              <FeatureLine text="Voice input + transcription" accent />
              <FeatureLine text="Screenshot analysis" accent />
              <FeatureLine text="Push notification alerts" accent />
            </View>

            {/* Pre-checkout warning */}
            {!isPro && (
              <View style={styles.betaWarning}>
                <Text style={styles.betaWarningTitle}>// DARKO ENGINE: BETA ACCESS INITIATED</Text>
                <Text style={styles.betaWarningBody}>
                  {'You are accessing the Phase 1 Beta of the DARKO architecture. By proceeding, you acknowledge:\n\n'}
                  <Text style={styles.betaWarningBold}>{'System Variance: '}</Text>
                  {'The AI models are actively training. You may experience occasional latency, UI glitches, or generation errors.\n\n'}
                  <Text style={styles.betaWarningBold}>{'Tactical Calibration: '}</Text>
                  {'The engine analyzes raw text, but human nuance is complex. If a generated script feels misaligned with your specific social dynamic, do not send it. You are the final executive authority.'}
                </Text>
              </View>
            )}

            {error ? <Text style={styles.error}>[ {error} ]</Text> : null}

            <View style={styles.cardFooter}>
              {isPro ? (
                <View style={[styles.btn, styles.btnDisabled]}>
                  <Text style={styles.btnDisabledText}>CURRENT PLAN</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.btn, styles.btnAccent, loading && { opacity: 0.5 }]}
                  onPress={handleUpgrade}
                  disabled={loading}
                >
                  {loading
                    ? <ActivityIndicator color={BG} />
                    : <Text style={styles.btnAccentText}>[ UPGRADE TO PRO ]</Text>
                  }
                </TouchableOpacity>
              )}
            </View>
          </View>

        </View>

        {/* Footer note */}
        <Text style={styles.footnote}>
          {'Payments processed securely via Stripe. Cancel anytime. No refunds on partial billing periods.'}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
    alignItems: 'center',
  },
  scroll: {
    flex: 1,
    width: '100%' as any,
  },
  content: {
    maxWidth: 720,
    alignSelf: 'center' as const,
    width: '100%' as any,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 80,
  },
  pageHeader: {
    marginBottom: 8,
  },
  back: {
    fontFamily: MONO as any,
    fontSize: 10,
    color: TEXT_DIM,
    letterSpacing: 2,
  },
  divider: {
    height: 1,
    backgroundColor: BORDER,
    marginVertical: 20,
  },
  title: {
    fontFamily: MONO as any,
    fontSize: 22,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    letterSpacing: 4,
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: MONO as any,
    fontSize: 11,
    color: TEXT_DIM,
    letterSpacing: 0.5,
    lineHeight: 18,
    marginBottom: 36,
  },
  cards: {
    gap: 16,
    marginBottom: 32,
  },
  cardsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  card: {
    flex: 1,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 4,
    padding: 24,
  },
  cardWide: {
    flex: 1,
  },
  cardAccent: {
    borderColor: ACCENT,
  },
  cardHeader: {
    marginBottom: 4,
  },
  proBadge: {
    alignSelf: 'flex-start' as const,
    backgroundColor: 'rgba(204,255,0,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(204,255,0,0.3)',
    borderRadius: 2,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 12,
  },
  proBadgeText: {
    fontFamily: MONO as any,
    fontSize: 8,
    color: ACCENT,
    letterSpacing: 2,
  },
  tierLabel: {
    fontFamily: MONO as any,
    fontSize: 13,
    fontWeight: '700',
    color: TEXT_DIM,
    letterSpacing: 4,
    marginBottom: 6,
  },
  tierPrice: {
    fontFamily: MONO as any,
    fontSize: 32,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    letterSpacing: 1,
  },
  tierPriceSub: {
    fontFamily: MONO as any,
    fontSize: 11,
    color: TEXT_DIM,
    letterSpacing: 1,
    marginBottom: 4,
  },
  cardDivider: {
    height: 1,
    backgroundColor: BORDER,
    marginVertical: 20,
  },
  features: {
    marginBottom: 24,
    gap: 2,
  },
  cardFooter: {
    marginTop: 'auto' as any,
  },
  btn: {
    borderRadius: 4,
    paddingVertical: 14,
    alignItems: 'center' as const,
  },
  btnDisabled: {
    borderWidth: 1,
    borderColor: BORDER,
  },
  btnDisabledText: {
    fontFamily: MONO as any,
    fontSize: 11,
    color: TEXT_DIM,
    letterSpacing: 3,
  },
  btnAccent: {
    backgroundColor: ACCENT,
  },
  btnAccentText: {
    fontFamily: MONO as any,
    fontSize: 13,
    fontWeight: '700',
    color: BG,
    letterSpacing: 3,
  },
  betaWarning: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 4,
    padding: 16,
    marginBottom: 20,
  },
  betaWarningTitle: {
    fontFamily: MONO as any,
    fontSize: 9,
    color: ACCENT,
    letterSpacing: 2,
    marginBottom: 10,
  },
  betaWarningBody: {
    fontFamily: MONO as any,
    fontSize: 10,
    color: TEXT_DIM,
    letterSpacing: 0.3,
    lineHeight: 17,
  },
  betaWarningBold: {
    fontFamily: MONO as any,
    fontSize: 10,
    color: TEXT_PRIMARY,
    letterSpacing: 0.3,
  },
  error: {
    fontFamily: MONO as any,
    fontSize: 10,
    color: ERROR_RED,
    letterSpacing: 2,
    marginBottom: 12,
  },
  footnote: {
    fontFamily: MONO as any,
    fontSize: 9,
    color: '#3D3D40',
    letterSpacing: 0.5,
    lineHeight: 16,
    textAlign: 'center' as const,
  },
});
