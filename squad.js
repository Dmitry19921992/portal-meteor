// =====================================================================
//  ОТРЯД ИГРОКА: позывные, портреты, здоровье и переговоры тиммейтов
// =====================================================================
const CALLSIGNS = [
  ['Гром', 'Thunder', 'Sấm'], ['Сокол', 'Falcon', 'Chim Ưng'], ['Вега', 'Vega', 'Vega'], ['Кремень', 'Flint', 'Đá Lửa'],
  ['Шёпот', 'Whisper', 'Thì Thầm'], ['Ржавый', 'Rusty', 'Gỉ Sét'], ['Бублик', 'Bagel', 'Bánh Vòng'], ['Тайга', 'Taiga', 'Rừng Thông'],
  ['Штиль', 'Calm', 'Lặng Gió'], ['Кобра', 'Cobra', 'Hổ Mang'], ['Пиксель', 'Pixel', 'Pixel'], ['Хмурый', 'Grumpy', 'Cau Có'],
  ['Дед', 'Gramps', 'Ông Già'], ['Искра', 'Spark', 'Tia Lửa'], ['Байт', 'Byte', 'Byte'], ['Мангуст', 'Mongoose', 'Cầy Mangut'],
  ['Лом', 'Crowbar', 'Xà Beng'], ['Ёж', 'Hedgehog', 'Nhím'], ['Сапсан', 'Peregrine', 'Chim Cắt'], ['Туман', 'Fog', 'Sương Mù'],
  ['Болт', 'Bolt', 'Bu Lông'], ['Котлета', 'Meatball', 'Thịt Viên'], ['Север', 'North', 'Phương Bắc'], ['Шрам', 'Scar', 'Vết Sẹo'],
];
function callsign(u){
  if (u.cs === undefined) u.cs = (u.id * 7 + (u.squad ? u.squad.id * 3 : 0)) % CALLSIGNS.length;
  return N2(CALLSIGNS[u.cs]);
}
// реплики: {name} — позывной того, о ком речь
const CHAT = {
  contact: [['Контакт! Противник впереди!', 'Contact! Enemies ahead!', 'Chạm trán! Địch phía trước!'], ['Вижу их! Открываю огонь!', 'Eyes on! Opening fire!', 'Thấy chúng rồi! Khai hỏa!'], ['Красные визоры, прямо по курсу!', 'Red visors, dead ahead!', 'Kính đỏ, ngay phía trước!']],
  tank: [['Танк! Ракеты к бою!', 'Tank! Rockets ready!', 'Xe tăng! Chuẩn bị tên lửa!'], ['Броня на подходе, берегись!', 'Armor incoming, watch out!', 'Thiết giáp đang tới, cẩn thận!']],
  air: [['Воздух! Дроны над нами!', 'Air! Drones overhead!', 'Trên không! Drone trên đầu!'], ['Смотрите вверх!', 'Eyes up!', 'Nhìn lên trên!']],
  reload: [['Перезаряжаюсь!', 'Reloading!', 'Đang nạp đạn!'], ['Прикройте, меняю батарею!', 'Cover me, swapping cells!', 'Yểm trợ, đang thay pin!'], ['Пусто! Секунду!', 'Empty! One sec!', 'Hết đạn! Một giây!']],
  cover: [['Прикрываю!', 'Covering!', 'Đang yểm trợ!'], ['Работай, я держу фланг!', 'Go, I got the flank!', 'Đi đi, tôi giữ sườn!']],
  kill: [['Минус один!', 'One down!', 'Hạ một!'], ['Готов! Разобран на запчасти.', 'Got him! Scrap metal.', 'Xong! Thành sắt vụn.'], ['Ещё один в металлолом!', 'Another one for the scrapyard!', 'Thêm một cho bãi phế liệu!'], ['Искры полетели!', 'Sparks flying!', 'Tóe lửa rồi!']],
  hurt: [['Меня задело!', "I'm hit!", 'Tôi trúng đạn!'], ['Броня трещит!', 'Armor cracking!', 'Giáp đang nứt!'], ['Ай! Это была моя любимая пластина!', 'Ow! That was my favourite plate!', 'Ái! Đó là tấm giáp yêu thích của tôi!']],
  down: [['{name} выбыл!', '{name} is down!', '{name} bị hạ!'], ['Потеряли {name}!', 'We lost {name}!', 'Mất {name} rồi!'], ['{name}! Нет!', '{name}! No!', '{name}! Không!']],
  heal: [['{name}, держись, иду чинить!', 'Hang on {name}, patching you up!', 'Cố lên {name}, tôi tới sửa đây!'], ['Сейчас подлатаю, {name}!', 'I got you, {name}!', 'Để tôi sửa cho, {name}!']],
  cap: [['Точка наша!', 'Point is ours!', 'Điểm là của ta!'], ['Маяк под нашим флагом!', 'Beacon is flying our colours!', 'Đèn hiệu mang màu cờ ta!']],
  possess: [['Командир с нами!', "Commander's with us!", 'Chỉ huy đã ở đây!'], ['О, ты снова в строю!', "Oh, you're back in line!", 'Ồ, bạn trở lại hàng ngũ rồi!'], ['Ведёшь — идём за тобой!', 'You lead, we follow!', 'Bạn dẫn, chúng tôi theo!']],
  lag: [['Командир, не так быстро!', 'Commander, slow down!', 'Chỉ huy, chậm lại!'], ['Подожди нас!', 'Wait up!', 'Chờ chúng tôi với!']],
  rank: [['Поздравляю с повышением!', 'Congrats on the promotion!', 'Chúc mừng thăng cấp!'], ['Новые лычки тебе к лицу!', 'New stripes suit you!', 'Quân hàm mới hợp với bạn đấy!']],
  pod: [['Капсула! Подкрепление идёт!', 'Pod inbound! Reinforcements!', 'Khoang đổ bộ! Tiếp viện tới!']],
  banter: [
    ['Кто-нибудь помнит, почему небо — это портал?', 'Anyone remember why the sky is a portal?', 'Có ai nhớ tại sao bầu trời là cánh cổng không?'],
    ['Говорят, если прыгнуть в шахту, вылетишь у врага. Проверять не буду.', "They say if you jump in the shaft you pop out at the enemy's. Not testing it.", 'Nghe nói nhảy xuống giếng sẽ trồi lên chỗ địch. Tôi không thử đâu.'],
    ['Рой опять покрасил визоры в красный. Пижоны.', 'The Swarm painted their visors red again. Show-offs.', 'Bầy Đàn lại sơn kính đỏ. Đồ khoe mẽ.'],
    ['Руда, руда… а смазку когда выдадут?', 'Ore, ore… when do we get some oil?', 'Quặng, quặng… bao giờ mới được tra dầu?'],
    ['Мне снилось, что я тостер. Было спокойно.', 'I dreamt I was a toaster. It was peaceful.', 'Tôi mơ mình là cái máy nướng bánh. Yên bình lắm.'],
    ['Тихо. Слишком тихо.', 'Quiet. Too quiet.', 'Yên. Yên quá.'],
    ['Видели? Над базой Роя опять наша база. Портал, чтоб его.', 'See that? Our base is above the Swarm base again. Portals, man.', 'Thấy không? Căn cứ ta lại ở trên căn cứ Bầy Đàn. Cổng không gian đấy.'],
    ['Диман, если ты это читаешь — нам нужен отпуск.', "Diman, if you're reading this — we need a vacation.", 'Diman, nếu anh đọc được — chúng tôi cần kỳ nghỉ.'],
  ],
};
const SQUADUI = {
  lines: [], lastT: -99, cool: {}, quietT: 0, lagT: 0, portraits: new Map(), sig: '',
  speaker(sq, not){
    const L = sq.units.filter(u => u.alive && u !== S.me && u !== not);
    return L.length ? L[floor(random() * L.length)] : null;
  },
  // реплика бойца отряда игрока
  say(key, who, vars, cool){
    if (!SET.chatter || S.attract || S.mode !== 'fps') return false;
    const sq = playerGroup(); if (!sq || !isSquad(sq)) return false;
    if (S.rtime - this.lastT < 3.2) return false;
    if (S.rtime - (this.cool[key] || -99) < (cool || 14)) return false;
    const u = who && who.alive && who !== S.me && who.squad === sq ? who : this.speaker(sq, null);
    if (!u) return false;
    const set = CHAT[key]; let text = N2(set[floor(random() * set.length)]);
    if (vars) for (const k in vars) text = text.replace('{' + k + '}', vars[k]);
    this.lastT = S.rtime; this.cool[key] = S.rtime;
    this.lines.push({ u, name: callsign(u), text, t: S.rtime });
    if (this.lines.length > 4) this.lines.shift();
    u.talkT = S.rtime;
    AU.mate(text, 0.75 + ((u.cs || 0) % 6) * 0.1);
    return true;
  },
  step(dt){
    if (S.attract || S.mode !== 'fps') return;
    const sq = playerGroup();
    if (!sq || !isSquad(sq)) return;
    if (sq.combat) this.quietT = 0; else this.quietT += dt;
    if (this.quietT > 55 && random() < dt * 0.04){ if (this.say('banter', null, null, 80)) this.quietT = 0; }
    // в бою иногда кто-то перезаряжается или прикрывает
    if (sq.combat && random() < dt * 0.03) this.say(random() < 0.5 ? 'reload' : 'cover', null, null, 25);
    // игрок убежал от отряда
    const me = S.me;
    if (me && me.cls === 'inf' && !S.follow){
      const far = sq.units.filter(u => u !== me && u.alive && dist(u.pos, me.pos) > 45).length;
      this.lagT = far >= 2 ? this.lagT + dt : 0;
      if (this.lagT > 6){ this.lagT = 0; this.say('lag', null, null, 45); }
    }
  },
  onKill(e, src){
    if (!src || src === S.me || !src.squad || src.squad !== playerGroup()) return;
    if (random() < 0.4) this.say('kill', src, null, 10);
  },
  onHurt(e, dmg){
    if (e === S.me || e.cls !== 'inf' || !e.squad || e.squad !== playerGroup()) return;
    if (dmg > 18 && random() < 0.25) this.say('hurt', e, null, 16);
  },
  onDie(e){
    if (e === S.me || e.cls !== 'inf' || !e.squad || e.squad !== playerGroup()) return;
    this.say('down', null, { name: callsign(e) }, 6);
  },
  // ---------- панель отряда (слева)
  portrait(u){
    const key = (u.cs || 0) + (u.leader ? 'L' : '') + (u.elite ? 'E' : '') + u.team;
    let url = this.portraits.get(key);
    if (url) return url;
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    const v = (u.cs || 0) % 4;
    const bg = g.createLinearGradient(0, 0, 0, 64); bg.addColorStop(0, '#2a2b25'); bg.addColorStop(1, '#0d0e0c');
    g.fillStyle = bg; g.fillRect(0, 0, 64, 64);
    const shell = u.elite ? '#5c6470' : ['#5a5f3e', '#3f4430', '#6e6650', '#c9c6ba'][v];
    const dark = '#1b1c18';
    // плечи
    g.fillStyle = dark; g.beginPath(); g.moveTo(6, 64); g.lineTo(12, 48); g.lineTo(52, 48); g.lineTo(58, 64); g.fill();
    g.fillStyle = shell; g.fillRect(10, 50, 14, 8); g.fillRect(40, 50, 14, 8);
    // шлем
    g.fillStyle = shell;
    g.beginPath();
    if (v === 3){ g.ellipse(32, 30, 15, 18, 0, 0, PI * 2); }          // белый андроид — гладкая голова
    else { g.moveTo(14, 40); g.lineTo(16, 16); g.quadraticCurveTo(32, 4, 48, 16); g.lineTo(50, 40); g.quadraticCurveTo(32, 50, 14, 40); }
    g.fill();
    g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 1.5; g.stroke();
    // визор
    const visor = u.team ? '#ff3020' : v === 2 ? '#ffd040' : '#9fdcff';
    g.shadowColor = visor; g.shadowBlur = 10; g.fillStyle = visor;
    if (v === 1){ g.fillRect(19, 26, 9, 5); g.fillRect(36, 26, 9, 5); }               // два «глаза»
    else if (v === 3){ g.fillRect(20, 27, 24, 3); }                                       // тонкая щель
    else { g.beginPath(); g.moveTo(17, 25); g.lineTo(47, 25); g.lineTo(44, 33); g.lineTo(20, 33); g.fill(); }
    if (u.leader){ g.fillStyle = '#fff6d0'; for (let i = 0; i < 4; i++){ g.beginPath(); g.arc(22 + i * 7, 15, 2, 0, PI * 2); g.fill(); } }   // 4 фары лидера
    g.shadowBlur = 0;
    // антенна / решётка
    g.strokeStyle = shell; g.lineWidth = 2; g.beginPath(); g.moveTo(46, 14); g.lineTo(52, 4); g.stroke();
    g.fillStyle = 'rgba(0,0,0,.35)'; for (let i = 0; i < 4; i++) g.fillRect(26 + i * 3.5, 38, 2, 5);
    url = c.toDataURL();
    this.portraits.set(key, url);
    return url;
  },
  render(){
    const el = $('squadp');
    const fps = S.mode === 'fps' && !S.attract && !MENU.isOpen();
    const sq = fps ? playerGroup() : null;
    if (!sq || !isSquad(sq)){ if (el.style.display !== 'none') el.style.display = 'none'; this.sig = ''; return; }
    el.style.display = 'flex';
    const now = S.rtime;
    const rows = sq.units.filter(u => u.alive).map(u => {
      const hp = max(0, u.hp) / u.maxhp;
      const st = u === S.me ? tr('ТЫ', 'YOU', 'BẠN') : u.healTo ? '⚕ ' + tr('чинит', 'repairing', 'đang sửa') : (u.squad.units.some(x => x.healTo === u) ? '✚ ' + tr('ремонт', 'patched', 'được sửa') : u.suppT > 0 ? '⊘ ' + tr('подавлен', 'pinned', 'bị áp chế') : u.target && u.target.alive ? '✸ ' + tr('в бою', 'engaging', 'giao chiến') : '');
      const talk = now - (u.talkT || -99) < 2.5;
      // v6: крупнее — класс всегда виден, здоровье числом
      return `<div class="sm ${u === S.me ? 'me' : ''} ${talk ? 'talk' : ''} ${hp < 0.35 ? 'low' : ''}"><img src="${this.portrait(u)}"><div><b>${callsign(u)} <span class="role">${roleOf(u).icon}</span>${u.elite ? ' ✦' : ''}<span class="hpn">${Math.ceil(max(0, u.hp))}</span></b><small><span class="cls">${N2(roleOf(u).n)}</span>${st ? ' · ' + st : ''}</small><i><s style="width:${(hp * 100).toFixed(0)}%"></s></i></div></div>`;
    }).join('');
    const lines = this.lines.filter(l => now - l.t < 6).map(l => `<p><b>${l.name}:</b> ${l.text}</p>`).join('');
    const h = `<h5>${groupLabel(sq).toUpperCase()}${sq.vet ? ' ' + '★'.repeat(sq.vet) : ''} · ${orderText(sq)}</h5>${typeof MISSION !== 'undefined' ? MISSION.chip() : ''}${rows}<div class="chat">${lines}</div>`;
    if (h !== this.sig){ this.sig = h; el.innerHTML = h; }
  },
};
