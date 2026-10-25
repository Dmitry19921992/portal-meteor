import sys, re, os
# g.py grep <file...> -- <regex>   |  g.py show <file> <from> <to>
cmd = sys.argv[1]
if cmd == 'grep':
    i = sys.argv.index('--'); files = sys.argv[2:i]; pat = re.compile(sys.argv[i+1])
    for f in files:
        for n, l in enumerate(open(f, encoding='utf-8-sig').read().split('\n'), 1):
            if pat.search(l): print(f'{os.path.basename(f)}:{n}: {l.strip()[:230]}')
elif cmd == 'show':
    f, a, b = sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
    L = open(f, encoding='utf-8-sig').read().split('\n')
    for n in range(a, min(b, len(L)) + 1): print(f'{n}: {L[n-1]}')
