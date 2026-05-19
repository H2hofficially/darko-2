/**
 * purge-rag-books — One-shot admin function to remove passages from
 * book_passages by book_name. DRY-RUN by default; requires explicit
 * `confirm: true` in the body to actually delete.
 *
 * Body shape:
 *   { book_names: string[], confirm?: boolean }
 *
 *   curl -sS -X POST 'https://adyebdcyqczhkluqgwvv.supabase.co/functions/v1/purge-rag-books' \
 *     -H 'Content-Type: application/json' \
 *     -d '{"book_names":["The 48 Laws of Power"]}'
 *
 * Returns per-book counts. With confirm=true the rows are deleted and the
 * response reports `deleted` counts.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  let body: { book_names?: string[]; confirm?: boolean };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid JSON body' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const book_names = Array.isArray(body.book_names) ? body.book_names : [];
  const confirm = body.confirm === true;
  if (!book_names.length) {
    return new Response(JSON.stringify({ error: 'book_names required (non-empty array)' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  const per_book: Record<string, { matched: number; deleted: number }> = {};

  for (const name of book_names) {
    const { count: matched } = await admin
      .from('book_passages')
      .select('id', { count: 'exact', head: true })
      .eq('book_name', name);

    let deleted = 0;
    if (confirm && (matched ?? 0) > 0) {
      const { error, count } = await admin
        .from('book_passages')
        .delete({ count: 'exact' })
        .eq('book_name', name);
      if (error) {
        return new Response(JSON.stringify({ error: `delete failed for "${name}": ${error.message}` }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      deleted = count ?? 0;
    }

    per_book[name] = { matched: matched ?? 0, deleted };
  }

  const total_matched = Object.values(per_book).reduce((s, v) => s + v.matched, 0);
  const total_deleted = Object.values(per_book).reduce((s, v) => s + v.deleted, 0);

  return new Response(JSON.stringify({
    mode: confirm ? 'execute' : 'dry-run',
    total_matched,
    total_deleted,
    per_book,
    note: confirm
      ? 'Rows deleted. Run again to verify counts are zero.'
      : 'DRY RUN — no rows deleted. Re-call with "confirm": true to execute.',
  }, null, 2), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
