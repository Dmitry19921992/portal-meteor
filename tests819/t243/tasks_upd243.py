# T243: replace (or add) the row T243 in TASKS.md of the HQ folder (Latin N). Keeps encoding (BOM or not) and line endings.
# usage: python tasks_upd243.py "<status>"   backup: TASKS.md.bak-t243 (first run only)
import sys, os, shutil
base = r'C:\Users\klaas\OneDrive\Рабочий стол'
d = [n for n in os.listdir(base) if n.startswith('MAIG') and n.endswith('N')]
assert len(d) == 1, d
P = os.path.join(base, d[0], 'TASKS.md')
DESC = ('Tripo, волна 2: все остальные одобренные (4–5 в Фитбе) модели Tripo в игру тем же конвейером, что T120/T94 (D:\\AI\\t243\\scripts, '
        'модуль v819_t243.js, флаг ?t243=0): постройки Консорциума (турель, ПВО, форпост, мехзавод, дрон-хаб, аэродок, экстрактор), турель и ПВО Роя, '
        'оба штаба (scene.glsl uHQ=2), пехота Роя, снайпер, бойцы для разнообразия, дроны, «Шакал» — только вид, логика и коллизии прежние; '
        'отчёт REPORT_T243.md. Сюда же сообщение Дмитрия 14:20 «Надеюсь подарочные кредиты трипо тоже в работе и скоро я увижу все в игре»')
ROW = '| T243 | %s | Дмитрий 08.11 («хочу видеть модели трипо в игре») | coder:Claude-помощник | %s | Игра/3D |' % (DESC, sys.argv[1])
raw = open(P, 'rb').read(); bom = raw.startswith(b'\xef\xbb\xbf'); txt = raw.decode('utf-8-sig')
lines = txt.split('\n'); hit = 0
for i, l in enumerate(lines):
    if l.rstrip('\r').startswith('| T243 |'):
        lines[i] = ROW + ('\r' if l.endswith('\r') else ''); hit += 1
if not hit:
    last = max(i for i, l in enumerate(lines) if l.startswith('| T'))
    lines.insert(last + 1, ROW + ('\r' if lines[last].endswith('\r') else '')); hit = 1
if not os.path.exists(P + '.bak-t243'): shutil.copyfile(P, P + '.bak-t243')
open(P, 'wb').write((b'\xef\xbb\xbf' if bom else b'') + '\n'.join(lines).encode('utf-8'))
print('ok rows', hit, 'bom', bom)
