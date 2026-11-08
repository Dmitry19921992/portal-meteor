# T106: test build for the phone link (Cloudflare Pages PREVIEW branch, not the live site, not itch).
#   python tools106/mkpreview.py <game.html> [--out D:/AI/pm_v6/dist/preview106] [--repo <git worktree of the build>] [--split]
# Makes a tiny static site:  index.html (the game + test-build id in PREV818.ID, noindex)
#                            version.json (id, version, commit, sha256 of the source html) - the game polls it
#                            _headers (no-cache for page/version.json, noindex), robots.txt (Disallow: /)
# If the html was built without v818_prev.js (an older test branch), the module is appended before </body>.
# 3D models keep loading from portal-meteor.pages.dev/assets3d (AS75_CDN), so only ~10 MB is uploaded.
import os, io, re, sys, json, hashlib, subprocess, shutil, datetime
HERE = os.path.dirname(os.path.abspath(__file__))
args = sys.argv[1:]
def opt(name, default):
    if name in args:
        i = args.index(name); v = args[i + 1]; del args[i:i + 2]; return v
    return default
OUT = opt('--out', 'D:/AI/pm_v6/dist/preview106').rstrip('/\\') + '/'
REPO = opt('--repo', os.path.dirname(HERE))
FORCE_SPLIT = '--split' in args; args = [a for a in args if a != '--split']
if not args: raise SystemExit('usage: mkpreview.py <game.html> [--out dir] [--repo dir]')
SRC = args[0]
def git(*a):
    try: return subprocess.check_output(['git', '-C', REPO] + list(a), stderr=subprocess.DEVNULL).decode('utf-8', 'replace').strip().lstrip('\ufeff')
    except Exception: return ''
rb = open(SRC, 'rb').read()
sha256 = hashlib.sha256(rb).hexdigest()   # = Get-FileHash in preview.ps1 -Auto
raw = rb.decode('utf-8-sig').replace('\r\n', '\n')
vers = re.findall(r"FX87\.VER = '([0-9.]+)'", raw)
ver = vers[-1] if vers else ''
branch = git('branch', '--show-current') or 'test'
commit = git('rev-parse', '--short', 'HEAD') or sha256[:7]
dirty = '+' if git('status', '--porcelain', '--untracked-files=no') else ''
now = datetime.datetime.now()
ID = f"{branch} · {commit}{dirty} · {now:%d.%m %H:%M}"
t = raw
PH = "/*PREV818_ID*/''"
if t.count(PH) == 1:
    t = t.replace(PH, '/*PREV818_ID*/' + json.dumps(ID, ensure_ascii=False), 1)
    how = 'module in build'
else:
    assert PH not in t, 'PREV818 placeholder found more than once'
    mod = io.open(os.path.join(os.path.dirname(HERE), 'v818_prev.js'), encoding='utf-8').read()
    assert mod.count(PH) == 1
    mod = mod.replace(PH, '/*PREV818_ID*/' + json.dumps(ID, ensure_ascii=False), 1)
    j = t.rfind('</body>'); assert j >= 0, 'no </body> in ' + SRC
    t = t[:j] + '<script>\n// ---- v818_prev.js (T106, appended by mkpreview.py)\n' + mod + '\n</script>\n' + t[j:]
    how = 'module appended'
LIMIT = 25 * 1024 * 1024   # Cloudflare Pages: max 25 MiB per file
SPLIT = 24 * 1024 * 1024   # above this: language dictionaries dict_<code>_1107.js go to l106/dicts.js
extra = {}
if len(t.encode('utf-8')) > SPLIT or FORCE_SPLIT:
    # Segments '// ---- dict_xx_1107.js' (not dict_fill / dict_fix) are contiguous in the one game <script>.
    # They only declare their own const and fill the global V8X_DICT, so they are loaded at the same place
    # by a synchronous request + indirect eval (keeps hoisting of the main script intact; error = game without them).
    segs = [m_.start() for m_ in re.finditer(r'\n// ---- [^\n]+\n', t)]
    names = [t[s + 9:t.index('\n', s + 1)] for s in segs]
    idx = [k for k, n in enumerate(names) if re.fullmatch(r'dict_[A-Za-z-]+_1107\.js', n) and n not in ('dict_fill_1107.js', 'dict_fix_1107.js')]
    assert idx and idx == list(range(idx[0], idx[-1] + 1)) and idx[-1] + 1 < len(segs), 'dict segments not found / not contiguous'
    a, b = segs[idx[0]], segs[idx[-1] + 1]
    extra['l106/dicts.js'] = t[a:b]
    loader = ("\n// ---- dict_*_1107.js -> l106/dicts.js (T106 mkpreview, file limit of Cloudflare Pages)\n"
              "(function(){ try { const x = new XMLHttpRequest(); x.open('GET', 'l106/dicts.js', false); x.send();"
              " if (x.status === 200 || (x.status === 0 && x.responseText)) (0, eval)(x.responseText); else console.warn('T106 dicts', x.status); }"
              " catch (e){ console.warn('T106 dicts', e); } })();")
    t = t[:a] + loader + t[b:]
    how += f', {len(idx)} dictionaries -> l106/dicts.js ({len(extra["l106/dicts.js"].encode("utf-8")) / 1e6:.1f} MB)'
m = '<meta charset="utf-8">'; i = t.find(m)
if i >= 0: t = t[:i + len(m)] + '\n<meta name="robots" content="noindex,nofollow">' + t[i + len(m):]
def w(p, s):
    os.makedirs(os.path.dirname(p), exist_ok=True); io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
if os.path.exists(OUT): shutil.rmtree(OUT)   # only our own generated folder (dist/preview106 by default)
w(OUT + 'index.html', t)
info = {'id': ID, 'ver': ver, 'branch': branch, 'commit': commit + dirty, 'subject': git('log', '-1', '--format=%s'),
        'built': now.isoformat(timespec='seconds'), 'src': os.path.abspath(SRC), 'sha256': sha256, 'bytes': len(t.encode('utf-8'))}
w(OUT + 'version.json', json.dumps(info, ensure_ascii=False, indent=1))
w(OUT + '_headers', '/*\n  X-Robots-Tag: noindex, nofollow\n  Cache-Control: no-cache\n')
w(OUT + 'robots.txt', 'User-agent: *\nDisallow: /\n')
for p, s in extra.items(): w(OUT + p, s)
for r_, _, fs in os.walk(OUT):
    for f in fs: assert os.path.getsize(os.path.join(r_, f)) < LIMIT, 'Cloudflare Pages: file over 25 MiB: ' + f
mb = info['bytes'] / 1e6
print(json.dumps({'out': OUT, 'id': ID, 'ver': ver, 'mb': round(mb, 2), 'how': how, 'sha256': sha256[:12]}, ensure_ascii=False))
