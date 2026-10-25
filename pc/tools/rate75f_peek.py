import json, collections
R = json.load(open('D:/AI/pm_rate/ratings.json', encoding='utf-8'))
print('updated', R.get('updated'))
r = R.get('ratings_3d', {})
c = collections.Counter(v['score'] for v in r.values())
print('3d score histogram', sorted(c.items()))
for k, v in r.items():
    if v['score'] >= 4 or v.get('flag'): print(' ', k, v['score'], v.get('flag'), v.get('comment'))
