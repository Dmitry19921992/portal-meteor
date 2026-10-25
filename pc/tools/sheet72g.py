# v7.2gfx: лист «было/стало» из детерминированных кадров shots/pcab72g (v71_* vs new_*) → JPG
import sys
from PIL import Image, ImageDraw, ImageFont
D = 'D:/AI/pm_v6/shots/pcab72g/'
OUT = sys.argv[1] if len(sys.argv) > 1 else 'D:/AI/pm_v6/shots/v72g/sheet.jpg'
ROWS = [('3_boom_b', 'Взрыв: клубы огня с горячим ядром, копоть, обломки породы'),
        ('4_boom_smoke', 'Через 2 с: подсвеченный дым, пылевая дымка, опалина с углями'),
        ('1_fps_fire', 'Бой в шутере: цветокор «военная плёнка», зерно, блики'),
        ('11_poly_ground', 'Грунт после боя: опалины и тлеющие обломки'),
        ('8_crater', 'Кратер: охра/базальт, слои склонов, иней'),
        ('9_tunnel', 'Шахта: отражённый свет колец, не чёрная дыра'),
        ('10_poly_wide', 'Стратегия: Полигон — опалины, дым, дымка у земли'),
        ('6_base_low', 'База: дымка у горизонта, цвет')]
W, H = 640, 360
fnt = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 20); fb = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', 26)
sheet = Image.new('RGB', (W * 2 + 30, 70 + len(ROWS) * (H + 34)), (14, 14, 16))
d = ImageDraw.Draw(sheet)
d.text((10, 10), 'Portal Meteor — графика v7.1 (слева)  vs  новая v7.2gfx (справа) · тот же бой, ПК 1280×720', fill=(230, 215, 170), font=fb)
y = 60
for key, cap in ROWS:
    d.text((10, y), cap, fill=(220, 220, 220), font=fnt)
    for i, tag in enumerate(('old', 'new')):
        im = Image.open(D + f'{tag}_{key}.png').convert('RGB').resize((W, H), Image.LANCZOS)
        sheet.paste(im, (10 + i * (W + 10), y + 30))
        d.text((18 + i * (W + 10), y + 36), 'v7.1' if tag == 'old' else 'новая', fill=(255, 230, 120), font=fb)
    y += H + 34
sheet.save(OUT, quality=86)
print(OUT, sheet.size)
