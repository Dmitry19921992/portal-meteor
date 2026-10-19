import sys, os
src = os.path.dirname(os.path.abspath(__file__)) + '/'
r = lambda f: open(src + f, encoding='utf-8-sig').read()   # -sig: не тащим BOM из файлов, сохранённых PowerShell
JS = ['world.js','i18n.js','game.js','ai.js','rts_build.js','abil.js','tactics.js','progress.js','sim.js','vehicles2.js','vision.js','squad.js','save.js','camfx.js','tutorial.js','sidequests.js','touch.js','parkour.js','render.js','hints.js','ui.js','rts.js','uix.js','menu.js','gun.js','mission.js','audio.js','main.js']
html = r('head.html')
html += '<script id="fs" type="x-shader/x-fragment">' + r('scene.glsl') + '</script>\n'
html += '<script id="ps" type="x-shader/x-fragment">' + r('post.glsl') + '</script>\n<script>\n'
for f in JS:
    if os.path.exists(src + f): html += '// ---- ' + f + '\n' + r(f) + '\n'
html += '</script>\n</body>\n</html>\n'
os.makedirs(os.path.join(os.path.dirname(src[:-1]), 'dist'), exist_ok=True)
out = os.path.join(os.path.dirname(src[:-1]), 'dist', sys.argv[1] if len(sys.argv) > 1 else 'portal_meteor_v5.html')
open(out, 'w', encoding='utf-8', newline='\n').write(html)
print(out, len(html), 'bytes')
