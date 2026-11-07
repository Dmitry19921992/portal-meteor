# T131: карточки до/после для Фитбы (check/t131_*) — одна картинка = один вид
import io, sys, time, urllib.request, urllib.parse
from PIL import Image, ImageDraw, ImageFont
T = r'D:\AI\pm_v6\wt_t131\tests131\shots'
F = lambda s, bold=False: ImageFont.truetype(r'C:\Windows\Fonts\segoeuib.ttf' if bold else r'C:\Windows\Fonts\segoeui.ttf', s)

def pair(before, after, box, label, outname, upload_name):
    A = Image.open(T + '\\' + before).convert('RGB').crop(box)
    B = Image.open(T + '\\' + after).convert('RGB').crop(box)
    W, H = A.size; pad = 64
    out = Image.new('RGB', (W, H * 2 + pad * 2 + 16), (14, 18, 30)); d = ImageDraw.Draw(out)
    d.text((16, 12), label + ' — ДО (v8.18)', font=F(30, True), fill=(255, 150, 120))
    out.paste(A, (0, pad))
    d.text((16, H + pad + 18), label + ' — ПОСЛЕ (T131)', font=F(30, True), fill=(120, 230, 160))
    out.paste(B, (0, H + pad * 2 + 16))
    out.thumbnail((1100, 1500))
    out.save(T + '\\..\\' + outname)
    key = [l.split('=', 1)[1].strip() for l in open(r'D:\AI\pm_rate\secret.txt') if l.startswith('API_KEY=')][0]
    q = 85
    while True:
        bo = io.BytesIO(); out.save(bo, 'WEBP', quality=q); data = bo.getvalue()
        if len(data) <= 145000 or q < 30: break
        q -= 10
    qs = urllib.parse.urlencode({'id': 'check/t131_' + upload_name, 'cat': 'check', 'kind': '2d', 'name': upload_name.replace('_', ' '), 'created': int(time.time() * 1000)})
    r = urllib.request.Request('https://pm-rate.pm-gford3.workers.dev/api/upload?' + qs, data=data, headers={'X-PM-Key': key, 'Content-Type': 'image/webp', 'User-Agent': 'pm-rate-sync/1.0'}, method='POST')
    print(outname, len(data), urllib.request.urlopen(r).read().decode())

# площадка точки захвата у земли (самый заметный случай)
pair('t131_before_groundlvl.png', 't131_after_groundlvl.png', (250, 550, 950, 1050),
     'Плиты точки захвата', 'card_t131_cppad.png', 'cppad')
# площадка базы у зданий
pair('t131_before_padlow.png', 't131_after_padlow.png', (100, 620, 900, 1060),
     'Бетон у базы', 'card_t131_base.png', 'base')
print('ok')
