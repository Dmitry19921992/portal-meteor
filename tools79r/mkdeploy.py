# Deploy folder for Cloudflare Pages project portal-meteor, branch "radio" (alias radio.portal-meteor.pages.dev).
# Production (/) is NOT touched: branch deployments live next to production; future production deploys do not remove them.
import os, json, shutil, html
R = 'D:/AI/pm_radio/'
O = R + 'deploy/'
os.makedirs(O + 'radio', exist_ok=True)
for f in os.listdir(R + 'radio'):
    s, d = R + 'radio/' + f, O + 'radio/' + f
    if not os.path.exists(d) or os.path.getsize(d) != os.path.getsize(s): shutil.copyfile(s, d)
open(O + '_headers', 'w', newline='\n').write('''/*
  Access-Control-Allow-Origin: *
  Cross-Origin-Resource-Policy: cross-origin
/radio/*.ogg
  Content-Type: audio/ogg
  Cache-Control: public, max-age=604800
/radio/*.m4a
  Content-Type: audio/mp4
  Cache-Control: public, max-age=604800
/radio/playlist.json
  Cache-Control: public, max-age=600
''')
pl = json.load(open(R + 'radio/playlist.json', encoding='utf-8'))
rows = ''.join(f'<li><span>{i + 1:02d}</span> {html.escape(t["t"])} <em>{int(t["d"] // 60)}:{int(t["d"] % 60):02d}</em> <audio preload="none" controls><source src="radio/{t["s"]}.ogg" type="audio/ogg; codecs=opus"><source src="radio/{t["s"]}.m4a" type="audio/mp4"></audio></li>' for i, t in enumerate(pl['tracks']))
page = f'''<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Радио Portal Meteor — EDMITRY</title>
<style>:root{{--bg:#07090c;--fg:#e8dcb8;--ac:#ffb070;--mu:#8f8a78}}body{{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,sans-serif;padding:16px}}h1{{font-size:20px;letter-spacing:.12em;margin:0 0 4px}}a{{color:#1ed760}}ol{{list-style:none;padding:0;max-width:760px}}li{{display:flex;flex-wrap:wrap;gap:8px;align-items:center;border-bottom:1px solid #222;padding:6px 0}}li span{{color:var(--mu);font-variant-numeric:tabular-nums}}li em{{color:var(--ac);font-style:normal;font-size:12px}}audio{{height:28px;max-width:100%}}</style></head>
<body><h1>📻 РАДИО PORTAL METEOR</h1><p>Вся музыка — <b>EDMITRY</b>. <a href="{pl["spotify"]}" target="_blank" rel="noopener">Слушать в Spotify</a> · <a href="https://portal-meteor.pages.dev/">Играть в Portal Meteor</a></p><ol>{rows}</ol></body></html>'''
open(O + 'index.html', 'w', encoding='utf-8', newline='\n').write(page)
n = sum(len(fs) for _, _, fs in os.walk(O)); b = sum(os.path.getsize(os.path.join(r, f)) for r, _, fs in os.walk(O) for f in fs)
print('deploy folder', O, n, 'files', round(b / 1e6, 1), 'MB')
