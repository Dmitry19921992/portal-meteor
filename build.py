import sys, os, base64
src = os.path.dirname(os.path.abspath(__file__)) + '/'
r = lambda f: open(src + f, encoding='utf-8-sig').read()   # -sig: не тащим BOM из файлов, сохранённых PowerShell
JS = ['world.js','i18n.js','he68_dict.js','game.js','ai.js','rts_build.js','abil.js','tactics.js','progress.js','sim.js','vehicles2.js','vision.js','squad.js','save.js','camfx.js','tutorial.js','sidequests.js','touch.js','parkour.js','render.js','heavy65.js','hints.js','ui.js','rts.js','uix.js','rts61.js','menu.js','gun.js','mission.js','fps61.js','grenade62.js','career.js','audio.js','v64.js','curator.js','dev64.js','phone64.js','v65.js',
      'v66_eco.js','v66_ctl.js','v66_voice.js','v66_cam.js','v66.js','v67_mobile.js','v67.js','v68_voice.js','v68.js','v69_guns.js','v69_drones.js','v69.js','v70_mesh.js','v70_play.js','v70_bases.js','v70.js','v71_mobile.js','v71_poly.js','v71.js','v72_ctl.js','v72_tut.js','v72.js','v73_mobile.js','v73.js','v72_gfx.js','v72_audio.js','v74_mobile.js','v74.js','v74_fx.js','v74_cls.js','v75_assets.js','main.js']
JS[-1:-1] = ['v75_cine.js', 'v75.js', 'v75_field.js', 'v75_stats.js', 'v75_ver.js']   # v7.5 (отдельной строкой — не мешает слиянию веток)
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
# v7.5: 3D-модели окружения — в страницу только каталог (~10 КБ); сами модели — рядом, в dist/assets3d/*.js (грузятся по требованию)
cat3d = src + 'assets/catalog3d.json'
if os.path.exists(cat3d):
    html += '<script id="as75cat" type="application/json">' + open(cat3d, encoding='utf-8').read().replace('</', '<\\/') + '</script>\n'
    # v7.5 final: allowlist from Dmitry's ratings (tools3d/allow3d.py) - only these models are loaded; missing file = none
    al3d = src + 'assets/allow3d.json'
    html += '<script id="as75allow" type="application/json">' + (open(al3d, encoding='utf-8').read() if os.path.exists(al3d) else '{"allow":[]}').replace('</', '<\\/') + '</script>\n'
    a3 = src + 'assets3d/'
    o3 = os.path.join(os.path.dirname(src[:-1]), 'dist', 'assets3d')
    os.makedirs(o3, exist_ok=True)
    n3 = b3 = 0
    for f in sorted(os.listdir(a3)) if os.path.isdir(a3) else []:
        if not f.endswith('.glb'): continue
        js = 'PM3D_reg("' + f[:-4] + '","' + base64.b64encode(open(a3 + f, 'rb').read()).decode('ascii') + '");\n'
        p3 = os.path.join(o3, f[:-4] + '.js')
        if not os.path.exists(p3) or open(p3, encoding='ascii').read() != js: open(p3, 'w', encoding='ascii', newline='\n').write(js)
        n3 += 1; b3 += len(js)
    print('assets3d:', n3, 'files', b3, 'bytes ->', o3)
import datetime   # v7.4: дата сборки на экране меню берётся автоматически в момент сборки
html += '<script>\nconst BUILD_DATE = "' + datetime.datetime.now().strftime('%d.%m.%Y %H:%M') + '";\n'
JS.insert(JS.index('main.js'), 'v75_dendy.js')   # v7.5 «Денди» — последним перед main.js (его обёртки снаружи всех); отдельной строкой — не мешает слиянию
for f in JS:
    if os.path.exists(src + f): html += '// ---- ' + f + '\n' + r(f) + '\n'
html += '</script>\n</body>\n</html>\n'
os.makedirs(os.path.join(os.path.dirname(src[:-1]), 'dist'), exist_ok=True)
out = os.path.join(os.path.dirname(src[:-1]), 'dist', sys.argv[1] if len(sys.argv) > 1 else 'portal_meteor_v5.html')
open(out, 'w', encoding='utf-8', newline='\n').write(html)
print(out, len(html), 'bytes')
