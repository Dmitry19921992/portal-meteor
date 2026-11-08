# v8.19 release packaging (08.11.2026): main = test/v819-0811 @62e155a + release label (v819_ver.js). Same layout as mkitch816.py, plus:
#   * the live site is dist/cf816pwa (v8.16 + T134 PWA: manifest, sw.js, icons, head tags) - kept, so the PWA does not disappear
#   * the game is ~30 MB: on Cloudflare the language dictionaries dict_*_1107.js go to l106/dicts.js (Pages: max 25 MiB per file),
#     same split + synchronous loader as tools106/mkpreview.py (tested on test.portal-meteor.pages.dev)
#   * assets3d = live 132 files + T54 hs_* (dist/assets3d) + T94 t94_* / T120 t120_* exactly as on the tested preview (dist/preview_v819_t120b)
#   * version.json (id, ver, commit, sha256 of dist/v819.html) for checking the live site
#   dist/cf819/   - Cloudflare Pages production site (wrangler deploy is a FULL snapshot)
#   dist/itch819/ - itch build: index.html only (old versions + 3D models load from portal-meteor.pages.dev, as before)
#   dist/portal_meteor_v8_19_itch.zip - butler push to edmitry/portal-meteor:html
import os, io, re, sys, json, shutil, zipfile, hashlib, subprocess, datetime
D = 'D:/AI/pm_v6/dist/'
SRC = D + 'v819.html'
LIVE = D + 'cf816pwa/'
PREV = D + 'preview_v819_t120b/assets3d/'
REPO = os.path.dirname(os.path.abspath(__file__))
exec(open('D:/AI/pm_v6/tools/mkitch75r.py', encoding='utf-8').read().split('def main():')[0])   # VERS, shim(), back()
LIMIT = 25 * 1024 * 1024
def rd(p): return io.open(p, encoding='utf-8').read()
def w(p, t): os.makedirs(os.path.dirname(p), exist_ok=True); io.open(p, 'w', encoding='utf-8', newline='\n').write(t)
def md5(p): return hashlib.md5(open(p, 'rb').read()).hexdigest()
def git(*a): return subprocess.check_output(['git', '-C', REPO] + list(a)).decode('utf-8', 'replace').strip()
rb = open(SRC, 'rb').read(); src = rb.decode('utf-8')
assert "FX87.VER = '8.19'" in src and "id: 'v8_19'" in src, 'not the 8.19 release build'
live = rd(LIVE + 'index.html')
live_ids = json.loads(re.search(r'/\*VER75_LOCAL\*/(\[[^\]]*\])', live).group(1))
assert sorted(live_ids) == sorted(f[:-5] for f in os.listdir(LIVE + 'versions')), 'live versions/ != VER75_LOCAL'
ALL = ['v8_16'] + live_ids
def page(local_ids):
    t = src
    assert '/*VER75_ARCHIVE*/false' in t and '/*VER75_LOCAL*/[]' in t
    t = t.replace('/*VER75_ARCHIVE*/false', '/*VER75_ARCHIVE*/true', 1)
    return t.replace('/*VER75_LOCAL*/[]', '/*VER75_LOCAL*/' + json.dumps(local_ids), 1)
def oldver(vid, s, label):   # = mkitch816.oldver
    t = rd(s)
    m = '<meta charset="utf-8">'; i = t.find(m); assert i >= 0, s
    t = t[:i + len(m)] + '\n' + shim(vid) + t[i + len(m):]
    j = t.rfind('</body>')
    return (t[:j] + back(label) + t[j:]) if j >= 0 else t + back(label)
# T134 PWA head block, exactly as on the live page, after the first viewport meta
a = live.index('<!-- T134 PWA'); b = live.index('</script>', a) + len('</script>')
PWA = live[a:b]; VP = 'viewport-fit=cover">\n'
assert live[:a].endswith(VP)
def pwa(t):
    i = t.index(VP) + len(VP); assert i < 200000
    return t[:i] + PWA + '\n' + t[i:]
def split(t):   # = tools106/mkpreview.py split (dict_<code>_1107.js -> l106/dicts.js)
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
CF = D + 'cf819/'
if os.path.exists(CF): shutil.rmtree(CF)
idx_html, dicts, nd = split(pwa(page(ALL)))
w(CF + 'index.html', idx_html); w(CF + 'l106/dicts.js', dicts)
shutil.copytree(LIVE + 'versions', CF + 'versions')
w(CF + 'versions/v8_16.html', oldver('v8_16', D + 'itch816/index.html', 'v8.16'))
shutil.copytree(LIVE + 'icons', CF + 'icons')
for f in ('manifest.webmanifest', 'sw.js'): shutil.copy2(LIVE + f, CF + f)
shutil.copytree(LIVE + 'assets3d', CF + 'assets3d')
add = [f for f in os.listdir(D + 'assets3d') if f.startswith('hs_') and f not in os.listdir(CF + 'assets3d')]
for f in add: shutil.copy2(D + 'assets3d/' + f, CF + 'assets3d/' + f)
tp = [f for f in os.listdir(PREV) if re.match(r't(94|120)_', f)]
assert len(tp) == 33, len(tp)
for f in tp: shutil.copy2(PREV + f, CF + 'assets3d/' + f)
for f in os.listdir(LIVE + 'assets3d'): assert md5(LIVE + 'assets3d/' + f) == md5(CF + 'assets3d/' + f)
hd = rd(LIVE + '_headers').rstrip('\n') + '\n/version.json\n  Cache-Control: no-cache\n'
w(CF + '_headers', hd)
commit = git('rev-parse', '--short', 'HEAD'); now = datetime.datetime.now()
info = {'id': f'main · {commit} · {now:%d.%m %H:%M}', 'ver': '8.19', 'branch': 'main', 'commit': commit, 'subject': git('log', '-1', '--format=%s'),
        'built': now.isoformat(timespec='seconds'), 'src': SRC, 'sha256': hashlib.sha256(rb).hexdigest(), 'bytes': len(rb)}
w(CF + 'version.json', json.dumps(info, ensure_ascii=False, indent=1))
for r_, _, fs in os.walk(CF):
    for f in fs: assert os.path.getsize(os.path.join(r_, f)) < LIMIT, 'Cloudflare Pages: file over 25 MiB: ' + f
cf = sum(os.path.getsize(os.path.join(r, f)) for r, _, fs in os.walk(CF) for f in fs)
print('cloudflare site:', sum(len(fs) for _, _, fs in os.walk(CF)), 'files', round(cf / 1e6, 2), 'MB; index', round(os.path.getsize(CF + 'index.html') / 1e6, 2),
      'MB; dicts', nd, round(os.path.getsize(CF + 'l106/dicts.js') / 1e6, 2), 'MB; +hs', len(add), '+t94/t120', len(tp), '; versions:', ALL)
IT = D + 'itch819/'
if os.path.exists(IT): shutil.rmtree(IT)
w(IT + 'index.html', page([]))
z = D + 'portal_meteor_v8_19_itch.zip'
if os.path.exists(z): os.remove(z)
with zipfile.ZipFile(z, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as Z: Z.write(IT + 'index.html', 'index.html')
print('itch index.html', round(os.path.getsize(IT + 'index.html') / 1e6, 2), 'MB; zip', round(os.path.getsize(z) / 1e6, 2), 'MB ->', z)
print(json.dumps(info, ensure_ascii=False))
