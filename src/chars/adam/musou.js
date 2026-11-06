// Adam's Overclock SONIC BOOM (sim; interface of src/musou/musou.js). Timeline (Overclock frames t, 210 = control
// returns; hitstop pauses it):
//   0   activation: the world holds still, he raises the mic (cut-in, 24 f)
//   30 / 60 / 90  three screams, each ring wider (circle 3.2 → 4.4 → 5.6 m, spin reaction)
//   116–150 he points down the lane: the drone strafes it (a 12 m line ahead, a tick every 8 f)
//   180 FINISHER: the mic drop — the stand slammed into the floor, a bass ring blasts out to 8 m (launch tiers)
import { emit } from '../../core/events.js';
import { setState, stickDir } from '../../hero/locomotion.js';
import { offSun, smooth, endMusou, gauge } from '../../musou/musou.js';
import { MUSOU_FRAMES } from './anims.js';
import * as dm from '../../core/dmath.js';

export const ADAM_MUSOU = {
  activation: 24, screams: [30, 60, 90], screamR: [3.2, 4.4, 5.6], strafe: [116, 150], strafeEvery: 8, strafeLen: 12, finisher: 180, end: MUSOU_FRAMES, cost: 1 / 3,
  screamHit: { shape: 'circle', dmg: 18, kb: 'spin', force: 6, lift: 3, hitstop: 2 },
  strafeHit: { shape: 'line', len: 12, width: 3.2, off: 0.8, dmg: 9, kb: 'flinch', force: 3, lift: 1, hitstop: 0 },
  strafeEnd: { shape: 'line', len: 12, width: 3.6, off: 0.8, dmg: 22, kb: 'blow', force: 11, lift: 5, hitstop: 4, heavy: true },
  waveR: 8, waveFrames: 14,
  waveHit: { shape: 'circle', range: 0, dmg: 42, kb: 'launch', force: 6, lift: 9, hitstop: 0, heavy: true, yMax: 5 },
};

