import sys, re, glob, os
# grep helper for v76tps: python g76t.py DIR REGEX [maxlen]
d, pat = sys.argv[1], re.compile(sys.argv[2])
ml = int(sys.argv[3]) if len(sys.argv) > 3 else 200
for f in sorted(glob.glob(os.path.join(d, '*.js')) + glob.glob(os.path.join(d, '*.html')) + glob.glob(os.path.join(d, '*.glsl'))):
    for i, l in enumerate(open(f, encoding='utf-8-sig', errors='replace')):
        if pat.search(l):
            s = l.strip()
            m = pat.search(s)
            st = max(0, m.start() - ml // 2) if m and len(s) > ml else 0
            print(f"{os.path.basename(f)}:{i+1}: {s[st:st+ml]}")
