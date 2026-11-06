// The bot's environment: what a bot sees and what it can do, in the shape machine learning likes — numbers in, a
// number out. Every bot in the game (the hand-written rules in scripted.js, a neural network in nn.js, your own) sits
// between these two functions:
//
//   const s = sense(game, mem)       the scan: the nearest foe, the boss, the objective's path, the telegraphs (per frame)
//   const obs = observe(s)           → Float32Array, one number per FEATURES entry, each about -1…1 (what the bot sees)
//   const a = policy(obs, s)         → an index into ACTIONS (what the bot decides) — this is the part you train
//   const inp = act(game, a, mem)    → { mx, my, orbit, tilt, pressed, held }: the fighter's controls for this frame
//
// createEnvBot(policy) wires the four into a (game) → inp bot that main.js (AUTO MODE) and the benches can drive.
// The movement part of an action is a "where to", not a stick direction: the env turns "towards the objective" into
// A* on the walk grid and a camera-relative stick, so a policy never has to learn trigonometry — it learns *when* to
// walk, fight, roll, jump and fire. Not sim code: it only reads the sim and writes an input, so any maths is fine here.
import { ST } from '../crowd/crowd.js';
import { TERRAIN, GATES } from '../world/map.js';

// ---- A* on the map's 2 m walk grid (closed gates are walls)
const _open = [];
export function gridPath(x0, z0, x1, z1) {
  const G = TERRAIN, { nx, nz, x0: gx, z0: gz, step } = G;
  const idx = (x, z) => Math.max(0, Math.min(nx - 1, Math.round((x - gx) / step))) + Math.max(0, Math.min(nz - 1, Math.round((z - gz) / step))) * nx;
  const closed = Object.values(GATES).filter((g) => !g.open).map((g) => g.rect);
  const free = (k, loose) => {
    if (G.in[k] < (loose ? 0.4 : 1.0)) return false;
    const x = gx + (k % nx) * step, z = gz + Math.floor(k / nx) * step;
    for (const r of closed) if (x > r[0] - 1.2 && x < r[2] + 1.2 && z > r[1] - 1.2 && z < r[3] + 1.2) return false;
    return true;
  };
  const s = idx(x0, z0), t = idx(x1, z1), N = nx * nz;
  const gs = new Float32Array(N).fill(1e9), from = new Int32Array(N).fill(-1), done = new Uint8Array(N);
  const hx = (k) => Math.hypot((k % nx) - (t % nx), Math.floor(k / nx) - Math.floor(t / nx));
  gs[s] = 0; _open.length = 0; _open.push([hx(s), s]);
  let it = 0;
  while (_open.length && it++ < 40000) {
    let bi = 0; for (let i = 1; i < _open.length; i++) if (_open[i][0] < _open[bi][0]) bi = i;
    const [, k] = _open[bi]; _open[bi] = _open[_open.length - 1]; _open.pop();
    if (done[k]) continue; done[k] = 1;
    if (k === t) break;
    const i = k % nx, j = Math.floor(k / nx);
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue;
      const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= nx || jj >= nz) continue;
      const n = ii + jj * nx; if (done[n] || !free(n, n === t || k === s)) continue;
      const g = gs[k] + (di && dj ? 1.414 : 1);
      if (g < gs[n]) { gs[n] = g; from[n] = k; _open.push([g + hx(n), n]); }
    }
  }
  if (from[t] < 0 && s !== t) return null;
  const out = [];
  for (let k = t; k >= 0 && k !== s; k = from[k]) out.push([gx + (k % nx) * step, gz + Math.floor(k / nx) * step]);
  return out.reverse();
}

/** World direction → stick for camera yaw (inverse of locomotion.js stickDir). */
export function stickFor(wx, wz, yaw) {
  const l = Math.hypot(wx, wz) || 1, fx = Math.sin(yaw), fz = Math.cos(yaw);
  wx /= l; wz /= l;
  return [-fz * wx + fx * wz, fx * wx + fz * wz];
}
const alive = (s) => s && s !== ST.DEAD && s !== ST.DOWN && s !== ST.OFF;

// ---- the action set: what one decision can be. Each is a "where to go" plus at most one button.
export const ACTIONS = [
  'walk',      // 0 towards the objective (A* path); stands still once there
  'close',     // 1 towards the fight target (the boss we are sent after, else what is in reach, else the nearest foe)
  'attack',    // 2 close in and tap attack (one tap per 12 frames — a combo string)
  'charge',    // 3 close in and tap charge (a finisher after the string, or the signature move on its own)
  'dodge',     // 4 roll out of harm: away from a red circle, sideways from a boss's blow, else away from the nearest foe
  'jump',      // 5 jump (over a shock ring, or into an air string)
  'musou',     // 6 fire the Overclock (if the gauge is ready; else does nothing)
  'retreat',   // 7 walk away from the nearest foe
  'stay',      // 8 nothing
];
export const A = Object.fromEntries(ACTIONS.map((n, i) => [n, i]));