export function createMusou(game) {
  const M = ADAM_MUSOU;
  const mu = { active: false, t: 0, wasReady: false, seq: 0, ax: 0, az: 0, yaw0: 0, waveR: 0 };
  const shot = { id: 0, yaw: 0, dist: 0, pitch: 0, fov: 50, height: 1.2, side: 0, shake: 1 };

  mu.reset = () => { mu.active = false; mu.t = 0; mu.wasReady = false; mu.waveR = 0; };

  mu.start = (inp) => {
    const h = game.hero;
    const [sx, sz, smag] = stickDir(inp, game.cam.yaw);
    if (smag) h.yaw = dm.atan2(sx, sz);
    mu.active = true; mu.t = 0; mu.waveR = 0; mu.seq++;
    mu.yaw0 = h.yaw; mu.ax = h.x; mu.az = h.z;
    mu.m0 = h.musou;
    h.move = null; h.vx = h.vz = 0;
    setState(h, 'musou');
    h.musouClip = 'mu_adam'; h.musouT = 0;
    h.iframes = M.end + 30;
    game.freeze = 2;
    emit('musou:start', { x: h.x, z: h.z, activation: M.activation, burstAt: M.finisher, contact: M.screams[0] });
  };

  const hitAt = (hit, x, z, yaw, key, rehit) => game.combat.strike(hit, x, z, yaw, key - (mu.seq % 1000) * 100000, rehit, 'musou');

  mu.stepHero = () => {
    const h = game.hero, t = ++mu.t;
    h.iframes = Math.max(h.iframes, 2);
    h.vx = h.vz = 0;
    h.musouClip = 'mu_adam'; h.musouT = t / M.end;
    h.musou = Math.max(0, mu.m0 - h.musouMax * M.cost * Math.min(1, t / M.screams[0]));
    if (t < M.activation) { game.freeze = Math.max(game.freeze, 2); return; }
    M.screams.forEach((f, j) => {                                    // three screams, each wider
      if (t !== f) return;
      hitAt({ ...M.screamHit, range: M.screamR[j] }, h.x, h.z, h.yaw, -2100 - j, false);
      emit('musou:hit', { x: h.x, y: 1.0, z: h.z, stage: 'rush', yaw: h.yaw, n: j });
    });
    const [s0, s1] = M.strafe;                                       // the drone strafes the lane ahead
    if (t >= s0 && t < s1 && (t - s0) % M.strafeEvery === 0) {
      const k = (t - s0) / M.strafeEvery, n = hitAt(M.strafeHit, h.x, h.z, h.yaw, -2500 - k, false);
      if (n) emit('musou:hit', { x: h.x + dm.sin(h.yaw) * (2 + k * 2), y: 0.6, z: h.z + dm.cos(h.yaw) * (2 + k * 2), stage: 'rush', yaw: h.yaw, n: k });
    }
    if (t === s1) {
      const n = hitAt(M.strafeEnd, h.x, h.z, h.yaw, -2600, false);
      emit('musou:hit', { x: h.x + dm.sin(h.yaw) * 6, y: 1.0, z: h.z + dm.cos(h.yaw) * 6, stage: 'contact', yaw: h.yaw, n });
    }
    const w = t - M.finisher;
    if (w >= 0 && w <= M.waveFrames) {                               // the bass ring from the mic drop
      const u = w / M.waveFrames;
      mu.waveR = M.waveR * (1 - (1 - u) * (1 - u) * (1 - u)) + 0.8;
      const n = hitAt({ ...M.waveHit, range: mu.waveR, lift: M.waveHit.lift - 3 * u, hitstop: w === 0 ? 5 : 0, heavy: w < 2 }, h.x, h.z, h.yaw, -3000, false);
      if (w === 0) emit('musou:burst', { count: n, x: h.x, z: h.z });
      else if (n) { const a = w * 2.4, R = mu.waveR * 0.9; emit('musou:hit', { x: h.x + dm.sin(a) * R, y: 0.4, z: h.z + dm.cos(a) * R, stage: 'wave', yaw: a, n: w }); }
    }
    if (t >= M.end) endMusou(mu, h, mu.m0, M.cost);
  };

  mu.shot = () => {
    if (!mu.active) return null;
    const t = mu.t, o = shot;
    o.shake = 0.4; o.side = 0;
    if (t < M.activation) {                                          // front three-quarter, above head height, slow push-in
      const u = t / M.activation;
      Object.assign(o, { id: 1, yaw: offSun(mu.yaw0 + Math.PI * 0.8), dist: 4.4 - 0.7 * u, pitch: 0.3, fov: 44, height: 1.1, side: 0.1 });
    } else if (t < M.strafe[0] - 6) {                                // wide, high over his shoulder: the screams
      const u = smooth(Math.min(1, (t - M.activation) / 20));
      Object.assign(o, { id: 2, yaw: offSun(mu.yaw0 + 0.35), dist: 5 + 3.5 * u, pitch: 0.22 + 0.1 * u, fov: 56, height: 1.5 + 0.6 * u, shake: 0.5 });
    } else if (t < M.finisher - 4) {                                 // behind and above him: the whole strafed lane
      Object.assign(o, { id: 3, yaw: offSun(mu.yaw0 + 0.2), dist: 7.5, pitch: 0.34, fov: 58, height: 2.4, shake: 0.6 });
    } else {                                                          // the finisher: low wide shot, the ring bursting out
      const u = smooth((t - M.finisher + 4) / (M.end - M.finisher + 4));
      Object.assign(o, { id: 4, yaw: offSun(mu.yaw0 - 0.5), dist: 8.5 + 1.5 * u, pitch: 0.08 + 0.05 * u, fov: 58, height: 1.6 + 0.3 * u, shake: 0.7 });
    }
    return o;
  };

  gauge(mu, game, M.cost);
  return mu;
}
