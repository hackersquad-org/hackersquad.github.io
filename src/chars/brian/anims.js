// Brian's clips: attack clips per move id (./moves.js) through the shared clip kit (planted, baked feet), the Overclock
// clip, and the engine's locomotion with his own carry (the cart pushed ahead of him, the camera at his chest).
// Dual wield: the cart is the weapon joint (spear channel: origin = the middle of its handle, +Z = the way it rolls; its
// wheels hang 1 m under the handle, so a level cart with the handle at y 1.0 stands on the floor), the camera the second
// weapon joint (spearL channel, +Z = the lens) with dual = 1 (the left fist on it).
// A channel = [x, y, z (grip, root space), yaw (0 fwd, + left), elev (+ up), roll].
import { P, clip, STANCE } from '../../hero/rig.js';
import { createClipKit } from '../shared/clipkit.js';
import { carry } from '../shared/loco.js';
import { lungeAt } from '../../hero/moveset.js';
import { MOVES } from './moves.js';

const R = Math.PI / 180;
const CAM = [0.3, 1.14, 0.16, 12, -8, 0];                             // the camera at rest: chest high on his left
const HOLD = { spear: [-0.1, 1.0, 0.32, 0, 0, 0], spearL: CAM, dual: 1, gripR: 0, gripL: 0 };
export const BR = { ...STANCE, ...HOLD, hipsR: [0, -8, 0], chest: [8, 4, 0], hips: [0, 0.88, 0] };
const ENTRY = { n2: 'n1', n3: 'n2', n4: 'n3', n5: 'n4', n6: 'n5', c2: 'n1', c3: 'n2', c4: 'n3', c5: 'n4', c6: 'n5' };
const { clipF } = createClipKit(MOVES, ENTRY, BR);
const L = (id, f) => lungeAt(MOVES[id], f);
const lead = (id, f, z = 0.2, x = 0.2, yaw = 12) => [x, 0.08, 0.3 + z + L(id, f), 0, yaw];

/** The cart level in front of him, handle `z` m ahead (a shove when z is large), nose lifted `elev`°. */
const push = (z, elev = 0, e) => ({ spear: [-0.08, 1.0 + Math.max(0, elev) * 0.004, z, 0, elev, 0], chest: [10 + z * 12, 0, 0], hipsR: [0, 0, 0], hips: [0, 0.86, 0.04 + z * 0.1], ...e });
/** The cart swung out at heading `yaw` (° off his facing, + = left), lifted clear of the floor, body twisted `tw`°. */
const out = (yaw, elev = 6, tw = yaw * 0.4, e) => ({
  spear: [Math.sin(yaw * R) * 0.36, 1.14, 0.05 + Math.cos(yaw * R) * 0.36, yaw, elev, 0],
  chest: [6, tw, 0], hipsR: [0, tw * 0.8, 0], spine: [6, tw * 0.3, 0], ...e });
const OVER = { spear: [0, 1.5, 0.12, 0, 78, 0], chest: [-12, 0, 0], head: [-8, 0, 0], hipsR: [0, 0, 0], hips: [0, 0.92, 0] };
const DOWN = (z = 0.5, elev = -24) => ({ spear: [0, 0.98, z, 0, elev, 0], chest: [24, 0, 0], hips: [0, 0.76, 0.1], hipsR: [0, 0, 0] });
/** The camera up at his eye, aimed `yaw`° off his facing. */
const SHOOT = (yaw = 0, e) => ({ spearL: [0.1 + Math.sin(yaw * R) * 0.1, 1.55, 0.3, yaw, 0, 0], head: [4, yaw * 0.5, 0], chest: [4, -14 + yaw * 0.3, 0], hipsR: [0, -12, 0],
  spear: [-0.3, 1.0, 0.18, -14, 0, 0], ...e });
const B = {};                                     // = BR (a key with no overrides)

