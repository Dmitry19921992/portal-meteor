# v7.5 final: allowlist of in-game 3D environment models, generated from Dmitry's ratings (PM//RATE app).
# A model is allowed only if: it has >= 1 model rating (ratings_3d, id 3d/<cat>/<name>), average score >= 4,
# no 1 (very unsatisfied) rating, no problem flag, and it is not in banned.json (model GLB or its concept).
# Output: assets/allow3d.json  {"v":1,"updated":..., "rule":..., "allow":[names]}  (build.py embeds it into the page)
# Usage: python tools3d/allow3d.py [ratings.json] [banned.json]
import json, os, sys, datetime
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RJ = sys.argv[1] if len(sys.argv) > 1 else 'D:/AI/pm_rate/ratings.json'
BJ = sys.argv[2] if len(sys.argv) > 2 else 'D:/AI/pm_rate/banned.json'
cat = json.load(open(os.path.join(HERE, 'assets', 'catalog3d.json'), encoding='utf-8'))
R = json.load(open(RJ, encoding='utf-8')) if os.path.exists(RJ) else {}
try: B = json.load(open(BJ, encoding='utf-8')).get('banned', [])
except Exception: B = []
r3 = R.get('ratings_3d', {}) or {}
def rats(c, n):
    out = []
    for k, v in r3.items():   # one entry per item in ratings.json; a list of entries is accepted too (history)
        if k == f'3d/{c}/{n}' or (v.get('cat') == c and k.endswith('/' + n)):
            out += v if isinstance(v, list) else [v]
    return out
allow, rows = [], []
for it in cat['items']:
    n, c = it['n'], it['c']
    rs = [x for x in rats(c, n) if isinstance(x.get('score'), (int, float)) and x.get('score') > 0]
    sc = [x['score'] for x in rs]
    flag = any((x.get('flag') or '').strip() for x in rs)
    ban = any(n in (b.get('file', '') + ' ' + b.get('id', '') + ' ' + b.get('stem', '')) for b in B)
    avg = sum(sc) / len(sc) if sc else None
    ok = bool(sc) and avg >= 4 and 1 not in sc and not flag and not ban
    rows.append((n, c, sc, flag, ban, ok))
    if ok: allow.append(n)
out = {'v': 1, 'updated': datetime.datetime.now().strftime('%Y-%m-%d %H:%M'),
       'rule': 'rated, avg>=4, no 1, no flag, not banned', 'source': os.path.basename(RJ) + ' ' + str(R.get('updated', '')),
       'allow': allow}
json.dump(out, open(os.path.join(HERE, 'assets', 'allow3d.json'), 'w', encoding='utf-8', newline='\n'), ensure_ascii=False)
rated = sum(1 for r in rows if r[2])
print(f'models in catalog: {len(rows)}, rated: {rated}, allowed: {len(allow)}')
for n, c, sc, fl, bn, ok in rows:
    if sc or bn: print(f'  {"ALLOW" if ok else "  -  "} {c}/{n} scores={sc} flag={fl} banned={bn}')
