# v8.20 + VR (task/vr-main-proto merged into main) - Cloudflare production packaging. NEVER itch.
# Runs the release packer mkitch820.py of this repo unchanged in logic (PWA + iOS tags, versions/, assets3d, dictionary split),
# with only: the game page from dist/v820vr.html, output dist/cf820vr/, no itch part, version.json id + ' · VR'.
#   python tools_vrmain/mkcf820vr.py   (from the repo root or anywhere)
import os, io
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = io.open(os.path.join(REPO, 'mkitch820.py'), encoding='utf-8').read()
def sub(a, b):
    global src
    assert src.count(a) == 1, 'mkitch820.py changed: ' + a
    src = src.replace(a, b)
sub("SRC = D + 'v820.html'", "SRC = D + 'v820vr.html'")
sub("CF = D + 'cf820/'", "CF = D + 'cf820vr/'")
sub("REPO = os.path.dirname(os.path.abspath(__file__))", "REPO = " + repr(REPO))
sub("info = {'id': f'main · {commit} · 8.20 · {BD}'", "info = {'id': f'main · {commit} · 8.20 · {BD} · VR'")
src = src[:src.index("IT = D + 'itch820/'")] + "print(json.dumps(info, ensure_ascii=False))\n"
src = src.replace("assert \"FX87.VER = '8.20'\" in src", "assert '// ---- v820_xr.js' in src and '// ---- v820_quest.js' in src, 'not the VR build'\nassert \"FX87.VER = '8.20'\" in src", 1)
exec(compile(src, 'mkitch820.py(vr)', 'exec'), {'__file__': os.path.join(REPO, 'mkitch820.py'), '__name__': '__main__'})
