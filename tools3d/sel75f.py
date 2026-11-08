# v7.5 final: selection.json for the Blender pipeline (game_assets.py) from model ratings:
# environment models (props/buildings/vehicles, not flying) rated by Dmitry with avg >= 4, no 1, no flag, not banned.
# Output: D:\AI\pm_assets\_work\selection_75f.json (same format as ga_select.py)
import json, os, re
R = json.load(open('D:/AI/pm_rate/ratings.json', encoding='utf-8'))
try: B = json.load(open('D:/AI/pm_rate/banned.json', encoding='utf-8')).get('banned', [])
except Exception: B = []
FLY = ('drone_attack', 'drone_recon', 'drone_repair', 'gunship', 'dropship')
by = {}
for k, v in R.get('ratings_3d', {}).items():
    if v.get('cat') in ('props', 'buildings', 'vehicles'): by.setdefault((v['cat'], k.split('/')[-1]), []).append(v)
sel = []
for (cat, n), vs in sorted(by.items()):
    sc = [v['score'] for v in vs if v.get('score')]
    typ = re.sub(r'_\d+$', '', n)
    if not sc or sum(sc) / len(sc) < 4 or 1 in sc or any(v.get('flag') for v in vs) or typ in FLY: continue
    if any(n in (b.get('file', '') + b.get('id', '') + b.get('stem', '')) for b in B): continue
    src = os.path.join(r'D:\AI\pm_gpu\out\nonstop\_3d', cat, n + '.glb')
    if not os.path.exists(src): continue
    s2 = next((os.path.join(r'D:\AI\pm_gpu\out\nonstop', cat, n + e) for e in ('.png', '.jpg') if os.path.exists(os.path.join(r'D:\AI\pm_gpu\out\nonstop', cat, n + e))), '')
    sel.append({'name': n, 'cat': cat, 'type': typ, 'liked': True, 'weight': 3, 'src': src, 'src2d': s2})
json.dump({'items': sel}, open(r'D:\AI\pm_assets\_work\selection_75f.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('selected', len(sel)); [print(' ', s['cat'], s['name']) for s in sel]
