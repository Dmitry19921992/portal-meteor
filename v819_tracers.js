// =====================================================================
//  T92 (v8.19) — ТРАССЕРЫ ВИНТОВКИ ЧИТАЕМЫЕ: толстый светящийся болт ~0.15 м,
//  кометный хвост, вспышка у дула, искра в точке попадания, дымно-светящийся
//  след, который остаётся на ЛЮБОМ уровне графики, где сидит игрок (T71 §2,
//  ориентир Фитба check/t71_tracers).
//  Хуки — обёртка addTracer (после FX87, чтобы править поля трассера поверх v8.7).
//  Лёгкие (не heavy87) трассеры: T.w = 0.15, кометное ядро h87, жаркий след из
//  пула частиц (heat > 0 — свечение первые ~0.25 с жизни дыма, потом серая вуаль).
//  Вспышка у дула и искра попадания — только в ~40 м от камеры (пулы без роста).
//  Выключить: ?t92=0. Ошибка модуля не роняет игру (safe).
// =====================================================================
const T92 = {
  on: (() => { try { return new URLSearchParams(location.search).get('t92') !== '0'; } catch (e){ return true; } })(),
  err: {}, pool: [], POOLN: 40, poolI: 0,
  stats: { bolts: 0, flashes: 0, sparks: 0, puffs: 0 },
  safe(fn, tag){ try { return fn(); } catch (e){ if (!this.err[tag]){ this.err[tag] = 1; console.warn('T92 ' + tag, e); } } },
  lv(){ return typeof ADG80 !== 'undefined' ? clamp(ADG80.L | 0, 0, 3) : 1; },
  last(){
    const T = TRACERS[(trcI + TRC_N - 1) % TRC_N];
    return (T && T.on) ? T : null;
  },
  // главный хук: выстрел уже прошёл gunShoot → addTracer → (FX87.onTracer) → сюда
  onTracer(a, b, team, inc){
    const T = this.last(); if (!T) return;
    if (!T.h87){   // лёгкий трассер (винтовки/пулемёты, не «болтеры» v8.7)
      T.w = 0.15;                 // ширина ~0.15 м — читается у камеры (T71 §2)
      T.h87 = 1;                  // кометный хвост в FX87.gather (ядро при L>=1)
      T.len87 = 26;               // длина болта ~26 м — «конус и хвост», не точка
      this.stats.bolts++;
    }
    const c = S.cam ? S.cam.pos : null; if (!c) return;
    const dA = dist(a, c), dB = dist(b, c);
    if (dA < 42) this.muzzle(a, T.d, team, dA);
    if (dB < 42) this.impact(b, team);
    this.trail(T, a, c);
  },
  // вспышка у дула: короткий тёплый свет + язык пламени + пара искр вперёд
  muzzle(a, dir, team, d){
    const k = clamp(1 - d / 42, 0.15, 1);
    const tint = team === 0 ? [1.0, 1.0, 1.0] : [1.0, 0.72, 0.55];   // чужой — теплее/краснее
    addLight(a, [3.4 * k * tint[0], 2.2 * k * tint[1], 1.1 * k * tint[2]], 8 + 4 * k, 0.09, 0.006);
    S.fx.push({ type: 'fire', pos: [a[0], a[1], a[2]], r0: 0.13, r1: 0.5, life: 0.13, t: 0, inten: 1.7 });
    if (S.fx.length > 80) S.fx.splice(0, S.fx.length - 80);
    burst(a, 2, 5, 0.1);
    this.stats.flashes++;
  },
  // искра в точке попадания: свет + раскаленные осколки + короткая вспышка
  impact(b, team){
    addLight(b, [2.8, 1.7, 0.7], 6, 0.09, 0.005);
    S.fx.push({ type: 'fire', pos: [b[0], b[1], b[2]], r0: 0.09, r1: 0.38, life: 0.15, t: 0, inten: 1.5 });
    if (S.fx.length > 80) S.fx.splice(0, S.fx.length - 80);
    burst(b, 3, 7, 0.18);
    this.stats.sparks++;
  },
  // жаркий дымный след: частицы вдоль линии у камеры, свечение ≥0.25 с (heat),
  // затем серая вуаль. Работает на ВСЕХ уровнях графики, включая L===0.
  trail(T, a, c){
    if (S.attract && !(typeof OPER !== 'undefined' && OPER.on)) return;
    const d = T.d, L = this.lv();
    const s = clamp((c[0] - a[0]) * d[0] + (c[1] - a[1]) * d[1] + (c[2] - a[2]) * d[2], 0, T.L);
    const qx = a[0] + d[0] * s - c[0], qy = a[1] + d[1] * s - c[1], qz = a[2] + d[2] * s - c[2];
    if (qx * qx + qy * qy + qz * qz > 1600) return;   // далеко от камеры — не видно
    const n = 2 + L + (S.slow > 0.3 ? 2 : 0);
    for (let i = 0; i < n; i++){
      const h = clamp(s + (random() - 0.55) * 13, 0.5, T.L - 0.5);
      const p = this.puff(); if (!p) break;
      p.pos[0] = a[0] + d[0] * h; p.pos[1] = a[1] + d[1] * h; p.pos[2] = a[2] + d[2] * h;
      p.vel[0] = (random() - 0.5) * 0.25; p.vel[1] = (random() - 0.5) * 0.25; p.vel[2] = (random() - 0.5) * 0.25;
      p.t = 0; p.life = 1.1 + random() * 0.4;   // heat светит первую четверть → ≥0.25 с
      p.r0 = 0.1; p.r1 = 0.5; p.dens = 0.28; p.grey = 0.78; p.heat = 2.3;
      S.fx.push(p); this.stats.puffs++;
    }
  },
  puff(){
    for (let k = 0; k < this.POOLN; k++){
      const i = (this.poolI + k) % this.POOLN;
      let p = this.pool[i];
      if (!p){ p = this.pool[i] = { type: 'smoke', pos: [0, 0, 0], vel: [0, 0, 0], r0: 0.1, r1: 0.5, life: 1, t: 1, grey: 0.8, dens: 0.3, heat: 0 }; this.poolI = (i + 1) % this.POOLN; return p; }
      if (p.t >= p.life && S.fx.indexOf(p) < 0){ this.poolI = (i + 1) % this.POOLN; return p; }
    }
    return null;
  },
};
if (T92.on){
  const at0 = addTracer;
  addTracer = function(a, b, team, w, inc){ const r = at0.apply(this, arguments); T92.safe(() => T92.onTracer(a, b, team, inc), 'trc'); return r; };
  // ширина болта держится с расстоянием: у камеры ~0.15 м, дальше растёт (потолок 0.6 м),
  // чтобы след читался на любой дистанции, а не схлопывался в 1px (T71 §2, ориентир t71_tracers)
  const tg0 = tracersGather;
  tracersGather = function(push, near){
    if (!S.cam) return tg0(push, near);
    const cam = S.cam.pos;
    const p2 = (a, w, b, ty) => {
      const dx = a[0] - cam[0], dy = a[1] - cam[1], dz = a[2] - cam[2];
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      push(a, Math.max(w, Math.min(d * 0.01, 0.6)), b, ty);
    };
    return tg0(p2, near);
  };
}
