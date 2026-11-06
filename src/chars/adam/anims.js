// Adam's clips: attack clips per move id (./moves.js) through the shared clip kit (planted, baked feet), the Overclock
// clip, and the engine's locomotion clips (a mic stand carries like a spear). Authoring: P() over AD (his ready stance:
// stand across the body, mic up and forward); the stand is the rig's weapon joint (origin = rear grip, +Z along the shaft,
// mic at 1.55 m). pole(centre, yaw, elev, roll, at) = the shaft through `centre`, `at` m from the rear grip.
// Contact poses sit on each move's first active frame.
import { P, clip, spearAbout, STANCE } from '../../hero/rig.js';
import { LOCO_CLIPS, runPose, rollPose } from '../../hero/anims/locomotion.js';
import { createClipKit } from '../shared/clipkit.js';
import { lungeAt } from '../../hero/moveset.js';
import { MOVES } from './moves.js';

const pole = (c, yaw, elev, roll = 0, at = 0.35) => spearAbout(c, yaw, elev, roll, at);
export const AD = { ...STANCE, spear: pole([-0.02, 1.02, 0.28], 14, 26), gripL: 0.6, hipsR: [0, -18, 0], chest: [4, 6, 0] };
const ENTRY = { n2: 'n1', n3: 'n2', n4: 'n3', n5: 'n4', n6: 'n5', c2: 'n1', c3: 'n2', c4: 'n3', c5: 'n4', c6: 'n5' };
const { clipF } = createClipKit(MOVES, ENTRY, AD);
const L = (id, f) => lungeAt(MOVES[id], f);
/** Lead-foot step landing `z` m ahead of the stance spot at move frame f (move-start coords include the lunge so far). */
const lead = (id, f, z = 0.2, x = 0.2, yaw = 12) => [x, 0.08, 0.3 + z + L(id, f), 0, yaw];
/** Stand held out level at heading `yaw` (° off his facing, + = left), body twisted `tw`° with it. */
const out = (yaw, elev = -5, tw = yaw * 0.4, extra) => ({
  spear: pole([Math.sin(yaw * Math.PI / 180) * 0.3, 1.08, 0.1 + Math.cos(yaw * Math.PI / 180) * 0.3], yaw, elev),
  chest: [6, tw, 0], hipsR: [0, tw * 0.8, 0], spine: [6, tw * 0.3, 0], ...extra });
const OVER = { spear: pole([0, 1.6, 0.05], 0, 95), chest: [-10, 0, 0], head: [-8, 0, 0], hipsR: [0, 0, 0] };
const DOWN = (z = 0.55, elev = -30) => ({ spear: pole([0, 0.95, z], 0, elev), chest: [22, 0, 0], hips: [0, 0.78, 0.1], hipsR: [0, 0, 0] });
const THRUST = (z, extra) => ({ spear: pole([0, 1.12, z], 0, 0, 90, 0.5), chest: [10, 5, 0], hipsR: [0, -5, 0], hips: [0, 0.84, 0.1], ...extra });
/** The rock-star lean: the mic (1.55 m up the shaft) at his mouth, the base swung out behind; lean° back. */
const SING = (lean = 0, extra) => ({ spear: pole([0, 1.6, 0.2], 0, 66 + lean * 0.4, 0, 1.5), chest: [-6 - lean, 0, 0], spine: [-4 - lean * 0.5, 0, 0],
  head: [-10 - lean * 0.5, 0, 0], hips: [0, 0.86, -0.02], hipsR: [0, 0, 0], gripR: 0.95, gripL: 1.25, ...extra });
const B = {};                                     // = AD (a key with no overrides)

