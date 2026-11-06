// Voxel Adam on the shared rig: a boy in a black T-shirt and blue jeans, white trainers, messy brown hair under a pair of
// studio headphones. Weapon: a microphone on its stand (weapon joint: 1.6 m, weighted round base at the butt end, the mic
// with a lit ring at the tip). His drone is a render-only companion (createAdamSecondary): it hovers over his left
// shoulder, flies ahead on the moves listed in ./moves.js DRONE_MOVES and rakes the floor with its laser on Drone Strafe
// and during the Overclock.
import * as THREE from 'three';
import { vox } from '../../hero/model.js';
import { boxesGeometry, shade } from '../../core/voxel.js';
import { hash01 } from '../../core/rng.js';
import { ground } from '../../world/map.js';
import { outfit } from '../shared/outfit.js';
import { B, Pt, both, hex, fighterMaterial, buildBody } from '../shared/body.js';
import { createChains } from '../shared/chains.js';
import { DRONE_MOVES } from './moves.js';
import { MUSOU_FRAMES } from './anims.js';

export const AC = {
  tee: hex('#17171b'), teeD: hex('#0d0d10'), jeans: hex('#2f4f86'), jeansD: hex('#223a66'), shoe: hex('#f2f2f2'), sole: hex('#d0402a'),
  skin: hex('#f1c9a5'), hair: hex('#5a3a22'), hairH: hex('#7a5230'), phones: hex('#1a1c22'), led: hex('#38e8ff'), eye: 0x1a1214, lip: 0xb8705e,
  chrome: hex('#aeb6c0'), chromeD: hex('#6a727c'), mic: hex('#15161a'),
};

export function head() {
  const hair = (x, y, z) => (hash01(x, y, z) < 0.25 ? AC.hairH : AC.hair);
  return [
    B([-3, 1, -3], [4, 10, 3], AC.skin),                              // skull
    B([-3, 0, 2], [4, 8, 4], AC.skin),                                // face
    ...both(Pt([-2, 5, 3], [-1, 7, 4], AC.eye)),                      // eyes (the face's front layer is z 3)
    ...both(Pt([-3, 7, 3], [-1, 8, 4], AC.hair)),                     // brows
    Pt([0, 2, 3], [2, 3, 4], AC.lip),                                 // mouth: a half grin
    B([-4, 5, -4], [5, 12, 1], hair),                                 // hair: back, sides, crown
    B([-4, 10, -4], [5, 13, 4], hair),                                // top
    B([-4, 9, 3], [5, 12, 5], (x, y, z) => (y === 9 && (x + 8) % 3 === 0 ? null : hair(x, y, z))),   // spiky fringe
    B([-2, 13, -3], [1, 14, 1], hair), B([2, 13, -2], [4, 14, 2], hair),                 // tufts
    ...both(B([-4, 4, 0], [-3, 9, 2], hair)),                         // sideburns
    // headphones: band over the crown, two cups with a lit ring
    B([-5, 13, -1], [6, 14, 1], AC.phones), ...both(B([-5, 9, -1], [-4, 14, 1], AC.phones)),
    ...both(B([-6, 4, -2], [-4, 9, 3], AC.phones)), ...both(Pt([-6, 5, -1], [-5, 8, 2], AC.led)),
  ];
}

/** The mic on its stand: weighted base, chrome shaft with a clutch collar, the mic with a lit ring. */
function standGeo() {
  return vox([
    B([-7, -7, -33], [7, 7, -30], (x, y) => (Math.hypot(x + 0.5, y + 0.5) > 7 ? null : Math.hypot(x + 0.5, y + 0.5) > 5.5 ? AC.chromeD : AC.mic)),   // base
    B([-1, -1, -30], [1, 1, 68], (x, y, z) => ((z + 30) % 24 < 1 ? AC.chromeD : AC.chrome)),
    B([-2, -2, 18], [2, 2, 22], AC.mic),                              // clutch collar
    B([-2, -2, 66], [2, 2, 76], AC.mic),                              // mic body
    B([-2, -2, 74], [2, 2, 75], AC.led),
    B([-3, -3, 76], [3, 3, 82], (x, y, z) => (Math.hypot(x + 0.5, y + 0.5, z - 79) > 3.4 ? null : (x + y + z) % 2 ? shade(AC.chrome, 0.8) : AC.chrome)),   // grille
  ], 0.02, { jitter: 0.04, ao: 0.3 });
}
/** Mic in weapon space (m): trail + VFX anchor. */
export const MIC = { tip: 1.6, butt: -0.62 };

export function createAdamModel(rig) {
  const mat = fighterMaterial({}, 0.3, 0.55);                          // a low rim: the black tee stays black
  const parts = outfit({ top: AC.tee, topD: AC.teeD, short: true, skin: AC.skin, trou: AC.jeans, trouD: AC.jeansD, shoe: AC.shoe, sole: AC.sole,
    laces: 0xffffff, hem: 1, belt: 0x2a2a2e, slim: 0.95 });
  // a small equaliser print on the chest (five bars, no logo)
  parts.chest.push(...[[-4, 3], [-2, 5], [0, 4], [2, 6], [4, 3]].map(([x, h]) => Pt([x, 2, 4], [x + 1, 2 + h, 5], AC.led)));
  const { meshes, add } = buildBody(rig, mat, parts, head());
  add(rig.joints.weapon, standGeo(), 'stand', fighterMaterial({ roughness: 0.4, metalness: 0.4 }, 0.3, 0.7));
  return { meshes, material: mat };
}

