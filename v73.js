// =====================================================================
//  v7.3 — «Лёгкий режим» (A0), версия, «Новое в v7.3»
//  Лёгкий режим: масштаб рендера ~0.55 (авто 0.35…0.6), без теней и AO (качество 0), отражений портала 1,
//  без искажений, минимум частиц и огней, вдвое меньше ботов, не больше 30 кадров/с.
//  Телефон — ВКЛ по умолчанию; ПК — ВЫКЛ (поведение v7.2). ?lite=1 / ?lite=0 в адресе — принудительно (запоминается).
// =====================================================================
const LITE73 = {
  on: false, sc: 0.55, bots: 0.5, maxP: 28, maxL: 6, minMs: 29, low: 0, high: 0, hold: 0, deep: 0, q: false,
  apply(){
    if (!this.q){
      this.q = true;
      try { const v = new URLSearchParams(location.search).get('lite'); if (v === '1' || v === '0'){ SET.lite = v === '1'; MENU.save(); } } catch (e){}
    }
    // не выбрано явно: по умолчанию телефон — вкл, ПК — выкл; авто-значение в память не пишем (null), пока человек сам не переключил
    if (SET.lite === null || SET.lite === undefined){ this.auto = true; SET.lite = this.autoVal = !!(typeof TOUCH !== 'undefined' && TOUCH.on); }
    else if (this.auto && SET.lite !== this.autoVal) this.auto = false;
    const was = this.on; this.on = !!SET.lite;
    if (this.on){
      if (!was) this.sc = min(0.55, SET.scale || 0.55);
      S.quality = 0; S.bounces = min(S.bounces, 1); S.autoRes = false; S.scale = this.sc;
    }
    if (SET.solo) SET.solo = false;   // v7.3: режима «действую один» больше нет
    try { document.body.classList.toggle('lite73', this.on); } catch (e){}
  },
  // каждую секунду: FPS < 25 несколько секунд подряд — понижаем масштаб; долго держится 30 — осторожно повышаем
  adapt(f){
    if (document.visibilityState !== 'visible' || S.paused) return;
    if (this.hold > 0) this.hold--;
    if (f < 25){
      this.low++; this.high = 0;
      if (this.low >= 3){
        this.low = 0;
        if (this.sc > 0.351){ this.sc = +(this.sc - 0.05).toFixed(2); S.scale = this.sc; resize(); this.hold = 25; }
        else if (!this.deep){ this.deep = 1; this.maxP = 12; this.maxL = 3; }
      }
    } else {
      this.low = 0;
      if (f >= 28.5) this.high++; else this.high = 0;
      if (this.high >= 8 && !this.hold && this.sc < 0.6){ this.sc = +(this.sc + 0.05).toFixed(2); S.scale = this.sc; resize(); this.high = 0; }
    }
  },
};
{
  const sv0 = MENU.save;
  MENU.save = function(){
    if (LITE73.auto && SET.lite === LITE73.autoVal){ SET.lite = null; try { sv0.call(this); } finally { SET.lite = LITE73.autoVal; } }
    else sv0.call(this);
  };
}
const V73_NEWS = [
  ['Лёгкий режим для слабых телефонов: меньше разрешение, без теней и искажений, вдвое меньше ботов и частиц, не больше 30 кадров/с; сам снижает разрешение, если FPS < 25. На телефоне включён по умолчанию (Настройки → Графика → «Лёгкий режим»; ссылка с ?lite=1 / ?lite=0).',
   'Lite mode for weak phones: lower resolution, no shadows or distortion, half the bots and particles, 30 FPS cap; lowers the resolution by itself if FPS < 25. On by default on phones (Settings → Graphics → "Lite mode"; or ?lite=1 / ?lite=0 in the link).',
   'Chế độ nhẹ cho điện thoại yếu: độ phân giải thấp hơn, không bóng đổ và méo, ít bot và hạt hơn một nửa, tối đa 30 FPS; tự giảm độ phân giải nếu FPS < 25. Mặc định bật trên điện thoại (Cài đặt → Đồ họa → “Chế độ nhẹ”; hoặc ?lite=1 / ?lite=0 trong liên kết).',
   'מצב קל לטלפונים חלשים: רזולוציה נמוכה, בלי צללים ועיוותים, חצי מהבוטים והחלקיקים, עד 30 FPS; מוריד רזולוציה לבד אם FPS < 25. בטלפון פועל כברירת מחדל (הגדרות ← גרפיקה ← „מצב קל"; או ?lite=1 / ?lite=0 בקישור).'],
  ['Телефон: новая раскладка. Слева — идти, справа — обзор (оба джойстика появляются под пальцем). Только левый палец — «авто»; правый в деле — боец стреляет сам, когда прицел на враге. Тап по врагу — ракета или граната, 2 тапа — рефлекс, 3 тапа — артудар. Перезарядка сама. Ранец — кнопка у левого края. Нижние углы свободны, миникарта в углу, подсказки закрываются крестиком, задачу можно свернуть. Старая раскладка: Настройки → Телефон.',
   'Phone: new controls. Left — move, right — look (both sticks appear under your finger). Left thumb alone — "auto"; when the right one is used, the trooper fires by itself only while the crosshair is on an enemy. Tap an enemy — rocket or grenade, 2 taps — reflex, 3 taps — artillery strike. Auto reload. Jetpack — a button at the left edge. Bottom corners are free, minimap in the corner, hints can be closed with a cross, the objective can be collapsed. Old layout: Settings → Phone.',
   'Điện thoại: bố cục mới. Trái — di chuyển, phải — nhìn (cả hai cần hiện dưới ngón tay). Chỉ ngón trái — “tự động”; khi dùng ngón phải, lính chỉ tự bắn khi tâm ngắm trúng địch. Chạm địch — tên lửa hoặc lựu đạn, 2 lần — phản xạ, 3 lần — pháo kích. Tự nạp đạn. Ba lô — nút ở mép trái. Hai góc dưới trống, bản đồ nhỏ ở góc, gợi ý có thể đóng, nhiệm vụ có thể thu gọn. Bố cục cũ: Cài đặt → Điện thoại.',
   'טלפון: פריסה חדשה. שמאל — תנועה, ימין — מבט (שני הג׳ויסטיקים מופיעים מתחת לאצבע). אגודל שמאל בלבד — „אוטו"; כשהימני בשימוש הלוחם יורה לבד רק כשהכוונת על אויב. הקשה על אויב — רקטה או רימון, 2 הקשות — רפלקס, 3 — הפצצה. טעינה אוטומטית. מנוע סילון — כפתור בקצה השמאלי. הפינות התחתונות פנויות, מפה קטנה בפינה, רמזים נסגרים ב-X, אפשר לכווץ את המשימה. הפריסה הישנה: הגדרות ← טלפון.'],
  ['Подсказки (всплывающие и куратор) — один выключатель в настройках. Кто ты (тип бойца или техники) — подпись «Ты: …» в HUD. Прицельные оптики автомата и пулемёта прозрачные. Панель «Арсенал» — справа, сворачивается и выключается. Режим «один без отряда» (J) убран. Голос стратега не повторяет одно и то же подряд. У танка есть индикатор башни относительно корпуса. Курсор больше не пропадает в начале обучения стратегии.',
   'Hints (pop-ups and curator) — one switch in settings. Who you play as (unit or vehicle type) — "You: …" label in the HUD. Rifle and MG optics are transparent. The "Arsenal" panel is docked to the right, collapsible and switchable. "Solo without squad" (J) is removed. The strategist voice no longer repeats the same line. Tanks get a turret-vs-hull indicator. The cursor no longer disappears at the start of the strategy tutorial.',
   'Gợi ý (cửa sổ và người hướng dẫn) — một công tắc trong cài đặt. Bạn đang chơi gì (loại lính hoặc xe) — nhãn “Bạn: …” trong HUD. Kính ngắm súng trường và súng máy trong suốt. Bảng “Kho vũ khí” gắn bên phải, thu gọn và tắt được. Chế độ “một mình” (J) đã bỏ. Giọng chiến lược gia không lặp lại cùng một câu. Xe tăng có chỉ báo tháp pháo so với thân xe. Con trỏ không còn biến mất lúc bắt đầu hướng dẫn chiến thuật.',
   'רמזים (חלונות והמדריך) — מתג אחד בהגדרות. מי אתה (סוג לוחם או רכב) — תווית „אתה: …" ב-HUD. כוונות הרובה והמקלע שקופות. לוח „נשקייה" מוצמד לימין, מתכווץ ואפשר לכבות. מצב „לבד" (J) הוסר. קול האסטרטג לא חוזר על אותו משפט. בטנק יש חיווי כיוון הצריח ביחס לגוף. הסמן כבר לא נעלם בתחילת הדרכת האסטרטגיה.'],
];
{
  const hm0 = MENU.html_main;
  MENU.html_main = function(){
    let h = hm0.call(this).replace(/v7\.2 · /, 'v7.3 · ');
    const m = h.match(/<h3>[^<]*v7\.2[^<]*<\/h3>/);
    const news = `<h3>${tr('Новое в v7.3', 'New in v7.3', 'Mới trong v7.3', 'חדש ב-v7.3')}</h3><ul>${V73_NEWS.map(n => `<li>${tr(n[0], n[1], n[2], n[3])}</li>`).join('')}</ul>`;
    if (m) h = h.replace(m[0], news + m[0]);
    return h;
  };
  const al0 = MENU.applyLang;
  MENU.applyLang = function(){ al0.call(this); document.title = 'Portal Meteor — v7.3'; };
  if (typeof P71M !== 'undefined'){
    const pm0 = P71M.main;
    P71M.main = function(){ return pm0.call(this).replace(/v7\.2 · /, 'v7.3 · ').replace(/(Новое в |New in |Mới |חדש ב-)v7\.2/, '$1v7.3'); };
    const pn0 = P71M.news;
    P71M.news = function(){
      const all = V73_NEWS.concat(typeof V72_NEWS !== 'undefined' ? V72_NEWS : [], typeof V71_NEWS !== 'undefined' ? V71_NEWS : []);
      return `<div class="p71 p71news">${this.hd(tr('НОВОЕ В v7.3', 'NEW IN v7.3', 'MỚI TRONG v7.3', 'חדש ב-v7.3'), true)}<div class="p71g c2 news">${all.map((n, i) => `<div class="p71n"><b>${i + 1}</b><span>${tr(n[0], n[1], n[2], n[3])}</span></div>`).join('')}</div></div>`;
    };
  }
}

