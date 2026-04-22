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
import { AppNav } from '../components/AppNav';
import { AppStatusBar } from '../components/AppStatusBar';

const ACCENT = '#CCFF00';
const BG = '#09090B';
const CARD_BG = '#18181B';
const BORDER = '#27272A';
const TEXT_PRIMARY = '#E4E4E7';
const TEXT_DIM = '#71717A';
const ERROR_RED = '#FF4444';
const MONO = Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' });

const OPERATOR_MONTHLY_PRICE_ID = 'price_1TFJfkEmZWsJibucl22phWB3';
const EXECUTIVE_PRICE_ID = 'price_1TFJfkEmZWsJibucAw0qXn6q';

// ─── Feature comparison table ───────────────────────────────────────────────

type FeatureRow = { label: string; observer: string | boolean; operator: string | boolean; executive: string | boolean };

const FEATURES: FeatureRow[] = [
  { label: 'Active targets',          observer: '1',        operator: '3',         executive: 'Unlimited' },
  { label: 'Daily messages',          observer: '5 / day',  operator: '30 / day',  executive: 'Unlimited' },
  { label: 'Conversation history',    observer: '10 msgs',  operator: '50 msgs',   executive: 'Full history' },
  { label: 'Psychological profiling', observer: 'Basic',    operator: 'Full',      executive: 'Full' },
  { label: 'Script generation',       observer: true,       operator: true,        executive: true },
  { label: 'Mission phase tracking',  observer: true,       operator: true,        executive: true },
  { label: '// DOSSIER (campaign)',    observer: false,      operator: true,        executive: true },
  { label: 'Voice input',             observer: false,      operator: true,        executive: true },
  { label: 'Screenshot analysis',     observer: false,      operator: true,        executive: true },
  { label: 'Priority support',        observer: false,      operator: false,       executive: true },
  { label: 'Early access features',   observer: false,      operator: false,       executive: true },
];

// ─── FAQ ─────────────────────────────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    q: 'What happens after the 4-day trial?',
    a: 'You will be charged the monthly rate for your selected plan. You can cancel before the trial ends with no charge.',
  },
  {
    q: 'Can I cancel my subscription?',
    a: 'Yes. Cancel any time from your account settings. Access continues until end of the current billing period. No partial-period refunds.',
  },
  {
    q: 'How does EXECUTIVE access work?',
    a: 'EXECUTIVE is invitation-only. If you have a code, enter it at checkout. Without a code, the standard checkout will not proceed.',
  },
  {
    q: 'Is my data private?',
    a: 'Yes. All target data is encrypted at rest. No conversation content is used for model training. Each account is fully isolated.',
  },
  {
    q: 'What payment methods are accepted?',
    a: 'All major credit and debit cards via Stripe. Payments are processed securely — DARKO never stores card details.',
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function Check({ value, dim }: { value: string | boolean; dim?: boolean }) {
  if (value === false) {
    return <Text style={[cell.val, { color: '#3F3F46' }]}>—</Text>;
  }
  if (value === true) {
    return <Text style={[cell.val, { color: ACCENT }]}>✓</Text>;
  }
  return <Text style={[cell.val, dim && { color: TEXT_DIM }]}>{value as string}</Text>;
}

const cell = StyleSheet.create({
  val: {
    fontFamily: MONO as any,
    fontSize: 11,
    color: TEXT_PRIMARY,
    letterSpacing: 0.3,
    textAlign: 'center' as const,
  },
});

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={faq.wrap}>
      <TouchableOpacity style={faq.row} onPress={() => setOpen(o => !o)} activeOpacity={0.7}>
        <Text style={faq.q}>{q}</Text>
        <Text style={faq.arrow}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {open && <Text style={faq.a}>{a}</Text>}
    </View>
  );
}

