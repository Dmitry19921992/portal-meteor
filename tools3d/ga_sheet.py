# ga_sheet.py — лист моделей: концепт | исходник TRELLIS | LOD0 | LOD1 (+ подписи). venv python (PIL)
# python ga_sheet.py <out.jpg> [cats=props,buildings,vehicles,weapons] [cell=150]
import sys, os, json, glob
from PIL import Image, ImageDraw, ImageFont
W = r'D:\AI\pm_assets\_work'
OUT = sys.argv[1]; CATS = (sys.argv[2] if len(sys.argv) > 2 else 'props,buildings,vehicles,weapons').split(','); C = int(sys.argv[3]) if len(sys.argv) > 3 else 150
recs = [json.load(open(p, encoding='utf-8')) for p in glob.glob(os.path.join(W, 'items', '*.json'))]
order = {c: i for i, c in enumerate(CATS)}
recs = sorted([r for r in recs if r['cat'] in order and not r.get('error')], key=lambda r: (order[r['cat']], not r.get('liked'), r['name']))
COLS = 3; cw = C * 4 + 24; ch = C + 40
rows = (len(recs) + COLS - 1) // COLS
f = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 14); fb = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', 22); fs = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 12)
sh = Image.new('RGB', (COLS * cw + 10, 64 + rows * ch), (16, 16, 18)); d = ImageDraw.Draw(sh)
d.text((12, 8), 'Portal Meteor — 3D-модели для игры (TRELLIS → Blender): концепт | исходник ~20k | LOD0 ~3k + 512 | LOD1 ~500 + 256', fill=(235, 220, 170), font=fb)
d.text((12, 38), '★ = из папки «👍 НРАВИТСЯ»; размеры — в метрах (ширина × высота × глубина); КБ — файлы GLB LOD0 / телефон / LOD1', fill=(170, 170, 170), font=fs)
def im(p):
    try: return Image.open(p).convert('RGB').resize((C, C), Image.LANCZOS)
    except Exception: return Image.new('RGB', (C, C), (40, 20, 20))
for k, r in enumerate(recs):
    x = 8 + (k % COLS) * cw; y = 64 + (k // COLS) * ch
    pv = os.path.join(W, 'prev', r['name'])
    for j, p in enumerate((r.get('src2d') or '', pv + '_src.png', pv + '_lod0.png', pv + '_lod1.png')):
        sh.paste(im(p), (x + j * (C + 4), y + 20))
    dd = r['dims']
    d.text((x, y + 1), ('★ ' if r.get('liked') else '') + r['cat'][:4] + '/' + r['name'], fill=(255, 225, 120) if r.get('liked') else (200, 200, 200), font=f)
    d.text((x + 2, y + C + 21), '%.1f×%.1f×%.1f м · %d/%d тр · %d/%d/%d КБ' % (dd[0], dd[1], dd[2], r['tris0'], r['tris1'], r['bytes0'] // 1024, r['bytes0m'] // 1024, r['bytes1'] // 1024), fill=(150, 160, 170), font=fs)
sh.save(OUT, quality=85)
print(OUT, sh.size, len(recs))
