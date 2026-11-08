# test/v819-0811 -> Fitba: one vertical "before / after" card (3:4, phone rule 07.11) from two shots of the SAME camera.
#   card_ba.py <before.png> <after.png> <id without check/> "<name>" [cx cy zoom] [--dry]
#   cx, cy — centre of the crop in 0..1 of the frame (default 0.5 0.5); zoom — 1 = largest 3:2 crop, 2 = half of it
# Card: top half = BEFORE (v8.18, live test base), bottom half = AFTER (test v8.19), labels on the pictures.
import sys, io, time, urllib.request, urllib.parse
from PIL import Image, ImageDraw, ImageFont
a = [x for x in sys.argv[1:] if x != '--dry']; DRY = '--dry' in sys.argv
bp, ap, cid, name = a[0], a[1], a[2], a[3]
cx, cy, zoom = (float(a[4]), float(a[5]), float(a[6])) if len(a) >= 7 else (0.5, 0.5, 1.0)
W, HH = 760, 507   # each half 3:2 -> whole card 760 x 1014 (3:4)
F = ImageFont.truetype(r'C:\Windows\Fonts\segoeuib.ttf', 30)
def half(p, label, col):
    im = Image.open(p).convert('RGB'); w, h = im.size
    cw = min(w, h * 1.5) / zoom; ch = cw / 1.5
    x0 = min(max(cx * w - cw / 2, 0), w - cw); y0 = min(max(cy * h - ch / 2, 0), h - ch)
    im = im.crop((int(x0), int(y0), int(x0 + cw), int(y0 + ch))).resize((W, HH), Image.LANCZOS)
    d = ImageDraw.Draw(im); tw = d.textlength(label, font=F)
    d.rectangle((10, 10, 30 + tw, 56), fill=(10, 12, 20)); d.text((20, 12), label, font=F, fill=col)
    return im
card = Image.new('RGB', (W, HH * 2 + 6), (255, 255, 255))
card.paste(half(bp, 'ДО: v8.18', (255, 190, 120)), (0, 0))
card.paste(half(ap, 'ПОСЛЕ: тест v8.19', (120, 230, 255)), (0, HH + 6))
out = bp.rsplit('.', 1)[0] + '_card_' + cid.replace('/', '_') + '.jpg'
card.save(out, quality=88); print('card', out)
if DRY: sys.exit(0)
key = [l.split('=', 1)[1].strip() for l in open(r'D:\AI\pm_rate\secret.txt') if l.startswith('API_KEY=')][0]
q = 85
while True:
    bo = io.BytesIO(); card.save(bo, 'WEBP', quality=q); data = bo.getvalue()
    if len(data) <= 300000 or q < 40: break
    q -= 10
qs = urllib.parse.urlencode({'id': 'check/' + cid, 'cat': 'check', 'kind': '2d', 'name': name, 'created': int(time.time() * 1000)})
r = urllib.request.Request('https://pm-rate.pm-gford3.workers.dev/api/upload?' + qs, data=data,
    headers={'X-PM-Key': key, 'Content-Type': 'image/webp', 'User-Agent': 'pm-rate-sync/1.0'}, method='POST')
print(len(data), urllib.request.urlopen(r, timeout=60).read().decode()[:300])
