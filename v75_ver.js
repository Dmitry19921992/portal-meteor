// =====================================================================
//  v7.5 — МЕНЮ «ВЕРСИЯ ИГРЫ»: внутри itch-архива 3 последние версии + исторические вехи.
//  Каждая старая версия — отдельный html в папке versions/ (грузится только при выборе), со своими
//  ключами localStorage (префикс pmv74: и т. п. — сохранения и настройки v7.5 не трогаются).
//  Выбор запоминается (pm_ver75): при следующем запуске сразу откроется выбранная версия;
//  в старой версии внизу слева кнопка «↩ Версии» — вернуться к выбору.
//  Архив собирает tools\mkitch75.py (он же включает VER75_ARCHIVE). Без архива меню честно об этом пишет.
// =====================================================================
const VER75 = {
  archive: typeof VER75_ARCHIVE !== 'undefined' && VER75_ARCHIVE,
  cur: 'v7_5',
  // mb — вес файла (замер 24.10.2026); n — коротко «что нового» [ru, en]
  L: [
    { id: 'v7_5', v: 'v7.5', d: '24.10.2026', mb: 6.4, tag: 'new', n: ['Кино-сплитскрин, без ядра и тоннелей, стройка солдатами, метки стратега, тайники, ползком, меню разработчика', 'Split-screen cinema, no core or tunnels, troopers build, strategist marks, caches, crawling, developer menu'] },
    { id: 'v7_4', v: 'v7.4', d: '24.10.2026', mb: 6.5, n: ['Три режима стиков на телефоне, простая стратегия, пушка машины, рельеф с каньонами, классы отрядов, взрывчатка', 'Three phone stick modes, simple strategy, vehicle gun seat, canyon terrain, squad classes, explosives'] },
    { id: 'v7_3', v: 'v7.3', d: '21.10.2026', mb: 6.4, n: ['Лёгкий режим, два стика на телефоне', 'Lite mode, two-stick phone controls'] },
    { id: 'v7_0', v: 'v7.0', d: '20.10.2026', mb: 6.1, tag: 'mile', n: ['Веха: форпосты и улучшения штаба, киношные промахи, падение от взрывов', 'Milestone: outposts and HQ upgrades, cinematic misses, knockdowns'] },
    { id: 'v6', v: 'v6.0', d: '19.10.2026', mb: 0.9, tag: 'mile', n: ['Веха: стратегия + шутер в одной игре, оружие v6', 'Milestone: strategy + shooter in one game, v6 guns'] },
    { id: 'v5', v: 'v5.0', d: '19.10.2026', mb: 0.6, tag: 'mile', n: ['Веха: база, отряды, техника', 'Milestone: base, squads, vehicles'] },
    { id: 'v4', v: 'v4.0', d: '18.10.2026', mb: 0.4, tag: 'mile', n: ['Веха: первые армии и стратегия', 'Milestone: first armies and strategy'] },
    { id: 'v3', v: 'v3.0', d: '18.10.2026', mb: 0.2, tag: 'mile', n: ['Веха: метеорит больше, рэймарчер', 'Milestone: bigger meteor, raymarcher'] },
    { id: 'v2', v: 'v2.0', d: '18.10.2026', mb: 0.07, tag: 'mile', n: ['Веха: ранец, гравитация, исследователи', 'Milestone: jetpack, gravity, explorers'] },
    { id: 'v1', v: 'v1', d: '18.10.2026', mb: 0.03, tag: 'mile', n: ['Самая первая: метеорит внутри неба-портала', 'The very first: a meteor inside the portal sky'] },
  ],
  choice(){ try { return localStorage.getItem('pm_ver75') || 'latest'; } catch (e){ return 'latest'; } },
  pick(id){
    try { localStorage.setItem('pm_ver75', id === this.cur ? 'latest' : id); } catch (e){}
    if (typeof STATS75 !== 'undefined'){ STATS75.ev('version', { to: id }); STATS75.flush(true); }
    if (id === this.cur){ MENU.show('main'); return; }
    if (!this.archive){ feed(tr('Старые версии есть только в itch-архиве игры', 'Old versions are only in the itch build', 'Bản cũ chỉ có trong bản itch', 'גרסאות ישנות רק בגרסת itch'), '#ffb347'); return; }
    location.href = 'versions/' + id + '.html';
  },
};
MENU.html_ver75 = function(){
  const ch = VER75.choice(), cur = ch === 'latest' ? VER75.cur : ch;
  const row = o => {
    const me = o.id === VER75.cur, sel = o.id === cur;
    const tag = o.tag === 'new' ? `<em class="nw">${tr('новая', 'new', 'mới', 'חדש')}</em>` : o.tag === 'mile' ? `<em>${tr('веха', 'milestone', 'mốc', 'אבן דרך')}</em>` : '';
    const dis = !me && !VER75.archive;
    return `<button class="v75r ${sel ? 'sel' : ''} ${dis ? 'off' : ''}" data-v75="${o.id}"><b>${o.v}</b>${tag}<span><i>${o.d}${me ? ' · ' + tr('эта', 'this one', 'bản này', 'זו') : ''} · ${o.mb >= 1 ? o.mb.toFixed(1) : o.mb.toFixed(2)} ${tr('МБ', 'MB', 'MB', 'MB')}</i><small>${uixEsc(tr(o.n[0], o.n[1], o.n[1], o.n[1]))}</small></span>${sel ? '<q>✓</q>' : ''}</button>`;
  };
  return `<div class="mcol v75m"><div class="hdr"><button id="m_back" class="bk">‹ ${tr('Назад', 'Back', 'Quay lại', 'חזרה')}</button><h2>🕘 ${tr('ВЕРСИЯ ИГРЫ', 'GAME VERSION', 'PHIÊN BẢN', 'גרסת המשחק')}</h2></div>` +
    `<p class="sub">${tr('Не нравится новая версия — играй в привычную. Выбор запоминается; у каждой версии свои сохранения и настройки (эти не пропадут). Старая версия грузится только при выборе.', 'Do not like the new version — play the one you are used to. The choice is remembered; every version has its own saves and settings (these stay safe). An old version is loaded only when chosen.', 'Không thích bản mới — chơi bản quen thuộc. Lựa chọn được nhớ; mỗi bản có bản lưu riêng.', 'לא אוהב את הגרסה החדשה — שחק בישנה. הבחירה נשמרת; לכל גרסה שמירות משלה.')}` +
    (VER75.archive ? '' : ` <b style="color:#ffb347">${tr('Здесь архива нет — старые версии доступны в игре на itch.io.', 'No archive here — old versions are available in the itch.io build.', 'Không có kho lưu trữ ở đây.', 'אין כאן ארכיון.')}</b>`) + `</p>` +
    `<h4>${tr('Последние', 'Latest', 'Mới nhất', 'אחרונות')}</h4><div class="v75g">${VER75.L.filter(o => o.tag !== 'mile').map(row).join('')}</div>` +
    `<h4>${tr('Исторические вехи', 'Historical milestones', 'Các mốc lịch sử', 'אבני דרך')}</h4><div class="v75g">${VER75.L.filter(o => o.tag === 'mile').map(row).join('')}</div></div>`;
};
{ const w0 = MENU.wire;
  MENU.wire = function(name){
    w0.apply(this, arguments);
    const el = $('screen'); if (!el) return;
    if (name === 'main'){ const b = $('m_ver75'); if (b) b.onclick = e => { e.stopPropagation(); AU.init(); emit('ui', { kind: 'ok' }); MENU.show('ver75', true); }; }
    if (name !== 'ver75') return;
    const bk = $('m_back'); if (bk) bk.onclick = e => { e.stopPropagation(); MENU.back(); };
    el.querySelectorAll('[data-v75]').forEach(b => b.onclick = e => { e.stopPropagation(); AU.init(); emit('ui', { kind: 'ok' }); VER75.pick(b.dataset.v75); });
  }; }
