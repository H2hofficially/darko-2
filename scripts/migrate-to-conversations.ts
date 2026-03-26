/**
 * One-time migration: intelligence_logs → conversation_messages
 * Run: npx ts-node scripts/migrate-to-conversations.ts
 * Requires EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load .env.local
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const eqIdx = line.indexOf('=');
    if (eqIdx > 0) {
      const key = line.slice(0, eqIdx).trim();
      const val = line.slice(eqIdx + 1).trim();
      if (key) process.env[key] = val;
    }
  }
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

async function migrate() {
  console.log('Fetching intelligence_logs...');

  // Fetch all logs with their target's user_id via join
  const { data: logs, error } = await supabase
    .from('intelligence_logs')
    .select('id, target_id, message_content, created_at, targets!inner(user_id)')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to fetch logs:', error.message);
    process.exit(1);
  }

  if (!logs?.length) {
    console.log('No intelligence_logs entries found. Nothing to migrate.');
    return;
  }

  console.log(`Found ${logs.length} log entries. Migrating...`);

  let converted = 0;
  let skipped = 0;

  for (const log of logs) {
    const entry = log.message_content as any;
    const userId = (log.targets as any)?.user_id;

    if (!userId || !entry) {
      console.warn(`Skipping log ${log.id} — missing user_id or message_content`);
      skipped++;
      continue;
    }

    const timestamp = log.created_at;
    const entryType: 'message' | 'campaign_brief' =
      entry.entryType === 'campaign_brief' ? 'campaign_brief' : 'message';

    const userContent =
      entryType === 'campaign_brief'
        ? '// CAMPAIGN BRIEF SUBMITTED'
        : entry.inputMessage || '[ image / audio input ]';

    // DARKO response content
    let darkoContent = '';
    let darkoStructuredData: any = null;

    if (entryType === 'campaign_brief') {
      darkoContent =
        entry.result?.phase_assessment ??
        entry.result?.mission_status ??
        '// CAMPAIGN INITIALIZED';
      darkoStructuredData = entry.result ?? null;
    } else {
      darkoContent = entry.result?.primary_response ?? '';
      darkoStructuredData = {
        scripts: entry.result?.scripts ?? null,
        phaseUpdate: entry.result?.phase_update ?? null,
        response_type: entry.result?.response_type ?? 'strategic',
      };
    }

    const rows = [
      {
        user_id: userId,
        target_id: log.target_id,
        role: 'user',
        content: userContent,
        structured_data: null,
        entry_type: entryType,
        created_at: timestamp,
      },
      {
        user_id: userId,
        target_id: log.target_id,
        role: 'darko',
        content: darkoContent,
        structured_data: darkoStructuredData,
        entry_type: entryType,
        created_at: timestamp,
      },
    ];

    const { error: insertErr } = await supabase
      .from('conversation_messages')
      .insert(rows);

    if (insertErr) {
      console.error(`Failed to insert log ${log.id}:`, insertErr.message);
      skipped++;
    } else {
      converted++;
    }
  }

  console.log(`\nMigration complete.`);
  console.log(`  Converted: ${converted} entries (${converted * 2} rows inserted)`);
  console.log(`  Skipped:   ${skipped}`);
  console.log(`\nVerify the data in conversation_messages, then drop intelligence_logs when ready.`);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