const faq = StyleSheet.create({
  wrap: {
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingVertical: 16,
  },
  row: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    gap: 16,
  },
  q: {
    fontFamily: MONO as any,
    fontSize: 12,
    color: TEXT_PRIMARY,
    letterSpacing: 0.5,
    flex: 1,
    lineHeight: 18,
  },
  arrow: {
    fontFamily: MONO as any,
    fontSize: 9,
    color: TEXT_DIM,
    marginTop: 3,
  },
  a: {
    fontFamily: MONO as any,
    fontSize: 11,
    color: TEXT_DIM,
    letterSpacing: 0.3,
    lineHeight: 18,
    marginTop: 12,
  },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function PricingScreen() {
  const router = useRouter();
  const { tier } = useUser();
  const { width } = useWindowDimensions();
  const isWide = Platform.OS === 'web' && width >= 900;
  const isAuth = Platform.OS === 'web' && width > 0; // nav only on web

  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isObserver   = tier === 'free';
  const isOperator   = tier === 'pro';
  const isExecutive  = tier === 'executive';

  async function handleCheckout(priceId: string, tierKey: string) {
    setLoadingTier(tierKey);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/auth' as any); return; }
      const { data, error: fnErr } = await supabase.functions.invoke('create-checkout', {
        body: { priceId, userId: session.user.id },
      });
      if (fnErr || !data?.url) {
        setError((fnErr?.message ?? data?.error ?? 'CHECKOUT FAILED').toUpperCase());
      } else {
        Linking.openURL(data.url);
      }
    } catch (err: any) {
      setError((err.message ?? 'SOMETHING WENT WRONG').toUpperCase());
    } finally {
      setLoadingTier(null);
    }
  }

  const content = (
    <ScrollView
      style={s.scroll}
      contentContainerStyle={[s.content, isWide && s.contentWide]}
      showsVerticalScrollIndicator={false}
    >
      {/* Back */}
      {!isAuth && (
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={s.back}>← BACK</Text>
        </TouchableOpacity>
      )}

      {/* Header */}
      <View style={s.headerRow}>
        <View>
          <Text style={s.title}>// PRICING</Text>
          <Text style={s.subtitle}>Select your operational tier</Text>
        </View>
        {/* Billing toggle */}
        <View style={s.toggle}>
          <TouchableOpacity
            style={[s.toggleBtn, billing === 'monthly' && s.toggleActive]}
            onPress={() => setBilling('monthly')}
          >
            <Text style={[s.toggleLabel, billing === 'monthly' && s.toggleLabelActive]}>MONTHLY</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.toggleBtn, billing === 'annual' && s.toggleActive]}
            onPress={() => setBilling('annual')}
          >
            <Text style={[s.toggleLabel, billing === 'annual' && s.toggleLabelActive]}>ANNUAL</Text>
            <Text style={s.toggleSaveBadge}>SAVE 20%</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={s.divider} />

      {error ? <Text style={s.error}>[ {error} ]</Text> : null}

      {/* Tier cards */}
      <View style={[s.cards, isWide && s.cardsRow]}>

        {/* OBSERVER */}
        <View style={[s.card, isWide && s.cardWide, isObserver && s.cardCurrent]}>
          <Text style={s.tierLabel}>OBSERVER</Text>
          <Text style={s.tierPrice}>$0</Text>
          <Text style={s.tierPriceSub}>free forever</Text>
          <View style={s.cardDivider} />
          <View style={s.featureList}>
            <FeatureLine text="1 active target" />
            <FeatureLine text="5 messages / day" />
            <FeatureLine text="Basic profiling" />
            <FeatureLine text="Script generation" />
            <FeatureLine text="Phase tracking" />
          </View>
          <View style={s.cardFooter}>
            {isObserver ? (
              <View style={[s.btn, s.btnGhost]}>
                <Text style={s.btnGhostText}>CURRENT PLAN</Text>
              </View>
            ) : (
              <TouchableOpacity style={[s.btn, s.btnGhost]} onPress={() => router.push('/auth' as any)}>
                <Text style={s.btnGhostText}>[ GET STARTED ]</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* OPERATOR */}
        <View style={[s.card, s.cardOperator, isWide && s.cardWide, isOperator && s.cardCurrent]}>
          <View style={s.badge}>
            <Text style={s.badgeText}>MOST POPULAR</Text>
          </View>
          <Text style={[s.tierLabel, { color: TEXT_PRIMARY }]}>OPERATOR</Text>
          <View style={s.priceRow}>
            <Text style={[s.tierPrice, { color: ACCENT }]}>
              {billing === 'annual' ? '$12' : '$15'}
            </Text>
            <Text style={s.perMonth}>/mo</Text>
          </View>
          {billing === 'annual'
            ? <Text style={s.tierPriceSub}>billed $144 annually</Text>
            : <Text style={s.tierPriceSub}>4-day free trial</Text>
          }
          <View style={s.cardDivider} />
          <View style={s.featureList}>
            <FeatureLine text="3 active targets" accent />
            <FeatureLine text="30 messages / day" accent />
            <FeatureLine text="Full conversation history" accent />
            <FeatureLine text="// DOSSIER — full profiling" accent />
            <FeatureLine text="// CAMPAIGN — mission planner" accent />
            <FeatureLine text="Voice input + transcription" accent />
            <FeatureLine text="Screenshot analysis" accent />
          </View>

          {!isOperator && !isExecutive && (
            <View style={s.betaNote}>
              <Text style={s.betaNoteTitle}>// BETA ACCESS NOTICE</Text>
              <Text style={s.betaNoteBody}>
                {'Phase 1 Beta. Models are actively training — expect occasional latency or generation variance. You are the final authority on any generated script.'}
              </Text>
            </View>
          )}

          <View style={s.cardFooter}>
            {isOperator ? (
              <View style={[s.btn, s.btnGhost]}>
                <Text style={s.btnGhostText}>CURRENT PLAN</Text>
              </View>
            ) : isExecutive ? (
              <View style={[s.btn, s.btnGhost]}>
                <Text style={s.btnGhostText}>INCLUDED IN EXECUTIVE</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[s.btn, s.btnAccent, loadingTier === 'operator' && { opacity: 0.5 }]}
                onPress={() => handleCheckout(OPERATOR_MONTHLY_PRICE_ID, 'operator')}
                disabled={loadingTier !== null}
              >
                {loadingTier === 'operator'
                  ? <ActivityIndicator color={BG} />
                  : <Text style={s.btnAccentText}>[ START FREE TRIAL ]</Text>
                }
              </TouchableOpacity>
            )}
            {!isOperator && !isExecutive && (
              <Text style={s.trialNote}>4-day trial · No charge until trial ends · Cancel anytime</Text>
            )}
          </View>
        </View>

        {/* EXECUTIVE */}
        <View style={[s.card, isWide && s.cardWide, isExecutive && s.cardCurrent]}>
          <View style={[s.badge, s.badgeExec]}>
            <Text style={[s.badgeText, { color: TEXT_DIM }]}>INVITE ONLY</Text>
          </View>
          <Text style={s.tierLabel}>EXECUTIVE</Text>
          <Text style={s.tierPrice}>$100</Text>
          <Text style={s.tierPriceSub}>per month</Text>
          <View style={s.cardDivider} />
          <View style={s.featureList}>
            <FeatureLine text="Everything in OPERATOR" />
            <FeatureLine text="Unlimited targets" />
            <FeatureLine text="Unlimited messages" />
            <FeatureLine text="Full conversation history" />
            <FeatureLine text="Priority support" />
            <FeatureLine text="Early access to new features" />
          </View>
          <View style={s.cardFooter}>
            {isExecutive ? (
              <View style={[s.btn, s.btnGhost]}>
                <Text style={s.btnGhostText}>CURRENT PLAN</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[s.btn, s.btnGhost, loadingTier === 'executive' && { opacity: 0.5 }]}
                onPress={() => handleCheckout(EXECUTIVE_PRICE_ID, 'executive')}
                disabled={loadingTier !== null}
              >
                {loadingTier === 'executive'
                  ? <ActivityIndicator color={TEXT_DIM} />
                  : <Text style={s.btnGhostText}>[ REQUEST ACCESS ]</Text>
                }
              </TouchableOpacity>
            )}
          </View>
        </View>

      </View>

      {/* Feature comparison table */}
      <View style={s.section}>
        <Text style={s.sectionLabel}>// FEATURE COMPARISON</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={[s.table, { minWidth: 480 }]}>
            {/* Table header */}
            <View style={[s.tableRow, s.tableHeader]}>
              <Text style={[s.tableCell, s.tableCellLabel, s.tableHeaderText]}>FEATURE</Text>
              <Text style={[s.tableCell, s.tableHeaderText, s.tableHeaderCenter]}>OBSERVER</Text>
              <Text style={[s.tableCell, s.tableHeaderText, s.tableHeaderCenter, { color: ACCENT }]}>OPERATOR</Text>
              <Text style={[s.tableCell, s.tableHeaderText, s.tableHeaderCenter]}>EXECUTIVE</Text>
            </View>
            {FEATURES.map((row, i) => (
              <View key={row.label} style={[s.tableRow, i % 2 === 0 && s.tableRowAlt]}>
                <Text style={[s.tableCell, s.tableCellLabel]}>{row.label}</Text>
                <View style={s.tableCell}><Check value={row.observer} dim /></View>
                <View style={s.tableCell}><Check value={row.operator} /></View>
                <View style={s.tableCell}><Check value={row.executive} /></View>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* FAQ */}
      <View style={s.section}>
        <Text style={s.sectionLabel}>// FAQ</Text>
        {FAQ_ITEMS.map(item => <FaqItem key={item.q} q={item.q} a={item.a} />)}
      </View>

      <Text style={s.footnote}>
        {'Payments processed securely via Stripe. Cancel anytime. No refunds on partial billing periods. · DARKO · NXGEN MEDIA LLC · 2026'}
      </Text>
    </ScrollView>
  );

  if (Platform.OS === 'web') {
    return (
      <View style={s.root}>
        <StatusBar style="light" />
        <AppNav />
        <View style={{ flex: 1, overflow: 'hidden' as any }}>
          {content}
        </View>
        <AppStatusBar />
      </View>
    );
  }

  return (
    <View style={s.root}>
      <StatusBar style="light" />
      {content}
    </View>
  );
}

