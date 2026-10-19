"use strict";
// =====================================================================
//  v6.2 ГРАНАТЫ (ветка v62gren)
//  Держи G — прицеливание: дуга полёта (сферическая гравитация, отскоки,
//  качение, портал), точка взрыва и круг поражения, дистанция в метрах.
//  Отпусти — бросок. Короткое нажатие (<0.2 с) — мгновенный бросок.
//  Дальность — углом взгляда (как в CoD/Apex); колесо — сила, ПКМ — «под ноги».
//  Физика: фиксированный шаг 1/60 — предсказанная дуга совпадает с реальным
//  полётом при любом FPS. Фитиль 2.5 с (по таймеру, не от касания).
//  2 гранаты, каждая восстанавливается 9 с. Боты бросают по тем же правилам.
// =====================================================================
const G62 = {
  MAX: 2, RECH: 9, FUSE: 2.5, V: 18, LIFT: 0.21, UNDER_V: 8, UNDER_LIFT: 0.3, R: 0.12, H: 1 / 60, TAP: 0.2,
  REST: 0.35, BOUNCE_V: 1.2, E_N: 0.28, E_T: 0.45, ROLL_K: 1.5, ROLL_C: 2.0, MOM: 0.5, DMG: 85, SPLASH: 6,
  hold: null, path: null, sig: '', sigT: 0, last: { t: -9 }, perf: { n: 0, ms: 0, max: 0, calls: 0 }, btnSig: '', boomLog: [],

  // ---- запас гранат (старые сохранения без поля gren — полный запас)
  kit(){
    const K = S.kit; if (!K) return null;
    if (typeof K.gren !== 'number') K.gren = K.grenCd > 0 ? G62.MAX - 1 : G62.MAX;
    return K;
  },
  // ---- начальная точка и скорость броска: направление взгляда + подъём ~12°
  spec(u, power, under){
    const Up = norm(u.pos), F = u.fwd;
    const el = asin(clamp(dot(F, Up), -1, 1));
    const hz = tangent(F, Up);
    const e2 = min(el + (under ? G62.UNDER_LIFT : G62.LIFT), 1.4);
    const d = add(mul(hz, cos(e2)), mul(Up, sin(e2)));
    const sp = under ? G62.UNDER_V : G62.V * clamp(power || 1, 0.3, 1);
    const eye = typeof gunEye === 'function' ? gunEye(u) : add(u.pos, mul(Up, RULES.EYE));
    const right = norm(cross(hz, Up));
    let pos = add(add(eye, mul(F, 0.45)), mul(right, 0.12));
    if (under) pos = sub(pos, mul(Up, 0.35));
    if (mapJS(pos[0], pos[1], pos[2]) < G62.R + 0.02) pos = eye;   // упёрся в стену — бросок от глаз
    return { pos, vel: add(mul(d, sp), mul(u.vel || [0, 0, 0], G62.MOM)) };
  },
  // ---- физика: SDF мира и нормаль (тетраэдр — 4 выборки)
  sdf(p){ return mapJS(p[0], p[1], p[2]); },
  nrm(p, Up){
    const e = 0.03, x = p[0], y = p[1], z = p[2];
    const a = mapJS(x + e, y - e, z - e), b = mapJS(x - e, y - e, z + e), c = mapJS(x - e, y + e, z - e), d = mapJS(x + e, y + e, z + e);
    const n = [a - b - c + d, -a - b + c + d, -a + b - c + d], l = len(n);
    return l > 1e-6 ? mul(n, 1 / l) : Up;
  },
  // один фиксированный шаг гранаты. live — настоящая граната (звук, отскок от роботов). true — взрыв
  phys(p, h, live){
    p.fuse -= h;
    if (p.fuse <= 0) return true;
    if (p.rest){
      if (!live) return false;
      p.restT = (p.restT || 0) + h;
      if (p.restT < 0.25) return false;
      p.restT = 0;
      if (G62.sdf(p.pos) < G62.R * 2) return false;
      p.rest = 0;   // опора исчезла (здание разрушено) — падает дальше
    }
    const r = len(p.pos), Up = mul(p.pos, 1 / r);
    p.vel = sub(p.vel, mul(Up, gAt(r) * h));
    const sp = len(p.vel), n = max(1, Math.ceil(sp * h / 0.3)), hh = h / n;
    for (let k = 0; k < n; k++){
      let b = add(p.pos, mul(p.vel, hh));
      const l = len(b);
      if (l > S.R){ b = mul(b, 1 - 2 * S.R / l); p.tele = (p.tele || 0) + 1; p.pos = b; p.clr = 0; p.trav = 0; continue; }   // купол-портал
      p.trav += len(p.vel) * hh;
      if (p.clr * 0.7 - p.trav > G62.R + 0.05){ p.pos = b; continue; }   // далеко от поверхностей — без проверки
      // роботы-враги: граната отскакивает от корпуса (не взрывается)
      if (live && sp > 1.5 && typeof TGT !== 'undefined' && TGT[p.team]){
        for (const e of TGT[p.team]){
          if (!e.alive || e.cls === 'bld' || e.cls === 'hq') continue;
          const c = centerOf(e), rr = hitRadius(e) + G62.R;
          if (dist2(b, c) >= rr * rr) continue;
          const nn = norm(sub(b, c)), vn = dot(p.vel, nn);
          if (vn < 0){ p.vel = mul(sub(p.vel, mul(nn, 1.5 * vn)), 0.45); G62.sfx('bounce', b, -vn); }
          b = add(c, mul(nn, rr + 0.01));
          break;
        }
      }
      const d = G62.sdf(b); p.clr = d; p.trav = 0;
      if (d >= G62.R){ p.pos = b; continue; }
      // нормаль: при качении берём прежнюю, пока не откатились на 0.2 м (в 3–4 раза меньше выборок SDF)
      let nn;
      if (p.nP && p.nbN === p.nb && dist2(b, p.nP) < 0.04) nn = p.nC;
      else { nn = G62.nrm(b, Up); p.nC = nn; p.nP = b; p.nbN = p.nb; }
      b = add(b, mul(nn, G62.R - d + 0.004));
      const vn = dot(p.vel, nn);
      if (vn < 0){
        const vt = sub(p.vel, mul(nn, vn));
        if (-vn > G62.BOUNCE_V){
          p.vel = add(mul(vt, G62.E_T), mul(nn, -vn * G62.E_N));
          p.nb = (p.nb || 0) + 1;
          if (live) G62.sfx('bounce', b, -vn); else if (p.bp) p.bp.push(b);
        } else {
          // качение: сопротивление + трение; на склоне гравитация катит дальше
          const vtl = len(vt), dec = (G62.ROLL_C + G62.ROLL_K * vtl) * hh;
          p.vel = vtl > dec ? mul(vt, (vtl - dec) / vtl) : [0, 0, 0];
        }
        if (!p.land) p.land = b;
      }
      p.pos = b; p.clr = G62.R;
      // покой: медленно и почти ровно (на склоне круче ~14° — катится до взрыва)
      if (len(p.vel) < G62.REST && dot(nn, Up) > 0.97){ p.rest = 1; p.vel = [0, 0, 0]; break; }
    }
    return false;
  },
  boom(p){
    const at = add(p.pos, mul(norm(p.pos), 0.25));
    splash(at, p.team, p.dmg, p.splash, p.from, 'g');
    fxExplosion(at, 1.8);
    if (p.me){ G62.boomLog.push({ pos: p.pos.slice(), t: S.time, id: p.id }); if (G62.boomLog.length > 8) G62.boomLog.shift(); }
  },
  // вызывается из sim.js вместо общей логики снарядов
  projStep(p, dt){
    p.acc = (p.acc || 0) + dt;
    let n = 0;
    while (p.acc >= G62.H - 1e-9 && n < 12){
      p.acc -= G62.H; n++;
      if (G62.phys(p, G62.H, true)){ G62.boom(p); return true; }
    }
    if (n >= 12) p.acc = 0;
    p.life = p.fuse + 1;
    // мигающий огонёк фитиля: к взрыву чаще
    p.blinkT = (p.blinkT || 0) - dt;
    if (p.blinkT <= 0){
      p.blinkT = p.fuse > 1 ? 0.45 : 0.16;
      addLight(add(p.pos, mul(norm(p.pos), 0.2)), p.team === 0 ? [3, 2.4, 0.6] : [5, 0.8, 0.3], 3.5, 0.07, 0.004);
    }
    return false;
  },
  spawn(u, pos, vel, fuse, dmg, splash, src){
    const p = { pos, org: pos, vel, team: u.team, life: fuse + 1, fuse, dmg, splash, from: src || u, type: 'g', g62: 1, acc: 0, clr: 0, trav: 0, nb: 0, id: (G62.nid = (G62.nid || 0) + 1) };
    S.proj.push(p);
    return p;
  },

  // ---- игрок: нажатие (выдернуть чеку), удержание (дуга), отпускание (бросок)
  press(){
    const u = S.me;
    if (!u || u.cls !== 'inf' || !u.alive || S.attract) return;
    if (!PROG.has('grenade')){ HINTS.denied('grenade'); return; }
    const K = G62.kit(); if (!K || G62.hold) return;
    if (CAMFX.busy()) return;
    if (K.gren <= 0){
      feed(tr(`Гранат нет — следующая через ${Math.ceil(K.grenCd)} с`, `Out of grenades — next one in ${Math.ceil(K.grenCd)} s`, `Hết lựu đạn — quả tiếp theo sau ${Math.ceil(K.grenCd)} giây`), '#f88');
      G62.sfx('empty'); return;
    }
    G62.hold = { u, t0: S.rtime, power: 1, under: false };
    G62.sig = ''; G62.path = null;
    G62.sfx('pin');
  },
  cancel(){ G62.hold = null; G62.path = null; },
  release(u){
    const h = G62.hold;
    const K = G62.kit();
    if (!K || K.gren <= 0){ G62.hold = null; return; }
    G62.predict(u, true);   // точка падения ровно для момента броска (для теста точности)
    G62.hold = null;
    const sp = G62.spec(u, h.power, h.under);
    const p = G62.spawn(u, sp.pos, sp.vel, G62.FUSE, G62.DMG, G62.SPLASH, u);
    p.me = 1;
    K.gren--; if (K.grenCd <= 0) K.grenCd = G62.RECH;
    G62.last = { t: S.rtime, tap: S.rtime - h.t0 < G62.TAP, under: h.under, id: p.id, pred: G62.path && G62.path.end, path: G62.path, p0: sp.pos, v0: sp.vel };
    G62.path = null;
    HINTS.used('grenade');
    emit('throw', { pos: sp.pos, src: u, me: true });
    G62.sfx('spoon');
  },
  // ---- предсказание траектории тем же интегратором (кэш, пока прицел не сдвинулся)
  predict(u, force){
    const h = G62.hold;
    const fq = (a, k) => Math.round(a[0] * k) + ',' + Math.round(a[1] * k) + ',' + Math.round(a[2] * k);
    const sig = fq(u.pos, 50) + fq(u.fwd, 2000) + fq(u.vel || [0, 0, 0], 10) + h.power + h.under;
    if (!force && G62.path){
      if (sig === G62.sig && S.rtime - G62.sigT < 0.5) return G62.path;
      if (G62.fresh){ G62.fresh = false; return G62.path; }   // пересчёт не чаще чем через кадр (~30 Гц) — бросок всё равно считается заново
    }
    G62.fresh = true;
    const t0 = performance.now();
    const sp = G62.spec(u, h.power, h.under);
    const p = { pos: sp.pos, vel: sp.vel, fuse: G62.FUSE, clr: 0, trav: 0, nb: 0, bp: [], tele: 0 };
    const pts = [sp.pos], brk = [];
    let tele = 0, k = 0, tp = null;
    for (;;){
      const ex = G62.phys(p, G62.H, false);
      if (p.tele !== tele){ tele = p.tele; brk.push(pts.length); if (!tp) tp = pts[pts.length - 1]; }
      if (ex || p.rest || ++k > 400) break;
      pts.push(p.pos);
    }
    const ms = performance.now() - t0, P = G62.perf;
    P.n++; P.ms += ms; P.max = max(P.max, ms);
    G62.sig = sig; G62.sigT = S.rtime;
    // взрыв в воздухе (высокий бросок длиннее фитиля): высота над землёй и проекция круга на землю
    let air = 0, gnd = null;
    if (!p.land && !p.rest){ const dn = norm(p.pos), gr = groundR(dn); air = max(0, len(p.pos) - gr); gnd = mul(dn, gr); }
    G62.path = { pts, brk, end: p.pos, land: p.land || null, bp: p.bp, tele, tp, rest: !!p.rest, ms, air, gnd };
    return G62.path;
  },
  // ---- шаг после update(): восстановление запаса, удержание, отпускание
  tick(rdt){
    if (S.attract || !S.kit){ G62.hold = null; G62.path = null; return; }
    const K = G62.kit();
    if (K.gren < G62.MAX){ if (K.grenCd <= 0){ K.gren++; K.grenCd = K.gren < G62.MAX ? G62.RECH : 0; } }
    else K.grenCd = 0;
    G62.hintStep();
    const h = G62.hold;
    if (!h){ G62.path = null; return; }
    const u = ctrlEntity();
    if (!u || u !== h.u || u.cls !== 'inf' || S.mode !== 'fps' || S.over || S.paused || CAMFX.busy() || MENU.isOpen()){ G62.cancel(); return; }
    h.under = !TOUCH.on && !!(SET.swapMouse ? mouseL : mouseR);
    S.aiming = false;   // ПКМ при гранате — «под ноги», не прицел оружия
    if (typeof GUNS !== 'undefined') GUNS.raise = max(GUNS.raise, min(0.75, (S.rtime - h.t0) * 5));   // оружие уходит вниз, огонь заблокирован
    if (!keys[SET.bind.grenade]){ G62.release(u); return; }
    G62.predict(u);
    G62.perf.hf = (G62.perf.hf || 0) + 1;   // кадров с дугой (perf.ms / perf.hf — мс на кадр)
  },

  // ---- наложение: дуга, круг поражения, дистанция, рука с гранатой, предупреждения
  overlay(dt){
    if (S.attract || S.mode !== 'fps' || !S.cam || (typeof OPER !== 'undefined' && OPER.on) || MENU.isOpen() || CAMFX.busy()) return;
    const c = ctrlEntity(); if (!c) return;
    const g = octx, W = innerWidth, H = innerHeight;
    g.save();
    if (G62.hold && G62.path && c.cls === 'inf') G62.drawArc(g, c, W, H);
    G62.drawWarn(g, c, W, H);
    if (c.cls === 'inf') G62.drawHand(g, W, H);
    g.restore();
    G62.touchBtn();
  },
  drawArc(g, c, W, H){
    const P = G62.path, h = G62.hold;
    const a = clamp((S.rtime - h.t0 - 0.06) / 0.12, 0, 1); if (a <= 0) return;
    const col = h.under ? '150,225,255' : '255,232,180';
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.shadowColor = 'rgba(0,0,0,.85)'; g.shadowBlur = 3;
    // дуга: пунктир, ярче к концу
    g.strokeStyle = `rgba(${col},${(0.9 * a).toFixed(2)})`; g.lineWidth = 2.4; g.setLineDash([8, 6]);
    g.beginPath();
    let on = false, bi = 0;
    for (let i = 0; i < P.pts.length; i++){
      if (bi < P.brk.length && P.brk[bi] === i){ bi++; on = false; }
      const s = project(P.pts[i]);
      if (!s){ on = false; continue; }
      if (on) g.lineTo(s[0], s[1]); else g.moveTo(s[0], s[1]);
      on = true;
    }
    g.stroke(); g.setLineDash([]);
    // отскоки
    g.strokeStyle = `rgba(${col},${(0.8 * a).toFixed(2)})`; g.lineWidth = 1.6;
    for (const b of P.bp){ const s = project(b); if (s){ g.beginPath(); g.arc(s[0], s[1], 4, 0, PI * 2); g.stroke(); } }
    // портал
    if (P.tp){ const s = project(P.tp); if (s){ g.fillStyle = `rgba(150,220,255,${a})`; g.font = '700 13px "Exo 2", sans-serif'; g.textAlign = 'center'; g.fillText(tr('↻ ПОРТАЛ — к антиподу', '↻ PORTAL — to the antipode', '↻ CỔNG — sang phía đối diện'), s[0], s[1] - 12); } }
    // круг поражения на земле вокруг точки взрыва
    const E = P.end, Up = norm(E), t1 = anyTangent(Up), t2 = cross(Up, t1);
    const C = P.gnd || E, Rk = P.air > 0 ? sqrt(max(0, 1 - (P.air / G62.SPLASH) ** 2)) : 1;   // взрыв в воздухе: на земле круг меньше
    const ring = (R, fill, stroke, lw) => {
      R *= Rk; if (R < 0.3) return;
      g.beginPath(); let ok = 0;
      for (let i = 0; i <= 32; i++){
        const an = i / 32 * PI * 2, q = add(add(C, mul(Up, 0.12)), add(mul(t1, cos(an) * R), mul(t2, sin(an) * R)));
        const s = project(q); if (!s) continue;
        if (ok) g.lineTo(s[0], s[1]); else g.moveTo(s[0], s[1]); ok++;
      }
      if (ok < 8) return;
      if (fill){ g.fillStyle = fill; g.fill(); }
      g.strokeStyle = stroke; g.lineWidth = lw; g.stroke();
    };
    const pulse = 0.85 + 0.15 * sin(S.rtime * 8);
    g.shadowBlur = 0;
    ring(G62.SPLASH, `rgba(255,80,40,${(0.16 * a).toFixed(2)})`, `rgba(255,120,70,${(0.9 * a * pulse).toFixed(2)})`, 2.2);
    ring(G62.SPLASH * 0.4, `rgba(255,60,30,${(0.18 * a).toFixed(2)})`, `rgba(255,170,110,${(0.6 * a).toFixed(2)})`, 1.2);
    if (P.air > 0.5 && P.gnd){
      const sa = project(E), sb = project(P.gnd);
      if (sa && sb){
        g.strokeStyle = `rgba(255,170,110,${(0.8 * a).toFixed(2)})`; g.lineWidth = 1.5; g.setLineDash([3, 4]);
        g.beginPath(); g.moveTo(sa[0], sa[1]); g.lineTo(sb[0], sb[1]); g.stroke(); g.setLineDash([]);
        g.font = '600 12px "Exo 2", sans-serif'; g.textAlign = 'left'; g.fillStyle = `rgba(255,190,130,${a})`;
        g.fillText(tr(`взрыв в воздухе, ${P.air.toFixed(0)} м`, `airburst, ${P.air.toFixed(0)} m up`, `nổ trên không, ${P.air.toFixed(0)} m`), sa[0] + 10, sa[1] + 4);
      }
    }
    const s = project(E);
    const d = dist(c.pos, E);
    if (s){
      // экранная метка точки взрыва (видна даже когда круг на земле сплющен перспективой)
      const q = 11 + 2 * sin(S.rtime * 8);
      g.strokeStyle = `rgba(255,110,60,${(0.95 * a).toFixed(2)})`; g.lineWidth = 2.5;
      g.beginPath(); g.moveTo(s[0], s[1] - q); g.lineTo(s[0] + q, s[1]); g.lineTo(s[0], s[1] + q); g.lineTo(s[0] - q, s[1]); g.closePath(); g.stroke();
      g.strokeStyle = `rgba(255,240,220,${a})`; g.lineWidth = 2;
      g.beginPath(); g.moveTo(s[0] - 6, s[1] - 6); g.lineTo(s[0] + 6, s[1] + 6); g.moveTo(s[0] + 6, s[1] - 6); g.lineTo(s[0] - 6, s[1] + 6); g.stroke();
      g.shadowBlur = 3; g.fillStyle = `rgba(255,236,200,${a})`; g.font = '700 14px "Exo 2", sans-serif'; g.textAlign = 'center';
      g.fillText(`${Math.round(d)} ${tr('м', 'm', 'm')}`, s[0], s[1] - 18);
    }
    // HUD у прицела: дистанция, сила, подсказка
    const cx = W / 2, cy = H / 2, y0 = max(cy + 70, H * 0.66);   // ниже прицела, чтобы не закрывать точку падения
    g.shadowBlur = 3; g.textAlign = 'center';
    g.font = '700 22px "Exo 2", Consolas, sans-serif'; g.fillStyle = `rgba(255,236,200,${a})`;
    g.fillText(`${tr('ГРАНАТА', 'GRENADE', 'LỰU ĐẠN')} ▸ ${Math.round(d)} ${tr('м', 'm', 'm')}${P.tele ? ' ↻' : ''}`, cx, y0);
    const pw = h.under ? 0 : h.power;
    g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(cx - 60, y0 + 8, 120, 5);
    g.fillStyle = h.under ? 'rgba(150,225,255,.95)' : 'rgba(255,200,110,.95)'; g.fillRect(cx - 60, y0 + 8, 120 * (h.under ? 0.4 : pw), 5);
    g.font = '600 12px "Exo 2", Consolas, sans-serif'; g.fillStyle = `rgba(230,220,190,${0.9 * a})`;
    const tc = TOUCH.on;
    const line = h.under ? tr('ПОД НОГИ (ПКМ)', 'UNDERHAND (RMB)', 'NÉM THẤP (chuột phải)') : `${tr('СИЛА', 'POWER', 'LỰC')} ${Math.round(pw * 100)}%`;
    g.fillText(line + ' · ' + (tc ? tr('веди по кнопке — угол · отпусти — бросок', 'drag on the button — angle · release — throw', 'kéo trên nút — góc · thả — ném')
      : tr('взгляд — дальность · колесо — сила · ПКМ — под ноги · отпусти — бросок', 'look — range · wheel — power · RMB — underhand · release — throw', 'nhìn — tầm xa · con lăn — lực · chuột phải — ném thấp · thả — ném')), cx, y0 + 28);
    const K = S.kit;
    g.fillText(`${tr('взрыв через', 'fuse', 'nổ sau')} ${G62.FUSE} ${tr('с', 's', 'giây')} · ${tr('гранат', 'grenades', 'lựu đạn')}: ${K.gren}${K.gren < G62.MAX ? ` (+1 ${tr('через', 'in', 'sau')} ${Math.ceil(K.grenCd)} ${tr('с', 's', 'giây')})` : ''}`, cx, y0 + 44);
  },
  // предупреждение о вражеской гранате рядом (как в CoD): значок у прицела по направлению + метка на самой гранате
  drawWarn(g, c, W, H){
    const cx = W / 2, cy = H / 2, cam = S.cam;
    for (const p of S.proj){
      if (!p.g62 || p.team === c.team) continue;
      const d = dist(p.pos, c.pos), R = p.splash + 3.5;
      if (d > R) continue;
      if (!p.warned){ p.warned = 1; G62.sfx('warn'); }
      const danger = d < p.splash, k = 0.6 + 0.4 * sin(S.rtime * (danger ? 18 : 10));
      const col = danger ? `rgba(255,70,50,${k.toFixed(2)})` : `rgba(255,170,70,${k.toFixed(2)})`;
      const v = sub(p.pos, cam.pos), x = dot(v, cam.right), z = dot(v, cam.fwd);
      const an = atan2(x, z), rr = min(W, H) * 0.17;
      const ix = cx + sin(an) * rr, iy = cy - cos(an) * rr;
      g.shadowColor = '#000'; g.shadowBlur = 4;
      // значок гранаты
      g.fillStyle = col; g.beginPath(); g.arc(ix, iy + 3, 9, 0, PI * 2); g.fill();
      g.fillRect(ix - 4, iy - 10, 8, 6);
      g.strokeStyle = col; g.lineWidth = 2; g.beginPath(); g.arc(ix + 7, iy - 9, 4, 0, PI * 2); g.stroke();
      // стрелка наружу
      const ax = cx + sin(an) * (rr + 22), ay = cy - cos(an) * (rr + 22);
      g.beginPath(); g.moveTo(ax + sin(an) * 9, ay - cos(an) * 9); g.lineTo(ax + cos(an) * 7, ay + sin(an) * 7); g.lineTo(ax - cos(an) * 7, ay - sin(an) * 7); g.closePath(); g.fill();
      g.font = '700 12px "Exo 2", sans-serif'; g.textAlign = 'center'; g.fillStyle = col;
      g.fillText(`${d.toFixed(0)} ${tr('м', 'm', 'm')}`, ix, iy + 28);
      const s = project(p.pos);
      if (s){ g.strokeStyle = col; g.lineWidth = 2.5; g.beginPath(); g.arc(s[0], s[1], 13 + 3 * k, 0, PI * 2); g.stroke(); }
      g.shadowBlur = 0;
    }
  },
  // рука с гранатой: замах при удержании, взмах вперёд после броска
  drawHand(g, W, H){
    const now = S.rtime, h = G62.hold;
    let k = 0, f = -1;
    if (h) k = min(1, (now - h.t0) / 0.16);
    else if (now - G62.last.t < 0.22 && now >= G62.last.t) f = (now - G62.last.t) / 0.22;
    else return;
    const sc = clamp(H / 600, 0.75, 1.6);
    let x = W * 0.66 + 38 * k * sc, y = H - 60 * sc + 18 * k * sc, s = sc * (1 + 0.25 * k), rot = -0.5 * k;
    if (f >= 0){ const e = f * (2 - f); x = lerp(W * 0.66 + 38 * sc, W / 2 + 20, e); y = lerp(H - 42 * sc, H / 2 + 30, e); s = sc * lerp(1.25, 0.25, e); rot = lerp(-0.5, 0.6, e); g.globalAlpha = 1 - f; }
    g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
    g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 6;
    // перчатка
    g.fillStyle = '#2c2a24'; g.beginPath(); g.ellipse(4, 22, 26, 14, -0.2, 0, PI * 2); g.fill();
    // корпус гранаты
    const gr = g.createRadialGradient(-6, -6, 2, 0, 0, 20);
    gr.addColorStop(0, '#8a9a5c'); gr.addColorStop(1, '#3d4826');
    g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, 16, 19, 0, 0, PI * 2); g.fill();
    g.shadowBlur = 0;
    g.strokeStyle = 'rgba(20,24,12,.7)'; g.lineWidth = 1.5;
    for (const yy of [-8, 0, 8]){ g.beginPath(); g.moveTo(-15, yy); g.quadraticCurveTo(0, yy + 3, 15, yy); g.stroke(); }
    g.fillStyle = '#9a9a90'; g.fillRect(-6, -26, 12, 9);   // запал
    g.strokeStyle = '#b8b8ae'; g.lineWidth = 3; g.beginPath(); g.moveTo(5, -22); g.lineTo(16, -8); g.lineTo(15, 6); g.stroke();   // рычаг
    if (!h && f < 0){ g.lineWidth = 2; g.beginPath(); g.arc(-12, -24, 6, 0, PI * 2); g.stroke(); }   // кольцо (до выдёргивания)
    // пальцы поверх
    g.fillStyle = '#34312a'; for (let i = 0; i < 3; i++){ g.beginPath(); g.ellipse(-12 + i * 9, 14 - i * 2, 6, 9, 0.3, 0, PI * 2); g.fill(); }
    g.restore(); g.globalAlpha = 1;
  },
  // ячейка гранаты на HUD (ui.js): крупный счётчик и полоса восстановления
  slot(){
    const K = G62.kit(), n = K.gren, full = n >= G62.MAX;
    const frac = full ? null : clamp(1 - K.grenCd / G62.RECH, 0, 1);
    return `<div class="slot g62 ${n > 0 ? 'ok' : 'cd'}"><kbd>${bk('grenade')}</kbd><b class="g62n">${n}<small>/${G62.MAX}</small></b><span>${tr('Граната', 'Grenade', 'Lựu đạn')}</span>` +
      (frac !== null ? `<i style="width:${(frac * 100).toFixed(0)}%"></i><em>+${Math.ceil(K.grenCd)}</em>` : '') + '</div>';
  },
  // кнопка G на телефоне: число гранат и полоса восстановления
  touchBtn(){
    if (!TOUCH.on || !S.kit) return;
    const b = document.querySelector('#touch .g62b'); if (!b) return;
    const K = G62.kit(), inf = S.me && S.me.cls === 'inf';
    const fr = K.gren >= G62.MAX ? 1 : clamp(1 - K.grenCd / G62.RECH, 0, 1);
    const sig = inf ? K.gren + ':' + Math.round(fr * 20) + (G62.hold ? 'h' : '') : 'v';
    if (sig === G62.btnSig) return;
    G62.btnSig = sig;
    b.innerHTML = inf ? `G<sup>${K.gren}</sup><s style="width:${Math.round(fr * 76)}%"></s>` : 'G';
    b.classList.toggle('g62e', inf && K.gren <= 0);
    b.classList.toggle('g62h', !!G62.hold);
  },
  // ---- звуки: чека, рычаг, отскоки, предупреждение
  sfx(kind, pos, k){
    if (typeof AU === 'undefined' || !AU.ready || !AU.ready() || S.attract) return;
    const t = AU.ctx.currentTime, o = AU.sfx;
    switch (kind){
      case 'pin': AU.nz(o, t, 0.03, 'highpass', 4000, 0, 0.7, 0.3); AU.osc(o, t + 0.01, 0.05, 'square', 2900, 2400, 0.05); AU.osc(o, t + 0.06, 0.28, 'triangle', 5200, 5050, 0.05); AU.osc(o, t + 0.06, 0.2, 'sine', 7800, 7700, 0.025); break;
      case 'spoon': AU.osc(o, t, 0.12, 'triangle', 3100, 1900, 0.06); AU.nz(o, t, 0.2, 'bandpass', 700, 2600, 1.2, 0.28, 0.01); break;
      case 'tick': AU.osc(o, t, 0.03, 'square', 1500, 1500, 0.03); break;
      case 'empty': AU.osc(o, t, 0.07, 'square', 520, 380, 0.05); break;
      case 'warn': AU.osc(o, t, 0.08, 'square', 1250, 1250, 0.06); AU.osc(o, t + 0.12, 0.08, 'square', 1250, 1250, 0.06); break;
      case 'bounce': {
        if (!AU.allow(pos, 45)) return;
        const out = AU.out(pos), v = clamp((k || 3) / 10, 0.15, 1);
        AU.osc(out, t, 0.05, 'triangle', 2000 + random() * 700, 1400, 0.1 * v); AU.nz(out, t, 0.06, 'bandpass', 1900, 900, 2, 0.3 * v);
        break;
      }
    }
  },
  // ---- подсказка о новой механике (первые 3 боя)
  hintStep(){
    if (S.mode !== 'fps' || S.over || !S.me || S.me.cls !== 'inf' || !PROG.has('grenade') || S.time < 6) return;
    if (G62.hinted || typeof HINTS === 'undefined' || !HINTS.can('g62', 1, 0) || S.rtime - HINTS.lastT < 14 || (typeof TUT !== 'undefined' && TUT.on)) return;
    G62.hinted = true;
    let n = 0; try { n = +(localStorage.getItem('pm_g62hint') || 0); localStorage.setItem('pm_g62hint', n + 1); } catch (e){}
    if (n >= 3) return;
    HINTS.show('g62', TOUCH.on
      ? tr('Граната: держи G — увидишь дугу и круг взрыва; веди пальцем по кнопке — угол; отпусти — бросок.', 'Grenade: hold G to see the arc and blast circle; drag on the button to aim; release to throw.', 'Lựu đạn: giữ G để thấy quỹ đạo và vòng nổ; kéo trên nút để ngắm; thả để ném.')
      : tr(`Граната: держи ${bk('grenade')} — дуга и круг взрыва, отпусти — бросок. Дальность — углом взгляда, колесо — сила, ПКМ — под ноги.`, `Grenade: hold ${bk('grenade')} for the arc and blast circle, release to throw. Range — by view angle, wheel — power, RMB — underhand.`, `Lựu đạn: giữ ${bk('grenade')} để thấy quỹ đạo và vòng nổ, thả để ném. Tầm xa — theo góc nhìn, con lăn — lực, chuột phải — ném thấp.`),
      [bk('grenade')], 'grenade');
  },
  NEWS: [
    ['Гранаты: держи G — дуга полёта, точка и круг взрыва, дистанция; отпусти — бросок. Дальность — углом взгляда, колесо — сила, ПКМ — под ноги', 'Grenades: hold G for the flight arc, blast point and radius, distance; release to throw. Range by view angle, wheel — power, RMB — underhand', 'Lựu đạn: giữ G để thấy quỹ đạo, điểm và vòng nổ, khoảng cách; thả để ném. Tầm xa theo góc nhìn, con lăn — lực, chuột phải — ném thấp'],
    ['Граната отскакивает и катится по склону, взрыв через 2.5 с; 2 гранаты, восстановление 9 с; значок-предупреждение о вражеской гранате рядом', 'Grenades bounce and roll down slopes, 2.5 s fuse; 2 grenades, 9 s recharge; warning icon for enemy grenades nearby', 'Lựu đạn nảy và lăn xuống dốc, nổ sau 2.5 giây; 2 quả, hồi 9 giây; biểu tượng cảnh báo lựu đạn địch gần bạn'],
  ],
};

