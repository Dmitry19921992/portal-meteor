// =====================================================================
//  СЕНСОРНОЕ УПРАВЛЕНИЕ (телефон / планшет)
//  Шутер: левый палец — джойстик, правый — обзор, кнопки справа.
//  Стратегия: тап — выделить, долгий тап — приказ, двойной тап — вселиться,
//  палец — двигать камеру, два пальца — масштаб и поворот.
// =====================================================================
const TOUCH = {
  on: !!(QS.get('touch') === '1' || (QS.get('touch') !== '0' && matchMedia('(pointer: coarse)').matches && navigator.maxTouchPoints > 0)),
  move: [0, 0], joy: null, look: null, fireT: null, rts: null, pinch: null, orderMode: false, boxMode: false, aimOn: false,
  init(){
    if (!this.on) return;
    document.body.classList.add('touch');
    const el = document.createElement('div'); el.id = 'touch';
    el.innerHTML = `
      <div id="tjoy"><i></i></div>
      <div class="tf fps">
        <button data-t="fire" class="big">●</button>
        <button data-t="jet" class="mid">⇑</button>
        <button data-t="aim">◎</button>
        <button data-k="rocket">Q</button>
        <button data-k="grenade">G</button>
        <button data-k="reload">R</button>
        <button data-k="reflex">F</button>
        <button data-k="strike">T</button>
        <button data-k="switch">X</button>
        <button data-k="interact">E</button>
        <button data-k="jump">⤒</button>
        <button data-k="down">⤓</button>
        <button data-t="weap">⇄</button>
      </div>
      <div class="tf rts">
        <button data-t="order" class="wide">${tr('Приказ', 'Order', 'Lệnh')}</button>
        <button data-t="box" class="wide">${tr('Рамка', 'Box', 'Khung')}</button>
        <button data-t="army" class="wide">${tr('Вся армия', 'All army', 'Toàn quân')}</button>
      </div>
      <div class="tt">
        <button data-t="map">${tr('Карта', 'Map', 'Bản đồ')}</button>
        <button data-t="pause">II</button>
      </div>
      <div id="trot">${tr('Поверни телефон горизонтально', 'Rotate your phone to landscape', 'Xoay ngang điện thoại')} ⟲</div>`;
    document.body.appendChild(el);
    // кнопки
    el.querySelectorAll('button').forEach(b => {
      const k = b.dataset.k, t = b.dataset.t;
      b.addEventListener('touchstart', e => {
        e.preventDefault(); e.stopPropagation(); AU.init();
        b.classList.add('on');
        if (k) this.key(SET.bind[k]);
        else if (t === 'fire'){ mouseL = true; const tc = e.changedTouches[0]; this.fireT = { id: tc.identifier, x: tc.clientX, y: tc.clientY }; }
        else if (t === 'jet') keys[SET.bind.run] = true;
        else if (t === 'aim'){ this.aimOn = !this.aimOn; mouseR = this.aimOn; }
        else if (t === 'weap'){ const L = ['rifle', 'rail', 'hmg'].filter(w => weaponAvail(w)); const i = L.indexOf(S.kit.w); if (L.length > 1) switchWeapon(L[(i + 1) % L.length]); }
        else if (t === 'map'){ if (S.mode === 'rts') enterFPS(); else this.key(SET.bind.rts); }
        else if (t === 'pause'){ if (!MENU.isOpen()) MENU.pause(); }
        else if (t === 'order'){ this.orderMode = !this.orderMode; this.boxMode = false; }
        else if (t === 'box'){ this.boxMode = !this.boxMode; this.orderMode = false; }
        else if (t === 'army'){ S.sel.clear(); for (const g of groupsOf(0)) S.sel.add(g); }
      }, { passive: false });
      const up = e => {
        e.preventDefault(); e.stopPropagation();
        if (t !== 'order' && t !== 'box' && t !== 'aim') b.classList.remove('on');
        if (t === 'fire'){ mouseL = false; this.fireT = null; }
        if (t === 'jet') keys[SET.bind.run] = false;
      };
      b.addEventListener('touchend', up, { passive: false });
      b.addEventListener('touchcancel', up, { passive: false });
      // стрельба с одновременным поворотом: тянем палец по кнопке огня
      if (t === 'fire') b.addEventListener('touchmove', e => {
        e.preventDefault();
        for (const tc of e.changedTouches) if (this.fireT && tc.identifier === this.fireT.id){ lookBy((tc.clientX - this.fireT.x) * 1.4, (tc.clientY - this.fireT.y) * 1.4); this.fireT.x = tc.clientX; this.fireT.y = tc.clientY; }
      }, { passive: false });
    });
    canvas.addEventListener('touchstart', e => this.start(e), { passive: false });
    canvas.addEventListener('touchmove', e => this.moveEv(e), { passive: false });
    canvas.addEventListener('touchend', e => this.end(e), { passive: false });
    canvas.addEventListener('touchcancel', e => this.end(e), { passive: false });
  },
  key(code){
    if (!code) return;
    dispatchEvent(new KeyboardEvent('keydown', { code, key: code }));
    setTimeout(() => dispatchEvent(new KeyboardEvent('keyup', { code, key: code })), 60);
  },
  start(e){
    e.preventDefault(); AU.init();
    if (MENU.isOpen()) return;
    for (const tc of e.changedTouches){
      const x = tc.clientX, y = tc.clientY;
      if (S.mode === 'fps' && !S.attract){
        if (x < innerWidth * 0.42 && !this.joy){ this.joy = { id: tc.identifier, x0: x, y0: y }; this.showJoy(x, y, 0, 0); }
        else if (!this.look) this.look = { id: tc.identifier, x, y };
      } else if (S.mode === 'rts'){
        if (minimapClick(x, y, this.orderMode ? 2 : 0)) continue;
        const n = e.touches.length;
        if (n >= 2){ this.rts = null; this.pinch = this.pinchState(e.touches); continue; }
        this.rts = { id: tc.identifier, x0: x, y0: y, x, y, t: performance.now(), moved: false, long: false };
        S.mouse = [x, y];
        if (this.boxMode || S.place || S.cast) this.mouse('mousedown', x, y, 0);
        clearTimeout(this.longT);
        this.longT = setTimeout(() => { if (this.rts && !this.rts.moved && !this.boxMode && !S.place && !S.cast){ this.rts.long = true; this.mouse('mousedown', this.rts.x, this.rts.y, 2); if (navigator.vibrate) navigator.vibrate(25); } }, 480);
      }
    }
  },
  moveEv(e){
    e.preventDefault();
    if (S.mode === 'rts' && e.touches.length >= 2 && this.pinch){
      const p = this.pinchState(e.touches);
      S.rts.h = clamp(S.rts.h * this.pinch.d / max(10, p.d), 12, 285);
      S.rts.fwd = norm(rotAxis(S.rts.fwd, S.rts.dir, -(p.a - this.pinch.a)));
      this.pinch = p; return;
    }
    for (const tc of e.changedTouches){
      const x = tc.clientX, y = tc.clientY;
      if (this.joy && tc.identifier === this.joy.id){
        let dx = (x - this.joy.x0) / 55, dy = (y - this.joy.y0) / 55; const l = hypot(dx, dy); if (l > 1){ dx /= l; dy /= l; }
        this.move = [dx, -dy]; this.showJoy(this.joy.x0, this.joy.y0, dx, dy);
      } else if (this.look && tc.identifier === this.look.id){
        lookBy((x - this.look.x) * 1.5, (y - this.look.y) * 1.5); this.look.x = x; this.look.y = y;
      } else if (this.rts && tc.identifier === this.rts.id){
        const dx = x - this.rts.x, dy = y - this.rts.y;
        this.rts.x = x; this.rts.y = y; S.mouse = [x, y];
        if (hypot(x - this.rts.x0, y - this.rts.y0) > 12) this.rts.moved = true;
        if (this.boxMode || S.place || S.cast){ dispatchEvent(new MouseEvent('mousemove', { clientX: x, clientY: y })); continue; }
        if (this.rts.moved){   // тащим камеру
          const R = S.rts, k = (R.h * 1.6 + 20) / innerHeight / RM;
          const right = norm(cross(R.fwd, R.dir));
          R.dir = norm(add(R.dir, add(mul(right, -dx * k), mul(R.fwd, dy * k))));
          R.fwd = tangent(R.fwd, R.dir);
        }
      }
    }
  },
  end(e){
    e.preventDefault();
    for (const tc of e.changedTouches){
      if (this.joy && tc.identifier === this.joy.id){ this.joy = null; this.move = [0, 0]; $('tjoy').style.display = 'none'; }
      if (this.look && tc.identifier === this.look.id) this.look = null;
      if (this.rts && tc.identifier === this.rts.id){
        clearTimeout(this.longT);
        const r = this.rts; this.rts = null;
        if (this.boxMode || S.place || S.cast){ this.mouse('mouseup', r.x, r.y, 0); if (this.boxMode && r.moved) this.boxMode = false; continue; }
        if (r.long || r.moved) continue;
        if (this.orderMode) this.mouse('mousedown', r.x, r.y, 2);
        else { this.mouse('mousedown', r.x, r.y, 0); this.mouse('mouseup', r.x, r.y, 0); }
      }
    }
    if (e.touches.length < 2) this.pinch = null;
  },
  mouse(type, x, y, button){
    const ev = new MouseEvent(type, { clientX: x, clientY: y, button, bubbles: true });
    (type === 'mousedown' ? canvas : window).dispatchEvent(ev);
  },
  pinchState(t){ const a = t[0], b = t[1]; return { d: hypot(a.clientX - b.clientX, a.clientY - b.clientY), a: atan2(b.clientY - a.clientY, b.clientX - a.clientX) }; },
  showJoy(x, y, dx, dy){
    const j = $('tjoy'); j.style.display = 'block'; j.style.left = (x - 60) + 'px'; j.style.top = (y - 60) + 'px';
    j.firstChild.style.transform = `translate(${dx * 42}px, ${dy * 42}px)`;
  },
  frame(){
    if (!this.on) return;
    const el = $('touch'); if (!el) return;
    const fps = S.mode === 'fps' && !S.attract && !MENU.isOpen(), rts = S.mode === 'rts' && !S.attract && !MENU.isOpen();
    el.classList.toggle('mfps', fps); el.classList.toggle('mrts', rts); el.classList.toggle('hidden', S.attract || MENU.isOpen());
    const o = el.querySelector('[data-t="order"]'), b = el.querySelector('[data-t="box"]'), a = el.querySelector('[data-t="aim"]');
    o.classList.toggle('on', this.orderMode); b.classList.toggle('on', this.boxMode); a.classList.toggle('on', this.aimOn);
    if (!fps){ mouseL = false; this.joy = null; this.move = [0, 0]; }
  },
};
