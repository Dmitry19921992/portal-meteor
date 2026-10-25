// node mission_bigshot.js <urlpart> <out.jpg> [W H] — скриншот HUD в большом окне (эмуляция 1600x900), сцена из mission_shot.js stage=hud
const fs = require('fs');
(async () => {
  const [want, shot, W = 1600, H = 900] = process.argv.slice(2);
  const list = await (await fetch('http://127.0.0.1:' + (process.env.CDP_PORT || 9233) + '/json')).json();
  const t = list.find(x => x.type === 'page' && x.url.includes(want));
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  let id = 0; const wait = {}; const logs = [];
  const send = (method, params) => new Promise(r => { const i = ++id; wait[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
  ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && wait[m.id]){ wait[m.id](m); delete wait[m.id]; }
    else if (m.method === 'Runtime.exceptionThrown') logs.push('EXC ' + JSON.stringify(m.params.exceptionDetails).slice(0, 400)); };
  await new Promise(r => ws.onopen = r);
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: +W, height: +H, deviceScaleFactor: 1, mobile: false });
  const ev = async e => { const r = (await send('Runtime.evaluate', { expression: '(async () => {' + e + '})()', awaitPromise: true, returnByValue: true, timeout: 300000 })).result; return r.result ? r.result.value : r.exceptionDetails; };
  console.log(JSON.stringify(await ev(`window.__STAGE='hud';` + fs.readFileSync('D:/AI/pm_v6/tests/mission_shot.js', 'utf8'))));
  await new Promise(r => setTimeout(r, 1500));
  await ev(`$('clicklock').style.display = 'none'; return 1`);
  let s = await send('Page.captureScreenshot', { format: 'jpeg', quality: 75 }); fs.writeFileSync(shot, Buffer.from(s.result.data, 'base64'));
  // слежение за побочной + режим «один»
  console.log(JSON.stringify(await ev(`MISSION.cycleTrack(); MISSION.setSolo(true); for (let i = 0; i < 60; i++) update(0.05); computeNav(); S.navT = 20; await new Promise(r => setTimeout(r, 1500)); $('clicklock').style.display = 'none'; return { nav: MISSION.nav && MISSION.nav.mode, lone: !!playerGroup().lone };`)));
  s = await send('Page.captureScreenshot', { format: 'jpeg', quality: 75 }); fs.writeFileSync(shot.replace('.jpg', '_solo.jpg'), Buffer.from(s.result.data, 'base64'));
  await ev(`MISSION.setSolo(false); return 1`);
  if (logs.length) console.log(logs.join('\n'));
  await send('Emulation.clearDeviceMetricsOverride');
  ws.close(); process.exit(0);
})();
