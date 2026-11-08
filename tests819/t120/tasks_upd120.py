# T120/T94: status column of TASKS.md rows T120, T94 (HQ folder). Keeps encoding (BOM or not) and line endings (copy of tests819/tasks_upd.py).
# Backup next to it: TASKS.md.bak-t120. Status text comes from tasks120.json {"T120": "...", "T94": "..."} ({old} = previous status).
import sys, io, os, json, shutil
P = r'C:\Users\klaas\OneDrive\Рабочий стол\MAIGAIZИИN\TASKS.md'
NEW = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tasks120.json'), encoding='utf-8'))
raw = open(P, 'rb').read()
bom = raw.startswith(b'\xef\xbb\xbf')
txt = raw.decode('utf-8-sig')
crlf = '\r\n' in txt
lines = txt.split('\n'); done = []
for i, l in enumerate(lines):
    s = l.rstrip('\r')
    for t, tpl in NEW.items():
        if s.startswith('| ' + t + ' |'):
            c = s.split('|')
            if len(c) != 8: print('skip (cells %d)' % len(c), t); continue
            old = c[5].strip().replace('{', '(').replace('}', ')')
            c[5] = ' ' + tpl.format(old=old[:300]) + ' '
            lines[i] = '|'.join(c) + ('\r' if l.endswith('\r') else '')
            done.append(t)
if '--dry' in sys.argv: print('dry', done, 'bom', bom, 'crlf', crlf); sys.exit(0)
shutil.copyfile(P, P + '.bak-t120')
out = '\n'.join(lines).encode('utf-8')
open(P, 'wb').write((b'\xef\xbb\xbf' if bom else b'') + out)
print('updated', done, 'bom', bom, 'crlf', crlf)
