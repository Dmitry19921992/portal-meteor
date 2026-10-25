import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from resolve import resolve, must
os.chdir(r'D:\AI\pm_v6\wt_v6')
resolve('build.py', [lambda o, t: o.replace("'menu.js','mission.js'", "'menu.js','gun.js','mission.js'")])
print('done')
