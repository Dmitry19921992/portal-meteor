import sys, os, base64
src = os.path.dirname(os.path.abspath(__file__)) + '/'
r = lambda f: open(src + f, encoding='utf-8-sig').read()   # -sig: не тащим BOM из файлов, сохранённых PowerShell
JS = ['world.js','i18n.js','he68_dict.js','game.js','ai.js','rts_build.js','abil.js','tactics.js','progress.js','sim.js','vehicles2.js','vision.js','squad.js','save.js','camfx.js','tutorial.js','sidequests.js','touch.js','parkour.js','render.js','heavy65.js','hints.js','ui.js','rts.js','uix.js','rts61.js','menu.js','gun.js','mission.js','fps61.js','grenade62.js','career.js','audio.js','v64.js','curator.js','dev64.js','phone64.js','v65.js',
      'v66_eco.js','v66_ctl.js','v66_voice.js','v66_cam.js','v66.js','v67_mobile.js','v67.js','v68_voice.js','v68.js','v69_guns.js','v69_drones.js','v69.js','main.js']
html = r('head.html')
html += '<script id="fs" type="x-shader/x-fragment">' + r('scene.glsl') + '</script>\n'
html += '<script id="ps" type="x-shader/x-fragment">' + r('post.glsl') + '</script>\n'
# v6.5: 3D-модель тяжёлого бойца (GLB со скелетом и анимациями) — base64 прямо в странице, игра остаётся одним файлом
glb = src + 'assets/heavyE_anim.glb'
if os.path.exists(glb):
    html += '<script id="hv65glb" type="application/octet-stream">' + base64.b64encode(open(glb, 'rb').read()).decode('ascii') + '</script>\n'
# v6.6: голоса юнитов (Piper TTS + радиофильтр, mp3 base64) — assets/voice66.json
vo = src + 'assets/voice66.json'
if os.path.exists(vo):
    html += '<script id="vo66" type="application/json">' + open(vo, encoding='utf-8').read().replace('</', '<\\/') + '</script>\n'
# v6.8: голосовые пакеты EN/VI/HE (D:\AI\pm_tts\gen68.py) — разбирается только пакет выбранного языка
for lg in ('en', 'vi', 'he'):
    vo = src + f'assets/voice68_{lg}.json'
    if os.path.exists(vo):
        html += f'<script id="vo68{lg}" type="application/json">' + open(vo, encoding='utf-8').read().replace('</', '<\\/') + '</script>\n'
html += '<script>\n'
for f in JS:
    if os.path.exists(src + f): html += '// ---- ' + f + '\n' + r(f) + '\n'
html += '</script>\n</body>\n</html>\n'
os.makedirs(os.path.join(os.path.dirname(src[:-1]), 'dist'), exist_ok=True)
out = os.path.join(os.path.dirname(src[:-1]), 'dist', sys.argv[1] if len(sys.argv) > 1 else 'portal_meteor_v5.html')
open(out, 'w', encoding='utf-8', newline='\n').write(html)
print(out, len(html), 'bytes')
