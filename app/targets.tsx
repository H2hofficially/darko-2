import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
  Animated,
  Modal,
  KeyboardAvoidingView,
  useWindowDimensions,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppNav } from '../components/AppNav';
import { AppStatusBar } from '../components/AppStatusBar';
import { PaywallModal } from '../components/PaywallModal';
import {
  getTargets,
  saveTarget,
  deleteTarget,
  getTargetProfile,
  getMissionPhase,
  type Target,
  type TargetProfile,
} from '../services/storage';
import { useUser, TIER_LIMITS } from '../context/UserContext';
import { supabase } from '../lib/supabase';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { Playbook } from '../components/Playbook';

// ── Constants ─────────────────────────────────────────────────────────────────

const ACCENT = '#CCFF00';
const BG = '#09090B';
const S1 = '#18181B';
const S2 = '#1e1e21';
const BORDER = '#27272A';
const B2 = '#3f3f46';
const DIM = '#52525b';
const MUTED = '#a1a1aa';
const TEXT = '#fafafa';

const MONO = Platform.select({
  ios: 'Courier New',
  android: 'monospace',
  default: "'JetBrains Mono', monospace",
});
const SANS = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: "'Inter', sans-serif",
});

// Map 1-5 mission phase to 4-phase prototype names
const PHASE_LABELS: Record<number, string> = {
  1: 'APPROACH',
  2: 'BUILD',
  3: 'DECIDE',
  4: 'COMMIT',
  5: 'COMMIT',
};

const PHASE_COLORS: Record<string, string> = {
  APPROACH: '#60A5FA',
  BUILD: '#C084FC',
  DECIDE: ACCENT,
  COMMIT: '#34D399',
};

// ── Types ─────────────────────────────────────────────────────────────────────

type TargetRow = Target & {
  phase: number;
  phaseLabel: string;
  profile: TargetProfile | null;
  confidence: number;
  lastDecode: string | null;
};

type SortKey = 'name' | 'phase' | 'confidence' | 'lastDecode';

// ── Helpers ───────────────────────────────────────────────────────────────────

function phaseLabel(n: number): string {
  return PHASE_LABELS[n] ?? 'APPROACH';
}

function confidenceFromProfile(p: TargetProfile | null): number {
  if (!p) return 0;
  const s = p.vulnerability_score;
  if (!s) return 0;
  const n = parseFloat(s);
  return isNaN(n) ? 50 : Math.min(100, Math.max(0, Math.round(n * 10)));
}

