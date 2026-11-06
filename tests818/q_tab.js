(async()=>{
  const sl = ms => new Promise(r => setTimeout(r, ms));
  const out = [];
  if (!window.__g818){ window.__g818 = 1; const g0 = V87M.go; V87M.go = function(m){ out.push('go(' + m + ') from ' + V87M.mode() + ' :: ' + (new Error().stack.split('\n').slice(2, 5).map(s => s.trim().slice(3, 60)).join(' < '))); return g0.apply(this, arguments); };
    const t0 = CMD85.toggle; CMD85.toggle = function(){ out.push('CMD85.toggle :: ' + new Error().stack.split('\n').slice(2, 5).map(s => s.trim().slice(3, 60)).join(' < ')); return t0.apply(this, arguments); };
    const e0 = CMD85.enter; CMD85.enter = function(){ out.push('CMD85.enter :: ' + new Error().stack.split('\n').slice(2, 6).map(s => s.trim().slice(3, 60)).join(' < ')); return e0.apply(this, arguments); }; }
  window.__out818 = out;
  if (MENU.cur){ try { MENU.newGame(); } catch (e){} try { MENU.close(); } catch (e){} }
  S.paused = false; await sl(4000);
  const k = (code, o) => { const e = Object.assign({ code, key: code, bubbles: true, cancelable: true }, o || {}); document.body.dispatchEvent(new KeyboardEvent('keydown', e)); document.body.dispatchEvent(new KeyboardEvent('keyup', e)); };
  const st = () => V87M.mode() + '/' + S.mode + '/paused=' + S.paused + '/menu=' + MENU.cur;
  out.push('start ' + st());
  if (V87M.mode() !== 'fps'){ V87M.go('fps'); await sl(800); out.push('->fps ' + st()); }
  k('Tab'); await sl(300); out.push('after Tab#1 (300ms) ' + st()); await sl(1500); out.push('after Tab#1 (1.8s) ' + st());
  k('Tab'); await sl(1500); out.push('after Tab#2 ' + st());
  k('Tab'); await sl(1500); out.push('after Tab#3 ' + st());
  return out.join('\n');
})()
