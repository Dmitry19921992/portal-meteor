# Cloudflare Pages build for the LIVE game (project portal-meteor-live, production branch `release`).
#   Build command: python3 ci/cf_build.py      Output directory: site
# Does the same as the PC release flow (build.py -> mkitch78.py page([])): one index.html, VER75_ARCHIVE = true,
# VER75_LOCAL = [] -> old versions and 3D models load from the archive project https://portal-meteor.pages.dev/.
# Sources are copied to _b/src so build.py writes its dist/ inside the checkout (_b/dist), never outside.
# assets3d/*.glb are NOT used: the live game takes 3D models from portal-meteor.pages.dev/assets3d (AS75_CDN).
# Works the same on the PC, in a Claude cloud session and on the Cloudflare build server.
import os, sys, shutil, subprocess, io
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
B, SITE = os.path.join(ROOT, '_b'), os.path.join(ROOT, 'site')
SKIP = {'.git', '_b', 'site', 'dist', 'assets3d', 'pc', 'ci', 'itch_loader', 'node_modules', '__pycache__'}
for d in (B, SITE):
    if os.path.exists(d): shutil.rmtree(d)
src = os.path.join(B, 'src'); os.makedirs(src)
for n in os.listdir(ROOT):
    if n in SKIP or n.startswith(('chrome_', 'tests', 'tools')): continue
    p = os.path.join(ROOT, n)
    (shutil.copytree if os.path.isdir(p) else shutil.copy2)(p, os.path.join(src, n))
env = dict(os.environ, TZ=os.environ.get('PM_TZ', 'Asia/Bangkok'))   # BUILD_DATE in Dmitry's time zone (PC = UTC+7)
subprocess.check_call([sys.executable, os.path.join(src, 'build.py'), 'live.html'], env=env)
t = io.open(os.path.join(B, 'dist', 'live.html'), encoding='utf-8').read()
assert '/*VER75_ARCHIVE*/false' in t and '/*VER75_LOCAL*/[]' in t, 'version-archive markers missing in head.html'
t = t.replace('/*VER75_ARCHIVE*/false', '/*VER75_ARCHIVE*/true', 1)
os.makedirs(SITE)
io.open(os.path.join(SITE, 'index.html'), 'w', encoding='utf-8', newline='\n').write(t)
io.open(os.path.join(SITE, '_headers'), 'w', encoding='utf-8', newline='\n').write(
    '/*\n  Access-Control-Allow-Origin: *\n  Cross-Origin-Resource-Policy: cross-origin\n  Cache-Control: public, max-age=0, must-revalidate\n')
shutil.rmtree(B)
print('site/index.html', round(len(t.encode('utf-8')) / 1e6, 2), 'MB')