// ─── FeatureLine ─────────────────────────────────────────────────────────────

function FeatureLine({ text, accent }: { text: string; accent?: boolean }) {
  return (
    <View style={fl.row}>
      <Text style={[fl.bullet, accent && { color: ACCENT }]}>▸</Text>
      <Text style={[fl.text, accent && { color: TEXT_PRIMARY }]}>{text}</Text>
    </View>
  );
}

const fl = StyleSheet.create({
  row: { flexDirection: 'row' as const, gap: 10, marginBottom: 8, alignItems: 'flex-start' as const },
  bullet: { fontFamily: MONO as any, fontSize: 10, color: '#3F3F46', marginTop: 1 },
  text: { fontFamily: MONO as any, fontSize: 12, color: TEXT_DIM, letterSpacing: 0.3, flex: 1, lineHeight: 18 },
});

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  scroll: {
    flex: 1,
    width: '100%' as any,
  },
  content: {
    maxWidth: 960,
    alignSelf: 'center' as const,
    width: '100%' as any,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 100,
  },
  contentWide: {
    paddingHorizontal: 40,
  },
  back: {
    fontFamily: MONO as any,
    fontSize: 10,
    color: TEXT_DIM,
    letterSpacing: 2,
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-end' as const,
    flexWrap: 'wrap' as const,
    gap: 16,
    marginBottom: 20,
  },
  title: {
    fontFamily: MONO as any,
    fontSize: 22,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    letterSpacing: 4,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: MONO as any,
    fontSize: 11,
    color: TEXT_DIM,
    letterSpacing: 1,
  },
  toggle: {
    flexDirection: 'row' as const,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 2,
    overflow: 'hidden' as any,
  },
  toggleBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  toggleActive: {
    backgroundColor: CARD_BG,
  },
  toggleLabel: {
    fontFamily: MONO as any,
    fontSize: 10,
    color: TEXT_DIM,
    letterSpacing: 2,
  },
  toggleLabelActive: {
    color: TEXT_PRIMARY,
  },
  toggleSaveBadge: {
    fontFamily: MONO as any,
    fontSize: 8,
    color: ACCENT,
    letterSpacing: 1,
    backgroundColor: 'rgba(204,255,0,0.1)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 1,
  },
  divider: {
    height: 1,
    backgroundColor: BORDER,
    marginBottom: 32,
  },
  error: {
    fontFamily: MONO as any,
    fontSize: 10,
    color: ERROR_RED,
    letterSpacing: 2,
    marginBottom: 16,
  },
  cards: {
    gap: 16,
    marginBottom: 48,
  },
  cardsRow: {
    flexDirection: 'row' as const,
    alignItems: 'stretch' as const,
  },
  card: {
    flex: 1,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 2,
    padding: 24,
  },
  cardWide: {
    flex: 1,
  },
  cardOperator: {
    borderColor: ACCENT,
  },
  cardCurrent: {
    opacity: 0.85,
  },
  badge: {
    alignSelf: 'flex-start' as const,
    backgroundColor: 'rgba(204,255,0,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(204,255,0,0.25)',
    borderRadius: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 12,
  },
  badgeExec: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: BORDER,
  },
  badgeText: {
    fontFamily: MONO as any,
    fontSize: 8,
    color: ACCENT,
    letterSpacing: 2,
  },
  tierLabel: {
    fontFamily: MONO as any,
    fontSize: 12,
    fontWeight: '700',
    color: TEXT_DIM,
    letterSpacing: 4,
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row' as const,
    alignItems: 'baseline' as const,
    gap: 2,
  },
  tierPrice: {
    fontFamily: MONO as any,
    fontSize: 36,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    letterSpacing: 1,
  },
  perMonth: {
    fontFamily: MONO as any,
    fontSize: 14,
    color: TEXT_DIM,
    marginLeft: 2,
  },
  tierPriceSub: {
    fontFamily: MONO as any,
    fontSize: 10,
    color: TEXT_DIM,
    letterSpacing: 0.5,
    marginBottom: 4,
    marginTop: 2,
  },
  cardDivider: {
    height: 1,
    backgroundColor: BORDER,
    marginVertical: 20,
  },
  featureList: {
    marginBottom: 20,
    flex: 1,
  },
  cardFooter: {},
  btn: {
    borderRadius: 2,
    paddingVertical: 13,
    alignItems: 'center' as const,
  },
  btnGhost: {
    borderWidth: 1,
    borderColor: BORDER,
  },
  btnGhostText: {
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
    fontSize: 12,
    fontWeight: '700',
    color: BG,
    letterSpacing: 3,
  },
  trialNote: {
    fontFamily: MONO as any,
    fontSize: 9,
    color: '#52525B',
    letterSpacing: 0.3,
    textAlign: 'center' as const,
    marginTop: 10,
    lineHeight: 14,
  },
  betaNote: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 2,
    padding: 14,
    marginBottom: 20,
  },
  betaNoteTitle: {
    fontFamily: MONO as any,
    fontSize: 9,
    color: ACCENT,
    letterSpacing: 2,
    marginBottom: 8,
  },
  betaNoteBody: {
    fontFamily: MONO as any,
    fontSize: 10,
    color: TEXT_DIM,
    letterSpacing: 0.3,
    lineHeight: 16,
  },
  section: {
    marginBottom: 48,
  },
  sectionLabel: {
    fontFamily: MONO as any,
    fontSize: 11,
    color: TEXT_DIM,
    letterSpacing: 3,
    marginBottom: 16,
  },
  table: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 2,
    overflow: 'hidden' as any,
  },
  tableRow: {
    flexDirection: 'row' as const,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  tableRowAlt: {
    backgroundColor: 'rgba(255,255,255,0.015)',
  },
  tableHeader: {
    backgroundColor: '#111113',
  },
  tableCell: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  tableCellLabel: {
    flex: 2,
    alignItems: 'flex-start' as const,
  },
  tableHeaderText: {
    fontFamily: MONO as any,
    fontSize: 9,
    color: TEXT_DIM,
    letterSpacing: 2,
    textAlign: 'center' as const,
  },
  tableHeaderCenter: {
    textAlign: 'center' as const,
  },
  footnote: {
    fontFamily: MONO as any,
    fontSize: 9,
    color: '#3F3F46',
    letterSpacing: 0.3,
    lineHeight: 16,
    textAlign: 'center' as const,
  },
});
