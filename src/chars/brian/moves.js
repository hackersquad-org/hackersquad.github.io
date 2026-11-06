// Brian — cart + camera moveset (data only; format: src/hero/moves.js header; `hand`: R = the cart he pushes, L = the
// camera in his left hand). Heavy: slow wind-ups, wide arcs, the hardest hits in the squad; the camera's flash reaches far
// and staggers without hurting much. All timings in 60 Hz sim frames.
// N-string hit onsets: n1 12 → n2 37 → n3 59 (flash) → n4 83 → n5 107 → n6 134.
// Charges: C1 Cart Surf (rides the cart 6 m through the ranks, a drift spin at the end) · C2 Tip-Up (the cart's nose
// flipped up: launcher) · C3 wide 270° sweep · C4 Burst Mode (a volley of flashes, 5 m cone) · C5 Unload (overhead slam +
// shockwave) · C6 Demolition Derby (three spins, then the knock-back).
import { prepMoves } from '../../hero/moveset.js';

const ONCE = 99;
export const MOVES = {
  // N1 shove: both arms drive the cart straight into the front rank
  n1: { frames: 32, next: 'n2', charge: 'c2', cancel: 24, branch: 17, dodgeCancel: 16, steer: 5, lunge: [[4, 13, 0.5]],
    hits: [{ f: [12, 15], every: ONCE, shape: 'line', len: 2.6, width: 1.5, dmg: 16, kb: 'push', force: 6, hitstop: 3 }] },
  // N2 swing: the cart heaved round right → left
  n2: { frames: 36, next: 'n3', charge: 'c3', cancel: 25, branch: 20, dodgeCancel: 19, steer: 4, lunge: [[6, 14, 0.35]],
    hits: [{ f: [13, 18], sweep: 1, shape: 'arc', range: 2.7, ang: 190, dmg: 18, kb: 'blow', force: 8, lift: 2, hitstop: 3 }] },
  // N3 flash: the camera up to his eye, one flash down the lane — light damage, everyone in it staggers
  n3: { frames: 30, next: 'n4', charge: 'c4', cancel: 22, branch: 14, dodgeCancel: 14, steer: 6, hand: 'L',
    hits: [{ f: [10, 12], every: ONCE, shape: 'arc', range: 3.8, ang: 100, dmg: 8, kb: 'flinch', force: 2, hitstop: 2 }] },
  // N4 back swing left → right
  n4: { frames: 38, next: 'n5', charge: 'c5', cancel: 26, branch: 20, dodgeCancel: 20, steer: 5, lunge: [[4, 13, 0.4]],
    hits: [{ f: [14, 19], sweep: -1, shape: 'arc', range: 2.7, ang: 200, dir: -10, dmg: 18, kb: 'blow', force: 8, lift: 3, hitstop: 3 }] },
  // N5 ram: two steps behind the cart
  n5: { frames: 38, next: 'n6', charge: 'c6', cancel: 24, branch: 19, dodgeCancel: 19, steer: 5, lunge: [[3, 14, 0.9]],
    hits: [{ f: [13, 17], every: ONCE, shape: 'line', len: 3.2, width: 1.6, dmg: 18, kb: 'push', force: 7, lift: 1, hitstop: 4 }] },
  // N6 full spin: one planted turn, the cart at arm's length
  n6: { frames: 54, next: 'n1', charge: 'c1', cancel: 44, dodgeCancel: 24, steer: 6, lunge: [[2, 12, 0.6]], armor: true,
    hits: [{ f: [16, 22], sweep: -1, dir: -180, shape: 'circle', range: 3.0, dmg: 30, kb: 'blow', force: 13, lift: 6, hitstop: 7, heavy: true }] },

  // C1 Cart Surf: a running hop onto the cart, 6 m through the ranks, a drift spin off it
  c1: { frames: 70, cancel: 62, dodgeCancel: 54, steer: 14, lunge: [[14, 44, 6, 'lin']], armor: true,
    hits: [{ f: [16, 44], every: 5, shape: 'line', len: 2.2, width: 1.9, dmg: 8, kb: 'push', force: 7, lift: 2, hitstop: 1 },
      { f: [48, 52], every: ONCE, shape: 'circle', range: 3.0, dmg: 22, kb: 'blow', force: 12, lift: 5, hitstop: 6, heavy: true }] },
  // C2 (N1 → C) Tip-Up: crouch, the cart's nose ripped up under the ring
  c2: { frames: 62, cancel: 54, dodgeCancel: 44, steer: 10, lunge: [[4, 13, 0.5]], armor: true,
    hits: [{ f: [16, 19], every: ONCE, shape: 'arc', range: 2.8, ang: 120, dmg: 20, kb: 'launch', force: 2, lift: 10, hitstop: 6, heavy: true }] },
  // C3 (N2 → C) wide 270° sweep
  c3: { frames: 68, cancel: 60, dodgeCancel: 48, steer: 12, lunge: [[10, 20, 0.6]], armor: true,
    hits: [{ f: [19, 29], sweep: 1, sweepN: 8, shape: 'arc', range: 3.4, ang: 270, dmg: 24, kb: 'blow', force: 11, lift: 4, hitstop: 5, heavy: true }] },
  // C4 (N3 → C) Burst Mode: the camera at his eye, a volley of flashes, the last one overexposed
  c4: { frames: 64, cancel: 56, dodgeCancel: 48, steer: 14, armor: true, hand: 'L',
    hits: [{ f: [16, 40], every: 8, shape: 'arc', range: 5, ang: 90, dmg: 6, kb: 'flinch', force: 2, hitstop: 1 },
      { f: [44, 46], every: ONCE, shape: 'arc', range: 5.5, ang: 100, dmg: 20, kb: 'blow', force: 12, lift: 4, hitstop: 5, heavy: true }] },
  // C5 (N4 → C) Unload: the cart heaved overhead and brought down; a shockwave ring bursts out of the impact
  c5: { frames: 78, cancel: 70, dodgeCancel: 56, steer: 14, lunge: [[4, 14, 0.5]], armor: true,
    hits: [{ f: [25, 28], every: ONCE, shape: 'arc', range: 2.8, ang: 90, dmg: 20, kb: 'push', force: 6, hitstop: 4 },
      { f: [37, 40], every: ONCE, shape: 'circle', range: 4.8, dmg: 28, kb: 'blow', force: 13, lift: 6, hitstop: 7, heavy: true }] },
  // C6 (N5 → C) Demolition Derby: three turns with the cart out, then the knock-back
  c6: { frames: 94, cancel: 86, dodgeCancel: 74, steer: 8, lunge: [[8, 56, 1.2]], armor: true,
    hits: [{ f: [12, 52], shape: 'circle', range: 3.3, dmg: 7, kb: 'flinch', force: 1, hitstop: 1, every: 10 },
      { f: [60, 64], every: ONCE, shape: 'circle', range: 4.4, dmg: 32, kb: 'blow', force: 15, lift: 6, hitstop: 8, heavy: true }] },

  // Dash attack: a running ram
  dash: { frames: 56, cancel: 48, dodgeCancel: 30, steer: 3, lunge: [[0, 22, 4.8, 'lin'], [22, 32, 1.2]],
    hits: [{ f: [14, 24], every: 5, shape: 'line', len: 2.6, width: 1.8, dmg: 12, kb: 'blow', force: 10, lift: 3, hitstop: 3, heavy: true }] },
  // Jump attack: the cart swung through the air
  jatk: { frames: 26, air: true, hover: 2.4, next: 'jatk', charge: 'jc', cancel: 13, dodgeCancel: 99, steer: 3,
    hits: [{ f: [7, 11], every: ONCE, shape: 'arc', range: 3.0, ang: 200, dmg: 13, kb: 'flinch', force: 3, hitstop: 2, yMax: 4.5 }] },
  // Jump charge: rides the cart down onto the floor
  jc: { frames: 58, air: true, hover: 3, landFrame: 36, hang: [6, 30], plunge: [30, -60], cancel: 52, dodgeCancel: 42, steer: 12, armor: true,
    hits: [{ f: [36, 39], every: ONCE, shape: 'circle', range: 4.4, dmg: 24, kb: 'launch', force: 5, lift: 8, hitstop: 7, heavy: true }] },
};

export const AIR_CHAIN_MAX = 6;
prepMoves(MOVES);
