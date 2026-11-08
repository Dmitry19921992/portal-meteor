// second CDP client: node shot2.js <out.png> [optional expr before shot]
(async()=>{const fs=require('fs');const t=await (await fetch('http://127.0.0.1:9868/json')).json();const p=t.find(x=>x.type==='page');const ws=new WebSocket(p.webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);
let id=0;const send=(m,pa={})=>new Promise(r=>{const n=++id;ws.addEventListener('message',e=>{const d=JSON.parse(e.data);if(d.id===n)r(d)});ws.send(JSON.stringify({id:n,method:m,params:pa}))});
if(process.argv[3]){const r=await send('Runtime.evaluate',{expression:process.argv[3],awaitPromise:true,returnByValue:true});console.log(JSON.stringify(r.result&&r.result.result&&r.result.result.value||r).slice(0,600));}
const r=await send('Page.captureScreenshot',{format:'png'});if(r.result){fs.writeFileSync(process.argv[2],Buffer.from(r.result.data,'base64'));console.log('shot',process.argv[2])}else console.log(JSON.stringify(r).slice(0,300));ws.close();process.exit(0)})();
