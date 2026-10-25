# v7.5 РЕЛИЗ (ветка v75rel): itch-архив с меню «Версия игры» + папка assets3d/ (3D-модели окружения, грузятся по требованию).
#   dist/itch75/index.html            — v7.5 (VER75_ARCHIVE = true)
#   dist/itch75/versions/<id>.html    — старые версии: свои ключи localStorage (префикс pmv<id>:) + кнопка «↩ Версии»
#   dist/portal_meteor_v7_5_itch.zip  — то, что загружается на itch (HTML5, index.html в корне)
# python mkitch75.py            — собрать и напечатать размеры (правило: стартовая загрузка ≤ 15 МБ, zip ≤ 100 МБ)
import os, io, zipfile, shutil
D = 'D:/AI/pm_v6/dist/'
G = 'C:/Users/klaas/OneDrive/Рабочий стол/portal meteor/game/'
VERS = [  # id, файл-источник, подпись
    ('v7_4', G + 'portal_meteor_v7_4.html', 'v7.4'),
    ('v7_3', G + 'old/portal_meteor_v7_3.html', 'v7.3'),
    ('v7_0', G + 'old/portal_meteor_v7_0.html', 'v7.0'),
    ('v6', G + 'old/portal_meteor_v6.html', 'v6.0'),
    ('v5', G + 'old/portal_meteor_v5.html', 'v5.0'),
    ('v4', G + 'old/portal_meteor_v4.html', 'v4.0'),
    ('v3', G + 'old/portal_meteor_v3.html', 'v3.0'),
    ('v2', G + 'old/portal_meteor_v2.html', 'v2.0'),
    ('v1', G + 'old/portal_meteor.html', 'v1'),
]
OUT = D + 'itch75r/'
def shim(vid):
    p = 'pm' + vid + ':'
    return ('<script>/* v7.5-архив: у этой версии свои ключи localStorage (' + p + '…) — сохранения v7.5 не трогаются */\n'
            '(function(){try{var P="' + p + '",S=Storage.prototype,g=S.getItem,s=S.setItem,r=S.removeItem,L=window.localStorage;'
            'window.__pmLS={g:function(k){return g.call(L,k)},s:function(k,v){return s.call(L,k,v)}};'
            'S.getItem=function(k){return g.call(this,this===L?P+k:k)};S.setItem=function(k,v){return s.call(this,this===L?P+k:k,v)};'
            'S.removeItem=function(k){return r.call(this,this===L?P+k:k)};}catch(e){}})();</script>\n')
def back(label):
    return ('<div id="pmv75back" title="Выбрать другую версию / choose another version" style="position:fixed;left:6px;bottom:6px;z-index:2147483647;font:600 11px Arial,sans-serif;'
            'background:rgba(10,12,14,.72);color:#e8dcb8;border:1px solid rgba(214,198,154,.5);padding:5px 9px;border-radius:5px;cursor:pointer;opacity:.8;user-select:none">↩ ' + label + ' · версии / versions</div>\n'
            '<script>(function(){var b=document.getElementById("pmv75back");var go=function(e){e.preventDefault();e.stopPropagation();location.href="../index.html?versions=1"};'
            'b.addEventListener("click",go,true);b.addEventListener("touchend",go,true);b.addEventListener("mousedown",function(e){e.stopPropagation()},true);b.addEventListener("touchstart",function(e){e.stopPropagation()},{capture:true,passive:true});})();</script>\n')
def main():
    if os.path.exists(OUT): shutil.rmtree(OUT)
    os.makedirs(OUT + 'versions')
    idx = io.open(D + 'v75r.html', encoding='utf-8').read()
    assert '/*VER75_ARCHIVE*/false' in idx
    idx = idx.replace('/*VER75_ARCHIVE*/false', '/*VER75_ARCHIVE*/true', 1)
    io.open(OUT + 'index.html', 'w', encoding='utf-8', newline='\n').write(idx)
    rows = [('index.html (v7.5)', len(idx.encode('utf-8')))]
    for vid, src, label in VERS:
        if not os.path.exists(src):   # после релиза v7.5 файл v7.4 переезжает в game/не_сыгранные (или old)
            for d in (G, G + 'old/', G + 'не_сыгранные/'):
                if os.path.exists(d + os.path.basename(src)): src = d + os.path.basename(src); break
        t = io.open(src, encoding='utf-8').read()
        m = '<meta charset="utf-8">'
        i = t.find(m); assert i >= 0, src
        t = t[:i + len(m)] + '\n' + shim(vid) + t[i + len(m):]
        j = t.rfind('</body>')
        t = (t[:j] + back(label) + t[j:]) if j >= 0 else t + back(label)
        io.open(OUT + 'versions/' + vid + '.html', 'w', encoding='utf-8', newline='\n').write(t)
        rows.append(('versions/' + vid + '.html', len(t.encode('utf-8'))))
    shutil.copytree(D + 'assets3d', OUT + 'assets3d')
    global A3
    A3 = sorted(f for f in os.listdir(OUT + 'assets3d') if f.endswith('.js'))
    rows.append(('assets3d/ (' + str(len(A3)) + ' файлов, по требованию)', sum(os.path.getsize(OUT + 'assets3d/' + f) for f in A3)))
    z = D + 'portal_meteor_v7_5_itch_rel.zip'
    if os.path.exists(z): os.remove(z)
    with zipfile.ZipFile(z, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as Z:
        for name, _ in [('index.html', 0)] + [('versions/' + v[0] + '.html', 0) for v in VERS]:
            Z.write(OUT + name, name)
        for f in A3:
            Z.write(OUT + 'assets3d/' + f, 'assets3d/' + f)
    tot = sum(r[1] for r in rows)
    for n, b in rows: print(f'{n:28s} {b / 1e6:8.2f} MB')
    zs = os.path.getsize(z)
    print(f'{"ИТОГО распаковано":28s} {tot / 1e6:8.2f} MB')
    print(f'{"zip для itch":28s} {zs / 1e6:8.2f} MB  ({z})')
    print('стартовая загрузка (index.html):', round(rows[0][1] / 1e6, 2), 'MB', '— OK (≤ 15 МБ)' if rows[0][1] <= 15e6 else '— ПРЕВЫШЕНО 15 МБ')
    print('zip:', 'OK (≤ 100 МБ)' if zs <= 100e6 else 'ПРЕВЫШЕНО 100 МБ')
main()