// ---- the observation: one number per line, each about -1…1. Change this list and every bot sees differently.
export const FEATURES = [
  'hp',            // our bar, 0…1
  'gauge',         // the Overclock gauge, 0…1
  'gaugeReady',    // 1: the Overclock can fire now
  'inMusou',       // 1: an Overclock is running
  'grounded',      // 1: on the floor
  'attacking',     // 1: in an attack animation
  'foeDist',       // the nearest foe's distance / 20 m (1: none)
  'near',          // foes within 4.5 m / 10
  'crowd',         // foes within 10 m / 30
  'bossDist',      // the nearest boss's distance / 30 m (1: none)
  'bossIsTarget',  // 1: the objective arrow points at that boss
  'goalDist',      // distance to the objective / 60 m
  'fightDist',     // the fight target's distance / 10 m (1: none)
  'fightIsBoss',   // 1: the fight target is a boss or lieutenant
  'koGoal',        // 1: the current objective is a K.O. count (anything is fair game)
  'blow',          // 1: a boss's real blow lands on us in a few frames
  'warn',          // 1: we stand in a red circle that is about to land
  'warnSoon',      // how soon that circle lands, 0…1 (1: now)
  'ring',          // 1: a shock ring's edge is 0–1.6 m from us
  'dodgeCd',       // frames until we may roll again / 70
  'canTap',        // 1: a tap would register now (12 frames since the last)
  'string',        // where we are in the attack string, 0…1
  'stuck',         // frames without progress to the objective / 360
  'hurt',          // 1: we took damage in the last half second
];
const F = Object.fromEntries(FEATURES.map((n, i) => [n, i]));
export const STRING = ['attack', 'attack', 'attack', 'attack', 'charge', 'attack', 'attack', 'charge', 'attack', 'attack', 'attack', 'charge'];
const REACH = 3.2, TAP = 12;

/** A bot's scratch state (per fighter, per battle): the path, cooldowns, the progress watch. Make a fresh one per battle. */
export const createMemory = () => ({ path: null, planF: -999, planGoal: [0, 0], bestD: 1e9, lastProg: 0, unstick: 0, dodgeCd: 0, lastTap: -999, taps: 0, fightF: 0, hurtF: -999, lastHp: 1e9, s: null });

