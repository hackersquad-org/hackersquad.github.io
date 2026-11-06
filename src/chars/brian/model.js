// Voxel Brian on the shared rig: a broad man in a navy baseball cap and a blue T-shirt, cargo trousers and work boots, a
// day's stubble. Weapons (dual-wield rig): right = a warehouse cart (weapon joint: origin = the middle of its handle, the
// basket rolls ahead of it on four wheels 1 m under the handle; loaded with an old monitor and a server box), left = his
// camera (weaponL: body, lens along +Z, a flash unit on top).
import { vox } from '../../hero/model.js';
import { hash01 } from '../../core/rng.js';
import { outfit } from '../shared/outfit.js';
import { B, Pt, both, hex, fighterMaterial, buildBody } from '../shared/body.js';
import { createChains } from '../shared/chains.js';

export const BC = {
  tee: hex('#2a6fd0'), teeD: hex('#1f56a6'), cargo: hex('#6a6450'), cargoD: hex('#524d3c'), boot: hex('#5a3a22'), sole: hex('#2a1c12'),
  skin: hex('#e0ac82'), hair: hex('#2a1c14'), stubble: hex('#a8846a'), cap: hex('#1f2f52'), capD: hex('#16223c'), eye: 0x1a1214, lip: 0xa86a58,
  steel: hex('#b8bec6'), steelD: hex('#7a828c'), rubber: hex('#15161a'), cam: hex('#1c1d22'), glass: hex('#4a6a8a'), crt: hex('#c8c0a8'),
};

export function head() {
  return [
    B([-3, 1, -3], [4, 10, 3], BC.skin),                              // skull
    B([-3, 0, 2], [4, 8, 4], BC.skin),                                // face
    ...both(Pt([-2, 5, 3], [-1, 7, 4], BC.eye)),                      // eyes
    ...both(Pt([-3, 7, 3], [-1, 8, 4], BC.hair)),                     // heavy brows
    Pt([-3, 0, 3], [4, 3, 4], BC.stubble), Pt([-3, 0, 2], [4, 2, 3], BC.stubble),        // stubble over the jaw
    Pt([0, 2, 3], [2, 3, 4], BC.lip),                                 // mouth
    B([-4, 3, -4], [5, 10, 0], BC.hair),                              // short hair at the back and sides
    ...both(B([-4, 4, 0], [-3, 8, 2], BC.hair)),                      // sideburns
    // baseball cap: crown, button, the peak forward over the brow
    B([-4, 9, -5], [5, 13, 4], (x, y, z) => (x === 0 ? BC.capD : BC.cap)), B([-3, 13, -4], [4, 14, 3], BC.cap), B([0, 14, -1], [1, 15, 0], BC.capD),
    B([-4, 9, 4], [5, 10, 9], BC.capD), B([-3, 9, 9], [4, 10, 10], BC.capD),
  ];
}