// =====================================================================
//  v7.3 — общие правки (ПК и телефон)
// =====================================================================
const V73 = {
  // ---- B3: за кого играешь (тип юнита / техники) в HUD
  whoName(c){
    if (!c) return '';
    if (c.cls === 'inf') return N2(roleOf(c).n);
    if (c.cls === 'bld') return tr('Турель', 'Turret', 'Tháp súng', 'צריח');
    const g = groupOf(c);
    return g ? groupLabel(g).replace(/\s+\d+$/, '') : '';
  },
  whoUpd(){
    let el = document.getElementById('who73');
    if (!el){ el = document.createElement('div'); el.id = 'who73'; document.body.appendChild(el); }
    const fps = S.mode === 'fps' && !S.attract && !MENU.isOpen() && !S.over, c = fps ? ctrlEntity() : null;
    const name = c ? this.whoName(c) : '';
    if (!name){ el.style.display = 'none'; return; }
    const ic = c.cls === 'inf' && typeof PRIO70 !== 'undefined' ? PRIO70.icon(PRIO70.clsOf(c)) + ' ' : '';
    const h = tr('Ты: ', 'You: ', 'Bạn: ', 'אתה: ') + `<b>${uixEsc(ic + name)}</b>`;
    if (el._h !== h){ el._h = h; el.innerHTML = h; }
    el.style.display = 'block';
    const hud = document.getElementById('hud'), r = hud ? hud.getBoundingClientRect() : null;
    const sl = (typeof M67 !== 'undefined' && M67.safe) ? M67.safe.l : 0;
    const left = r && r.width ? r.left : sl + 8, top = r && r.height ? r.bottom + 4 : 40;
    el.style.left = left + 'px'; el.style.top = top + 'px';
  },
  // ---- B8: танк / транспорт — куда повёрнута башня относительно корпуса
  turretHud(){
    if (S.mode !== 'fps' || S.attract || MENU.isOpen() || CAMFX.busy()) return;
    const c = ctrlEntity(); if (!c || c.cls !== 'tank' || !c.aim) return;
    const up = norm(c.pos), hf = tangent(c.fwd, up), af = tangent(c.aim, up);
    const right = norm(cross(hf, up));
    const ang = atan2(dot(af, right), dot(af, hf));   // 0 — башня смотрит вперёд, + вправо
    const W = innerWidth, H = innerHeight, g = octx, R = 27;
    const s = (typeof M67 !== 'undefined' && M67.active && M67.active()) ? M67.safe : { l: 0, r: 0, b: 0, t: 0 };
    const cx = W / 2, cy = H - s.b - (TOUCH.on ? 96 : 118);
    g.save(); g.translate(cx, cy);
    g.fillStyle = 'rgba(8,12,18,.5)'; g.strokeStyle = 'rgba(214,198,154,.5)'; g.lineWidth = 1;
    g.beginPath(); g.arc(0, 0, R, 0, PI * 2); g.fill(); g.stroke();
    // корпус (вид сверху, нос вверх)
    g.fillStyle = 'rgba(214,198,154,.85)'; g.fillRect(-7, -12, 14, 24);
    g.fillStyle = 'rgba(20,24,28,.9)'; g.fillRect(-5, -10, 10, 5);
    g.fillStyle = 'rgba(214,198,154,.85)'; g.fillRect(-9, -11, 3, 22); g.fillRect(6, -11, 3, 22);   // гусеницы / колёса
    // башня и ствол
    g.rotate(ang);
    g.fillStyle = '#ffb347'; g.beginPath(); g.arc(0, 0, 6, 0, PI * 2); g.fill();
    g.fillRect(-1.6, -R + 3, 3.2, R - 3);
    g.beginPath(); g.moveTo(0, -R - 1); g.lineTo(-4, -R + 7); g.lineTo(4, -R + 7); g.closePath(); g.fill();
    g.restore();
    const deg = Math.round(ang * 180 / PI), a = abs(deg);
    g.save(); g.textAlign = 'center'; g.font = '700 11px "Exo 2", Consolas, sans-serif'; g.fillStyle = a < 6 ? 'rgba(180,255,190,.95)' : '#ffd27a';
    g.shadowColor = '#000'; g.shadowBlur = 3;
    g.fillText(a < 6 ? tr('башня вперёд', 'turret ahead', 'tháp pháo thẳng', 'צריח קדימה') : a > 172 ? tr('башня назад', 'turret behind', 'tháp pháo sau', 'צריח אחורה') : (deg > 0 ? '→ ' : '← ') + a + '°', cx, cy + R + 13);
    g.restore();
  },
};
// B8: индикатор башни
{ const go0 = gunOverlay; gunOverlay = function(dt){ go0.apply(this, arguments); try { V73.turretHud(); } catch (e){ if (!V73.err){ V73.err = 1; console.warn('v73 turret', e); } } }; }
// B3: подпись «Ты: …»
{ const uf0 = uixFrame; let tt = 0;
  uixFrame = function(dt){ uf0(dt); tt -= dt; if (tt > 0) return; tt = 0.2; try { V73.whoUpd(); } catch (e){ if (!V73.err2){ V73.err2 = 1; console.warn('v73 who', e); } } }; }
