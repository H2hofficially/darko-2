import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
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

// BUG-09 + 16/17: Stripe price IDs are read from env vars so they can be empty
// while products are being created. When empty, the corresponding tier CTA falls
// back to a mailto link instead of attempting a broken Stripe checkout.
//
// Pro annual is intentionally not wired to Stripe yet — clicks show "coming soon"
// inline (BUG-15). The env var is reserved for when the product exists.
const STRIPE_PRICE_PRO_MONTHLY      = process.env.EXPO_PUBLIC_STRIPE_PRICE_PRO_MONTHLY      ?? 'price_1TFJfkEmZWsJibucl22phWB3';
const STRIPE_PRICE_PRO_ANNUAL       = process.env.EXPO_PUBLIC_STRIPE_PRICE_PRO_ANNUAL       ?? '';
const STRIPE_PRICE_EXECUTIVE_MONTHLY = process.env.EXPO_PUBLIC_STRIPE_PRICE_EXECUTIVE_MONTHLY ?? '';
const STRIPE_PRICE_EXECUTIVE_ANNUAL  = process.env.EXPO_PUBLIC_STRIPE_PRICE_EXECUTIVE_ANNUAL  ?? '';

// BUG-19: founder slot count for Executive tier. First 100 members lock at $100
// forever. After 100, the card flips to a waitlist UI (BUG-22). The count is
// read from a public env var so marketing can update it without a redeploy of
// the Supabase function. Defaults to 0 (slots remaining = 100) when unset.
const EXECUTIVE_FOUNDER_TOTAL = 100;
const EXECUTIVE_FOUNDER_SOLD =
  parseInt(process.env.EXPO_PUBLIC_EXECUTIVE_FOUNDER_SOLD ?? '0', 10) || 0;
const EXECUTIVE_FOUNDER_REMAINING = Math.max(0, EXECUTIVE_FOUNDER_TOTAL - EXECUTIVE_FOUNDER_SOLD);
const EXECUTIVE_FOUNDER_FULL = EXECUTIVE_FOUNDER_REMAINING <= 0;

// Canonical pricing — must match LandingPageV4 pricing section copy.
const PRICE = {
  PRO_MONTHLY: 15,
  PRO_ANNUAL: 150,
  PRO_ANNUAL_SAVINGS: 30,   // 12 * 15 - 150
  EXEC_MONTHLY: 100,
  EXEC_ANNUAL: 900,
  EXEC_ANNUAL_SAVINGS: 300, // 12 * 100 - 900
} as const;

const SUPPORT_EMAIL = 'support@darkoapp.com';

// ─── Feature comparison table ───────────────────────────────────────────────

type FeatureRow = { label: string; observer: string | boolean; operator: string | boolean; executive: string | boolean };