function attacks() {
  const C = {};
  // ---- N1 jab: chamber back at the hip, drive it straight out (contact 11)
  C.n1 = clipF('n1', [
    [0, B],
    [7, { spear: pole([-0.05, 1.1, -0.2], 0, 4, 90, 0.5), chest: [0, -15, 0], hipsR: [0, -35, 0], hips: [0, 0.86, -0.05] }],
    [11, THRUST(0.8, { fL: lead('n1', 11, 0.3, 0.18, 10) }), 'snap'],
    [18, THRUST(0.75)],
    [30, B],
  ]);
  // ---- N2 wide sweep: chamber right, sweep right → left (contact 12)
  C.n2 = clipF('n2', [
    [0, B],
    [8, { spear: pole([0.3, 1.15, 0.05], 110, 8), chest: [0, 45, 0], hipsR: [0, 30, 0], spine: [4, 15, 0] }],
    [14, { spear: pole([-0.2, 1.08, 0.25], -110, 2), chest: [6, -40, 0], hipsR: [0, -40, 0], spin: -30, fR: [-0.22, 0.08, -0.2 + L('n2', 14), 0, -40] }, 'snap'],
    [22, { spear: pole([-0.25, 1.05, 0], -150, 0), chest: [4, -50, 0], hipsR: [0, -45, 0], spin: -45 }],
    [34, B],
  ]);
  // ---- N3 rising flick: mic dips low in front, flicks up (contact 12)
  C.n3 = clipF('n3', [
    [0, B],
    [8, { spear: pole([0, 0.8, 0.55], 0, -38), chest: [18, 0, 0], hips: [0, 0.8, 0.06], hipsR: [0, 0, 0] }],
    [12, { spear: pole([0, 1.3, 0.55], 0, 30), chest: [2, 0, 0], hips: [0, 0.88, 0.08], hipsR: [0, 0, 0], fL: lead('n3', 12, 0.25) }, 'snap'],
    [16, { spear: pole([0, 1.55, 0.45], 0, 60), chest: [-8, 0, 0], head: [-6, 0, 0], hips: [0, 0.92, 0.06], hipsR: [0, 0, 0] }],
    [32, B],
  ]);
  // ---- N4 overhead chop (contact 13)
  C.n4 = clipF('n4', [
    [0, B],
    [8, { ...OVER, hips: [0, 0.92, 0] }],
    [13, { ...DOWN(0.6, -22), chest: [20, 0, 0], fL: lead('n4', 13, 0.3) }, 'snap'],
    [22, { ...DOWN(0.6, -24), chest: [18, 0, 0] }],
    [36, B],
  ]);
  // ---- N5 backhand sweep left → right (contact 14)
  C.n5 = clipF('n5', [
    [0, B],
    [8, { ...out(120, 0, 45), hips: [0, 0.86, 0] }],
    [12, { ...out(40, -6, 15), hips: [0, 0.84, 0.05], fL: lead('n5', 12, 0.25) }, 'lin'],
    [18, { ...out(-100, -4, -40) }, 'snap'],
    [26, { ...out(-110, -2, -42) }],
    [38, B],
  ]);
  // ---- N6 full spin, stand at arm's length, low finish (contact 14)
  C.n6 = clipF('n6', [
    [0, B],
    [8, { ...out(-100, 0, -40), hips: [0, 0.84, 0] }],
    [14, { ...out(90, -6, 0), spin: 0, hips: [0, 0.8, 0.04] }, 'lin'],
    [22, { ...out(90, -6, 0), spin: -360, hips: [0, 0.78, 0.06] }, 'lin'],
    [32, { ...out(80, -12, 20), spin: -360, hips: [0, 0.76, 0.06], chest: [16, 20, 0] }, 'out'],
    [50, { spin: -360 }],
  ]);
  // ---- C1 Feedback: grab the stand (8), lean back into the scream (18), hold it shaking (20–44), throw the last note
  // forward (48), recover
  C.c1 = clipF('c1', [
    [0, B],
    [10, SING(0, { hips: [0, 0.9, 0] })],
    [18, SING(18, { fL: lead('c1', 18, 0.15, 0.24, 15) }), 'snap'],
    [26, SING(22)],
    [34, SING(16)],
    [44, SING(24)],
    [48, SING(-28, { hips: [0, 0.8, 0.1], chest: [24, 0, 0], head: [6, 0, 0] }), 'snap'],
    [56, SING(-24, { hips: [0, 0.8, 0.1], chest: [22, 0, 0], head: [6, 0, 0] })],
    [66, B],
  ]);
  // ---- C2 rising flick launcher: crouch, mic low → rip it up (contact 15)
  C.c2 = clipF('c2', [
    [0, B],
    [8, { spear: pole([0, 0.7, 0.6], 0, -40), chest: [20, 0, 0], hips: [0, 0.76, 0.06], hipsR: [0, 0, 0] }],
    [11, { spear: pole([0, 0.68, 0.62], 0, -44), chest: [22, 0, 0], hips: [0, 0.74, 0.07], hipsR: [0, 0, 0], fL: lead('c2', 11, 0.3) }],
    [16, { spear: pole([0, 1.7, 0.45], 0, 72), chest: [-12, 0, 0], head: [-10, 0, 0], hips: [0, 0.95, 0.05], hipsR: [0, 0, 0] }, 'snap'],
    [32, { spear: pole([0, 1.72, 0.42], 0, 76), chest: [-10, 0, 0], head: [-8, 0, 0], hips: [0, 0.93, 0.05], hipsR: [0, 0, 0] }],
    [60, B],
  ]);
  // ---- C3 wide 270° sweep (window 18–28)
  C.c3 = clipF('c3', [
    [0, B],
    [10, { ...out(-150, 2, -55), hips: [0, 0.84, 0] }],
    [16, { ...out(-150, 0, -58), hips: [0, 0.82, 0.02], fL: lead('c3', 16, 0.35, 0.26, 20) }],
    [28, { ...out(40, -4, 30), spin: 60, hips: [0, 0.8, 0.06] }, 'lin'],
    [34, { ...out(60, -6, 36), spin: 80, hips: [0, 0.8, 0.06] }, 'out'],
    [50, { ...out(60, -8, 30), spin: 80, hips: [0, 0.82, 0.05] }],
    [66, B],
  ]);
  // ---- C4 Drone Strafe: whistle the drone up (10), point the mic down the lane and hold (16–44), jab on the burst (46)
  const POINT = (z, e) => THRUST(z, { chest: [6, -20, 0], hipsR: [0, -25, 0], lfree: 1, armL: [-80, 0, 20, 10], ...e });
  C.c4 = clipF('c4', [
    [0, B],
    [10, { spear: pole([0.1, 1.5, 0.0], 0, 80), chest: [-6, 10, 0], head: [-14, 0, 0], hipsR: [0, 0, 0], lfree: 1, armL: [-160, 0, 20, 20] }],
    [16, POINT(0.6, { fL: lead('c4', 16, 0.25) }), 'snap'],
    [44, POINT(0.62)],
    [46, POINT(0.85, { hips: [0, 0.8, 0.14] }), 'snap'],
    [56, POINT(0.8)],
    [66, B],
  ]);
  // ---- C5 Bass Drop: raise (14), smash (24), hold, wave at 36
  C.c5 = clipF('c5', [
    [0, B],
    [14, { ...OVER, spear: pole([0.02, 1.72, 0.2], 0, 92), hips: [0, 0.95, 0] }],
    [20, { ...OVER, spear: pole([0.02, 1.76, 0.22], 0, 94), hips: [0, 0.96, 0] }],
    [24, { ...DOWN(0.6, -34), chest: [24, 0, 0], hips: [0, 0.74, 0.1], fL: lead('c5', 24, 0.3, 0.24, 18) }, 'snap'],
    [40, { ...DOWN(0.6, -36), chest: [26, 0, 0], hips: [0, 0.72, 0.1] }],
    [60, { ...DOWN(0.6, -34), chest: [20, 0, 0], hips: [0, 0.76, 0.08] }],
    [76, B],
  ]);
  // ---- C6 Encore: full spin ×3, then the knock-back
  C.c6 = clipF('c6', [
    [0, B],
    [8, { ...out(-100, 0, -40), hips: [0, 0.84, 0] }],
    [12, { ...out(90, -4, 0), spin: 0, hips: [0, 0.8, 0.04] }, 'lin'],
    [52, { ...out(90, -4, 0), spin: -1080, hips: [0, 0.8, 0.04] }, 'lin'],
    [57, { ...OVER, spin: -1080, hips: [0, 0.94, 0] }, 'out'],
    [60, { ...DOWN(0.6, -30), spin: -1080 }, 'snap'],
    [76, { ...DOWN(0.6, -30), spin: -1080 }],
    [92, { spin: -1080 }],
  ]);
  // ---- dash: running carry, low sweep (contact 18)
  C.dash = clipF('dash', [
    [0, { spear: pole([-0.15, 1.0, 0.3], -20, -20), chest: [12, -10, 0], hips: [0, 0.86, 0.06] }],
    [12, { ...out(-120, -4, -45), hips: [0, 0.84, 0.05] }],
    [18, { ...out(90, -10, 40), hips: [0, 0.8, 0.08], fL: lead('dash', 18, 0.35) }, 'snap'],
    [32, { ...out(100, -8, 40), hips: [0, 0.82, 0.08] }],
    [56, B],
  ]);
  // ---- jump attack: tucked, a swipe
  const AIR = { fL: [0.16, 0.36, 0.2, -20, 10], fR: [-0.18, 0.3, -0.12, 20, -20] };
  C.jatk = clip([
    [0, P({ hips: [0, 0.95, 0], footL: AIR.fL, footR: AIR.fR, spear: pole([-0.2, 1.3, 0], -60, 30) }, AD)],
    [6 / 24, P({ ...out(-110, 10, -40), hips: [0, 0.98, 0], footL: AIR.fL, footR: AIR.fR }, AD), 'out'],
    [10 / 24, P({ ...out(80, -20, 35), hips: [0, 0.95, 0.04], footL: AIR.fL, footR: AIR.fR }, AD), 'snap'],
    [1, P({ ...out(60, -15, 25), hips: [0, 0.95, 0.04], footL: AIR.fL, footR: AIR.fR }, AD)],
  ]);
  // ---- jump charge (Mic Drop): stand overhead at the apex, plunge, slam the floor
  const Lj = MOVES.jc.landFrame, Fj = MOVES.jc.frames, Dj = MOVES.jc.plunge[0];
  const hang = { ...OVER, hips: [0, 1.0, 0.04], footL: [0.16, 0.5, 0.14, -30, 10], footR: [-0.18, 0.42, -0.12, 20, -20] };
  const slam = { spear: pole([0, 0.95, 0.6], 0, -40, 0, 0.5), chest: [22, 0, 0], hips: [0, 0.62, 0.16], hipsR: [0, 0, 0],
    footL: [0.3, 0.08, 0.5, 0, 25], footR: [-0.3, 0.08, -0.3, 0, -50] };
  C.jc = clip([
    [0, P({ hips: [0, 0.95, 0], footL: AIR.fL, footR: AIR.fR }, AD)],
    [5 / Fj, P(hang, AD), 'out'],
    [(Dj - 1) / Fj, P(hang, AD)],
    [(Lj - 1) / Fj, P({ ...hang, spear: pole([0, 1.3, 0.4], 0, -20), chest: [10, 0, 0] }, AD), 'in'],
    [Lj / Fj, P(slam, AD), 'snap'],
    [(Lj + 8) / Fj, P(slam, AD)],
    [MOVES.jc.cancel / Fj, P({ ...slam, hips: [0, 0.72, 0.1] }, AD), 'io'],
    [1, P({}, AD)],
  ], false, true);
  return C;
}

