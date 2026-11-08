// =====================================================================
//  v8.14 — РЕЖИМ ОТЗЫВА (FB814): инструменты плейтеста под запись экрана + голоса (OBS на ПК, запись экрана на телефоне).
//  • Оверлей в углу (ПК — справа вверху вместо строки FPS; телефон/планшет — слева под миникартой): версия, таймер боя,
//    часы, FPS (среднее за 1 с), графика (ADG80.status), режим, фракция, устройство, id сессии. Виден и в «чистом экране» F9.
//  • «Заметка»: ПК — \ (Backslash; N занята: линия к задаче / стройка / ответ «нет»; переназначается в «Управлении»),
//    ещё раз \ в течение 4 с — подписать текстом; геймпад — держать View + нажать Start; телефон/планшет — кнопка ✎.
//    Запись: время, таймер боя, версия, режим, фракция, камера, выделение/отряд, FPS, графика, последние 10 строк ленты,
//    текст (по желанию) + снимок холста (JPEG ~640 px). Хранение — IndexedDB (запасной вариант — localStorage без снимков).
//  • Экран «Заметки отзыва» (Настройки, пауза): список, «Скачать всё» (один JSON с base64-снимками), «Очистить» (с подтверждением),
//    короткая инструкция. Включение: Настройки → «Режим отзыва» или ?fb814=1 (?fb814=0 — принудительно выкл.).
//  Хуки — обёртки: render, feed, MENU.html_settings / html_pause / wire, P71M.sec, GP812.frame. Новый код только здесь.
// =====================================================================
const FB814 = {
  q: (() => { try { return new URLSearchParams(location.search).get('fb814'); } catch (e){ return null; } })(),
  err: {}, sid: '', notes: [], loaded: false, mode: 'idb', db: null, feedBuf: [], fps: 0, fc: 0, fT: 0, upT: 0,
  want: null, lastNote: null, lastT: 0, inp: null, clearArm: 0, open: null, gpu: null,
  stats: { notes: 0, shots: 0, shotFail: 0, saves: 0, saveFail: 0, exports: 0, clears: 0, texts: 0, pad: 0, tap: 0, ticks: 0 },
  safe(fn, tag){ try { return fn(); } catch (e){ if (!this.err[tag]){ this.err[tag] = 1; console.warn('FB814 ' + tag, e); } } },
  L: (ru, en, vi) => tr(ru, en, vi !== undefined ? vi : en),
  esc(s){ return String(s === undefined || s === null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]); },
  ls(k, v){ try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e){ return null; } },
  active(){ return this.q === '1' || (this.q !== '0' && !!SET.fb814); },
  ver(){ return typeof FX87 !== 'undefined' && FX87.VER ? 'v' + FX87.VER : 'v8.14'; },
  mm(s){ s = Math.max(0, Math.floor(s || 0)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); },
  clock(d){ d = d || new Date(); return [d.getHours(), d.getMinutes(), d.getSeconds()].map(x => String(x).padStart(2, '0')).join(':'); },
  dev(){ return typeof TOUCH !== 'undefined' && TOUCH.on ? (typeof TAB812 !== 'undefined' && TAB812.on ? 'tablet' : 'phone') : 'pc'; },
  devName(d){ d = d || this.dev(); return d === 'pc' ? this.L('ПК', 'PC', 'PC') : d === 'tablet' ? this.L('Планшет', 'Tablet', 'Máy tính bảng') : this.L('Телефон', 'Phone', 'Điện thoại'); },
  modeKey(){ if (S.attract) return 'menu'; return typeof V87M !== 'undefined' ? V87M.mode() : (S.mode === 'fps' ? 'fps' : 'rts'); },
  modeName(k){ k = k || this.modeKey(); return { menu: this.L('Меню', 'Menu', 'Menu'), rts: this.L('Стратег', 'Strategist', 'Chiến lược'), cmd: this.L('Командир', 'Commander', 'Chỉ huy'), fps: this.L('Шутер', 'Shooter', 'Bắn súng') }[k] || k; },
  fac(){ return this.safe(() => typeof FAC76 !== 'undefined' && typeof FI76 === 'function' ? FAC76.name(FI76(0)) : (typeof TEAMN !== 'undefined' ? N2(TEAMN[0]) : ''), 'fac') || ''; },
  gfx(){ return this.safe(() => typeof ADG80 !== 'undefined' ? ADG80.status() : `×${S.scale}`, 'gfx') || ''; },
  keyName(){ const c = (SET.bind && SET.bind.note814) || 'Backslash'; return typeof keyLabel === 'function' ? keyLabel(c) : c; },
  padOn(){ return typeof GP812 !== 'undefined' && GP812.active; },
  hotkey(){ return this.padOn() ? 'View+Start' : (typeof TOUCH !== 'undefined' && TOUCH.on ? '✎' : this.keyName()); },
  renderer(){
    if (this.gpu !== null) return this.gpu;
    this.gpu = this.safe(() => {
      if (typeof gl === 'undefined' || !gl) return '';
      const x = gl.getExtension('WEBGL_debug_renderer_info');
      const r = x ? gl.getParameter(x.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER), v = x ? gl.getParameter(x.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR);
      return String(v || '') + ' / ' + String(r || '');
    }, 'gpu') || (typeof ADG80 !== 'undefined' && ADG80.gpu) || '';
    return this.gpu;
  },
  // ---------------------------------------------------------------- хранилище: IndexedDB → localStorage (без снимков)
  idb(){
    if (this.db) return this.db;
    this.db = new Promise((res, rej) => {
      try {
        if (typeof indexedDB === 'undefined' || !indexedDB) return rej(new Error('no idb'));
        const r = indexedDB.open('pm814', 1);
        r.onupgradeneeded = () => { try { r.result.createObjectStore('notes', { keyPath: 'id' }); } catch (e){} };
        r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error || new Error('idb open')); r.onblocked = () => rej(new Error('idb blocked'));
      } catch (e){ rej(e); }
    });
    return this.db;
  },
  tx(mode, fn){ return this.idb().then(db => new Promise((res, rej) => { try { const t = db.transaction('notes', mode), st = t.objectStore('notes'); const out = fn(st); t.oncomplete = () => res(out && out.result !== undefined ? out.result : out); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error || new Error('abort')); } catch (e){ rej(e); } })); },
  lsAll(){ try { return JSON.parse(localStorage.getItem('pm814_notes') || '[]'); } catch (e){ return []; } },
  lsPut(list){ try { localStorage.setItem('pm814_notes', JSON.stringify(list.map(n => Object.assign({}, n, { img: undefined })))); return true; } catch (e){ return false; } },
  load(){
    return this.tx('readonly', st => st.getAll()).then(list => { this.mode = 'idb'; return list || []; })
      .catch(e => { this.mode = 'ls'; return this.lsAll(); })
      .then(list => { list.sort((a, b) => (a.t || 0) - (b.t || 0)); this.notes = list; this.loaded = true; return list; });
  },
  save(n){
    const ok = () => { this.stats.saves++; return true; }, bad = e => { this.stats.saveFail++; console.warn('FB814 save', e); return false; };
    if (this.mode === 'idb') return this.tx('readwrite', st => st.put(n)).then(ok).catch(e => {
      // нет места / IDB отвалилась — localStorage без снимков
      this.mode = 'ls'; return this.lsPut(this.notes) ? ok() : bad(e); });
    return Promise.resolve(this.lsPut(this.notes) ? ok() : bad('ls'));
  },
  clear(){
    this.notes = []; this.stats.clears++; this.lastNote = null; this.ls('pm814_n', '0');
    try { localStorage.removeItem('pm814_notes'); } catch (e){}
    return this.mode === 'idb' ? this.tx('readwrite', st => st.clear()).catch(e => console.warn('FB814 clear', e)) : Promise.resolve();
  },
  // ---------------------------------------------------------------- снимок состояния
  v3(p){ return p && p.length >= 3 ? [+p[0].toFixed(1), +p[1].toFixed(1), +p[2].toFixed(1)] : null; },
  camInfo(){
    const c = S.cam; if (!c || !c.pos) return null;
    const o = { pos: this.v3(c.pos), fwd: c.fwd ? [+c.fwd[0].toFixed(3), +c.fwd[1].toFixed(3), +c.fwd[2].toFixed(3)] : null };
    if (c.fwd) o.target = this.v3([c.pos[0] + c.fwd[0] * 20, c.pos[1] + c.fwd[1] * 20, c.pos[2] + c.fwd[2] * 20]);   // точка в 20 м по взгляду
    if (S.mode !== 'fps' && S.rts && S.rts.dir) o.rts = { dir: this.v3(S.rts.dir.map(x => x * 1000)).map(x => x / 1000), h: +(+S.rts.h || 0).toFixed(1) };   // Стратег/Командир: точка над картой + высота
    return o;
  },
  label(g){ return this.safe(() => typeof groupLabel === 'function' ? groupLabel(g) : (typeof entName === 'function' ? entName(g) : ''), 'lbl') || ''; },
  selInfo(){
    const out = [];
    for (const g of S.sel || []){ if (out.length >= 12) break;
      const o = { kind: g.units ? 'squad' : (g.cls || g.type || '?'), name: this.label(g) };
      if (g.units) o.n = g.units.filter(u => u.alive !== false).length;
      if (g.order) o.order = g.order;
      if (g.hp !== undefined) o.hp = Math.round(g.hp);
      const L = g.units ? g.units[0] : g; if (L && L.pos) o.pos = this.v3(L.pos);
      out.push(o); }
    if (S.selB) out.push({ kind: 'building', name: this.safe(() => entName(S.selB), 'selb') || S.selB.type, hp: Math.round(S.selB.hp || 0) });
    return out;
  },
  me(){
    return this.safe(() => {
      const e = typeof ctrlEntity === 'function' ? ctrlEntity() : null; if (!e) return null;
      return { name: this.label(e.squad || e) || entName(e), cls: e.cls, role: e.role || e.vk || undefined, hp: e.hp !== undefined ? Math.round(e.hp) : undefined, pos: this.v3(e.pos) };
    }, 'me') || null;
  },
  squad(){
    return this.safe(() => {
      if (typeof CMD85 === 'undefined' || !CMD85.g) return null;
      const g = CMD85.g; return { name: this.label(g), n: (g.units || []).filter(u => u.alive !== false).length, order: g.order };
    }, 'sq') || null;
  },
  entry(src){
    const now = new Date(), n = (+this.ls('pm814_n') || this.notes.reduce((a, x) => Math.max(a, x.n || 0), 0)) + 1;
    this.ls('pm814_n', String(n));
    const mk = this.modeKey();
    return {
      id: this.sid + '-' + n + '-' + now.getTime().toString(36), n, sid: this.sid, t: now.getTime(), wall: now.toISOString(), clock: this.clock(now),
      match: S.attract ? null : +(S.time || 0).toFixed(1), matchTxt: S.attract ? '' : this.mm(S.time), ver: this.ver(), mode: mk, modeName: this.modeName(mk),
      fac: S.attract ? '' : this.fac(), dev: this.dev(), src, fps: this.fps, gfx: this.gfx(), gfxInfo: this.safe(() => { const i = ADG80.info(); return { L: i.L, s: i.s, cw: i.cw, ch: i.ch, q: i.q }; }, 'gi') || null,
      paused: !!S.paused, menu: typeof MENU !== 'undefined' && MENU.cur ? MENU.cur : '', cam: this.camInfo(), me: this.me(), squad: this.squad(), sel: this.selInfo(),
      feed: this.feedBuf.slice(-10), text: '', img: '', imgW: 0, imgH: 0,
    };
  },
  // ---------------------------------------------------------------- заметка
  note(src){
    if (!this.active()) return null;
    const now = performance.now();
    // второе нажатие клавиши за 4 с — подписать последнюю заметку
    if (src === 'key' && this.lastNote && now - this.lastT < 4000 && !this.inp){ this.ask(this.lastNote); return this.lastNote; }
    const e = this.safe(() => this.entry(src), 'entry'); if (!e) return null;
    this.notes.push(e); this.lastNote = e; this.lastT = now; this.stats.notes++;
    if (src === 'pad') this.stats.pad++; if (src === 'tap') this.stats.tap++;
    this.want = e;
    // снимок — сразу после следующего кадра (render-обёртка); не успел за 600 мс — сохраняем без снимка
    setTimeout(() => { if (this.want === e){ this.want = null; this.stats.shotFail++; this.done(e); } }, 600);
    this.flash();
    return e;
  },
  grab(){
    const e = this.want; if (!e) return; this.want = null;
    this.safe(() => {
      const c = typeof canvas !== 'undefined' ? canvas : (gl && gl.canvas); if (!c || !c.width) throw new Error('no canvas');
      const W = Math.min(640, c.width), H = Math.max(1, Math.round(W * c.height / c.width));
      const o = this.cv || (this.cv = document.createElement('canvas')); o.width = W; o.height = H;
      o.getContext('2d').drawImage(c, 0, 0, W, H);
      e.img = o.toDataURL('image/jpeg', 0.72); e.imgW = W; e.imgH = H; this.stats.shots++;
    }, 'grab');
    this.done(e);
  },
  done(e){
    this.save(e).then(ok => { if (this.mode === 'ls' && e.img) e.imgLost = true; });
    this.toast(e);
    if (MENU.cur === 'fb814') MENU.show('fb814');
  },
  // ---------------------------------------------------------------- подпись: маленькое поле, Enter / Esc
  ask(e){
    if (!e || this.inp) return;
    const box = this.ensure(), el = document.createElement('div'); el.id = 'fb814in';
    el.innerHTML = `<b>✎ #${e.n}</b><input type="text" maxlength="200" enterkeyhint="done" autocomplete="off" placeholder="${this.esc(this.L('Коротко: что не так / что понравилось', 'In short: what is wrong / what you liked', 'Ngắn gọn: lỗi gì / thích gì'))}"><button data-k="ok">✓</button><button data-k="x">✕</button>`;
    box.appendChild(el); this.inp = el;
    const i = el.querySelector('input'); i.value = e.text || '';
    try { if (typeof keys !== 'undefined') for (const k in keys) keys[k] = false; } catch (er){}
    const fin = ok => { if (!this.inp) return; if (ok){ e.text = i.value.trim().slice(0, 200); if (e.text) this.stats.texts++; this.save(e); this.toast(e, true); } el.remove(); this.inp = null; try { i.blur(); } catch (er){} };
    i.onkeydown = ev => { ev.stopPropagation(); if (ev.key === 'Enter' || ev.code === 'Enter' || ev.code === 'NumpadEnter'){ ev.preventDefault(); fin(true); } else if (ev.code === 'Escape'){ ev.preventDefault(); fin(false); } };
    i.onkeyup = ev => ev.stopPropagation(); i.onkeypress = ev => ev.stopPropagation();
    for (const b of el.querySelectorAll('button')) b.onclick = b.ontouchend = ev => { ev.preventDefault(); ev.stopPropagation(); fin(b.dataset.k === 'ok'); };
    el.addEventListener('touchstart', ev => ev.stopPropagation(), { passive: true });
    el.addEventListener('mousedown', ev => ev.stopPropagation());
    this.askT = performance.now();
    setTimeout(() => { try { i.focus({ preventScroll: true }); } catch (er){ i.focus(); } }, 0);
    this.fin = fin;
  },
  // ---------------------------------------------------------------- оверлей, тост, вспышка
  ensure(){
    let el = this.el;
    if (el && el.isConnected) return el;
    el = this.el = document.createElement('div'); el.id = 'fb814';
    el.innerHTML = `<div id="fb814o"><div class="l1"></div><div class="l2"></div><div class="l3"></div></div><button id="fb814pen" aria-label="note">✎</button><div id="fb814t"></div>`;
    document.body.appendChild(el);
    const pen = el.querySelector('#fb814pen');
    const go = ev => { ev.preventDefault(); ev.stopPropagation(); this.safe(() => { const n = this.note('tap'); if (n) setTimeout(() => this.ask(n), 30); }, 'pen'); };
    pen.addEventListener('touchstart', ev => { ev.stopPropagation(); }, { passive: true });
    pen.addEventListener('touchend', go); pen.addEventListener('click', go);
    const t = el.querySelector('#fb814t');
    t.addEventListener('click', ev => { const b = ev.target.closest('button'); if (b){ ev.stopPropagation(); this.ask(this.lastNote); } });
    return el;
  },
  toast(e, txt){
    const el = this.ensure().querySelector('#fb814t'); if (!el) return;
    const ph = typeof TOUCH !== 'undefined' && TOUCH.on;
    const extra = txt ? (e.text ? ' · ✎ «' + this.esc(e.text.slice(0, 40)) + (e.text.length > 40 ? '…' : '') + '»' : '')
      : (!e.img && this.stats.shots === 0 && this.stats.shotFail ? ' · ' + this.L('без снимка', 'no screenshot', 'không ảnh') : '')
        + (this.padOn() || ph ? '' : ` <small>${this.esc(this.keyName())} ${this.L('ещё раз — подписать', 'again — add text', 'lần nữa — thêm chữ')}</small>`)
        + (ph && !this.inp ? ` <button>✎ ${this.L('подписать', 'add text', 'thêm chữ')}</button>` : '');
    el.innerHTML = `📝 ${this.L('Заметка', 'Note', 'Ghi chú')} #${e.n} ${this.L('сохранена', 'saved', 'đã lưu')}${extra}`;
    el.classList.add('on'); clearTimeout(this.tT); this.tT = setTimeout(() => el.classList.remove('on'), ph ? 3500 : 2200);
  },
  flash(){ const o = this.ensure(); o.classList.remove('flash'); void o.offsetWidth; o.classList.add('flash'); clearTimeout(this.flT); this.flT = setTimeout(() => o.classList.remove('flash'), 450); },
  tick(){
    const now = performance.now(); this.fc++;
    if (now - this.fT >= 1000){ this.fps = Math.round(this.fc * 1000 / (now - this.fT)); this.fc = 0; this.fT = now; }
    const on = this.active(), B = document.body.classList;
    if (B.contains('fb814on') !== on) B.toggle('fb814on', on);
    if (!on){ if (this.inp && this.fin) this.fin(false); return; }
    if (B.contains('fb814dbg') !== !!S.debug) B.toggle('fb814dbg', !!S.debug);
    const bd = !S.attract && S.mode !== 'fps', mo = MENU.isOpen();   // сенсор: в Стратеге/Командире — правее левых панелей; в меню — скрыт
    if (B.contains('fb814b') !== bd) B.toggle('fb814b', bd); if (B.contains('fb814m') !== mo) B.toggle('fb814m', mo);
    if (now - this.upT < 250) return; this.upT = now; this.stats.ticks++;
    const el = this.ensure(), c = el.firstChild.children, mk = this.modeKey();
    const l1 = `${this.ver()} · ⏱ ${S.attract ? '--:--' : this.mm(S.time)} · ${this.clock()}`;
    const l2 = `${this.fps} FPS · ${this.gfx()}`;
    const l3 = `${this.modeName(mk)}${S.attract ? '' : ' · ' + this.fac()} · ${this.devName()} · #${this.sid}${typeof TOUCH !== 'undefined' && TOUCH.on ? '' : ' · ✎ ' + this.hotkey()}`;
    if (c[0].textContent !== l1) c[0].textContent = l1;
    if (c[1].textContent !== l2) c[1].textContent = l2;
    if (c[2].textContent !== l3) c[2].textContent = l3;
    // поле подписи не держит фокус бесконечно: 25 с без ввода — закрыть
    if (this.inp && this.fin){ const i = this.inp.querySelector('input'); if (i && !i.value && now - this.askT > 25000) this.fin(false); }
  },
  // ---------------------------------------------------------------- экспорт
  meta(){
    return { format: 'portal-meteor-feedback-notes', formatV: 1, game: 'Portal Meteor', version: this.ver(), build: typeof BUILD_DATE !== 'undefined' ? BUILD_DATE : '',
      exported: new Date().toISOString(), session: this.sid, sessions: [...new Set(this.notes.map(n => n.sid))], lang: SET.lang,
      userAgent: navigator.userAgent, platform: navigator.platform || '', device: this.dev(), touch: typeof TOUCH !== 'undefined' && TOUCH.on, gamepad: this.padOn() ? String(GP812.id || '') : '',
      screen: { w: screen.width, h: screen.height, vw: innerWidth, vh: innerHeight, dpr: devicePixelRatio || 1 },
      gpu: this.renderer(), gfx: this.gfx(), gfxInfo: this.safe(() => { const i = ADG80.info(); return { L: i.L, s: i.s, cw: i.cw, ch: i.ch, q: i.q, mode: i.mode }; }, 'gi2') || null,
      storage: this.mode, count: this.notes.length,
      howto: 'Each note: wall = real time (ISO), clock = local time, match = seconds since match start (game time), img = JPEG data URL of the 3D canvas (HUD is not in it - see the screen recording).' };
  },
  fname(){ const d = new Date(), p = x => String(x).padStart(2, '0'); return `portal-meteor-notes-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}-${this.sid}.json`; },
  json(){ return JSON.stringify(Object.assign(this.meta(), { notes: this.notes.map(n => Object.assign({}, n)) }), null, 1); },
  download(){
    const s = this.json(), name = this.fname(); this.stats.exports++;
    this.lastExport = { name, bytes: s.length };
    try {
      const b = new Blob([s], { type: 'application/json' }), u = URL.createObjectURL(b), a = document.createElement('a');
      a.href = u; a.download = name; a.style.display = 'none'; document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(u); a.remove(); }, 4000);
      return true;
    } catch (e){ console.warn('FB814 download', e); return false; }
  },
  canShare(){ try { return !!(navigator.canShare && navigator.share && typeof File !== 'undefined' && navigator.canShare({ files: [new File(['{}'], 'a.json', { type: 'application/json' })] })); } catch (e){ return false; } },
  share(){
    try { const f = new File([this.json()], this.fname(), { type: 'application/json' }); this.stats.exports++;
      navigator.share({ files: [f], title: 'Portal Meteor — notes' }).catch(() => {}); } catch (e){ console.warn('FB814 share', e); this.download(); }
  },
  // ---------------------------------------------------------------- экран «Заметки отзыва»
  help(){
    const L = this.L, k = `<kbd>${this.esc(this.keyName())}</kbd>`;
    return [
      L('1. Включи запись экрана с голосом (ПК — OBS, телефон — встроенная запись экрана с микрофоном) и «Режим отзыва» здесь.', '1. Start a screen recording with your voice (PC — OBS, phone — the built-in screen recorder with mic) and turn on Feedback mode here.', '1. Bật quay màn hình kèm giọng nói (PC — OBS, điện thoại — trình quay màn hình có micro) và bật Chế độ góp ý tại đây.'),
      L('2. Играй и думай вслух: что непонятно, что раздражает, что нравится. Угол экрана показывает версию, время и FPS — по ним запись сверяется с заметками.', '2. Play and think aloud: what is unclear, annoying, fun. The corner shows version, time and FPS — they match the recording to the notes.', '2. Vừa chơi vừa nói to suy nghĩ: điều gì khó hiểu, khó chịu, thú vị. Góc màn hình hiện phiên bản, thời gian và FPS — dùng để khớp bản ghi với ghi chú.'),
      L('3. Когда что-то важно — заметка: ПК ', '3. When something matters — take a note: PC ', '3. Khi có điều quan trọng — ghi chú: PC ') + k + L(' (ещё раз ', ' (press ', ' (nhấn lại ') + k + L(' — подписать текстом), геймпад — держи View и нажми Start, телефон — кнопка ✎.', ' again to add text), gamepad — hold View and press Start, phone — the ✎ button.', ' để thêm chữ), tay cầm — giữ View và nhấn Start, điện thoại — nút ✎.'),
      L('4. После игры: «Скачать всё» и отправь файл Claude вместе с записью.', '4. After playing: Download all and send the file to Claude together with the recording.', '4. Sau khi chơi: Tải tất cả và gửi tệp cho Claude cùng bản ghi.'),
    ];
  },
  item(n){
    const L = this.L, op = this.open === n.id;
    const meta = [n.clock, n.matchTxt ? '⏱ ' + n.matchTxt : '', n.modeName, n.fac, n.fps + ' FPS', this.devName(n.dev)].filter(Boolean).join(' · ');
    const img = n.img ? `<img src="${n.img}" alt="">` : `<i class="noimg">${n.imgLost ? L('снимок не поместился', 'screenshot did not fit', 'ảnh không lưu được') : L('нет снимка', 'no screenshot', 'không ảnh')}</i>`;
    return `<button class="fbn${op ? ' op' : ''}" data-fbn="${this.esc(n.id)}">${img}<div><b>#${n.n}</b> <small>${this.esc(meta)}</small>
      <p>${n.text ? '✎ ' + this.esc(n.text) : `<em>${L('без текста — смотри голос на записи', 'no text — see the voice in the recording', 'không có chữ — nghe giọng nói trong bản ghi')}</em>`}</p>
      ${op ? `<p class="m">${this.esc((n.feed || []).slice(-5).map(f => f.text).join(' · '))}</p><p class="m">${this.esc(n.gfx)} · ${this.esc(n.ver)} · #${this.esc(n.sid)}</p>` : ''}</div></button>`;
  },
  html(){
    const L = this.L, on = this.active(), N = this.notes.length, imgs = this.notes.filter(n => n.img).length;
    const kb = this.notes.reduce((a, n) => a + (n.img ? n.img.length : 0) + 600, 0) / 1024;
    const forced = this.q === '1' || this.q === '0';
    const list = N ? this.notes.slice().reverse().map(n => this.item(n)).join('') : `<p class="fbe">${L('Заметок пока нет.', 'No notes yet.', 'Chưa có ghi chú.')}</p>`;
    const armed = performance.now() < this.clearArm;
    return `<div class="mcol wide fb814page"><h2>📝 ${L('ЗАМЕТКИ ОТЗЫВА', 'FEEDBACK NOTES', 'GHI CHÚ GÓP Ý')}</h2>
      <div class="fbtop"><button id="fb814tog" class="${on ? 'on' : ''}">${L('Режим отзыва', 'Feedback mode', 'Chế độ góp ý')}: <b>${on ? L('ВКЛ', 'ON', 'BẬT') : L('ВЫКЛ', 'OFF', 'TẮT')}</b>${forced ? ' <small>(?fb814)</small>' : ''}</button>
      <span class="fbk">✎ ${L('Заметка', 'Note', 'Ghi chú')}: <kbd>${this.esc(this.keyName())}</kbd> · 🎮 View+Start · ${L('телефон', 'phone', 'điện thoại')} ✎</span></div>
      <ol class="fbhelp">${this.help().map(s => `<li>${s.replace(/^\d\.\s*/, '')}</li>`).join('')}</ol>
      <div class="fbbar"><span>${L('Заметок', 'Notes', 'Ghi chú')}: <b>${N}</b> · ${L('снимков', 'screenshots', 'ảnh')} ${imgs} · ~${Math.round(kb)} ${L('КБ', 'KB', 'KB')}${this.mode === 'ls' ? ' · ' + L('без снимков (нет IndexedDB)', 'no screenshots (no IndexedDB)', 'không có ảnh (không có IndexedDB)') : ''}</span>
      <button id="fb814dl" class="pri"${N ? '' : ' disabled'}>⤓ ${L('Скачать всё', 'Download all', 'Tải tất cả')}</button>
      ${this.canShare() ? `<button id="fb814sh"${N ? '' : ' disabled'}>↗ ${L('Поделиться', 'Share', 'Chia sẻ')}</button>` : ''}
      <button id="fb814clr" class="${armed ? 'warn' : ''}"${N ? '' : ' disabled'}>${armed ? '⚠ ' + L('Точно удалить все ' + N + '? Нажми ещё раз', 'Delete all ' + N + '? Press again', 'Xóa tất cả ' + N + '? Nhấn lần nữa') : '🗑 ' + L('Очистить', 'Clear', 'Xóa')}</button></div>
      <div class="fblist" id="fb814list">${list}</div>
      ${MENU.btn('back', '‹ ' + tr('Назад', 'Back', 'Quay lại'))}</div>`;
  },
  wire(){
    const root = document.querySelector('.fb814page'); if (!root) return;
    const b = id => $(id);
    if (b('fb814tog')) b('fb814tog').onclick = e => { e.stopPropagation(); AU.init(); emit('ui', { kind: 'ok' });
      if (this.q === '1' || this.q === '0') this.q = null;
      SET.fb814 = !SET.fb814; MENU.save(); MENU.show('fb814'); };
    if (b('fb814dl')) b('fb814dl').onclick = e => { e.stopPropagation(); emit('ui', { kind: 'ok' }); this.download(); };
    if (b('fb814sh')) b('fb814sh').onclick = e => { e.stopPropagation(); emit('ui', { kind: 'ok' }); this.share(); };
    if (b('fb814clr')) b('fb814clr').onclick = e => { e.stopPropagation(); emit('ui', { kind: 'tick' });
      if (performance.now() < this.clearArm){ this.clearArm = 0; this.clear().then(() => { if (MENU.cur === 'fb814') MENU.show('fb814'); }); MENU.show('fb814'); }
      else { this.clearArm = performance.now() + 4000; MENU.show('fb814'); setTimeout(() => { if (MENU.cur === 'fb814' && this.clearArm && performance.now() >= this.clearArm){ this.clearArm = 0; MENU.show('fb814'); } }, 4100); } };
    const lst = b('fb814list');
    if (lst) lst.onclick = e => { const t = e.target.closest('[data-fbn]'); if (!t) return; e.stopPropagation(); const k = t.dataset.fbn; this.open = this.open === k ? null : k;
      const n = this.notes.find(x => x.id === k); const h = document.createElement('div'); if (n){ h.innerHTML = this.item(n); t.replaceWith(h.firstElementChild); } };
  },
  btnPause(){
    const t = this.L('Заметки отзыва', 'Feedback notes', 'Ghi chú góp ý'), n = this.notes.length ? ` <sup class="fbcnt">${this.notes.length}</sup>` : '';
    return typeof P71M !== 'undefined' && P71M.on && P71M.on() ? `<button id="m_fb814" class="p71t"><i class="fb814ic">📝</i><b>${t}${n}</b></button>` : `<button id="m_fb814">📝 ${t}${n}</button>`;
  },
  // ---------------------------------------------------------------- клавиша
  key(e){
    if (e.repeat || !this.active() || this.inp) return false;
    const code = (SET.bind && SET.bind.note814) || 'Backslash';
    if (e.code !== code) return false;
    if (MENU.keyCapture && MENU.cur === 'controls') return false;   // переназначение клавиш
    const t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return false;
    this.note('key'); return true;
  },
};
// ---------------------------------------------------------------- настройки, клавиша по умолчанию
if (SET.fb814 === undefined) SET.fb814 = false;
if (typeof BIND_DEF !== 'undefined' && !BIND_DEF.note814){
  BIND_DEF.note814 = 'Backslash';
  if (typeof BIND_NAMES !== 'undefined') BIND_NAMES.note814 = ['Заметка (режим отзыва)', 'Note (feedback mode)', 'Ghi chú (chế độ góp ý)'];
  if (SET.bind && !SET.bind.note814) SET.bind.note814 = 'Backslash';
}
FB814.sid = (() => { try { const a = new Uint8Array(4); crypto.getRandomValues(a); return [...a].map(x => '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ'[x % 34]).join(''); } catch (e){ return Date.now().toString(36).slice(-4).toUpperCase(); } })();
// ---------------------------------------------------------------- хуки
{ const r0 = render; render = function(){ const r = r0.apply(this, arguments); if (FB814.want) FB814.grab(); return r; }; }   // v814
{ const f0 = feed; feed = function(text, color){ try { const b = FB814.feedBuf; b.push({ text: String(text).replace(/<[^>]+>/g, '').slice(0, 160), clock: FB814.clock(), match: +(S.time || 0).toFixed(1) }); if (b.length > 10) b.shift(); } catch (e){} return f0.apply(this, arguments); }; }   // v814
MENU.html_fb814 = function(){ return FB814.safe(() => FB814.html(), 'html') || `<div class="mcol">${MENU.btn('back', '‹')}</div>`; };
{ const hs0 = MENU.html_settings; MENU.html_settings = function(){ const h = hs0.apply(this, arguments); const L = FB814.L;   // v814
    const add = `<div class="row"><label>📝 ${L('Режим отзыва: оверлей для записи, заметки', 'Feedback mode: recording overlay, notes', 'Chế độ góp ý: lớp phủ khi quay, ghi chú')} (${FB814.esc(FB814.keyName())})${FB814.active() ? ' — <b>' + L('ВКЛ', 'ON', 'BẬT') + '</b>' : ''}</label>${this.btn('fb814', L('Открыть', 'Open', 'Mở'))}</div>`;
    const i = h.indexOf('<h4>', h.indexOf('<h4>') + 4); return i >= 0 ? h.slice(0, i) + add + h.slice(i) : h + add; }; }
{ const hp0 = MENU.html_pause; MENU.html_pause = function(){ const h = hp0.apply(this, arguments);   // v814: в паузе — только когда режим включён или есть заметки
    if (!(FB814.active() || FB814.notes.length) || h.indexOf('m_fb814') >= 0) return h;
    for (const a of ['<button id="m_settings"', '<button id="m_controls"']){ const i = h.indexOf(a); if (i >= 0) return h.slice(0, i) + FB814.btnPause() + h.slice(i); }
    return h; }; }
{ const w0 = MENU.wire; MENU.wire = function(name){ const r = w0.apply(this, arguments);   // v814
    if (name === 'fb814') FB814.safe(() => FB814.wire(), 'wire');
    const b = $('m_fb814'); if (b) b.onclick = e => { e.stopPropagation(); AU.init(); emit('ui', { kind: 'ok' }); this.show('fb814', true); };
    return r; }; }
