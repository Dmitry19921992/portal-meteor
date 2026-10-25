# copies of v7.5 / dendy / assets tests for the release build: screenshots go to shots75rel/t/ (old branches' shots untouched)
# v75_* need v73_common (names v75_r*.js -> t75r runs them via v73run); v75d_/v75a_ ones run bare via cdp73 (names r75d_/r75a_)
import io, os
S = 'D:/AI/pm_v6/tests/'
os.makedirs('D:/AI/pm_v6/shots75rel/t/v75a', exist_ok=True)
M = {'v75_pc.js': 'v75_rpc.js', 'v75_build.js': 'v75_rbuild.js', 'v75_cine.js': 'v75_rcine.js', 'v75_ph.js': 'v75_rph.js',
     'v75d_smoke.js': 'r75d_smoke.js', 'v75d_phone.js': 'r75d_phone.js', 'v75a_smoke.js': 'r75a_smoke.js'}
for a, b in M.items():
    t = io.open(S + a, encoding='utf-8-sig').read().replace('D:/AI/pm_v6/shots/', 'D:/AI/pm_v6/shots75rel/t/')
    if a == 'v75a_smoke.js':   # 3D-модели в релизе по умолчанию выключены — тест включает их сам и в конце возвращает «выкл»
        t = t.replace("SET.lang = 'ru'; SET.hintsOn = false;", "SET.lang = 'ru'; SET.hintsOn = false; SET.as75 = true;")
        t = t.replace('SET.as75 = true; await sleep(400);\n} catch', 'await sleep(400);\n} catch')
    io.open(S + b, 'w', encoding='utf-8', newline='\n').write(t)
    print(b, len(t))
