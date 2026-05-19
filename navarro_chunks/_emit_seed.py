"""Emit supabase/functions/seed-rag-navarro/index.ts from the 12 paraphrase chunks.

Pattern mirrors seed-rag-mace exactly: embed (chapter + retrieve_when + passage),
store only the clean passage body. Idempotent guard on book_name.
"""

import os, re, json

CHUNKS_DIR = 'c:\\Users\\hpsbm\\Desktop\\darko\\navarro_chunks'
OUT_PATH = 'c:\\Users\\hpsbm\\Desktop\\darko\\supabase\\functions\\seed-rag-navarro\\index.ts'
BOOK_NAME = 'Navarro — What Every Body Is Saying (paraphrased)'

# Map chunk_id → chapter label (semantic, operator-friendly)
CHAPTER_LABELS = {
    'navarro_wbis_foundational_baseline': 'Foundations: Baseline & Deviation',
    'navarro_wbis_foundational_clusters': 'Foundations: Cluster Principle',
    'navarro_wbis_foundational_limbic':   'Foundations: Limbic System & Freeze-Flight-Fight',
    'navarro_wbis_torso_ventral':         'Region: Torso & Ventral Orientation',
    'navarro_wbis_arms':                  'Region: Arms',
    'navarro_wbis_hands_fingers':         'Region: Hands & Fingers',
    'navarro_wbis_feet_legs':             'Region: Feet & Legs (most honest)',
    'navarro_wbis_face_other':            'Region: Forehead, Jaw, Nose, Chin, Coloring',
    'navarro_wbis_eyes':                  'Region: Eyes & Gaze',
    'navarro_wbis_mouth_lips':            'Region: Mouth & Lips',
    'navarro_wbis_proxemics_space':       'Interaction: Proxemics & Distance',
    'navarro_wbis_mirroring_sync':        'Interaction: Mirroring (Isopraxism) & Sync',
}

# Stable ordering: foundations first, then regions, then interaction patterns
ORDER = [
    'navarro_wbis_foundational_limbic',
    'navarro_wbis_foundational_baseline',
    'navarro_wbis_foundational_clusters',
    'navarro_wbis_feet_legs',
    'navarro_wbis_torso_ventral',
    'navarro_wbis_arms',
    'navarro_wbis_hands_fingers',
    'navarro_wbis_face_other',
    'navarro_wbis_eyes',
    'navarro_wbis_mouth_lips',
    'navarro_wbis_proxemics_space',
    'navarro_wbis_mirroring_sync',
]

