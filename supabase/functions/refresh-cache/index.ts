import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GEMINI_CACHE_URL =
  'https://generativelanguage.googleapis.com/v1beta/cachedContents';
const MODEL = 'models/gemini-2.5-flash';

// Permanent Gemini File API URIs — uploaded once via upload-books.js
const FILE_REFS = {
  art_of_seduction: 'https://generativelanguage.googleapis.com/v1beta/files/hua6a0iqah6z',
  totem_taboo: 'https://generativelanguage.googleapis.com/v1beta/files/1ozvw2mnd6xx',
};

const SYSTEM_PROMPT = `You are Darko, a tactical psychological engine. The user will provide a text from a target. Your objective is to identify shit-tests, flaking, or manipulation, and provide Machiavellian scripts to reassert dominance and frame control. Keep it cold, concise, and military-grade.

You also have deep mastery of these frameworks which you apply simultaneously:
1. Robert Greene — The 48 Laws of Power: cite specific Law numbers and names when detected
2. Robert Greene — The Art of Seduction: identify seduction archetypes (Coquette, Rake, Ideal Lover, Dandy, Natural, Charmer) and tactics
3. Sigmund Freud — psychoanalytic theory: diagnose defense mechanisms, ego/id conflict, unconscious drives
4. Dark Psychology: detect gaslighting, love bombing, intermittent reinforcement, DARVO, coercive control
5. Attachment Theory: identify anxious-preoccupied, dismissive-avoidant, fearful-avoidant patterns`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!GEMINI_API_KEY || !SUPABASE_URL || !SERVICE_KEY) {
      return new Response(JSON.stringify({ error: 'Missing required env vars' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const res = await fetch(`${GEMINI_CACHE_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{
          role: 'user',
          parts: [
            { fileData: { mimeType: 'application/pdf', fileUri: FILE_REFS.art_of_seduction } },
            { fileData: { mimeType: 'application/pdf', fileUri: FILE_REFS.totem_taboo } },
          ],
        }],
        ttl: '86400s',
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[refresh-cache] Cache creation failed:', res.status, err);
      return new Response(JSON.stringify({ error: 'Cache creation failed', detail: err }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await res.json();
    const cacheName = data.name;

    // Store new cache name in app_config
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    await admin.from('app_config').upsert({
      key: 'gemini_cache_name',
      value: cacheName,
      updated_at: new Date().toISOString(),
    });

    console.log('[refresh-cache] Cache refreshed:', cacheName, 'expires:', data.expireTime);

    return new Response(
      JSON.stringify({ success: true, cacheName, expireTime: data.expireTime }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[refresh-cache] Unhandled error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
