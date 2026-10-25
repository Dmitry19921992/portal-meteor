# v7.5 release: which in-game 3D models (assets3d) are rated 4-5 (models, kind 3d) / banned — decides the default of SET.as75
import json, os, re
R = json.load(open('D:/AI/pm_rate/ratings.json', encoding='utf-8'))
B = json.load(open('D:/AI/pm_rate/banned.json', encoding='utf-8'))
names = sorted({re.sub(r'_lod\w+$', '', f[:-4]) for f in os.listdir('D:/AI/pm_v6/wt75r/assets3d') if f.endswith('.glb')})
print('in-game models:', len(names))
r3 = R.get('ratings_3d', {})
print('ratings_3d entries:', len(r3))
for k, v in r3.items(): print('  3d', k, v.get('score'), v.get('flag'), v.get('comment'))
good, bad = [], []
for n in names:
    hits = [v for k, v in r3.items() if k.endswith('/' + n)]
    sc = [v.get('score') for v in hits]
    if any(s and s >= 4 for s in sc): good.append(n)
    if any(s == 1 for s in sc): bad.append(n)
ban = [b for b in B.get('banned', []) if b.get('kind') == '3d' or any(n in (b.get('id', '') + b.get('file', '')) for n in names)]
for b in ban: print('  banned', b.get('kind'), b.get('id'))
bad += [n for n in names for b in ban if n in (b.get('id', '') + b.get('file', ''))]
print('good (3d score 4-5):', good)
print('bad/banned:', sorted(set(bad)))
# for info: 2D concept scores of the same names
c2 = {n: R['ratings'][k]['score'] for n in names for k in R['ratings'] if k.endswith('/' + n)}
print('2D concept scores of in-game models:', c2)
