// Connector — the jelly's moveset (data only; format: src/hero/moves.js header; `hand`: R / L = which of its two orange
// ball hands strikes — the trail follows it). It fights with its whole body: jabs with the floating hands, belly bumps,
// the spin, the hops — and it copies what it has seen: C1 is Adam's scream, C4 Brian's camera flash, C6 splits it into
// its three clones. All timings in 60 Hz sim frames.
// N-string hit onsets 18–22 sf apart: n1 8 → n2 26 → n3 46 → n4 66 → n5 85 → n6 (hop slam) 122.
// Charges: C1 Copy: Scream (a sound cone, 5 m) · C2 Uppercut (launcher) · C3 Spin Attack (a spinning top through the
// ranks) · C4 Copy: Flash (eye-beams flashing down a 5 m cone) · C5 Triple Hop (three hops forward, a slam under each) ·
// C6 Clone Call (three clones split off — blue, pink, yellow — all spin and slam together, then the clones stay and
// fight on their own for five seconds: ./musou.js).
import { prepMoves } from '../../hero/moveset.js';

const ONCE = 99;
export const MOVES = {
  n1: { frames: 24, next: 'n2', charge: 'c2', cancel: 18, branch: 12, dodgeCancel: 12, steer: 5, lunge: [[3, 10, 0.35]], hand: 'R',
    hits: [{ f: [8, 11], every: ONCE, shape: 'arc', range: 2.0, ang: 110, dir: -10, dmg: 9, kb: 'push', force: 3, hitstop: 2 }] },
  n2: { frames: 24, next: 'n3', charge: 'c3', cancel: 18, branch: 12, dodgeCancel: 12, steer: 5, lunge: [[3, 10, 0.35]], hand: 'L',
    hits: [{ f: [8, 11], every: ONCE, shape: 'arc', range: 2.0, ang: 110, dir: 10, dmg: 9, kb: 'push', force: 3, hitstop: 2 }] },
  // N3 clap: both hands slammed together in front
  n3: { frames: 30, next: 'n4', charge: 'c4', cancel: 22, branch: 15, dodgeCancel: 15, steer: 5, lunge: [[4, 12, 0.4]], hand: [[0, 'L'], [11, 'R']],
    hits: [{ f: [10, 13], every: ONCE, shape: 'arc', range: 2.2, ang: 150, dmg: 14, kb: 'blow', force: 6, lift: 2, hitstop: 3 }] },
  // N4 belly bump
  n4: { frames: 30, next: 'n5', charge: 'c5', cancel: 21, branch: 14, dodgeCancel: 14, steer: 5, lunge: [[3, 12, 0.9]],
    hits: [{ f: [10, 13], every: ONCE, shape: 'line', len: 2.2, width: 1.7, dmg: 14, kb: 'push', force: 7, lift: 1, hitstop: 3 }] },
  // N5 spin slap: one quick turn, hands out
  n5: { frames: 30, next: 'n6', charge: 'c6', cancel: 21, branch: 15, dodgeCancel: 15, steer: 4, lunge: [[3, 10, 0.3]], hand: 'R',
    hits: [{ f: [8, 14], sweep: -1, dir: -180, shape: 'circle', range: 2.3, dmg: 12, kb: 'flinch', force: 4, hitstop: 2 }] },
  // N6 hop slam: a short hop, the whole body dropped on the ring
  n6: { frames: 50, next: 'n1', charge: 'c1', cancel: 40, dodgeCancel: 28, steer: 6, lunge: [[4, 22, 1.0]], armor: true, leap: [6, 5.6], landFrame: 24,
    hits: [{ f: [24, 27], every: ONCE, shape: 'circle', range: 2.9, dmg: 24, kb: 'blow', force: 12, lift: 6, hitstop: 7, heavy: true }] },

  // C1 Copy: Scream — it opens its mouth as wide as it goes and screams Adam's scream
  c1: { frames: 60, cancel: 52, dodgeCancel: 46, steer: 14, armor: true,
    hits: [{ f: [18, 38], every: 6, shape: 'arc', range: 5, ang: 70, dmg: 6, kb: 'flinch', force: 2, hitstop: 1 },
      { f: [42, 45], every: ONCE, shape: 'arc', range: 5.5, ang: 80, dmg: 20, kb: 'blow', force: 12, lift: 4, hitstop: 6, heavy: true }] },
  // C2 (N1 → C) Uppercut: crouch, the right hand ripped up under the ring
  c2: { frames: 52, cancel: 44, dodgeCancel: 36, steer: 10, lunge: [[4, 12, 0.5]], armor: true, hand: 'R',
    hits: [{ f: [14, 17], every: ONCE, shape: 'arc', range: 2.4, ang: 120, dmg: 16, kb: 'launch', force: 2, lift: 10, hitstop: 6, heavy: true }] },
  // C3 (N2 → C) Spin Attack: a spinning top, 3 m through the ranks, the last turn throws them out
  c3: { frames: 72, cancel: 64, dodgeCancel: 60, steer: 12, lunge: [[8, 52, 3.0]], armor: true, hand: [[0, 'R'], [20, 'L'], [32, 'R'], [44, 'L']],
    hits: [{ f: [10, 52], every: 7, shape: 'circle', range: 2.5, dmg: 7, kb: 'spin', force: 3, lift: 1, hitstop: 1 },
      { f: [56, 59], every: ONCE, shape: 'circle', range: 3.2, dmg: 20, kb: 'blow', force: 12, lift: 5, hitstop: 6, heavy: true }] },
  // C4 (N3 → C) Copy: Flash — its eyes flash like Brian's camera, the last one overexposed
  c4: { frames: 58, cancel: 50, dodgeCancel: 42, steer: 14, armor: true,
    hits: [{ f: [14, 34], every: 10, shape: 'arc', range: 5, ang: 90, dmg: 6, kb: 'flinch', force: 2, hitstop: 1 },
      { f: [38, 40], every: ONCE, shape: 'arc', range: 5.5, ang: 100, dmg: 18, kb: 'blow', force: 12, lift: 4, hitstop: 5, heavy: true }] },
  // C5 (N4 → C) Triple Hop: three hops forward, a slam under each, the last one launches
  c5: { frames: 80, cancel: 72, dodgeCancel: 66, steer: 10, lunge: [[6, 22, 1.6], [26, 42, 1.6], [46, 60, 1.6]], armor: true,
    hits: [{ f: [22, 24], every: ONCE, shape: 'circle', range: 2.8, dmg: 12, kb: 'blow', force: 6, lift: 3, hitstop: 3 },
      { f: [42, 44], every: ONCE, shape: 'circle', range: 3.0, dmg: 12, kb: 'blow', force: 6, lift: 3, hitstop: 3 },
      { f: [60, 63], every: ONCE, shape: 'circle', range: 3.8, dmg: 24, kb: 'launch', force: 5, lift: 9, hitstop: 7, heavy: true }] },
  // C6 (N5 → C) Clone Call: three clones split off round it, all spin, then slam together; the clones fight on
  c6: { frames: 84, cancel: 76, dodgeCancel: 66, steer: 8, armor: true,
    hits: [{ f: [16, 36], every: 8, shape: 'circle', range: 3.6, dmg: 6, kb: 'flinch', force: 1, hitstop: 1 },
      { f: [44, 47], every: ONCE, shape: 'circle', range: 4.8, dmg: 30, kb: 'blow', force: 15, lift: 6, hitstop: 8, heavy: true }] },

  // Dash attack: a rolling tackle
  dash: { frames: 46, cancel: 38, dodgeCancel: 26, steer: 3, lunge: [[0, 20, 4.4, 'lin'], [20, 28, 1.0]],
    hits: [{ f: [8, 22], every: 5, shape: 'line', len: 2.2, width: 1.8, dmg: 10, kb: 'blow', force: 9, lift: 3, hitstop: 2, heavy: true }] },
  // Jump attack: slaps in the air
  jatk: { frames: 20, air: true, hover: 2.3, next: 'jatk', charge: 'jc', cancel: 10, dodgeCancel: 99, steer: 3, hand: [[0, 'R'], [10, 'L']],
    hits: [{ f: [5, 8], every: ONCE, shape: 'arc', range: 2.4, ang: 200, dmg: 9, kb: 'flinch', force: 3, hitstop: 1, yMax: 4.5 }] },
  // Jump charge: the stomp — it hangs, then drops flat on the floor
  jc: { frames: 52, air: true, hover: 3, landFrame: 32, hang: [6, 26], plunge: [26, -60], cancel: 46, dodgeCancel: 38, steer: 12, armor: true,
    hits: [{ f: [32, 35], every: ONCE, shape: 'circle', range: 4.0, dmg: 22, kb: 'launch', force: 5, lift: 8, hitstop: 6, heavy: true }] },
};

export const AIR_CHAIN_MAX = 10;
/** Clone Call: the C6 frame the three clones split off on (sim: ./musou.js). */
export const CLONE_CALL = 12;
prepMoves(MOVES);
