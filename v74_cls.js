// =====================================================================
//  v7.4 — ПК-фидбек 20.10 23:51: КЛАССЫ ОТРЯДОВ
//  Отряд пулемётчиков = 4 пулемётчика, гранатомётчиков = 4 гранатомётчика, штурмовой = 4 штурмовика.
//  У бойца — оружие своего класса: рельсотрон только у снайпера, пулемёт только у пулемётчика
//  (стратег больше не выдаёт «экспериментальный пулемёт» кому попало). Обучения и режим разработчика — как раньше.
//  Выключить: Настройки → «Классы отрядов» (SET.cls74).
// =====================================================================
if (SET.cls74 === undefined) SET.cls74 = true;
const CLS74 = {
  ROT: ['assault', 'heavy', 'rocket'],
  i: [0, 0],
  on(){ return SET.cls74 !== false && !V74.tutOn() && !(typeof DEV !== 'undefined' && DEV.on); },
  name(role, many){
    const M = { assault: ['штурмовики', 'assault', 'xung kích', 'סער'], heavy: ['пулемётчики', 'gunners', 'súng máy', 'מקלענים'], rocket: ['гранатомётчики', 'rocketeers', 'tên lửa', 'רקטאים'] }[role];
    return M ? tr(M[0], M[1], M[2], M[3]) : '';
  },
};
{ const ss0 = spawnSquad;
  spawnSquad = function(t, elite, atPos, n, roles){
    if (!roles && !elite && CLS74.on() && (t === 0 || t === 1)){
      const role = CLS74.ROT[CLS74.i[t]++ % CLS74.ROT.length];
      const sq = ss0.call(this, t, elite, atPos, n, [role, role, role, role]);
      sq.cls74 = role;
      return sq;
    }
    return ss0.apply(this, arguments);
  }; }
{ const at0 = addToSquad;
  addToSquad = function(sq, pos){
    const u = at0.apply(this, arguments);
    if (sq && sq.cls74 && u && u.role !== sq.cls74){
      const R = ROLES[sq.cls74];
      u.role = sq.cls74; u.hp = u.maxhp = round(R.hp + (u.leader ? 40 : 0)); u.walk = RULES.WALK * R.speed; u.jet = jetOf(u); u.rocketCd = 3 + random() * R.rocket * 0.6;
    }
    return u;
  }; }
{ const gl0 = groupLabel;
  groupLabel = function(g){ const s = gl0.apply(this, arguments); return g && g.cls74 && isSquad(g) && !g.solo && !g.elite ? s + ' · ' + CLS74.name(g.cls74) : s; }; }
{ const wa0 = weaponAvail;
  weaponAvail = function(w){
    if (V74.seat && w === 'hmg') return true;
    if (!CLS74.on() || !S.me || S.me.cls !== 'inf') return wa0(w);
    const role = S.me.role;
    if (w === 'rail') return role === 'sniper';
    if (w === 'hmg') return role === 'heavy';
    return wa0(w);
  }; }
// ПК-настройки: строка «Классы отрядов»
{ const hs0 = MENU.html_settings;
  MENU.html_settings = function(){ const h = hs0.apply(this, arguments); return h.replace(/(<h4>[^<]*(Шутер|Shooter|Bắn)[^<]*<\/h4>)/, '$1' + V74.togBtn('cls74', tr('Классы отрядов (4 пулемётчика, 4 гранатомётчика…)', 'Squad classes (4 gunners, 4 rocketeers…)', 'Lớp đội (4 súng máy, 4 tên lửa…)', 'מחלקות חוליה'), false)); }; }
{ const ng0 = MENU.newGame; MENU.newGame = function(){ CLS74.i = [0, 0]; return ng0.apply(this, arguments); }; }
// ---------------------------------------------------------------- полигон разработчика: игрок бессмертен (тест юнитов и техники)
if (typeof POLY71 !== 'undefined'){
  const dm0 = damage;
  damage = function(ent, dmg, src, type){
    if (ent && ent === S.me && POLY71.on && typeof DEV !== 'undefined' && DEV.on && !S.attract){ if (ent.hp !== undefined && ent.maxhp) ent.hp = ent.maxhp; return; }
    return dm0.apply(this, arguments);
  };
}