// ---------------------------------------------------------------- Overclock: SONIC BOOM (210 frames)
// 0 raise the mic (cut-in) · 30 / 60 / 90 three screams, each ring wider · 112–150 he points: the drone strafes the lane
// ahead · 180 the mic drop: the stand slammed into the floor, the bass ring
const MF = 210;
const mk = (f, spec, e) => [f / MF, P(spec, AD), e];
const FEET = { footL: [0.24, 0.08, 0.14, 0, 20], footR: [-0.24, 0.08, -0.14, 0, -20] };
export const MUSOU_FRAMES = MF;
export const MUSOU_CLIPS = {
  mu_adam: clip([
    mk(0, {}),
    mk(24, { spear: pole([0, 1.55, 0.1], 0, 80), chest: [-10, 0, 0], head: [-10, 0, 0], hipsR: [0, 0, 0], ...FEET }),
    mk(30, SING(24, FEET), 'snap'), mk(44, SING(10, FEET)),
    mk(60, SING(28, FEET), 'snap'), mk(74, SING(10, FEET)),
    mk(90, SING(32, FEET), 'snap'), mk(106, SING(6, FEET)),
    mk(116, THRUST(0.7, { chest: [6, -20, 0], hipsR: [0, -25, 0], lfree: 1, armL: [-80, 0, 20, 10], ...FEET }), 'snap'),
    mk(150, THRUST(0.72, { chest: [6, -20, 0], hipsR: [0, -25, 0], lfree: 1, armL: [-80, 0, 20, 10], ...FEET })),
    mk(170, { ...OVER, spear: pole([0.02, 1.76, 0.2], 0, 94), hips: [0, 0.97, 0], ...FEET }),
    mk(180, { ...DOWN(0.6, -36), chest: [26, 0, 0], hips: [0, 0.7, 0.12], ...FEET }, 'snap'),
    mk(198, { ...DOWN(0.6, -34), chest: [22, 0, 0], hips: [0, 0.74, 0.1], ...FEET }),
    mk(210, {}),
  ], false, true),
};

export const ADAM_CLIPS = { ...LOCO_CLIPS, ...attacks(), ...MUSOU_CLIPS };
export { runPose, rollPose };
