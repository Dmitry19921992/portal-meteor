import re, io
a = io.open('D:/AI/pm_v6/dist/v75r.html', encoding='utf-8').read()
b = io.open('D:/AI/pm_v6/dist/v75f.html', encoding='utf-8').read()
def parts(t):
    d = {}
    for m in re.finditer(r'<script id="(\w+)"[^>]*>', t):
        e = t.find('</script>', m.end()); d['#' + m.group(1)] = e - m.end()
    for m in re.finditer(r'// ---- (\S+)\n', t):
        n = t.find('\n// ---- ', m.end()); d[m.group(1)] = (n if n > 0 else len(t)) - m.end()
    return d
A, B = parts(a), parts(b)
for k in sorted(set(A) | set(B)):
    if A.get(k) != B.get(k): print(k, A.get(k), B.get(k))
