# ga_pairs.py <out_dir> — склейки «до/после» из shots\v75a (*_off.jpg / *_on.jpg) с подписями по-русски
import sys, os
from PIL import Image, ImageDraw, ImageFont
S = r'D:\AI\pm_v6\shots\v75a'; O = sys.argv[1]; os.makedirs(O, exist_ok=True)
PAIRS = [('1_ruin', 'до_после_1_руины_экспедиции.jpg', 'Руины построек прошлых экспедиций (с коллайдером — сквозь не пройти)'),
         ('2_wreck', 'до_после_2_брошенная_техника.jpg', 'Брошенная техника у руин'),
         ('3_point', 'до_после_3_точка_захвата.jpg', 'Укрепления у точки захвата: мешки, ящики, контейнеры, турели'),
         ('4_nature', 'до_после_4_камни_кристаллы.jpg', 'Камни, кристаллы, инопланетные грибы и растения'),
         ('5_rts', 'до_после_5_вид_сверху.jpg', 'Стратегия: вид сверху')]
fb = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', 26); f = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 22)
W, H = 960, 540
n = 0
for key, name, cap in PAIRS:
    a, b = os.path.join(S, key + '_off.jpg'), os.path.join(S, key + '_on.jpg')
    if not (os.path.exists(a) and os.path.exists(b)): continue
    im = Image.new('RGB', (W * 2 + 30, H + 70), (14, 14, 16)); d = ImageDraw.Draw(im)
    d.text((12, 10), cap, fill=(235, 220, 170), font=fb)
    for i, (p, lab) in enumerate(((a, 'БЫЛО: v7.4 (модели выкл.)'), (b, 'СТАЛО: новые 3D-модели (вкл.)'))):
        im.paste(Image.open(p).convert('RGB').resize((W, H), Image.LANCZOS), (10 + i * (W + 10), 56))
        d.rectangle((18 + i * (W + 10), 62, 18 + i * (W + 10) + 380, 96), fill=(0, 0, 0))
        d.text((26 + i * (W + 10), 64), lab, fill=(255, 230, 120), font=f)
    im.save(os.path.join(O, name), quality=88); n += 1
lp = os.path.join(S, '6_lite_on.jpg')
if os.path.exists(lp):
    im = Image.new('RGB', (W + 20, H + 70), (14, 14, 16)); d = ImageDraw.Draw(im)
    d.text((12, 10), 'Лёгкий режим / телефон: облегчённые модели (текстуры 256)', fill=(235, 220, 170), font=fb)
    im.paste(Image.open(lp).convert('RGB').resize((W, H), Image.LANCZOS), (10, 56)); im.save(os.path.join(O, 'до_после_6_лёгкий_режим.jpg'), quality=88); n += 1
print('pairs', n)