function attacks() {
  const C = {};
  // ---- N1 shove: pull the cart in, drive it out (contact 12)
  C.n1 = clipF('n1', [
    [0, B],
    [7, push(0.16, 0, { chest: [2, 0, 0], hips: [0, 0.88, -0.04] })],
    [12, push(0.62, 0, { fL: lead('n1', 12, 0.3, 0.18, 10) }), 'snap'],
    [20, push(0.58)],
    [32, B],
  ]);
  // ---- N2 swing: heave right, swing right → left (contact 13)
  C.n2 = clipF('n2', [
    [0, B],
    [9, { ...out(-100, 4, -45), spine: [4, -15, 0] }],
    [15, { ...out(60, 8, 30), spin: 20, fR: [-0.22, 0.08, -0.2 + L('n2', 15), 0, -40] }, 'snap'],
    [24, { ...out(100, 6, 45), spin: 30 }],
    [36, B],
  ]);
  // ---- N3 flash: camera to the eye (8), the flash (10), hold the frame
  C.n3 = clipF('n3', [
    [0, B],
    [8, SHOOT(0, { fL: lead('n3', 8, 0.15) })],
    [10, SHOOT(0, { chest: [8, -14, 0], hips: [0, 0.86, 0.04] }), 'snap'],
    [18, SHOOT(0)],
    [30, B],
  ]);
  // ---- N4 back swing left → right (contact 14)
  C.n4 = clipF('n4', [
    [0, B],
    [9, { ...out(110, 4, 45), hips: [0, 0.86, 0] }],
    [16, { ...out(-60, 8, -30), spin: -20, fL: lead('n4', 16, 0.25) }, 'snap'],
    [26, { ...out(-100, 6, -42), spin: -30 }],
    [38, B],
  ]);
  // ---- N5 ram: two steps behind the cart (contact 13)
  C.n5 = clipF('n5', [
    [0, B],
    [6, push(0.2, 0, { hips: [0, 0.86, -0.02] })],
    [13, push(0.66, 2, { fL: lead('n5', 13, 0.35) }), 'snap'],
    [22, push(0.6)],
    [38, B],
  ]);
  // ---- N6 full spin, the cart at arm's length (contact 16)
  C.n6 = clipF('n6', [
    [0, B],
    [9, { ...out(-100, 4, -40), hips: [0, 0.84, 0] }],
    [16, { ...out(90, 8, 0), spin: 0, hips: [0, 0.8, 0.04] }, 'lin'],
    [24, { ...out(90, 8, 0), spin: -360, hips: [0, 0.78, 0.06] }, 'lin'],
    [36, { ...out(70, 2, 20), spin: -360, hips: [0, 0.76, 0.06], chest: [16, 20, 0] }, 'out'],
    [54, { spin: -360 }],
  ]);
  // ---- C1 Cart Surf: run-up (0–12), hop on (14: both feet up on the chassis), ride (16–44), drift spin off it (48)
  const ride = (f, e) => ({ spear: [-0.04, 1.04, 0.3, 0, 0, 0], chest: [18, 0, 0], hips: [0, 0.98, 0.1], hipsR: [0, 0, 0],
    fL: [0.14, 0.34, 0.5 + L('c1', f), -10, 10], fR: [-0.14, 0.34, 0.42 + L('c1', f), -10, -10], ...e });
  C.c1 = clipF('c1', [
    [0, B],
    [10, push(0.2, 0, { hips: [0, 0.8, -0.04], chest: [16, 0, 0] })],
    [16, ride(16), 'snap'],
    [30, ride(30, { chest: [22, 0, 0], spearL: [0.34, 1.5, 0.0, 40, 30, 0] })],
    [44, ride(44)],
    [50, { ...out(90, 8, 20), spin: -360, hips: [0, 0.8, 0.06] }, 'snap'],
    [60, { ...out(80, 2, 20), spin: -360, hips: [0, 0.82, 0.05] }],
    [70, { spin: -360 }],
  ]);
  // ---- C2 Tip-Up: crouch behind the handle, rip the nose up (contact 16)
  C.c2 = clipF('c2', [
    [0, B],
    [9, { spear: [-0.06, 0.92, 0.34, 0, -6, 0], chest: [22, 0, 0], hips: [0, 0.74, 0.04], hipsR: [0, 0, 0] }],
    [12, { spear: [-0.06, 0.9, 0.36, 0, -8, 0], chest: [24, 0, 0], hips: [0, 0.72, 0.05], hipsR: [0, 0, 0], fL: lead('c2', 12, 0.3) }],
    [17, { spear: [-0.04, 1.34, 0.34, 0, 62, 0], chest: [-12, 0, 0], head: [-10, 0, 0], hips: [0, 0.95, 0.05], hipsR: [0, 0, 0] }, 'snap'],
    [34, { spear: [-0.04, 1.36, 0.32, 0, 66, 0], chest: [-10, 0, 0], head: [-8, 0, 0], hips: [0, 0.93, 0.05], hipsR: [0, 0, 0] }],
    [62, B],
  ]);
  // ---- C3 wide 270° sweep (window 19–29)
  C.c3 = clipF('c3', [
    [0, B],
    [11, { ...out(-150, 4, -55), hips: [0, 0.84, 0] }],
    [17, { ...out(-150, 2, -58), hips: [0, 0.82, 0.02], fL: lead('c3', 17, 0.35, 0.26, 20) }],
    [29, { ...out(40, 8, 30), spin: 60, hips: [0, 0.8, 0.06] }, 'lin'],
    [35, { ...out(60, 6, 36), spin: 80, hips: [0, 0.8, 0.06] }, 'out'],
    [52, { ...out(60, 2, 30), spin: 80, hips: [0, 0.82, 0.05] }],
    [68, B],
  ]);
  // ---- C4 Burst Mode: the camera at his eye, panning across the lane as it fires (16–40), the big one (44)
  C.c4 = clipF('c4', [
    [0, B],
    [12, SHOOT(-25, { fL: lead('c4', 12, 0.2, 0.24, 15), hips: [0, 0.84, 0.02] })],
    [28, SHOOT(25, { hips: [0, 0.84, 0.02] }), 'lin'],
    [40, SHOOT(-10, { hips: [0, 0.84, 0.02] }), 'lin'],
    [44, SHOOT(0, { hips: [0, 0.8, 0.1], chest: [14, -14, 0], spearL: [0.1, 1.5, 0.42, 0, 0, 0] }), 'snap'],
    [54, SHOOT(0, { hips: [0, 0.82, 0.08], chest: [12, -14, 0] })],
    [64, B],
  ]);
  // ---- C5 Unload: heave it overhead (15), bring it down (25), hold, wave at 37
  C.c5 = clipF('c5', [
    [0, B],
    [15, { ...OVER }],
    [21, { ...OVER, spear: [0, 1.54, 0.14, 0, 82, 0], hips: [0, 0.94, 0] }],
    [25, { ...DOWN(0.55, -26), fL: lead('c5', 25, 0.3, 0.24, 18) }, 'snap'],
    [41, { ...DOWN(0.55, -28), chest: [26, 0, 0], hips: [0, 0.72, 0.1] }],
    [62, { ...DOWN(0.5, -20), chest: [20, 0, 0], hips: [0, 0.78, 0.08] }],
    [78, B],
  ]);
  // ---- C6 Demolition Derby: full spin ×3, then the knock-back
  C.c6 = clipF('c6', [
    [0, B],
    [8, { ...out(-100, 4, -40), hips: [0, 0.84, 0] }],
    [12, { ...out(90, 8, 0), spin: 0, hips: [0, 0.8, 0.04] }, 'lin'],
    [52, { ...out(90, 8, 0), spin: -1080, hips: [0, 0.8, 0.04] }, 'lin'],
    [57, { ...OVER, spin: -1080 }, 'out'],
    [60, { ...DOWN(0.55, -26), spin: -1080 }, 'snap'],
    [78, { ...DOWN(0.55, -26), spin: -1080 }],
    [94, { spin: -1080 }],
  ]);
  // ---- dash: head down behind the cart
  C.dash = clipF('dash', [
    [0, push(0.3, 0, { chest: [20, 0, 0], hips: [0, 0.82, 0.06] })],
    [14, push(0.6, 2, { chest: [26, 0, 0], hips: [0, 0.78, 0.1], fL: lead('dash', 14, 0.35) }), 'snap'],
    [30, push(0.55, 0, { chest: [22, 0, 0] })],
    [56, B],
  ]);
  // ---- jump attack: the cart swung through the air
  const AIR = { fL: [0.16, 0.36, 0.2, -20, 10], fR: [-0.18, 0.3, -0.12, 20, -20] };
  C.jatk = clip([
    [0, P({ hips: [0, 0.95, 0], footL: AIR.fL, footR: AIR.fR, ...out(-60, 20, -20) }, BR)],
    [7 / 26, P({ ...out(-110, 14, -40), hips: [0, 0.98, 0], footL: AIR.fL, footR: AIR.fR }, BR), 'out'],
    [11 / 26, P({ ...out(80, -10, 35), hips: [0, 0.95, 0.04], footL: AIR.fL, footR: AIR.fR }, BR), 'snap'],
    [1, P({ ...out(60, -6, 25), hips: [0, 0.95, 0.04], footL: AIR.fL, footR: AIR.fR }, BR)],
  ]);
  // ---- jump charge: the cart overhead at the apex, plunge, slam the floor
  const Lj = MOVES.jc.landFrame, Fj = MOVES.jc.frames, Dj = MOVES.jc.plunge[0];
  const hang = { ...OVER, hips: [0, 1.0, 0.04], footL: [0.16, 0.5, 0.14, -30, 10], footR: [-0.18, 0.42, -0.12, 20, -20] };
  const slam = { ...DOWN(0.55, -26), hips: [0, 0.62, 0.16], footL: [0.3, 0.08, 0.5, 0, 25], footR: [-0.3, 0.08, -0.3, 0, -50] };
  C.jc = clip([
    [0, P({ hips: [0, 0.95, 0], footL: AIR.fL, footR: AIR.fR }, BR)],
    [5 / Fj, P(hang, BR), 'out'],
    [(Dj - 1) / Fj, P(hang, BR)],
    [(Lj - 1) / Fj, P({ ...hang, spear: [0, 1.2, 0.4, 0, -10, 0], chest: [10, 0, 0] }, BR), 'in'],
    [Lj / Fj, P(slam, BR), 'snap'],
    [(Lj + 8) / Fj, P(slam, BR)],
    [MOVES.jc.cancel / Fj, P({ ...slam, hips: [0, 0.72, 0.1] }, BR), 'io'],
    [1, P({}, BR)],
  ], false, true);
  return C;
}

