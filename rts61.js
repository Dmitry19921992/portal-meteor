// =====================================================================
//  v6.1 СТРАТЕГИЯ: читаемость сверху и быстрый доступ
//  • значки-маркеры над юнитами (тип, цвет стороны, масштаб от высоты, рамка у выделенных),
//    номер отряда и группы Ctrl; подписи (наведение / выделенные / все; Alt — показать все)
//  • панель карточек «Отряды и техника» / «Здания» (клик — выделить, двойной — камера)
//  • командная карточка = только команды ВЫДЕЛЕННОГО; «Ещё приказы ▾»; маркеры приказов
//  • стройка: строит только инженер — кнопки «Зданий» без инженера в состоянии «нужен инженер»
// =====================================================================
const R61 = { pref: { labels: 'sel', cards: null, ctab: 'units' }, hover: null, hoverT: 0, alt: false, t: 0, sig: '', rows: [], more: false, lastSel: '', clickT: 0, clickK: '' };
try { Object.assign(R61.pref, JSON.parse(localStorage.getItem('pm_v61rts') || '{}')); } catch (e){}
function r61Save(){ try { localStorage.setItem('pm_v61rts', JSON.stringify(R61.pref)); } catch (e){} }
// ---------- тип юнита ----------
function r61Kind(g){
  if (!g) return 'inf';
  if (g.cls === 'builder') return 'eng';
  if (isSquad(g)) return g.elite ? 'sky' : g.solo === 'sniper' ? 'sniper' : g.solo ? 'solo' : 'inf';
  if (g.cls === 'tank') return g.vk && VK[g.vk] ? g.vk : 'tank';
  if (g.cls === 'drone') return 'drone';
  return 'inf';
}
function r61KindName(g){
  const k = r61Kind(g), t = g.team || 0;
  if (VK[k]) return N2(VK[k].cls[t ? 1 : 0]);
  return ({ inf: tr('Пехота', 'Infantry', 'Bộ binh'), sky: tr('Десант', 'Sky troopers', 'Lính đổ bộ'), sniper: tr('Снайпер', 'Sniper', 'Bắn tỉa'),
    solo: g.solo && ROLES[g.solo] ? N2(ROLES[g.solo].n) : tr('Боец', 'Trooper', 'Lính'), eng: tr('Инженер', 'Builder', 'Kỹ sư'),
    tank: tr('Танк', 'Tank', 'Xe tăng'), drone: tr('Дрон', 'Drone', 'Drone') })[k] || k;
}
// ---------- значок (по мотивам тактических знаков): рамка цвета стороны, символ типа ----------
function r61Sym(c, kind, x, y, s, col, bg, border, bw){
  const w = s * 1.45, h = s, x0 = x - w / 2, y0 = y - h / 2;
  c.fillStyle = bg; c.fillRect(x0, y0, w, h);
  c.strokeStyle = border; c.lineWidth = bw; c.strokeRect(x0, y0, w, h);
  c.strokeStyle = col; c.fillStyle = col; c.lineWidth = max(1.2, s * 0.11);
  const L = (a, b, cc, d) => { c.beginPath(); c.moveTo(a, b); c.lineTo(cc, d); c.stroke(); };
  const ix = x0 + w * 0.16, iy = y0 + h * 0.2, iw = w * 0.68, ih = h * 0.6;
  switch (kind){
    case 'inf': L(x0 + 1, y0 + 1, x0 + w - 1, y0 + h - 1); L(x0 + 1, y0 + h - 1, x0 + w - 1, y0 + 1); break;
    case 'sky': L(x0 + 1, y0 + 1, x0 + w - 1, y0 + h - 1); L(x0 + 1, y0 + h - 1, x0 + w - 1, y0 + 1); c.beginPath(); c.moveTo(x - w * 0.3, y0 - 1.5); c.lineTo(x, y0 - h * 0.45); c.lineTo(x + w * 0.3, y0 - 1.5); c.stroke(); break;
    case 'sniper': c.beginPath(); c.arc(x, y, h * 0.3, 0, PI * 2); c.stroke(); L(x - h * 0.45, y, x + h * 0.45, y); L(x, y - h * 0.45, x, y + h * 0.45); break;
    case 'solo': L(x0 + 1, y0 + 1, x0 + w - 1, y0 + h - 1); L(x0 + 1, y0 + h - 1, x0 + w - 1, y0 + 1); c.beginPath(); c.arc(x, y, h * 0.16, 0, PI * 2); c.fill(); break;
    case 'tank': c.beginPath(); c.ellipse(x, y, iw * 0.42, ih * 0.38, 0, 0, PI * 2); c.stroke(); break;
    case 'raider': c.beginPath(); c.ellipse(x, y, iw * 0.42, ih * 0.38, 0, 0, PI * 2); c.stroke(); L(x0 + 1, y0 + h - 1, x0 + w - 1, y0 + 1); break;
    case 'mlrs': for (let i = -1; i <= 1; i++){ c.beginPath(); c.arc(x + i * w * 0.22, y + h * 0.12, h * 0.1, 0, PI * 2); c.fill(); L(x + i * w * 0.22, y + h * 0.02, x + i * w * 0.22 + w * 0.08, y - h * 0.3); } break;
    case 'cat': c.beginPath(); c.arc(x, y + h * 0.12, h * 0.15, 0, PI * 2); c.fill(); c.beginPath(); c.arc(x, y + h * 0.12, h * 0.36, PI * 1.1, PI * 1.9); c.stroke(); break;
    case 'drone': c.beginPath(); c.moveTo(ix, iy); c.lineTo(x, iy + ih); c.lineTo(ix + iw, iy); c.stroke(); break;
    case 'eng': L(ix, y - h * 0.05, ix + iw, y - h * 0.05); for (const k of [0, 0.5, 1]) L(ix + iw * k, y - h * 0.05, ix + iw * k, y + h * 0.28); L(ix + iw * 0.5, y - h * 0.05, ix + iw * 0.5, y - h * 0.3); break;
    default: c.beginPath(); c.arc(x, y, h * 0.2, 0, PI * 2); c.fill();
  }
}
// картинка значка для HTML-карточек (кэш)
const R61_URL = {};
function r61SymURL(kind, col){
  const k = kind + col; if (R61_URL[k]) return R61_URL[k];
  const cv = document.createElement('canvas'); cv.width = 58; cv.height = 40;
  const c = cv.getContext('2d'); r61Sym(c, kind, 29, 21, 26, col, 'rgba(10,12,16,.9)', col, 2.5);
  return (R61_URL[k] = cv.toDataURL());
}
function r61Col(g){ return g.team ? TEAM[1].css : g.cls === 'builder' ? '#7fd4ff' : TEAM[0].css; }
// номер группы Ctrl+N для группы
function r61CtlOf(g){ for (const n in S.groupsCtl) if ((S.groupsCtl[n] || []).includes(g)) return n; return ''; }
// ---------- значки и подписи в мире (вызывается из drawRTSOverlay) ----------
function r61Size(){ return clamp(8.5 + S.rts.h * 0.055, 10, 21); }
// мелкая точка бойца/инженера/техники на большой высоте (модели сливаются — «LOD»)
function r61Dot(u, s, col){
  if (S.rts.h < 55) return;
  const a = smoothstep(55, 110, S.rts.h);
  octx.globalAlpha = 0.45 + 0.55 * a; octx.fillStyle = u.cls === 'builder' && u.team === 0 ? '#7fd4ff' : col;
  octx.beginPath(); octx.arc(s[0], s[1], u.cls === 'inf' ? 2.2 : 3, 0, PI * 2); octx.fill();
  octx.globalAlpha = 1;
}
function r61Visible(g){
  if (g.team === 0 || !SET.fog) return true;
  for (const u of groupUnits(g)) if (u.alive && u.seen[0] > 0) return true;
  return false;
}
// где рисовать значок группы: низко — над головой юнита, высоко — прямо над точкой
function r61Anchor(g){
  const L = isSquad(g) ? leaderOf(g) : g; if (!L || !L.alive || !facing(L.pos)) return null;
  const h = S.rts.h, lift = h < 90 ? (L.cls === 'tank' ? 5 : L.cls === 'drone' ? 3 : 3.2) : 0;
  const p = project(lift ? add(L.pos, mul(norm(L.pos), lift)) : L.pos); if (!p) return null;
  if (!lift) p[1] -= r61Size() * 0.85;
  return p;
}
function r61LabelText(g, enemy){
  const k = groupHP(g), us = groupUnits(g).filter(u => u.alive).length;
  const l1 = (enemy ? tr('Рой · ', 'Swarm · ', 'Bầy · ') : '') + groupLabel(g);
  let l2 = r61KindName(g) + ` · ${Math.round(k * 100)}%`;
  if (isSquad(g)) l2 += ` · ${us} ${tr('бойц.', 'troop.', 'lính')}`;
  if (g.cls === 'builder' && !enemy) l2 += ' · ' + (builderBusy(g) ? (g.order === 'repair' ? tr('чинит', 'repairing', 'đang sửa') : tr('строит', 'building', 'đang xây')) : builderIdle(g) ? tr('свободен', 'idle', 'rảnh') : tr('идёт', 'moving', 'đang đi'));
  return [l1, l2];
}
function r61DrawLabel(x, y, lines, col, boxes){
  octx.font = '600 11px "Exo 2", sans-serif';
  const w = max(...lines.map(t => octx.measureText(t).width)) + 10, h = lines.length * 13 + 4, x0 = x - w / 2, y0 = y;
  if (boxes){ for (const b of boxes) if (x0 < b[2] && x0 + w > b[0] && y0 < b[3] && y0 + h > b[1]) return; boxes.push([x0, y0, x0 + w, y0 + h]); }
  octx.fillStyle = 'rgba(8,10,14,.78)'; octx.fillRect(x0, y0, w, h);
  octx.fillStyle = col; octx.fillRect(x0, y0, 2, h);
  octx.textAlign = 'center'; octx.textBaseline = 'top';
  lines.forEach((t, i) => { octx.fillStyle = i ? '#cfd6c8' : '#fff'; octx.fillText(t, x + 1, y0 + 2 + i * 13); });
  octx.textBaseline = 'alphabetic';
}
function r61Badges(sel, dt){
  const h = S.rts.h, s = r61Size(), alpha = 0.7 + 0.3 * smoothstep(30, 110, h);
  const mode = R61.alt ? 'all' : R61.pref.labels;
  r61HoverStep(dt);
  const hv = R61.hover && R61.hover.cls !== 'bld' && R61.hover.cls !== 'hq' ? groupOf(R61.hover) : null;
  const ctl = new Map(); for (const n in S.groupsCtl) for (const g of S.groupsCtl[n] || []) if (!ctl.has(g)) ctl.set(g, n);
  const list = [...groupsOf(0), ...teamBuilders(0), ...groupsOf(1), ...S.builders.filter(b => b.alive && b.team === 1)];
  const labels = [];
  octx.save();
  for (const g of list){
    if (!groupAlive(g) || !r61Visible(g)) continue;
    const p = r61Anchor(g); if (!p || p[0] < -30 || p[1] < -30 || p[0] > innerWidth + 30 || p[1] > innerHeight + 30) continue;
    const isSel = sel.has(g), col = r61Col(g), enemy = g.team === 1;
    octx.globalAlpha = isSel || g === hv ? 1 : alpha;
    if (isSel){ octx.fillStyle = 'rgba(140,255,170,.22)'; octx.fillRect(p[0] - s * 0.95, p[1] - s * 0.72, s * 1.9, s * 1.44); }
    r61Sym(octx, r61Kind(g), p[0], p[1], s, col, enemy ? 'rgba(40,8,8,.82)' : 'rgba(8,12,16,.82)', isSel ? '#eaffef' : g === hv ? '#fff' : col, isSel ? 2.2 : 1.4);
    octx.globalAlpha = 1;
    // номер отряда (справа внизу) и группа Ctrl (слева вверху)
    if (s >= 11 && !enemy){
      octx.font = `700 ${Math.round(s * 0.62)}px "Exo 2", sans-serif`; octx.textAlign = 'left'; octx.textBaseline = 'middle';
      const num = isSquad(g) ? g.id : (g.serial || '');
      if (num !== ''){ octx.fillStyle = '#000'; octx.fillText(num, p[0] + s * 0.78 + 1, p[1] + s * 0.25 + 1); octx.fillStyle = '#fff'; octx.fillText(num, p[0] + s * 0.78, p[1] + s * 0.25); }
      const cn = ctl.get(g);
      if (cn){ const bx = p[0] - s * 0.72 - 7, by = p[1] - s * 0.5 - 7; octx.fillStyle = '#ffd27a'; octx.fillRect(bx, by, 11, 11); octx.fillStyle = '#000'; octx.textAlign = 'center'; octx.fillText(cn, bx + 5.5, by + 6); }
      octx.textBaseline = 'alphabetic';
    }
    const want = g === hv || (mode !== 'off' && isSel) || (mode === 'all' && (!enemy || R61.alt));
    if (want) labels.push({ g, x: p[0], y: p[1] + s * 0.62 + 3, pri: g === hv ? 0 : isSel ? 1 : 2, col, enemy });
  }
  // подписи: наведённый и выделенные — всегда; «все» — без наложений
  labels.sort((a, b) => a.pri - b.pri);
  const boxes = [];
  for (const L of labels) r61DrawLabel(L.x, L.y, r61LabelText(L.g, L.enemy), L.col, L.pri === 0 ? null : boxes);
  // наведённое здание: название и HP
  const hb = R61.hover && (R61.hover.cls === 'bld' || R61.hover.cls === 'hq') ? R61.hover : null;
  if (hb){ const c = hb.cls === 'hq' ? add(hb.pos, mul(BASES[hb.team], 6)) : bldCenter(hb), p = project(c); if (p) r61DrawLabel(p[0], p[1] + 10, r61BldText(hb), TEAM[hb.team].css, null); }
  octx.restore();
}
function r61BldName(b){ return b.cls === 'hq' ? tr('Штаб', 'HQ', 'Sở chỉ huy') : bname(b.type); }
function r61BldState(b){
  if (b.cls === 'bld' && !b.done) return tr('стройка', 'building', 'đang xây') + ` ${Math.floor(b.built * 100)}%`;
  if (b.queue && b.queue.length) return `${PRODUCTS[b.queue[0]].icon} ${pname(b.queue[0])} ${Math.floor(clamp(b.prodT / pTime(b.team, b.queue[0]), 0, 1) * 100)}%`;
  if (b.type === 'turret' || b.type === 'aa' || b.type === 'extractor') return tr('работает', 'working', 'hoạt động');
  return tr('простаивает', 'idle', 'rảnh');
}
function r61BldText(b){ return [(b.team ? tr('Рой · ', 'Swarm · ', 'Bầy · ') : '') + r61BldName(b), `${Math.round(max(0, b.hp) / b.maxhp * 100)}%` + (b.team ? '' : ' · ' + r61BldState(b))]; }
// что под курсором (ПК): раз в 1/15 с
function r61HoverStep(dt){
  R61.hoverT -= dt || 0.016; if (R61.hoverT > 0) return; R61.hoverT = 0.066;
  R61.hover = null;
  if (TOUCH.on || !S.mouse || RCAM.overUI || !RCAM.mouseIn || drag) return;
  R61.hover = pickEntity(S.mouse[0], S.mouse[1], true);
}
// Alt (удержание) — показать подписи всех
addEventListener('keydown', e => { if ((e.code === 'AltLeft' || e.code === 'AltRight') && S.mode === 'rts'){ R61.alt = true; e.preventDefault(); } }, true);
addEventListener('keyup', e => { if (e.code === 'AltLeft' || e.code === 'AltRight'){ R61.alt = false; if (S.mode === 'rts') e.preventDefault(); } }, true);
addEventListener('blur', () => { R61.alt = false; });
// ---------- маркеры приказов: ⚔ атакующее движение, » марш, ⌖ атака цели ----------
const R61_MK = { amove: '#ffb050', march: '#7fdcff', attack: '#ff6050', cap: '#ffd27a' };
function r61Glyph(kind, x, y, r, col, ang){
  octx.strokeStyle = col; octx.fillStyle = col; octx.lineWidth = 2;
  const L = (a, b, c, d) => { octx.beginPath(); octx.moveTo(a, b); octx.lineTo(c, d); octx.stroke(); };
  if (kind === 'march'){
    const ca = cos(ang || -PI / 2), sa = sin(ang || -PI / 2);
    for (const o of [-0.35, 0.35]){ const cx = x + ca * r * o, cy = y + sa * r * o; L(cx - ca * r * 0.4 - sa * r * 0.5, cy - sa * r * 0.4 + ca * r * 0.5, cx + ca * r * 0.25, cy + sa * r * 0.25); L(cx + ca * r * 0.25, cy + sa * r * 0.25, cx - ca * r * 0.4 + sa * r * 0.5, cy - sa * r * 0.4 - ca * r * 0.5); }
  } else if (kind === 'attack'){
    octx.beginPath(); octx.arc(x, y, r * 0.55, 0, PI * 2); octx.stroke(); L(x - r, y, x - r * 0.3, y); L(x + r * 0.3, y, x + r, y); L(x, y - r, x, y - r * 0.3); L(x, y + r * 0.3, x, y + r);
  } else if (kind === 'amove' || kind === 'cap'){
    L(x - r * 0.7, y + r * 0.7, x + r * 0.7, y - r * 0.7); L(x + r * 0.7, y + r * 0.7, x - r * 0.7, y - r * 0.7);   // скрещённые клинки
    L(x - r * 0.75, y + r * 0.25, x - r * 0.25, y + r * 0.75); L(x + r * 0.75, y + r * 0.25, x + r * 0.25, y + r * 0.75);   // гарды
    if (kind === 'cap'){ octx.beginPath(); octx.moveTo(x, y - r * 1.25); octx.lineTo(x + r * 0.3, y - r * 0.95); octx.lineTo(x, y - r * 0.65); octx.lineTo(x - r * 0.3, y - r * 0.95); octx.closePath(); octx.fill(); }
  } else { octx.beginPath(); octx.arc(x, y, r * 0.4, 0, PI * 2); octx.stroke(); }
}
function r61OrderMarks(sel, dt){
  // постоянные значки у цели выделенных (куда и как идут)
  octx.save();
  for (const g of sel){
    if (!g.goal || g.focus || g.cls === 'builder' || g.order === 'hold' || g.order === 'idle' || !facing(g.goal)) continue;
    const L = leaderOf(g); if (!L || surfDist(L.pos, g.goal) < 10) continue;
    const p = project(g.goal); if (!p) continue;
    const a = project(L.pos), ang = a ? Math.atan2(p[1] - a[1], p[0] - a[0]) : -PI / 2;
    const kind = g.rush ? 'march' : g.order === 'cap' ? 'cap' : 'amove';
    octx.globalAlpha = 0.75; r61Glyph(kind, p[0], p[1], 6, R61_MK[kind], ang); octx.globalAlpha = 1;
  }
  // свежий приказ: вспышка-кольцо + значок
  const M = S.orderMark;
  if (M && M.t > 0){
    M.t -= dt;
    const s = project(M.p);
    if (s){
      const k = M.kind || 'move', col = R61_MK[k] || M.col || '#7f7', e = 1 - max(0, M.t) / 0.8;
      octx.globalAlpha = 1 - e * 0.6; octx.strokeStyle = col; octx.lineWidth = 2;
      octx.beginPath(); octx.arc(s[0], s[1], 7 + e * 18, 0, PI * 2); octx.stroke();
      let ang = -PI / 2; if (M.from){ const a = project(M.from); if (a) ang = Math.atan2(s[1] - a[1], s[0] - a[0]); }
      r61Glyph(k, s[0], s[1] - 18, 8, col, ang);
      octx.globalAlpha = 1;
    }
  }
  octx.restore();
}
// ---------- панель карточек «Отряды и техника» / «Здания» ----------
function r61State(g){
  if (g.cls === 'builder') return builderBusy(g) ? ['work', g.order === 'repair' ? tr('чинит', 'repairs', 'sửa') : tr('строит', 'builds', 'xây')] : builderIdle(g) ? ['idle', tr('свободен', 'idle', 'rảnh')] : ['move', tr('идёт', 'moving', 'đi')];
  const L = leaderOf(g); if (!L) return ['idle', '—'];
  const fight = isSquad(g) ? g.combat : (g.target && g.target.alive && dist(centerOf(g.target), L.pos) < 95) || S.time - (L.lastHurt || -99) < 3;
  if (fight) return ['fight', tr('в бою', 'in combat', 'giao chiến')];
  const goal = groupGoal(g);
  if (goal && g.order !== 'hold' && surfDist(L.pos, goal) > 14) return ['move', g.rush ? tr('марш', 'marching', 'hành quân') : tr('идёт', 'moving', 'di chuyển')];
  return ['idle', g.order === 'hold' ? tr('держит', 'holding', 'giữ') : tr('стоит', 'idle', 'đứng')];
}
function r61UnitRows(){
  const rows = groupsOf(0).filter(groupAlive).map(g => ({ k: 'g' + uixId(g), g, kind: r61Kind(g) }));
  const bs = teamBuilders(0);
  if (bs.length) rows.push({ k: 'eng', eng: bs, kind: 'eng' });
  return rows;
}
function r61BldRows(){
  const L = []; if (S.hq[0].alive) L.push(S.hq[0]);
  const order = ['outpost', 'factory', 'hub', 'airdock', 'extractor', 'turret', 'aa'];
  const bl = S.buildings.filter(b => b.alive && b.team === 0).sort((a, b) => (order.indexOf(a.type) - order.indexOf(b.type)) || (a.id - b.id));
  return L.concat(bl).map(b => ({ k: 'b' + uixId(b), b }));
}
function r61CardsTop(){
  const ps = $('pstrip'); let top = 64;
  const hb = document.querySelector('#hud .hb'); if (hb){ const r = hb.getBoundingClientRect(); if (r.bottom > 0) top = r.bottom + 6; }
  if (ps && ps.style.display !== 'none' && ps.offsetHeight){ top = max(top, ps.getBoundingClientRect().bottom + 6); }
  return top;
}
function r61CardsRender(){
  let el = $('r61cards');
  const show = S.mode === 'rts' && !S.attract && !MENU.isOpen() && !S.over;
  if (!el){
    el = document.createElement('div'); el.id = 'r61cards'; document.body.appendChild(el);
    el.addEventListener('click', r61CardsClick); el.addEventListener('contextmenu', e => e.preventDefault());
    el.addEventListener('wheel', e => e.stopPropagation(), { passive: true });
  }
  document.body.classList.toggle('r61open', !!(show && R61.pref.cards));
  if (!show){ if (el.style.display !== 'none') el.style.display = 'none'; return; }
  el.style.display = 'flex';
  if (R61.pref.cards === null) R61.pref.cards = !TOUCH.on;   // на телефоне по умолчанию свёрнута
  const open = R61.pref.cards, tab = R61.pref.ctab;
  if (!TOUCH.on){ el.style.top = r61CardsTop() + 'px'; el.style.bottom = (innerHeight - (mmCenters()[0][1] - MM.R - 20)) + 'px'; }
  const rows = !open ? [] : tab === 'units' ? r61UnitRows() : r61BldRows();
  const nU = groupsOf(0).filter(groupAlive).length, nB = S.buildings.filter(b => b.alive && b.team === 0).length + (S.hq[0].alive ? 1 : 0);
  const labM = { all: tr('все', 'all', 'tất cả'), sel: tr('выделенные', 'selected', 'đã chọn'), off: tr('выкл', 'off', 'tắt') }[R61.pref.labels];
  const sig = [LANG.cur, open, tab, nU, nB, R61.pref.labels, TOUCH.on, rows.map(r => r.k).join(',')].join('|');
  if (sig !== R61.sig){
    R61.sig = sig; R61.rows = rows;
    let h = `<div class="rh"><button data-c="tab" data-v="units" class="${tab === 'units' && open ? 'cur' : ''}" data-tip="${uixEsc(`<b>${tr('Отряды и техника', 'Squads and vehicles')}</b><p>${tr('Клик — выделить · Shift — добавить · двойной клик — камера к ним', 'Click — select · Shift — add · double-click — camera')}</p>`)}">◆ ${tr('Войска', 'Army', 'Quân')} <em>${nU}</em></button>` +
      `<button data-c="tab" data-v="blds" class="${tab === 'blds' && open ? 'cur' : ''}" data-tip="${uixEsc(`<b>${tr('Здания', 'Buildings')}</b><p>${tr('Клик — выделить и камера к зданию', 'Click — select and move the camera')}</p>`)}">⌂ ${tr('Здания', 'Buildings', 'Công trình')} <em>${nB}</em></button>` +
      `<button data-c="fold" class="fold" data-tip="${uixEsc(open ? tr('Свернуть', 'Collapse') : tr('Развернуть', 'Expand'))}">${open ? '–' : '+'}</button></div>`;
    if (open){
      h += '<div class="rl">';
      rows.forEach((r, i) => {
        if (r.b){ const b = r.b, ic = b.cls === 'hq' ? '⌂' : (BICON[b.type] || UIX_ICON.b[b.type] || '▣');
          h += `<div class="rc" data-i="${i}"><i class="gl">${ic}</i><span class="nm"><b>${r61BldName(b)}</b><small data-st></small></span><s class="hp"><u data-hp></u></s></div>`; }
        else if (r.eng){ h += `<div class="rc" data-i="${i}"><img src="${r61SymURL('eng', '#7fd4ff')}"><span class="nm"><b>${tr('Инженеры', 'Builders', 'Kỹ sư')} ×${r.eng.length}</b><small data-st></small></span><kbd>.</kbd></div>`; }
        else { const g = r.g; h += `<div class="rc" data-i="${i}"><img src="${r61SymURL(r.kind, TEAM[0].css)}"><span class="nm"><b>${uixEsc(groupLabel(g))}</b><small data-st></small></span><s class="hp"><u data-hp></u></s><kbd data-cn></kbd></div>`; }
      });
      h += '</div>';
    }
    h += `<button data-c="lab" class="lab" data-tip="${uixEsc(`<b>${tr('Подписи над юнитами', 'Unit labels')}</b><p>${tr('Все / Выделенные / Выкл. Удерживай Alt — показать все. Наведение мыши всегда показывает подпись.', 'All / Selected / Off. Hold Alt to show all. Hovering always shows a label.')}</p>`)}">🏷 ${tr('Подписи', 'Labels', 'Nhãn')}: <b>${labM}</b>${TOUCH.on ? '' : ' <kbd>Alt</kbd>'}</button>`;
    el.innerHTML = h;
    el.classList.toggle('open', !!open);
  }
  // живые значения (без пересборки — клики не теряются)
  const selS = new Set(selGroups());
  el.querySelectorAll('.rc').forEach(d => {
    const r = R61.rows[+d.dataset.i]; if (!r) return;
    let st = '', cls = '', hp = 1, sel = false;
    if (r.b){ st = r61BldState(r.b); hp = max(0, r.b.hp) / r.b.maxhp; sel = S.selB === r.b; cls = r.b.cls === 'bld' && !r.b.done ? 'work' : r.b.queue && r.b.queue.length ? 'move' : ''; }
    else if (r.eng){ const idle = r.eng.filter(builderIdle).length, wk = r.eng.filter(builderBusy).length; st = `${tr('свободны', 'idle', 'rảnh')} ${idle} · ${tr('в работе', 'busy', 'bận')} ${wk}`; sel = r.eng.some(b => selS.has(b)); cls = idle ? 'idle' : 'work'; }
    else { const s2 = r61State(r.g); st = s2[1] + ` · ${Math.round(groupHP(r.g) * 100)}%`; cls = s2[0]; hp = groupHP(r.g); sel = selS.has(r.g); const cn = d.querySelector('[data-cn]'); if (cn){ const v = r61CtlOf(r.g); if (cn.textContent !== v) cn.textContent = v; } }
    const sm = d.querySelector('[data-st]'); if (sm && sm.textContent !== st) sm.textContent = st;
    if (d._c !== cls){ d.className = 'rc ' + cls; d._c = cls; }
    d.classList.toggle('sel', sel);
    const u = d.querySelector('[data-hp]'); if (u){ u.style.width = (clamp(hp, 0, 1) * 100).toFixed(0) + '%'; u.style.background = hp > 0.5 ? '#9c9' : hp > 0.25 ? '#dc6' : '#e66'; }
  });
}
function r61CardsClick(e){
  e.stopPropagation(); AU.init();
  const btn = e.target.closest('[data-c]');
  if (btn){
    const c = btn.dataset.c;
    if (c === 'tab'){ if (R61.pref.ctab === btn.dataset.v && R61.pref.cards) R61.pref.cards = false; else { R61.pref.ctab = btn.dataset.v; R61.pref.cards = true; } }
    else if (c === 'fold') R61.pref.cards = !R61.pref.cards;
    else if (c === 'lab'){ const L = ['sel', 'all', 'off']; R61.pref.labels = L[(L.indexOf(R61.pref.labels) + 1) % 3]; feed(tr('Подписи: ', 'Labels: ') + { all: tr('все', 'all'), sel: tr('выделенные и под курсором', 'selected and hovered'), off: tr('выключены (Alt — показать)', 'off (hold Alt to show)') }[R61.pref.labels], '#9cf'); }
    r61Save(); R61.sig = ''; r61CardsRender(); emit('ui', { kind: 'ok' }); return;
  }
  const d = e.target.closest('.rc'); if (!d) return;
  const r = R61.rows[+d.dataset.i]; if (!r) return;
  const now = performance.now(), dbl = R61.clickK === r.k && now - R61.clickT < 380;
  R61.clickK = r.k; R61.clickT = now;
  if (r.b){ S.sel.clear(); S.selB = r.b; flyCamTo(r.b.cls === 'hq' ? r.b.pos : r.b.pos); }
  else if (r.eng){
    if (!e.shiftKey){ S.sel.clear(); S.selB = null; }
    for (const b of r.eng) S.sel.add(b);
    if (dbl) flyCamTo(r.eng[0].pos);
  } else {
    if (e.shiftKey){ if (S.sel.has(r.g)) S.sel.delete(r.g); else S.sel.add(r.g); }
    else { S.sel.clear(); S.selB = null; S.sel.add(r.g); }
    if (dbl){ const L = leaderPos(r.g); if (L) flyCamTo(L); }
  }
  HINTS.used('select'); emit('ui', { kind: 'ok' });
  R61.t = 0;
}
// ---------- командная карточка: «Ещё приказы ▾» ----------
function r61MoreHTML(){
  const it = (ux, act, ic, n, k, d) => `<button class="mi" data-ux="${ux}" data-act="${act}"><i>${ic}</i><b>${n}</b><kbd>${k}</kbd><small>${d}</small></button>`;
  const rmb = tr('ПКМ', 'RMB', 'Chuột phải');
  return `<div class="more61 ${R61.more ? 'open' : ''}"><div class="mm">` +
    it('cmd:move', 'move', '⚔', tr('Атакующее движение', 'Attack-move', 'Di chuyển tấn công'), rmb, tr('встретят врага — бой, потом дальше', 'fight on contact, then continue', 'gặp địch thì đánh')) +
    it('cmd:rush', 'rush', '»', tr('Марш (бегом)', 'March (run)', 'Hành quân'), '2×' + rmb, tr('не останавливаясь, стреляя на ходу', 'no stopping, firing on the move', 'không dừng, vừa chạy vừa bắn')) +
    it('cmd:hold', 'hold', '⛊', tr('Стоять', 'Hold', 'Giữ'), 'H', tr('держать позицию', 'hold position', 'giữ vị trí')) +
    it('cmd:retreat', 'retreat', '↩', tr('Отступить', 'Retreat', 'Rút lui'), '⇧H', tr('бегом к штабу/форпосту', 'run to HQ/outpost', 'chạy về căn cứ')) +
    `</div><button class="ab more" data-more="1" data-tip="${uixEsc(`<b>${tr('Ещё приказы', 'More orders')}</b><p>${tr('ПКМ по земле — атакующее движение, двойной ПКМ — марш, ПКМ по врагу — атака. Здесь — те же приказы кнопками + Стоять и Отступить.', 'RMB on the ground — attack-move, double RMB — march, RMB on an enemy — attack. Here — the same as buttons plus Hold and Retreat.')}</p>`)}"><i>☰</i><b>${tr('Ещё приказы', 'More orders', 'Thêm lệnh')} ▾</b></button></div>`;
}
function r61More(on){
  R61.more = on === undefined ? !R61.more : !!on;
  const m = document.querySelector('#card .more61'); if (m) m.classList.toggle('open', R61.more);
}
function r61BindMore(el){
  const b = el.querySelector('[data-more]'); if (b) b.onclick = e => { e.stopPropagation(); AU.init(); r61More(); emit('ui', { kind: 'ok' }); };
}
document.addEventListener('mousedown', e => { if (R61.more && !(e.target.closest && e.target.closest('.more61'))) r61More(false); }, true);
document.addEventListener('touchstart', e => { if (R61.more && !(e.target.closest && e.target.closest('.more61'))) r61More(false); }, { capture: true, passive: true });
// ---------- карточка инженеров: только их команды (стройка — во вкладке «Здания» справа) ----------
builderCardHTML = function(sel){
  const bs = sel.filter(g => g.cls === 'builder');
  if (!bs.length) return '';
  const busy = bs.filter(builderBusy).length;
  return `<div class="bmenu"><div class="bhead">⚒ ${tr('Инженеры', 'Builders', 'Kỹ sư')}: ${bs.length}${busy ? ` · ${tr('заняты', 'busy', 'bận')} ${busy}` : ''} · ${tr('строить — вкладка «Здания» справа', 'build — "Build" tab on the right', 'xây — thẻ “Xây” bên phải')} ▸ <kbd>Z X C V B N K</kbd></div><div class="abils">` +
    `<button class="ab" data-bact="repair" data-tip="${uixEsc(`<b>${tr('Ремонт / помочь строить', 'Repair / help build')}</b><p>${tr('Потом кликни по своему зданию, стройке или технике. То же — ПКМ по ним.', 'Then click your building, site or vehicle. Same as RMB on it.')}</p>`)}"><i>✚</i><b>${tr('Ремонт', 'Repair', 'Sửa')}</b><kbd>${tr('ПКМ', 'RMB')}</kbd></button>` +
    `<button class="ab" data-bact="stop" data-tip="${uixEsc(`<b>${tr('Стоп', 'Stop')}</b><p>${tr('Бросить задания и остановиться.', 'Drop jobs and stop.')}</p>`)}"><i>■</i><b>${tr('Стоп', 'Stop', 'Dừng')}</b><kbd>H</kbd></button>` +
    `<button class="ab" data-bact="next" data-tip="${uixEsc(`<b>${tr('Свободный инженер', 'Idle builder')}</b><p>${tr('Выделить следующего свободного инженера и показать его.', 'Select the next idle builder and show it.')}</p>`)}"><i>⚒</i><b>${tr('Свободный', 'Idle one', 'Rảnh')}</b><kbd>.</kbd></button>` +
    `<button class="ab" data-bact="tab" data-tip="${uixEsc(`<b>${tr('Здания', 'Buildings')}</b><p>${tr('Открыть вкладку стройки справа (F1).', 'Open the build tab on the right (F1).')}</p>`)}"><i>⌂</i><b>${tr('Здания ▸', 'Build ▸', 'Xây ▸')}</b><kbd>F1</kbd></button></div></div>`;
};
const _r61BindBuilderCard = bindBuilderCard;
bindBuilderCard = function(el){
  _r61BindBuilderCard(el);
  el.querySelectorAll('[data-bact]').forEach(b => b.onclick = e => {
    e.stopPropagation(); AU.init();
    const a = b.dataset.bact;
    if (a === 'repair') startOrderCast(false);
    else if (a === 'stop') orderHold();
    else if (a === 'next') selectIdleBuilder();
    else if (a === 'tab'){ SIDE.tab = 'build'; buildSidebar(); emit('ui', { kind: 'ok' }); }
  });
};
// подсказки кнопок: новые названия приказов, явная модель «стройку ведёт инженер»
const _r61UixInfo = uixInfo;
uixInfo = function(id){
  const r = _r61UixInfo(id);
  if (id === 'cmd:move') return Object.assign(r, { title: tr('Атакующее движение', 'Attack-move', 'Di chuyển tấn công'), icon: '⚔', desc: tr('Потом кликни (тапни) по земле: идут, при встрече с врагом останавливаются и воюют, потом продолжают путь. По врагу — атаковать его. То же самое — ПКМ.', 'Then click (tap) the ground: they move, stop to fight enemies they meet, then continue. On an enemy — attack it. Same as RMB.') });
  if (id === 'cmd:rush') return Object.assign(r, { title: tr('Марш', 'March', 'Hành quân'), desc: tr('Потом кликни (тапни) по земле: бегут не останавливаясь и стреляют на ходу. То же — двойной ПКМ.', 'Then click (tap) the ground: they run without stopping and fire on the move. Same as double RMB.') });
  if (/^build:/.test(id) && typeof selBuilders === 'function' && !selBuilders().length) r.desc = (r.desc || '') + ' ' + tr('⚒ Строит инженер. Сейчас инженер не выделен — клик выберет ближайшего свободного инженера и сразу включит чертёж.', '⚒ A builder builds it. No builder selected now — clicking picks the nearest idle builder and starts the blueprint.', '⚒ Kỹ sư xây. Nhấp sẽ chọn kỹ sư rảnh gần nhất.');
  return r;
};
// ---------- кадр: панель карточек, авто-вкладка «Здания» при выделении инженеров ----------
function r61Frame(dt){
  R61.t -= dt; if (R61.t > 0) return; R61.t = 0.25;
  r61CardsRender();
  if (S.mode !== 'rts' || S.attract) { if (R61.more) r61More(false); return; }
  const sel = selGroups(), sig = sel.map(uixId).join(',');
  if (sig !== R61.lastSel){
    R61.lastSel = sig;
    // выделили только инженеров — открыть «Здания» (если игрок сам не переключил вкладку после этого)
    if (sel.length && sel.every(g => g.cls === 'builder') && SIDE.tab !== 'build' && SIDE.tab === R61.lastTab){ SIDE.tab = 'build'; buildSidebar(); }
    if (!sel.some(g => g.cls !== 'builder')) R61.more = false;
  }
  R61.lastTab = SIDE.tab;
}
const _r61UixFrame = uixFrame;
uixFrame = function(dt){ _r61UixFrame(dt); try { r61Frame(dt); } catch (e){ if (!R61.err){ R61.err = 1; console.warn('r61', e); } } };
// ---------- стили (свои, head.html не трогаем) ----------
(function r61CSS(){
  const st = document.createElement('style'); st.id = 'r61css';
  st.textContent = `
  #r61cards{position:fixed;left:12px;top:120px;bottom:200px;width:196px;display:none;flex-direction:column;gap:3px;z-index:5;pointer-events:none;font-family:"Exo 2",sans-serif}
  #r61cards > *{pointer-events:auto}
  #r61cards .rh{display:flex;gap:3px}
  #r61cards .rh button,#r61cards .lab{flex:1;background:var(--panel);border:1px solid var(--line);color:#d8cfb4;font:600 11.5px "Exo 2";padding:4px 5px;cursor:pointer;white-space:nowrap}
  #r61cards .rh button em{font-style:normal;color:#9a937e;margin-left:2px} #r61cards .rh button.cur{border-color:var(--sand);color:#fff;background:rgba(60,55,40,.85)}
  #r61cards .rh .fold{flex:0 0 26px;padding:0} #r61cards button:hover{border-color:#fff}
  #r61cards .lab{flex:none;text-align:left;font-size:10.5px;color:#b9b19a} #r61cards .lab b{color:#fff}
  #r61cards .rl{display:flex;flex-direction:column;gap:2px;overflow-y:auto;min-height:0;flex:0 1 auto;scrollbar-width:thin}
  #r61cards .rc{position:relative;display:flex;align-items:center;gap:5px;background:rgba(12,13,14,.82);border:1px solid rgba(214,198,154,.22);border-left:3px solid #6a6a6a;padding:2px 5px 4px 3px;cursor:pointer;min-height:28px}
  #r61cards .rc:hover{border-color:rgba(255,255,255,.6)} #r61cards .rc.sel{background:rgba(40,70,48,.88);border-color:rgba(143,255,170,.75)}
  #r61cards .rc.fight{border-left-color:#ff5a4a} #r61cards .rc.move{border-left-color:#7fd4ff} #r61cards .rc.idle{border-left-color:#8a8a7a} #r61cards .rc.work{border-left-color:#ffd27a}
  #r61cards .rc img{width:29px;height:20px;flex:none} #r61cards .rc .gl{width:29px;text-align:center;font-style:normal;font-size:17px;color:var(--sand);flex:none}
  #r61cards .rc .nm{display:flex;flex-direction:column;min-width:0;flex:1;line-height:1.1}
  #r61cards .rc .nm b{font-size:11.5px;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis} #r61cards .rc .nm small{font-size:10px;color:#b9b19a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #r61cards .rc.fight .nm small{color:#ff9a8a} #r61cards .rc.move .nm small{color:#9fdcff}
  #r61cards .rc .hp{position:absolute;left:3px;right:3px;bottom:1px;height:2px;background:rgba(255,255,255,.08)} #r61cards .rc .hp u{display:block;height:100%;width:0}
  #r61cards .rc kbd{font-size:9px;min-width:0;padding:0 3px} #r61cards .rc kbd:empty{display:none}
  #r61cards:not(.open){bottom:auto}
  body.touch #r61cards{left:6px;right:calc(var(--sideW,200px) + 10px);top:40px;bottom:auto;width:auto;flex-direction:row;align-items:flex-start;gap:3px}
  body.touch #r61cards .rh{flex-direction:column;gap:2px;flex:none} body.touch #r61cards .rh button{font-size:10px;padding:3px 4px}
  body.touch #r61cards .rl{flex-direction:row;overflow-x:auto;overflow-y:hidden;flex:1;max-height:44px}
  body.touch #r61cards .rc{min-width:104px;max-width:120px;min-height:36px} body.touch #r61cards .lab{display:none}
  body.touch #r61cards:not(.open) .rh{flex-direction:row}
  #side .item.need{opacity:.62;filter:saturate(.45)} #side .item.need:hover{opacity:1;filter:none}
  #side .item .st.need{color:#9fdcff}
  #card .r61pn{align-self:center;max-width:220px;font-size:11px;color:#cfc6ad} #card .r61pn kbd{font-size:9px}
  #card .more61{position:relative;display:flex}
  #card .more61 .mm{display:none;position:absolute;bottom:calc(100% + 6px);left:50%;transform:translateX(-50%);flex-direction:column;gap:3px;background:rgba(10,11,12,.95);border:1px solid var(--line);padding:5px;z-index:20;min-width:230px}
  #card .more61.open .mm{display:flex}
  #card .more61 .mi{display:grid;grid-template-columns:24px 1fr auto;grid-template-rows:auto auto;column-gap:6px;align-items:center;text-align:left;background:rgba(40,38,30,.6);border:1px solid var(--line);color:#e8dcb8;padding:4px 7px;cursor:pointer;font-family:"Exo 2"}
  #card .more61 .mi:hover{border-color:#fff;background:rgba(70,64,46,.8)} #card .more61 .mi i{grid-row:1/3;font-style:normal;font-size:18px;color:#ffd27a;text-align:center}
  #card .more61 .mi b{font-size:12.5px} #card .more61 .mi kbd{font-size:10px} #card .more61 .mi small{grid-column:2/4;font-size:10px;color:#a59d84}
  #card .more61 .mi.on,#card .ab.more.on{border-color:#8fffaa}
  body.touch #card .more61 .mm{min-width:190px;gap:2px;padding:3px} body.touch #card .more61 .mi kbd,body.touch #card .more61 .mi small{display:none} body.touch #card .more61 .mi{padding:5px 7px}
  body.touch.r61open #pstrip{top:90px}`;
  document.head.appendChild(st);
})();