// ---- встраивание в игру (без правок чужих файлов, кроме двух точечных хуков: sim.js и ui.js)
playerGrenade = function(){ G62.press(); };   // клавиша гранаты (ui.js) → начало прицеливания
// боты: та же физика (отскоки, качение); фитиль «подготовлен» — взрыв вскоре после падения
throwGrenade = function(u, pt, dmg, rad, src){
  const eye = add(u.pos, mul(u.up, RULES.EYE));
  const T = clamp(dist(eye, pt) / 14, 0.7, 2.2);
  const v = ballistic(eye, pt, 14, 0.7, 2.2);
  G62.spawn(u, eye, v, clamp(T + 0.5, 1.2, G62.FUSE), dmg, rad, src || u);
  emit('throw', { pos: eye, src: u });
};
{
  const up0 = update;
  update = function(rdt){ up0(rdt); G62.tick(rdt); };
  const go0 = gunOverlay;
  gunOverlay = function(dt){ go0(dt); G62.overlay(dt); };
  const nm0 = newMatch;
  newMatch = function(opts){ G62.hold = null; G62.path = null; G62.hinted = false; G62.btnSig = ''; return nm0(opts); };
}
// колесо при удержании — сила броска
addEventListener('wheel', e => {
  const h = G62.hold; if (!h) return;
  const p = clamp(Math.round((h.power + (e.deltaY < 0 ? 0.1 : -0.1)) * 10) / 10, 0.3, 1);
  if (p !== h.power){ h.power = p; G62.sfx('tick'); }
  e.preventDefault();
}, { passive: false });
// телефон: кнопка G — удержание = прицеливание (дуга), ведёшь пальцем по кнопке — угол, отпускание = бросок
{
  const ti0 = TOUCH.init;
  TOUCH.init = function(){
    ti0.call(this);
    if (!this.on) return;
    const old = document.querySelector('#touch [data-k="grenade"]'); if (!old) return;
    const b = old.cloneNode(true); old.replaceWith(b);   // без старого «нажал-отпустил через 60 мс»
    b.classList.add('g62b');
    let id = null, lx = 0, ly = 0;
    const code = () => SET.bind.grenade;
    b.addEventListener('touchstart', e => {
      e.preventDefault(); e.stopPropagation(); AU.init();
      b.classList.add('on');
      const tc = e.changedTouches[0]; id = tc.identifier; lx = tc.clientX; ly = tc.clientY;
      if (!keys[code()]) dispatchEvent(new KeyboardEvent('keydown', { code: code(), key: code() }));
    }, { passive: false });
    b.addEventListener('touchmove', e => {
      e.preventDefault();
      for (const tc of e.changedTouches) if (tc.identifier === id){ lookBy((tc.clientX - lx) * 1.4, (tc.clientY - ly) * 1.4); lx = tc.clientX; ly = tc.clientY; }
    }, { passive: false });
    const up = e => {
      e.preventDefault(); e.stopPropagation();
      b.classList.remove('on'); id = null;
      dispatchEvent(new KeyboardEvent('keyup', { code: code(), key: code() }));
    };
    b.addEventListener('touchend', up, { passive: false });
    b.addEventListener('touchcancel', up, { passive: false });
  };
}
// подписи: «Управление», открытие на звании, «Новое в v6.2» (в главное меню — вставкой, menu.js не правим)
BIND_NAMES.grenade = ['Граната: держать — дуга и точка взрыва, отпустить — бросок · форсаж танка', 'Grenade: hold — arc and blast point, release — throw · tank overdrive', 'Lựu đạn: giữ — quỹ đạo và điểm nổ, thả — ném · tăng tốc xe tăng'];
if (typeof UNLOCK_INFO !== 'undefined' && UNLOCK_INFO.grenade)
  UNLOCK_INFO.grenade.d = ['G — держи: видна дуга и круг взрыва, отпусти — бросок. Взрыв через 2.5 с, 2 гранаты.', 'G — hold: see the arc and blast circle, release to throw. 2.5 s fuse, 2 grenades.', 'G — giữ: thấy quỹ đạo và vòng nổ, thả để ném. Nổ sau 2.5 giây, 2 quả.'];
{
  const li = () => G62.NEWS.map(n => `<li>${tr(n[0], n[1], n[2])}</li>`).join('');
  const hm0 = MENU.html_main;
  MENU.html_main = function(){
    let h = hm0.call(this);
    const m = h.match(/<h3>[^<]*v6\.2[^<]*<\/h3>\s*<ul>/);
    if (m) return h.replace(m[0], m[0] + li());
    const i = h.search(/<h3>[^<]*v6\.1[^<]*<\/h3>/);
    if (i < 0) return h;
    return h.slice(0, i) + `<h3>${tr('Новое в v6.2', 'New in v6.2', 'Mới trong v6.2')}</h3><ul>${li()}</ul>` + h.slice(i);
  };
  const hc0 = MENU.html_controls;
  if (hc0) MENU.html_controls = function(){
    const h = hc0.call(this), k = '<p class="note">';
    const note = `<p class="note g62note">${tr(`Граната (${bk('grenade')}): держи — дуга полёта, точка и круг взрыва, дистанция; отпусти — бросок; короткое нажатие — сразу бросок. Дальность — углом взгляда, колесо — сила, ПКМ — под ноги. Телефон: держи G и веди пальцем.`,
      `Grenade (${bk('grenade')}): hold — flight arc, blast point and radius, distance; release — throw; a quick tap throws at once. Range by view angle, wheel — power, RMB — underhand. Phone: hold G and drag.`,
      `Lựu đạn (${bk('grenade')}): giữ — quỹ đạo, điểm và vòng nổ, khoảng cách; thả — ném; nhấn nhanh — ném ngay. Tầm xa theo góc nhìn, con lăn — lực, chuột phải — ném thấp. Điện thoại: giữ G và kéo.`)}</p>`;
    const i = h.indexOf(k);
    return i < 0 ? h + note : h.slice(0, i) + note + h.slice(i);
  };
}
(function g62CSS(){
  const st = document.createElement('style');
  st.textContent = `
  .slot.g62{width:78px}
  .slot.g62 .g62n{position:absolute;left:0;right:0;top:6px;font:700 22px "Exo 2",Consolas,sans-serif;color:#fff;line-height:22px}
  .slot.g62 .g62n small{font-size:11px;color:#c9c0a4;margin-left:1px}
  .slot.g62.cd .g62n{color:#ff8a6a}
  .slot.g62.cd{opacity:.8}
  #touch .g62b{position:relative}
  #touch .g62b sup{font-size:11px;margin-left:1px;vertical-align:top}
  #touch .g62b s{position:absolute;left:12%;bottom:5px;height:3px;background:#ffd27a;border-radius:2px;max-width:76%}
  #touch .g62b.g62e{opacity:.5}
  #touch .g62b.g62h{box-shadow:0 0 12px rgba(255,200,110,.8)}
  `;
  document.head.appendChild(st);
})();
