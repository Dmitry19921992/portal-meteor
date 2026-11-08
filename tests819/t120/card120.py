# T120/T94 -> Fitba: vertical before/after cards (3:4, phone rule 07.11) from <view>_off.png / <view>_on.png of the SAME camera,
#   plus one text card check/t120_summary.   python card120.py <out_dir> [--dry] [--only id1,id2]
# Each half 3:2 (760x507): top = BEFORE (procedural model, modules off), bottom = AFTER (Tripo model in the game).
import sys, io, os, time, json, urllib.request, urllib.parse
from PIL import Image, ImageDraw, ImageFont
OUT = sys.argv[1]; DRY = '--dry' in sys.argv
ONLY = sys.argv[sys.argv.index('--only') + 1].split(',') if '--only' in sys.argv else None
W, HH = 760, 507
F = ImageFont.truetype(r'C:\Windows\Fonts\segoeuib.ttf', 30); F2 = ImageFont.truetype(r'C:\Windows\Fonts\segoeui.ttf', 26); FB = ImageFont.truetype(r'C:\Windows\Fonts\segoeuib.ttf', 34)
CARDS = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'cards120.json'), encoding='utf-8'))
def half(p, label, col, cx, cy, zoom):
    im = Image.open(p).convert('RGB'); w, h = im.size
    cw = min(w, h * 1.5) / zoom; ch = cw / 1.5
    x0 = min(max(cx * w - cw / 2, 0), w - cw); y0 = min(max(cy * h - ch / 2, 0), h - ch)
    im = im.crop((int(x0), int(y0), int(x0 + cw), int(y0 + ch))).resize((W, HH), Image.LANCZOS)
    d = ImageDraw.Draw(im); tw = d.textlength(label, font=F)
    d.rectangle((10, 10, 30 + tw, 56), fill=(10, 12, 20)); d.text((20, 12), label, font=F, fill=col)
    return im
key = [l.split('=', 1)[1].strip() for l in open(r'D:\AI\pm_rate\secret.txt') if l.startswith('API_KEY=')][0]
def upload(img, cid, name):
    q = 85
    while True:
        bo = io.BytesIO(); img.save(bo, 'WEBP', quality=q); data = bo.getvalue()
        if len(data) <= 300000 or q < 40: break
        q -= 10
    if DRY: print('dry', cid, len(data)); return
    qs = urllib.parse.urlencode({'id': 'check/' + cid, 'cat': 'check', 'kind': '2d', 'name': name, 'created': int(time.time() * 1000)})
    r = urllib.request.Request('https://pm-rate.pm-gford3.workers.dev/api/upload?' + qs, data=data,
        headers={'X-PM-Key': key, 'Content-Type': 'image/webp', 'User-Agent': 'pm-rate-sync/1.0'}, method='POST')
    for k in range(3):
        try: print(cid, len(data), urllib.request.urlopen(r, timeout=60).read().decode()[:200]); return
        except Exception as e: print('retry', cid, e); time.sleep(3)
for c in CARDS['ba']:
    if ONLY and c['id'] not in ONLY: continue
    b, a = os.path.join(OUT, c['view'] + '_off.png'), os.path.join(OUT, c['view'] + '_on.png')
    if not (os.path.exists(b) and os.path.exists(a)): print('skip', c['id'], 'no shots'); continue
    cx, cy, z = c.get('crop', [0.5, 0.5, 1.0])
    card = Image.new('RGB', (W, HH * 2 + 6), (255, 255, 255))
    card.paste(half(b, 'ДО: процедурная модель', (255, 190, 120), cx, cy, z), (0, 0))
    card.paste(half(a, 'ПОСЛЕ: модель Tripo', (120, 230, 255), cx, cy, z), (0, HH + 6))
    card.save(os.path.join(OUT, 'card_' + c['id'] + '.jpg'), quality=88)
    upload(card, c['id'], c['name'])
s = CARDS.get('summary')
if s and (not ONLY or s['id'] in ONLY):
    img = Image.new('RGB', (W, 1014), (14, 17, 26)); d = ImageDraw.Draw(img); y = 24
    for ln in s['lines']:
        f = FB if ln.startswith('#') else F2; t = ln.lstrip('# ')
        words, cur = t.split(' '), ''
        for wd in words:
            if d.textlength(cur + ' ' + wd, font=f) > W - 48 and cur: d.text((24, y), cur, font=f, fill=(230, 236, 245) if f is F2 else (120, 230, 255)); y += 34 if f is F2 else 44; cur = wd
            else: cur = (cur + ' ' + wd).strip()
        d.text((24, y), cur, font=f, fill=(230, 236, 245) if f is F2 else (120, 230, 255)); y += 34 if f is F2 else 44
        if not ln: y += 4
    img.save(os.path.join(OUT, 'card_' + s['id'] + '.jpg'), quality=90)
    upload(img, s['id'], s['name'])
