// Per-target tactic playbook — was previously the body of app/campaigns.tsx.
// Lives inside the target detail sheet now so users don't need to navigate
// to a separate screen to see/check off tactics or write notes.

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Platform,
  ScrollView,
} from 'react-native';
import {
  loadChecklist,
  saveChecklist,
  loadNotes,
  saveNotes,
  saveMissionPhase,
} from '../services/storage';

const ACCENT = '#CCFF00';
const BG = '#09090B';
const S1 = '#18181B';
const BORDER = '#27272A';
const DIM = '#52525b';
const MUTED = '#a1a1aa';
const TEXT = '#fafafa';

const MONO = Platform.select({ ios: 'Courier New', android: 'monospace', default: "'JetBrains Mono', monospace" });
const SANS = Platform.select({ ios: 'System', android: 'sans-serif', default: "'Inter', sans-serif" });

// ─── Phase config (lifted from app/campaigns.tsx) ─────────────────────────────
export const PHASES = [
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

export function computePlaybookProgress(checklist: Record<string, boolean>): number {
  const total = PHASES.reduce((sum, p) => sum + p.tactics.length, 0);
  const done = Object.values(checklist).filter(Boolean).length;
  return total === 0 ? 0 : Math.round((done / total) * 100);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Playbook({
  targetId,
  currentPhase,
  onPhaseAdvanced,
}: {
  targetId: string;
  currentPhase: number;
  onPhaseAdvanced?: (newPhase: number) => void;
}) {
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState('');
  const [activePhase, setActivePhase] = useState(Math.min(currentPhase, 4));
  const [copyIdx, setCopyIdx] = useState<number | null>(null);
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load whenever the target changes
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [cl, nt] = await Promise.all([loadChecklist(targetId), loadNotes(targetId)]);
      if (cancelled) return;
      setChecklist(cl);
      setNotes(nt);
      setActivePhase(Math.min(currentPhase, 4));
    })();
    return () => {
      cancelled = true;
    };
  }, [targetId, currentPhase]);

  const phaseConfig = PHASES.find((p) => p.num === activePhase) ?? PHASES[0];

  const handleToggleTactic = (key: string) => {
    const next = { ...checklist, [key]: !checklist[key] };
    setChecklist(next);
    saveChecklist(targetId, next);
  };

  const handleNotesChange = (val: string) => {
    setNotes(val);
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(() => saveNotes(targetId, val), 800);
  };

  const handleCopyScript = (text: string, idx: number) => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
      navigator.clipboard?.writeText(text).catch(() => {});
    }
    setCopyIdx(idx);
    setTimeout(() => setCopyIdx(null), 1800);
  };

  const handleAdvance = async () => {
    const next = Math.min(currentPhase + 1, 5);
    if (next === currentPhase) return;
    await saveMissionPhase(targetId, next);
    setActivePhase(Math.min(next, 4));
    onPhaseAdvanced?.(next);
  };

  return (
    <View style={pb.wrap}>
      {/* Phase tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={pb.tabsRow}
      >
        {PHASES.map((p) => {
          const active = p.num === activePhase;
          const done = p.num < currentPhase;
          return (
            <TouchableOpacity
              key={p.num}
              style={[pb.tab, active && { borderBottomColor: p.color }]}
              onPress={() => setActivePhase(p.num)}
            >
              <Text style={[pb.tabText, active && { color: p.color }, done && !active && { color: MUTED }]}>
                {done && !active ? '✓ ' : ''}
                {p.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Objective */}
      <View style={pb.objectiveCard}>
        <Text style={pb.secLabel}>// OBJECTIVE</Text>
        <Text style={pb.objectiveText}>{phaseConfig.objective}</Text>
      </View>

      {/* Tactics */}
      <View style={pb.section}>
        <View style={pb.sectionHeader}>
          <Text style={pb.secLabel}>// TACTICS</Text>
          <Text style={pb.sectionMeta}>
            {phaseConfig.tactics.filter((_, i) => checklist[`${activePhase}-${i}`]).length}/
            {phaseConfig.tactics.length}
          </Text>
        </View>
        {phaseConfig.tactics.map((tactic, i) => {
          const key = `${activePhase}-${i}`;
          const checked = !!checklist[key];
          return (
            <View key={key} style={pb.tacticRow}>
              <TouchableOpacity
                style={[pb.check, checked && pb.checkDone]}
                onPress={() => handleToggleTactic(key)}
              >
                {checked && <Text style={pb.checkMark}>✓</Text>}
              </TouchableOpacity>
              <View style={pb.tacticInfo}>
                <Text style={[pb.tacticTitle, checked && pb.tacticDone]}>{tactic.title}</Text>
                <Text style={pb.tacticDesc}>{tactic.desc}</Text>
                <Text style={pb.tacticTiming}>{tactic.timing}</Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Scripts */}
      <View style={pb.section}>
        <Text style={pb.secLabel}>// SCRIPTS</Text>
        {phaseConfig.scripts.map((s, i) => (
          <View key={i} style={pb.scriptCard}>
            <Text style={pb.scriptText}>{s}</Text>
            <TouchableOpacity style={pb.copyBtn} onPress={() => handleCopyScript(s, i)}>
              <Text style={pb.copyBtnText}>{copyIdx === i ? '✓ COPIED' : '⧉ COPY'}</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Operator notes */}
      <View style={pb.section}>
        <Text style={pb.secLabel}>// OPERATOR NOTES</Text>
        <TextInput
          style={pb.notesInput}
          value={notes}
          onChangeText={handleNotesChange}
          multiline
          placeholder="field observations, pattern notes..."
          placeholderTextColor={DIM}
          textAlignVertical="top"
        />
      </View>

      {/* Advance phase */}
      {currentPhase < 5 && (
        <TouchableOpacity style={pb.advanceBtn} onPress={handleAdvance}>
          <Text style={pb.advanceBtnText}>ADVANCE TO PHASE {Math.min(currentPhase + 1, 4)} →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const pb = StyleSheet.create({
  wrap: { flexDirection: 'column', gap: 14 },
  tabsRow: {
    flexDirection: 'row',
    gap: 0,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingHorizontal: 4,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent' as any,
  },
  tabText: { fontFamily: MONO as any, fontSize: 9, color: DIM, letterSpacing: 2 },
  objectiveCard: {
    padding: 12,
    backgroundColor: S1,
    borderWidth: 1,
    borderColor: BORDER,
    borderLeftWidth: 2,
    borderLeftColor: ACCENT,
    marginHorizontal: 18,
  },
  secLabel: { fontFamily: MONO as any, fontSize: 8, color: ACCENT, letterSpacing: 2, marginBottom: 8 },
  objectiveText: { fontFamily: SANS as any, fontSize: 12, color: MUTED, lineHeight: 18 },
  section: { paddingHorizontal: 18 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionMeta: { fontFamily: MONO as any, fontSize: 8, color: DIM, letterSpacing: 1 },
  tacticRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(39,39,42,0.4)' as any,
  },
  check: {
    width: 16,
    height: 16,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    flexShrink: 0,
  },
  checkDone: { backgroundColor: ACCENT, borderColor: ACCENT },
  checkMark: { fontFamily: MONO as any, fontSize: 10, color: BG, fontWeight: '700' },
  tacticInfo: { flex: 1, gap: 3 },
  tacticTitle: { fontFamily: SANS as any, fontSize: 12, color: TEXT, fontWeight: '500' },
  tacticDone: { color: DIM, textDecorationLine: 'line-through' as any },
  tacticDesc: { fontFamily: SANS as any, fontSize: 11, color: MUTED, lineHeight: 16 },
  tacticTiming: { fontFamily: MONO as any, fontSize: 8, color: DIM, letterSpacing: 1 },
  scriptCard: {
    backgroundColor: 'rgba(204,255,0,0.03)' as any,
    borderLeftWidth: 2,
    borderLeftColor: ACCENT,
    padding: 12,
    marginBottom: 8,
  },
  scriptText: {
    fontFamily: MONO as any,
    fontSize: 11,
    color: TEXT,
    lineHeight: 18,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  copyBtn: {
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  copyBtnText: { fontFamily: MONO as any, fontSize: 8, color: DIM, letterSpacing: 2 },
  notesInput: {
    fontFamily: MONO as any,
    fontSize: 11,
    color: MUTED,
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 10,
    minHeight: 90,
    outlineStyle: 'none',
  } as any,
  advanceBtn: {
    backgroundColor: ACCENT,
    paddingVertical: 12,
    alignItems: 'center',
    marginHorizontal: 18,
    marginBottom: 6,
  },
  advanceBtnText: { fontFamily: MONO as any, fontSize: 10, color: BG, fontWeight: '700', letterSpacing: 2 },
});