// BUG-09: feature comparison rebuilt against the canonical spec (May 2026).
// Headers renamed PRO/EXECUTIVE to match the spec; OBSERVER kept as the free tier.
const FEATURES: FeatureRow[] = [
  { label: 'Active targets',          observer: '1',                 operator: '8',                 executive: 'Unlimited' },
  { label: 'Sessions',                 observer: '3 / day',           operator: '150 / month',       executive: 'Unlimited' },
  { label: 'Campaign memory',          observer: 'Last 10 messages',  operator: 'Last 50 messages',  executive: 'Last 100 messages' },
  { label: 'Psychological profiling',  observer: 'Basic handler',     operator: 'Full',              executive: 'Full + teaching layer' },
  { label: 'Voice input',              observer: false,               operator: true,                executive: true },
  { label: 'Image input',              observer: false,               operator: true,                executive: true },
  { label: '// DOSSIER',                observer: false,               operator: true,                executive: true },
  { label: '// BRIEF',                   observer: false,               operator: true,                executive: true },
  { label: 'Phase tracking',           observer: false,               operator: true,                executive: true },
  { label: 'Monthly campaign audits',  observer: false,               operator: false,               executive: true },
  { label: 'Proactive check-ins',      observer: false,               operator: false,               executive: true },
  { label: 'Crisis mode',              observer: false,               operator: false,               executive: true },
  { label: 'Priority processing',      observer: false,               operator: false,               executive: true },
  { label: 'Free trial',               observer: '—',                 operator: '4 days',            executive: 'No trial' },
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
    q: 'How does EXECUTIVE founder pricing work?',
    a: 'The first 100 EXECUTIVE members lock in $100/mo (or $900/yr) forever. Once those 100 slots are gone, the EXECUTIVE card flips to a waitlist — leave your email and we will reach out when a slot opens.',
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
  // BUG-15: Pro annual click → "coming soon" inline (no Stripe product yet).
  const [proAnnualNotice, setProAnnualNotice] = useState<string | null>(null);
  // BUG-22: waitlist email-capture state for Executive once founder slots fill.
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistStatus, setWaitlistStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle');

  const isObserver   = tier === 'free';
  const isOperator   = tier === 'pro';
  const isExecutive  = tier === 'executive';

  // BUG-16/17: graceful fallback. When a Stripe price ID is empty (env var unset),
  // open a mailto so the user still has a path forward instead of a broken checkout.
  function mailtoFallback(planName: string) {
    const subject = encodeURIComponent(`DARKO ${planName} access request`);
    const body = encodeURIComponent(
      `I'd like to subscribe to DARKO ${planName}. Please reach out with next steps.`,
    );
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`);
  }

  async function handleCheckout(priceId: string, tierKey: string, planName: string) {
    if (!priceId) {
      // No Stripe product configured yet — offer mailto fallback.
      mailtoFallback(planName);
      return;
    }
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

  // BUG-22: persist a waitlist signup. Tries a Supabase RPC first; if it isn't
  // wired yet, falls back to a mailto so the lead is never silently lost.
  async function submitWaitlist() {
    const email = waitlistEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setWaitlistStatus('error');
      return;
    }
    setWaitlistStatus('sending');
    try {
      const { error: fnErr } = await supabase.functions.invoke('executive-waitlist', {
        body: { email },
      });
      if (fnErr) throw fnErr;
      setWaitlistStatus('ok');
    } catch {
      // Fallback so leads still reach the team while the function is being built.
      const subject = encodeURIComponent('DARKO EXECUTIVE — waitlist signup');
      const body = encodeURIComponent(`Add me to the Executive waitlist.\nEmail: ${email}`);
      Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`);
      setWaitlistStatus('ok');
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
        {/* Billing toggle — BUG-09: dollar-savings, not percentage */}
        <View style={s.toggle}>
          <TouchableOpacity
            style={[s.toggleBtn, billing === 'monthly' && s.toggleActive]}
            onPress={() => { setBilling('monthly'); setProAnnualNotice(null); }}
          >
            <Text style={[s.toggleLabel, billing === 'monthly' && s.toggleLabelActive]}>MONTHLY</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.toggleBtn, billing === 'annual' && s.toggleActive]}
            onPress={() => setBilling('annual')}
          >
            <Text style={[s.toggleLabel, billing === 'annual' && s.toggleLabelActive]}>ANNUAL</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={s.divider} />

      {error ? <Text style={s.error}>[ {error} ]</Text> : null}

      {/* Tier cards */}
      <View style={[s.cards, isWide && s.cardsRow]}>

        {/* OBSERVER — canonical spec: 3 sessions/day, 1 target, basic only */}
        <View style={[s.card, isWide && s.cardWide, isObserver && s.cardCurrent]}>
          <Text style={s.tierLabel}>OBSERVER</Text>
          <Text style={s.tierPrice}>$0</Text>
          <Text style={s.tierPriceSub}>free forever</Text>
          <View style={s.cardDivider} />
          <View style={s.featureList}>
            <FeatureLine text="1 active target" />
            <FeatureLine text="3 sessions / day" />
            <FeatureLine text="Campaign memory: last 10 messages" />
            <FeatureLine text="Basic handler only" />
            <FeatureLine text="No voice, image, dossier, or brief" />
          </View>
          <View style={s.cardFooter}>
            {isObserver ? (
              <View style={[s.btn, s.btnGhost]}>
                <Text style={s.btnGhostText}>CURRENT PLAN</Text>
              </View>
            ) : (
              <TouchableOpacity style={[s.btn, s.btnGhost]} onPress={() => router.push('/auth?plan=free' as any)}>
                <Text style={s.btnGhostText}>[ GET STARTED ]</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* PRO — canonical spec. Annual: $150/yr, "coming soon" until Stripe wired (BUG-15). */}
        <View style={[s.card, s.cardOperator, isWide && s.cardWide, isOperator && s.cardCurrent]}>
          <View style={s.badge}>
            <Text style={s.badgeText}>MOST POPULAR</Text>
          </View>
          <Text style={[s.tierLabel, { color: TEXT_PRIMARY }]}>PRO</Text>
          <View style={s.priceRow}>
            <Text style={[s.tierPrice, { color: ACCENT }]}>
              {billing === 'annual' ? `$${PRICE.PRO_ANNUAL}` : `$${PRICE.PRO_MONTHLY}`}
            </Text>
            <Text style={s.perMonth}>{billing === 'annual' ? '/year' : '/month'}</Text>
          </View>
          {billing === 'annual'
            ? <Text style={[s.tierPriceSub, { color: ACCENT }]}>Save ${PRICE.PRO_ANNUAL_SAVINGS}/year</Text>
            : <Text style={s.tierPriceSub}>4-day free trial</Text>
          }
          <View style={s.cardDivider} />
          <View style={s.featureList}>
            <FeatureLine text="150 messages per month" accent />
            <FeatureLine text="8 active targets" accent />
            <FeatureLine text="Campaign memory: last 50 messages" accent />
            <FeatureLine text="Voice input · image input" accent />
            <FeatureLine text="// DOSSIER · // BRIEF · phase tracking" accent />
            <FeatureLine text="4-day free trial" accent />
          </View>

          {/* BUG-15: Pro annual coming-soon notice */}
          {proAnnualNotice ? (
            <Text style={s.comingSoonText}>{proAnnualNotice}</Text>
          ) : null}

          <View style={s.cardFooter}>
            {isOperator ? (
              <View style={[s.btn, s.btnGhost]}>
                <Text style={s.btnGhostText}>CURRENT PLAN</Text>
              </View>
            ) : isExecutive ? (
              <View style={[s.btn, s.btnGhost]}>
                <Text style={s.btnGhostText}>INCLUDED IN EXECUTIVE</Text>
              </View>
            ) : billing === 'annual' ? (
              // BUG-15: annual click → inline "coming soon", no Stripe call.
              <TouchableOpacity
                style={[s.btn, s.btnAccent]}
                onPress={() => setProAnnualNotice('// annual billing — coming soon')}
              >
                <Text style={s.btnAccentText}>[ GET PRO ANNUAL ]</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[s.btn, s.btnAccent, loadingTier === 'operator' && { opacity: 0.5 }]}
                onPress={() => handleCheckout(STRIPE_PRICE_PRO_MONTHLY, 'operator', 'PRO MONTHLY')}
                disabled={loadingTier !== null}
              >
                {loadingTier === 'operator'
                  ? <ActivityIndicator color={BG} />
                  : <Text style={s.btnAccentText}>[ START FREE TRIAL ]</Text>
                }
              </TouchableOpacity>
            )}
            {!isOperator && !isExecutive && billing === 'monthly' && (
              <Text style={s.trialNote}>4-day trial · No charge until trial ends · Cancel anytime</Text>
            )}
          </View>
        </View>

        {/* EXECUTIVE — founder pricing first 100 (BUG-19), waitlist when full (BUG-22).
            Stripe-or-mailto fallback (BUG-16/17). */}
        <View style={[s.card, isWide && s.cardWide, isExecutive && s.cardCurrent]}>
          <View style={[s.badge, s.badgeExec]}>
            <Text style={[s.badgeText, { color: ACCENT }]}>
              {EXECUTIVE_FOUNDER_FULL ? 'WAITLIST' : 'FOUNDER PRICING'}
            </Text>
          </View>
          <Text style={s.tierLabel}>EXECUTIVE</Text>
          <View style={s.priceRow}>
            <Text style={s.tierPrice}>
              {billing === 'annual' ? `$${PRICE.EXEC_ANNUAL}` : `$${PRICE.EXEC_MONTHLY}`}
            </Text>
            <Text style={s.perMonth}>{billing === 'annual' ? '/year' : '/month'}</Text>
          </View>
          {billing === 'annual'
            ? <Text style={[s.tierPriceSub, { color: ACCENT }]}>Save ${PRICE.EXEC_ANNUAL_SAVINGS}/year</Text>
            : <Text style={s.tierPriceSub}>per month</Text>
          }
          {/* BUG-19: founder framing — only while slots remain */}
          {!EXECUTIVE_FOUNDER_FULL && (
            <Text style={s.founderNote}>
              First 100 members locked at $100 forever
              {EXECUTIVE_FOUNDER_SOLD > 0 ? ` · ${EXECUTIVE_FOUNDER_REMAINING} of ${EXECUTIVE_FOUNDER_TOTAL} left` : ''}
            </Text>
          )}
          <View style={s.cardDivider} />
          <View style={s.featureList}>
            <FeatureLine text="Unlimited messages" />
            <FeatureLine text="Unlimited targets" />
            <FeatureLine text="Campaign memory: last 100 messages" />
            <FeatureLine text="Everything in PRO" />
            <FeatureLine text="Teaching layer · monthly audits" />
            <FeatureLine text="Proactive check-ins · priority processing" />
            <FeatureLine text="Crisis mode" />
          </View>
          <View style={s.cardFooter}>
            {isExecutive ? (
              <View style={[s.btn, s.btnGhost]}>
                <Text style={s.btnGhostText}>CURRENT PLAN</Text>
              </View>
            ) : EXECUTIVE_FOUNDER_FULL ? (
              // BUG-22: founder slots full → email-capture waitlist.
              <View>
                {waitlistStatus === 'ok' ? (
                  <Text style={s.waitlistOk}>// you're on the list. we'll be in touch.</Text>
                ) : (
                  <>
                    <Text style={s.waitlistLabel}>Founder slots are full. Join the waitlist:</Text>
                    <View style={s.waitlistRow}>
                      <TextInput
                        style={s.waitlistInput}
                        value={waitlistEmail}
                        onChangeText={(t) => { setWaitlistEmail(t); setWaitlistStatus('idle'); }}
                        placeholder="you@domain.com"
                        placeholderTextColor={TEXT_DIM}
                        autoCapitalize="none"
                        keyboardType="email-address"
                      />
                      <TouchableOpacity
                        style={[s.btn, s.btnGhost, { paddingHorizontal: 16 }]}
                        onPress={submitWaitlist}
                        disabled={waitlistStatus === 'sending'}
                      >
                        <Text style={s.btnGhostText}>
                          {waitlistStatus === 'sending' ? 'SENDING...' : 'JOIN'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    {waitlistStatus === 'error' && (
                      <Text style={s.error}>[ ENTER A VALID EMAIL ]</Text>
                    )}
                  </>
                )}
              </View>
            ) : (
              <TouchableOpacity
                style={[s.btn, s.btnGhost, loadingTier === 'executive' && { opacity: 0.5 }]}
                onPress={() => handleCheckout(
                  billing === 'annual' ? STRIPE_PRICE_EXECUTIVE_ANNUAL : STRIPE_PRICE_EXECUTIVE_MONTHLY,
                  'executive',
                  billing === 'annual' ? 'EXECUTIVE ANNUAL' : 'EXECUTIVE MONTHLY',
                )}
                disabled={loadingTier !== null}
              >
                {loadingTier === 'executive'
                  ? <ActivityIndicator color={TEXT_DIM} />
                  : <Text style={s.btnGhostText}>[ GET EXECUTIVE ]</Text>
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
  // BUG-15: Pro annual coming-soon notice
  comingSoonText: {
    fontFamily: MONO as any,
    fontSize: 10,
    color: ACCENT,
    letterSpacing: 1,
    marginBottom: 12,
  },
  // BUG-19: founder framing line under the price
  founderNote: {
    fontFamily: MONO as any,
    fontSize: 10,
    color: ACCENT,
    letterSpacing: 1,
    marginTop: 4,
    lineHeight: 16,
  },
  // BUG-22: waitlist UI (Executive when 100 founders are sold)
  waitlistLabel: {
    fontFamily: MONO as any,
    fontSize: 10,
    color: TEXT_DIM,
    letterSpacing: 1,
    marginBottom: 8,
  },
  waitlistRow: {
    flexDirection: 'row' as const,
    gap: 8,
    alignItems: 'stretch' as const,
  },
  waitlistInput: {
    flex: 1,
    fontFamily: MONO as any,
    fontSize: 12,
    color: TEXT_PRIMARY,
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 2,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  waitlistOk: {
    fontFamily: MONO as any,
    fontSize: 11,
    color: ACCENT,
    letterSpacing: 1,
    paddingVertical: 8,
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
