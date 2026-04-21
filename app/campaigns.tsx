import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
  TextInput,
  useWindowDimensions,
  Animated,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppNav } from '../components/AppNav';
import { AppStatusBar } from '../components/AppStatusBar';
import {
  getTargets,
  getMissionPhase,
  saveMissionPhase,
  getTargetProfile,
  type Target,
  type TargetProfile,
} from '../services/storage';
import { supabase } from '../lib/supabase';

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

// ── Phase config ──────────────────────────────────────────────────────────────

const PHASES = [
  {
    num: 1,
    label: 'APPROACH',
    color: '#60A5FA',
    objective: 'Establish initial contact and create intrigue. The goal is to enter their awareness without triggering resistance.',
    tactics: [
      { title: 'Cold read opener', desc: 'Lead with a specific behavioral observation, not a generic opener. Reference something they did or said.', timing: 'Day 1–3' },
      { title: 'Strategic scarcity', desc: 'Reply at 60–80% of their speed. Never instant. Creates perceived demand without visible effort.', timing: 'Ongoing' },
      { title: 'Identity mirror', desc: 'Reflect their self-image back at them. People are drawn to those who confirm their desired self-concept.', timing: 'First 3 interactions' },
      { title: 'Curiosity gap', desc: 'End conversations at a peak, never at a resolution. Leave a thread deliberately open.', timing: 'Every interaction' },
    ],
    scripts: [
      '"I noticed something about the way you handled [situation]. Most people don\'t catch that."',
      '"You seem like someone who values [their expressed value] over most things."',
    ],
  },
  {
    num: 2,
    label: 'BUILD',
    color: '#C084FC',
    objective: 'Deepen rapport and establish psychological investment. Make them feel uniquely seen — then pull back slightly.',
    tactics: [
      { title: 'Vulnerability ladder', desc: 'Disclose slightly more than they do, then match their level. Pulls them forward into deeper sharing.', timing: 'Interaction 4–8' },
      { title: 'Pattern interrupt', desc: 'Break their expectations at least once. Show you\'re unpredictable in a controlled way — not chaotic.', timing: 'Week 2' },
      { title: 'Frame test', desc: 'Let them push a boundary once. Hold the frame calmly without reacting. This is a high-leverage moment.', timing: 'When they test' },
      { title: 'Triangulation', desc: 'Reference someone else who finds you interesting. Do not announce it — let it slip naturally.', timing: 'Build phase' },
    ],
    scripts: [
      '"I\'ve been thinking about what you said. It\'s more complex than I initially gave it credit for."',
      '"There\'s something I don\'t tell many people — [controlled vulnerability]. What made you bring this up?"',
    ],
  },
  {
    num: 3,
    label: 'DECIDE',
    color: ACCENT,
    objective: 'Force a psychological decision. They need to choose, even if unconsciously. Ambiguity ends here.',
    tactics: [
      { title: 'Cold withdrawal', desc: 'Go 20–30% quieter for 48–72 hours after a strong interaction. The silence creates evaluation.', timing: 'After peak moment' },
      { title: 'Direct statement', desc: 'Make one clear, unambiguous statement of intent. Not a question. A statement. Then go quiet.', timing: 'Week 3–4' },
      { title: 'Social proof activation', desc: 'Appear publicly engaged with others — not to make jealous, but to confirm you have value others see.', timing: 'Decide phase' },
      { title: 'Deadline pressure', desc: 'Reference something coming up (trip, change) that creates a natural decision window without ultimatum.', timing: 'Final decide push' },
    ],
    scripts: [
      '"I think we both know what this is. I\'m not going to pretend otherwise."',
      '"I\'m going to be honest — I\'m leaving [context] soon. I wanted to say that clearly."',
    ],
  },
  {
    num: 4,
    label: 'COMMIT',
    color: '#34D399',
    objective: 'Secure and stabilize the connection. Frame the relationship on your terms without it feeling imposed.',
    tactics: [
      { title: 'Anchor rituals', desc: 'Create small repeated interactions that become "ours" — a reference, inside language, a recurring check-in.', timing: 'Week 4+' },
      { title: 'Future pacing', desc: 'Reference future plans that implicitly include them. Plant the forward-looking frame casually.', timing: 'Commit phase' },
      { title: 'Strategic generosity', desc: 'Give something unexpected — time, resource, recognition — at a moment they\'re not expecting it.', timing: 'After commitment' },
      { title: 'Accountability mirror', desc: 'Gently reflect when their behavior contradicts their stated values. Shows you pay attention. High trust move.', timing: 'Established dynamic' },
    ],
    scripts: [
      '"I\'ve been thinking about [future plan]. I think you\'d actually fit into that."',
      '"You said [something they said weeks ago]. I remembered. It mattered."',
    ],
  },
];