function formatRelative(iso: string | null): string {
  if (!iso) return 'never';
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

// ── Create Target Form ────────────────────────────────────────────────────────

function CreateTargetForm({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (name: string, leverage?: string, objective?: string) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [leverage, setLeverage] = useState('');
  const [objective, setObjective] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    await onCreate(name.trim(), leverage.trim() || undefined, objective.trim() || undefined);
    setSaving(false);
  };

  return (
    <View style={cf.box}>
      <Text style={cf.title}>ACQUIRE TARGET</Text>

      <Text style={cf.label}>TARGET NAME</Text>
      <TextInput
        style={cf.input}
        value={name}
        onChangeText={setName}
        placeholder="e.g. Alex"
        placeholderTextColor={DIM}
        autoFocus
        returnKeyType="next"
      />

      <Text style={cf.label}>LEVERAGE <Text style={cf.opt}>(optional)</Text></Text>
      <TextInput
        style={cf.input}
        value={leverage}
        onChangeText={setLeverage}
        placeholder="what they have over you..."
        placeholderTextColor={DIM}
        returnKeyType="next"
      />

      <Text style={cf.label}>OBJECTIVE <Text style={cf.opt}>(optional)</Text></Text>
      <TextInput
        style={[cf.input, { marginBottom: 20 }]}
        value={objective}
        onChangeText={setObjective}
        placeholder="what you want from them..."
        placeholderTextColor={DIM}
        returnKeyType="done"
        onSubmitEditing={handleSubmit}
      />

      <View style={cf.btns}>
        <TouchableOpacity style={cf.cancel} onPress={onClose}>
          <Text style={cf.cancelText}>CANCEL</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[cf.confirm, (!name.trim() || saving) && cf.confirmDisabled]}
          onPress={handleSubmit}
          disabled={!name.trim() || saving}
        >
          <Text style={cf.confirmText}>{saving ? 'ACQUIRING...' : 'ACQUIRE'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const cf = StyleSheet.create({
  box: {
    backgroundColor: S1,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 24,
    width: '100%' as any,
    maxWidth: 400,
  },
  title: {
    fontFamily: MONO as any,
    fontSize: 11,
    color: ACCENT,
    letterSpacing: 3,
    marginBottom: 20,
  },
  label: {
    fontFamily: MONO as any,
    fontSize: 9,
    color: DIM,
    letterSpacing: 2,
    marginBottom: 6,
  },
  opt: {
    color: B2,
    fontSize: 8,
  },
  input: {
    fontFamily: MONO as any,
    fontSize: 12,
    color: TEXT,
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
    outlineStyle: 'none',
  } as any,
  btns: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
  cancel: {
    borderWidth: 1,
    borderColor: BORDER,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  cancelText: { fontFamily: MONO as any, fontSize: 9, color: DIM, letterSpacing: 2 },
  confirm: {
    backgroundColor: ACCENT,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  confirmDisabled: { opacity: 0.4 },
  confirmText: { fontFamily: MONO as any, fontSize: 9, color: BG, fontWeight: '700', letterSpacing: 2 },
});

// ── Detail Drawer ─────────────────────────────────────────────────────────────

function DetailDrawer({
  target,
  onClose,
  onDecode,
  onDelete,
  onPhaseAdvanced,
  bottomSheet,
}: {
  target: TargetRow | null;
  onClose: () => void;
  onDecode: (t: TargetRow) => void;
  onDelete: (t: TargetRow) => void;
  onPhaseAdvanced?: (newPhase: number) => void;
  bottomSheet?: boolean;
}) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  // Side mode: capped at 360, but never more than ~32% of viewport so a tablet-
  // landscape (640–1023px) doesn't get a 360px drawer over a 280px table.
  const sideWidth = Math.min(360, Math.max(280, screenWidth * 0.32));
  // Bottom-sheet mode: full width, height capped at 85% of viewport (or 720).
  const sheetHeight = Math.min(screenHeight * 0.85, 720);
  const offscreen = bottomSheet ? sheetHeight : sideWidth;
  const slideAnim = useRef(new Animated.Value(offscreen)).current;
  const prevTarget = useRef<TargetRow | null>(null);

  useEffect(() => {
    if (target) {
      prevTarget.current = target;
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: offscreen,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [target, offscreen]);

  const t = target ?? prevTarget.current;
  if (!t) return null;

  const p = t.profile;
  const phaseLbl = t.phaseLabel;
  const phaseColor = PHASE_COLORS[phaseLbl] ?? MUTED;

  // Shared content used in both side-drawer and bottom-sheet modes.
  const inner = (
    <>
      {/* Header */}
      <View style={dd.header}>
        <View style={{ flex: 1 }}>
          <Text style={dd.name}>{t.name.toUpperCase()}</Text>
          <Text style={dd.meta}>
            {t.objective ? `OBJ: ${t.objective}` : t.leverage ? `LEV: ${t.leverage}` : 'no objective set'}
          </Text>
        </View>
        <TouchableOpacity style={dd.closeBtn} onPress={onClose}>
          <Text style={dd.closeText}>✕ CLOSE</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={dd.body} showsVerticalScrollIndicator={false}>
        {/* Phase + confidence */}
        <View style={dd.section}>
          <Text style={dd.sectionLabel}>// STATUS</Text>
          <DrawerRow k="MISSION_PHASE" v={phaseLbl} accent />
          <DrawerRow k="CONFIDENCE" v={`${t.confidence}%`} />
          <DrawerRow k="LAST_DECODE" v={formatRelative(t.lastDecode)} />
        </View>

        {/* Psychological profile */}
        {p && (
          <View style={dd.section}>
            <Text style={dd.sectionLabel}>// BEHAVIORAL PROFILE</Text>
            {p.dominant_archetype && <DrawerRow k="ARCHETYPE" v={p.dominant_archetype} accent />}
            {p.attachment_style && <DrawerRow k="ATTACHMENT" v={p.attachment_style} />}
            {p.power_dynamic && <DrawerRow k="POWER_DYNAMIC" v={p.power_dynamic} />}
            {p.relationship_momentum && <DrawerRow k="MOMENTUM" v={p.relationship_momentum} />}
            {p.last_known_emotional_state && <DrawerRow k="EMOTIONAL_STATE" v={p.last_known_emotional_state} />}
            {p.target_communication_style && <DrawerRow k="COMM_STYLE" v={p.target_communication_style} />}
          </View>
        )}

        {/* Manipulation vectors */}
        {p?.manipulation_patterns && p.manipulation_patterns.length > 0 && (
          <View style={dd.section}>
            <Text style={dd.sectionLabel}>// MANIPULATION VECTORS</Text>
            {p.manipulation_patterns.slice(0, 4).map((mp, i) => (
              <View key={i} style={dd.bulletRow}>
                <Text style={dd.bullet}>▸</Text>
                <Text style={dd.bulletText}>{mp}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Operative mistakes */}
        {p?.operative_mistakes && p.operative_mistakes.length > 0 && (
          <View style={dd.section}>
            <Text style={dd.sectionLabel}>// OPERATIVE MISTAKES</Text>
            {p.operative_mistakes.slice(0, 3).map((m, i) => (
              <View key={i} style={dd.bulletRow}>
                <Text style={[dd.bullet, { color: '#F59E0B' }]}>!</Text>
                <Text style={dd.bulletText}>{m}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Summary */}
        {p?.summary && (
          <View style={dd.section}>
            <Text style={dd.sectionLabel}>// INTELLIGENCE BRIEF</Text>
            <Text style={dd.summary}>{p.summary}</Text>
          </View>
        )}

        {/* Playbook — what was the Campaigns screen, now inline. */}
        <View style={[dd.section, { paddingHorizontal: 0, paddingTop: 14, paddingBottom: 6 }]}>
          <Text style={[dd.sectionLabel, { paddingHorizontal: 18 }]}>// PLAYBOOK</Text>
          <Playbook
            targetId={t.id}
            currentPhase={t.phase}
            onPhaseAdvanced={onPhaseAdvanced}
          />
        </View>
      </ScrollView>

      {/* Actions */}
      <View style={dd.actions}>
        <TouchableOpacity style={dd.btnPrimary} onPress={() => onDecode(t)}>
          <Text style={dd.btnPrimaryText}>DECODE</Text>
        </TouchableOpacity>
        <TouchableOpacity style={dd.btnDanger} onPress={() => onDelete(t)}>
          <Text style={dd.btnDangerText}>DELETE</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  if (bottomSheet) {
    return (
      <>
        {target && <Pressable style={dd.backdrop} onPress={onClose} />}
        <Animated.View
          style={[
            dd.sheet,
            { height: sheetHeight, transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Drag handle */}
          <View style={dd.sheetHandleWrap}>
            <View style={dd.sheetHandle} />
          </View>
          {inner}
        </Animated.View>
      </>
    );
  }

  return (
    <Animated.View style={[dd.drawer, { width: sideWidth, transform: [{ translateX: slideAnim }] }]}>
      {inner}
    </Animated.View>
  );
}

function DrawerRow({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return (
    <View style={dd.row}>
      <Text style={dd.rowKey}>{k}</Text>
      <Text style={[dd.rowVal, accent && { color: ACCENT }]}>{v}</Text>
    </View>
  );
}

const dd = StyleSheet.create({
  drawer: {
    position: 'absolute' as any,
    top: 0,
    right: 0,
    bottom: 0,
    width: 360,
    backgroundColor: 'rgba(18,18,21,0.97)' as any,
    borderLeftWidth: 1,
    borderLeftColor: ACCENT,
    flexDirection: 'column',
    zIndex: 200,
  },
  sheet: {
    position: 'absolute' as any,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(18,18,21,0.98)' as any,
    borderTopWidth: 1,
    borderTopColor: ACCENT,
    flexDirection: 'column',
    zIndex: 200,
  },
  backdrop: {
    position: 'absolute' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)' as any,
    zIndex: 199,
  },
  sheetHandleWrap: {
    paddingTop: 8,
    paddingBottom: 4,
    alignItems: 'center',
    flexShrink: 0,
  },
  sheetHandle: {
    width: 36,
    height: 3,
    borderRadius: 2,
    backgroundColor: B2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    gap: 12,
  },
  name: {
    fontFamily: MONO as any,
    fontSize: 11,
    color: TEXT,
    letterSpacing: 2,
    fontWeight: '600',
    marginBottom: 3,
  },
  meta: {
    fontFamily: MONO as any,
    fontSize: 8,
    color: DIM,
    letterSpacing: 1,
  },
  closeBtn: {
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  closeText: { fontFamily: MONO as any, fontSize: 8, color: DIM, letterSpacing: 1 },
  body: { flex: 1 },
  section: {
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    padding: 14,
    paddingLeft: 18,
    paddingRight: 18,
  },
  sectionLabel: {
    fontFamily: MONO as any,
    fontSize: 8,
    color: ACCENT,
    letterSpacing: 2,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(39,39,42,0.4)',
  },
  rowKey: { fontFamily: MONO as any, fontSize: 8, color: MUTED, letterSpacing: 1, flex: 0.45 },
  rowVal: { fontFamily: MONO as any, fontSize: 8, color: TEXT, fontWeight: '500', flex: 0.55, textAlign: 'right' },
  bulletRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  bullet: { fontFamily: MONO as any, fontSize: 9, color: ACCENT, marginTop: 1 },
  bulletText: { fontFamily: SANS as any, fontSize: 11, color: MUTED, lineHeight: 16, flex: 1 },
  summary: { fontFamily: SANS as any, fontSize: 12, color: MUTED, lineHeight: 18 },
  actions: {
    flexDirection: 'row',
    gap: 8,
    padding: 14,
    paddingHorizontal: 18,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  btnPrimary: {
    flex: 1,
    backgroundColor: ACCENT,
    paddingVertical: 10,
    alignItems: 'center',
  },
  btnPrimaryText: { fontFamily: MONO as any, fontSize: 10, color: BG, fontWeight: '700', letterSpacing: 2 },
  btnSecondary: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
  },
  btnSecondaryText: { fontFamily: MONO as any, fontSize: 10, color: DIM, letterSpacing: 2 },
  btnDanger: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#3D1212',
    alignItems: 'center',
  },
  btnDangerText: { fontFamily: MONO as any, fontSize: 10, color: '#EF4444', letterSpacing: 2 },
});

// ── Phase Badge ───────────────────────────────────────────────────────────────

function PhaseBadge({ label }: { label: string }) {
  const color = PHASE_COLORS[label] ?? MUTED;
  return (
    <View style={[pb.badge, { borderColor: color + '4D', backgroundColor: color + '0F' }]}>
      <Text style={[pb.text, { color }]}>{label}</Text>
    </View>
  );
}

const pb = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: { fontFamily: MONO as any, fontSize: 8, letterSpacing: 2 },
});

// ── Confidence Bar ────────────────────────────────────────────────────────────

function ConfBar({ value }: { value: number }) {
  const width = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(width, {
      toValue: value,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [value]);
  return (
    <View style={cbr.wrap}>
      <View style={cbr.track}>
        <Animated.View style={[cbr.fill, { width: width.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }]} />
      </View>
      <Text style={cbr.val}>{value}%</Text>
    </View>
  );
}

const cbr = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  track: { width: 60, height: 4, backgroundColor: BORDER },
  fill: { height: 4, backgroundColor: ACCENT },
  val: { fontFamily: MONO as any, fontSize: 9, color: MUTED, minWidth: 28 },
});

// ── Web Table View ────────────────────────────────────────────────────────────

type SortDir = 'asc' | 'desc';

function WebTable({
  rows,
  selectedId,
  onSelect,
  onSort,
  sortKey,
  sortDir,
}: {
  rows: TargetRow[];
  selectedId: string | null;
  onSelect: (t: TargetRow) => void;
  onSort: (k: SortKey) => void;
  sortKey: SortKey;
  sortDir: SortDir;
}) {
  const SortArrow = ({ k }: { k: SortKey }) =>
    sortKey === k ? <Text style={wt.arrow}>{sortDir === 'asc' ? '↑' : '↓'}</Text> : null;

  return (
    <View style={wt.tableWrap}>
      {/* Header */}
      <View style={wt.thead}>
        <TouchableOpacity style={[wt.th, { flex: 2 }]} onPress={() => onSort('name')}>
          <Text style={[wt.thText, sortKey === 'name' && wt.thActive]}>TARGET <SortArrow k="name" /></Text>
        </TouchableOpacity>
        <TouchableOpacity style={[wt.th, { flex: 1 }]} onPress={() => onSort('phase')}>
          <Text style={[wt.thText, sortKey === 'phase' && wt.thActive]}>PHASE <SortArrow k="phase" /></Text>
        </TouchableOpacity>
        <View style={[wt.th, { flex: 1.5 }]}>
          <Text style={wt.thText}>ARCHETYPE</Text>
        </View>
        <TouchableOpacity style={[wt.th, { flex: 1 }]} onPress={() => onSort('confidence')}>
          <Text style={[wt.thText, sortKey === 'confidence' && wt.thActive]}>CONFIDENCE <SortArrow k="confidence" /></Text>
        </TouchableOpacity>
        <TouchableOpacity style={[wt.th, { flex: 1 }]} onPress={() => onSort('lastDecode')}>
          <Text style={[wt.thText, sortKey === 'lastDecode' && wt.thActive]}>LAST DECODE <SortArrow k="lastDecode" /></Text>
        </TouchableOpacity>
      </View>

      {/* Rows */}
      <ScrollView showsVerticalScrollIndicator={false}>
        {rows.map((row) => (
          <TouchableOpacity
            key={row.id}
            style={[wt.row, selectedId === row.id && wt.rowSelected]}
            onPress={() => onSelect(row)}
            activeOpacity={0.7}
          >
            <View style={[wt.cell, { flex: 2 }]}>
              <Text style={wt.nameText}>{row.name.toUpperCase()}</Text>
              {row.objective && (
                <Text style={wt.nameSub} numberOfLines={1}>obj: {row.objective}</Text>
              )}
            </View>
            <View style={[wt.cell, { flex: 1 }]}>
              <PhaseBadge label={row.phaseLabel} />
            </View>
            <View style={[wt.cell, { flex: 1.5 }]}>
              <Text style={wt.archetypeText} numberOfLines={1}>
                {row.profile?.dominant_archetype ?? '—'}
              </Text>
            </View>
            <View style={[wt.cell, { flex: 1 }]}>
              <ConfBar value={row.confidence} />
            </View>
            <View style={[wt.cell, { flex: 1 }]}>
              <Text style={wt.decodeText}>{formatRelative(row.lastDecode)}</Text>
            </View>
          </TouchableOpacity>
        ))}
        {rows.length === 0 && (
          <View style={wt.empty}>
            <Text style={wt.emptyText}>NO TARGETS MATCH</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const wt = StyleSheet.create({
  tableWrap: { flex: 1, overflow: 'hidden' as any },
  thead: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: S1,
    paddingHorizontal: 16,
  },
  th: { paddingVertical: 10, paddingHorizontal: 4 },
  thText: { fontFamily: MONO as any, fontSize: 8, color: DIM, letterSpacing: 2 },
  thActive: { color: ACCENT },
  arrow: { fontFamily: MONO as any, fontSize: 8, color: ACCENT, marginLeft: 4 },
  row: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(39,39,42,0.4)' as any,
  },
  rowSelected: {
    backgroundColor: 'rgba(204,255,0,0.04)' as any,
    borderLeftWidth: 2,
    borderLeftColor: ACCENT,
  },
  cell: { paddingHorizontal: 4, justifyContent: 'center' },
  nameText: { fontFamily: MONO as any, fontSize: 10, color: TEXT, letterSpacing: 1, fontWeight: '500' },
  nameSub: { fontFamily: MONO as any, fontSize: 8, color: DIM, marginTop: 2, letterSpacing: 1 },
  archetypeText: { fontFamily: MONO as any, fontSize: 9, color: MUTED, letterSpacing: 1 },
  decodeText: { fontFamily: MONO as any, fontSize: 9, color: DIM, letterSpacing: 1 },
  empty: { padding: 32, alignItems: 'center' },
  emptyText: { fontFamily: MONO as any, fontSize: 10, color: DIM, letterSpacing: 3 },
});

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function TargetsScreen() {
  const router = useRouter();
  const { isPhone, useBottomSheet } = useBreakpoint();
  // "Web table" view applies on tablet + desktop. Phone gets card list.
  const isWeb = !isPhone && Platform.OS === 'web';
  const { tier } = useUser();

  const [rows, setRows] = useState<TargetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [selectedRow, setSelectedRow] = useState<TargetRow | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const targets = await getTargets();

      const enriched = await Promise.all(
        targets.map(async (t) => {
          const [phase, profile] = await Promise.all([
            getMissionPhase(t.id),
            getTargetProfile(t.id),
          ]);

          // Last decode: get most recent darko message timestamp
          const { data: lastMsg } = await supabase
            .from('conversation_messages')
            .select('created_at')
            .eq('target_id', t.id)
            .eq('role', 'darko')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          return {
            ...t,
            phase,
            phaseLabel: phaseLabel(phase),
            profile,
            confidence: confidenceFromProfile(profile),
            lastDecode: lastMsg?.created_at ?? null,
          } as TargetRow;
        })
      );

      setRows(enriched);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadAll(); }, [loadAll]));

  // Sort handler
  const handleSort = (k: SortKey) => {
    if (k === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(k);
      setSortDir('asc');
    }
  };

  // Sort only — filter chips and search were removed (overkill for 1–10 targets).
  const displayed = [...rows].sort((a, b) => {
    let cmp = 0;
    if (sortKey === 'name') cmp = a.name.localeCompare(b.name);
    else if (sortKey === 'phase') cmp = a.phase - b.phase;
    else if (sortKey === 'confidence') cmp = a.confidence - b.confidence;
    else if (sortKey === 'lastDecode') {
      const da = a.lastDecode ? new Date(a.lastDecode).getTime() : 0;
      const db = b.lastDecode ? new Date(b.lastDecode).getTime() : 0;
      cmp = da - db;
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const handleCreate = async (name: string, leverage?: string, objective?: string) => {
    const limit = TIER_LIMITS[tier].targets;
    if (rows.length >= limit) {
      setShowCreate(false);
      setPaywallVisible(true);
      return;
    }
    await saveTarget({ name, leverage, objective });
    setShowCreate(false);
    await loadAll();
  };

  const handleDelete = async (t: TargetRow) => {
    await deleteTarget(t.id);
    if (selectedRow?.id === t.id) setSelectedRow(null);
    await loadAll();
  };

  const handleDecode = (t: TargetRow) => {
    router.push(`/decode?targetId=${t.id}&targetName=${encodeURIComponent(t.name)}` as any);
  };

  // When the playbook advances a target's mission_phase, refresh the list so
  // the phase badge and progress reflect the new phase immediately.
  const handlePhaseAdvanced = useCallback(() => {
    loadAll();
  }, [loadAll]);

  // ── Native list render ──────────────────────────────────────────────────────

  const renderNativeRow = ({ item }: { item: TargetRow }) => (
    <TouchableOpacity
      style={nat.card}
      // Web: open bottom sheet for actions. Native (dead path on darkoapp.com):
      // go straight to decode.
      onPress={() => (Platform.OS === 'web' ? setSelectedRow(item) : handleDecode(item))}
      activeOpacity={0.7}
    >
      <View style={nat.cardTop}>
        <Text style={nat.cardName}>{item.name.toUpperCase()}</Text>
        <PhaseBadge label={item.phaseLabel} />
      </View>
      {item.profile?.dominant_archetype && (
        <Text style={nat.cardArchetype}>{item.profile.dominant_archetype}</Text>
      )}
      <View style={nat.cardBottom}>
        <ConfBar value={item.confidence} />
        <Text style={nat.cardDecodeTime}>{formatRelative(item.lastDecode)}</Text>
      </View>
    </TouchableOpacity>
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <View style={s.root}>
      <StatusBar style="light" />

      {Platform.OS === 'web' && <AppNav />}

      {/* Toolbar — minimal: just the screen title and count. Filter chips and
          search were dropped (low value at typical target counts). "+ NEW" is
          a floating button at the bottom-right. */}
      <View style={s.toolbar}>
        <Text style={s.toolbarTitle}>TARGETS</Text>
        <Text style={s.toolbarCount}>{rows.length}</Text>
      </View>

      {/* Content */}
      <View style={s.content}>
        {isWeb ? (
          <>
            <WebTable
              rows={displayed}
              selectedId={selectedRow?.id ?? null}
              onSelect={setSelectedRow}
              onSort={handleSort}
              sortKey={sortKey}
              sortDir={sortDir}
            />

            {/* Detail drawer */}
            <DetailDrawer
              target={selectedRow}
              onClose={() => setSelectedRow(null)}
              onDecode={handleDecode}
              onDelete={handleDelete}
              onPhaseAdvanced={handlePhaseAdvanced}
              bottomSheet={useBottomSheet}
            />
          </>
        ) : (
          <>
            {/*
              ScrollView + map (instead of FlatList) for the phone card list.
              FlatList virtualization on react-native-web was only rendering
              the first batch of rows on mobile — Hari saw 5-7 of 18 targets
              even after the flex:1 + bottom-padding fixes. Swapping to a
              plain ScrollView pushes every row into the DOM upfront and lets
              the browser's native scroll handle it. This is the same pattern
              the desktop WebTable already uses, and it'll be the basis for
              the upcoming unified-design refactor.
            */}
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={[nat.list, { paddingBottom: 120 }]}
              showsVerticalScrollIndicator={false}
            >
              {displayed.length === 0 ? (
                <View style={nat.empty}>
                  <Text style={nat.emptyText}>NO TARGETS ACQUIRED</Text>
                  <Text style={nat.emptySub}>tap + to add one</Text>
                </View>
              ) : (
                displayed.map((item) => (
                  <React.Fragment key={item.id}>
                    {renderNativeRow({ item })}
                  </React.Fragment>
                ))
              )}
            </ScrollView>
            {/* Phone web also gets the bottom-sheet drawer when a row is tapped */}
            {Platform.OS === 'web' && (
              <DetailDrawer
                target={selectedRow}
                onClose={() => setSelectedRow(null)}
                onDecode={handleDecode}
                onDelete={handleDelete}
                onPhaseAdvanced={handlePhaseAdvanced}
                bottomSheet
              />
            )}
          </>
        )}
      </View>

      {Platform.OS === 'web' && <AppStatusBar />}

      {/* FAB — primary "new target" affordance everywhere. Hide when an
          overlay is open so the user can't double-tap into it. */}
      {!selectedRow && !showCreate && (
        <Pressable style={s.fab} onPress={() => setShowCreate(true)}>
          <Text style={s.fabText}>+</Text>
        </Pressable>
      )}

      {/* Create overlay */}
      {showCreate && (
        <View style={s.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowCreate(false)} />
          <CreateTargetForm
            onClose={() => setShowCreate(false)}
            onCreate={handleCreate}
          />
        </View>
      )}

      {/* Native create modal */}
      {Platform.OS !== 'web' && (
        <Modal visible={showCreate} transparent animationType="slide">
          <KeyboardAvoidingView behavior="padding" style={s.nativeModal}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowCreate(false)} />
            <View style={s.nativeModalInner}>
              <CreateTargetForm
                onClose={() => setShowCreate(false)}
                onCreate={handleCreate}
              />
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}

      <PaywallModal
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
        reason={`Free tier allows ${TIER_LIMITS.free.targets} active target. Upgrade to add more.`}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG, flexDirection: 'column' },
  toolbar: {
    height: 40,
    backgroundColor: S1,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
    flexShrink: 0,
  },
  toolbarTitle: { fontFamily: MONO as any, fontSize: 10, color: TEXT, letterSpacing: 3 },
  toolbarCount: { fontFamily: MONO as any, fontSize: 9, color: DIM, letterSpacing: 2 },
  fab: {
    position: 'absolute' as any,
    right: 18,
    // Clears the AppStatusBar (height 30) plus a comfortable thumb margin.
    bottom: 50,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 250,
    // Subtle shadow on web (boxShadow is honored by react-native-web)
    boxShadow: '0 4px 14px rgba(204,255,0,0.35)',
  } as any,
  fabText: {
    fontFamily: SANS as any,
    fontSize: 30,
    fontWeight: '300',
    color: BG,
    marginTop: -3,
  },
  content: { flex: 1, position: 'relative' as any, overflow: 'hidden' as any },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)' as any,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 300,
  },
  nativeModal: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' as any },
  nativeModalInner: { padding: 16 },
});

const nat = StyleSheet.create({
  list: { padding: 16, gap: 8 },
  card: {
    backgroundColor: S1,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    gap: 6,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardName: { fontFamily: MONO as any, fontSize: 11, color: TEXT, letterSpacing: 2, fontWeight: '600' },
  cardArchetype: { fontFamily: MONO as any, fontSize: 9, color: MUTED, letterSpacing: 1 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  cardDecodeTime: { fontFamily: MONO as any, fontSize: 9, color: DIM },
  empty: { padding: 48, alignItems: 'center', gap: 8 },
  emptyText: { fontFamily: MONO as any, fontSize: 10, color: DIM, letterSpacing: 3 },
  emptySub: { fontFamily: MONO as any, fontSize: 9, color: B2, letterSpacing: 1 },
});
