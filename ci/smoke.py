# Headless smoke test (Playwright + Chromium) — runs in a Claude cloud session or on the PC.
#   python3 ci/smoke.py                      -> builds site/ (ci/cf_build.py), serves it on 127.0.0.1:8899, tests it
#   python3 ci/smoke.py https://portal-meteor-live.pages.dev/   -> tests the live deploy
#   add --phone for a phone viewport (touch, landscape 844x390), --match to also start a match for ~20 s
# Prints JSON; exit code 1 on page errors / missing version label / boot timeout.
import sys, os, json, time, threading, subprocess, functools, http.server
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
args = [a for a in sys.argv[1:] if not a.startswith('--')]
phone, match = '--phone' in sys.argv, '--match' in sys.argv
url = args[0] if args else None
if not url:
    subprocess.check_call([sys.executable, os.path.join(ROOT, 'ci', 'cf_build.py')])
    h = functools.partial(http.server.SimpleHTTPRequestHandler, directory=os.path.join(ROOT, 'site'))
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8899), h); threading.Thread(target=srv.serve_forever, daemon=True).start()
    url = 'http://127.0.0.1:8899/index.html'
R = {'url': url, 'errors': [], 'req3d': 0, 'stats_posts': 0}
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'])
    ctx = b.new_context(viewport={'width': 844, 'height': 390} if phone else {'width': 1280, 'height': 720},
                        is_mobile=phone, has_touch=phone, device_scale_factor=2 if phone else 1)
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: R['errors'].append('EXC ' + str(e)[:300]))
    pg.on('console', lambda m: m.type == 'error' and R['errors'].append('console ' + m.text[:300]))
    def onreq(r):
        if '/assets3d/' in r.url: R['req3d'] += 1
        if 'pm-stats' in r.url and r.method == 'POST': R['stats_posts'] += 1
    pg.on('request', onreq)
    t0 = time.time(); pg.goto(url, wait_until='load', timeout=180000)
    try:
        pg.wait_for_function("() => { const b = document.getElementById('boot'); return b && b.classList.contains('done'); }", timeout=240000)
        R['boot_s'] = round(time.time() - t0, 1)
    except Exception as e:
        R['boot_s'] = None; R['errors'].append('boot timeout')
    pg.wait_for_timeout(3000)
    R['info'] = pg.evaluate("""() => { const o = {};
      try { o.title = document.title; } catch (e){}
      try { o.build = typeof BUILD_DATE !== 'undefined' ? BUILD_DATE : null; } catch (e){}
      try { o.ver = (document.getElementById('screen').innerHTML.match(/v7\\.\\d+(\\.\\d+)? · [^<]{0,30}/) || [null])[0]; } catch (e){}
      try { o.archive = VER75.archive; o.verCur = VER75.cur; o.remote = VER75_REMOTE; } catch (e){}
      try { o.allow3d = JSON.parse(document.getElementById('as75allow').textContent).allow.length; o.as75 = AS75.info(); } catch (e){ o.as75err = String(e); }
      try { o.statsEndpoint = STATS75.endpoint(); o.statsQ = STATS75.q.length; } catch (e){}
      try { o.lang = SET.lang; o.touch = TOUCH.on; } catch (e){}
      return o; }""")
    if match:
        pg.evaluate("() => { MENU.newGame(false); setTimeout(() => { if (MENU.cur) MENU.close(); if (typeof TUT !== 'undefined' && TUT.on && TUT.finish) TUT.finish(); }, 800); }")
        pg.wait_for_timeout(20000)
        R['match'] = pg.evaluate("() => { try { return { mode: S.mode, units: S.units.length, as75: AS75.info() }; } catch (e){ return String(e); } }")
    pg.screenshot(path=os.path.join(ROOT, 'smoke_' + ('ph' if phone else 'pc') + '.png'))
    b.close()
print(json.dumps(R, ensure_ascii=False, indent=1))
sys.exit(1 if (R['errors'] or not R['info'].get('ver') or not R.get('boot_s')) else 0)
