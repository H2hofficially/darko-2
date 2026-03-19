#!/usr/bin/env node
// scripts/embed-books.js
// One-time ingestion: chunk all 6 PDFs → Gemini embeddings → Supabase book_passages
//
// Prerequisites:
//   npm install pdf-parse @supabase/supabase-js
//
// Run:
//   GEMINI_API_KEY=xxx \
//   SUPABASE_URL=https://adyebdcyqczhkluqgwvv.supabase.co \
//   SUPABASE_SERVICE_KEY=xxx \
//   node scripts/embed-books.js
//
// Re-runnable: clears existing rows per book before re-inserting.

const fs = require('fs');
const path = require('path');

// ── Env checks ────────────────────────────────────────────────────────────────

const GEMINI_API_KEY   = process.env.GEMINI_API_KEY;
const SUPABASE_URL     = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('[DARKO] Missing env vars. Need: GEMINI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY');
  process.exit(1);
}

let pdfParse;
try {
  pdfParse = require('pdf-parse');
} catch {
  console.error('[DARKO] pdf-parse not installed. Run: npm install pdf-parse');
  process.exit(1);
}

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

// ── Config ────────────────────────────────────────────────────────────────────

const WORDS_PER_CHUNK    = 400;  // ~500 tokens, well within embedding limit
const OVERLAP_WORDS      = 60;   // overlap prevents context loss at chunk boundaries
const MIN_CHUNK_WORDS    = 50;   // discard tail chunks shorter than this
const EMBED_DELAY_MS     = 60;   // ms between embedding calls (~16/s, well under 30/s limit)
const INSERT_BATCH_SIZE  = 25;   // rows per Supabase insert

const BOOKS = [
  { file: '48 Laws of Power — Robert Greene.pdf',  name: 'The 48 Laws of Power'     },
  { file: 'Laws of Human Nature — Robert Greene.pdf', name: 'The Laws of Human Nature' },
  { file: 'The Art of Seduction — Robert Greene.pdf', name: 'The Art of Seduction'     },
  { file: 'The_Evolution_of_Desire.pdf',           name: 'The Evolution of Desire'   },
  { file: 'Totem and Taboo — Sigmund Freud.pdf',   name: 'Totem and Taboo'           },
  { file: 'what-everybody-is-saying.pdf',          name: 'What Every Body Is Saying' },
];

// Chapter heading patterns (ordered by specificity)
const CHAPTER_PATTERNS = [
  /LAW\s+\d+\s*[:\-—–]?\s*[A-Z][^\n]{4,60}/,          // LAW 16: USE ABSENCE...
  /Chapter\s+\d+\s*[:\-—–]?\s*[A-Z][^\n]{4,60}/i,     // Chapter 3: The Coquette
  /PART\s+(?:ONE|TWO|THREE|FOUR|FIVE|SIX|SEVEN|EIGHT|NINE|TEN|\d+)\s*[:\-—–]?\s*[^\n]{0,50}/i,
  /THE\s+[A-Z]{4,}(?:\s+[A-Z]{3,}){0,3}/,             // THE COQUETTE, THE IDEAL LOVER
];

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getEmbedding(text) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'models/text-embedding-004',
        content: { parts: [{ text }] },
      }),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Embedding API ${res.status}: ${err.slice(0, 300)}`);
  }
  const data = await res.json();
  return data.embedding.values; // number[768]
}

function chunkText(text) {
  const cleaned = text.replace(/\f/g, '\n').replace(/[ \t]+/g, ' ').trim();
  const words = cleaned.split(/\s+/);
  const step = WORDS_PER_CHUNK - OVERLAP_WORDS;
  const chunks = [];
  for (let i = 0; i < words.length; i += step) {
    const slice = words.slice(i, i + WORDS_PER_CHUNK);
    if (slice.length >= MIN_CHUNK_WORDS) {
      chunks.push({ text: slice.join(' '), wordOffset: i });
    }
  }
  return chunks;
}

function detectChapter(wordOffset, allWords) {
  // Look at ~200 words before this chunk for the most recent chapter heading
  const start  = Math.max(0, wordOffset - 200);
  const window = allWords.slice(start, wordOffset).join(' ');
  for (const pat of CHAPTER_PATTERNS) {
    const m = window.match(pat);
    if (m) return m[0].replace(/\s+/g, ' ').trim().slice(0, 100);
  }
  return null;
}

async function flushBatch(batch) {
  if (!batch.length) return 0;
  const { error } = await supabase.from('book_passages').insert(batch);
  if (error) {
    console.error('[DARKO]   Insert error:', error.message);
    return 0;
  }
  return batch.length;
}

// ── Per-book processing ───────────────────────────────────────────────────────

async function processBook({ file, name }) {
  const bookPath = path.join(__dirname, '..', 'knowledge', file);
  if (!fs.existsSync(bookPath)) {
    console.warn(`[DARKO] Skipping (not found): ${file}`);
    return;
  }

  console.log(`\n[DARKO] ── ${name}`);
  const buffer  = fs.readFileSync(bookPath);
  const pdfData = await pdfParse(buffer);
  const allWords = pdfData.text.replace(/\f/g, '\n').replace(/[ \t]+/g, ' ').trim().split(/\s+/);
  const chunks  = chunkText(pdfData.text);
  console.log(`[DARKO]   ${allWords.length.toLocaleString()} words → ${chunks.length} chunks`);

  // Clear stale rows so script is safely re-runnable
  await supabase.from('book_passages').delete().eq('book_name', name);

  let stored = 0;
  let errors = 0;
  const batch = [];

  for (let i = 0; i < chunks.length; i++) {
    const { text, wordOffset } = chunks[i];
    try {
      const embedding = await getEmbedding(text);
      const chapter   = detectChapter(wordOffset, allWords);
      batch.push({ book_name: name, chapter, passage: text, embedding });

      if (batch.length >= INSERT_BATCH_SIZE) {
        stored += await flushBatch(batch.splice(0, INSERT_BATCH_SIZE));
      }

      if ((i + 1) % 100 === 0) {
        console.log(`[DARKO]   ${i + 1}/${chunks.length} embedded, ${stored} stored`);
      }
      await new Promise(r => setTimeout(r, EMBED_DELAY_MS));
    } catch (err) {
      console.error(`[DARKO]   Chunk ${i} error: ${err.message}`);
      errors++;
    }
  }

  stored += await flushBatch(batch); // flush remainder
  console.log(`[DARKO]   Done: ${stored} stored, ${errors} errors`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('[DARKO] Book ingestion starting...');
  console.log(`[DARKO] ${BOOKS.length} books, ~${WORDS_PER_CHUNK} words/chunk, ${OVERLAP_WORDS} word overlap\n`);

  const start = Date.now();
  for (const book of BOOKS) {
    await processBook(book);
  }

  const elapsed = Math.round((Date.now() - start) / 1000);
  console.log(`\n[DARKO] All books ingested in ${elapsed}s.`);
  console.log('[DARKO] RAG is now active — decode-intel will retrieve relevant passages per request.');
}

main().catch(err => { console.error(err); process.exit(1); });
