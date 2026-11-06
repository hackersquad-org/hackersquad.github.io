// Adam — mic-stand + drone moveset (data only; format: src/hero/moves.js header). Mid-heavy: the stand reaches far and
// sweeps wide, the screams and the drone hit at range. All timings in 60 Hz sim frames.
// N-string hit onsets 22–26 sf apart (onset spacing = cancel_k + tell_k+1 − tell_k): n1 11 → n2 35 → n3 59 → n4 83 → n5 107
// → n6 131. Charges: C1 Feedback (a scream cone, 5.5 m) · C2 rising flick launcher · C3 wide 270° sweep · C4 Drone Strafe
// (the drone rakes a 9 m lane ahead) · C5 Bass Drop (overhead smash + shockwave) · C6 Encore (three spins, then the
// knock-back).
import { prepMoves } from '../../hero/moveset.js';

const ONCE = 99;
export const MOVES = {
  // N1 jab: step in, both hands drive the mic straight out
  n1: { frames: 30, next: 'n2', charge: 'c2', cancel: 23, branch: 16, dodgeCancel: 15, steer: 5, lunge: [[4, 12, 0.5]],
    hits: [{ f: [11, 14], every: ONCE, shape: 'line', len: 2.6, width: 1.1, dmg: 14, kb: 'push', force: 5, hitstop: 3 }] },
  // N2 wide sweep: the stand swings right → left at waist height
  n2: { frames: 34, next: 'n3', charge: 'c3', cancel: 24, branch: 19, dodgeCancel: 18, steer: 4, lunge: [[6, 14, 0.35]],
    hits: [{ f: [12, 17], sweep: 1, shape: 'arc', range: 2.5, ang: 200, dmg: 16, kb: 'blow', force: 7, lift: 2, hitstop: 3 }] },
  // N3 rising flick: the mic dips low in front and flicks up through the front rank
  n3: { frames: 32, next: 'n4', charge: 'c4', cancel: 24, branch: 17, dodgeCancel: 16, steer: 5, lunge: [[6, 12, 0.4]],
    hits: [{ f: [12, 15], every: ONCE, shape: 'arc', range: 2.2, ang: 120, dmg: 16, kb: 'push', force: 5, lift: 3, hitstop: 3 }] },
  // N4 overhead chop: stand up over the head, down two-handed in front
  n4: { frames: 36, next: 'n5', charge: 'c5', cancel: 24, branch: 18, dodgeCancel: 18, steer: 6, lunge: [[4, 12, 0.45]],
    hits: [{ f: [13, 16], every: ONCE, shape: 'arc', range: 2.6, ang: 100, dmg: 18, kb: 'push', force: 6, hitstop: 4 }] },
  // N5 backhand sweep left → right
  n5: { frames: 38, next: 'n6', charge: 'c6', cancel: 23, branch: 20, dodgeCancel: 20, steer: 4, lunge: [[4, 12, 0.4]],
    hits: [{ f: [14, 19], sweep: -1, shape: 'arc', range: 2.6, ang: 220, dir: -20, dmg: 17, kb: 'blow', force: 8, lift: 3, hitstop: 3 }] },
  // N6 full spin: one planted 360° turn, the stand at arm's length, low finish held
  n6: { frames: 50, next: 'n1', charge: 'c1', cancel: 40, dodgeCancel: 22, steer: 6, lunge: [[2, 12, 0.7]], armor: true,
    hits: [{ f: [14, 20], sweep: -1, dir: -180, shape: 'circle', range: 2.8, dmg: 26, kb: 'blow', force: 12, lift: 6, hitstop: 7, heavy: true }] },

  // C1 Feedback: leans the stand back, screams into the mic — a cone of sound rattles the ranks, the last note blows them away
  c1: { frames: 66, cancel: 58, dodgeCancel: 52, steer: 14, armor: true,
    hits: [{ f: [20, 44], every: 6, shape: 'arc', range: 5.5, ang: 70, dmg: 6, kb: 'flinch', force: 2, hitstop: 1 },
      { f: [48, 51], every: ONCE, shape: 'arc', range: 6, ang: 80, dmg: 22, kb: 'blow', force: 13, lift: 4, hitstop: 6, heavy: true }] },
  // C2 (N1 → C) rising flick launcher: crouch, mic low, rip it straight up under the ring
  c2: { frames: 60, cancel: 52, dodgeCancel: 42, steer: 10, lunge: [[4, 12, 0.5]], armor: true,
    hits: [{ f: [15, 18], every: ONCE, shape: 'arc', range: 2.8, ang: 120, dmg: 18, kb: 'launch', force: 2, lift: 10, hitstop: 6, heavy: true }] },
  // C3 (N2 → C) wide 270° sweep: chambered far right, the stand sweeps round the front and the left flank
  c3: { frames: 66, cancel: 58, dodgeCancel: 46, steer: 12, lunge: [[10, 20, 0.6]], armor: true,
    hits: [{ f: [18, 28], sweep: 1, sweepN: 8, shape: 'arc', range: 3.4, ang: 270, dmg: 22, kb: 'blow', force: 10, lift: 4, hitstop: 5, heavy: true }] },
  // C4 (N3 → C) Drone Strafe: he points, the drone rakes the lane ahead with its laser, then one heavy burst down the line
  c4: { frames: 66, cancel: 58, dodgeCancel: 50, steer: 12, armor: true,
    hits: [{ f: [18, 42], every: 6, shape: 'line', len: 9, width: 2.6, off: 0.8, dmg: 7, kb: 'flinch', force: 2, hitstop: 1 },
      { f: [46, 48], every: ONCE, shape: 'line', len: 9, width: 3, off: 0.8, dmg: 20, kb: 'blow', force: 11, lift: 4, hitstop: 5, heavy: true }] },
  // C5 (N4 → C) Bass Drop: stand raised high, brought down two-handed; a shockwave ring bursts out of the impact
  c5: { frames: 76, cancel: 68, dodgeCancel: 54, steer: 14, lunge: [[4, 14, 0.5]], armor: true,
    hits: [{ f: [24, 27], every: ONCE, shape: 'arc', range: 2.8, ang: 90, dmg: 18, kb: 'push', force: 6, hitstop: 4 },
      { f: [36, 39], every: ONCE, shape: 'circle', range: 4.6, dmg: 26, kb: 'blow', force: 13, lift: 6, hitstop: 7, heavy: true }] },
  // C6 (N5 → C) Encore: three turns with the stand out that stagger the ring, then the knock-back that throws it out
  c6: { frames: 92, cancel: 84, dodgeCancel: 72, steer: 8, lunge: [[8, 56, 1.2]], armor: true,
    hits: [{ f: [12, 52], shape: 'circle', range: 3.2, dmg: 6, kb: 'flinch', force: 1, hitstop: 1, every: 10 },
      { f: [60, 64], every: ONCE, shape: 'circle', range: 4.2, dmg: 30, kb: 'blow', force: 15, lift: 6, hitstop: 8, heavy: true }] },

  // Dash attack (run + attack): running low sweep, a step of drift after it
  dash: { frames: 56, cancel: 48, dodgeCancel: 28, steer: 3, lunge: [[0, 22, 4.6, 'lin'], [22, 32, 1.2]],
    hits: [{ f: [18, 24], sweep: 1, shape: 'arc', range: 3.0, ang: 200, dmg: 18, kb: 'blow', force: 10, lift: 3, hitstop: 4, heavy: true }] },
  // Jump attack: a swipe every 12 sf while hovering
  jatk: { frames: 24, air: true, hover: 2.4, next: 'jatk', charge: 'jc', cancel: 12, dodgeCancel: 99, steer: 3,
    hits: [{ f: [6, 10], every: ONCE, shape: 'arc', range: 3.2, ang: 200, dmg: 12, kb: 'flinch', force: 3, hitstop: 2, yMax: 4.5 }] },
  // Jump charge (Mic Drop): stand raised at the apex, plunge, the base slams the floor, shockwave
  jc: { frames: 56, air: true, hover: 3, landFrame: 36, hang: [6, 30], plunge: [30, -60], cancel: 50, dodgeCancel: 40, steer: 12, armor: true,
    hits: [{ f: [36, 39], every: ONCE, shape: 'circle', range: 4.2, dmg: 22, kb: 'launch', force: 5, lift: 8, hitstop: 7, heavy: true }] },
};

export const AIR_CHAIN_MAX = 8;
/** Moves the drone joins (render-only, ./model.js): [first frame, last frame, metres ahead of him it flies to]. */
export const DRONE_MOVES = { c4: [12, 50, 5], jc: [30, 44, 2.5], c1: [18, 52, 1.5] };
prepMoves(MOVES);