if (typeof P71M !== 'undefined' && P71M.sec){ const s0 = P71M.sec; P71M.sec = function(k){ let h = s0.apply(this, arguments);   // v814
    if (k === 's_game') h = h.replace('<div class="p71g c2 rows">', '<div class="p71g c2 rows">' + `<button class="p71o${FB814.active() ? ' on' : ''}" id="m_fb814"><span>📝 ${FB814.L('Режим отзыва и заметки', 'Feedback mode & notes', 'Chế độ góp ý và ghi chú')}</span><b>›</b></button>`);
    return h; }; }
// геймпад: держать View (8) и нажать Start (9) — заметка; пауза и лестница режимов при этом не срабатывают
if (typeof GP812 !== 'undefined' && GP812.frame){ const fr0 = GP812.frame; GP812.frame = function(dt){   // v814
    if (FB814.active() && !MENU.isOpen()){
      if (this.b[8] && this.dn(9) && !this.fb814c){ this.fb814c = true; FB814.safe(() => FB814.note('pad'), 'pad'); }
      if (this.fb814c){
        if (!this.b[8] && !this.b[9]){ this.fb814c = false; this.longSel = false; }
        this.pb[8] = this.b[8]; this.pb[9] = this.b[9]; if (this.b[8]) this.longSel = true;
      }
    }
    return fr0.apply(this, arguments); }; }
