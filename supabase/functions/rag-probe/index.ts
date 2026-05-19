/**
 * rag-probe — Read-only diagnostic. Runs the same RAG pipeline decode-intel
 * uses (Gemini embedding → search_book_passages RPC) for a given query and
 * returns the top-5 matched passages with their book_name, chapter, and
 * cosine similarity score.
 *
 * Use to verify that ingested books are actually retrievable and that
 * relevance ranking is sane.
 *
 *   curl -sS -X POST 'https://adyebdcyqczhkluqgwvv.supabase.co/functions/v1/rag-probe' \
 *     -H 'Content-Type: application/json' \
 *     -d '{"query":"he flips between hot and cold then begs me back"}'
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function embed(text: string, apiKey: string): Promise<number[] | null> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'models/gemini-embedding-001',
        content: { parts: [{ text: text.slice(0, 2000) }] },
        outputDimensionality: 768,
      }),
    },
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data?.embedding?.values ?? null;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  if (!GEMINI_API_KEY) {
    return new Response(JSON.stringify({ error: 'GEMINI_API_KEY not set' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: { query?: string; match_count?: number };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid JSON body' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const query = (body.query ?? '').trim();
  const match_count = body.match_count ?? 5;
  if (!query) {
    return new Response(JSON.stringify({ error: 'query required' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const embedding = await embed(query, GEMINI_API_KEY);
  if (!embedding) {
    return new Response(JSON.stringify({ error: 'embedding failed' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const { data, error } = await admin.rpc('search_book_passages', {
    query_embedding: embedding,
    match_count,
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const results = (data ?? []).map((r: { book_name: string; chapter: string | null; passage: string; similarity: number }) => ({
    book_name: r.book_name,
    chapter: r.chapter,
    similarity: Number(r.similarity?.toFixed(4)),
    passage_preview: (r.passage ?? '').slice(0, 220) + '...',
  }));

  // Aggregate book counts so we can see source distribution at a glance
  const book_counts: Record<string, number> = {};
  for (const r of results) book_counts[r.book_name] = (book_counts[r.book_name] ?? 0) + 1;

  return new Response(JSON.stringify({ query, match_count: results.length, book_counts, results }, null, 2), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
