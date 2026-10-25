import re, json, io
t = io.open('D:/AI/pm_v6/tests/out75_pcab.txt', encoding='utf-8-sig').read()
for part in re.split(r'(?m)^--- ', t)[1:]:
    title = part.splitlines()[0]
    m = re.search(r'\{[\s\S]*?\n\}', part)
    if not m: print(title, 'NO JSON'); continue
    d = json.loads(m.group(0))
    print(title)
    for k, v in d.items():
        print('   %-9s diff %7s  max %3s  bbox %s' % (k, v.get('diff'), v.get('maxDelta'), v.get('bbox')))
for tag in ['warm', 'd0base', 'd0new', 'd0base2', 'd1new']:
    try:
        L = io.open('D:/AI/pm_v6/tests/pcab75_%s.log' % tag, encoding='utf-8', errors='replace').read()
        j = json.loads(L[L.index('['):L.rindex(']') + 1])
        print(tag, j[0]['res'] if isinstance(j[0]['res'], str) else j[0]['res'].get('title'), j[0]['logs'][:3])
    except Exception as e: print(tag, 'log?', e)