addEventListener('keydown', e => { if (FB814.safe(() => FB814.key(e), 'key')){ e.preventDefault(); e.stopImmediatePropagation(); } }, true);   // v814
{ const loop = () => { FB814.safe(() => FB814.tick(), 'tick'); requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
FB814.load().catch(e => console.warn('FB814 load', e));
{ const st = document.createElement('style'); st.id = 'fb814css'; st.textContent = `
  #fb814{display:none;position:fixed;z-index:9980;right:calc(8px + var(--sr,0px));top:calc(4px + var(--st,0px));pointer-events:none;text-align:right;max-width:min(46vw,520px)}
  body.fb814on #fb814{display:block}
  body.fb814b:not(.touch) #fb814{z-index:17}   /* Стратег/Командир на ПК: под карточкой куратора (z 18), над панелями */
  body.fb814on:not(.fb814dbg) #dbg{display:none!important}
  body.fb814on:not(.touch) #help{top:calc(66px + var(--st,0px))}
  #fb814o{display:inline-block;background:rgba(6,9,12,.62);border:1px solid rgba(255,210,122,.35);border-radius:6px;padding:2px 8px;font:600 max(13px,1.45vh)/1.25 "Exo 2",sans-serif;color:#f4e6bf;text-shadow:0 0 3px #000;white-space:nowrap;font-variant-numeric:tabular-nums;transition:background .2s,border-color .2s}
  #fb814o .l2{color:#bfe0c8} #fb814o .l3{color:#ffd27a}
  #fb814.flash #fb814o{background:rgba(255,236,170,.85);border-color:#fff;color:#111;text-shadow:none} #fb814.flash #fb814o div{color:#111}
  #fb814pen{display:none;pointer-events:auto;width:44px;height:44px;border-radius:50%;margin:0 0 0 6px;vertical-align:top;font:400 22px/1 "Exo 2",sans-serif;color:#ffd27a;background:rgba(6,9,12,.7);border:1.5px solid rgba(255,210,122,.7);padding:0}
  body.touch #fb814pen{display:inline-block}
  #fb814t{pointer-events:auto;margin-top:4px;display:none;background:rgba(8,12,18,.94);border:1px solid rgba(255,210,122,.6);color:#ffe6b0;font:600 max(13px,1.4vh) "Exo 2",sans-serif;padding:5px 10px;border-radius:7px;white-space:nowrap}
  #fb814t.on{display:block;margin-left:auto;width:max-content} #fb814t small{opacity:.65;font-weight:400;margin-left:6px}
  #fb814t button{font:600 13px "Exo 2";color:#111;background:#ffd27a;border:0;border-radius:5px;padding:4px 9px;margin-left:8px}
  #fb814in{pointer-events:auto;margin-top:4px;display:flex;gap:5px;align-items:center;background:rgba(8,12,18,.95);border:1px solid #ffd27a;border-radius:7px;padding:4px 6px;width:min(420px,92vw);margin-left:auto}
  #fb814in b{color:#ffd27a;font:600 13px "Exo 2";white-space:nowrap}
  #fb814in input{flex:1;min-width:0;background:rgba(0,0,0,.5);border:1px solid rgba(214,198,154,.45);color:#fff6dc;font:15px "Exo 2",sans-serif;padding:5px 8px;border-radius:5px;outline:none}
  #fb814in button{font:700 15px "Exo 2";color:#e8dfc6;background:rgba(30,32,36,.9);border:1px solid rgba(214,198,154,.4);border-radius:5px;padding:4px 10px;min-width:36px}
  body.touch #fb814{right:auto;left:calc(6px + var(--sl,0px));top:calc(108px + var(--st,0px));text-align:left;max-width:calc(100vw - 20px)}
  body.touch #fb814o{font-size:11px;padding:2px 6px}
  body.touch #fb814t.on, body.touch #fb814in{margin-left:0} body.touch #fb814t{white-space:normal;max-width:min(360px,80vw);font-size:12px}
  body.tab812 #fb814{top:calc(150px + var(--st,0px))} body.tab812 #fb814o{font-size:13px}
  body.touch.fb814m #fb814{display:none}
  @media (orientation:landscape){ body.touch.fb814b #fb814{left:calc(165px + var(--sl,0px))} body.tab812.fb814b #fb814{left:calc(215px + var(--sl,0px))} }
  .fb814page .fbtop{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:6px}
  .fb814page #fb814tog.on{background:rgba(110,200,120,.25);border-color:#7fe08a}
  .fb814page .fbk{opacity:.8;font-size:13px} .fb814page kbd{font:700 12px "Exo 2";padding:0 5px;border-radius:3px;background:rgba(255,255,255,.12);color:#ffd27a}
  .fb814page .fbhelp{margin:4px 0 8px;padding-left:20px;font-size:13px;line-height:1.4;color:#d8cfb6;text-align:left} .fb814page .fbhelp li{margin:2px 0}
  .fb814page .fbbar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:6px} .fb814page .fbbar span{flex:1 1 200px;font-size:13px;opacity:.85;text-align:left}
  .fb814page .fbbar button{margin:0!important;width:auto!important} .fb814page button.warn{background:rgba(200,60,40,.45)!important;border-color:#ff7a60!important;color:#fff!important}
  .fb814page button[disabled]{opacity:.4}
  .fb814page .fblist{max-height:min(42vh,420px);overflow-y:auto;display:flex;flex-direction:column;gap:6px;padding:2px;overscroll-behavior:contain}
  .fb814page .fbn{display:flex!important;gap:10px;align-items:flex-start;text-align:left!important;width:100%!important;margin:0!important;padding:6px 8px!important;font-weight:400!important;background:rgba(12,14,16,.82)}
  .fb814page .fbn img,.fb814page .fbn .noimg{flex:0 0 auto;width:128px;height:72px;object-fit:cover;border-radius:4px;background:#000;display:flex;align-items:center;justify-content:center;font-size:10px;opacity:.75;font-style:normal;text-align:center}
  .fb814page .fbn.op img{width:min(480px,60%);height:auto}
  .fb814page .fbn div{min-width:0;flex:1} .fb814page .fbn b{color:#ffd27a} .fb814page .fbn small{opacity:.7;font-size:12px}
  .fb814page .fbn p{margin:3px 0 0!important;font-size:13px;color:#e8dfc6;word-break:break-word} .fb814page .fbn p.m{font-size:11.5px;color:#bfe0c8}
  .fb814page .fbe{opacity:.6;padding:12px}
  .fbcnt{font:700 9px "Exo 2";color:#111;background:#ffd27a;border-radius:6px;padding:0 4px;margin-left:5px;vertical-align:top}
  .p71t .fb814ic{font-style:normal;font-size:22px;line-height:1}
  @media (max-height:500px){ .fb814page .fbhelp{font-size:11.5px;margin:2px 0 4px;line-height:1.3} .fb814page .fblist{max-height:none} .fb814page .fbn img,.fb814page .fbn .noimg{width:96px;height:54px} }
  @media (max-width:520px){ .fb814page .fbn img,.fb814page .fbn .noimg{width:88px;height:50px} .fb814page .fbn.op{flex-direction:column} .fb814page .fbn.op img{width:100%} }
  `; document.head.appendChild(st); }
if (typeof FX87 !== 'undefined'){ FX87.VER = '8.14'; if (typeof STATS75 !== 'undefined') STATS75.ver = '8.14'; }
