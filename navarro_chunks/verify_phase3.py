import os, re

chunks_dir = 'c:\\Users\\hpsbm\\Desktop\\darko\\navarro_chunks'
files = sorted([f for f in os.listdir(chunks_dir) if f.startswith('navarro_wbis_') and f.endswith('.md')])

print('=' * 130)
print(f'{"FILE":<45} {"WORDS":<8} {"TYPE":<22} {"PHASE_MAP":<18} {"FIRST LINE"}')
print('-' * 130)

total_words = 0
issues = []

for fname in files:
    path = os.path.join(chunks_dir, fname)
    with open(path, 'r') as f:
        content = f.read()
    
    fm = ''
    fm_match = re.search(r'---\n(.+?)\n---', content, re.DOTALL)
    if fm_match:
        fm = fm_match.group(1)
    
    chunk_type = re.search(r'type: (.+)', fm)
    phase_map = re.search(r'phase_map: \[(.+?)\]', fm)
    
    ct = chunk_type.group(1) if chunk_type else '?'
    pm = phase_map.group(1) if phase_map else '?'
    
    # Body only
    body = re.sub(r'---\n.*?\n---\n*', '', content, count=1, flags=re.DOTALL)
    wc = len(body.split())
    total_words += wc
    
    first_line = ''
    for line in body.strip().split('\n'):
        line = line.strip()
        if line and not line.startswith('#'):
            first_line = line[:80]
            break
    
    print(f'{fname:<45} {wc:<8} {ct:<22} [{pm:<16} {first_line}')
    
    if wc < 400:
        issues.append(f'{fname}: UNDER 400 ({wc})')
    elif wc > 800:
        issues.append(f'{fname}: OVER 800 ({wc})')

print('-' * 130)
print(f'TOTAL WORDS across all 12 chunks: {total_words}')
print()

# ====== WORD COUNT CHECK ======
if issues:
    print('!!! WORD COUNT ISSUES:')
    for i in issues:
        print(f'  {i}')
else:
    print('OK: All chunks within 400-800 word range.')
print()

# ====== FORBIDDEN TERMS CHECK (body only) ======
print('--- Forbidden terms in body (not frontmatter) ---')
forbidden = ['FBI', 'interrogation', 'suspect', 'criminal', 'courtroom', 'as an agent', 'police', 'Navarro']
found_any = False
for fname in files:
    path = os.path.join(chunks_dir, fname)
    with open(path) as f:
        content = f.read()
    body = re.sub(r'---\n.*?\n---\n*', '', content, count=1, flags=re.DOTALL)
    for term in forbidden:
        if term.lower() in body.lower():
            lines = [l.strip() for l in body.split('\n') if term.lower() in l.lower()]
            print(f'  FOUND [{term}] in body of {fname}:')
            for l in lines[:3]:
                print(f'    -> {l[:120]}')
            found_any = True
if not found_any:
    print('  Clean: No forbidden terms in body content.')
print()

# ====== FRONTMATTER CHECK ======
print('--- Frontmatter completeness ---')
required_fields = ['chunk_id', 'source', 'type', 'phase_map', 'retrieve_when', 'retrieval_warnings', 'word_count']
all_ok = True
for fname in files:
    path = os.path.join(chunks_dir, fname)
    with open(path) as f:
        content = f.read()
    missing = []
    for field in required_fields:
        if field not in content[:500]:
            missing.append(field)
    if missing:
        print(f'  {fname}: MISSING: {missing}')
        all_ok = False
if all_ok:
    print('  All frontmatter fields present in all 12 files.')
print()

# ====== VERBATIM CHECK (5+ word sequences) ======
print('--- 5-word verbatim sequence check vs source PDF ---')
source_path = 'c:\\Users\\hpsbm\\Desktop\\darko\\knowledge\\what-everybody-is-saying.pdf'
try:
    import pdfplumber
    with pdfplumber.open(source_path) as pdf:
        source_text = ''
        for page in pdf.pages:
            t = page.extract_text()
            if t:
                source_text += t + ' '
    source_clean = re.sub(r'\s+', ' ', source_text).lower()
    source_words = source_clean.split()
    
    # Build set of 5-grams from source
    source_ngrams = set()
    for i in range(len(source_words) - 4):
        source_ngrams.add(' '.join(source_words[i:i+5]))
    
    chunks_text = ''
    for f in files:
        with open(os.path.join(chunks_dir, f)) as fh:
            content = fh.read()
            body = re.sub(r'---\n.*?\n---\n*', '', content, count=1, flags=re.DOTALL)
            body_clean = re.sub(r'\s+', ' ', body).strip()
            chunks_text += body_clean.lower() + ' '
    
    chunk_words = chunks_text.split()
    matches = []
    for i in range(len(chunk_words) - 4):
        ngram = ' '.join(chunk_words[i:i+5])
        if ngram in source_ngrams:
            matches.append(ngram)
    
    if matches:
        print(f'  WARNING: Found {len(matches)} five-word sequences matching source:')
        seen = set()
        for m in matches:
            if m not in seen:
                print(f'    "{m}"')
                seen.add(m)
    else:
        print('  Clean: No five-word verbatim sequences found across any chunk.')
except ImportError:
    print('  pdfplumber not available - skipping verbatim check')
print()

print('=== REVIEW COMPLETE ===')
print(f'Total: {len(files)} files, {total_words} total words')
