// PC / phone without a headset: the game must be unchanged (no VR button, no new console errors), battle + possession work
import { waitBoot } from './wait_boot.mjs';
export default async ({ ev, J, shot, sleep, log }) => {
  if (!await waitBoot(ev, sleep, log)) return;
  const mem = async (tag) => { const m = await J(`({ heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null, totalMB: performance.memory ? Math.round(performance.memory.totalJSHeapSize / 1048576) : null, q820: typeof Q820 !== 'undefined' ? Q820 : null, lite: LITE73.on, as75: SET.as75, t120: typeof T120 !== 'undefined' ? !!T120.on : null, canvas: [canvas.width, canvas.height], url: location.search })`); log('mem ' + tag, JSON.stringify(m)); return m; };
  await mem('boot');
  await sleep(3000);
  log('menu', JSON.stringify(await J(`({ xr8: typeof XR8 !== 'undefined' ? { on: XR8.on, sup: XR8.supported, btn: !!document.getElementById('xr8b'), bar: !!document.getElementById('xr8m') } : null, navxr: !!navigator.xr, menu: MENU.cur, touch: TOUCH.on, rafShim: window.requestAnimationFrame !== XR8.rafO })`)));
  await shot('1_menu');
  await ev(`MENU.newGame(); 1`); await sleep(12000);
  log('battle', JSON.stringify(await J(`({ mode: S.mode, me: S.me && S.me.cls, t: +S.time.toFixed(1), fps: typeof fpsVal !== 'undefined' ? +(+fpsVal).toFixed(1) : null, btn: document.getElementById('xr8b') ? document.getElementById('xr8b').style.display : 'none' })`)));
  await shot('2_battle');
  await ev(`enterFPS(); 1`); await sleep(8000);
  const a = await J(`({ t: S.time, mode: S.mode, me: S.me && S.me.cls, fps: typeof fpsVal !== 'undefined' ? +(+fpsVal).toFixed(1) : null })`); await sleep(4000);
  const b = await J(`({ t: S.time, fps: typeof fpsVal !== 'undefined' ? +(+fpsVal).toFixed(1) : null, aim: aimRay() && aimRay().src })`);
  log('fps', JSON.stringify(a), '->', JSON.stringify(b), 'game time advanced', (b.t - a.t).toFixed(2));
  await mem('battle');
  await shot('3_fps');
};