/** The scan: everything a decision could be based on, in world terms. Call once per frame; the result is kept on mem.s. */
export function sense(game, mem) {
  const h = game.hero, c = game.crowd, f = game.frame;
  const s = { h, c, f, musouReady: game.musou.ready(), koGoal: game.story.goal > 0, nf: -1, nd: 1e9, of: -1, od: 1e9, near: 0, crowd: 0, threat: -1, fight: -1, fightD: 99, gx: h.x, gz: h.z, dT: 0, wx: 0, wz: 1, warn: null, warnLeft: 99, ring: false, offTarget: false };
  if (h.hp < mem.lastHp) mem.hurtF = f;
  mem.lastHp = h.hp;
  if (mem.dodgeCd > 0) mem.dodgeCd--;
  // ---- surroundings: nearest foe, nearest boss / lieutenant, foes within 4.5 m / 10 m, a boss's blow about to land on us
  for (let i = 0; i < c.N; i++) {
    if (!alive(c.st[i])) continue;
    const d = Math.hypot(c.x[i] - h.x, c.z[i] - h.z);
    if (d < s.nd) { s.nd = d; s.nf = i; }
    if (c.type[i] === 1 && d < s.od) { s.od = d; s.of = i; }
    if (d < 4.5) s.near++;
    if (d < 10) s.crowd++;
    if (c.st[i] === ST.ATTACK && c.foe[i] < 0 && !c.feint[i] && d < 3.6 && c.stT[i] >= game.diff.windup - 12 && c.stT[i] < game.diff.windup - 2) s.threat = i;
  }
  // ---- where to: the objective arrow (a boss or a place), A* on the walk grid 8 m ahead
  const tgt = game.story.target;
  let gx = h.x, gz = h.z + 20;
  if (tgt) { gx = tgt.x; gz = tgt.z; }
  s.gx = gx; s.gz = gz;
  const dT = s.dT = Math.hypot(gx - h.x, gz - h.z);
  let wx = gx - h.x, wz = gz - h.z;
  if (dT > 6) {
    if (!mem.path || f - mem.planF > 60 || Math.hypot(mem.planGoal[0] - gx, mem.planGoal[1] - gz) > 3) { mem.path = gridPath(h.x, h.z, gx, gz); mem.planF = f; mem.planGoal = [gx, gz]; }
    const path = mem.path;
    if (path && path.length) {
      let q = 0; while (q < path.length - 1 && Math.hypot(path[q][0] - h.x, path[q][1] - h.z) < 8) q++;
      wx = path[q][0] - h.x; wz = path[q][1] - h.z;
    }
  }
  // progress watch: no approach to the goal for 6 s while not fighting → wiggle sideways + jump for 1.5 s
  if (dT < mem.bestD - 0.5) { mem.bestD = dT; mem.lastProg = f; }
  if (tgt && Math.abs(dT - mem.bestD) > 25) mem.bestD = dT;            // a new objective far away: re-arm
  if (f - mem.lastProg > 360 && s.near < 3 && dT > 8) { mem.unstick = 90; mem.lastProg = f; mem.bestD = dT; }
  if (mem.unstick > 0) { mem.unstick--; const sg = (f >> 5) & 1 ? 1 : -1; const l = Math.hypot(wx, wz) || 1; wx = wx / l - sg * wz / l * 1.5; wz = wz / l + sg * wx / l * 1.5; }
  s.wx = wx; s.wz = wz;
  // ---- the fight target: the boss we're sent after once within reach, else whatever stands in the way while the
  // objective is far, else the nearest foe (when in reach, or whenever a K.O. count is the objective)
  s.offTarget = typeof tgt === 'object' && !!tgt && s.of >= 0 && Math.hypot(c.x[s.of] - tgt.x, c.z[s.of] - tgt.z) < 0.5;
  let fight = -1;
  if (s.offTarget && s.od < REACH + 2) fight = s.of;
  else if (dT > 16) {
    const l = Math.hypot(wx, wz) || 1, ux = wx / l, uz = wz / l;
    let bd = 1e9;
    for (let i = 0; i < c.N; i++) {
      if (!alive(c.st[i])) continue;
      const ex = c.x[i] - h.x, ez = c.z[i] - h.z, d = Math.hypot(ex, ez);
      if (d < bd && (d < 1.3 || (d < 2.6 && (ex * ux + ez * uz) > d * 0.77))) { bd = d; fight = i; }
    }
  } else if (s.nf >= 0 && (s.nd < REACH || game.story.goal)) fight = s.nf;
  s.fight = fight;
  if (fight >= 0) s.fightD = Math.hypot(c.x[fight] - h.x, c.z[fight] - h.z);
  // ---- the bosses' telegraphs (game.story.fx): a red circle about to land on us, a shock ring's edge coming at us
  const fx = game.story.fx;
  if (fx) {
    for (const r of fx.rings) {
      if (!r.dmg || r.hit) continue;
      const R = r.r + (r.r1 - r.r) * (fx.now - r.t) / r.life, d = Math.hypot(h.x - r.x, h.z - r.z);
      if (d - R > 0 && d - R < 1.6) { s.ring = true; break; }
    }
    for (const w of fx.warn) {
      const left = w.t1 - fx.now, d = Math.hypot(h.x - w.x, h.z - w.z);
      if (left > 22 || left < 1 || d > w.r + 0.3) continue;
      s.warn = w; s.warnLeft = left; break;
    }
  }
  mem.s = s;
  return s;
}

