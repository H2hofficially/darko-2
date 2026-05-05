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
  isEdited?: boolean;
  entryType?: 'standard' | 'campaign_brief';
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
  // Dossier fields
  strengths?: string[];
  weaknesses?: string[];
  likes?: string[];
  dislikes?: string[];
  birthday?: string | null;
  location?: string | null;
  manipulation_vectors?: string[];
  power_dynamic?: string;
  predicted_next_behavior?: string;
  key_turning_points?: string[];
  operative_mistakes?: string[];
  target_communication_style?: string;
  relationship_momentum?: string;
  last_known_emotional_state?: string;
  relationship_narrative?: string;
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
  // Try conversation_messages first (V3), fall back to intelligence_logs (V2)
  const { count: newCount } = await supabase
    .from('conversation_messages')
    .select('id', { count: 'exact', head: true })
    .eq('target_id', targetId)
    .eq('role', 'user');

  if (newCount !== null && newCount > 0) return newCount;

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
    .select('message_content, created_at')
    .eq('target_id', targetId)
    .order('created_at', { ascending: true });
  if (error) {
    console.error('[DARKO] getHistory error:', error.message);
    return [];
  }
  return (data ?? []).map((row) => ({
    ...(row.message_content as DecodeEntry),
    timestamp: row.created_at,
  }));
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

export async function updateDecodeEntry(
  targetId: string,
  entry: DecodeEntry,
): Promise<void> {
  const { error } = await supabase
    .from('intelligence_logs')
    .update({ message_content: entry })
    .eq('target_id', targetId)
    .filter('message_content->>id', 'eq', entry.id);
  if (error) console.error('[DARKO] updateDecodeEntry error:', error.message);
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

// ── V3 Conversation Messages — Supabase ───────────────────────────────────────

export type ConversationMessage = {
  id: string;
  role: 'user' | 'darko';
  content: string;
  structured_data?: any;
  entry_type: 'message' | 'campaign_brief' | 'alert';
  created_at: string;
};

export async function saveMessage(
  targetId: string,
  role: 'user' | 'darko',
  content: string,
  structuredData?: any,
  entryType: 'message' | 'campaign_brief' | 'alert' = 'message',
): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const { data, error } = await supabase
    .from('conversation_messages')
    .insert({
      user_id: session.user.id,
      target_id: targetId,
      role,
      content,
      structured_data: structuredData ?? null,
      entry_type: entryType,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[DARKO] saveMessage error:', error.message);
    return null;
  }
  return data?.id ?? null;
}

export async function getConversation(
  targetId: string,
  limit = 500,
): Promise<ConversationMessage[]> {
  // Fetch the MOST RECENT `limit` messages, then reverse so callers receive
  // them in chronological order (oldest → newest), matching how chat UIs
  // expect to render. Previous version used ascending+limit, which silently
  // truncated to the OLDEST N rows and made every message past row N
  // invisible across all clients. Default limit bumped from 100 → 500 so
  // long-running campaigns aren't truncated mid-thread on the UI.
  const { data, error } = await supabase
    .from('conversation_messages')
    .select('id, role, content, structured_data, entry_type, created_at')
    .eq('target_id', targetId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[DARKO] getConversation error:', error.message);
    return [];
  }
  const rows = (data ?? []).map((row) => ({
    id: row.id,
    role: row.role as 'user' | 'darko',
    content: row.content,
    structured_data: row.structured_data,
    entry_type: (row.entry_type ?? 'message') as 'message' | 'campaign_brief' | 'alert',
    created_at: row.created_at,
  }));
  return rows.reverse();
}

// ── Mission phase — Supabase ──────────────────────────────────────────────────

export async function getMissionPhase(targetId: string): Promise<number> {
  const { data, error } = await supabase
    .from('targets')
    .select('mission_phase')
    .eq('id', targetId)
    .single();
  if (error || !data) return 1;
  return (data as any).mission_phase ?? 1;
}

export async function saveMissionPhase(targetId: string, phase: number): Promise<void> {
  const { error } = await supabase
    .from('targets')
    .update({ mission_phase: phase } as any)
    .eq('id', targetId);
  if (error) console.error('[DARKO] saveMissionPhase error:', error.message);
}
