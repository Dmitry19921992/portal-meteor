import re, sys
# Разрешение конфликтов слияния: resolve(file, [res1, res2, ...]); res = 'ours' | 'theirs' | 'both' | fn(ours, theirs)
def resolve(path, resolutions):
    s = open(path, encoding='utf-8').read()
    pat = re.compile(r'<<<<<<< [^\n]*\n(.*?)=======\n(.*?)>>>>>>> [^\n]*\n', re.S)
    hunks = pat.findall(s)
    if len(hunks) != len(resolutions):
        print(path, 'hunks', len(hunks), '!= resolutions', len(resolutions)); sys.exit(1)
    it = iter(resolutions)
    def rep(m):
        r = next(it); o, t = m.group(1), m.group(2)
        if r == 'ours': return o
        if r == 'theirs': return t
        if r == 'both': return o + t
        return r(o, t)
    s = pat.sub(rep, s)
    open(path, 'w', encoding='utf-8', newline='\n').write(s)
    print(path, 'resolved', len(hunks))

def must(text, old, new, count=1):
    if text.count(old) != count:
        print('MISS', repr(old[:80]), text.count(old)); sys.exit(1)
    return text.replace(old, new)
