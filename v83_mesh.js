// =====================================================================
//  v8.3 — МОДЕЛИ СВЕРХЮНИТОВ (BOSS83): процедурные меши v7.0 (ST70, растеризация с тестом глубины)
//   «Бастион»: корпус на гусеницах (беж/олива), главная башня с длинной пушкой, 2 пулемётные башенки, ракетная кассета;
//     корма — решётки двигателя и светящиеся выхлопы (слабое место).
//   «Жнец»: панцирь тёмной стали с красными визорами, излучатель луча, светящееся ядро под брюхом,
//     6 ног из двух сегментов — шаги «треногой» с простым IK (колено по двум длинам), дрожь и пыль при шаге.
//   Цеха: «Сборочный цех» (ангар с аркой, воротами и краном) и «Инкубатор» (купол с рёбрами и красными капсулами).
//  Хук — обёртка ST70.collect (после v8.2).
// =====================================================================
if (typeof ST70_DEF !== 'undefined'){
  const C = C70, OL = [0.20, 0.22, 0.13], SW = [0.075, 0.08, 0.095], SW2 = [0.12, 0.125, 0.14], RD = [3.4, 0.22, 0.08];
  Object.assign(ST70_DEF, {
    b83hull(){   // ~14 × 8.4 м, начало — на грунте
      const g = G69();
      for (const s of [-1, 1]){
        g69box(g, [s * 3.3, 1.15, 0], [0.85, 1.1, 6.5], 0.55, C.DK, 2);                       // гусеница
        for (const z of [-6.0, 6.0]) g69tube(g, [s * 3.3 - 0.9, 1.15, z], [s * 3.3 + 0.9, 1.15, z], 1.0, 1.0, 12, C.ST, 2);
        for (let k = 0; k < 6; k++) g69tube(g, [s * 4.17, 0.85, -4.6 + k * 1.84], [s * 4.22, 0.85, -4.6 + k * 1.84], 0.55, 0.55, 10, C.ST, 2);   // катки
        g69box(g, [s * 3.35, 2.05, 0.2], [1.0, 0.5, 5.9], 0.12, C.P, 0);                     // экраны
        g69box(g, [s * 4.37, 2.0, 0.2], [0.04, 0.12, 5.6], 0.02, OL, 1);                      // полоса
      }
      g69box(g, [0, 1.6, 0], [2.5, 0.9, 6.5], 0.2, OL, 1);                                    // нижний корпус
      g69box(g, [0, 2.95, -0.2], [3.0, 0.75, 5.6], 0.3, C.P, 0);                              // верхний корпус
      g69with(g, M34.ch(M34.T(0, 2.75, 5.9), M34.RX(0.62)), () => g69box(g, [0, 0, 0], [2.95, 0.65, 1.0], 0.2, C.P, 0));   // лобовой лист
      g69box(g, [0, 3.0, 6.55], [2.2, 0.12, 0.08], 0.03, OL, 1);
      for (const s of [-1, 1]){ g69box(g, [s * 2.4, 2.9, 6.9], [0.22, 0.14, 0.08], 0.04, C.WH, 5); g69box(g, [s * 1.2, 3.3, 5.6], [0.4, 0.25, 0.35], 0.08, C.DK, 2); }
      // корма — двигатель (слабое место): решётки, выхлопы со свечением
      g69box(g, [0, 3.78, -3.6], [2.3, 0.1, 1.9], 0.05, C.DK, 2);
      for (let k = 0; k < 7; k++) g69box(g, [0, 3.9, -5.1 + k * 0.5], [2.1, 0.05, 0.08], 0.02, C.ST, 2);
      g69box(g, [0, 2.6, -6.05], [2.6, 0.8, 0.25], 0.1, C.DK, 2);
      for (const s of [-1, 1]){
        g69tube(g, [s * 1.5, 3.2, -5.9], [s * 1.5, 3.2, -6.7], 0.32, 0.36, 10, C.ST, 2);
        g69box(g, [s * 1.5, 3.2, -6.72], [0.24, 0.24, 0.03], 0.1, C.AMB, 5);
        g69box(g, [s * 0.6, 2.4, -6.32], [0.35, 0.06, 0.03], 0.02, C.RED, 5);
      }
      for (let k = 0; k < 4; k++) g69box(g, [-2.0 + k * 1.33, 3.75, -1.0], [0.42, 0.06, 0.6], 0.04, OL, 1);   // ящики ЗИП
      g69tube(g, [-2.2, 3.7, -5.2], [-2.35, 8.2, -5.4], 0.035, 0.02, 4, C.ST, 2);          // антенна
      g69box(g, [-2.35, 8.25, -5.4], [0.05, 0.05, 0.05], 0.02, C.RED, 5);
      return g;
    },
    b83tur(){   // главная башня: начало — погон
      const g = G69();
      st70lathe(g, 0, 0, 0, [[0, 2.3], [0.35, 2.3], [0.42, 0]], 24, OL, 1);
      g69box(g, [0, 1.0, 0.2], [2.0, 0.72, 2.5], 0.45, C.P, 0);
      g69box(g, [0, 1.0, -2.6], [1.7, 0.58, 0.8], 0.3, C.P, 0);
      g69box(g, [0, 1.0, 2.75], [1.05, 0.62, 0.4], 0.15, C.DK, 2);
      g69tube(g, [0, 1.05, 2.9], [0, 1.05, 10.4], 0.44, 0.34, 14, C.ST, 2);
      g69tube(g, [0, 1.05, 6.3], [0, 1.05, 7.6], 0.56, 0.56, 14, C.DK, 2);
      g69box(g, [0, 1.05, 10.55], [0.58, 0.42, 0.5], 0.12, C.DK, 2);
      st70lathe(g, -1.0, 1.7, -0.6, [[0, 0.6], [0.45, 0.55], [0.6, 0]], 14, OL, 1);
      g69box(g, [-1.0, 2.05, -0.6], [0.3, 0.06, 0.3], 0.05, C.WH, 4);
      for (const s of [-1, 1]) for (let k = 0; k < 3; k++) g69tube(g, [s * 2.0, 1.45, 1.6 - k * 0.4], [s * 2.35, 1.7, 1.75 - k * 0.4], 0.09, 0.09, 6, C.DK, 2);
      g69box(g, [0, 1.75, 0.3], [1.4, 0.04, 0.05], 0.01, OL, 1);
      return g;
    },
    b83mg(){   // пулемётная башенка: начало — основание
      const g = G69();
      st70lathe(g, 0, 0, 0, [[0, 0.8], [0.35, 0.78], [0.7, 0.55], [0.85, 0]], 16, C.P, 0);
      g69box(g, [0, 0.45, 0.55], [0.5, 0.32, 0.12], 0.06, OL, 1);
      for (const s of [-1, 1]) g69tube(g, [s * 0.14, 0.45, 0.5], [s * 0.14, 0.45, 2.4], 0.075, 0.06, 6, C.DK, 2);
      return g;
    },
    b83pod(){   // ракетная кассета 3×2
      const g = G69();
      g69box(g, [0, 0.25, 0], [0.5, 0.25, 0.5], 0.08, C.ST, 2);
      g69box(g, [0, 1.0, 0], [1.25, 0.62, 1.1], 0.12, C.P, 0);
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) g69tube(g, [-0.75 + i * 0.75, 0.72 + j * 0.56, 0.95], [-0.75 + i * 0.75, 0.72 + j * 0.56, 1.15], 0.22, 0.22, 8, C.DK, 2);
      g69box(g, [0, 1.65, 0], [1.1, 0.04, 0.9], 0.02, OL, 1);
      return g;
    },
    r83body(){   // панцирь «Жнеца»: начало — центр тела
      const g = G69();
      st70lathe(g, 0, -0.3, 0, [[0, 4.3], [0.6, 4.1], [1.3, 3.5], [1.9, 2.5], [2.3, 1.3], [2.45, 0]], 30, SW, 2);
      g69with(g, M34.ch(M34.T(0, -0.3, 0), M34.RX(PI)), () => st70lathe(g, 0, 0, 0, [[0, 4.1], [0.7, 3.3], [1.2, 1.7], [1.35, 0]], 26, C.DK, 2));
      for (let k = 0; k < 9; k++){ const a = -1.45 + k * 0.3625;
        g69with(g, M34.RY(a), () => { g69tube(g, [0, -0.2, 4.3], [0, 1.0, 3.6], 0.17, 0.13, 6, SW2, 2); g69tube(g, [0, 1.0, 3.6], [0, 1.95, 2.2], 0.13, 0.1, 6, SW2, 2); g69tube(g, [0, 1.95, 2.2], [0, 2.2, 0.4], 0.1, 0.06, 6, SW2, 2); }); }
      for (const s of [-1, 1]){ g69with(g, M34.RY(s * 0.5), () => g69box(g, [0, 1.25, -1.6], [0.9, 0.12, 1.5], 0.1, C.P, 0)); }
      for (let k = 0; k < 5; k++){ const a = -0.5 + k * 0.25; g69box(g, [Math.sin(a) * 4.05, 0.45, Math.cos(a) * 4.05], [0.22, 0.09, 0.06], 0.04, RD, 5); }   // визоры
      g69box(g, [0, 0.0, 4.15], [1.6, 0.06, 0.08], 0.03, RD, 5);
      // ядро под брюхом (слабое место) и клетка вокруг
      st70lathe(g, 0, -1.9, 0, [[-1.2, 0], [-0.85, 0.85], [0, 1.2], [0.85, 0.85], [1.2, 0]], 18, [1, 1, 1], 3);
      for (let k = 0; k < 6; k++){ const a = k * PI / 3; g69tube(g, [Math.sin(a) * 1.6, -1.2, Math.cos(a) * 1.6], [Math.sin(a) * 0.5, -3.3, Math.cos(a) * 0.5], 0.09, 0.06, 5, C.DK, 2); }
      for (let k = 0; k < 6; k++){ const a = BOSS83M.HIP[k]; st70lathe(g, Math.sin(a) * 3.5, -0.9, Math.cos(a) * 3.5, [[-0.6, 0], [0, 0.75], [0.6, 0]], 12, C.ST, 2); }
      g69tube(g, [0, 2.1, -1.2], [0, 4.6, -1.6], 0.05, 0.02, 4, C.ST, 2); g69box(g, [0, 4.65, -1.6], [0.06, 0.06, 0.06], 0.02, RD, 5);
      return g;
    },
    r83head(){   // излучатель луча искажения (вдоль +Z)
      const g = G69();
      g69lathe(g, 0, 0, [[-1.4, 0], [-1.4, 1.0], [0.4, 1.15], [1.7, 0.8], [2.5, 0.55], [2.5, 0]], 18, SW2, 2);
      g69torus(g, [0, 0, 2.55], 0.52, 0.12, 18, 6, [1, 1, 1], 3);
      g69box(g, [0, 0, 2.52], [0.35, 0.35, 0.03], 0.3, RD, 5);
      for (let k = 0; k < 3; k++){ const a = k * 2.094 + 0.5; g69tube(g, [Math.sin(a) * 0.95, Math.cos(a) * 0.95, 0.2], [Math.sin(a) * 0.6, Math.cos(a) * 0.6, 3.4], 0.1, 0.04, 5, C.DK, 2); }
      g69box(g, [0, -0.9, -0.5], [0.6, 0.5, 0.8], 0.15, C.P, 0);
      return g;
    },
    r83leg1(){   // бедро: вдоль +Y, 7 м
      const g = G69();
      st70lathe(g, 0, 0, 0, [[-0.7, 0], [0, 0.7], [0.7, 0]], 12, C.ST, 2);
      g69tube(g, [0, 0, 0], [0, BOSS83M.L1, 0], 0.55, 0.4, 8, SW, 2);
      g69box(g, [0, BOSS83M.L1 * 0.45, 0.35], [0.5, BOSS83M.L1 * 0.32, 0.18], 0.12, C.P, 0);
      g69tube(g, [0.45, 0.6, 0], [0.35, BOSS83M.L1 - 0.6, 0], 0.12, 0.1, 5, C.DK, 2);
      return g;
    },
    r83leg2(){   // голень: вдоль +Y, 9.5 м, коготь на конце
      const g = G69();
      st70ring(g, 0, 0, 0, 0.62, 0.12, [1, 1, 1], 3, 14);            // сустав со свечением
      st70lathe(g, 0, 0, 0, [[-0.55, 0], [0, 0.55], [0.55, 0]], 12, C.ST, 2);
      g69tube(g, [0, 0, 0], [0, BOSS83M.L2 - 0.6, 0], 0.42, 0.18, 8, SW2, 2);
      g69tube(g, [0, BOSS83M.L2 - 0.6, 0], [0, BOSS83M.L2 + 0.15, 0], 0.18, 0.02, 6, C.DK, 2);
      for (const s of [-1, 1]) g69tube(g, [0, BOSS83M.L2 - 1.0, 0], [s * 0.5, BOSS83M.L2 + 0.1, 0.35], 0.1, 0.02, 4, C.DK, 2);
      g69box(g, [0, BOSS83M.L2 * 0.3, -0.3], [0.32, BOSS83M.L2 * 0.2, 0.12], 0.08, C.P, 0);
      return g;
    },
    asm83c(){   // «Сборочный цех»: ангар 10 × 11 м с аркой, воротами и краном
      const g = G69();
      g69box(g, [0, 0, 0], [5.4, 0.45, 6.0], 0.1, C.CON2, 1);
      for (const s of [-1, 1]) g69box(g, [s * 4.6, 3.4, 0], [0.45, 3.0, 5.6], 0.1, C.P, 0);
      g69box(g, [0, 3.4, -5.3], [4.6, 3.0, 0.35], 0.1, C.P, 0);
      g69tube(g, [0, 6.0, -5.6], [0, 6.0, 5.6], 4.9, 4.9, 22, OL, 1);
      for (let k = 0; k < 5; k++) g69tube(g, [0, 6.0, -5.0 + k * 2.5], [0, 6.0, -4.8 + k * 2.5], 5.05, 5.05, 22, C.ST, 2);
      g69box(g, [0, 3.0, 5.5], [4.0, 2.7, 0.12], 0.05, C.DK, 2);                       // ворота
      for (let k = 0; k < 6; k++) g69box(g, [-3.4 + k * 1.36, 5.9, 5.65], [0.36, 0.08, 0.03], 0.02, k % 2 ? C.AMB : C.DK, k % 2 ? 5 : 2);
      g69box(g, [0, 0.55, 5.9], [4.0, 0.08, 0.2], 0.02, C.AMB, 5);
      for (const s of [-1, 1]){ g69with(g, M34.T(s * 5.2, 0.4, 6.6), () => st70mast(g, 9.5, 0.35, 0.25, 0.05)); }
      g69box(g, [0, 10.1, 6.6], [5.6, 0.3, 0.35], 0.06, C.AMB, 0);
      g69tube(g, [1.5, 9.8, 6.6], [1.5, 7.2, 6.6], 0.03, 0.03, 4, C.ST, 2); g69box(g, [1.5, 7.1, 6.6], [0.25, 0.18, 0.25], 0.05, C.DK, 2);
      for (const x of [-2.5, 2.5]) g69box(g, [x, 10.9, -1], [0.6, 0.4, 0.6], 0.1, C.ST, 2);
      for (const s of [-1, 1]) g69box(g, [s * 5.1, 6.6, 5.7], [0.08, 0.08, 0.08], 0.02, C.RED, 5);
      return g;
    },
    asm83s(){   // «Инкубатор»: купол с рёбрами, красные капсулы, шпиль, светящаяся пасть
      const g = G69();
      st70lathe(g, 0, -0.5, 0, [[0, 5.8], [1.2, 5.6], [2.6, 4.9], [3.9, 3.7], [5.0, 2.2], [5.8, 0.9], [6.1, 0]], 30, SW, 2);
      for (let k = 0; k < 10; k++){ const a = k * PI / 5;
        g69with(g, M34.RY(a), () => { g69tube(g, [0, -0.5, 6.0], [0, 2.5, 5.0], 0.25, 0.2, 6, SW2, 2); g69tube(g, [0, 2.5, 5.0], [0, 4.8, 3.0], 0.2, 0.14, 6, SW2, 2); g69tube(g, [0, 4.8, 3.0], [0, 5.9, 0.6], 0.14, 0.08, 6, SW2, 2); }); }
      for (let k = 0; k < 5; k++){ const a = k * 1.2566 + 0.6; st70lathe(g, Math.sin(a) * 6.0, 0.3, Math.cos(a) * 6.0, [[-0.9, 0], [-0.5, 0.75], [0.4, 0.8], [1.1, 0]], 12, [1, 1, 1], 3); }
      st70ring(g, 0, 1.6, 5.15, 1.5, 0.16, [1, 1, 1], 3, 22);
      g69box(g, [0, 1.6, 5.3], [1.35, 1.3, 0.05], 0.6, [0.01, 0.01, 0.01], 2);
      g69tube(g, [0, 5.2, 0], [0, 9.5, 0], 0.4, 0.05, 8, C.DK, 2);
      for (let k = 0; k < 3; k++) g69box(g, [0, 6.2 + k * 1.1, 0], [0.12, 0.12, 0.12], 0.04, RD, 5);
      g69box(g, [0, 0.5, -5.8], [1.2, 0.08, 0.06], 0.02, C.P, 0);
      return g;
    },
  });
}
// ---------------------------------------------------------------- ноги «Жнеца»
const BOSS83M = {
  L1: 7.0, L2: 9.5, BODY: 7.0,                            // бедро, голень, высота тела над точкой физики
  HIP: [0.7, -0.7, PI / 2, -PI / 2, 2.45, -2.45],          // углы бёдер от +Z (вперёд): лево/право
  REST: [[9.0, 0.7], [9.0, -0.7], [9.5, PI / 2], [9.5, -PI / 2], [9.0, 2.45], [9.0, -2.45]],
  GRP: [0, 1, 1, 0, 0, 1],                                 // «тренога»: 0 — ЛП, ПС, ЛЗ; 1 — ПП, ЛС, ПЗ
  lt: 0,
  frame(v, h){ const Y = v.up, Z = tangent(v.fwd, Y), X = norm(cross(Y, Z)); return { X, Y, Z, pos: add(v.pos, mul(Y, h)) }; },
  loc(F, x, y, z){ return add(F.pos, add(add(mul(F.X, x), mul(F.Y, y)), mul(F.Z, z))); },
  ground(p){ const d = norm(p); return mul(d, groundR(d)); },
  // точка покоя ноги (без поиска грунта — на сфере физики), с упреждением по скорости
  rest(v, i, lead){
    const F = this.frame(v, -v.rad), R = this.REST[i];
    let p = this.loc(F, Math.sin(R[1]) * R[0], 0, Math.cos(R[1]) * R[0]);
    if (lead) p = add(p, mul(sub(v.vel, mul(v.up, dot(v.vel, v.up))), 0.55));
    return p;
  },
  init(v){ v.legs83 = []; for (let i = 0; i < 6; i++){ const f = this.ground(this.rest(v, i)); v.legs83.push({ foot: f, from: f, to: f, t: 1 }); } },
  step(v, dt){
    if (!v.legs83) this.init(v);
    const L = v.legs83, up = v.up;
    const moving = [0, 0]; for (let i = 0; i < 6; i++) if (L[i].t < 1) moving[this.GRP[i]]++;
    for (let i = 0; i < 6; i++){
      const g = L[i];
      if (g.t < 1){
        g.t = min(1, g.t + dt / 0.42);
        const s = g.t, arc = Math.sin(s * PI) * 2.2;
        g.foot = add(add(mul(g.from, 1 - s), mul(g.to, s)), mul(up, arc));
        if (g.t >= 1){ g.foot = g.to; this.land(v, g.to); }
        continue;
      }
      const r = this.rest(v, i, true), dv = sub(g.foot, r), dh = len(sub(dv, mul(up, dot(dv, up))));
      if ((dh > 3.4 || dist(g.foot, v.pos) > 20) && moving[1 - this.GRP[i]] === 0){
        g.from = g.foot; g.to = this.ground(r); g.t = 0; moving[this.GRP[i]]++;
        if (dist(g.from, g.to) > 25) { g.foot = g.to; g.from = g.to; g.t = 1; }   // телепорт/портал — сразу
      }
    }
  },
  land(v, p){   // шаг: пыль и дрожь рядом с камерой
    if (!S.cam) return;
    const d = dist(S.cam.pos, p); if (d > 140) return;
    if (!FAC82.low()) for (let k = 0; k < 4; k++) S.sparks.push({ pos: add(p, mul(v.up, 0.3)), vel: add(mul(randUnit(), 3), mul(v.up, 1.5)), life: 0.35 + random() * 0.3 });
    if (!FAC82.low() && random() < 0.35) fxSmoke(add(p, mul(v.up, 0.4)), 0.9, 0.35, 0.5);
    if (d < 60) S.shake = max(S.shake, (S.mode === 'fps' ? 0.22 : 0.06) * (1 - d / 60));
  },
  // двухзвенный IK: бедро H, стопа F, колено — вверх и наружу
  knee(H, Fp, out, up){
    const L1 = this.L1, L2 = this.L2, v = sub(Fp, H); let d = len(v); const dir = mul(v, 1 / (d || 1));
    d = clamp(d, abs(L1 - L2) + 0.1, L1 + L2 - 0.05);
    const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d), h = sqrt(max(0, L1 * L1 - a * a));
    let b = add(mul(up, 1), mul(out, 0.6)); b = norm(sub(b, mul(dir, dot(b, dir))));
    return add(add(H, mul(dir, a)), mul(b, h));
  },
  seg(m, A, B, ref, team, flash, glow, sh){
    const Y = norm(sub(B, A)); let X = cross(Y, ref); if (len(X) < 1e-3) X = anyTangent(Y); X = norm(X); const Z = cross(X, Y);
    return { m, pos: A, X, Y, Z, s: 1, team, flash, glow, sh };
  },
  // список мешей «Жнеца» (живого или остова): body — центр тела, feet — стопы
  reaper(items, F, feet, aim, team, flash, glow, sh){
    items.push({ m: 'r83body', pos: F.pos, X: F.X, Y: F.Y, Z: F.Z, s: 1, team, flash, glow, sh });
    const hp = this.loc(F, 0, 1.4, 2.6), Zh = norm(aim), Xh = norm(cross(F.Y, Zh)), Yh = cross(Zh, Xh);
    items.push({ m: 'r83head', pos: hp, X: Xh, Y: Yh, Z: Zh, s: 1, team, flash, glow, sh });
    for (let i = 0; i < 6; i++){
      const a = this.HIP[i], H = this.loc(F, Math.sin(a) * 3.5, -0.9, Math.cos(a) * 3.5), out = norm(sub(H, F.pos));
      const K = this.knee(H, feet[i], out, F.Y), ref = norm(cross(F.Y, out));
      items.push(this.seg('r83leg1', H, K, ref, team, flash, 1, sh));
      items.push(this.seg('r83leg2', K, feet[i], ref, team, flash, glow, sh));
    }
  },
  bastion(items, g, up, fwd, aim, mgA, team, flash, sh){
    const F = { pos: g, Y: up, Z: tangent(fwd, up) }; F.X = norm(cross(F.Y, F.Z));
    items.push({ m: 'b83hull', pos: g, X: F.X, Y: F.Y, Z: F.Z, s: 1, team, flash, glow: sh < 1 ? 0.15 : 1, sh });
    const yaw = (p, d) => { const Z = tangent(d, up), X = norm(cross(up, Z)); return { pos: p, X, Y: up, Z }; };
    const T = yaw(this.loc(F, 0, 3.7, 0.6), aim); items.push(Object.assign({ m: 'b83tur', s: 1, team, flash, sh }, T));
    for (let i = 0; i < 2; i++){ const P = BOSS83.MGP[i];
      const M = yaw(this.loc(F, -P[0], 3.75, P[2]), mgA && mgA[i] ? mgA[i] : fwd); items.push(Object.assign({ m: 'b83mg', s: 1, team, flash, sh }, M)); }
    const R = yaw(this.loc(F, 0, 3.8, -3.0), aim); items.push(Object.assign({ m: 'b83pod', s: 1, team, flash, sh }, R));
  },
};
if (typeof ST70 !== 'undefined' && ST70.collect){ const c0 = ST70.collect;
  ST70.collect = function(){
    c0.apply(this, arguments);
    if (!BOSS83.on) return;
    BOSS83.safe(() => {
      const now = performance.now() / 1000, dt = clamp(now - (BOSS83M.lt || now), 0, 0.05); BOSS83M.lt = now;
      const fog = S.mode !== 'fps' && !S.attract, tm = S.time;
      for (const v of S.vehicles){
        if (!v.alive || !v.boss83) continue;
        if (fog && v.team !== 0 && fogHidden(v)) continue;
        const team = FI76(v.team), fl = v.flash || 0;
        if (v.boss83 === 'c'){
          const g = sub(v.pos, mul(v.up, v.rad + 0.1));
          BOSS83M.bastion(this.items, g, v.up, v.fwd, v.aim, v.mg83 && v.mg83.map(m => m.aim), team, fl, 1);
        } else {
          if (!S.paused) BOSS83M.step(v, dt);
          const bob = 0.22 * Math.sin(v.phase * 2.2) * clamp(v.moveAmt * 2, 0, 1), F = BOSS83M.frame(v, BOSS83M.BODY + bob);
          const ch = v.bm83 ? v.bm83.t / 0.9 : 0, glow = 0.65 + 0.3 * Math.sin(tm * 3 + v.id) + ch * 2.2;
          BOSS83M.reaper(this.items, F, v.legs83.map(l => l.foot), v.aim, team, fl, glow, 1);
        }
      }
      // гибель и остовы
      const dead = (D, wreck) => {
        const team = FI76(D.team), up = norm(D.g), k = wreck ? 1 : clamp(D.t / 2.2, 0, 1);
        const sh = wreck ? 0.28 : 1 - 0.6 * k, fl = wreck ? 0 : (D.t * 7 % 1 < 0.5 ? 0.6 : 0.1);
        if (D.k === 'c'){
          BOSS83M.bastion(this.items, sub(D.g, mul(up, wreck ? min(1.2, 0.3 + D.t * 0.03) : 0)), up, D.fwd, wreck ? tangent(add(D.aim, mul(norm(cross(D.fwd, up)), 0.6)), up) : D.aim, null, team, fl, sh);
        } else {
          const h = wreck ? 1.6 : BOSS83M.BODY + 2 - (BOSS83M.BODY + 0.4) * k * k;
          const Y = up, Z = tangent(D.fwd, Y), X = norm(cross(Y, Z)), F = { pos: add(D.g, mul(Y, h)), X, Y, Z };
          const feet = []; for (let i = 0; i < 6; i++){ const R = BOSS83M.REST[i], rr = R[0] * (wreck ? 1.25 : 1);
            feet.push(D.legs && !wreck ? D.legs[i].foot : add(D.g, add(mul(X, Math.sin(R[1]) * rr), mul(Z, Math.cos(R[1]) * rr)))); }
          BOSS83M.reaper(this.items, F, feet, wreck ? tangent(add(D.aim, mul(Y, -0.8)), Y) : D.aim, team, fl, wreck ? 0 : 1 - k, sh);
        }
      };
      for (const D of BOSS83.deaths) dead(D, false);
      for (const W of BOSS83.wrecks) dead(W, true);
    }, 'collect');
  }; }
