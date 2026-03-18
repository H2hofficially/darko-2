import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { audioBase64, mimeType: clientMimeType } = await req.json();

    if (!audioBase64) {
      return new Response(JSON.stringify({ error: 'audioBase64 required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const audioMimeType = clientMimeType ?? 'audio/m4a';
    console.log('[transcribe-audio] audioBase64 length:', audioBase64.length, 'mimeType:', audioMimeType);

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [
            { inlineData: { mimeType: audioMimeType, data: audioBase64 } },
            { text: 'Transcribe this voice message exactly as spoken. Return only the transcribed text, nothing else.' },
          ],
        }],
        generationConfig: { temperature: 0 },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[transcribe-audio] Gemini error:', res.status, err);
      return new Response(JSON.stringify({ error: 'Gemini request failed', detail: err }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await res.json();
    console.log('[transcribe-audio] Gemini response candidates:', JSON.stringify(data?.candidates?.[0]?.content?.parts));
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? null;
    console.log('[transcribe-audio] extracted text:', text);

    return new Response(JSON.stringify({ text }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[transcribe-audio] Unhandled error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
