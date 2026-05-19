import re

with open('navarro_chunks/_source/full.txt', 'r', encoding='utf-8') as f:
    text = f.read()

# Find all occurrences of each chapter title pattern in the body
# Look for running heads that appear near PDF page markers
patterns = [
    ('Foreword', 'FOREWORD'),
    ('Ch01', 'MASTERING THE SECRETS OF NONVERBAL COMMUNICATION'),
    ('Ch02', 'LIVING OUR LIMBIC LEGACY'),
    ('Ch03', 'GETTING A LEG UP ON BODY LANGUAGE'),
    ('Ch04', 'TORSO TIPS'),
    ('Ch05', 'KNOWLEDGE WITHIN REACH'),
    ('Ch06', 'GETTING A GRIP'),
    ('Ch07', 'THE MIND'),
    ('Ch08', 'DETECTING DECEPTION'),
    ('Ch09', 'SOME FINAL THOUGHTS'),
]

print("=" * 70)
print("CHAPTER BOUNDARY SURVEY")
print("=" * 70)

for label, pat in patterns:
    # Find all positions of this phrase
    positions = []
    start = 0
    while True:
        idx = text.find(pat, start)
        if idx == -1:
            break
        
        # Find the nearest ===PAGE marker before this position (within 500 chars)
        before = text[max(0,idx-500):idx]
        page_matches = re.findall(r'===PAGE (\d+)===', before)
        page_num = page_matches[-1] if page_matches else '?'
        
        # Also get next page marker after
        after = text[idx:idx+500]
        next_page = re.search(r'===PAGE (\d+)===', after)
        next_p = next_page.group(1) if next_page else '?'
        
        positions.append((idx, page_num, next_p))
        start = idx + 1
    
    if positions:
        print(f"\n{label} ('{pat}'): {len(positions)} occurrences")
        for i, (pos, pg, np) in enumerate(positions):
            # Show context around this position
            ctx_start = max(0, pos - 30)
            ctx_end = min(len(text), pos + 100)
            ctx = text[ctx_start:ctx_end].replace('\n', ' | ')
            print(f"  #{i+1}: pos={pos}, PDF page ~{pg}, next page ~{np}")
            print(f"      ...{ctx}...")
    else:
        print(f"\n{label}: NOT FOUND")

print("\n" + "=" * 70)
print("ALL ===PAGE markers")
print("=" * 70)
page_markers = re.findall(r'===PAGE (\d+)===', text)
if page_markers:
    print(f"Total page markers: {len(page_markers)}")
    print("Page range:", page_markers[0], "to", page_markers[-1])
