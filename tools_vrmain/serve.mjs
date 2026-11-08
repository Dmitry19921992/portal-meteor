// Static server for the VR prototype tests:  node tools_vrmain/serve.mjs <folder> [port=8819]   (127.0.0.1 only, no cache)
import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { join, extname } from 'path';
const [dir, port = '8819'] = process.argv.slice(2);
const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.txt': 'text/plain; charset=utf-8' };
createServer(async (q, s) => {
  let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  if (p.includes('..')) { s.writeHead(403); return s.end(); }
  try { const d = await readFile(join(dir, p)); s.writeHead(200, { 'Content-Type': T[extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); s.end(d); }
  catch {   // Tripo models of the build live in dist\assets3d (a preview folder has none)
    try { if (!p.startsWith('/assets3d/')) throw 0; const d = await readFile(join('D:/AI/pm_v6/dist', p)); s.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store' }); s.end(d); }
    catch { s.writeHead(404); s.end('not found'); } }
}).listen(+port, '127.0.0.1', () => console.log('serving', dir, 'on http://127.0.0.1:' + port + '/'));
