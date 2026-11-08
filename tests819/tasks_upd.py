# test/v819-0811: update the status column of a few TASKS.md rows (HQ folder). Keeps encoding (BOM or not) and line endings.
# Backup next to it: TASKS.md.bak-v819test. Only rows listed in NEW are touched; a row with an unexpected cell count is skipped.
import sys, io, os, shutil
P = r'C:\Users\klaas\OneDrive\Рабочий стол\MAIGAIZИИN\TASKS.md'
raw = open(P, 'rb').read()
bom = raw.startswith(b'\xef\xbb\xbf')
txt = raw.decode('utf-8-sig')
crlf = '\r\n' in txt
A = 'review → в тестовой сборке test/v819-0811 (Claude-чат, ревью approve 08.11; INBOX/ans_{t}_review_claudechat.md; превью https://test.portal-meteor.pages.dev/; было: {old})'
NEW = {
  'T92': A, 'T131': A, 'T168': A, 'T169': A, 'T159': A, 'T35': A, 'T31': A, 'T24': A, 'T106': A,
  'T156': 'review: changes (Claude-чат 08.11, INBOX/ans_T156_review_claudechat.md): оценка Дмитрия «после» 1/5 — базой вернуть старый звук, новый держать за флагом, выстрелам вес по T202; в тестовую сборку v819 НЕ вошла; было: {old}',
  'T176': 'todo (WIP сохранён интегратором Claude-чат 08.11 05:15: task/T176-debris @37bce15 — продолжать с него; автор Claude CLI упёрся в сессионный лимит ~03:00, REPORT нет; в тестовую сборку v819 НЕ вошла; INBOX/ans_T176_review_claudechat.md; было: {old})',
}
lines = txt.split('\n'); done = []
for i, l in enumerate(lines):
    s = l.rstrip('\r')
    for t, tpl in NEW.items():
        if s.startswith('| ' + t + ' |'):
            c = s.split('|')
            if len(c) != 8: print('skip (cells %d)' % len(c), t); continue
            old = c[5].strip().replace('{', '(').replace('}', ')')
            if 'test/v819-0811' in old: print('already', t); continue
            c[5] = ' ' + tpl.format(t=t, old=old[:400]) + ' '
            lines[i] = '|'.join(c) + ('\r' if l.endswith('\r') else '')
            done.append(t)
if '--dry' in sys.argv: print('dry', done, 'bom', bom, 'crlf', crlf); sys.exit(0)
shutil.copyfile(P, P + '.bak-v819test')
out = '\n'.join(lines).encode('utf-8')
open(P, 'wb').write((b'\xef\xbb\xbf' if bom else b'') + out)
print('updated', done, 'bom', bom, 'crlf', crlf)
