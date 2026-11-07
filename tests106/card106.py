# T106: Fitba card (check/prev106_local) - phone 844x390 shots of the packed preview site, before the first deploy
import io, sys, time, urllib.request, urllib.parse
from PIL import Image, ImageDraw, ImageFont
T = r'D:\AI\pm_v6\wt_t106\tests106\out_v818c'
F = lambda s, b=False: ImageFont.truetype(r'C:\Windows\Fonts\segoeuib.ttf' if b else r'C:\Windows\Fonts\segoeui.ttf', s)
shots = [('phone_03_battle', 'Телефон 844×390, бой: плашка «TEST» в углу, HUD не закрыт'),
         ('phone_04_new_build', 'Вышла новая тестовая сборка → «обновить» (тап)'),
         ('phone_02_badge_open', 'Тап по плашке — подробности сборки')]
W = 720; pad = 24
ims = []
for n, cap in shots:
    im = Image.open(T + '/' + n + '.png').convert('RGB'); im = im.resize((W - 2 * pad, int(im.height * (W - 2 * pad) / im.width))); ims.append((im, cap))
head = ['Тест-сборка с телефона (T106)', 'Ссылка будет одна и та же: test.portal-meteor.pages.dev', 'Пока НЕ выложено (ждёт ревью). Не боевой сайт, не itch.']
H = 150 + sum(i.height + 50 for i, _ in ims) + pad
out = Image.new('RGB', (W, H), (14, 18, 30)); d = ImageDraw.Draw(out)
d.text((pad, 14), head[0], font=F(38, True), fill=(120, 220, 255))
d.text((pad, 66), head[1], font=F(24, True), fill=(255, 210, 120))
d.text((pad, 100), head[2], font=F(22), fill=(230, 232, 240))
y = 150
for im, cap in ims:
    d.text((pad, y), cap, font=F(22), fill=(230, 232, 240)); y += 34
    out.paste(im, (pad, y)); y += im.height + 16
out.save(T + r'\card106.png')
key = [l.split('=', 1)[1].strip() for l in open(r'D:\AI\pm_rate\secret.txt') if l.startswith('API_KEY=')][0]
q = 85
while True:
    bo = io.BytesIO(); out.save(bo, 'WEBP', quality=q); data = bo.getvalue()
    if len(data) <= 145000 or q < 30: break
    q -= 10
qs = urllib.parse.urlencode({'id': 'check/prev106_local', 'cat': 'check', 'kind': '2d', 'name': 'T106 тест-сборка с телефона — как будет выглядеть (до выкладки)', 'created': int(time.time() * 1000)})
r = urllib.request.Request('https://pm-rate.pm-gford3.workers.dev/api/upload?' + qs, data=data, headers={'X-PM-Key': key, 'Content-Type': 'image/webp', 'User-Agent': 'pm-rate-sync/1.0'}, method='POST')
print(len(data), q, urllib.request.urlopen(r).read().decode())
