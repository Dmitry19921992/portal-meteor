// open the public itch page in OWN Chrome (CDP 9354), find the game iframe, check its version label
const port = 9354;
const nt = await (await fetch(`http://127.0.0.1:${port}/json/new?https://edmitry.itch.io/portal-meteor`, { method: 'PUT' })).json();
const ws = new WebSocket(nt.webSocketDebuggerUrl);
let id = 0; const wait = {};
const send = (method, params, sessionId) => new Promise(r => { const i = ++id; wait[i] = r; ws.send(JSON.stringify({ id: i, method, params, sessionId })); });
ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && wait[m.id]){ wait[m.id](m); delete wait[m.id]; } };
await new Promise(r => ws.onopen = r);
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
const ev = async e => (await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result?.result?.value;
await new Promise(r => setTimeout(r, 6000));
const info = await ev(`(() => { const f = document.querySelector('iframe#game_drop, .game_frame iframe, iframe'); const b = document.querySelector('.load_iframe_btn, button.load_iframe_btn'); return { title: document.title, iframe: f ? f.src : null, btn: !!b, html: (document.querySelector('.game_frame')||{}).outerHTML?.slice(0,600) }; })()`);
console.log(JSON.stringify(info, null, 1));
await ev(`(() => { const b = document.querySelector('.load_iframe_btn'); if (b) b.click(); return 1; })()`);
await new Promise(r => setTimeout(r, 4000));
const src = await ev(`(() => { const f = document.querySelector('.game_frame iframe, iframe#game_drop'); return f ? f.src : null; })()`);
console.log('iframe src:', src);
let label = null;
if (src){
  const r = await fetch(src); const t = await r.text();
  label = { status: r.status, mb: Math.round(t.length / 1e4) / 100, title: (t.match(/<title>[^<]*/) || [''])[0], v76: /V76_NEWS/.test(t), build: (t.match(/BUILD_DATE = "[^"]*"/) || [''])[0], stats: /pm-stats\.pm-gford3/.test(t) };
}
console.log('game file:', JSON.stringify(label));
const s = await send('Page.captureScreenshot', { format: 'jpeg', quality: 70 });
(await import('fs')).writeFileSync('D:/AI/pm_v6/shots_v76rel/itch_public.jpg', Buffer.from(s.result.data, 'base64'));
await fetch(`http://127.0.0.1:${port}/json/close/${nt.id}`);
process.exit(0);
