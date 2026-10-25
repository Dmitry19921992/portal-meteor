MENU.newGame(); await sleep(400); if (TUT.on) TUT.finish();
for (let i = 0; i < 20; i++) update(0.05);
enterRTS(); await sleep(1500);
const res = [];
for (const e of document.querySelectorAll('body *')){
  if (e.children.length > 3) continue;
  const t = (e.textContent || '');
  if (/RMB — aim|ПКМ — прицел|quick unit switch|быстрая смена/.test(t) && e.offsetParent !== null){ const r = e.getBoundingClientRect(); res.push({ tag: e.tagName, id: e.id, cls: e.className, r: [r.left, r.top, r.width, r.height].map(Math.round), t: t.slice(0, 80) }); }
}
return { res, mode: S.mode, bodyCls: document.body.className };
