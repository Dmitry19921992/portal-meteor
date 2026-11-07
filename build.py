import sys, os, base64
src = os.path.dirname(os.path.abspath(__file__)) + '/'
r = lambda f: open(src + f, encoding='utf-8-sig').read()   # -sig: не тащим BOM из файлов, сохранённых PowerShell
JS = ['world.js','i18n.js','he68_dict.js','game.js','ai.js','rts_build.js','abil.js','tactics.js','progress.js','sim.js','vehicles2.js','vision.js','squad.js','save.js','camfx.js','tutorial.js','sidequests.js','touch.js','parkour.js','render.js','heavy65.js','hints.js','ui.js','rts.js','uix.js','rts61.js','menu.js','gun.js','mission.js','fps61.js','grenade62.js','career.js','audio.js','v64.js','curator.js','dev64.js','phone64.js','v65.js',
      'v66_eco.js','v66_ctl.js','v66_voice.js','v66_cam.js','v66.js','v67_mobile.js','v67.js','v68_voice.js','v68.js','v69_guns.js','v69_drones.js','v69.js','v70_mesh.js','v70_play.js','v70_bases.js','v70.js','v71_mobile.js','v71_poly.js','v71.js','v72_ctl.js','v72_tut.js','v72.js','v73_mobile.js','v73.js','v72_gfx.js','v72_audio.js','v74_mobile.js','v74.js','v74_fx.js','v74_cls.js','v75_assets.js','main.js']
JS[-1:-1] = ['v75_cine.js', 'v75.js', 'v75_field.js', 'v75_stats.js', 'v75_ver.js']   # v7.5 (отдельной строкой — не мешает слиянию веток)
JS[-1:-1] = ['v76_factions.js', 'v76_craters.js', 'v76_tpv.js']   # v7.6: фракции, воронки, 3-е лицо (отдельной строкой)
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
for f in (sorted(os.listdir(src + 'lang')) if os.path.isdir(src + 'lang') else []):   # v7.9 l10n: lang/<code>.json string tables (parsed only for the chosen language)
    if len(f) == 7 and f.endswith('.json') and f[:2].isalpha(): html += f'<script id="l79_{f[:2]}" type="application/json">' + open(src + 'lang/' + f, encoding='utf-8').read().replace('</', '<\\/') + '</script>\n'
