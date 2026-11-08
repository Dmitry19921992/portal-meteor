// CDP driver (own Chrome on CDP_PORT, default 9379): node tools_vrmain/cdp.mjs <scenario.mjs> <url> <outDir> [WxH] [--mobile]
// scenario: export default async ({ ev, J, shot, save, sleep, log, out, send }) => {}
import { writeFileSync, mkdirSync, appendFileSync } from 'fs';
import { pathToFileURL } from 'url';
const argv = process.argv.slice(2), mobile = argv.includes('--mobile'), quest = argv.includes('--quest');
const [scen, url, out = 'tests_vrmain/out', size = '1280x720'] = argv.filter(a => a !== '--mobile' && a !== '--quest');
const [W, H] = size.split('x').map(Number), port = +(process.env.CDP_PORT || 9379);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
let nt = list.find(t => t.type === 'page'), own = false;
if (!nt) { nt = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json(); own = true; }
const ws = new WebSocket(nt.webSocketDebuggerUrl); let id = 0; const pend = new Map(), logs = [], errs = [];
const send = (method, params = {}) => new Promise((res) => { if (closed) return res({ error: { message: 'ws closed' } }); const i = ++id; pend.set(i, res); const t = setTimeout(() => { if (pend.has(i)) { pend.delete(i); res({ error: { message: 'cdp timeout ' + method } }); } }, 240000); ws.send(JSON.stringify({ id: i, method, params })); });
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d.result || d.error || {}); pend.delete(d.id); }
  else if (d.method === 'Runtime.consoleAPICalled' && (d.params.type === 'error' || d.params.type === 'warning')) { const s = d.params.type + ': ' + d.params.args.map(a => a.value ?? a.description).join(' ').slice(0, 400); logs.push(s); if (d.params.type === 'error') errs.push(s); }
  else if (d.method === 'Runtime.exceptionThrown') { const s = 'EXC: ' + ((d.params.exceptionDetails.exception && d.params.exceptionDetails.exception.description) || JSON.stringify(d.params.exceptionDetails)).slice(0, 900); logs.push(s); errs.push(s); }
  else if (d.method === 'Log.entryAdded' && d.params.entry.level === 'error') { const s = 'LOG: ' + d.params.entry.text.slice(0, 300) + ' ' + (d.params.entry.url || ''); logs.push(s); if (!/favicon|ERR_|Failed to load resource/.test(s)) errs.push(s); } };
ws.onclose = () => { closed = true; for (const [, r] of pend) r({ error: { message: 'ws closed' } }); pend.clear(); };
let closed = false; const keep = setInterval(() => {}, 1000);
await new Promise(r => ws.onopen = r);
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.error) throw new Error('CDP ' + r.error.message); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 700)); return r.result ? r.result.value : undefined; };
const J = async (expr) => JSON.parse(await ev(`(async () => JSON.stringify(await (${expr})))()`));
mkdirSync(out, { recursive: true });
const shot = async (name, q = 80) => { const s = await send('Page.captureScreenshot', { format: 'jpeg', quality: q }); const f = out + '/' + name + '.jpg'; writeFileSync(f, Buffer.from(s.data || '', 'base64')); return f; };
const save = (name, dataUrl) => { const f = out + '/' + name; writeFileSync(f, Buffer.from(String(dataUrl).split(',')[1] || '', 'base64')); return f; };
const log = (...a) => { const l = new Date().toISOString().slice(11, 19) + ' ' + a.join(' '); console.log(l); try { appendFileSync(out + '/run.log', l + '\n'); } catch (e) {} };
let res = 'ok';
try {
  await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable'); await send('Page.bringToFront'); await send('Emulation.setFocusEmulationEnabled', { enabled: true });
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: mobile ? 3 : 1, mobile });
  if (mobile) { await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }); await send('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36' }); }
  else if (quest) { await send('Emulation.setTouchEmulationEnabled', { enabled: false }); await send('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (X11; Linux x86_64; Quest 2) AppleWebKit/537.36 (KHTML, like Gecko) OculusBrowser/35.2.0.4.58 SamsungBrowser/4.0 Chrome/128.0.6613.187 VR Safari/537.36' }); }
  else { await send('Emulation.setTouchEmulationEnabled', { enabled: false }); await send('Emulation.setUserAgentOverride', { userAgent: '' }); }
  try { const o = new URL(url).origin; await send('Storage.clearDataForOrigin', { origin: o, storageTypes: 'local_storage,indexeddb,service_workers,cache_storage' }); } catch (e) {}   // every run starts like a new player (no saved lite / settings)
  await send('Page.navigate', { url }); await sleep(3000);
  const mod = await import(pathToFileURL(scen).href + '?' + Date.now());
  await mod.default({ ev, J, shot, save, sleep, out, log, send });
} catch (e) { res = 'ERR ' + e.message; console.log('ERR', e.message); }
console.log('CONSOLE:', logs.slice(0, 60).join('\n'));
console.log('ERRORS:', errs.length);
writeFileSync(out + '/console.json', JSON.stringify({ res, errors: errs, logs }, null, 1));
try { await send('Page.navigate', { url: 'about:blank' }); await sleep(300); if (own) await fetch(`http://127.0.0.1:${port}/json/close/${nt.id}`); } catch (e) {}
ws.onclose = null; try { ws.close(); } catch (e) {}
clearInterval(keep); setTimeout(() => process.exit(0), 200);
