import os, re, glob

os.chdir('c:/Users/hpsbm/Desktop/darko')
files = sorted(glob.glob('mace_chunks/mace_dpgm_*.md'))
total = 0
print(f'{"filename":<30} {"wc":>4} {"type":<15} {"phase_map":<22} {"first_line":<70}')
print('-' * 145)
for f in files:
    with open(f, 'r', encoding='utf-8') as fh:
        content = fh.read()
    m = re.match(r'^---\s*\n(.*?)\n---', content, re.DOTALL)
    if m:
        fm = m.group(1)
        wc = int(re.search(r'word_count:\s*(\d+)', fm).group(1)) if re.search(r'word_count:\s*(\d+)', fm) else 0
        typ = re.search(r'type:\s*(\S+)', fm).group(1) if re.search(r'type:\s*(\S+)', fm) else '?'
        pm = re.search(r'phase_map:\s*(\[.*?\])', fm).group(1) if re.search(r'phase_map:\s*(\[.*?\])', fm) else '?'
        cid = os.path.splitext(os.path.basename(f))[0]
        body = content[m.end():].strip()
        first = body.split('\n')[0].strip().replace('#', '').strip()
        if len(first) > 67:
            first = first[:64] + '...'
        total += wc
        print(f'{cid:<30} {wc:>4} {typ:<15} {pm:<22} {first}')
print('-' * 145)
print(f'TOTAL WORD COUNT: {total}')
print()

print('=== WORD COUNT RANGE CHECK ===')
for f in files:
    with open(f, 'r', encoding='utf-8') as fh:
        content = fh.read()
    m = re.match(r'^---\s*\n(.*?)\n---', content, re.DOTALL)
    if m:
        wc = int(re.search(r'word_count:\s*(\d+)', m.group(1)).group(1))
        cid = os.path.splitext(os.path.basename(f))[0]
        flag = ''
        if wc < 250:
            flag = ' *** UNDER 250 ***'
        elif wc > 600:
            flag = ' *** OVER 600 ***'
        print(f'  {cid:<35} {wc:>4} words{flag}')
print()
print('=== FRONTMATTER COMPLETENESS CHECK ===')
required = ['chunk_id', 'source', 'chapter', 'type', 'phase_map', 'retrieve_when', 'retrieval_warnings', 'word_count']
for f in files:
    with open(f, 'r', encoding='utf-8') as fh:
        content = fh.read()
    m = re.match(r'^---\s*\n(.*?)\n---', content, re.DOTALL)
    cid = os.path.splitext(os.path.basename(f))[0]
    missing = []
    if m:
        for r in required:
            if r not in m.group(1):
                missing.append(r)
    else:
        missing = ['NO FRONTMATTER']
    if missing:
        print(f'  {cid:<35} MISSING: {missing}')
    else:
        print(f'  {cid:<35} OK')
