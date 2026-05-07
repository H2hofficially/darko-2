import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  FlatList,
  StyleSheet,
  Platform,
  Modal,
  KeyboardAvoidingView,
  ScrollView,
  Linking,
  useWindowDimensions,
} from 'react-native';
import { DesktopLayout } from '../components/DesktopLayout';
import { TargetSidebar } from '../components/TargetSidebar';
import { useRouter, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTargets, saveTarget, deleteTarget, getDecodeCount, type Target } from '../services/storage';
import { supabase } from '../lib/supabase';
import { registerPushToken } from '../services/notifications';
import { useUser, TIER_LIMITS } from '../context/UserContext';
import { PaywallModal } from '../components/PaywallModal';
// LandingPageV3 retained for rollback — flip the import + the render below to
// revert if v6 misbehaves in production.
// import LandingPageV3 from '../components/LandingPageV3';
import LandingPageV4 from '../components/LandingPageV4';
import DarkoLogo from '../components/DarkoLogo';

const ACCENT = '#CCFF00';
const BG = '#09090B';
const CARD_BG = '#18181B';
const BORDER = '#27272A';
const TEXT_PRIMARY = '#E4E4E7';
const TEXT_DIM = '#A1A1AA';
const MONO = Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' });
const SANS = Platform.select({ ios: 'System', android: 'sans-serif', default: 'sans-serif' });

// ── Target card with hover state ───────────────────────────────────────────────

type TargetItem = { id: string; name: string; leverage?: string; objective?: string; decodeCount: number };

function TargetCard({ item, onPress, onDelete }: { item: TargetItem; onPress: () => void; onDelete: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      style={[styles.targetCard, hovered && Platform.OS === 'web' && styles.targetCardHovered]}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
    >
      <View style={styles.targetCardInner}>
        <View style={styles.targetCardLeft}>
          <Text style={[styles.targetName, hovered && Platform.OS === 'web' && { color: ACCENT }]}>
            {item.name.toUpperCase()}
          </Text>
          <Text style={styles.targetMeta}>
            {item.decodeCount === 0 ? 'no decodes yet' : `${item.decodeCount} decode${item.decodeCount !== 1 ? 's' : ''}`}
          </Text>
          {(item.leverage || item.objective) && (
            <Text style={styles.targetDossier} numberOfLines={1}>
              {item.objective ? `obj: ${item.objective}` : `lev: ${item.leverage}`}
            </Text>
          )}
        </View>
        <View style={styles.targetCardRight}>
          <Text style={[styles.chevron, hovered && Platform.OS === 'web' && { color: ACCENT }]}>&gt;</Text>
          <TouchableOpacity onPress={onDelete} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.deleteBtn}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Pressable>
  );
}

// ── Acquire target form (shared between native modal + web overlay) ─────────────

