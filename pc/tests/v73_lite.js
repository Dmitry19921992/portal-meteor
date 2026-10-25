for (let i = 0; i < 480; i++){ try { if (document.getElementById('boot').classList.contains('done') && S.teams && MENU.cur === 'main') break; } catch (e){} await sleep(500); }
await sleep(800);
const out = {};
out.touch = TOUCH.on; out.lite = LITE73.on; out.setLite = SET.lite; out.scale = S.scale; out.q = S.quality; out.cw = canvas.width + 'x' + canvas.height;
out.squads = S.squads.length; out.maxSq = GAME.MAX_SQUADS;
await sleep(3500);
out.fps = fpsVal; 
await shot('D:/AI/pm_v6/shots/v73_lite_menu.jpg');
console.log(JSON.stringify(out));
return out;
