# v7.9 release packaging (branch v79, worktree wt79) — same layout as mkitch77.py:
#   dist/cf79/     — Cloudflare Pages site (portal-meteor.pages.dev): index.html (v7.8, all versions local),
#                    versions/<id>.html (v7.7 = its itch build + v7.6 + v7.5 + every historical version), assets3d/*.js, _headers
#   dist/itch79/   — itch build: index.html only (old versions + 3D models load from Cloudflare)
#   dist/portal_meteor_v7_9_itch.zip — uploaded to itch with butler
import os, io, zipfile, shutil, json
D = 'D:/AI/pm_v6/dist/'
SRC = D + 'v79.html'
exec(open('D:/AI/pm_v6/tools/mkitch75r.py', encoding='utf-8').read().split('def main():')[0])   # VERS, shim(), back()
G0 = 'C:/Users/klaas/OneDrive/Рабочий стол/portal meteor/game/'
def find(src):
    if os.path.exists(src): return src
    for d in (G0, G0 + 'old/', G0 + 'не_сыгранные/'):
        if os.path.exists(d + os.path.basename(src)): return d + os.path.basename(src)
    raise SystemExit('missing ' + src)
VERS = [('v7_8_1', D + 'itch781/index.html', 'v7.8.1'), ('v7_8', D + 'itch78/index.html', 'v7.8'), ('v7_7', D + 'itch77/index.html', 'v7.7'), ('v7_6', D + 'itch76/index.html', 'v7.6'), ('v7_5', D + 'itch75f/index.html', 'v7.5')] + [(v, find(s), l) for v, s, l in VERS]
ALL = [v[0] for v in VERS]
def page(local_ids):
    t = io.open(SRC, encoding='utf-8').read()
    assert '/*VER75_ARCHIVE*/false' in t and '/*VER75_LOCAL*/[]' in t
    t = t.replace('/*VER75_ARCHIVE*/false', '/*VER75_ARCHIVE*/true', 1)
    return t.replace('/*VER75_LOCAL*/[]', '/*VER75_LOCAL*/' + json.dumps(local_ids), 1)
def oldver(vid, src, label):
    t = io.open(src, encoding='utf-8').read()
    m = '<meta charset="utf-8">'; i = t.find(m); assert i >= 0, src
    t = t[:i + len(m)] + '\n' + shim(vid) + t[i + len(m):]
    j = t.rfind('</body>')
    return (t[:j] + back(label) + t[j:]) if j >= 0 else t + back(label)
def w(p, t): os.makedirs(os.path.dirname(p), exist_ok=True); io.open(p, 'w', encoding='utf-8', newline='\n').write(t)
CF = D + 'cf79/'
if os.path.exists(CF): shutil.rmtree(CF)
w(CF + 'index.html', page(ALL))
for vid, src, label in VERS: w(CF + 'versions/' + vid + '.html', oldver(vid, src, label))
shutil.copytree(D + 'assets3d', CF + 'assets3d')
w(CF + '_headers', '/*\n  Access-Control-Allow-Origin: *\n  Cross-Origin-Resource-Policy: cross-origin\n/assets3d/*\n  Cache-Control: public, max-age=86400\n')
cf = sum(os.path.getsize(os.path.join(r, f)) for r, _, fs in os.walk(CF) for f in fs)
print('cloudflare site:', sum(len(fs) for _, _, fs in os.walk(CF)), 'files', round(cf / 1e6, 2), 'MB; versions:', ALL)
IT = D + 'itch79/'
if os.path.exists(IT): shutil.rmtree(IT)
w(IT + 'index.html', page([]))
z = D + 'portal_meteor_v7_9_itch.zip'
if os.path.exists(z): os.remove(z)
with zipfile.ZipFile(z, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as Z: Z.write(IT + 'index.html', 'index.html')
print('itch index.html', round(os.path.getsize(IT + 'index.html') / 1e6, 2), 'MB; zip', round(os.path.getsize(z) / 1e6, 2), 'MB ->', z)


