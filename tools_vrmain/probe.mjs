// node tools_vrmain/probe.mjs "<js expression>"  — evaluate in the first page of the own test Chrome (CDP 9379), print JSON
const port = +(process.env.CDP_PORT || 9379), expr = process.argv[2];
const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); const nt = list.find(t => t.type === 'page');
const ws = new WebSocket(nt.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id === 1) { console.log(JSON.stringify(d.result && d.result.result ? d.result.result.value : d, null, 0).slice(0, 6000)); process.exit(0); } };
ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: `(async () => JSON.stringify(await (async () => (${expr}))()))()`, awaitPromise: true, returnByValue: true } }));
setTimeout(() => { console.log('timeout'); process.exit(1); }, 30000);
