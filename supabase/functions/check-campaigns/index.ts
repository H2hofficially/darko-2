import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Silence thresholds in days by mission phase
function silenceThreshold(phase: number): number {
  if (phase <= 2) return 5;
  if (phase <= 4) return 4;
  return 3;
}

function daysSince(isoString: string): number {
  return (Date.now() - new Date(isoString).getTime()) / 86400000;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  try {
    // 1. Get all push tokens
    const { data: tokenRows, error: tokenErr } = await admin
      .from('push_tokens')
      .select('user_id, token, last_alert_at');

    if (tokenErr) {
      console.error('[check-campaigns] push_tokens query error:', tokenErr.message);
      return new Response(JSON.stringify({ ok: false, error: tokenErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!tokenRows?.length) {
      return new Response(JSON.stringify({ ok: true, alerts: 0, reason: 'no registered devices' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let alertsSent = 0;

    for (const tokenRow of tokenRows) {
      const { user_id, token, last_alert_at } = tokenRow as any;

      // Debounce: skip if alerted within last 20 hours
      if (last_alert_at && daysSince(last_alert_at) < 0.833) continue;

      // 2. Get all targets for this user
      const { data: targets } = await admin
        .from('targets')
        .select('id, target_alias, behavioral_profile, mission_phase')
        .eq('user_id', user_id);

      if (!targets?.length) continue;

      let alertSentThisUser = false;

      for (const target of targets) {
        if (alertSentThisUser) break;

        const phase = (target as any).mission_phase ?? 1;
        const profile = (target as any).behavioral_profile;
        const targetId = (target as any).id;
        const targetName = (target as any).target_alias;

        // 3. Get last 10 decode entries for timing analysis
        const { data: logs } = await admin
          .from('intelligence_logs')
          .select('created_at, message_content')
          .eq('target_id', targetId)
          .order('created_at', { ascending: false })
          .limit(10);

        if (!logs?.length) continue;

        const lastLog = logs[0] as any;
        const daysSinceLastDecode = daysSince(lastLog.created_at);

        // Find last tactical entry (target sent a message)
        const lastTactical = (logs as any[]).find(
          (l) => l.message_content?.result?.response_type === 'tactical',
        );
        const daysSinceTargetMessaged = lastTactical ? daysSince(lastTactical.created_at) : null;

        const threshold = silenceThreshold(phase);

        // ── Evaluate conditions in priority order ──────────────────────────

        let alertType: string | null = null;
        let alertBody: string | null = null;

        // 1. Exact silence threshold crossing (fire on the threshold day only)
        if (
          daysSinceTargetMessaged !== null &&
          Math.floor(daysSinceTargetMessaged) === threshold
        ) {
          alertType = 'SILENCE_WINDOW';
          alertBody = `Target dark ${threshold} days. Phase ${phase} threshold crossed — re-engagement window is open.`;

        // 2. Advancement signal from most recent decode
        } else if (
          profile?.relationship_momentum === 'ADVANCING' &&
          daysSinceLastDecode < 1
        ) {
          alertType = 'ADVANCEMENT_SIGNAL';
          alertBody = 'Target showing advancement signals. Strike while momentum holds.';

        // 3. Operative mistake flagged in most recent decode
        } else if (
          Array.isArray(profile?.operative_mistakes) &&
          profile.operative_mistakes.length > 0 &&
          daysSinceLastDecode < 1
        ) {
          alertType = 'MISTAKE_FOLLOWUP';
          alertBody = 'Last decode flagged operative errors. Course correction required before next move.';

        // 4. Extended silence past threshold, operative hasn't decoded recently
        } else if (
          daysSinceTargetMessaged !== null &&
          daysSinceTargetMessaged > threshold &&
          daysSinceLastDecode >= 1
        ) {
          alertType = 'RE_ENGAGEMENT';
          alertBody = `Target silent ${Math.floor(daysSinceTargetMessaged)} days. Window closing — act now.`;
        }

        if (!alertType || !alertBody) continue;

        // 4. Send via Expo Push API
        const pushRes = await fetch(EXPO_PUSH_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            to: token,
            title: '// DARKO ALERT',
            body: `Operative — ${alertBody}`,
            data: { targetId, targetName, alertType },
            sound: 'default',
          }),
        });

        if (pushRes.ok) {
          const pushData = await pushRes.json();
          console.log(JSON.stringify({
            event: 'push_sent',
            user_id,
            targetId,
            alertType,
            expo_status: pushData?.data?.status ?? 'unknown',
          }));

          alertsSent++;
          alertSentThisUser = true;

          // Update debounce timestamp
          await admin
            .from('push_tokens')
            .update({ last_alert_at: new Date().toISOString() })
            .eq('user_id', user_id);
        } else {
          console.error('[check-campaigns] Expo push failed:', await pushRes.text());
        }
      }
    }

    return new Response(
      JSON.stringify({ ok: true, alerts: alertsSent, checked: tokenRows.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[check-campaigns] Unhandled error:', err);
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
