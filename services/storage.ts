import { supabase } from '../lib/supabase';
import { DecoderResult } from './decoder';

export type Target = {
  id: string;
  name: string;
  createdAt: string;
  leverage?: string;
  objective?: string;
};

export type DecodeEntry = {
  id: string;
  inputMessage: string;
  result: DecoderResult;
  timestamp: string;
  auto_detected_mode?: string;
};

export type MbtiProfile = {
  type: string;
  dominant_function: string;
  shadow_function: string;
  seduction_vulnerability: string;
};

export type TargetProfile = {
  dominant_archetype: string;
  attachment_style: string;
  manipulation_patterns: string[];
  vulnerability_score: string;
  summary: string;
  relationship_brief?: string;
  mbti_profile?: MbtiProfile;
  generatedAt: string;
};

// ── Targets — Supabase ────────────────────────────────────────────────────────

export async function getTargets(): Promise<Target[]> {
  const { data, error } = await supabase
    .from('targets')
    .select('id, target_alias, created_at, leverage, objective')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[DARKO] getTargets error:', error.message);
    return [];
  }
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.target_alias,
    createdAt: row.created_at,
    leverage: row.leverage ?? undefined,
    objective: row.objective ?? undefined,
  }));
}

export async function getTarget(id: string): Promise<Target | null> {
  const { data, error } = await supabase
    .from('targets')
    .select('id, target_alias, created_at, leverage, objective')
    .eq('id', id)
    .single();
  if (error || !data) return null;
  return {
    id: data.id,
    name: data.target_alias,
    createdAt: data.created_at,
    leverage: data.leverage ?? undefined,
    objective: data.objective ?? undefined,
  };
}

export async function saveTarget(input: {
  name: string;
  leverage?: string;
  objective?: string;
}): Promise<Target> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('targets')
    .insert({
      user_id: session.user.id,
      target_alias: input.name,
      leverage: input.leverage ?? null,
      objective: input.objective ?? null,
    })
    .select('id, target_alias, created_at, leverage, objective')
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Failed to create target');
  return {
    id: data.id,
    name: data.target_alias,
    createdAt: data.created_at,
    leverage: data.leverage ?? undefined,
    objective: data.objective ?? undefined,
  };
}

export async function deleteTarget(id: string): Promise<void> {
  // intelligence_logs deleted by CASCADE; behavioral_profile deleted with the row
  await supabase.from('targets').delete().eq('id', id);
}

export async function getDecodeCount(targetId: string): Promise<number> {
  const { count } = await supabase
    .from('intelligence_logs')
    .select('id', { count: 'exact', head: true })
    .eq('target_id', targetId);
  return count ?? 0;
}

// ── History — Supabase ────────────────────────────────────────────────────────

export async function getHistory(targetId: string): Promise<DecodeEntry[]> {
  const { data, error } = await supabase
    .from('intelligence_logs')
    .select('message_content')
    .eq('target_id', targetId)
    .order('created_at', { ascending: true });
  if (error) {
    console.error('[DARKO] getHistory error:', error.message);
    return [];
  }
  return (data ?? []).map((row) => row.message_content as DecodeEntry);
}

export async function addDecodeEntry(
  targetId: string,
  entry: DecodeEntry,
): Promise<void> {
  const { error } = await supabase.from('intelligence_logs').insert({
    target_id: targetId,
    role: 'system',
    message_content: entry,
  });
  if (error) console.error('[DARKO] addDecodeEntry error:', error.message);
}

// ── Target Profile — Supabase (behavioral_profile column on targets) ──────────

export async function getTargetProfile(targetId: string): Promise<TargetProfile | null> {
  const { data, error } = await supabase
    .from('targets')
    .select('behavioral_profile')
    .eq('id', targetId)
    .single();
  if (error || !data?.behavioral_profile) return null;
  return data.behavioral_profile as TargetProfile;
}

export async function saveTargetProfile(
  targetId: string,
  profile: TargetProfile,
): Promise<void> {
  const { error } = await supabase
    .from('targets')
    .update({ behavioral_profile: profile })
    .eq('id', targetId);
  if (error) console.error('[DARKO] saveTargetProfile error:', error.message);
}