// B7: рация стратега — одинаковые реплики подряд не повторяем; обычные реплики не чаще раза в 7 с
{ const r0 = AU.radio;
  AU.radio = function(text, pri){
    const now = performance.now(), key = String(text || '').toLowerCase().replace(/[\d.,:]+/g, '#').replace(/\s+/g, ' ').trim(), p = pri || 0;
    const R = this._r73 || (this._r73 = { last: '', t: 0, seen: {} });
    if (p < 3){
      if (key === R.last && now - R.t < 150000) return;                  // то же самое подряд
      if (R.seen[key] && now - R.seen[key] < 70000) return;              // недавно уже говорили
      if (p < 2 && now - R.t < 7000) return;                              // не чаще раза в 7 секунд
    }
    R.last = key; R.t = now; R.seen[key] = now;
    return r0.call(this, text, pri);
  }; }
// B6: схема обучения без пункта «отряд / один»
try { delete CTL72.schemes.pc.acts.squad; delete CTL72.schemes.v71.acts.squad; } catch (e){}
// стиль подписи «Ты: …»
{ const st = document.createElement('style'); st.id = 'v73css';
  st.textContent = '#who73{position:fixed;z-index:6;pointer-events:none;display:none;padding:2px 9px;border-radius:6px;background:rgba(10,12,14,.55);border:1px solid rgba(214,198,154,.35);color:#e8e2d0;font:600 12px "Exo 2",sans-serif;white-space:nowrap}#who73 b{color:#f6efd8;font-weight:800}body.touch #who73{font-size:11px;padding:1px 7px}';
  document.head.appendChild(st); }