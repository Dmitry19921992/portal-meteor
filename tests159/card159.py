# T159: before/after card for Fitba (check/t159_music) + two sound items (kind sfx) so Dmitry can rate the music itself.
#   python card159.py            -> tests159/card_t159.png (+ webp)
#   python card159.py --up       -> upload card + fitba_demo.mp3 + fitba_menu.mp3 (if present in D:\AI\pm_mus159\out)
import io, os, sys, json, time, urllib.request, urllib.parse
from PIL import Image, ImageDraw, ImageFont
T = os.path.dirname(os.path.abspath(__file__)); O = os.path.join(T, 'out')
F = lambda s, bold=False: ImageFont.truetype(r'C:\Windows\Fonts\segoeuib.ttf' if bold else r'C:\Windows\Fonts\segoeui.ttf', s)
pc = json.load(open(os.path.join(O, 'smoke_pc.json'), encoding='utf-8'))
off = json.load(open(os.path.join(O, 'smoke_off.json'), encoding='utf-8'))
W = 1280; pad = 18
def shot(name, w):
    im = Image.open(os.path.join(O, name)).convert('RGB'); im.thumbnail((w, 2000)); return im
card = Image.new('RGB', (W, 1500), (14, 18, 30)); d = ImageDraw.Draw(card)
d.text((pad, 10), 'T159 · Музыка меню и боя — EDMITRY (своя музыка Дмитрия)', font=F(34, True), fill=(255, 214, 120))
d.text((pad, 56), 'v8.18 → тест v8.19 · ветка task/T159-adaptive-music · выключить: ?mus159=0 или ползунок «Музыка игры» = 0', font=F(21), fill=(190, 200, 220))
y = 96; cw = (W - pad * 3) // 2
A = shot('menu_off.png', cw); B = shot('menu_pc.png', cw)
d.text((pad, y), 'ДО (v8.18): меню и бой без музыки', font=F(22, True), fill=(255, 150, 120))
d.text((pad * 2 + cw, y), 'ПОСЛЕ: меню «New Horizon», бой «Side By Side»', font=F(22, True), fill=(120, 230, 160))
card.paste(A, (pad, y + 34)); card.paste(B, (pad * 2 + cw, y + 34))
y += 34 + max(A.height, B.height) + 16
# timeline chart: heat + 3 layers + measured music level
tl = pc.get('timeline') or []
ch_h = 420; x0, x1 = pad + 70, W - pad - 10; top = y + 40; bot = top + ch_h - 70
d.text((pad, y), 'Как музыка следует за боем (замер в игре, headless Chrome, реальный звук шины музыки)', font=F(22, True), fill=(230, 230, 240))
d.rectangle((x0, top, x1, bot), outline=(70, 80, 100))
if tl:
    t_end = tl[-1][0] or 1
    X = lambda t: x0 + (x1 - x0) * t / t_end
    # phase bands: menu / pause / radio
    for i in range(1, len(tl)):
        a, b = tl[i - 1], tl[i]
        col = (40, 34, 70) if a[4] == 'menu' else (60, 50, 30) if a[5] else (30, 60, 70) if a[6] else None
        if col: d.rectangle((X(a[0]), top + 1, X(b[0]), bot - 1), fill=col)
    names = [('синт (спокойно)', (120, 200, 255)), ('бас (контакт)', (255, 200, 90)), ('барабаны+FX (бой)', (255, 90, 120))]
    for li in range(3):
        pts = [(X(r[0]), bot - (bot - top) * (0.18 + li * 0.27) * min(1, r[2][li] if len(r[2]) > li else 0) - 0) for r in tl]
        lane_y = bot - (bot - top) * (0.06 + li * 0.27)
        for i in range(1, len(tl)):
            ga = tl[i][2][li] if len(tl[i][2]) > li else 0
            if ga > 0.02:
                d.rectangle((X(tl[i - 1][0]), lane_y - 26 * ga, X(tl[i][0]), lane_y), fill=names[li][1])
        d.text((x0 - 66, lane_y - 22), ['L1', 'L2', 'L3'][li], font=F(18, True), fill=names[li][1])
    hp = [(X(r[0]), bot - (bot - top) * min(1, r[1] / 1.6)) for r in tl]
    d.line(hp, fill=(255, 255, 255), width=2)
    rp = [(X(r[0]), bot - (bot - top) * max(0, min(1, (r[3] + 70) / 50))) for r in tl]
    d.line(rp, fill=(150, 255, 150), width=1)
    for s in pc.get('steps', []):
        pass
    lx = x0
    for nm, col in names + [('накал боя (heat)', (255, 255, 255)), ('уровень музыки, дБ', (150, 255, 150))]:
        d.rectangle((lx, bot + 14, lx + 18, bot + 30), fill=col); d.text((lx + 24, bot + 8), nm, font=F(18), fill=(220, 220, 230)); lx += 30 + int(d.textlength(nm, font=F(18)))
    d.text((x0, bot + 36), 'фон: фиолетовый — главное меню · жёлтый — пауза (тише и глухо) · бирюзовый — играет Радио (музыка молчит)', font=F(17), fill=(170, 180, 200))
