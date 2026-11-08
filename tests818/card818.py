# v8.18: before/after card for Fitba (check/v818_*): crops of the same kind of scene, v8.17 vs v8.18, labels with the render buffer
import io, sys, json, time, urllib.request, urllib.parse
from PIL import Image, ImageDraw, ImageFont
T = r'D:\AI\pm_v6\wt818\tests818'
a = json.load(open(T + r'\out_v817\result.json', encoding='utf-8-sig'))
b = json.load(open(T + r'\out_v818\result.json', encoding='utf-8-sig'))
F = lambda s, bold=False: ImageFont.truetype(r'C:\Windows\Fonts\segoeuib.ttf' if bold else r'C:\Windows\Fonts\segoeui.ttf', s)
def crop(p):
    im = Image.open(p).convert('RGB'); w, h = im.size
    cw, ch = w // 2, h // 2
    return im.crop(((w - cw) // 2, (h - ch) // 2 - h // 10, (w + cw) // 2, (h + ch) // 2 - h // 10))
shots = sys.argv[1] if len(sys.argv) > 1 else '02_battle'
A = crop(T + rf'\out_v817\{shots}.png'); B = crop(T + rf'\out_v818\{shots}.png')
W = A.width; H = A.height; pad = 60
out = Image.new('RGB', (W, H * 2 + pad * 2 + 20), (14, 18, 30)); d = ImageDraw.Draw(out)
ga, gb = a.get('battle45') or {}, b.get('battle45') or {}
d.text((16, 10), f"?? ? v8.17 ? ????? {ga.get('cw')}?{ga.get('ch')} (??????? {ga.get('scale')}) ??? ???? {ga.get('iw')}?{ga.get('ih')}", font=F(30, True), fill=(255, 150, 120))
out.paste(A, (0, pad))
d.text((16, H + pad + 18), f"????? ? v8.18 ? ????? {gb.get('cw')}?{gb.get('ch')} (??????? {gb.get('scale')}) ??? ???? {gb.get('iw')}?{gb.get('ih')}", font=F(30, True), fill=(120, 230, 160))
out.paste(B, (0, H + pad * 2 + 20))
out.thumbnail((1280, 1600))
out.save(T + rf'\card_{shots}.png')
if '--up' in sys.argv:
    key = [l.split('=', 1)[1].strip() for l in open(r'D:\AI\pm_rate\secret.txt') if l.startswith('API_KEY=')][0]
    q = 85
    while True:
        bo = io.BytesIO(); out.save(bo, 'WEBP', quality=q); data = bo.getvalue()
        if len(data) <= 145000 or q < 30: break
        q -= 10
    name = sys.argv[sys.argv.index('--up') + 1]
    qs = urllib.parse.urlencode({'id': 'check/v818_' + shots, 'cat': 'check', 'kind': '2d', 'name': name, 'created': int(time.time() * 1000)})
    r = urllib.request.Request('https://pm-rate.pm-gford3.workers.dev/api/upload?' + qs, data=data, headers={'X-PM-Key': key, 'Content-Type': 'image/webp', 'User-Agent': 'pm-rate-sync/1.0'}, method='POST')
    print(len(data), urllib.request.urlopen(r).read().decode())
print('ok', out.size)

