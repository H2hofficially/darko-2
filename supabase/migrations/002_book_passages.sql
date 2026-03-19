-- ── RAG: book passages + vector search ──────────────────────────────────────
-- Run once in Supabase SQL Editor (already applied via Management API)

-- Enable pgvector (v0.8.0 available on this project)
CREATE EXTENSION IF NOT EXISTS vector;

-- Book passages table — populated by scripts/embed-books.js
CREATE TABLE IF NOT EXISTS book_passages (
  id        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  book_name TEXT NOT NULL,
  chapter   TEXT,
  passage   TEXT NOT NULL,
  embedding vector(768)
);

-- HNSW index for fast approximate cosine similarity search
-- (m=16, ef_construction=64 are good defaults for this dataset size)
CREATE INDEX IF NOT EXISTS book_passages_embedding_idx
  ON book_passages USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Similarity search function — called from decode-intel edge function
CREATE OR REPLACE FUNCTION search_book_passages(
  query_embedding vector(768),
  match_count     INT DEFAULT 5
)
RETURNS TABLE (
  id        UUID,
  book_name TEXT,
  chapter   TEXT,
  passage   TEXT,
  similarity FLOAT
)
LANGUAGE SQL STABLE AS $$
  SELECT
    id,
    book_name,
    chapter,
    passage,
    1 - (embedding <=> query_embedding) AS similarity
  FROM book_passages
  WHERE embedding IS NOT NULL
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;