y = bot + 70
# settings crop
S1 = Image.open(os.path.join(O, 'settings_pc.png')).convert('RGB'); sw, sh = S1.size
S1 = S1.crop((int(sw * 0.15), int(sh * 0.48), int(sw * 0.5), int(sh * 0.6))); S1.thumbnail((cw, 400))
card.paste(S1, (pad, y));
txt = ['Слои по накалу: тихо → синт; стрельба рядом → +бас;', 'жаркий бой/взрывы → +барабаны. Смена — на такт.', 'Приглушается под голоса; молчит при Радио.', f"Ошибок консоли: ПК {len(pc.get('errors', []))}, выкл {len(off.get('errors', []))}"]
for i, t in enumerate(txt): d.text((pad * 2 + cw, y + i * 30), t, font=F(21), fill=(220, 225, 235))
y += max(S1.height, 120) + 16
card = card.crop((0, 0, W, y))
card.save(os.path.join(T, 'card_t159.png'))
print('card', card.size)
def up(data, id_, kind, ctype, name):
    key = [l.split('=', 1)[1].strip() for l in open(r'D:\AI\pm_rate\secret.txt') if l.startswith('API_KEY=')][0]
    qs = urllib.parse.urlencode({'id': id_, 'cat': 'check', 'kind': kind, 'name': name, 'created': int(time.time() * 1000)})
    r = urllib.request.Request('https://pm-rate.pm-gford3.workers.dev/api/upload?' + qs, data=data, headers={'X-PM-Key': key, 'Content-Type': ctype, 'User-Agent': 'pm-rate-sync/1.0'}, method='POST')
    print(id_, len(data), urllib.request.urlopen(r).read().decode())
if '--up' in sys.argv:
    q = 85
    while True:
        bo = io.BytesIO(); c2 = card.copy(); c2.thumbnail((1280, 1800)); c2.save(bo, 'WEBP', quality=q); data = bo.getvalue()
        if len(data) <= 145000 or q < 30: break
        q -= 8
    up(data, 'check/t159_music', '2d', 'image/webp', 'T159 музыка меню и боя (EDMITRY): до/после')
    for f, id_, nm in (('fitba_demo.mp3', 'check/t159_battle_music', 'T159 музыка боя: спокойно → контакт → бой (Side By Side)'), ('fitba_menu.mp3', 'check/t159_menu_music', 'T159 тема главного меню (New Horizon)')):
        p = os.path.join(r'D:\AI\pm_mus159\out', f)
        if os.path.exists(p): up(open(p, 'rb').read(), id_, 'sfx', 'audio/mpeg', nm)