// ---------------------------------------------------------------- Overclock: RUSH HOUR (210 frames)
// 0 the camera raised (cut-in) · 30 / 55 / 80 three blinding flashes, each wider · 104 hops on the cart · 110–150 rides it
// 10 m through the crowd · 180 the cart heaved up and unloaded on the floor: the shock ring
const MF = 210;
const mk = (f, spec, e) => [f / MF, P(spec, BR), e];
const FEET = { footL: [0.24, 0.08, 0.14, 0, 20], footR: [-0.24, 0.08, -0.14, 0, -20] };
const UPF = { footL: [0.14, 0.34, 0.5, -10, 10], footR: [-0.14, 0.34, 0.42, -10, -10] };
export const MUSOU_FRAMES = MF;
export const MUSOU_CLIPS = {
  mu_brian: clip([
    mk(0, {}),
    mk(24, SHOOT(0, { spearL: [0.2, 1.8, 0.1, 0, 50, 0], chest: [-8, -10, 0], head: [-8, 0, 0], ...FEET })),
    mk(30, SHOOT(-30, FEET), 'snap'), mk(48, SHOOT(-20, FEET)),
    mk(55, SHOOT(30, FEET), 'snap'), mk(72, SHOOT(20, FEET)),
    mk(80, SHOOT(0, { hips: [0, 0.8, 0.1], chest: [14, -14, 0], ...FEET }), 'snap'), mk(96, SHOOT(0, FEET)),
    mk(104, push(0.2, 0, { hips: [0, 0.8, -0.04], chest: [16, 0, 0], ...FEET })),
    mk(110, { spear: [-0.04, 1.04, 0.3, 0, 0, 0], chest: [20, 0, 0], hips: [0, 0.98, 0.1], hipsR: [0, 0, 0], ...UPF }, 'snap'),
    mk(150, { spear: [-0.04, 1.04, 0.3, 0, 0, 0], chest: [24, 0, 0], hips: [0, 0.98, 0.1], hipsR: [0, 0, 0], spearL: [0.34, 1.5, 0.0, 40, 30, 0], ...UPF }),
    mk(160, { ...push(0.3), ...FEET }),
    mk(172, { ...OVER, spear: [0, 1.54, 0.14, 0, 82, 0], ...FEET }),
    mk(180, { ...DOWN(0.55, -26), chest: [26, 0, 0], hips: [0, 0.7, 0.12], ...FEET }, 'snap'),
    mk(198, { ...DOWN(0.55, -24), chest: [22, 0, 0], hips: [0, 0.74, 0.1], ...FEET }),
    mk(210, {}),
  ], false, true),
};

const LOCO = carry({ stance: HOLD, run: { ...HOLD, spear: [-0.06, 1.0, 0.4, 0, 0, 0] }, bob: 0.012 });
export const BRIAN_CLIPS = { ...LOCO.clips, ...attacks(), ...MUSOU_CLIPS };
export const runPose = LOCO.runPose, rollPose = LOCO.rollPose;