// ── Types ─────────────────────────────────────────────────────────────────────

type CampaignTarget = Target & {
  phase: number;
  profile: TargetProfile | null;
  checklist: Record<string, boolean>; // "phase_num-tactic_index" → checked
  notes: string;
  progress: number; // 0–100
};

// ── Load checklist from Supabase ──────────────────────────────────────────────

async function loadChecklist(targetId: string): Promise<Record<string, boolean>> {
  const { data } = await supabase
    .from('targets')
    .select('campaign_checklist')
    .eq('id', targetId)
    .single();
  return (data as any)?.campaign_checklist ?? {};
}

async function saveChecklist(targetId: string, checklist: Record<string, boolean>): Promise<void> {
  await supabase
    .from('targets')
    .update({ campaign_checklist: checklist } as any)
    .eq('id', targetId);
}

async function loadNotes(targetId: string): Promise<string> {
  const { data } = await supabase
    .from('targets')
    .select('campaign_notes')
    .eq('id', targetId)
    .single();
  return (data as any)?.campaign_notes ?? '';
}

async function saveNotes(targetId: string, notes: string): Promise<void> {
  await supabase
    .from('targets')
    .update({ campaign_notes: notes } as any)
    .eq('id', targetId);
}

function computeProgress(checklist: Record<string, boolean>): number {
  const total = PHASES.reduce((sum, p) => sum + p.tactics.length, 0);
  const done = Object.values(checklist).filter(Boolean).length;
  return total === 0 ? 0 : Math.round((done / total) * 100);
}

// ── Phase Badge ───────────────────────────────────────────────────────────────

function PhaseBadge({ label, color }: { label: string; color: string }) {
  return (
    <View style={[pb.badge, { borderColor: color + '4D', backgroundColor: color + '0F' }]}>
      <Text style={[pb.text, { color }]}>{label}</Text>
    </View>
  );
}
const pb = StyleSheet.create({
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, alignSelf: 'flex-start' },
  text: { fontFamily: MONO as any, fontSize: 7, letterSpacing: 2 },
});

// ── Campaign Sidebar ──────────────────────────────────────────────────────────

