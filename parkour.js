// =====================================================================
//  ПАРКУР ИГРОКА: подкат (C на бегу), перелезание через уступы (прыжок
//  у препятствия до ~2.3 м), отскок от стены в воздухе (прыжок у стены)
// =====================================================================
const PK = { slideT: 0, mantle: null, wallT: 0, eye: 0, jumpPrev: false, downPrev: false };
function parkourStep(u, inp, dt){
  const Up = norm(u.pos), f = tangent(u.fwd, Up);
  const jump = K('jump'), down = K('down');
  const jumpTap = jump && !PK.jumpPrev, downTap = down && !PK.downPrev;
  PK.jumpPrev = jump; PK.downPrev = down;
  // перелезание: мягко поднимаем на уступ
  if (PK.mantle){
    const m = PK.mantle; m.t += dt;
    const k = clamp(m.t / m.dur, 0, 1), e = k * k * (3 - 2 * k);
    u.pos = add(m.from, add(mul(m.upv, m.h * min(1, e * 1.6)), mul(m.fv, m.fwdD * e)));
    u.vel = mul(m.fv, 3);
    if (k >= 1){ PK.mantle = null; HINTS.used('mantle'); }
    inp.wish = [0, 0, 0]; inp.jump = false; inp.thrust = false;
    return true;   // физику этот кадр не считаем
  }
  const vt = sub(u.vel, mul(Up, dot(u.vel, Up))), sp = len(vt);
  // подкат
  if (downTap && u.grounded && sp > 5 && PK.slideT <= 0){
    PK.slideT = 0.85; u.vel = add(u.vel, mul(norm(vt), 3.5)); emit('slide', { pos: u.pos }); HINTS.used('slide');
  }
  u.sliding = PK.slideT > 0;
  if (PK.slideT > 0){
    PK.slideT -= dt;
    inp.wish = [0, 0, 0]; inp.speedMul = 0;
    u.slideKeep = norm(vt);
    if (u.grounded) u.vel = add(u.vel, mul(u.slideKeep, max(0, 9 - sp) * dt * 2.5));   // скользим, почти без трения
    if (random() < dt * 30) S.sparks.push({ pos: sub(u.pos, mul(Up, 0.45)), vel: add(mul(u.slideKeep, -2), mul(randUnit(), 1.5)), life: 0.3 });
  }
  // уступ перед нами: прыжок у стены высотой до ~2.3 м — перелезаем
  if (jumpTap && len(inp.wish) > 0.2){
    const probe = (h, d) => { const p = add(add(u.pos, mul(Up, h)), mul(f, d)); return mapJS(p[0], p[1], p[2]); };
    if (probe(0.2, 0.9) < 0.25 || probe(0.9, 0.9) < 0.25){
      for (const h of [1.2, 1.8, 2.4]){
        if (probe(h, 1.1) > 0.45 && probe(h, 0.2) > 0.45){
          PK.mantle = { from: u.pos.slice(), upv: Up, fv: f, h: h + 0.15, fwdD: 1.0, t: 0, dur: 0.32 + h * 0.08 };
          emit('land', { pos: u.pos, e: u, hard: false });
          return true;
        }
      }
    }
  }
  // отскок от стены в воздухе
  PK.wallT = max(0, PK.wallT - dt);
  if (jumpTap && !u.grounded && PK.wallT <= 0){
    for (const s of [1, -1]){
      const side = norm(cross(f, Up));
      for (const dir of [mul(side, s), f]){
        const p = add(u.pos, mul(dir, 0.85));
        if (mapJS(p[0], p[1], p[2]) < 0.2){
          const n = gradN(p);
          if (abs(dot(n, Up)) < 0.5){
            u.vel = add(sub(u.vel, mul(n, dot(u.vel, n))), add(mul(n, 6), mul(Up, 6.5)));
            PK.wallT = 0.45; emit('land', { pos: u.pos, e: u, hard: false }); HINTS.used('walljump');
            return false;
          }
        }
      }
    }
  }
  return false;
}
function parkourEye(dt){
  const want = PK.slideT > 0 ? -0.4 : 0;
  PK.eye += (want - PK.eye) * min(1, dt * 12);
  return PK.eye;
}