// кнопка в главном меню (ПК) — после «Кино-режим»; на телефоне — плитка
{ const hm0 = MENU.html_main;
  MENU.html_main = function(){
    const h = hm0.apply(this, arguments), i = h.indexOf('id="m_cinema"');
    const btn = this.btn('ver75', '🕘 ' + tr('Версия игры', 'Game version', 'Phiên bản', 'גרסת המשחק') + ` <small style="opacity:.6">v7.5 · ${tr('и старые: v7.4, v7.3, вехи v1–v7.0', 'and older: v7.4, v7.3, milestones v1–v7.0', 'và bản cũ', 'וגרסאות ישנות')}</small>`);
    if (i < 0) return h + btn;
    const j = h.indexOf('</button>', i) + 9;
    return h.slice(0, j) + btn + h.slice(j);
  }; }
if (typeof P71M !== 'undefined'){
  const pm0 = P71M.main;
  P71M.main = function(){
    const h = pm0.apply(this, arguments);
    return h.replace(/(<button[^>]*id="m_cinema"[^>]*>[\s\S]*?<\/button>)/, '$1' + this.tile('id="m_ver75"', 'clock', tr('Версия', 'Version', 'Phiên bản', 'גרסה'), 'v7.5'));
  };
}
// ?versions=1 (кнопка «↩ Версии» из старой версии) — сразу экран выбора
{ const go = () => { if (document.getElementById('boot').classList.contains('done') && MENU.cur === 'main') MENU.show('ver75', true); else setTimeout(go, 400); };
  try { if (new URLSearchParams(location.search).get('versions')) setTimeout(go, 800); } catch (e){} }
(function v75vCSS(){
  const st = document.createElement('style');
  st.textContent = `#screen .v75m{max-width:820px;width:100%} #screen .v75m .hdr{display:flex;align-items:center;gap:12px;width:100%} #screen .v75m .hdr h2{margin:0;font:400 24px "Russo One"}
  #screen .v75m h4{margin:10px 0 4px;font:600 11px "Exo 2";letter-spacing:.14em;text-transform:uppercase;opacity:.75;align-self:flex-start}
  #screen .v75g{display:grid;grid-template-columns:1fr 1fr;gap:6px;width:100%}
  #screen .v75r{position:relative;display:flex;align-items:center;gap:10px;text-align:left;min-height:52px;padding:6px 12px}
  #screen .v75r > b{font:400 18px "Russo One";min-width:54px;color:#ffd27a} #screen .v75r em{position:absolute;right:8px;top:4px;font-style:normal;font-size:9.5px;letter-spacing:.1em;text-transform:uppercase;opacity:.7} #screen .v75r em.nw{color:#8fffaa;opacity:1}
  #screen .v75r span{display:flex;flex-direction:column;min-width:0} #screen .v75r i{font-style:normal;font-size:11px;opacity:.75} #screen .v75r small{font-size:11px;opacity:.85;line-height:1.25}
  #screen .v75r.sel{border-color:#8fffaa !important} #screen .v75r q{position:absolute;right:10px;bottom:6px;quotes:none;color:#8fffaa;font-weight:800} #screen .v75r.off{opacity:.45}
  body.touch #screen .v75g{grid-template-columns:1fr 1fr} body.touch #screen .v75r small{font-size:10px}`;
  document.head.appendChild(st);
})();