function TargetForm({
  newName, setNewName, newLeverage, setNewLeverage, newObjective, setNewObjective,
  creating, onCancel, onCreate, formError,
}: {
  newName: string; setNewName: (s: string) => void;
  newLeverage: string; setNewLeverage: (s: string) => void;
  newObjective: string; setNewObjective: (s: string) => void;
  creating: boolean; onCancel: () => void; onCreate: () => void;
  // BUG-06: surface an inline error on empty TARGET NAME instead of silent
  // failure when the user hits ACQUIRE.
  formError?: string | null;
}) {
  return (
    <View style={styles.modalBox}>
      <Text style={styles.modalTitle}>ACQUIRE TARGET</Text>

      <Text style={styles.modalFieldLabel}>TARGET NAME</Text>
      <TextInput
        style={styles.modalInput}
        value={newName}
        onChangeText={setNewName}
        placeholder="e.g. Chloe"
        placeholderTextColor={TEXT_DIM}
        autoFocus
        returnKeyType="next"
      />
      {formError ? <Text style={styles.modalError}>[ {formError} ]</Text> : null}

      <Text style={styles.modalFieldLabel}>LEVERAGE  <Text style={styles.modalOptional}>(optional)</Text></Text>
      <TextInput
        style={styles.modalInput}
        value={newLeverage}
        onChangeText={setNewLeverage}
        placeholder="what they have over you..."
        placeholderTextColor={TEXT_DIM}
        returnKeyType="next"
      />

      <Text style={styles.modalFieldLabel}>OBJECTIVE  <Text style={styles.modalOptional}>(optional)</Text></Text>
      <TextInput
        style={[styles.modalInput, styles.modalInputLast]}
        value={newObjective}
        onChangeText={setNewObjective}
        placeholder="what you want from them..."
        placeholderTextColor={TEXT_DIM}
        returnKeyType="done"
        onSubmitEditing={onCreate}
      />

      <View style={styles.modalButtons}>
        <TouchableOpacity style={styles.modalCancel} onPress={onCancel}>
          <Text style={styles.modalCancelText}>CANCEL</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modalConfirm, creating && styles.modalConfirmDisabled]}
          onPress={onCreate}
          disabled={creating}
        >
          <Text style={styles.modalConfirmText}>{creating ? 'ACQUIRING...' : 'ACQUIRE'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Web landing page (unauthenticated) ─────────────────────────────────────────

function LandingPage() {
  const router = useRouter();
  const [ctaHovered, setCtaHovered] = useState(false);

  return (
    <View style={landing.root}>
      <StatusBar style="light" />

      {/* Center column */}
      <ScrollView
        style={landing.scroll}
        contentContainerStyle={landing.inner}
        showsVerticalScrollIndicator={false}
      >
        {/* Nav */}
        <View style={landing.nav}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <DarkoLogo size={18} />
          </View>
          <View style={{ flexDirection: 'row', gap: 24 }}>
            <TouchableOpacity onPress={() => router.push('/pricing' as any)}>
              <Text style={landing.navLink}>pricing</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/contact' as any)}>
              <Text style={landing.navLink}>support</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => Linking.openURL('/legal.html#privacy')}>
              <Text style={landing.navLink}>privacy</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => Linking.openURL('/legal.html#tos')}>
              <Text style={landing.navLink}>terms</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={landing.divider} />

        {/* Hero */}
        <View style={landing.hero}>
          <Text style={landing.tagline}>{'// RELATIONSHIP INTELLIGENCE\n// SYSTEM ACTIVE'}</Text>
          <Text style={landing.headline}>{'Stop guessing.\nStart operating.'}</Text>
          <Text style={landing.sub}>
            {'DARKO is a cold psychological strategist that reads the situation, makes the call, and tells you exactly what to do — and what to say.'}
          </Text>

          <Pressable
            style={[landing.cta, ctaHovered && landing.ctaHovered]}
            onPress={() => router.push('/auth' as any)}
            onHoverIn={() => setCtaHovered(true)}
            onHoverOut={() => setCtaHovered(false)}
          >
            <Text style={landing.ctaText}>INITIALIZE SYSTEM</Text>
          </Pressable>

          <Text style={landing.ctaSub}>4-day free trial · no charge until trial ends</Text>
        </View>

        {/* Features */}
        <View style={landing.features}>
          <Feature icon="↳" title="DECODE ANY MESSAGE" body="Paste a text. DARKO reads the psychology, assesses the power dynamic, and tells you what it means." />
          <Feature icon="→" title="GET THE EXACT SCRIPT" body="Not advice. The precise message to send, calibrated to the target's attachment style and communication patterns." />
          <Feature icon="◈" title="RUN THE CAMPAIGN" body="5-phase mission system. DARKO tracks your relationship arc and adapts strategy as the situation evolves." />
        </View>

        {/* Footer */}
        <View style={landing.footer}>
          <Text style={landing.footerLegal}>
            {'© 2026 DARKO. All rights reserved. DARKO is a registered product and operating entity of Nxgen Media LLC.'}
          </Text>
          <View style={landing.footerLinks}>
            <TouchableOpacity onPress={() => router.push('/contact' as any)}>
              <Text style={landing.footerLink}>Support</Text>
            </TouchableOpacity>
            <Text style={landing.footerSep}>{' · '}</Text>
            <TouchableOpacity onPress={() => Linking.openURL('/legal.html#privacy')}>
              <Text style={landing.footerLink}>Privacy Policy</Text>
            </TouchableOpacity>
            <Text style={landing.footerSep}>{' · '}</Text>
            <TouchableOpacity onPress={() => Linking.openURL('/legal.html#tos')}>
              <Text style={landing.footerLink}>Terms of Service</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function Feature({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <View style={landing.feature}>
      <Text style={landing.featureIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={landing.featureTitle}>{title}</Text>
        <Text style={landing.featureBody}>{body}</Text>
      </View>
    </View>
  );
}

const landing = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  scroll: {
    flex: 1,
  },
  inner: {
    width: '100%' as any,
    maxWidth: 680,
    alignSelf: 'center' as const,
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 60,
  },
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
  },
  navBrand: {
    fontFamily: MONO,
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    letterSpacing: 4,
  },
  betaBadge: {
    borderWidth: 1,
    borderColor: ACCENT,
    borderRadius: 2,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  betaBadgeText: {
    fontFamily: MONO,
    fontSize: 8,
    color: ACCENT,
    letterSpacing: 1,
  },
  navLink: {
    fontFamily: MONO,
    fontSize: 10,
    color: TEXT_DIM,
    letterSpacing: 1,
  },
  divider: {
    height: 1,
    backgroundColor: BORDER,
    marginVertical: 32,
  },
  hero: {
    marginBottom: 56,
  },
  tagline: {
    fontFamily: MONO,
    fontSize: 9,
    color: ACCENT,
    letterSpacing: 3,
    marginBottom: 20,
    lineHeight: 16,
  },
  headline: {
    fontFamily: MONO,
    fontSize: 38,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    letterSpacing: 1,
    lineHeight: 48,
    marginBottom: 20,
  },
  sub: {
    fontFamily: SANS,
    fontSize: 15,
    color: TEXT_DIM,
    lineHeight: 24,
    marginBottom: 36,
    maxWidth: 520,
  },
  cta: {
    backgroundColor: ACCENT,
    borderRadius: 4,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignSelf: 'flex-start' as const,
    marginBottom: 12,
  },
  ctaHovered: {
    backgroundColor: '#D4FF00',
  },
  ctaText: {
    fontFamily: MONO,
    fontSize: 13,
    fontWeight: '700',
    color: BG,
    letterSpacing: 4,
  },
  ctaSub: {
    fontFamily: MONO,
    fontSize: 9,
    color: '#3D3D40',
    letterSpacing: 1,
  },
  features: {
    gap: 32,
    marginBottom: 64,
  },
  feature: {
    flexDirection: 'row',
    gap: 16,
  },
  featureIcon: {
    fontFamily: MONO,
    fontSize: 18,
    color: ACCENT,
    width: 24,
    marginTop: 2,
  },
  featureTitle: {
    fontFamily: MONO,
    fontSize: 11,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    letterSpacing: 2,
    marginBottom: 6,
  },
  featureBody: {
    fontFamily: SANS,
    fontSize: 13,
    color: TEXT_DIM,
    lineHeight: 20,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 24,
    gap: 10,
  },
  footerLegal: {
    fontFamily: MONO,
    fontSize: 10,
    color: TEXT_DIM,
    letterSpacing: 0.3,
    lineHeight: 16,
  },
  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerLink: {
    fontFamily: MONO,
    fontSize: 10,
    color: TEXT_DIM,
    letterSpacing: 0.5,
  },
  footerSep: {
    fontFamily: MONO,
    fontSize: 10,
    color: '#3D3D40',
    letterSpacing: 1,
  },
});

