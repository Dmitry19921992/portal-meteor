// =====================================================================
//  v7.8 — version label "v7.8 · build <date>", "New in v7.8" (RU / EN / VI; HE via HE68), version menu v7.8 / v7.7 / v7.6,
//  short closable tips for anomalies and support (PC and phone), settings toggle «Аномалии».
//  Loaded last (after v77.js) — wraps its menu hooks. Separate file so feature branches do not conflict on it.
// =====================================================================
const V78_NEWS = [
  ['Аномалии на метеорите (волна 1): «Поющая жила» — светящийся зелёный кристалл, гудит и ритмично бьёт импульсами всех рядом; «Омут» тянет и швыряет, «Трескун» бьёт молниями между штырями, «Жаровня» вспыхивает под ногами, «Кислый туман» и «Линза» (гнёт пули и картинку) дрейфуют.',
   'Anomalies on the meteor (wave 1): the "Singing Vein" — a glowing green crystal that hums and strikes everyone nearby with rhythmic pulses; the "Whirlpool" pulls and slams, the "Crackler" arcs between rods, the "Brazier" bursts into flame underfoot, the "Acid mist" and the "Lens" (bends bullets and your view) drift around.',
   'Dị thường (đợt 1): “Mạch Ngân” — tinh thể xanh phát sáng, ù và phóng xung nhịp nhàng; “Xoáy Hút”, “Lưới Điện”, “Lò Than”, “Sương Axit”, “Thấu Kính” bẻ cong đạn.'],
  ['Аномалии чувствуются заранее (гул, свечение, марево). Разрядить — гранатой, ракетой или болтом (E у аномалии): она уснёт, иногда оставит артефакт с плюсом и минусом. Отряд предупреждает по рации, а враги (и свои) иногда влезают в них — заманивай!',
   'You can feel anomalies in advance (hum, glow, heat haze). Discharge one with a grenade, a rocket or a bolt (E near it): it goes dormant and sometimes leaves an artifact with a plus and a minus. Your squad warns over the radio, and enemies (and friends) sometimes blunder in — lure them!',
   'Cảm nhận trước (tiếng ù, ánh sáng). Xả bằng lựu đạn, tên lửa hoặc bu lông (E): nó ngủ, có thể để lại cổ vật. Đội cảnh báo qua bộ đàm, kẻ địch đôi khi sa bẫy!'],
  ['Поддержка за командные очки: 4 в бою (на телефоне 📡) — ящик снабжения, разведка, удар «Града», артудар по прицелу. Стратег на карте видит аномалии только после разведки.',
   'Support for command points: 4 in battle (📡 on the phone) — supply drop, recon scan, "Grad" rocket strike, artillery at the crosshair. The strategist sees anomalies on the map only after a scan.',
   'Hỗ trợ bằng điểm chỉ huy: phím 4 (📡 trên điện thoại) — thả tiếp tế, trinh sát, “Grad”, pháo kích.'],
  ['Ящики снабжения в руинах старых экспедиций, у штабов и у построенных зданий: патроны, гранаты, ракеты, детали оружия (открывают обвесы).',
   'Supply crates in ruins of old expeditions, near the HQs and next to finished buildings: ammo, grenades, rockets, weapon parts (they unlock attachments).',
   'Thùng tiếp tế ở tàn tích, gần căn cứ và công trình: đạn, lựu đạn, tên lửa, linh kiện súng.'],
  ['Версия v7.7 осталась в меню «🕘 Версия игры». Аномалии можно выключить в Настройках.',
   'v7.7 stays in the "🕘 Game version" menu. Anomalies can be turned off in Settings.',
   'v7.7 vẫn có trong menu “🕘 Phiên bản”. Có thể tắt dị thường trong Cài đặt.'],
];
if (typeof STATS75 !== 'undefined') STATS75.ver = '7.8';
if (typeof VER75 !== 'undefined'){
  VER75.cur = 'v7_8';
  VER75.L = VER75.L.filter(o => o.id !== 'v7_5').map(o => o.id === 'v7_7' ? Object.assign({}, o, { tag: undefined }) : o);
  VER75.L.unshift({ id: 'v7_8', v: 'v7.8', d: '25.10.2026', mb: 6.9, tag: 'new', n: ['Аномалии («Поющая жила» и ещё 5), разрядка болтом и гранатой, артефакты, поддержка за КО, ящики снабжения', 'Anomalies (the "Singing Vein" and 5 more), discharge with a bolt or grenade, artifacts, support calls for CP, supply crates'] });
}
{
  const VTXT = () => 'v7.8 · ' + tr('и старые: v7.7, v7.6, вехи v1–v7.0', 'and older: v7.7, v7.6, milestones v1–v7.0', 'và bản cũ', 'וגרסאות ישנות');
  const hm0 = MENU.html_main;
  MENU.html_main = function(){
    let h = hm0.apply(this, arguments);
    h = h.replace(/(id="m_ver75"[\s\S]*?<small[^>]*>)v7\.7 · [^<]*(<\/small>)/, (m, a, b) => a + VTXT() + b);
    h = h.replace(/v7\.7 · /g, 'v7.8 · ');
    const m = h.match(/<h3>[^<]*v7\.7[^<]*<\/h3>/);
    const news = `<h3>${tr('Новое в v7.8', 'New in v7.8', 'Mới trong v7.8', 'חדש ב-v7.8')}</h3><ul>${V78_NEWS.map(n => `<li>${tr(n[0], n[1], n[2], n[3])}</li>`).join('')}</ul>`;
    if (m) h = h.replace(m[0], news + m[0]);
    return h;
  };
  const al0 = MENU.applyLang;
  MENU.applyLang = function(){ al0.apply(this, arguments); document.title = 'Portal Meteor — v7.8'; };
  if (typeof P71M !== 'undefined'){
    const pm0 = P71M.main;
    P71M.main = function(){
      return pm0.apply(this, arguments).replace(/v7\.7 · /g, 'v7.8 · ').replace(/(Новое в |New in |Mới |חדש ב-)v7\.7/, '$1v7.8')
        .replace(/(id="m_ver75"[\s\S]*?<small>)v7\.7(<\/small>)/, '$1v7.8$2');
    };
    P71M.news = function(){
      const all = V78_NEWS.concat(typeof V77_NEWS !== 'undefined' ? V77_NEWS : []);
      return `<div class="p71 p71news">${this.hd(tr('НОВОЕ В v7.8', 'NEW IN v7.8', 'MỚI TRONG v7.8', 'חדש ב-v7.8'), true)}<div class="p71g c2 news">${all.map((n, i) => `<div class="p71n"><b>${i + 1}</b><span>${tr(n[0], n[1], n[2], n[3])}</span></div>`).join('')}</div></div>`;
    };
  }
}
// ---------------------------------------------------------------------
//  short closable tips (once each, remembered between matches; ✕ on the card, auto-hide after 8 s)
// ---------------------------------------------------------------------
const T78 = {
  done: (() => { try { return JSON.parse(localStorage.getItem('pm_t78') || '{}') || {}; } catch (e){ return {}; } })(),
  t: 0, err: 0, shownMatch: 0,
  save(){ try { localStorage.setItem('pm_t78', JSON.stringify(this.done)); } catch (e){} },
  show(id, ru, en, vi, kbd){
    if (this.done[id] || this.shownMatch >= 3) return false;
    const ph = typeof TOUCH !== 'undefined' && TOUCH.on;
    const ok = HINTS.show('t78_' + id, tr(ru, en, vi), ph ? [] : (kbd || []), 'a78' + id);
    if (ok === false) return false;
    this.done[id] = 1; this.save(); this.shownMatch++;
    return true;
  },
  step(dt){
    this.t -= dt; if (this.t > 0) return; this.t = 1;
    if (S.attract || S.over || S.paused || MENU.isOpen() || (typeof TUT !== 'undefined' && TUT.on) || (typeof T72 !== 'undefined' && T72.on)) return;
    if (HINTS.cur && S.rtime < HINTS.cur.until) return;
    const ph = typeof TOUCH !== 'undefined' && TOUCH.on, c = ctrlEntity();
    if (S.mode === 'rts'){
      if (typeof A78 !== 'undefined' && A78.active() && A78.L.length && S.time > 20)
        this.show('rts', 'Аномалии на карте стратега видны только после разведки ◎ (командная способность «Разведка»).', 'Anomalies appear on the strategist\'s map only after a recon scan ◎ (the "Recon scan" power).', 'Dị thường chỉ hiện trên bản đồ sau khi trinh sát ◎.');
      return;
    }
    if (!c || c.cls === 'bld') return;
    const A = typeof A78 !== 'undefined' && A78.active() ? A78 : null;
    if (A){
      const a = A.L.find(x => !A.dorm(x) && dist(x.pos, c.pos) < 45);
      if (a && a.k === 'vein' && this.show('vein', `«Поющая жила» рядом: гудит, а когда кто-то подходит — светится ярче и бьёт импульсом. Обойди или разряди: граната, ракета или болт${ph ? ' (⏏ «Войти»)' : ''}.`, `A "Singing Vein" nearby: it hums, and when someone comes close it glows brighter and strikes with a pulse. Go around or discharge it: a grenade, a rocket or a bolt${ph ? ' (⏏ "Enter")' : ''}.`, 'Mạch Ngân gần đây: ù và phóng xung. Đi vòng hoặc xả bằng lựu đạn hay bu lông.', [bk('interact')])) return;
      if (a && this.show('anom', `Аномалия впереди: ${A.name(a)}. Её выдаёт гул, свечение или марево. Разряди взрывом или брось болт${ph ? ' (⏏)' : ''} — уснёт на полминуты.`, `Anomaly ahead: ${A.name(a)}. Hum, glow or heat haze give it away. Discharge it with an explosion or throw a bolt${ph ? ' (⏏)' : ''} — it sleeps for half a minute.`, `Dị thường phía trước: ${A.name(a)}. Xả bằng vụ nổ hoặc ném bu lông.`, [bk('interact')])) return;
      if (A.arts.some(t => dist(t.pos, c.pos) < 40) && this.show('art', 'Артефакт рядом (◈): подбери — даёт плюс и минус на 3 минуты.', 'An artifact nearby (◈): pick it up — a plus and a minus for 3 minutes.', 'Cổ vật gần đây (◈): nhặt lên — một điểm cộng và một điểm trừ trong 3 phút.')) return;
      if ((A.trapSeen || 0) > 0 && this.show('trap', 'Враги тоже попадают в аномалии. Отступи так, чтобы погоня прошла через аномалию.', 'Enemies blunder into anomalies too. Retreat so that the chase runs through one.', 'Kẻ địch cũng sa vào dị thường — dụ chúng vào!')) return;
    }
    if (typeof S78 !== 'undefined' && S78.on && c.cls === 'inf'){
      if (S78.crates.some(k => k.full && dist(k.pos, c.pos) < 40) && this.show('crate', '📦 Ящик снабжения рядом: подойди — патроны, гранаты, ракеты и детали оружия.', '📦 A supply crate nearby: walk up — ammo, grenades, rockets and weapon parts.', '📦 Thùng tiếp tế gần đây: đến gần để lấy đạn, lựu đạn, linh kiện.')) return;
      if (S.time > 45 && S.teams[0] && S.teams[0].cmd >= 2 && this.show('sup', ph ? '📡 справа — поддержка за командные очки: ящик, разведка, «Град», артудар по прицелу.' : `${keyLabel(SET.bind.sup78 || 'Digit4')} — поддержка за командные очки (КО): затем 1 ящик, 2 разведка, 3 «Град», 4 артудар по прицелу.`, ph ? '📡 on the right — support for command points: crate, recon, "Grad", artillery at the crosshair.' : `${keyLabel(SET.bind.sup78 || 'Digit4')} — support for command points (CP): then 1 crate, 2 recon, 3 "Grad", 4 artillery at the crosshair.`, ph ? '📡 bên phải — hỗ trợ: thùng, trinh sát, "Grad", pháo.' : 'Phím 4 — hỗ trợ: 1 thùng, 2 trinh sát, 3 "Grad", 4 pháo.')) return;
    }
  },
};
{ const st0 = HINTS.step.bind(HINTS); HINTS.step = function(dt){ st0(dt); try { T78.step(dt); T78.close(); } catch (e){ if (!T78.err++) console.warn('t78', e); } }; }
{ const nm0 = newMatch; newMatch = function(){ const r = nm0.apply(this, arguments); T78.shownMatch = 0; T78.t = 8; return r; }; }
// ✕ on the tip card (PC; the phone layout has its own ✕ chip for #hint)
T78.close = function(){
  const el = $('hint'); if (!el || !HINTS.cur || !/^t78_/.test(HINTS.cur.id) || el.style.display === 'none') return;
  if (TOUCH.on || el.querySelector('.t78x')) return;
  const b = document.createElement('button'); b.className = 't78x'; b.textContent = '✕'; b.title = tr('Закрыть', 'Close', 'Đóng');
  b.addEventListener('mousedown', e => { e.stopPropagation(); e.preventDefault(); HINTS.cur.until = S.rtime; el.style.display = 'none'; });
  el.appendChild(b);
};
// ---------------------------------------------------------------------
//  settings: «Аномалии» on/off (PC — next to the v7.6 toggles; phone — ☰ → Settings → Game)
// ---------------------------------------------------------------------
{ const lab = () => tr('Аномалии на метеорите', 'Anomalies on the meteor', 'Dị thường trên thiên thạch', 'אנומליות על המטאור');
  const hs0 = MENU.html_settings;
  MENU.html_settings = function(){
    const h = hs0.apply(this, arguments);
    if (typeof V74 === 'undefined') return h;
    const re = /(<button class="tog[^"]*" data-p74tog="hint76">[^<]*<\/button><\/div>)/;
    return re.test(h) ? h.replace(re, '$1' + V74.togBtn('a78', lab(), false)) : h;
  };
  if (typeof P71M !== 'undefined'){ const s0 = P71M.sec; P71M.sec = function(k){ let h = s0.apply(this, arguments); if (k === 's_game' && typeof V74 !== 'undefined') h = h.replace('<div class="p71g c2 rows">', '<div class="p71g c2 rows">' + V74.togBtn('a78', lab(), true)); return h; }; } }
(function t78CSS(){
  const st = document.createElement('style');
  st.textContent = `#hint .t78x{pointer-events:auto;all:unset;cursor:pointer;margin-left:6px;color:#9fb8d0;font:700 13px "Exo 2";padding:0 2px;align-self:flex-start}
#hint .t78x:hover{color:#fff}
body.s78open #feed{opacity:.2}`;
  document.head.appendChild(st);
})();