import datetime   # v7.4: дата сборки на экране меню берётся автоматически в момент сборки
html += '<script>\nconst BUILD_DATE = "' + datetime.datetime.now().strftime('%d.%m.%Y %H:%M') + '";\n'
JS.insert(JS.index('main.js'), 'v75_dendy.js')   # v7.5 «Денди» — последним перед main.js (его обёртки снаружи всех); отдельной строкой — не мешает слиянию
JS.insert(JS.index('main.js'), 'v76_feel.js')    # v7.6 «ощущение боя»: отклик попаданий, «Играть сразу», итог + карточка, подсказка, автосохранение (отдельной строкой)
JS.insert(JS.index('main.js'), 'v76.js')         # v7.6: номер версии, «Новое в v7.6», меню версий v7.6/v7.5/v7.4 (отдельной строкой)
JS.insert(JS.index('main.js'), 'v76_stats.js')   # v7.6 статистика (pm-stats на Cloudflare) — после v75_stats.js и v75_dendy.js, последним перед main.js
JS.insert(JS.index('main.js'), 'v77.js')         # v7.7: номер версии, «Новое в v7.7», меню версий v7.7/v7.6/v7.5 — после v76.js и v76_stats.js
JS.insert(JS.index('main.js'), 'v78_anomalies.js')   # v7.8: anomalies wave 1 (Singing Vein + 5), bolts, artifacts — after v77.js
JS.insert(JS.index('main.js'), 'v78_support.js')     # v7.8: support calls for CP (crate drop, recon, Grad, artillery), supply crates
JS.insert(JS.index('main.js'), 'v78.js')             # v7.8: version label, "New in v7.8", version menu v7.8/v7.7/v7.6, tips, settings toggle
JS.insert(JS.index('main.js'), 'v781.js')            # v7.8.1: ☰ pause menu (phone + PC), no auto-Dendy, touch action button, phone box select, phone UX
JS.insert(JS.index('main.js'), 'v79_ninja.js')       # v7.9: robo-ninja hero (auto mode, katana + dismemberment, blinks, teleport, duels)
JS.insert(JS.index('main.js'), 'v79_ninja_ui.js')    # v7.9: robo-ninja HUD, duel bars, map markers, phone buttons and gestures
JS.insert(JS.index('main.js'), 'v79_radio.js')       # v7.9: Radio Portal Meteor (EDMITRY music streamed from Cloudflare /radio/) — own line, no other hooks
JS.insert(JS.index('main.js'), 'v79.js')             # v7.9: version label, "New in v7.9", version menu v7.9/v7.8.1/v7.8
JS[-1:-1] = ['v80_gfx.js', 'v80_rts.js', 'v80_craters.js']   # v8.0 (cloud): adaptive graphics, RTS group panel + quick buttons + builder limit 7, crater caliber (separate line)
JS[-1:-1] = ['v81_terrain.js', 'v81_air.js']   # v8.1 (cloud): living meteor - rocks/ridges/hangar/cracks/lakes in the terrain SDF, air strikes (separate line)
JS[-1:-1] = ['v82_common.js', 'v82_swarm.js', 'v82_cons.js']   # v8.2 (cloud): factions - Swarm tunnels + regen, Consortium barriers/repair post/field repair/turrets (separate line)
JS[-1:-1] = ['v83_boss.js', 'v83_mesh.js']   # v8.3 (cloud): faction boss super-units - Consortium "Bastion" super-heavy tank, Swarm "Reaper" walker (separate line)
JS[-1:-1] = ['v84_fix.js', 'v84_tut.js']   # v8.4 (cloud): leftover fixes v8.0-v8.3 + lessons for the new mechanics (separate line)
JS[-1:-1] = ['v85_camp.js', 'v85_cmd.js', 'v85_tut.js']   # v8.5 (cloud): third mode "Commander" (RTT) + squad campaign veterancy between matches + lesson (separate line)
JS[-1:-1] = ['v86_biome.js', 'v86_anom.js', 'v86_fauna.js', 'v86_wx.js', 'v86_tut.js']   # v8.6 (cloud): living meteor stage 2 - sharp-border biomes, anomalies wave 2, Verdan fauna, weather patches, lesson (separate line)
JS[-1:-1] = ['v87_mode.js', 'v87_launch.js', 'v87_fx.js']   # v8.7 (cloud): one button for three modes (ladder), everything launches from the base (pad, sky-portal arc), effects (heavy tracers, F.E.A.R. bullets, possession vortex), version label (separate line)
JS[-1:-1] = ['v88_hud.js', 'v88_fix.js']   # v8.8 (cloud): clean battle HUD (help once, short deduped tips, 4-line fading feed, clean-screen toggle F9, portrait layout), small fixes (Commander barrier placement, Verdans x1.6, no building on the launch pad), version label (separate line)
JS[-1:-1] = ['v89_live.js', 'v89_tut.js']   # v8.9 (cloud): living world - unit requests with rewards (gun from the trunk, gunner seat, trooper pod from the base, orbital cover), hero quests (Owl, Lefty), breakthrough ops on a stalled front (generator / relay, AI too), lesson, version label (separate line)
JS[-1:-1] = ['v810_ai.js', 'v810_cap.js', 'v810_world.js']   # v8.10 (cloud): AI uses Commander abilities + commits to killing bosses, player transfer capsule from the base pad (ride view), Steel fluff anomaly, Rootwalker / Firefly swarm fauna, convoy escort quest, generator/relay models, tips reset, version label (separate line)
JS[-1:-1] = ['v811_perf.js']   # v8.11 (cloud): performance pass - benchmark hooks, cheaper terrain SDF / low level, throttled JS systems, version label (separate line)
JS[-1:-1] = ['v812_pad.js', 'v812_tab.js']   # v8.12 (cloud): gamepad (Gamepad API, all three modes, menus focus ring, glyph hints, rumble, settings page) + tablet layout profile, version label (separate line)
JS[-1:-1] = ['v813_codex.js']   # v8.13 (cloud): encyclopedia - units / buildings / bosses / factions / anomalies / fauna / support / modes / world, live stats from the game tables, search, faction filter, met-in-battle lock, menu + pause button, version label (separate line)
JS[-1:-1] = ['v814_fb.js']   # v8.14 (cloud): playtest feedback mode - recording overlay (version, match timer, clock, FPS, graphics, mode, faction, device, session), notes hotkey (Backslash / View+Start / phone button) with canvas screenshot + game state into IndexedDB, notes screen with JSON export, version label (separate line)
JS[-1:-1] = ['v815_ui.js']   # v8.15 (cloud): interface levels Simple (phone default) / Normal / Full, clean pause + More, mode reveal, phone RTS/RTT declutter (1-line messages + log, icon bar), crisp unit markers + tap snap, 3rd-person toggle, three main lessons, aim states (separate line; ?ui815=0 = off)
JS[-1:-1] = ['v815_ver.js']   # v8.15 merge: version label once over v7.9 (v8.15 current, v7.9 in old versions) - after all v8 modules, before v79_lang.js
JS.insert(JS.index('main.js'), 'v79_lang.js')        # v7.9 l10n: more languages (lang/*.json) + new language selector — wraps tr/N2/menus, keep last before main.js
JS.insert(JS.index('main.js'), 'v8x_dict.js')        # v8.15 merge: translations of the v8.0-v8.14 texts (uz/tg/zh/es/pt-BR/he/vi), keyed by English
JS.insert(JS.index('main.js'), 'v815_l10n.js')       # v8.15 merge: v8.15 strings + plugs V8X into v79_lang (v7.9 dictionaries win) - after v79_lang.js
JS.insert(JS.index('main.js'), 'v816_fixes.js')      # v8.16: T42 fixes — CAM card hides under any menu (phone sheet, tour), smaller fainter building float labels, clean screen (F9) hides 3D world markers (?fix816=0)
JS.insert(JS.index('v815_ver.js') + 1, 'v816_ver.js')   # v8.16: version label 8.16, v8.15 to old versions
JS.insert(JS.index('v75_assets.js') + 1, 'v817_hq.js')  # v8.17 (T54): HQ hard-surface models - per-model cap for AS75 placement, ?hq817=0 off (right after v75_assets.js)
JS.insert(JS.index('v816_ver.js') + 1, 'v817_ver.js')   # v8.17: version label 8.17, v8.16 to old versions
JS.insert(JS.index('v8x_dict.js') + 1, 'dict_fill_1107.js')   # v8.18: l10n fill 07.11 (D:\AI\pm_l10n) - 100% strings on 9 languages, only adds missing V8X keys (before v815_l10n.js)
JS[JS.index('dict_fill_1107.js') + 1:JS.index('dict_fill_1107.js') + 1] = sorted(f for f in os.listdir(src) if f.startswith('dict_') and f.endswith('_1107.js') and f not in ('dict_fill_1107.js', 'dict_fix_1107.js'))   # v8.18: new languages dict_<code>_1107.js - drop the file here, the row in v818_lang.js L818.MORE turns it on
JS.insert(JS.index('v815_l10n.js') + 1, 'v818_subs.js')   # v8.18: subtitles of the voice lines for languages without own voice pack (SUB818)
JS.insert(JS.index('v818_subs.js') + 1, 'v818_lang.js')   # v8.18: L818 - new languages one line each, EN fallback (never RU), silent voice + translated subtitles, RU/EN/fan in simple main menu + pause (?lang818=0)
JS.insert(JS.index('v818_lang.js') + 1, 'dict_fix_1107.js')   # v8.18: reviewed overrides after fill and L79.lookup wrappers (uz/tg/he and other corrections)
JS.insert(JS.index('v811_perf.js') + 1, 'v818_gfx.js')   # v8.18: GFX818 - ADG80 warm-up 10 s / long frames, floor 0.75 on discrete GPUs, new key pm_gfx818, render size in FPS line / F3 / settings (?gfx818=0)
JS.insert(JS.index('main.js'), 'v818_ctl.js')            # v8.18 (T67): Tab = 3 modes everywhere, no P, X = possess per mode, Alt fix, mode banner, no phone buttons on PC (?ctl818=0)
JS.insert(JS.index('main.js'), 'v819_gnd168.js')         # v8.19 (T168): models sit on the ground - terrain-conforming contact shadows (ST70 buildings + AS75 models, old flat AS75 disc off) + base darkening of ST70 meshes (?gnd168=0)
JS.insert(JS.index('v817_ver.js') + 1, 'v818_ver.js')   # v8.18: version label 8.18, v8.17 to old versions
JS[-1:-1] = ['v819_tracers.js']   # v8.19 (T92): readable rifle tracers — 0.15 m bolt, muzzle flash, impact spark, glowing smoke trail at any gfx level (?t92=0)
JS.insert(JS.index('v818_ver.js') + 1, 'v819_t131.js')   # v8.19 (T131, Kimi): детализация поверхностей — бетон площадок + грунт вблизи (?t131=0)
for f in JS:
    if os.path.exists(src + f): html += '// ---- ' + f + '\n' + r(f) + '\n'
html += '</script>\n</body>\n</html>\n'
os.makedirs(os.path.join(os.path.dirname(src[:-1]), 'dist'), exist_ok=True)
out = os.path.join(os.path.dirname(src[:-1]), 'dist', sys.argv[1] if len(sys.argv) > 1 else 'portal_meteor_v5.html')
open(out, 'w', encoding='utf-8', newline='\n').write(html)
print(out, len(html), 'bytes')