function CampaignSidebar({
  targets,
  selectedId,
  onSelect,
  onNew,
}: {
  targets: CampaignTarget[];
  selectedId: string | null;
  onSelect: (t: CampaignTarget) => void;
  onNew: () => void;
}) {
  const phase = PHASES.find((p) => p.num === 1)!;

  return (
    <View style={sb.sidebar}>
      <View style={sb.header}>
        <Text style={sb.title}>CAMPAIGNS</Text>
        <TouchableOpacity style={sb.newBtn} onPress={onNew}>
          <Text style={sb.newBtnText}>+ NEW</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={sb.list} showsVerticalScrollIndicator={false}>
        {targets.map((t) => {
          const ph = PHASES.find((p) => p.num === Math.min(t.phase, 4)) ?? PHASES[0];
          const isActive = t.id === selectedId;
          return (
            <TouchableOpacity
              key={t.id}
              style={[sb.item, isActive && sb.itemActive]}
              onPress={() => onSelect(t)}
              activeOpacity={0.7}
            >
              <View style={sb.itemTop}>
                <Text style={sb.itemName} numberOfLines={1}>{t.name.toUpperCase()}</Text>
                <PhaseBadge label={ph.label} color={ph.color} />
              </View>
              {t.profile?.dominant_archetype && (
                <Text style={sb.itemArchetype} numberOfLines={1}>{t.profile.dominant_archetype}</Text>
              )}
              {/* Progress bar */}
              <View style={sb.progTrack}>
                <View style={[sb.progFill, { width: `${t.progress}%` as any }]} />
              </View>
              <Text style={sb.progText}>{t.progress}% COMPLETE</Text>
            </TouchableOpacity>
          );
        })}
        {targets.length === 0 && (
          <View style={sb.empty}>
            <Text style={sb.emptyText}>NO CAMPAIGNS</Text>
            <Text style={sb.emptySub}>go to Targets to add one</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const sb = StyleSheet.create({
  sidebar: { width: 240, borderRightWidth: 1, borderRightColor: BORDER, flexDirection: 'column', overflow: 'hidden' as any },
  header: { flexShrink: 0, padding: 14, paddingLeft: 16, borderBottomWidth: 1, borderBottomColor: BORDER, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: MONO as any, fontSize: 9, color: DIM, letterSpacing: 2 },
  newBtn: { backgroundColor: ACCENT, paddingHorizontal: 9, paddingVertical: 3 },
  newBtnText: { fontFamily: MONO as any, fontSize: 8, color: BG, fontWeight: '700', letterSpacing: 2 },
  list: { flex: 1 },
  item: { padding: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(39,39,42,0.4)' as any, gap: 4 },
  itemActive: { backgroundColor: 'rgba(204,255,0,0.04)' as any, borderLeftWidth: 2, borderLeftColor: ACCENT },
  itemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  itemName: { fontFamily: MONO as any, fontSize: 10, color: TEXT, letterSpacing: 1, fontWeight: '600', flex: 1 },
  itemArchetype: { fontFamily: MONO as any, fontSize: 8, color: DIM, letterSpacing: 1 },
  progTrack: { height: 2, backgroundColor: BORDER, marginTop: 6 },
  progFill: { height: 2, backgroundColor: ACCENT },
  progText: { fontFamily: MONO as any, fontSize: 7, color: DIM, letterSpacing: 1 },
  empty: { padding: 24, alignItems: 'center', gap: 6 },
  emptyText: { fontFamily: MONO as any, fontSize: 9, color: DIM, letterSpacing: 2 },
  emptySub: { fontFamily: MONO as any, fontSize: 8, color: B2, letterSpacing: 1 },
});

// ── Phase Timeline ────────────────────────────────────────────────────────────

function PhaseTimeline({
  currentPhase,
  activePhase,
  onSelectPhase,
}: {
  currentPhase: number;
  activePhase: number;
  onSelectPhase: (n: number) => void;
}) {
  return (
    <View style={pt.timeline}>
      {PHASES.map((p) => {
        const done = p.num < currentPhase;
        const active = p.num === activePhase;
        return (
          <TouchableOpacity key={p.num} style={[pt.step, active && pt.stepActive]} onPress={() => onSelectPhase(p.num)}>
            <View style={[pt.numBox, done && { backgroundColor: p.color, borderColor: p.color }, active && { borderColor: p.color }]}>
              <Text style={[pt.numText, done && { color: BG }, active && { color: p.color }]}>
                {done ? '✓' : p.num}
              </Text>
            </View>
            <Text style={[pt.label, active && { color: TEXT }, done && { color: MUTED }]}>{p.label}</Text>
            <Text style={[pt.status, active && { color: p.color }]}>
              {done ? 'DONE' : active ? '● ACTIVE' : 'PENDING'}
            </Text>
            {active && <View style={[pt.activeLine, { backgroundColor: p.color }]} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const pt = StyleSheet.create({
  timeline: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: BORDER, flexShrink: 0, backgroundColor: BG },
  step: { flex: 1, paddingVertical: 14, alignItems: 'center', gap: 5, position: 'relative' as any, borderRightWidth: 1, borderRightColor: BORDER },
  stepActive: { backgroundColor: 'rgba(204,255,0,0.03)' as any },
  numBox: { width: 22, height: 22, borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center' },
  numText: { fontFamily: MONO as any, fontSize: 9, color: DIM },
  label: { fontFamily: MONO as any, fontSize: 8, color: DIM, letterSpacing: 2 },
  status: { fontFamily: MONO as any, fontSize: 7, color: DIM, letterSpacing: 1 },
  activeLine: { position: 'absolute' as any, bottom: 0, left: 0, right: 0, height: 2 },
});

// ── Tactic Checklist ──────────────────────────────────────────────────────────

function TacticRow({
  phaseNum,
  tacticIndex,
  tactic,
  checked,
  onToggle,
}: {
  phaseNum: number;
  tacticIndex: number;
  tactic: typeof PHASES[0]['tactics'][0];
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <View style={tc.row}>
      <TouchableOpacity style={[tc.check, checked && tc.checkDone]} onPress={onToggle}>
        {checked && <Text style={tc.checkMark}>✓</Text>}
      </TouchableOpacity>
      <View style={tc.info}>
        <Text style={[tc.title, checked && { color: DIM, textDecorationLine: 'line-through' }]}>{tactic.title}</Text>
        <Text style={tc.desc}>{tactic.desc}</Text>
        <Text style={tc.timing}>{tactic.timing}</Text>
      </View>
    </View>
  );
}

const tc = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(39,39,42,0.4)' as any },
  check: { width: 16, height: 16, borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0 },
  checkDone: { backgroundColor: ACCENT, borderColor: ACCENT },
  checkMark: { fontFamily: MONO as any, fontSize: 10, color: BG, fontWeight: '700' },
  info: { flex: 1, gap: 3 },
  title: { fontFamily: SANS as any, fontSize: 13, color: TEXT, fontWeight: '500' },
  desc: { fontFamily: SANS as any, fontSize: 12, color: MUTED, lineHeight: 17 },
  timing: { fontFamily: MONO as any, fontSize: 8, color: DIM, letterSpacing: 1 },
});

// ── Intel Panel ───────────────────────────────────────────────────────────────

function IntelPanel({
  target,
  notes,
  onNotesChange,
}: {
  target: CampaignTarget;
  notes: string;
  onNotesChange: (s: string) => void;
}) {
  const p = target.profile;
  return (
    <View style={ip.panel}>
      <View style={ip.header}>
        <Text style={ip.title}>// INTEL</Text>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Profile snapshot */}
        {p && (
          <View style={ip.section}>
            <Text style={ip.secLabel}>// TARGET PROFILE</Text>
            {p.dominant_archetype && <IntelRow k="ARCHETYPE" v={p.dominant_archetype} accent />}
            {p.attachment_style && <IntelRow k="ATTACHMENT" v={p.attachment_style} />}
            {p.vulnerability_score && <IntelRow k="VULNERABILITY" v={p.vulnerability_score} />}
            {p.power_dynamic && <IntelRow k="POWER_DYNAMIC" v={p.power_dynamic} />}
          </View>
        )}

        {/* Campaign metrics */}
        <View style={ip.section}>
          <Text style={ip.secLabel}>// CAMPAIGN METRICS</Text>
          <IntelRow k="PROGRESS" v={`${target.progress}%`} accent />
          <IntelRow k="PHASE" v={PHASES.find((ph) => ph.num === Math.min(target.phase, 4))?.label ?? 'APPROACH'} />
          {target.objective && <IntelRow k="OBJECTIVE" v={target.objective} />}
          {target.leverage && <IntelRow k="LEVERAGE" v={target.leverage} />}
        </View>

        {/* Notes */}
        <View style={ip.notes}>
          <Text style={ip.notesLabel}>// OPERATOR NOTES</Text>
          <TextInput
            style={ip.notesInput}
            value={notes}
            onChangeText={onNotesChange}
            multiline
            placeholder="field observations, pattern notes..."
            placeholderTextColor={DIM}
            textAlignVertical="top"
          />
        </View>
      </ScrollView>
    </View>
  );
}

function IntelRow({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return (
    <View style={ip.row}>
      <Text style={ip.rowKey}>{k}</Text>
      <Text style={[ip.rowVal, accent && { color: ACCENT }]} numberOfLines={2}>{v}</Text>
    </View>
  );
}

const ip = StyleSheet.create({
  panel: { width: 240, borderLeftWidth: 1, borderLeftColor: BORDER, flexDirection: 'column', overflow: 'hidden' as any, backgroundColor: 'rgba(24,24,27,0.6)' as any },
  header: { flexShrink: 0, padding: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: BORDER },
  title: { fontFamily: MONO as any, fontSize: 9, color: DIM, letterSpacing: 2 },
  section: { borderBottomWidth: 1, borderBottomColor: BORDER, padding: 12, paddingHorizontal: 16 },
  secLabel: { fontFamily: MONO as any, fontSize: 8, color: ACCENT, letterSpacing: 2, marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 3, borderBottomWidth: 1, borderBottomColor: 'rgba(39,39,42,0.3)' as any },
  rowKey: { fontFamily: MONO as any, fontSize: 7, color: MUTED, letterSpacing: 1, flex: 0.45 },
  rowVal: { fontFamily: MONO as any, fontSize: 7, color: TEXT, fontWeight: '500', flex: 0.55, textAlign: 'right' },
  notes: { padding: 12, paddingHorizontal: 16, flex: 1 },
  notesLabel: { fontFamily: MONO as any, fontSize: 8, color: DIM, letterSpacing: 2, marginBottom: 8 },
  notesInput: {
    fontFamily: MONO as any,
    fontSize: 10,
    color: MUTED,
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 8,
    minHeight: 100,
    outlineStyle: 'none',
  } as any,
});

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function CampaignsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ targetId?: string }>();
  const { width } = useWindowDimensions();
  const isWide = Platform.OS === 'web' && width > 900;

  const [targets, setTargets] = useState<CampaignTarget[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(params.targetId ?? null);
  const [activePhase, setActivePhase] = useState(1); // which phase tab is open
  const [notes, setNotes] = useState('');
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [copyIdx, setCopyIdx] = useState<number | null>(null);

  const selectedTarget = targets.find((t) => t.id === selectedId) ?? null;

  const loadAll = useCallback(async () => {
    const raw = await getTargets();
    const enriched = await Promise.all(
      raw.map(async (t) => {
        const [phase, profile, checklist, nt] = await Promise.all([
          getMissionPhase(t.id),
          getTargetProfile(t.id),
          loadChecklist(t.id),
          loadNotes(t.id),
        ]);
        return {
          ...t,
          phase,
          profile,
          checklist,
          notes: nt,
          progress: computeProgress(checklist),
        } as CampaignTarget;
      })
    );
    setTargets(enriched);

    // Auto-select from param or first target
    const presel = params.targetId ?? enriched[0]?.id ?? null;
    setSelectedId((prev) => prev ?? presel);
    const sel = enriched.find((t) => t.id === presel);
    if (sel) {
      setActivePhase(Math.min(sel.phase, 4));
      setNotes(sel.notes);
    }
  }, [params.targetId]);

  useFocusEffect(useCallback(() => { loadAll(); }, [loadAll]));

  // When selected target changes, update active phase + notes
  useEffect(() => {
    if (!selectedTarget) return;
    setActivePhase(Math.min(selectedTarget.phase, 4));
    setNotes(selectedTarget.notes);
  }, [selectedId]);

  const handleToggleTactic = async (targetId: string, key: string) => {
    setTargets((prev) =>
      prev.map((t) => {
        if (t.id !== targetId) return t;
        const newCl = { ...t.checklist, [key]: !t.checklist[key] };
        const progress = computeProgress(newCl);
        saveChecklist(targetId, newCl);
        return { ...t, checklist: newCl, progress };
      })
    );
  };

  const handleNotesChange = (val: string) => {
    setNotes(val);
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(() => {
      if (selectedId) saveNotes(selectedId, val);
    }, 1000);
  };

  const handleAdvancePhase = async () => {
    if (!selectedTarget) return;
    const nextPhase = Math.min(selectedTarget.phase + 1, 5);
    await saveMissionPhase(selectedTarget.id, nextPhase);
    setTargets((prev) =>
      prev.map((t) => t.id === selectedTarget.id ? { ...t, phase: nextPhase } : t)
    );
    setActivePhase(Math.min(nextPhase, 4));
  };

  const handleCopyScript = (text: string, idx: number) => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
      navigator.clipboard?.writeText(text).catch(() => {});
    }
    setCopyIdx(idx);
    setTimeout(() => setCopyIdx(null), 2000);
  };

  // Active phase config
  const phaseConfig = PHASES.find((p) => p.num === activePhase) ?? PHASES[0];

  // ── Narrow (native or small web) ──────────────────────────────────────────
  const renderNarrow = () => (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
      {/* Target selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={ns.chips} contentContainerStyle={{ gap: 8, padding: 14 }}>
        {targets.map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[ns.chip, t.id === selectedId && ns.chipActive]}
            onPress={() => setSelectedId(t.id)}
          >
            <Text style={[ns.chipText, t.id === selectedId && { color: ACCENT }]}>{t.name.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {selectedTarget && (
        <>
          {/* Phase tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 0 }}>
            {PHASES.map((p) => (
              <TouchableOpacity
                key={p.num}
                style={[ns.phaseTab, activePhase === p.num && { borderBottomWidth: 2, borderBottomColor: p.color }]}
                onPress={() => setActivePhase(p.num)}
              >
                <Text style={[ns.phaseTabText, activePhase === p.num && { color: p.color }]}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Objective */}
          <View style={ns.objectiveCard}>
            <Text style={ns.secLabel}>// OBJECTIVE</Text>
            <Text style={ns.objectiveText}>{phaseConfig.objective}</Text>
          </View>

          {/* Tactics */}
          <View style={ns.section}>
            <Text style={ns.secLabel}>// TACTICS</Text>
            {phaseConfig.tactics.map((tactic, i) => {
              const key = `${activePhase}-${i}`;
              return (
                <TacticRow
                  key={key}
                  phaseNum={activePhase}
                  tacticIndex={i}
                  tactic={tactic}
                  checked={!!selectedTarget.checklist[key]}
                  onToggle={() => handleToggleTactic(selectedTarget.id, key)}
                />
              );
            })}
          </View>

          {/* Scripts */}
          <View style={ns.section}>
            <Text style={ns.secLabel}>// SCRIPTS</Text>
            {phaseConfig.scripts.map((s, i) => (
              <View key={i} style={ns.scriptCard}>
                <Text style={ns.scriptText}>{s}</Text>
                <TouchableOpacity style={ns.copyBtn} onPress={() => handleCopyScript(s, i)}>
                  <Text style={ns.copyBtnText}>{copyIdx === i ? '✓ COPIED' : '⧉ COPY'}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );

  const ns = StyleSheet.create({
    chips: { flexShrink: 0 },
    chip: { borderWidth: 1, borderColor: BORDER, paddingHorizontal: 12, paddingVertical: 5 },
    chipActive: { borderColor: ACCENT },
    chipText: { fontFamily: MONO as any, fontSize: 9, color: DIM, letterSpacing: 2 },
    phaseTab: { paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' as any },
    phaseTabText: { fontFamily: MONO as any, fontSize: 9, color: DIM, letterSpacing: 2 },
    objectiveCard: { margin: 14, padding: 14, backgroundColor: S1, borderWidth: 1, borderColor: BORDER, borderLeftWidth: 2, borderLeftColor: ACCENT },
    section: { padding: 14 },
    secLabel: { fontFamily: MONO as any, fontSize: 8, color: ACCENT, letterSpacing: 2, marginBottom: 12 },
    objectiveText: { fontFamily: SANS as any, fontSize: 13, color: MUTED, lineHeight: 19 },
    scriptCard: { backgroundColor: 'rgba(204,255,0,0.03)' as any, borderLeftWidth: 2, borderLeftColor: ACCENT, padding: 14, marginBottom: 12 },
    scriptText: { fontFamily: MONO as any, fontSize: 12, color: TEXT, lineHeight: 19, fontStyle: 'italic', marginBottom: 10 },
    copyBtn: { borderWidth: 1, borderColor: BORDER, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
    copyBtnText: { fontFamily: MONO as any, fontSize: 8, color: DIM, letterSpacing: 2 },
  });

  // ── Wide web layout ───────────────────────────────────────────────────────
  const renderWide = () => (
    <View style={{ flex: 1, flexDirection: 'row', overflow: 'hidden' as any }}>
      {/* Sidebar */}
      <CampaignSidebar
        targets={targets}
        selectedId={selectedId}
        onSelect={(t) => setSelectedId(t.id)}
        onNew={() => router.push('/targets' as any)}
      />

      {/* Main panel */}
      <View style={{ flex: 1, flexDirection: 'column', overflow: 'hidden' as any }}>
        {selectedTarget ? (
          <>
            {/* Campaign header */}
            <View style={mp.header}>
              <View style={{ flex: 1 }}>
                <Text style={mp.kicker}>// ACTIVE CAMPAIGN</Text>
                <Text style={mp.title}>{selectedTarget.name.toUpperCase()}</Text>
                <Text style={mp.meta}>
                  {selectedTarget.profile?.dominant_archetype ?? 'profile pending'} · phase {Math.min(selectedTarget.phase, 4)} of 4 · {selectedTarget.progress}% complete
                </Text>
              </View>
              <View style={mp.actions}>
                {selectedTarget.phase < 5 && (
                  <TouchableOpacity style={mp.advanceBtn} onPress={handleAdvancePhase}>
                    <Text style={mp.advanceBtnText}>ADVANCE PHASE →</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={mp.decodeBtn}
                  onPress={() => router.push(`/decode?targetId=${selectedTarget.id}&targetName=${encodeURIComponent(selectedTarget.name)}` as any)}
                >
                  <Text style={mp.decodeBtnText}>OPEN DECODE</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Phase timeline */}
            <PhaseTimeline
              currentPhase={selectedTarget.phase}
              activePhase={activePhase}
              onSelectPhase={setActivePhase}
            />

            {/* Body */}
            <View style={{ flex: 1, flexDirection: 'row', overflow: 'hidden' as any }}>
              {/* Phase detail */}
              <ScrollView style={pd.scroll} showsVerticalScrollIndicator={false}>
                {/* Objective */}
                <View style={pd.objectiveCard}>
                  <Text style={pd.objectiveLabel}>// PHASE OBJECTIVE</Text>
                  <Text style={pd.objectiveText}>{phaseConfig.objective}</Text>
                </View>

                {/* Tactics */}
                <View style={pd.card}>
                  <View style={pd.cardHeader}>
                    <Text style={pd.cardLabel}>// TACTICAL CHECKLIST</Text>
                    <Text style={pd.cardMeta}>
                      {phaseConfig.tactics.filter((_, i) => selectedTarget.checklist[`${activePhase}-${i}`]).length}/{phaseConfig.tactics.length} COMPLETE
                    </Text>
                  </View>
                  <View style={pd.cardBody}>
                    {phaseConfig.tactics.map((tactic, i) => {
                      const key = `${activePhase}-${i}`;
                      return (
                        <TacticRow
                          key={key}
                          phaseNum={activePhase}
                          tacticIndex={i}
                          tactic={tactic}
                          checked={!!selectedTarget.checklist[key]}
                          onToggle={() => handleToggleTactic(selectedTarget.id, key)}
                        />
                      );
                    })}
                  </View>
                </View>

                {/* Scripts */}
                <View style={[pd.card, { marginTop: 16, marginBottom: 24 }]}>
                  <View style={pd.cardHeader}>
                    <Text style={pd.cardLabel}>// RECOMMENDED SCRIPTS</Text>
                  </View>
                  <View style={pd.cardBody}>
                    {phaseConfig.scripts.map((s, i) => (
                      <View key={i} style={pd.scriptCard}>
                        <Text style={pd.scriptLabel}>SCRIPT {String(i + 1).padStart(2, '0')}</Text>
                        <Text style={pd.scriptText}>{s}</Text>
                        <View style={pd.scriptActions}>
                          <TouchableOpacity style={pd.copyBtn} onPress={() => handleCopyScript(s, i)}>
                            <Text style={pd.copyBtnText}>{copyIdx === i ? '✓ COPIED' : '⧉ COPY'}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              </ScrollView>

              {/* Intel panel */}
              <IntelPanel
                target={selectedTarget}
                notes={notes}
                onNotesChange={handleNotesChange}
              />
            </View>
          </>
        ) : (
          <View style={mp.empty}>
            <Text style={mp.emptyTitle}>SELECT A CAMPAIGN</Text>
            <Text style={mp.emptySub}>Choose a target from the sidebar to view their campaign</Text>
          </View>
        )}
      </View>
    </View>
  );

  const mp = StyleSheet.create({
    header: { flexShrink: 0, padding: 16, paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: BORDER, backgroundColor: S1, flexDirection: 'row', alignItems: 'flex-start', gap: 20 },
    kicker: { fontFamily: MONO as any, fontSize: 8, color: DIM, letterSpacing: 2, marginBottom: 4 },
    title: { fontFamily: SANS as any, fontSize: 18, fontWeight: '700', color: TEXT, letterSpacing: -0.5, marginBottom: 2 },
    meta: { fontFamily: MONO as any, fontSize: 8, color: DIM, letterSpacing: 1 },
    actions: { flexDirection: 'row', gap: 8, alignItems: 'center', flexShrink: 0 },
    advanceBtn: { backgroundColor: ACCENT, paddingVertical: 5, paddingHorizontal: 14 },
    advanceBtnText: { fontFamily: MONO as any, fontSize: 9, color: BG, fontWeight: '700', letterSpacing: 2 },
    decodeBtn: { borderWidth: 1, borderColor: BORDER, paddingVertical: 5, paddingHorizontal: 14 },
    decodeBtnText: { fontFamily: MONO as any, fontSize: 9, color: DIM, letterSpacing: 2 },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
    emptyTitle: { fontFamily: MONO as any, fontSize: 10, color: DIM, letterSpacing: 3 },
    emptySub: { fontFamily: MONO as any, fontSize: 9, color: B2, letterSpacing: 1 },
  });

  const pd = StyleSheet.create({
    scroll: { flex: 1, padding: 24 },
    objectiveCard: { padding: 16, backgroundColor: S1, borderWidth: 1, borderColor: BORDER, borderLeftWidth: 2, borderLeftColor: ACCENT, marginBottom: 16 },
    objectiveLabel: { fontFamily: MONO as any, fontSize: 8, color: ACCENT, letterSpacing: 2, marginBottom: 8 },
    objectiveText: { fontFamily: SANS as any, fontSize: 14, color: MUTED, lineHeight: 22 },
    card: { backgroundColor: S1, borderWidth: 1, borderColor: BORDER },
    cardHeader: { padding: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: BORDER, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    cardLabel: { fontFamily: MONO as any, fontSize: 9, color: ACCENT, letterSpacing: 2 },
    cardMeta: { fontFamily: MONO as any, fontSize: 8, color: DIM, letterSpacing: 1 },
    cardBody: { padding: 16 },
    scriptCard: { backgroundColor: 'rgba(204,255,0,0.03)' as any, borderLeftWidth: 2, borderLeftColor: ACCENT, padding: 14, marginBottom: 12 },
    scriptLabel: { fontFamily: MONO as any, fontSize: 7, color: ACCENT, letterSpacing: 2, marginBottom: 8 },
    scriptText: { fontFamily: MONO as any, fontSize: 12, color: TEXT, lineHeight: 19, fontStyle: 'italic', marginBottom: 10 },
    scriptActions: { flexDirection: 'row', gap: 8 },
    copyBtn: { borderWidth: 1, borderColor: BORDER, paddingHorizontal: 10, paddingVertical: 3 },
    copyBtnText: { fontFamily: MONO as any, fontSize: 8, color: DIM, letterSpacing: 2 },
  });

  return (
    <View style={s.root}>
      <StatusBar style="light" />
      {isWide && <AppNav />}
      {isWide ? renderWide() : renderNarrow()}
      {isWide && <AppStatusBar />}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG, flexDirection: 'column' },
});
