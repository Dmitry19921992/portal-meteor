# v8.20 + VR (task/vr-main-proto merged into main) - Cloudflare production packaging. NEVER itch.
# Base = the live site dist/cf820 (8.20 Tripo wave 2: PWA, versions/, assets3d, _headers) - everything kept; only the game page changes:
#   index.html + l106/dicts.js from dist/v820vr.html (same page()/pwa()/split() as mkitch820.py), version.json with the new id.
#   python mkcf820vr.py  ->  dist/cf820vr/
import os, io, re, json, shutil, hashlib, subprocess, datetime
D = 'D:/AI/pm_v6/dist/'
SRC = D + 'v820vr.html'
LIVE = D + 'cf820/'
CF = D + 'cf820vr/'
REPO = os.path.dirname(os.path.abspath(__file__))
LIMIT = 25 * 1024 * 1024
def rd(p): return io.open(p, encoding='utf-8').read()
def w(p, t): os.makedirs(os.path.dirname(p), exist_ok=True); io.open(p, 'w', encoding='utf-8', newline='\n').write(t)
def git(*a): return subprocess.check_output(['git', '-C', REPO] + list(a)).decode('utf-8', 'replace').strip()
rb = open(SRC, 'rb').read(); src = rb.decode('utf-8')
assert "FX87.VER = '8.20'" in src and 'v819_t243.js' in src and '// ---- v820_xr.js' in src and '// ---- v820_quest.js' in src, 'not the 8.20 + VR build'
live = rd(LIVE + 'index.html')
ALL = json.loads(re.search(r'/\*VER75_LOCAL\*/(\[[^\]]*\])', live).group(1))
assert sorted(ALL) == sorted(f[:-5] for f in os.listdir(LIVE + 'versions') if f.endswith('.html')), 'live versions/ != VER75_LOCAL'
def page(local_ids):
    t = src
    assert '/*VER75_ARCHIVE*/false' in t and '/*VER75_LOCAL*/[]' in t
    t = t.replace('/*VER75_ARCHIVE*/false', '/*VER75_ARCHIVE*/true', 1)
    return t.replace('/*VER75_LOCAL*/[]', '/*VER75_LOCAL*/' + json.dumps(local_ids), 1)
a = live.index('<!-- T134 PWA'); b = live.index('</script>', a) + len('</script>')
PWA = live[a:b]; VP = 'viewport-fit=cover">\n'
assert live[:a].endswith(VP)
def pwa(t):
    i = t.index(VP) + len(VP); assert i < 200000
    return t[:i] + PWA + '\n' + t[i:]
def split(t):   # = mkitch820.py / tools106/mkpreview.py split
    segs = [m_.start() for m_ in re.finditer(r'\n// ---- [^\n]+\n', t)]
    names = [t[s + 9:t.index('\n', s + 1)] for s in segs]
    idx = [k for k, n in enumerate(names) if re.fullmatch(r'dict_[A-Za-z-]+_1107\.js', n) and n not in ('dict_fill_1107.js', 'dict_fix_1107.js')]
    assert idx and idx == list(range(idx[0], idx[-1] + 1)) and idx[-1] + 1 < len(segs), 'dict segments not found / not contiguous'
    x, y = segs[idx[0]], segs[idx[-1] + 1]
    loader = ("\n// ---- dict_*_1107.js -> l106/dicts.js (T106 mkpreview, file limit of Cloudflare Pages)\n"
              "(function(){ try { const x = new XMLHttpRequest(); x.open('GET', 'l106/dicts.js', false); x.send();"
              " if (x.status === 200 || (x.status === 0 && x.responseText)) (0, eval)(x.responseText); else console.warn('T106 dicts', x.status); }"
              " catch (e){ console.warn('T106 dicts', e); } })();")
    return t[:x] + loader + t[y:], t[x:y], len(idx)
if os.path.exists(CF): shutil.rmtree(CF)
shutil.copytree(LIVE, CF)
idx_html, dicts, nd = split(pwa(page(ALL)))
w(CF + 'index.html', idx_html); w(CF + 'l106/dicts.js', dicts)
commit = git('rev-parse', '--short', 'HEAD')
BD = re.search(r'const BUILD_DATE = "([^"]+)"', src).group(1)
now = datetime.datetime.strptime(BD, '%d.%m.%Y %H:%M')
info = {'id': f'main · {commit} · 8.20 · {BD} · VR', 'ver': '8.20', 'label': f'8.20 · {BD}', 'branch': 'main', 'commit': commit, 'subject': git('log', '-1', '--format=%s'),
        'built': now.isoformat(timespec='seconds'), 'tz': 'UTC+7 (PC time)', 'src': SRC, 'sha256': hashlib.sha256(rb).hexdigest(), 'bytes': len(rb)}
w(CF + 'version.json', json.dumps(info, ensure_ascii=False, indent=1))
for r_, _, fs in os.walk(CF):
    for f in fs: assert os.path.getsize(os.path.join(r_, f)) < LIMIT, 'Cloudflare Pages: file over 25 MiB: ' + f
print('cf820vr:', sum(len(fs) for _, _, fs in os.walk(CF)), 'files; index', round(os.path.getsize(CF + 'index.html') / 1e6, 2), 'MB; dicts', nd, '; versions', ALL)
print(json.dumps(info, ensure_ascii=False))
