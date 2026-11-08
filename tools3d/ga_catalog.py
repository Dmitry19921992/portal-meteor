# ga_catalog.py — сводный каталог D:\AI\pm_assets\catalog.json (все обработанные модели, включая не попавшие в игру)
import os, json, glob, time
A = r'D:\AI\pm_assets'
try: game = {e['n']: e for e in json.load(open(r'D:\AI\pm_v6\wt74a\assets\catalog3d.json', encoding='utf-8'))['items']}
except Exception: game = {}
out = []
for p in sorted(glob.glob(os.path.join(A, '_work', 'items', '*.json'))):
    r = json.load(open(p, encoding='utf-8'))
    if r.get('error'): out.append({'name': r['name'], 'category': r['cat'], 'error': r['error']}); continue
    g = game.get(r['name'])
    out.append({'name': r['name'], 'category': r['cat'], 'type': r['type'], 'liked': r['liked'], 'weight': r['weight'],
                'size_m': {'w': r['dims'][0], 'h': r['dims'][1], 'd': r['dims'][2]},
                'tris': {'source': r['src_tris'], 'lod0': r['tris0'], 'lod1': r['tris1']},
                'files': {'lod0': f"{r['cat']}/{r['name']}_lod0.glb", 'lod0m': f"{r['cat']}/{r['name']}_lod0m.glb", 'lod1': f"{r['cat']}/{r['name']}_lod1.glb"},
                'bytes': {'lod0': r['bytes0'], 'lod0m': r['bytes0m'], 'lod1': r['bytes1']},
                'texture_px': {'lod0': 512, 'lod0m': 256, 'lod1': 256},
                'in_game': g['p'] if g else None, 'game_kb': g['kb'] if g else None,
                'source_glb': r['src'], 'concept_2d': r.get('src2d', ''), 'license': 'TRELLIS (MIT) — коммерческое использование разрешено'})
cat = {'generated': time.strftime('%Y-%m-%d %H:%M'), 'pipeline': r'D:\AI\pm_3d\scripts\game_assets.py (Blender 5.2, CPU)',
       'count': len(out), 'in_game': sum(1 for o in out if o.get('in_game')), 'liked': sum(1 for o in out if o.get('liked')), 'items': out}
json.dump(cat, open(os.path.join(A, 'catalog.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('catalog', cat['count'], 'in game', cat['in_game'], 'liked', cat['liked'])
