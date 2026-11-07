# T168: before/after card for Fitba (check/t168_*): same frame, GND168 off (top) / on (bottom)
# python card168.py <view> [--up "<name>"]     view: bunker | hull | bay | wide | fps   (PC shots from out_pc/)
import io, sys, json, time, urllib.request, urllib.parse
from PIL import Image, ImageDraw, ImageFont
T = r'D:\AI\pm_v6\wt_t168\tests168'
F = lambda s, bold=False: ImageFont.truetype(r'C:\Windows\Fonts\segoeuib.ttf' if bold else r'C:\Windows\Fonts\segoeui.ttf', s)
view = sys.argv[1] if len(sys.argv) > 1 else 'bunker'
src = 'out_phone' if view.startswith('ph_') else 'out_pc'
v = view[3:] if view.startswith('ph_') else view
def crop(p):
    im = Image.open(p).convert('RGB'); w, h = im.size
    if src == 'out_phone': return im
    cw, ch = int(w * 0.62), int(h * 0.56)               # middle of the frame, where the models are
    x0, y0 = (w - cw) // 2, int(h * 0.12)
    return im.crop((x0, y0, x0 + cw, y0 + ch))
A = crop(rf'{T}\{src}\{v}_off.png'); B = crop(rf'{T}\{src}\{v}_on.png')
W, H = A.size; pad = 54
out = Image.new('RGB', (W, H * 2 + pad * 2 + 16), (14, 18, 30)); d = ImageDraw.Draw(out)
fs = 30 if W > 900 else 18
d.text((14, 8), 'ДО — v8.18: постройка «висит» над грунтом, тени нет', font=F(fs, True), fill=(255, 150, 120))
out.paste(A, (0, pad))
d.text((14, H + pad + 14), 'ПОСЛЕ — T168: тень по рельефу + тёмное основание (?gnd168=0 — выкл.)', font=F(fs, True), fill=(120, 230, 160))
out.paste(B, (0, H + pad * 2 + 16))
out.thumbnail((1200, 1500))
out.save(rf'{T}\card_t168_{view}.png')
if '--up' in sys.argv:
    key = [l.split('=', 1)[1].strip() for l in open(r'D:\AI\pm_rate\secret.txt') if l.startswith('API_KEY=')][0]
    q = 85
    while True:
        bo = io.BytesIO(); out.save(bo, 'WEBP', quality=q); data = bo.getvalue()
        if len(data) <= 145000 or q < 30: break
        q -= 10
    name = sys.argv[sys.argv.index('--up') + 1]
    qs = urllib.parse.urlencode({'id': 'check/t168_' + view, 'cat': 'check', 'kind': '2d', 'name': name, 'created': int(time.time() * 1000)})
    r = urllib.request.Request('https://pm-rate.pm-gford3.workers.dev/api/upload?' + qs, data=data, headers={'X-PM-Key': key, 'Content-Type': 'image/webp', 'User-Agent': 'pm-rate-sync/1.0'}, method='POST')
    print(len(data), urllib.request.urlopen(r).read().decode())
print('ok', out.size)
