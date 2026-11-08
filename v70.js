// =====================================================================
//  v7.0 — номер версии, «Новое в v7.0» (RU / EN / VI / HE), подсказки куратора, режим разработчика
// =====================================================================
const V70_NEWS = [
  ['С самого начала боя на базе стоит вся армия по одному: десант, пулемётчик-одиночка, снайпер, разведчик, дрон, рейдер, РСЗО, миномёт (и штурмовые отряды с танком) — вселяйся в любого сразу',
   'From the very start your base has the whole army, one of each: sky troopers, lone heavy gunner, sniper, scout, drone, raider, MLRS, mortar (plus assault squads and a tank) — possess anyone right away',
   'Ngay từ đầu căn cứ có cả quân đội, mỗi loại một: lính đổ bộ, bắn tỉa, trinh sát, drone, raider, MLRS, súng cối (và các đội xung kích, xe tăng) — nhập vai ngay',
   'כבר מתחילת הקרב יש בבסיס את כל הצבא, אחד מכל סוג: צנחנים, צלף, סייר, רחפן, פושט, משגר רקטות, מרגמה (וחוליות סער וטנק) — השתלט על מי שתרצה מיד'],
  ['«Свой порядок» вселения (пауза, на телефоне ☰): у каждого класса номер, 1 — главный; ▲▼ меняют, ✕ — никогда. После гибели и по X берётся ближайший к бою боец по этому порядку',
   '"Custom order" for possession (pause menu, ☰ on the phone): each class has a number, 1 is the top; ▲▼ change it, ✕ means never. After death and on X you get the unit closest to the fight in that order',
   '“Thứ tự riêng” khi nhập vai (tạm dừng, ☰ trên điện thoại): mỗi lớp một số, 1 là cao nhất; ▲▼ để đổi, ✕ — không bao giờ',
   '„סדר אישי" להשתלטות (השהיה, ☰ בטלפון): לכל סוג מספר, 1 הוא הראשון; ▲▼ משנים, ✕ — אף פעם. אחרי מוות וב-X מקבלים את הלוחם הקרוב לקרב לפי הסדר'],
  ['Боты больше не снайперы: промахиваются издалека, на бегу, по бегущим и укрытым; мимо тебя пули свистят, бьют в землю и укрытие рядом. Взрывы сбивают с ног: вздрог, на колено, с ног и подъём',
   'Bots are no longer snipers: they miss at range, on the move, against runners and targets in cover; bullets whizz past you and kick up dirt and cover nearby. Explosions knock you down: flinch, to one knee, off your feet and back up',
   'Bot không còn bắn như xạ thủ: trượt ở xa, khi chạy, khi mục tiêu chạy hoặc nấp; đạn rít qua bạn, găm xuống đất và chỗ nấp. Vụ nổ quật ngã: giật mình, quỳ gối, ngã và đứng dậy',
   'הבוטים כבר לא צלפים: מחטיאים מרחוק, בתנועה, מול רצים ומול מי שבמחסה; כדורים שורקים לידך ומעיפים אבק מהקרקע ומהמחסה. פיצוצים מפילים: רעד, לברך, נפילה וקימה'],
  ['Захватил точку — капсула с отрядом и инженером. Форпост на точке качается по одной ветке: оборона (дот → бункер с ПТ-пушкой), поддержка (ремонтные дроны → силовой купол), разведка (радиосканер → снайперская вышка)',
   'Capture a point and a pod drops a squad and a builder. An outpost on the point upgrades along one branch: defence (MG bunker → heavy bunker with AT gun), support (repair drones → force-field dome), recon (radio scanner → sniper & spotter tower)',
   'Chiếm điểm — khoang thả một đội và kỹ sư. Tiền đồn nâng cấp theo một nhánh: phòng thủ, hỗ trợ (drone sửa chữa → vòm khiên), trinh sát (máy quét → tháp bắn tỉa)',
   'כבשת נקודה — תרמיל מנחית חוליה ומהנדס. מוצב בנקודה משתדרג לאורך ענף אחד: הגנה (בונקר מקלע ← בונקר כבד עם תותח נ"ט), תמיכה (רחפני תיקון ← כיפת שדה כוח), סיור (סורק רדיו ← מגדל צלפים)'],
  ['Штаб тоже качается: бронеплиты, турели, ускоренный орбитальный сброс, доход +25 %, глобальный радар, антенны связи (+командные очки). ИИ делает то же самое',
   'The HQ upgrades too: armour plating, defence turrets, faster orbital drop, +25% income, global radar, comms array (+command points). The AI does the same',
   'Sở chỉ huy cũng nâng cấp: giáp, tháp phòng thủ, thả quỹ đạo nhanh, +25% thu nhập, radar toàn cầu, ăng-ten (+điểm chỉ huy). AI cũng vậy',
   'גם המפקדה משתדרגת: לוחות שריון, צריחי הגנה, הנחתה מסלולית מהירה, +25% הכנסה, מכ"ם גלובלי, מערך תקשורת (+נקודות פיקוד). גם הבינה המלאכותית עושה זאת'],
];
{
  const hm0 = MENU.html_main;
  MENU.html_main = function(){
    let h = hm0.call(this).replace(/v6\.9 · /, 'v7.0 · ');
    const m = h.match(/<h3>[^<]*v6\.9[^<]*<\/h3>/);
    const news = `<h3>${tr('Новое в v7.0', 'New in v7.0', 'Mới trong v7.0', 'חדש ב-v7.0')}</h3><ul>${V70_NEWS.map(n => `<li>${tr(n[0], n[1], n[2], n[3])}</li>`).join('')}</ul>`;
    if (m) h = h.replace(m[0], news + m[0]);
    return h;
  };
  const al0 = MENU.applyLang;
  MENU.applyLang = function(){ al0.call(this); document.title = 'Portal Meteor — v7.0'; };
}
// ---------------------------------------------------------------- куратор
if (typeof CUR_STEPS !== 'undefined'){
  const tp = () => TOUCH.on;
  const ros = () => S.vehicles.find(v => v.alive && v.team === 0 && v.ros70 && v.vk === 'raider') || S.vehicles.find(v => v.alive && v.team === 0 && v.ros70);
  const podEng = () => { const L = BASE70.lastLand; if (!L || L.team !== 0 || S.time - L.t > 45 || !L.eng || !L.eng.alive) return null; const cp = S.cps[L.cp]; if (S.buildings.some(b => b.alive && b.team === 0 && b.type === 'outpost' && dist(b.pos, cp.pos) < 45)) return null; return L; };
  const bare = () => BASE70.outposts(0).find(b => !b.tw70 || !b.tw70.br);
  CUR_STEPS.push(
    { id: 'v70_roster', pri: 260, once: true, when: c => S.ros70 && S.time < 300 && CUR.rtsT > 3 && !!ros(),
      text: () => tr(`На базе по одному бойцу и машине каждого типа: десант, снайпер, разведчик, дрон, рейдер, РСЗО, миномёт. Выдели любого и ${tp() ? '«▶ Вселиться»' : '«▶ Вселиться» (Tab)'} — попробуй, пока не отстроился.`,
                     `Your base has one of every unit and vehicle: sky troopers, sniper, scout, drone, raider, MLRS, mortar. Select any and ${tp() ? '"▶ Possess"' : '"▶ Possess" (Tab)'} — try them before you even build.`,
                     `Căn cứ có mỗi loại một: lính đổ bộ, bắn tỉa, trinh sát, drone, raider, MLRS, súng cối. Chọn bất kỳ và “▶ Nhập vai”.`,
                     `בבסיס יש אחד מכל יחידה ורכב: צנחנים, צלף, סייר, רחפן, פושט, משגר רקטות, מרגמה. בחר כל אחד ו„▶ השתלט" — נסה אותם עוד לפני שבנית.`),
      world: () => { const v = ros(); return v ? { pos: v.pos, label: tr('ВСЕЛИСЬ', 'POSSESS', 'NHẬP VAI', 'השתלט'), col: '#8fffaa' } : null; },
      done: (c, k) => S.mode === 'fps' || CUR.since('order') || S.rtime - k.t0 > 22 },
    { id: 'v70_pod', pri: 250, cool: 200, when: () => !!podEng(),
      text: () => { const L = podEng(), cp = S.cps[L.cp]; return tr(`Точка ${cp.name}: с капсулы высадился инженер. Выдели его и поставь «Форпост»${tp() ? '' : ' (V)'} у точки — потом выберешь ветку улучшений.`, `Point ${cp.name}: a builder landed with the pod. Select it and place an "Outpost"${tp() ? '' : ' (V)'} by the point — then pick an upgrade branch.`, `Điểm ${cp.name}: kỹ sư đã đổ bộ. Chọn và đặt “Tiền đồn” cạnh điểm.`, `נקודה ${cp.name}: מהנדס נחת עם התרמיל. בחר אותו והצב „מוצב"${tp() ? '' : ' (V)'} ליד הנקודה — אחר כך תבחר ענף שדרוג.`); },
      world: () => { const L = podEng(); return L ? { pos: L.eng.pos, label: tr('ФОРПОСТ', 'OUTPOST', 'TIỀN ĐỒN', 'מוצב'), col: '#ffd27a' } : null; },
      ui: ['#card [data-build="outpost"]'], done: (c, k) => !podEng() || CUR.since('place', 'outpost') || S.rtime - k.t0 > 30 },
    { id: 'v70_branch', pri: 245, cool: 150, when: () => !!bare(),
      text: () => tr('Форпост готов — выдели его и выбери ветку: ⛨ Оборона (дот, бункер с ПТ-пушкой), ✚ Поддержка (ремонтные дроны, силовой купол) или ◎ Разведка (сканер, снайперская вышка). Строит инженер рядом.', 'The outpost is ready — select it and pick a branch: ⛨ Defence (MG bunker, AT bunker), ✚ Support (repair drones, force-field dome) or ◎ Recon (scanner, sniper tower). A builder nearby does the work.', 'Tiền đồn xong — chọn nhánh: ⛨ Phòng thủ, ✚ Hỗ trợ hoặc ◎ Trinh sát.', 'המוצב מוכן — בחר אותו ובחר ענף: ⛨ הגנה (בונקר מקלע, בונקר נ"ט), ✚ תמיכה (רחפני תיקון, כיפת שדה כוח) או ◎ סיור (סורק, מגדל צלפים). מהנדס קרוב עושה את העבודה.'),
      world: () => { const b = bare(); return b ? { pos: add(b.pos, mul(b.up, 9)), label: tr('УЛУЧШИТЬ', 'UPGRADE', 'NÂNG CẤP', 'שדרג'), col: '#ffd27a' } : null; },
      ui: ['#card [data-v70^="br:"]'], done: (c, k) => !bare() || CUR.since('up70') || S.rtime - k.t0 > 30 },
    { id: 'v70_hq', pri: 115, once: true, when: c => c.ore >= 300 && S.time > 180 && S.hq[0].alive && !Object.keys(BASE70.hqu(0).done).length && !BASE70.hqu(0).job,
      text: () => tr(`Штаб — «супер-точка»: выдели его${tp() ? '' : ' (Home)'} — бронеплиты, турели, ускоренный сброс, доход +25 %, радар, антенны связи.`, `The HQ is a "super point": select it${tp() ? '' : ' (Home)'} — armour, turrets, faster drops, +25% income, radar, comms.`, `Sở chỉ huy là “siêu điểm”: chọn nó để nâng cấp.`, `המפקדה היא „נקודת-על": בחר אותה${tp() ? '' : ' (Home)'} — שריון, צריחים, הנחתה מהירה, +25% הכנסה, מכ"ם, תקשורת.`),
      world: () => ({ pos: mul(BASES[0], RM + 14), label: tr('ШТАБ', 'HQ', 'SỞ CHỈ HUY', 'מפקדה'), col: '#ffd27a' }),
      ui: ['#card [data-v70^="hq:"]'], done: (c, k) => CUR.since('up70') || S.rtime - k.t0 > 25 },
    { id: 'v70_prio', pri: 105, once: true, when: () => CUR.rtsT > 150 && !PRIO70.on,
      text: () => tp() ? tr('☰ → «Вселение»: включи «Свой порядок» и реши, в кого вселяться после гибели — №1, №2… ✕ — никогда.', '☰ → "Possession": turn on "Custom order" and choose who you take after death — #1, #2… ✕ means never.', '☰ → “Nhập vai”: bật “Thứ tự riêng”.', '☰ ← „השתלטות": הפעל „סדר אישי" ובחר במי להשתלט אחרי מוות — מס׳ 1, מס׳ 2… ✕ — אף פעם.')
                       : tr('Esc → пауза → «Свой порядок»: реши, в кого вселяться после гибели и по X — №1, №2… ✕ — никогда.', 'Esc → pause → "Custom order": choose who you take after death and on X — #1, #2… ✕ means never.', 'Esc → tạm dừng → “Thứ tự riêng”.', 'Esc ← השהיה ← „סדר אישי": בחר במי להשתלט אחרי מוות וב-X — מס׳ 1, מס׳ 2… ✕ — אף פעם.'),
      done: (c, k) => PRIO70.on || S.rtime - k.t0 > 25 },
  );
}
// ---------------------------------------------------------------- режим разработчика: проверить всё за минуту
if (typeof DEV !== 'undefined'){
  Object.assign(DEV, {
    hqAll(){ const U = BASE70.hqu(0); U.job = null; for (const k of Object.keys(HQUP70)){ U.job = { k, t: 1, T: 1, cost: 0 }; BASE70.hqFinish(0); } feed(tr('🛠 Штаб: все улучшения', '🛠 HQ: all upgrades', '🛠 Sở chỉ huy: mọi nâng cấp', '🛠 מפקדה: כל השדרוגים'), '#ffb347'); },
    outpost70(br){
      const c = S.cam || {}, me = ctrlEntity();
      const from = me ? me.pos : c.pos ? mul(norm(c.pos), RM) : mul(BASES[0], RM);
      const fw = me ? me.fwd : anyTangent(norm(from));
      let b = null;
      for (let k = 0; k < 14 && !b; k++){
        const dir = offsetOnSphere(norm(from), rotAxis(fw, norm(from), k * 0.45), 30 + (k % 4) * 6);
        if (!siteProblem(0, 'outpost', dir) || k > 10){ b = makeBuilding('outpost', 0, dir); }
      }
      if (!b) return;
      finishSite(b);
      const w = BASE70.tw(b); w.br = br; w.tier = 2; w.job = null; if (br === 'rec') b.visR = 190; if (br === 'def'){ b.maxhp = Math.round(BTYPES.outpost.hp * 1.35); b.hp = b.maxhp; }
      this.op70 = b;
      feed(tr(`🛠 Форпост с веткой «${N2(BR70[br].n)}» (II) рядом`, `🛠 Outpost with "${N2(BR70[br].n)}" (II) nearby`, `🛠 Tiền đồn nhánh “${N2(BR70[br].n)}” (II)`, `🛠 מוצב עם „${N2(BR70[br].n)}" (II) בקרבת מקום`), '#ffb347');
    },
    blast70(lv){
      const me = ctrlEntity(); if (!me) return;
      const d = [0, 5, 2.5, 1.2][lv], dmg = [0, 40, 70, 130][lv];
      const p = add(me.pos, add(mul(tangent(me.fwd, me.up), d), mul(me.up, 0.2)));
      fxExplosion(p, lv === 3 ? 1.6 : 1.0);
      knockback(p, dmg, 4);
    },
    pod70(){
      let cp = null, bd = 1e9; const me = ctrlEntity(), from = me ? me.pos : mul(BASES[0], RM);
      for (const c of S.cps){ if (c.core) continue; const d = dist(c.pos, from); if (d < bd){ bd = d; cp = c; } }
      if (!cp) return; cp.pod70 = null; BASE70.onCapture(cp, 0);
    },
  });
  const ht0 = DEV.html;
  DEV.html = function(){
    const b = (a, v, t) => `<button data-dv70="${a}" data-v="${v}">${t}</button>`;
    return ht0.call(this) + `<h5>v7.0 — ${tr('точки, штаб, взрывы', 'points, HQ, blasts', 'điểm, sở chỉ huy, nổ', 'נקודות, מפקדה, פיצוצים')}</h5><div class="r">` +
      b('hq', '', '⌂ ' + tr('Все улучшения штаба', 'All HQ upgrades', 'Mọi nâng cấp SCH', 'כל שדרוגי המפקדה')) +
      ['def', 'sup', 'rec'].map(k => b('op', k, BR70[k].icon + ' ' + tr('Форпост', 'Outpost', 'Tiền đồn', 'מוצב') + ': ' + N2(BR70[k].n))).join('') +
      b('pod', '', '☄ ' + tr('Капсула на точку', 'Pod to a point', 'Khoang tới điểm', 'תרמיל לנקודה')) +
      [1, 2, 3].map(l => b('kd', l, '💥 ' + [0, tr('Взрыв: слабый', 'Blast: light', 'Nổ: nhẹ', 'פיצוץ: קל'), tr('средний', 'medium', 'vừa', 'בינוני'), tr('сильный', 'strong', 'mạnh', 'חזק')][l])).join('') +
      b('miss', '', (MISS70.on ? '☑ ' : '☐ ') + tr('Киношные промахи', 'Cinematic misses', 'Trượt điện ảnh', 'החטאות קולנועיות')) + `</div>`;
  };
  const pn0 = DEV.panel;
  DEV.panel = function(){
    const r = pn0.apply(this, arguments);
    const p = $('devPan');
    if (p && !p._v70){
      p._v70 = true;
      p.addEventListener('click', e => {
        const t = e.target.closest('[data-dv70]'); if (!t) return;
        e.stopPropagation(); e.preventDefault(); AU.init();
        const a = t.dataset.dv70, v = t.dataset.v;
        if (a === 'hq') DEV.hqAll(); else if (a === 'op') DEV.outpost70(v); else if (a === 'pod') DEV.pod70();
        else if (a === 'kd') DEV.blast70(+v); else if (a === 'miss') MISS70.on = !MISS70.on;
        emit('ui', { kind: 'ok' });
        p.innerHTML = DEV.html();
      }, true);
    }
    return r;
  };
}
