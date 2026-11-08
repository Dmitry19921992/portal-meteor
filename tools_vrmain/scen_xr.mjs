// VR in the main game with the IWER Quest 2 emulator: button -> session -> ninja katana / dash / teleport / snap -> soldier gaze fire -> menu -> exit
import { waitBoot } from './wait_boot.mjs';
export default async ({ ev, J, shot, save, sleep, log }) => {
  const R = {}; const ok = (k, v, info) => { R[k] = !!v; log((v ? 'PASS ' : 'FAIL ') + k, info !== undefined ? JSON.stringify(info) : ''); };
  if (!await waitBoot(ev, sleep, log)) { log('RESULT', JSON.stringify(R)); return; }
  await sleep(2000);
  await ev(`(() => {
    window.__fr = async n => { const f0 = XR8.stats.frames; for (let i = 0; i < 1500 && XR8.stats.frames < f0 + n; i++) await new Promise(r => setTimeout(r, 15)); return XR8.stats.frames - f0; };
    window.__xrshot = () => new Promise(res => XR8.queue(() => { try { const L = XR8.layer, w = L.framebufferWidth, h = L.framebufferHeight; gl.bindFramebuffer(gl.FRAMEBUFFER, L.framebuffer);
      const px = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px); const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'), im = g.createImageData(w, h);
      let sum = 0; for (let y = 0; y < h; y++) im.data.set(px.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4); for (let i = 0; i < px.length; i += 400) sum += px[i] + px[i + 1] + px[i + 2];
      g.putImageData(im, 0, 0); res({ url: c.toDataURL('image/jpeg', 0.8), w, h, mean: sum / (px.length / 400) / 3 }); } catch (e){ res({ err: String(e) }); } }));
    window.__ang = (a, b) => Math.acos(Math.max(-1, Math.min(1, a[0]*b[0] + a[1]*b[1] + a[2]*b[2]))) * 180 / Math.PI;
    return 1; })()`);
  ok('xr_supported', await ev(`XR8.supported`));
  ok('menu_buttons', await ev(`document.getElementById('xr8m') && document.getElementById('xr8m').style.display === 'flex'`));
  await shot('x1_menu');
  await ev(`MENU.newGame(); 1`); await sleep(9000);
  ok('battle_button', await ev(`document.getElementById('xr8b') && document.getElementById('xr8b').style.display === 'block'`), await ev(`document.getElementById('xr8b').textContent`));
  await shot('x2_battle_button');
  // ---- enter VR with the real button
  await ev(`document.getElementById('xr8b').click(); 1`);
  for (let i = 0; i < 40 && !(await ev(`XR8.active`)); i++) await sleep(500);
  ok('session_active', await ev(`XR8.active`));
  await sleep(3000);
  log('layer', JSON.stringify(await J(`({ fb: XR8.layer.framebuffer === null ? 'null(canvas)' : 'opaque', fbw: XR8.layer.framebufferWidth, fbh: XR8.layer.framebufferHeight, canvas: [canvas.width, canvas.height], views: XR8.pose ? XR8.pose.views.map(v => { const q = XR8.layer.getViewport(v); return [q.x, q.y, q.width, q.height]; }) : null, st: XR8.stats, q: XR8.q.length, side: XR8.side.length, err: XR8.err })`)));
  const nfr = await ev(`__fr(20)`); const d0 = await J(`XR8.debug()`);
  ok('xr_frames_and_game_draws', d0.stats.gameFrames > 5, { frames: nfr, game: d0.stats.gameFrames, fallback: d0.stats.fallback, eye: d0.eye, k: d0.k });
  // ---- ninja
  await ev(`XR8.act('ninja'); 1`); await sleep(2500); await ev(`__fr(10)`);
  const d1 = await J(`XR8.debug()`);
  ok('ninja_possessed', d1.me && d1.me.ninja, d1.me);
  ok('aimRay_headset', await ev(`aimRay().src === 'headset'`));
  // gaze: turn the head 45 deg right, the ninja looks there
  await ev(`XRDEV.quaternion.set(0, Math.sin(-Math.PI/8), 0, Math.cos(-Math.PI/8)); 1`); await ev(`__fr(6)`);
  ok('gaze_drives_unit', await ev(`__ang(S.me.fwd, XR8.head.fwd) < 3`), await J(`({ ang: __ang(S.me.fwd, XR8.head.fwd) })`));
  await ev(`XRDEV.quaternion.set(0, 0, 0, 1); 1`); await ev(`__fr(4)`);
  let s = await ev(`__xrshot()`); if (s && s.url){ save('x3_vr_ninja.jpg', s.url); } log('xrshot', JSON.stringify({ w: s.w, h: s.h, mean: s.mean, err: s.err }));
  ok('vr_image_not_black', s && s.mean > 8, s && s.mean);
  // blade: an enemy right in front, a fast horizontal swing of the right controller
  const sw = await J(`(async () => {
    const u = S.me, up = norm(u.pos), f = XR8.tg(XR8.head.fwd, up);
    const e = TGT[u.team].find(x => x.alive && x.cls === 'inf' && !NJ.is(x)); if (!e) return { err: 'no enemy' };
    const hp0 = e.hp, st0 = Object.assign({}, XR8.stats);
    const P = XRDEV.position, C = XRDEV.controllers.right; C.quaternion.set(0, 0, 0, 1);
    const A = [P.x + 0.6, P.y - 0.35, P.z - 0.25], B = [P.x - 0.6, P.y - 0.35, P.z - 0.25];
    C.position.set(A[0], A[1], A[2]); await __fr(3);
    const bl = XR8.blade ? sub(XR8.blade.tl, XR8.blade.gp) : null;
    for (let i = 1; i <= 3; i++){ e.pos = add(add(u.pos, mul(f, 1.05)), mul(up, 0)); e.vel = [0, 0, 0]; const k = i / 3; C.position.set(A[0] + (B[0] - A[0]) * k, A[1], A[2]); await __fr(1); }
    await __fr(2);
    return { hp0, hp1: e.hp, alive: e.alive, cuts: XR8.stats.cuts - st0.cuts, gashes: XR8.stats.gashes - st0.gashes, scratches: XR8.stats.scratches - st0.scratches, swings: XR8.stats.swings - st0.swings, last: XR8.lastCut, bladeLocal: bl, pieces: NJ.pieces.length };
  })()`);
  ok('katana_hits_enemy', sw && sw.swings > 0 && (sw.hp1 < sw.hp0 || !sw.alive), sw);
  s = await ev(`__xrshot()`); if (s && s.url) save('x4_after_cut.jpg', s.url);
  // dash (trigger) and snap turn
  const ds = await J(`(async () => { const st = XR8.stats.dashes, sn = XR8.stats.snaps, C = XRDEV.controllers.right, p0 = S.me.pos.slice(), f0 = XR8.refF.slice();
    S.me.energy = NJ.JET.emax; C.updateButtonValue('trigger', 1); await __fr(3); C.updateButtonValue('trigger', 0); await __fr(25);
    C.updateAxes('thumbstick', 1, 0); await __fr(3); C.updateAxes('thumbstick', 0, 0); await __fr(3);
    return { dashes: XR8.stats.dashes - st, moved: +dist(p0, S.me.pos).toFixed(2), snaps: XR8.stats.snaps - sn, turn: +__ang(f0, XR8.refF).toFixed(1) }; })()`);
  ok('dash_trigger', ds.dashes >= 1 && ds.moved > 1, ds);
  ok('snap_turn_30', ds.snaps === 1 && Math.abs(ds.turn - 30) < 3, ds);
  // aimed far teleport with the left controller
  const tp = await J(`(async () => { const L = XRDEV.controllers.left, P = XRDEV.position, N = NJ.N(S.me); N.teleCd = 0; const p0 = S.me.pos.slice(), t0 = XR8.stats.teles;
    L.position.set(P.x - 0.2, P.y - 0.3, P.z - 0.3); L.quaternion.set(Math.sin(-0.06), 0, 0, Math.cos(-0.06)); await __fr(2);
    L.updateButtonValue('trigger', 1); await __fr(4); const aim = XR8.tele ? { ok: XR8.tele.ok, d: +dist(XR8.tele.pos, S.me.pos).toFixed(1) } : null;
    L.updateButtonValue('trigger', 0); await __fr(3); const started = !!N.tp;
    for (let i = 0; i < 40 && N.tp; i++) await __fr(5);
    return { aim, started, teles: XR8.stats.teles - t0, moved: +dist(p0, S.me.pos).toFixed(1), fadeSeen: XR8.fade }; })()`);
  ok('teleport_left_aim', tp.teles === 1 && tp.moved > 3, tp);
  // VR menu: Y opens (game paused), Y closes
  const mn = await J(`(async () => { const L = XRDEV.controllers.left; L.updateButtonValue('y-button', 1); await __fr(2); L.updateButtonValue('y-button', 0); await __fr(2);
    const a = { open: XR8.panel.open, paused: S.paused, items: XR8.panel.items.map(i => i.id) };
    const sh = await __xrshot(); L.updateButtonValue('y-button', 1); await __fr(2); L.updateButtonValue('y-button', 0); await __fr(2);
    return { a, b: { open: XR8.panel.open, paused: S.paused }, sh: sh.url }; })()`);
  if (mn.sh) save('x5_vr_menu.jpg', mn.sh);
  ok('vr_menu', mn.a.open && mn.a.paused && !mn.b.open && !mn.b.paused && mn.a.items.includes('arena'), { a: mn.a, b: mn.b });
  // soldier: head aim fire
  const so = await J(`(async () => { const s = S.units.find(x => x.alive && x.team === 0 && x.cls === 'inf' && !NJ.is(x)); if (!s) return { err: 'no soldier' };
    releasePlayerUnits(); takeControl(s); for (let i = 0; i < 30; i++) await __fr(3);
    XRDEV.quaternion.set(0, Math.sin(Math.PI/12), 0, Math.cos(Math.PI/12)); await __fr(4);
    const n0 = GUNS.shotN || 0, C = XRDEV.controllers.right; C.updateButtonValue('trigger', 1); for (let i = 0; i < 12; i++) await __fr(3); C.updateButtonValue('trigger', 0); await __fr(2);
    const r = { me: S.me === s, shots: (GUNS.shotN || 0) - n0, ang: +__ang(s.fwd, XR8.head.fwd).toFixed(2), third: S.third };
    XRDEV.quaternion.set(0, 0, 0, 1); return r; })()`);
  ok('soldier_gaze_fire', so.me && so.shots > 0 && so.ang < 3, so);
  s = await ev(`__xrshot()`); if (s && s.url) save('x6_vr_soldier.jpg', s.url);
  // ---- exit VR: the game must come back (pause menu, frame loop alive on window rAF)
  await ev(`XR8.sess.end(); 1`); await sleep(2500);
  const ex = await J(`(async () => { const a = { active: XR8.active, menu: MENU.cur, q: S.quality, lite: LITE73.on }; const l0 = lastT; await new Promise(r => setTimeout(r, 1500)); return Object.assign(a, { loop: lastT > l0, dT: +(lastT - l0).toFixed(0) }); })()`);
  ok('exit_restores', !ex.active && ex.loop && ex.menu === 'pause', ex);
  await ev(`MENU.close(); S.paused = false; 1`); await sleep(2500);
  await shot('x7_after_exit');
  // ---- enter again (second session) + leave
  await ev(`MENU.pause(); 1`); await sleep(800);
  await ev(`document.getElementById('xr8b').click(); 1`);
  for (let i = 0; i < 40 && !(await ev(`XR8.active`)); i++) await sleep(500);
  const g2 = await J(`(async () => { await __fr(15); const d = XR8.debug(); XR8.sess.end(); await new Promise(r => setTimeout(r, 1500)); const l0 = lastT; await new Promise(r => setTimeout(r, 1200)); return { game: d.stats.gameFrames, starts: d.stats.starts, loop: lastT > l0, active: XR8.active }; })()`);
  ok('second_session', g2.starts === 2 && g2.loop && !g2.active, g2);
  log('RESULT', JSON.stringify(R), 'passed', Object.values(R).filter(Boolean).length + '/' + Object.keys(R).length);
};
