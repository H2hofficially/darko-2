"""Check which chunks contain 5+ word sequences matching the source PDF."""

import os, re, sys

chunks_dir = 'navarro_chunks'
source_path = 'knowledge/what-everybody-is-saying.pdf'

try:
    import pdfplumber
    with pdfplumber.open(source_path) as pdf:
        source_text = ' '.join(p.extract_text() or '' for p in pdf.pages)
except:
    print("Could not open PDF")
    sys.exit(1)

source_clean = re.sub(r'\s+', ' ', source_text).lower()
source_words = source_clean.split()

# Build source n-gram set (5-word)
source_ngrams = set()
for i in range(len(source_words) - 4):
    source_ngrams.add(' '.join(source_words[i:i+5]))

files = sorted([f for f in os.listdir(chunks_dir) 
                if f.startswith('navarro_wbis_') and f.endswith('.md')])

total_matches = 0
for fname in files:
    path = os.path.join(chunks_dir, fname)
    with open(path, encoding='utf-8') as f:
        content = f.read()
    # Remove frontmatter
    body = re.sub(r'---\n.*?\n---\n*', '', content, count=1, flags=re.DOTALL)
    body_clean = re.sub(r'\s+', ' ', body).strip().lower()
    bwords = body_clean.split()
    
    chunk_matches = set()
    for i in range(len(bwords) - 4):
        ngram = ' '.join(bwords[i:i+5])
        if ngram in source_ngrams:
            chunk_matches.add(ngram)
    
    if chunk_matches:
        total_matches += len(chunk_matches)
        print(f'\n=== {fname} ({len(chunk_matches)} matches) ===')
        for m in sorted(chunk_matches):
            print(f'  "{m}"')

print(f'\nTotal: {total_matches} matching n-grams across all files.')
