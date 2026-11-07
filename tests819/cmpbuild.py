import sys, re
def parts(p):
    s = open(p, encoding='utf-8').read()
    idx = [(m.start(), m.group(1)) for m in re.finditer(r'^// ---- (\S+)$', s, re.M)]
    d = {'<head>': idx[0][0] if idx else len(s)}
    for k, (a, n) in enumerate(idx):
        b = idx[k + 1][0] if k + 1 < len(idx) else len(s)
        d[n] = b - a
    return d, len(s)
A, la = parts(sys.argv[1]); B, lb = parts(sys.argv[2])
print('total chars', la, lb)
for k in sorted(set(A) | set(B), key=lambda k: -abs(A.get(k, 0) - B.get(k, 0))):
    if A.get(k, 0) != B.get(k, 0): print(k, A.get(k, 0), B.get(k, 0))
