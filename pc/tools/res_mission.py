import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from resolve import resolve, must
os.chdir(r'D:\AI\pm_v6\wt_v6')

resolve('build.py', [lambda o, t: o.replace("'menu.js','audio.js'", "'menu.js','mission.js','audio.js'")])

def u1(o, t):
    ol = o.split('\n'); tl = t.split('\n')
    sw = ol[0]; rtsrow = ol[1]
    block = [l for l in tl if 'redeploy' in l or 'freeplay' in l or l.strip() == '}' or 'SET.bind.redeploy' in l]
    return '\n'.join([sw] + block + [rtsrow]) + '\n'
resolve('ui.js', [u1])
print('done')
