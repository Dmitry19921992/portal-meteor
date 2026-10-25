// загрузка: шейдер собран, меню, новая игра; спавн новой техники у игрока
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 240; i++){ if (document.getElementById('boot').classList.contains('done') && MENU.cur) break; if (/Ошибка шейдера|Shader error/.test(document.getElementById('bootTxt').textContent)) return { shaderErr: document.getElementById('bootTxt').textContent }; await sleep(1000); }
const out = { booted: !!SCENE, bootTxt: document.getElementById('bootTxt').textContent };
if (!S.me || S.attract){ MENU.newGame(); await sleep(2500); }
out.me = S.me && S.me.cls;
const base = norm(S.me.pos), t1 = anyTangent(base);
const made = [];
['raider', 'mlrs', 'cat'].forEach((vk, i) => {
  for (const team of [0, 1]){
    const dir = offsetOnSphere(base, t1, 14 + i * 9 + team * 4);
    const v = V2.make(surfacePoint(rotAxis(dir, base, team * 0.4), 1.5), team, vk);
    v.manualUntil = 1e9; v.order = 'hold'; v.goal = v.pos;
    made.push(v);
  }
});
for (let i = 0; i < 60; i++) update(1 / 60);
out.made = made.map(v => ({ vk: v.vk, team: v.team, hp: v.hp, label: groupLabel(v), name: V2.name(v), grounded: v.grounded, alive: v.alive }));
out.products = ['raider', 'mlrs', 'cat'].map(k => [k, canProduce(0, k)]);
return out;