def parse_chunk(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    fm_match = re.search(r'---\n(.+?)\n---\n*(.*)$', content, re.DOTALL)
    fm = fm_match.group(1)
    body = fm_match.group(2).strip()

    chunk_id = re.search(r'chunk_id:\s*(.+)', fm).group(1).strip()
    rw_match = re.search(r'retrieve_when:\s*"(.+?)"', fm)
    retrieve_when = rw_match.group(1).strip() if rw_match else ''
    return chunk_id, retrieve_when, body


def ts_template_escape(s):
    # In TS template literals, only ` and ${ need escaping.
    return s.replace('\\', '\\\\').replace('`', '\\`').replace('${', '\\${')


def passage_entry(chapter, retrieve_when, passage):
    rw = ts_template_escape(retrieve_when)
    pa = ts_template_escape(passage)
    ch = ts_template_escape(chapter)
    return (
        '  {\n'
        f'    chapter: `{ch}`,\n'
        f'    retrieve_when: `{rw}`,\n'
        f'    passage: `{pa}`,\n'
        '  },'
    )


def main():
    entries = []
    for chunk_id in ORDER:
        path = os.path.join(CHUNKS_DIR, f'{chunk_id}.md')
        cid, rw, body = parse_chunk(path)
        assert cid == chunk_id, f'chunk_id mismatch: {cid} vs {chunk_id}'
        entries.append(passage_entry(CHAPTER_LABELS[chunk_id], rw, body))

    passages_block = '\n'.join(entries)

    ts = f'''/**
 * seed-rag-navarro — Ingests a paraphrased layer of Joe Navarro's
 * "What Every Body Is Saying" into book_passages.
 *
 * Source: navarro_chunks/*.md (12 pre-chunked paraphrase passages —
 * 3 foundational + 7 region modules + 2 interaction patterns).
 * All bodies passed a 5-word verbatim check vs the source PDF
 * (0 matches across 8,084 total paraphrase words).
 *
 * High-signal for DARKO: replaces the raw What-Every-Body-Is-Saying PDF
 * (purged 2026-05-15 for OCR/chapter-null noise). Restores body-language
 * coverage as clean prose with semantic chapter labels and
 * `retrieve_when` hints tuned for romantic / interpersonal observation.
 *
 * Coexists with seed-rag, seed-rag-aos, seed-rag-psycyber, seed-rag-mace
 * under a distinct book_name. Idempotent; skips if any row with this
 * book_name already exists.
 *
 * Embedding boost: per-chunk `retrieve_when` hint is concatenated into
 * the embedding input (improves recall) but NOT stored in the passage
 * (keeps operator-facing context clean at inference time).
 *
 * Invoke once:
 *   curl -X POST 'https://adyebdcyqczhkluqgwvv.supabase.co/functions/v1/seed-rag-navarro'
 */

import {{ serve }} from 'https://deno.land/std@0.168.0/http/server.ts';
import {{ createClient }} from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {{
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}};

const BOOK_NAME = '{BOOK_NAME}';

const PASSAGES: Array<{{ chapter: string; retrieve_when: string; passage: string }}> = [
{passages_block}
];

async function embed(text: string, apiKey: string): Promise<number[] | null> {{
  try {{
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${{apiKey}}`,
      {{
        method: 'POST',
        headers: {{ 'Content-Type': 'application/json' }},
        body: JSON.stringify({{
          model: 'models/gemini-embedding-001',
          content: {{ parts: [{{ text: text.slice(0, 2000) }}] }},
          outputDimensionality: 768,
        }}),
      }},
    );
    if (!res.ok) {{
      console.error('[seed-rag-navarro] embed failed:', await res.text());
      return null;
    }}
    const data = await res.json();
    return data?.embedding?.values ?? null;
  }} catch (e) {{
    console.error('[seed-rag-navarro] embed exception:', e);
    return null;
  }}
}}

serve(async (req: Request) => {{
  if (req.method === 'OPTIONS') return new Response('ok', {{ headers: corsHeaders }});

  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  if (!GEMINI_API_KEY) {{
    return new Response(JSON.stringify({{ error: 'GEMINI_API_KEY not set' }}), {{
      status: 500, headers: {{ ...corsHeaders, 'Content-Type': 'application/json' }},
    }});
  }}

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {{ auth: {{ persistSession: false }} }});

  const {{ count: existingCount }} = await admin
    .from('book_passages')
    .select('id', {{ count: 'exact', head: true }})
    .eq('book_name', BOOK_NAME);

  if (existingCount && existingCount > 0) {{
    return new Response(
      JSON.stringify({{
        status: 'skipped',
        reason: `${{existingCount}} passages already exist under book_name='${{BOOK_NAME}}'. Delete them first to re-run.`,
      }}),
      {{ status: 200, headers: {{ ...corsHeaders, 'Content-Type': 'application/json' }} }},
    );
  }}

  let inserted = 0;
  let failed = 0;

  for (const entry of PASSAGES) {{
    const embedInput = `${{entry.chapter}}\\n\\nRetrieve when: ${{entry.retrieve_when}}\\n\\n${{entry.passage}}`;
    const embedding = await embed(embedInput, GEMINI_API_KEY);
    if (!embedding) {{ failed++; continue; }}

    const {{ error }} = await admin
      .from('book_passages')
      .insert({{
        book_name: BOOK_NAME,
        chapter: entry.chapter,
        passage: entry.passage,
        embedding,
      }});

    if (error) {{
      console.error('[seed-rag-navarro] insert error:', error.message);
      failed++;
    }} else {{
      inserted++;
    }}

    await new Promise((r) => setTimeout(r, 120));
  }}

  return new Response(
    JSON.stringify({{
      status: 'done',
      total: PASSAGES.length,
      inserted,
      failed,
      book_name: BOOK_NAME,
    }}),
    {{ status: 200, headers: {{ ...corsHeaders, 'Content-Type': 'application/json' }} }},
  );
}});
'''

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, 'w', encoding='utf-8', newline='\n') as f:
        f.write(ts)

    print(f'Wrote {OUT_PATH}')
    print(f'Passages: {len(entries)}')


if __name__ == '__main__':
    main()
