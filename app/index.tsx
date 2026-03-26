import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Platform,
  Modal,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTargets, saveTarget, deleteTarget, getDecodeCount, type Target } from '../services/storage';
import { supabase } from '../lib/supabase';
import { registerPushToken } from '../services/notifications';

const ACCENT = '#CCFF00';
const BG = '#09090B';
const CARD_BG = '#18181B';
const BORDER = '#27272A';
const TEXT_PRIMARY = '#E4E4E7';
const TEXT_DIM = '#A1A1AA';
const MONO = Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' });
const SANS = Platform.select({ ios: 'System', android: 'sans-serif', default: 'sans-serif' });

// ── Web landing page (unauthenticated) ─────────────────────────────────────────

function LandingPage() {
  const router = useRouter();

  return (
    <View style={landing.root}>
      <StatusBar style="light" />

      {/* Center column */}
      <View style={landing.inner}>
        {/* Nav */}
        <View style={landing.nav}>
          <Text style={landing.navBrand}>// DARKO</Text>
          <View style={{ flexDirection: 'row', gap: 24 }}>
            <TouchableOpacity onPress={() => router.push('/privacy' as any)}>
              <Text style={landing.navLink}>privacy</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/terms' as any)}>
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

          <TouchableOpacity style={landing.cta} onPress={() => router.push('/auth' as any)} activeOpacity={0.85}>
            <Text style={landing.ctaText}>INITIALIZE SYSTEM</Text>
          </TouchableOpacity>

          <Text style={landing.ctaSub}>free to start · no credit card</Text>
        </View>

        {/* Features */}
        <View style={landing.features}>
          <Feature icon="↳" title="DECODE ANY MESSAGE" body="Paste a text. DARKO reads the psychology, assesses the power dynamic, and tells you what it means." />
          <Feature icon="→" title="GET THE EXACT SCRIPT" body="Not advice. The precise message to send, calibrated to the target's attachment style and communication patterns." />
          <Feature icon="◈" title="RUN THE CAMPAIGN" body="5-phase mission system. DARKO tracks your relationship arc and adapts strategy as the situation evolves." />
        </View>

        {/* Footer */}
        <View style={landing.footer}>
          <Text style={landing.footerText}>{'© 2026 DARKO · '}</Text>
          <TouchableOpacity onPress={() => router.push('/privacy' as any)}>
            <Text style={[landing.footerText, { color: TEXT_DIM }]}>Privacy</Text>
          </TouchableOpacity>
          <Text style={landing.footerText}>{' · '}</Text>
          <TouchableOpacity onPress={() => router.push('/terms' as any)}>
            <Text style={[landing.footerText, { color: TEXT_DIM }]}>Terms</Text>
          </TouchableOpacity>
        </View>
      </View>
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
    alignItems: 'center',
  },
  inner: {
    width: '100%' as any,
    maxWidth: 680,
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
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 24,
  },
  footerText: {
    fontFamily: MONO,
    fontSize: 10,
    color: '#3D3D40',
    letterSpacing: 1,
  },
});

// ── Main authenticated screen ───────────────────────────────────────────────────

export default function ProfilesScreen() {
  const router = useRouter();
  const [targets, setTargets] = useState<(Target & { decodeCount: number })[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newLeverage, setNewLeverage] = useState('');
  const [newObjective, setNewObjective] = useState('');
  const [creating, setCreating] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [showLanding, setShowLanding] = useState(false);

  // Onboarding gate → Auth gate
  useEffect(() => {
    (async () => {
      if (Platform.OS === 'web') {
        // Web: skip onboarding, show landing if not authenticated
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setShowLanding(true);
        } else {
          setAuthReady(true);
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
        else { setShowLanding(false); setAuthReady(true); }
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
    setModalVisible(false);
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name || creating) return;
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
    <TouchableOpacity
      style={styles.targetCard}
      onPress={() => {
        router.push(`/decode?targetId=${item.id}&targetName=${encodeURIComponent(item.name)}`);
      }}
      activeOpacity={0.7}
    >
      <View style={styles.targetCardInner}>
        <View style={styles.targetCardLeft}>
          <Text style={styles.targetName}>{item.name.toUpperCase()}</Text>
          <Text style={styles.targetMeta}>
            {item.decodeCount === 0
              ? 'no decodes yet'
              : `${item.decodeCount} decode${item.decodeCount !== 1 ? 's' : ''}`}
          </Text>
          {(item.leverage || item.objective) && (
            <Text style={styles.targetDossier} numberOfLines={1}>
              {item.objective ? `obj: ${item.objective}` : `lev: ${item.leverage}`}
            </Text>
          )}
        </View>
        <View style={styles.targetCardRight}>
          <Text style={styles.chevron}>&gt;</Text>
          <TouchableOpacity
            onPress={() => handleDelete(item.id)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.deleteBtn}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (showLanding) return <LandingPage />;
  if (!authReady) return <View style={styles.root} />;

  return (
    <View style={[styles.root, Platform.OS === 'web' && styles.rootWeb]}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <View>
          <Text style={styles.headerLabel}>// DARKO</Text>
          <Text style={styles.headerSub}>target profiles</Text>
        </View>
        <TouchableOpacity
          onPress={() => supabase.auth.signOut()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.signOutBtn}>SIGN OUT</Text>
        </TouchableOpacity>
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

      <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)} activeOpacity={0.85}>
        <Text style={styles.addButtonText}>+ NEW TARGET</Text>
      </TouchableOpacity>

      {/* New Target Modal */}
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
                onSubmitEditing={handleCreate}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancel}
                  onPress={resetModal}
                >
                  <Text style={styles.modalCancelText}>CANCEL</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalConfirm, creating && styles.modalConfirmDisabled]}
                  onPress={handleCreate}
                  disabled={creating}
                >
                  <Text style={styles.modalConfirmText}>{creating ? 'ACQUIRING...' : 'ACQUIRE'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
    paddingTop: 64,
    paddingHorizontal: 20,
  },
  rootWeb: {
    maxWidth: 600,
    alignSelf: 'center' as const,
    width: '100%' as any,
  },
  header: {
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  signOutBtn: {
    fontFamily: MONO,
    fontSize: 9,
    color: TEXT_DIM,
    letterSpacing: 2,
    marginTop: 6,
  },
  headerLabel: {
    fontFamily: MONO,
    fontSize: 22,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    letterSpacing: 4,
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
    alignItems: 'center',
  },
  addButtonText: {
    fontFamily: MONO,
    fontSize: 13,
    fontWeight: '700',
    color: BG,
    letterSpacing: 4,
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
