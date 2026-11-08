// =====================================================================
//  T106 — ТЕСТОВАЯ СБОРКА ПО ССЫЛКЕ (предпросмотр Cloudflare Pages, не боевой сайт)
//  Работает ТОЛЬКО в сборке, которую упаковал tools106/mkpreview.py: он вписывает
//  в PREV818.ID метку сборки (ветка · коммит · время). В обычных сборках (itch,
//  portal-meteor.pages.dev) ID пустой — модуль ничего не делает.
//  1) Маленькая полупрозрачная плашка «ТЕСТ · v8.18 · <коммит> · <дата>» в левом нижнем
//     углу (там пусто и в меню, и в бою на ПК/телефоне; учитывает вырез); тап — подробности.
//  2) Раз в 2 мин (и при возврате на вкладку) читает version.json рядом со
//     страницей (no-cache); если вышла новая тестовая сборка — плашка
//     «Новая тестовая сборка — обновить» (тап = перезагрузка). Сохранение не трогаем.
//  Выключатель: ?prev818=0 . Проверка без упаковщика: ?prev818=demo .
//  Ошибки модуля не роняют игру (safe), console.warn один раз на тег.
// =====================================================================
const PREV818 = {
  ID: /*PREV818_ID*/'',
  q: (() => { try { return new URLSearchParams(location.search).get('prev818') || ''; } catch (e){ return ''; } })(),
  err: {}, el: null, upd: null, open: false, next: '',
  safe(fn, tag){ try { return fn(); } catch (e){ if (!this.err[tag]){ this.err[tag] = 1; console.warn('PREV818 ' + tag, e); } } },
  get on(){ return this.q !== '0' && (!!this.ID || this.q === 'demo'); },
  id(){ return this.ID || 'demo · ' + new Date().toISOString().slice(0, 16).replace('T', ' '); },
  ver(){ return (typeof FX87 !== 'undefined' && FX87.VER) || ''; },
  t(ru, en){ try { return typeof tr === 'function' ? tr(ru, en, en) : ru; } catch (e){ return ru; } },
  info(){ return { on: this.on, id: this.id(), ver: this.ver(), next: this.next, w: innerWidth, h: innerHeight, touch: typeof TOUCH !== 'undefined' && !!TOUCH.on }; },
  css(){
    const s = document.createElement('style');
    s.textContent = '#prev818,#prev818u{position:fixed;z-index:99990;font:600 10px/1.25 system-ui,Segoe UI,sans-serif;' +
      'color:#ffe9a8;background:rgba(40,28,0,.62);border:1px solid rgba(255,200,80,.55);border-radius:9px;padding:2px 9px;white-space:nowrap;' +
      'pointer-events:auto;user-select:none;-webkit-user-select:none;max-width:92vw;overflow:hidden;text-overflow:ellipsis}' +
      '#prev818{left:calc(env(safe-area-inset-left,0px) + 3px);bottom:calc(env(safe-area-inset-bottom,0px) + 2px);padding:1px 6px;opacity:.6;max-width:40vw}' +
      '#prev818.o{white-space:normal;opacity:1;font-weight:500;font-size:12px;padding:6px 10px;max-width:70vw}' +
      '#prev818u{left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top,0px) + 4px);background:rgba(0,70,40,.92);border-color:#5f6;color:#dfffe6;font-size:13px;padding:6px 12px;display:none}' +
      'body.clean88 #prev818:not(.o){opacity:.35}';
    document.head.appendChild(s);
  },
  draw(){
    if (!this.el) return;
    const v = this.ver(), id = this.id();
    this.el.className = this.open ? 'o' : '';
    this.el.textContent = this.open
      ? this.t('Тестовая сборка (не боевая версия). ', 'Test build (not the live version). ') + (v ? 'v' + v + ' · ' : '') + id + ' · ' + innerWidth + '×' + innerHeight +
        this.t(' · Заметки: клавиша \\ или кнопка отзыва. Тап — свернуть.', ' · Notes: \\ key or the feedback button. Tap to fold.')
      : this.t('ТЕСТ', 'TEST') + (v ? ' · v' + v : '') + ' · ' + id.split(' · ').slice(1).join(' · ');
  },
  async check(){
    if (!this.ID || location.protocol === 'file:') return;
    const r = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) return;
    const j = await r.json();
    if (j && j.id && j.id !== this.ID){ this.next = j.id; this.upd.textContent = '⟳ ' + this.t('Новая тестовая сборка — обновить', 'New test build — reload') + ' (' + String(j.id).split(' · ').slice(1, 2).join('') + ')'; this.upd.style.display = 'block'; }
  },
  init(){
    if (!this.on) return;
    this.css();
    this.el = document.createElement('div'); this.el.id = 'prev818';
    this.el.addEventListener('click', e => { e.stopPropagation(); this.open = !this.open; this.safe(() => this.draw(), 'draw'); });
    this.upd = document.createElement('div'); this.upd.id = 'prev818u';
    this.upd.addEventListener('click', e => { e.stopPropagation(); location.reload(); });
    document.body.appendChild(this.el); document.body.appendChild(this.upd);
    this.draw();
    setTimeout(() => this.safe(() => this.draw(), 'draw'), 4000);   // FX87.VER ставится позже (vNN_ver.js) — перерисовать
    const chk = () => this.check().catch(e => this.safe(() => { throw e; }, 'check'));
    setInterval(chk, 120000); setTimeout(chk, 15000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) chk(); });
  }
};
(function(){
  const go = () => PREV818.safe(() => PREV818.init(), 'init');
  if (document.body) go(); else addEventListener('DOMContentLoaded', go);
})();