// ---------------------------------------------------------------- the drone (render-only)
const bx = (s, p, c, r) => ({ s, p, c, r });
function droneParts() {
  const body = [bx([0.26, 0.07, 0.3], [0, 0, 0], 0x23262d), bx([0.16, 0.06, 0.18], [0, 0.06, -0.02], 0x30343c), bx([0.1, 0.08, 0.1], [0, -0.07, 0.1], 0x15171b)];
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) body.push(bx([0.34, 0.025, 0.04], [sx * 0.2, 0.02, sz * 0.2], 0x3a3f48, [0, sx * sz * 0.785, 0]),
    bx([0.05, 0.07, 0.05], [sx * 0.31, 0.04, sz * 0.31], 0x15171b));
  const lit = [bx([0.05, 0.05, 0.02], [0, -0.07, 0.16], 0xff3a3a), bx([0.27, 0.015, 0.02], [0, 0, 0.16], 0x38e8ff), bx([0.27, 0.015, 0.02], [0, 0, -0.16], 0xff3ea8)];
  return { body: boxesGeometry(body), lit: boxesGeometry(lit), rotor: boxesGeometry([bx([0.3, 0.008, 0.035], [0, 0, 0], 0xcfd6de), bx([0.035, 0.008, 0.3], [0, 0, 0], 0xcfd6de)]) };
}

export function createAdamSecondary(scene, rig, mat, hero) {
  const chains = createChains(scene, rig, mat);
  const G = droneParts(), drone = new THREE.Group();
  const body = new THREE.Mesh(G.body, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.5, metalness: 0.3 }));
  body.castShadow = true;
  const lit = new THREE.Mesh(G.lit, new THREE.MeshBasicMaterial({ vertexColors: true, color: new THREE.Color(2.4, 2.4, 2.4) }));
  const rotorMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.55 });
  const rotors = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => { const m = new THREE.Mesh(G.rotor, rotorMat); m.position.set(sx * 0.31, 0.085, sz * 0.31); drone.add(m); return m; });
  drone.add(body, lit); drone.scale.setScalar(1.35);
  scene.add(drone);
  const beam = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 0.5, 0.5), transparent: true, opacity: 0.9,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  beam.visible = false; beam.frustumCulled = false; scene.add(beam);
  const spot = new THREE.Mesh(new THREE.CircleGeometry(0.5, 20), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 0.8, 0.6), transparent: true, opacity: 0.9,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  spot.rotation.x = -Math.PI / 2; spot.visible = false; scene.add(spot);

  const pos = new THREE.Vector3(), want = new THREE.Vector3(), aim = new THREE.Vector3(), _m = new THREE.Matrix4(), UP = new THREE.Vector3(0, 1, 0);
  let t = 0, init = false, yaw = 0;
  return {
    reset() { chains.reset(); init = false; },
    update(dt) {
      t += dt;
      chains.update(dt);
      const R = rig.root, hx = hero ? hero.x : R.position.x, hz = hero ? hero.z : R.position.z, hy = R.position.y;
      const face = hero ? hero.yaw : R.rotation.y, fx = Math.sin(face), fz = Math.cos(face);
      // where it wants to be: over the left shoulder, or ahead of him on its moves; fire: the laser is on, aimed at `aim`
      let ahead = -0.3, side = 0.62, up = 2.15, fire = false;
      if (hero) {
        const w = hero.state === 'attack' && DRONE_MOVES[hero.move];
        if (w && hero.moveT >= w[0] && hero.moveT <= w[1]) {
          const u = (hero.moveT - w[0]) / (w[1] - w[0]);
          ahead = w[2] * Math.min(1, u * 3); side = 0; up = 2.7;
          if (hero.move === 'c4' && hero.moveT >= 18) { fire = true; const d = 1.5 + 8 * Math.min(1, (hero.moveT - 18) / 26); aim.set(hx + fx * d, 0, hz + fz * d); ahead = Math.max(0.5, d - 2); }
        } else if (hero.state === 'musou') {
          const mt = (hero.musouT || 0) * MUSOU_FRAMES;
          if (mt >= 110 && mt < 156) {
            const d = 1.5 + 11 * Math.min(1, Math.max(0, (mt - 116) / 34));
            fire = mt >= 116 && mt < 152; aim.set(hx + fx * d, 0, hz + fz * d); ahead = Math.max(0.5, d - 2.2); side = 0; up = 3.2;
          } else { up = 3.0; side = 0.9; ahead = -0.6; }
        }
      }
      want.set(hx + fx * ahead + fz * side, hy + up + Math.sin(t * 2.3) * 0.06, hz + fz * ahead - fx * side);
      if (!init || pos.distanceToSquared(want) > 400) { pos.copy(want); init = true; }
      pos.lerp(want, 1 - Math.exp(-dt * (fire ? 14 : 7)));
      let d = face - yaw; d -= Math.round(d / (Math.PI * 2)) * Math.PI * 2; yaw += d * (1 - Math.exp(-dt * 8));
      drone.position.copy(pos);
      drone.rotation.set(0.12 + (fire ? 0.35 : 0), yaw, Math.sin(t * 1.7) * 0.06, 'YXZ');
      rotors.forEach((r, k) => { r.rotation.y = t * (38 + k * 3) * (k % 2 ? 1 : -1); });
      beam.visible = spot.visible = fire;
      if (fire) {
        aim.y = ground(aim.x, aim.z) + 0.05;
        const L = pos.distanceTo(aim), w = 0.07 + 0.03 * Math.sin(t * 40);
        beam.position.copy(pos).lerp(aim, 0.5);
        beam.quaternion.setFromRotationMatrix(_m.lookAt(pos, aim, UP));
        beam.scale.set(w, w, L);
        spot.position.copy(aim); spot.position.y += 0.04; spot.scale.setScalar(1.2 + 0.3 * Math.sin(t * 30));
      }
    },
  };
}
