# ga_select.py — отбор TRELLIS-моделей для игры (3D-конвейер v7.5)
# Лайки: имя файла в «👍 НРАВИТСЯ» = <cat>_<name>.jpg  <->  _3d/<cat>/<name>.glb
# «👎 НЕ НРАВИТСЯ» и D:\AI\pm_rate\banned.json — исключаются. Выход: D:\AI\pm_assets\_work\selection.json
import os, json, re, sys
ROOT3D = r'D:\AI\pm_gpu\out\nonstop\_3d'
SRC2D = r'D:\AI\pm_gpu\out\nonstop'
CON = r'C:\Users\klaas\OneDrive\Рабочий стол\portal meteor\_МОЁ\7_КОНЦЕПТЫ_НОВЫЕ'
LIKE = os.path.join(CON, '👍 НРАВИТСЯ'); DIS = os.path.join(CON, '👎 НЕ НРАВИТСЯ')
OUT = r'D:\AI\pm_assets\_work'
os.makedirs(OUT, exist_ok=True)
CATS = ['props', 'buildings', 'vehicles', 'weapons', 'world']
QUOTA = {'props': 20, 'buildings': 10, 'vehicles': 10, 'weapons': 8, 'world': 4}
def names(d):
    s = set()
    if os.path.isdir(d):
        for f in os.listdir(d):
            m = re.match(r'^(.*)\.(jpg|png|webp)$', f, re.I)
            if m: s.add(m.group(1))
    return s
liked, disliked = names(LIKE), names(DIS)
banned = set()
bj = r'D:\AI\pm_rate\banned.json'
if os.path.exists(bj):
    try:
        b = json.load(open(bj, encoding='utf-8'))
        it = b if isinstance(b, list) else (b.get('banned') or list(b.keys()))
        for x in it:
            x = x if isinstance(x, str) else (x.get('name') or x.get('id') or '')
            banned.add(os.path.splitext(os.path.basename(x))[0])
    except Exception as e: print('banned.json unreadable', e)
def typ(name): return re.sub(r'_\d+$', '', name)
sel, stats = [], {}
for cat in CATS:
    d = os.path.join(ROOT3D, cat)
    glbs = sorted(f[:-4] for f in os.listdir(d) if f.endswith('.glb')) if os.path.isdir(d) else []
    pool_l, pool_n = [], []
    for n in glbs:
        key = cat + '_' + n
        if key in disliked or key in banned or n in banned: continue
        size = os.path.getsize(os.path.join(d, n + '.glb'))
        if size < 200000: continue   # битые/пустые
        (pool_l if key in liked else pool_n).append(n)
    # круговой отбор по типам: сначала лайкнутые, потом нейтральные (разнообразие типов)
    def rr(pool, k, taken):
        by = {}
        for n in pool: by.setdefault(typ(n), []).append(n)
        out = []
        while len(out) < k and any(by.values()):
            for t in sorted(by):
                if by[t] and len(out) < k:
                    out.append(by[t].pop(0))
        return out
    q = QUOTA[cat]
    a = rr(pool_l, q, [])
    # нейтральные: только типы, которых ещё нет среди лайков и которые Дмитрий не отвергал (есть 👎 и нет 👍 у типа)
    lt = {typ(k[len(cat) + 1:]) for k in liked if k.startswith(cat + '_')}
    dt = {typ(k[len(cat) + 1:]) for k in disliked if k.startswith(cat + '_')}
    b = rr([n for n in pool_n if typ(n) not in {typ(x) for x in a} and not (typ(n) in dt and typ(n) not in lt)], max(0, q - len(a)), a) if len(a) < q else []
    for n in a + b:
        src2d = next((os.path.join(SRC2D, cat, n + e) for e in ('.png', '.jpg') if os.path.exists(os.path.join(SRC2D, cat, n + e))), '')
        sel.append({'name': n, 'cat': cat, 'type': typ(n), 'liked': n in a, 'weight': 3 if n in a else 1,
                    'src': os.path.join(d, n + '.glb'), 'src2d': src2d})
    stats[cat] = {'glb': len(glbs), 'liked_avail': len(pool_l), 'neutral_avail': len(pool_n), 'taken_liked': len(a), 'taken_neutral': len(b)}
json.dump({'items': sel, 'stats': stats, 'liked_total': len(liked), 'disliked_total': len(disliked), 'banned_total': len(banned)},
          open(os.path.join(OUT, 'selection.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(json.dumps(stats, ensure_ascii=False))
print('selected', len(sel), 'liked', sum(1 for s in sel if s['liked']))
for s in sel: print(s['cat'], s['name'], 'L' if s['liked'] else '-')
