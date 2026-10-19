// =====================================================================
//  ТЕЛЕФОН (v6.4): раскладка 932×430 / 844×390 без перекрытий.
//  • Переключатель режимов всегда в правом верхнем углу: в бою «◩ Стратегия», в стратегии «▶ В бой».
//  • Шутер: оружие и задача не перекрываются кнопками миссии, подсказка не закрывает прицел,
//    портреты отряда компактнее.
//  • Стратегия: правая панель сворачивается (кнопка ▸/◂, разворачивается сама при выборе
//    инженера или здания), «Рамка / Вся армия / Инженер» — над миникартой, полоса «В работе»
//    не налезает на панель «Армия», на верхних плашках только главное.
// =====================================================================
const P64 = { min: false, t: 0, lastSel: '' };
try { P64.min = JSON.parse(localStorage.getItem('pm_v64ui') || '{}').sideMin === true; } catch (e){}
function p64Save(){ try { localStorage.setItem('pm_v64ui', JSON.stringify({ sideMin: P64.min })); } catch (e){} }
function p64Side(min){
  P64.min = !!min; p64Save();
  document.body.classList.toggle('side64min', P64.min);
  const b = $('sideTog'); if (b) b.innerHTML = P64.min ? '◂<small>' + tr('Панель', 'Panel', 'Bảng') + '</small>' : '▸';
}
function p64Frame(dt){
  if (!TOUCH.on) return;
  P64.t -= dt; if (P64.t > 0) return; P64.t = 0.2;
  const rts = S.mode === 'rts' && !S.attract && !MENU.isOpen(), fps = S.mode === 'fps' && !S.attract && !MENU.isOpen();
  const bc = document.body.classList;
  if (bc.contains('m64rts') !== rts) bc.toggle('m64rts', rts);
  if (bc.contains('m64fps') !== fps) bc.toggle('m64fps', fps);
  const cu = rts && typeof CUR !== 'undefined' && CUR.enabled();
  if (bc.contains('cur64') !== cu) bc.toggle('cur64', cu);
  // подписи кнопок (язык мог смениться после создания)
  const lab = { box: '⬚ ' + tr('Рамка', 'Box', 'Khung'), army: '◆ ' + tr('Вся армия', 'All army', 'Toàn quân'), builder: '⚒ ' + tr('Инженер', 'Builder', 'Kỹ sư'),
    map: rts ? '▶ ' + tr('В бой', 'Battle', 'Vào trận') : '◩ ' + tr('Стратегия', 'Strategy', 'Chiến thuật') };
  for (const k in lab){ const b = document.querySelector(`#touch [data-t="${k}"]`); if (b && b.textContent !== lab[k]) b.textContent = lab[k]; }
  // кнопка сворачивания правой панели
  let tg = $('sideTog');
  if (!tg){
    tg = document.createElement('button'); tg.id = 'sideTog'; document.body.appendChild(tg);
    tg.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); AU.init(); p64Side(!P64.min); emit('ui', { kind: 'ok' }); }, { passive: false });
    tg.addEventListener('click', e => { e.stopPropagation(); p64Side(!P64.min); });
    p64Side(P64.min);
  }
  tg.style.display = rts ? 'block' : 'none';
  // выбрали инженера или здание — панель разворачивается сама
  const sig = (selBuilders().length ? 'b' : '') + (S.selB && v64IsProd(S.selB) ? 'h' + uixId(S.selB) : '');
  if (sig !== P64.lastSel){ P64.lastSel = sig; if (sig && P64.min) p64Side(false); }
}
{
  const uf0 = uixFrame;
  uixFrame = function(dt){ uf0(dt); try { p64Frame(dt); } catch (e){ if (!P64.err){ P64.err = 1; console.warn('p64', e); } } };
}
(function p64CSS(){
  const st = document.createElement('style'); st.id = 'p64css';
  st.textContent = `
  body.touch #hud > .hb:nth-child(3), body.touch #hud > .hb:nth-child(6){display:none}
  body.touch #touch .tt{top:4px;right:6px;gap:5px}
  body.touch #touch .tt button{height:36px;font-size:12.5px;padding:0 10px}
  body.touch #touch .tt [data-t="map"]{display:block;background:rgba(40,90,50,.55);border-color:rgba(143,255,170,.7);color:#eaffef;font-weight:700}
  body.touch.m64rts #touch .tt [data-t="map"]{background:rgba(110,60,20,.6);border-color:rgba(255,190,120,.8);color:#fff2e0}
  body.touch.m64fps #kit{top:4px;right:156px;bottom:auto;transform:none}
  body.touch #obj{left:auto;right:300px;transform:none;max-width:250px}
  body.touch.m64fps #hint{top:80px;left:50%;right:auto;bottom:auto;transform:translateX(-50%);max-width:44vw;font-size:11px;padding:3px 8px}
  body.touch #squadp{transform:scale(.62)}
  body.touch.m64fps #feed{bottom:112px;max-width:38vw;font-size:10.5px}
  body.touch.m64fps #feed > *:nth-last-child(n+3){display:none}
  body.touch #r61cards{top:50px}
  body.touch.m64rts #pstrip{top:84px;left:6px;max-width:calc(100vw - var(--sideW) - 40px)}
  body.touch.m64rts.r61open #pstrip{top:118px}
  body.touch.m64rts #feed{top:132px;max-width:30vw}
  body.touch.m64rts.r61open #feed{top:164px}
  body.touch #card .inf{min-width:160px}
  body.touch.m64rts #hint{top:128px;left:6px;right:auto;bottom:auto;transform:none;max-width:38vw}
  body.touch.m64rts.cur64 #hint{display:none !important}
  body.touch #touch.mrts .tf.rts{left:6px;right:auto;top:auto;bottom:146px;width:auto;flex-direction:row;flex-wrap:nowrap;gap:6px}
  body.touch #touch .tf.rts button.wide{height:38px;font-size:12px;padding:0 10px}
  body.touch #side .sfoot{flex-direction:row;gap:3px;padding:3px} body.touch #side .sfoot button{padding:3px 2px;font-size:10px;line-height:1.1;min-height:32px}
  body.touch #side .sfoot #aiBtn,body.touch #side .sfoot #abBtn{flex:1} body.touch #side .sfoot #curBtn{flex:none;width:46px} body.touch #side .sfoot #helpBtn{width:30px}
  body.touch #side .sfoot kbd{display:none}
  body.touch #side .item{height:60px} body.touch #side .item > i{font-size:18px;top:2px} body.touch #side .item b{top:23px}
  body.touch #side .item .cost,body.touch #side .item .tm{bottom:13px}
  body.touch #side .bqueue{display:none}
  #sideTog{display:none;position:fixed;top:66px;right:calc(var(--sideW) + 2px);z-index:16;width:30px;height:44px;padding:0;background:rgba(12,13,14,.85);border:1px solid var(--line);border-right:none;color:#e8dcb8;font:700 16px "Exo 2";border-radius:6px 0 0 6px;pointer-events:auto}
  #sideTog small{display:block;font-size:8.5px;font-weight:600}
  body.side64min{--sideW:0px}
  body.touch.side64min #side{display:none !important}
  body.touch.side64min #sideTog{right:0;width:44px;height:48px}
  body.touch.side64min #card{right:52px}
  body.touch #screen.scr-main h1{font-size:32px;line-height:1;margin:0 0 4px}
  body.touch #screen .sub{font-size:11px;margin:2px 0 4px}
  body.touch #screen .mcol > button{min-height:38px;padding:6px 12px;font-size:14px;margin:3px 0}
  body.touch #screen .mcol > button.big{min-height:44px;font-size:17px}
  body.touch #screen .diffrow button{min-height:34px;padding:4px 8px;font-size:12px}
  body.touch #screen.scr-main .mcol{max-height:calc(100vh - 16px);overflow-y:auto;-webkit-overflow-scrolling:touch}
  body.touch #screen.scr-main .mcol.side{font-size:12px}
  @media (max-width:880px){
    body.touch #side .tabs button span{font-size:9.5px}
    body.touch #card{left:212px}
  }`;
  document.head.appendChild(st);
})();