// ---------------------------------------------------------------- the cart (weapon space: origin = the handle, +Z = ahead)
const CV = 0.025;
function cartGeo() {
  const wire = (x, y, z) => ((z % 4 === 0 || y % 4 === 0 || x % 6 === 0) ? BC.steel : null);
  return vox([
    B([-10, -1, -1], [10, 1, 1], (x) => (Math.abs(x + 0.5) < 5 ? BC.rubber : BC.steelD)),                  // handle bar, rubber grip
    ...[-10, 9].map((x) => B([x, -34, 0], [x + 1, 1, 2], BC.steelD)),                                       // handle posts
    // basket: wire walls, a solid floor
    B([-9, -27, 4], [-8, -8, 40], wire), B([8, -27, 4], [9, -8, 40], wire), B([-9, -27, 4], [9, -8, 5], wire), B([-9, -27, 39], [9, -8, 40], wire),
    B([-9, -9, 4], [9, -8, 40], (x, y, z) => (x === -9 || x === 8 || z === 4 || z === 39 ? BC.steelD : null)),   // top rim
    B([-9, -28, 4], [9, -27, 40], (x, y, z) => ((x + z) % 2 ? BC.steelD : BC.steel)),
    // chassis + wheels (the wheels' tread is 1 m under the handle)
    B([-9, -34, 2], [-7, -32, 40], BC.steelD), B([7, -34, 2], [9, -32, 40], BC.steelD), B([-9, -34, 20], [9, -32, 22], BC.steelD),
    ...[[-9, 4], [6, 4], [-9, 34], [6, 34]].map(([x, z]) => B([x, -40, z], [x + 3, -34, z + 6], (xx, y, zz) => (y === -40 || y === -35 || zz === z || zz === z + 5 ? BC.rubber : 0x3a3f46))),
    // the load: an old CRT monitor, a server box with its lights on, a coil of cable
    B([-7, -27, 8], [3, -15, 20], BC.crt), Pt([-6, -25, 8], [2, -17, 9], 0x1a2a2a), Pt([-5, -24, 8], [-1, -22, 9], 0x46ff8a),
    B([-6, -27, 23], [7, -19, 37], 0x23262d), Pt([-5, -22, 23], [6, -21, 24], 0x38e8ff), Pt([-5, -25, 23], [-3, -24, 24], 0xff3a3a),
    B([3, -27, 9], [8, -24, 19], (x, y, z) => (hash01(x, y, z) < 0.3 ? null : 0x15161a)),
  ], CV, { jitter: 0.04, ao: 0.3 });
}
function cameraGeo() {
  return vox([
    B([-6, -4, -3], [6, 4, 3], BC.cam), Pt([-6, 2, -3], [6, 3, 3], 0x3a3d46),                                // body, a trim line
    B([-2, 4, -2], [3, 7, 2], BC.cam), Pt([-2, 4, 1], [3, 7, 2], 0xf4f4f0),                                  // flash unit
    B([-3, -3, 3], [3, 3, 9], (x, y, z) => (z % 3 === 0 ? 0x2e3038 : BC.cam)),                               // lens barrel
    Pt([-2, -2, 8], [2, 2, 9], BC.glass), Pt([-1, 0, 8], [0, 1, 9], 0xdff4ff),                                // glass + a catch-light
    B([4, -5, -1], [6, -4, 1], 0xd0402a),                                                                    // strap lug
  ], 0.015, { jitter: 0.03, ao: 0.2 });
}
/** Trail anchors (m along the cart's axis): the basket, handle to nose. */
export const CART = { tip: 1.0, base: 0.2 };

export function createBrianModel(rig) {
  const mat = fighterMaterial();
  const parts = outfit({ top: BC.tee, topD: BC.teeD, short: true, skin: BC.skin, trou: BC.cargo, trouD: BC.cargoD, shoe: BC.boot, sole: BC.sole,
    laces: 0xd8c8a0, hem: 1, belt: 0x2a1c12, slim: 1.08 });
  for (const s of ['R', 'L']) parts['thigh' + s].push(B([3, -12, -2], [5, -6, 3], BC.cargoD));                 // cargo pockets
  const { meshes, add } = buildBody(rig, mat, parts, head());
  const wm = fighterMaterial({ roughness: 0.4, metalness: 0.35 }, 0.3, 0.7);
  add(rig.joints.weapon, cartGeo(), 'cart', wm);
  add(rig.joints.weaponL, cameraGeo(), 'camera', wm);
  return { meshes, material: mat };
}

// ---------------------------------------------------------------- secondary: the camera strap swinging under it
const strapSeg = () => vox([B([-1, -5, 0], [1, 0, 1], 0xd0402a)], 0.02, { off: [0, 0, -0.5], jitter: 0.03, ao: 0.1 });
export function createBrianSecondary(scene, rig, mat) {
  const chains = createChains(scene, rig, mat);
  chains.add(rig.joints.weaponL, { anchor: [0.08, -0.06, 0], rest: [0, -1, 0], n: 3, len: 0.09, stiff: 0.06, drag: 0.1, wind: 0.6, cone: 120, sway: 0.1, seg: strapSeg });
  return { reset() { chains.reset(); }, update(dt) { chains.update(dt); } };
}
