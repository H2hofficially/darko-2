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

const ACCENT = '#CCFF00';
const BG = '#09090B';
const CARD_BG = '#18181B';
const BORDER = '#27272A';
const TEXT_PRIMARY = '#E4E4E7';
const TEXT_DIM = '#A1A1AA';
const MONO = Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' });
const SANS = Platform.select({ ios: 'System', android: 'sans-serif', default: 'sans-serif' });

export default function ProfilesScreen() {
  const router = useRouter();
  const [targets, setTargets] = useState<(Target & { decodeCount: number })[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newLeverage, setNewLeverage] = useState('');
  const [newObjective, setNewObjective] = useState('');
  const [creating, setCreating] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  // Onboarding gate → Auth gate
  useEffect(() => {
    (async () => {
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
      }
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace('/auth');
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadTargets = async () => {
    console.log('[DARKO] loadTargets: fetching...');
    const list = await getTargets();
    console.log('[DARKO] loadTargets: got', list.length, 'targets:', JSON.stringify(list.map(t => ({ id: t.id, name: t.name }))));
    const withCounts = await Promise.all(
      list.map(async (t) => ({
        ...t,
        decodeCount: await getDecodeCount(t.id),
      })),
    );
    console.log('[DARKO] loadTargets: setting state with', withCounts.length, 'targets');
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
      console.log('[DARKO] target created:', JSON.stringify({ id: target.id, name: target.name }));
      resetModal();
      console.log('[DARKO] navigating to decode — targetId:', target.id);
      router.push(`/decode?targetId=${target.id}&targetName=${encodeURIComponent(target.name)}`);
    } catch (err) {
      console.log('[DARKO] saveTarget error:', err);
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
        console.log('[DARKO] navigating to decode — targetId:', item.id, 'targetName:', item.name);
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

  if (!authReady) return <View style={styles.root} />;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <View>
          <Text style={styles.headerLabel}>[ DARKO ]</Text>
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
