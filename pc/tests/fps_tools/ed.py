# ed.py <file> <patch.txt> — применяет замены из patch.txt: блоки «<<<<\nстарое\n====\nновое\n>>>>»
import sys
p, pt = sys.argv[1], sys.argv[2]
s = open(p, encoding='utf-8').read()
P = open(pt, encoding='utf-8').read()
n = 0
for blk in P.split('<<<<\n')[1:]:
    old, rest = blk.split('\n====\n', 1)
    new = rest.split('\n>>>>', 1)[0]
    c = s.count(old)
    if c != 1:
        print('FAIL count=%d for:\n%s' % (c, old[:300])); sys.exit(1)
    s = s.replace(old, new); n += 1
open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('ok', n, 'edits', p)