/** The scan as numbers: the observation vector a learning policy is trained on. */
export function observe(s, mem, out = new Float32Array(FEATURES.length)) {
  const h = s.h, f = s.f;
  out[F.hp] = h.hp / h.hpMax;
  out[F.gauge] = h.musou / h.musouMax;
  out[F.gaugeReady] = s.musouReady ? 1 : 0;
  out[F.inMusou] = h.state === 'musou' ? 1 : 0;
  out[F.grounded] = h.grounded ? 1 : 0;
  out[F.attacking] = h.state === 'attack' ? 1 : 0;
  out[F.foeDist] = Math.min(s.nd, 20) / 20;
  out[F.near] = Math.min(s.near, 10) / 10;
  out[F.crowd] = Math.min(s.crowd, 30) / 30;
  out[F.bossDist] = Math.min(s.od, 30) / 30;
  out[F.bossIsTarget] = s.offTarget ? 1 : 0;
  out[F.goalDist] = Math.min(s.dT, 60) / 60;
  out[F.fightDist] = Math.min(s.fightD, 10) / 10;
  out[F.fightIsBoss] = s.fight >= 0 && s.c.type[s.fight] === 1 ? 1 : 0;
  out[F.koGoal] = s.koGoal ? 1 : 0;
  out[F.blow] = s.threat >= 0 ? 1 : 0;
  out[F.warn] = s.warn ? 1 : 0;
  out[F.warnSoon] = s.warn ? 1 - s.warnLeft / 22 : 0;
  out[F.ring] = s.ring ? 1 : 0;
  out[F.dodgeCd] = mem.dodgeCd / 70;
  out[F.canTap] = f - mem.lastTap >= TAP ? 1 : 0;
  out[F.string] = (mem.taps % STRING.length) / STRING.length;
  out[F.stuck] = Math.min(f - mem.lastProg, 360) / 360;
  out[F.hurt] = f - mem.hurtF < 30 ? 1 : 0;
  return out;
}

/** The decision as controls: a (game) step's input for action `a` (an ACTIONS index). Uses the scan on mem.s. */
export function act(game, a, mem) {
  const s = mem.s, h = game.hero, c = game.crowd, f = game.frame, yaw = game.cam.yaw;
  const inp = { mx: 0, my: 0, orbit: 0, tilt: 0, pressed: {}, held: {} };
  if (h.dead || !s) return inp;
  const press = (k) => { inp.pressed[k] = true; inp.held[k] = true; };
  const move = (wx, wz, mag) => { const [mx, my] = stickFor(wx, wz, yaw); inp.mx = mx * mag; inp.my = my * mag; };
  const toGoal = () => move(s.wx, s.wz, s.dT < 1.5 ? 0 : 1);
  const toFight = () => { if (s.fight < 0) return toGoal(); move(c.x[s.fight] - h.x, c.z[s.fight] - h.z, s.fightD > 2.2 ? 1 : 0.3); };
  // the way out of harm: away from a red circle's centre, sideways from a boss's blow, else away from the nearest foe
  const out = () => {
    if (s.warn) { const w = s.warn, d = Math.hypot(h.x - w.x, h.z - w.z); return d > 0.2 ? [(h.x - w.x) / d, (h.z - w.z) / d, 26] : [Math.sin(h.yaw + 1.6), Math.cos(h.yaw + 1.6), 26]; }
    if (s.threat >= 0) { const tx = c.x[s.threat] - h.x, tz = c.z[s.threat] - h.z, l = Math.hypot(tx, tz) || 1; return [-tz / l - tx / l * 0.5, tx / l - tz / l * 0.5, 50]; }
    if (s.nf >= 0) { const tx = c.x[s.nf] - h.x, tz = c.z[s.nf] - h.z, l = Math.hypot(tx, tz) || 1; return [-tx / l, -tz / l, 70]; }
    return [-Math.sin(h.yaw), -Math.cos(h.yaw), 70];
  };
  if (s.fight >= 0) mem.fightF++;
  switch (a) {
    case A.walk: toGoal(); break;
    case A.close: toFight(); break;
    case A.attack: case A.charge:
      toFight();
      if (f - mem.lastTap >= TAP) { press(a === A.attack ? 'attack' : 'charge'); mem.lastTap = f; mem.taps++; }
      break;
    case A.dodge: {
      const [dx, dz, cd] = out();
      move(dx, dz, 1);
      if (mem.dodgeCd === 0) { press('dodge'); mem.dodgeCd = cd; }
      break;
    }
    case A.jump: if (s.fight >= 0) toFight(); else toGoal(); press('jump'); break;
    case A.musou: if (s.fight >= 0) toFight(); else toGoal(); if (s.musouReady) press('musou'); break;
    case A.retreat: { const [dx, dz] = out(); move(dx, dz, 1); break; }
    default: break;
  }
  return inp;
}

/** A policy ((obs, s, mem) → ACTIONS index) as a game bot ((game) → inp). `every`: frames between decisions (the
 *  action is held in between; 1 = decide every frame, as the scripted rules do). */
export function createEnvBot(policy, { every = 1 } = {}) {
  const mem = createMemory();
  let a = A.stay, last = -1e9;
  const obs = new Float32Array(FEATURES.length);
  const bot = (game) => {
    const s = sense(game, mem);
    if (game.frame - last >= every) { last = game.frame; a = policy(observe(s, mem, obs), s, mem); }
    return act(game, a, mem);
  };
  bot.mem = mem;
  return bot;
}