// ── Main authenticated screen ───────────────────────────────────────────────────

export default function ProfilesScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width > 1024;
  const [targets, setTargets] = useState<(Target & { decodeCount: number })[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newLeverage, setNewLeverage] = useState('');
  const [newObjective, setNewObjective] = useState('');
  const [creating, setCreating] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [showLanding, setShowLanding] = useState(false);
  const [addBtnHovered, setAddBtnHovered] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);
  // BUG-06: tracks inline errors for the ACQUIRE TARGET modal (empty name etc.).
  const [formError, setFormError] = useState<string | null>(null);
  const { tier } = useUser();

  // Onboarding gate → Auth gate
  useEffect(() => {
    (async () => {
      if (Platform.OS === 'web') {
        // Web: skip onboarding, show landing if not authenticated
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setShowLanding(true);
        } else {
          router.replace('/targets' as any);
        }
        return;
      }

      // Native: onboarding → auth gate
      const onboarded = await AsyncStorage.getItem('darko_onboarded');
      if (!onboarded) {
        router.replace('/onboarding');
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/auth');
      } else {
        setAuthReady(true);
        registerPushToken(); // non-blocking — requests permission and saves token
      }
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (Platform.OS === 'web') {
        if (!session) { setAuthReady(false); setShowLanding(true); }
        else { setShowLanding(false); router.replace('/targets' as any); }
      } else {
        if (!session) router.replace('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadTargets = async () => {
    const list = await getTargets();
    const withCounts = await Promise.all(
      list.map(async (t) => ({
        ...t,
        decodeCount: await getDecodeCount(t.id),
      })),
    );
    setTargets(withCounts);
  };

  useFocusEffect(
    useCallback(() => {
      loadTargets();
    }, []),
  );

  const resetModal = () => {
    setNewName('');
    setNewLeverage('');
    setNewObjective('');
    setFormError(null);
    setModalVisible(false);
  };

  const handleCreate = async () => {
    if (creating) return;
    const name = newName.trim();
    // BUG-06: empty target name was a silent no-op. Surface an inline error so
    // the user understands why ACQUIRE didn't fire.
    if (!name) {
      setFormError('TARGET NAME IS REQUIRED');
      return;
    }
    setFormError(null);

    const limit = TIER_LIMITS[tier].targets;
    if (targets.length >= limit) {
      resetModal();
      setPaywallVisible(true);
      return;
    }

    setCreating(true);
    try {
      const target = await saveTarget({
        name,
        leverage: newLeverage.trim() || undefined,
        objective: newObjective.trim() || undefined,
      });
      resetModal();
      router.push(`/decode?targetId=${target.id}&targetName=${encodeURIComponent(target.name)}`);
    } catch (err) {
      console.error('[DARKO] saveTarget error:', err);
      // saveTarget throws on error — stay in modal
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteTarget(id);
    loadTargets();
  };

  const renderTarget = ({ item }: { item: Target & { decodeCount: number } }) => (
    <TargetCard
      item={item}
      onPress={() => router.push(`/decode?targetId=${item.id}&targetName=${encodeURIComponent(item.name)}`)}
      onDelete={() => handleDelete(item.id)}
    />
  );

  if (showLanding) return <LandingPageV4 />;
  if (!authReady) return <View style={{ flex: 1, backgroundColor: BG }} />;

  if (isDesktop) {
    return (
      <>
        <DesktopLayout
          sidebar={
            <TargetSidebar
              targets={targets}
              onSelectTarget={(t) =>
                router.push(`/decode?targetId=${t.id}&targetName=${encodeURIComponent(t.name)}`)
              }
              onNewTarget={() => setModalVisible(true)}
              tier={tier}
            />
          }
          main={
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: MONO, fontSize: 11, color: TEXT_DIM, letterSpacing: 3 }}>
                // SELECT A TARGET
              </Text>
              <Text
                style={{
                  fontFamily: MONO,
                  fontSize: 9,
                  color: '#3D3D40',
                  letterSpacing: 2,
                  marginTop: 8,
                }}
              >
                or acquire a new one
              </Text>
            </View>
          }
        />
        {modalVisible && (
          <View style={styles.desktopModalOverlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={resetModal} />
            <TargetForm
              newName={newName} setNewName={setNewName}
              newLeverage={newLeverage} setNewLeverage={setNewLeverage}
              newObjective={newObjective} setNewObjective={setNewObjective}
              creating={creating} onCancel={resetModal} onCreate={handleCreate}
              formError={formError}
            />
          </View>
        )}
        <PaywallModal
          visible={paywallVisible}
          onClose={() => setPaywallVisible(false)}
          reason={`Free tier allows ${TIER_LIMITS.free.targets} active target. Upgrade to add more.`}
        />
      </>
    );
  }

  return (
    <View style={styles.root}>
    <View style={[styles.column, Platform.OS === 'web' && styles.webColumn]}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <DarkoLogo size={22} />
          </View>
          <Text style={styles.headerSub}>target profiles</Text>
        </View>
        <View style={styles.headerActions}>
          {tier === 'free' && (
            <>
              <TouchableOpacity
                onPress={() => router.push('/pricing' as any)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Text style={styles.upgradeLinkBtn}>↑ PRO</Text>
              </TouchableOpacity>
              {/* BUG-20: Observer reset hint so the user knows when their daily
                  session count resets without having to hit the cap first. */}
              <Text style={styles.resetHint}>
                resets at midnight UTC
              </Text>
            </>
          )}
          <TouchableOpacity
            onPress={() => supabase.auth.signOut()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.signOutBtn}>SIGN OUT</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.divider} />

      {targets.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>NO TARGETS ACQUIRED</Text>
          <Text style={styles.emptySubtext}>add a target to begin analysis</Text>
        </View>
      ) : (
        <FlatList
          data={targets}
          keyExtractor={(item) => item.id}
          renderItem={renderTarget}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Pressable
        style={[styles.addButton, addBtnHovered && Platform.OS === 'web' && styles.addButtonHovered]}
        onPress={() => setModalVisible(true)}
        onHoverIn={() => setAddBtnHovered(true)}
        onHoverOut={() => setAddBtnHovered(false)}
      >
        <Text style={styles.addButtonText}>+ NEW TARGET</Text>
      </Pressable>

      {/* Web: contained overlay within 480px column */}
      {Platform.OS === 'web' && modalVisible && (
        <View style={styles.webModalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={resetModal} />
          <TargetForm
            newName={newName} setNewName={setNewName}
            newLeverage={newLeverage} setNewLeverage={setNewLeverage}
            newObjective={newObjective} setNewObjective={setNewObjective}
            creating={creating} onCancel={resetModal} onCreate={handleCreate}
            formError={formError}
          />
        </View>
      )}

      {/* Native: full-screen Modal */}
      {Platform.OS !== 'web' && (
        <Modal visible={modalVisible} transparent animationType="fade">
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView
              contentContainerStyle={styles.modalScroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <TargetForm
                newName={newName} setNewName={setNewName}
                newLeverage={newLeverage} setNewLeverage={setNewLeverage}
                newObjective={newObjective} setNewObjective={setNewObjective}
                creating={creating} onCancel={resetModal} onCreate={handleCreate}
                formError={formError}
              />
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>
      )}

      <PaywallModal
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
        reason={`Free tier allows ${TIER_LIMITS.free.targets} active target. Upgrade to add more.`}
      />
    </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  column: {
    flex: 1,
    paddingTop: 64,
    paddingHorizontal: 20,
  },
  webColumn: {
    maxWidth: 680,
    alignSelf: 'center' as const,
    width: '100%' as any,
  },
  header: {
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerActions: {
    alignItems: 'flex-end',
    gap: 6,
    marginTop: 4,
  },
  upgradeLinkBtn: {
    fontFamily: MONO,
    fontSize: 9,
    color: ACCENT,
    letterSpacing: 2,
  },
  resetHint: {
    fontFamily: MONO,
    fontSize: 8,
    color: '#3D3D40',
    letterSpacing: 1,
    marginTop: 2,
  },
  signOutBtn: {
    fontFamily: MONO,
    fontSize: 9,
    color: TEXT_DIM,
    letterSpacing: 2,
  },
  headerLabel: {
    fontFamily: MONO,
    fontSize: 22,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    letterSpacing: 4,
  },
  betaBadge: {
    borderWidth: 1,
    borderColor: ACCENT,
    borderRadius: 2,
    paddingHorizontal: 5,
    paddingVertical: 2,
    alignSelf: 'center' as const,
  },
  betaBadgeText: {
    fontFamily: MONO,
    fontSize: 8,
    color: ACCENT,
    letterSpacing: 1,
  },
  headerSub: {
    fontFamily: MONO,
    fontSize: 11,
    color: TEXT_DIM,
    letterSpacing: 2,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: BORDER,
    marginVertical: 20,
  },
  list: {
    paddingBottom: 100,
  },
  targetCard: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 4,
    marginBottom: 10,
    padding: 16,
  },
  targetCardHovered: {
    borderColor: ACCENT,
    backgroundColor: '#1C1C1F',
  },
  targetCardInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  targetCardLeft: {
    flex: 1,
    marginRight: 12,
  },
  targetName: {
    fontFamily: MONO,
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    letterSpacing: 2,
  },
  targetMeta: {
    fontFamily: MONO,
    fontSize: 10,
    color: TEXT_DIM,
    letterSpacing: 1,
    marginTop: 4,
  },
  targetDossier: {
    fontFamily: MONO,
    fontSize: 9,
    color: '#3D3D40',
    letterSpacing: 1,
    marginTop: 3,
  },
  targetCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  chevron: {
    fontFamily: MONO,
    fontSize: 14,
    color: TEXT_DIM,
  },
  deleteBtn: {
    fontFamily: MONO,
    fontSize: 12,
    color: '#3D3D40',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
  },
  emptyText: {
    fontFamily: MONO,
    fontSize: 13,
    color: TEXT_DIM,
    letterSpacing: 3,
  },
  emptySubtext: {
    fontFamily: MONO,
    fontSize: 10,
    color: '#3D3D40',
    letterSpacing: 2,
    marginTop: 8,
  },
  addButton: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: ACCENT,
    borderRadius: 4,
    paddingVertical: 16,
    alignItems: 'center' as const,
  },
  addButtonHovered: {
    backgroundColor: '#D4FF00',
  },
  addButtonText: {
    fontFamily: MONO,
    fontSize: 13,
    fontWeight: '700',
    color: BG,
    letterSpacing: 4,
  },
  webModalOverlay: {
    position: 'absolute' as const,
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.88)',
    justifyContent: 'center' as const,
    padding: 20,
    zIndex: 100,
  },
  desktopModalOverlay: {
    position: 'fixed' as any,
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 1000,
    backgroundColor: 'rgba(0,0,0,0.88)',
    justifyContent: 'center' as const,
    padding: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
  },
  modalScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  modalBox: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 4,
    padding: 24,
  },
  modalTitle: {
    fontFamily: MONO,
    fontSize: 11,
    color: TEXT_DIM,
    letterSpacing: 3,
    marginBottom: 20,
  },
  modalFieldLabel: {
    fontFamily: MONO,
    fontSize: 9,
    color: TEXT_DIM,
    letterSpacing: 2,
    marginBottom: 8,
  },
  modalOptional: {
    color: '#3D3D40',
  },
  modalInput: {
    fontFamily: MONO,
    fontSize: 15,
    color: TEXT_PRIMARY,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingBottom: 8,
    marginBottom: 20,
    letterSpacing: 1,
  },
  modalInputLast: {
    borderBottomColor: BORDER,
    marginBottom: 24,
  },
  modalError: {
    fontFamily: MONO,
    fontSize: 10,
    color: '#FF4444',
    letterSpacing: 2,
    marginTop: -12,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancel: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 4,
    alignItems: 'center',
  },
  modalCancelText: {
    fontFamily: MONO,
    fontSize: 11,
    color: TEXT_DIM,
    letterSpacing: 2,
  },
  modalConfirm: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: TEXT_DIM,
    borderRadius: 4,
    alignItems: 'center',
  },
  modalConfirmDisabled: {
    opacity: 0.4,
  },
  modalConfirmText: {
    fontFamily: MONO,
    fontSize: 11,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    letterSpacing: 2,
  },
});
