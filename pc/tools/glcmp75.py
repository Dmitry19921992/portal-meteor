# сравнение трасс WebGL одного кадра (gltrace75.js): структура проходов base vs new
import json, io, sys
KEY = ('useProgram', 'viewport', 'bindFramebuffer', 'drawArrays', 'uniform2f', 'generateMipmap')
def load(p):
    return {o['tag']: [s for s in o['seq'] if s.split(':')[0] in KEY] for o in json.load(io.open(p, encoding='utf-8'))}
a = load('D:/AI/pm_v6/tests/gl75_base.json')
for other in sys.argv[1:] or ['gl75_new', 'gl75_def']:
    b = load('D:/AI/pm_v6/tests/%s.json' % other)
    for tag in ('menu', 'fps', 'rts'):
        A, B = a.get(tag, []), b.get(tag, [])
        same = A == B
        print('%-8s %-5s base %4d calls, new %4d calls -> %s' % (other, tag, len(A), len(B), 'IDENTICAL' if same else 'DIFF'))
        if not same:
            for i in range(min(len(A), len(B))):
                if A[i] != B[i]: print('    first diff at', i, A[max(0, i - 2):i + 3], '|', B[max(0, i - 2):i + 3]); break
            else: print('    prefix equal, lengths differ; tail base', A[len(B):len(B) + 4], 'new', B[len(A):len(A) + 4])
