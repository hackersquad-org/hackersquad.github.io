// The Warehouse's world builder (render-only; registered in the world registry, src/world/world.js). Night shift in a
// logistics warehouse turned tournament arena: three steel halls under one roof — the loading dock (containers, forklifts,
// cyan strip lights), the server aisles (rack rows with blinking LEDs, green strips) and the mainframe core (four pylons,
// the mainframe tower, magenta strips, the scoreboard wall). Two rolling shutters (gates 'shutterA' / 'shutterB') roll up
// when their gate opens. Hanging lamps: the nearest four are real lights.
// Story fx (src/chars/officers/bosses.js → game.story.fx): attack telegraphs (red discs filling up), impact rings,
// travelling shock waves, falling payloads, the blackout. Never writes sim state.
import * as THREE from 'three';
import { GATES, MAP, smooth, TERRAIN as G, PIECE_IDS, node } from '../../map.js';
import { buildGround } from '../../kit/terrain.js';
import { place, merge, propMaterial, bx, container, crate, palletRack, serverRack, forklift, barrel, cableReel, hazardBarrier, pillar,
  truss, hangingLamp, mainframe, shutter, NEON, STEEL, STEEL_D, HAZARD, CONTAINER_COLS } from '../../kit/props.js';
import { hash01 } from '../../../core/rng.js';
import { setSun } from '../../sky.js';
import { shade } from '../../../core/voxel.js';

const SHADOW_BOX = 30, KEY = new THREE.Vector3(-0.35, 0.85, -0.4).normalize();
const WALL_H = 16, LAMP_Y = 9;
// halls: [wall x (half width), z0, z1, strip colour]
const HALLS = [[28, -182, -112, NEON.cyan], [24, -108, -40, NEON.green], [32, -36, 40, NEON.magenta]];
const DOOR_W = 9, DOOR_H = 7;                                       // doorway half width / height
const RING_COL = { slam: [3.0, 0.6, 0.3], bash: [3.0, 1.2, 0.3], shock: [0.5, 2.2, 3.2], spam: [2.6, 0.5, 2.4], payload: [3.0, 0.5, 0.4], clone: [1.6, 0.8, 3.0] };

/** Ribbed steel wall between (x0, z0) and (x1, z1) (axis-aligned), h tall, t thick. */
function wall(out, x0, z0, x1, z1, h = WALL_H, c = 0x3a414b, t = 0.6) {
  const along = Math.abs(x1 - x0) > Math.abs(z1 - z0), L = along ? Math.abs(x1 - x0) : Math.abs(z1 - z0);
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  out.push(bx(along ? [L, h, t] : [t, h, L], [cx, h / 2, cz], c));
  out.push(bx(along ? [L, 1.2, t + 0.1] : [t + 0.1, 1.2, L], [cx, 0.6, cz], shade(c, 0.6)));            // kick band
  const n = Math.max(1, Math.round(L / 4));
  for (let k = 0; k <= n; k++) {
    const u = -L / 2 + k * L / n;
    out.push(bx(along ? [0.3, h, t + 0.3] : [t + 0.3, h, 0.3], along ? [cx + u, h / 2, cz] : [cx, h / 2, cz + u], shade(c, 0.8)));
  }
}

/** Scoreboard canvas: the live K.O. count against the target, redrawn when it changes. */
function scoreboard() {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 160;
  const g = cv.getContext('2d'), tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  let shown = -1;
  const draw = (kos, goal) => {
    if (kos === shown) return;
    shown = kos;
    g.fillStyle = '#03080c'; g.fillRect(0, 0, 512, 160);
    g.strokeStyle = '#1de8ff'; g.lineWidth = 4; g.strokeRect(4, 4, 504, 152);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#46ff8a'; g.font = '700 30px "Courier New", monospace';
    g.fillText('HACKER CHAMPIONSHIP', 256, 34);
    g.fillStyle = kos >= goal ? '#ff3ea8' : '#e8fbff'; g.font = '700 84px "Courier New", monospace';
    g.fillText(`${String(Math.min(kos, 9999)).padStart(4, '0')} / ${goal}`, 256, 104);
    tex.needsUpdate = true;
  };
  draw(0, 1000);
  return { tex, draw };
}

export function buildWarehouse(scene, root) {
  setSun(0.314, 0.5);                                               // the floodlight bank over the far wall
  scene.background = new THREE.Color(0x04060a);
  scene.fog = new THREE.Fog(new THREE.Color(0x0a1018), 45, 170);
  const hemi = new THREE.HemisphereLight(0x9ab4dc, 0x3a3e46, 2.3);
  root.add(hemi);
  const key = new THREE.DirectionalLight(0xd6e4ff, 2.4);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -SHADOW_BOX, right: SHADOW_BOX, top: SHADOW_BOX, bottom: -SHADOW_BOX, near: 1, far: 160 });
  key.shadow.bias = -0.0006; key.shadow.normalBias = 0.03;
  root.add(key, key.target);

  // ---- floor: sealed concrete in big tiles, a painted centre lane, hazard thresholds at the doors, dock bay boxes,
  // dark anti-static tiles in the core
  const CON = 0x4c5159, CON_D = 0x3f444b, LANE = 0xc9a62a, WHITE = 0xb8bcc0, CORE = 0x23272e, CORE_L = 0x2d323a, OUT = 0x07090c;
  buildGround(root, {
    roughness: 0.82, metalness: 0.05, jitter: 0.12,
    colorAt(x, z, y, inside) {
      if (inside < -0.6) return OUT;
      const id = PIECE_IDS[G.own[node(x, z)]], ax = Math.abs(x);
      if (id === 'doorA' || id === 'doorB') return ((Math.floor((x + z + 100) / 1) & 1) ? HAZARD : 0x1a1a1a);
      if (id === 'core') {
        const r = Math.hypot(x, z);
        if (Math.abs(r - 24) < 0.5 || Math.abs(r - 12) < 0.5) return 0x3a5a66;                   // arena circles
        return ((Math.floor(x / 2) + Math.floor(z / 2)) & 1) ? CORE : CORE_L;
      }
      if (Math.abs(ax - 3) < 0.5) return (Math.floor(z / 2) & 1) ? LANE : CON;                     // dashed lane edges
      if (id === 'dock' && ax > 12 && ax < 24 && (Math.abs(((z + 200) % 14) - 7) > 6.5 || Math.abs(ax - 12.5) < 0.5)) return WHITE;   // bay boxes
      return ((Math.floor(x / 4) + Math.floor(z / 4)) & 1) ? CON : CON_D;
    },
  });

  const boxes = [], lit = [], glows = [];
  // ---- shell: side walls per hall, end walls, the two partition walls with their doorways, strip lights, roof
  for (const [w, z0, z1, tint] of HALLS) {
    for (const sx of [-1, 1]) {
      wall(boxes, sx * w, z0, sx * w, z1);
      lit.push(bx([0.12, 0.16, z1 - z0 - 2], [sx * (w - 0.42), 4.2, (z0 + z1) / 2], tint));
      lit.push(bx([0.12, 0.1, z1 - z0 - 2], [sx * (w - 0.42), 9.5, (z0 + z1) / 2], tint));
    }
    // roof trusses and hanging lamps
    for (let z = z0 + 5; z < z1; z += 12) boxes.push(...place(truss(w * 2, WALL_H - 3), 0, 0, z));
  }
  wall(boxes, -28, -182, 28, -182);                                  // south end wall
  wall(boxes, -32, 40, 32, 40);                                      // north end wall
  for (const [z, wa, wb] of [[-110, 28, 24], [-38, 24, 32]]) {       // partitions (4 m thick), doorway 18 × 7 m
    const w = Math.max(wa, wb);
    for (const sx of [-1, 1]) boxes.push(bx([w - DOOR_W, WALL_H, 4], [sx * (DOOR_W + (w - DOOR_W) / 2), WALL_H / 2, z], 0x353b44));
    boxes.push(bx([DOOR_W * 2, WALL_H - DOOR_H, 4], [0, DOOR_H + (WALL_H - DOOR_H) / 2, z], 0x353b44));
    for (const sx of [-1, 1]) boxes.push(bx([0.5, DOOR_H, 4.3], [sx * (DOOR_W + 0.25), DOOR_H / 2, z], HAZARD));   // door frame
    boxes.push(bx([DOOR_W * 2 + 1, 0.5, 4.3], [0, DOOR_H + 0.25, z], HAZARD));
    for (const sz of [-1, 1]) lit.push(bx([DOOR_W * 2, 0.14, 0.1], [0, DOOR_H + 0.9, z + sz * 2.06], NEON.amber));
  }
  // ceiling
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x14181d, roughness: 1, side: THREE.DoubleSide });
  const roof = new THREE.Mesh(new THREE.PlaneGeometry(72, 232), roofMat); roof.rotation.x = Math.PI / 2; roof.position.set(0, WALL_H + 0.4, -71); root.add(roof);
  // hanging lamps: two rows along each hall
  const lampAt = [];
  for (const [w, z0, z1] of HALLS) for (let z = z0 + 8; z < z1 - 3; z += 14) for (const sx of [-1, 1]) {
    const x = sx * w * 0.42, L = hangingLamp(WALL_H - 3 - LAMP_Y);
    boxes.push(...place(L.body, x, LAMP_Y, z)); glows.push(...place(L.glow, x, LAMP_Y, z));
    lampAt.push([x, LAMP_Y - 0.4, z]);
  }

  // ---- loading dock: container stacks on the walls (carved), loose containers in the corners, forklifts, crates
  MAP.stacks.forEach(([x0, z0, x1, z1], k) => {
    const x = x0 < 0 ? -26.5 : 26.5;
    for (let n = 0; n < 2; n++) {
      const z = z0 + 3.2 + n * 6.5;
      boxes.push(...place(container(CONTAINER_COLS[(k * 2 + n) % 6]), x, 0, z));
      boxes.push(...place(container(CONTAINER_COLS[(k * 2 + n + 3) % 6]), x, 2.62, z));
      if ((k + n) % 2) boxes.push(...place(container(CONTAINER_COLS[(k + n + 1) % 6]), x, 5.24, z));
    }
  });
  for (const [x, z, yaw] of [[-27.1, -157, 0.1], [27.1, -141, 3.0], [-27.1, -122, -0.1]]) boxes.push(...place(forklift(), x, 0, z, yaw));
  for (let k = 0; k < 26; k++) {
    const sx = k % 2 ? 1 : -1, z = -180 + hash01(k, 3) * 66, s = 0.7 + hash01(k, 4) * 0.7;
    boxes.push(...place(k % 5 === 0 ? barrel([0x2a6f9a, 0x9a3a2a, 0x3a7a4a][k % 3]) : k % 7 === 0 ? cableReel() : crate(s, k % 3 ? undefined : 0x7c8894), sx * (27.25 - hash01(k, 5) * 0.3), 0, z, hash01(k, 6) * 3));
  }
  for (const sx of [-1, 1]) for (const z of [-181.2]) for (let n = 0; n < 5; n++) boxes.push(...place(hazardBarrier(2.4), sx * (6 + n * 4.4), 0, z));

  // ---- server aisles: rack rows on the carved rects, pallet racks along both walls
  const RACK_T = [NEON.cyan, NEON.green, NEON.violet];
  MAP.racks.forEach(([x0, z0, x1, z1], k) => {
    const r = serverRack(z1 - z0, k * 13, RACK_T[k % 3]);
    boxes.push(...place(r.body, (x0 + x1) / 2, 0, (z0 + z1) / 2)); lit.push(...place(r.lit, (x0 + x1) / 2, 0, (z0 + z1) / 2));
  });
  for (const sx of [-1, 1]) for (let z = -104; z < -46; z += 10) boxes.push(...place(palletRack(9, Math.round(z + sx * 3)), sx * 23.1, 0, z + 5));
  // cable trays over the aisles
  for (const x of [-13, 13]) { boxes.push(bx([1.2, 0.12, 66], [x, 7.2, -74], STEEL_D)); lit.push(bx([0.08, 0.06, 66], [x, 7.1, -74], NEON.green)); }

  // ---- mainframe core: pylons, the mainframe, wall consoles, floor strips, the scoreboard
  for (const [x0, z0, x1, z1] of MAP.pylons) {
    const x = (x0 + x1) / 2, z = (z0 + z1) / 2;
    boxes.push(...place(pillar(WALL_H, 2), x, 0, z));
    for (const [dx, dz] of [[1.02, 0], [-1.02, 0], [0, 1.02], [0, -1.02]]) lit.push(bx([0.1, WALL_H - 3, 0.1], [x + dx, WALL_H / 2 + 0.6, z + dz], NEON.magenta));
  }
  const mf = mainframe(8, 14, 8, NEON.cyan);
  boxes.push(...place(mf.body, 0, 0, 32)); lit.push(...place(mf.lit, 0, 0, 32));
  for (const sx of [-1, 1]) for (let z = -30; z < 36; z += 6) {
    const r = serverRack(4.6, Math.round(z * 3 + sx), sx > 0 ? NEON.magenta : NEON.cyan);
    boxes.push(...place(r.body, sx * 31.1, 0, z + 2.5)); lit.push(...place(r.lit, sx * 31.1, 0, z + 2.5));
  }
  // LED strips let into the core floor (unlit bright boxes: they bloom)
  for (const z of [-30, 30]) lit.push(bx([56, 0.04, 0.12], [0, 0.03, z], NEON.cyan));
  for (const x of [-28, 28]) lit.push(bx([0.12, 0.04, 60], [x, 0.03, 0], NEON.cyan));
  for (const sx of [-1, 1]) lit.push(bx([0.12, 0.04, 56], [sx * 6, 0.03, 0], 0x1d6a7a));

  const propMat = propMaterial();
  const props = new THREE.Mesh(merge(boxes), propMat); props.castShadow = props.receiveShadow = true; root.add(props);
  const litMat = new THREE.MeshBasicMaterial({ vertexColors: true, color: new THREE.Color(1.9, 1.9, 1.9), fog: true });
  root.add(new THREE.Mesh(merge(lit), litMat));
  const glowMat = new THREE.MeshBasicMaterial({ vertexColors: true, color: new THREE.Color(2.6, 2.4, 2.0) });
  root.add(new THREE.Mesh(merge(glows), glowMat));

  // scoreboard wall over the mainframe (north wall) and a smaller one over shutter A
  const board = scoreboard(), boardMat = new THREE.MeshBasicMaterial({ map: board.tex, color: new THREE.Color(0.85, 0.85, 0.85) });
  for (const [x, y, z, w] of [[0, 11.2, 39.6, 26], [0, 11.6, -112.1, 13], [0, 11.6, -40.1, 13]]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 160 / 512), boardMat);
    m.position.set(x, y, z); m.rotation.y = Math.PI; root.add(m);
  }

  // ---- the shutters: slatted leaves that roll up into the lintel when their gate opens
  const leafGeo = merge(shutter(DOOR_W * 2, DOOR_H));
  const leaves = [['shutterA', -110], ['shutterB', -39]].map(([id, z]) => {
    const m = new THREE.Mesh(leafGeo, propMat); m.position.set(0, 0, z); m.castShadow = true; root.add(m);
    return { id, m, k: 0 };
  });

  // ---- lights: the four nearest lamps; a key on the select / title stage; neon washes
  const lights = [0, 1, 2, 3].map(() => { const l = new THREE.PointLight(0xffe6c0, 0, 30, 1.5); root.add(l); return l; });
  const stageKey = new THREE.PointLight(0xf2f6ff, 26, 14, 2); stageKey.position.set(-6, 3, -146); stageKey.name = 'stage-key'; root.add(stageKey);
  const coreGlow = new THREE.PointLight(0x38e8ff, 120, 60, 1.6); coreGlow.position.set(0, 9, 25); root.add(coreGlow);
  const aisleGlow = new THREE.PointLight(0x46ff8a, 60, 50, 1.6); aisleGlow.position.set(0, 6, -74); root.add(aisleGlow);

  // ---- story fx pools
  const addMat = (c, o = 0) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const flat = (geo, mat) => { const m = new THREE.Mesh(geo, mat); m.rotation.x = -Math.PI / 2; m.visible = false; m.renderOrder = 4; root.add(m); return m; };
  const ringGeo = new THREE.RingGeometry(0.88, 1, 64, 1), discGeo = new THREE.CircleGeometry(1, 48), edgeGeo = new THREE.RingGeometry(0.96, 1, 64, 1);
  const rings = [...Array(16)].map(() => flat(ringGeo, addMat(0xffffff)));
  const warnFill = [...Array(14)].map(() => flat(discGeo, new THREE.MeshBasicMaterial({ color: 0xff2a2a, transparent: true, opacity: 0, depthWrite: false, fog: false })));
  const warnEdge = [...Array(14)].map(() => flat(edgeGeo, addMat(new THREE.Color(3, 0.5, 0.4))));
  const dropGeo = new THREE.BoxGeometry(0.7, 0.7, 0.7);
  const drops = [...Array(14)].map(() => { const m = new THREE.Mesh(dropGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0.6, 0.5), fog: false })); m.visible = false; root.add(m); return m; });

  const tmp = new THREE.Vector3();
  let t = 0, dark = 0;
  return {
    fires: [],
    update(dt, focus, game) {
      t += dt;
      const step = 2 * SHADOW_BOX / 2048;
      tmp.set(Math.round(focus.x / step) * step, 0, Math.round(focus.z / step) * step);
      key.target.position.copy(tmp); key.position.copy(KEY).multiplyScalar(70).add(tmp);
      const fx = game && game.live !== false && game.story && game.story.fx;   // (the menus: no battle's effects left over)
      // the blackout: every lamp dies, only the neon and the screens light the fight
      dark += ((fx && fx.dark ? 1 : 0) - dark) * Math.min(1, dt * 1.5);
      hemi.intensity = 2.3 - dark * 1.75; key.intensity = 2.4 * (1 - dark * 0.9);
      glowMat.color.setRGB(2.6 * (1 - dark), 2.4 * (1 - dark), 2.0 * (1 - dark));
      const near = lampAt.slice().sort((a, b) => (a[0] - focus.x) ** 2 + (a[2] - focus.z) ** 2 - (b[0] - focus.x) ** 2 - (b[2] - focus.z) ** 2);
      lights.forEach((l, n) => { const p = near[n]; l.position.set(p[0], p[1], p[2]); l.intensity = 85 * (1 - dark) * (1 - smooth(30, 50, Math.hypot(p[0] - focus.x, p[2] - focus.z))); });
      stageKey.intensity = 26 + Math.sin(t * 9.3) * 1.5;
      coreGlow.intensity = (110 + 30 * Math.sin(t * 1.7)) * (1 + dark * 0.8);
      coreGlow.color.setHex(dark > 0.5 ? 0xff3ea8 : 0x38e8ff);
      // shutters
      for (const L of leaves) {
        L.k += ((GATES[L.id] && GATES[L.id].open ? 1 : 0) - L.k) * Math.min(1, dt * 1.4);
        L.m.scale.y = Math.max(0.02, 1 - L.k); L.m.position.y = L.k * DOOR_H; L.m.visible = L.k < 0.97;
      }
      if (game) board.draw(game.kos() | 0, (game.story.chapter && game.story.chapter.GOAL) || 1000);
      // story fx
      const now = fx ? fx.now || 0 : 0;
      const W = (fx && fx.warn) || [];
      warnFill.forEach((m, k) => {
        const w = W[k], e = warnEdge[k], on = !!w && now >= w.t0 && now <= w.t1;
        m.visible = e.visible = on;
        if (!on) return;
        const u = (now - w.t0) / Math.max(1, w.t1 - w.t0);
        m.position.set(w.x, 0.06, w.z); m.scale.setScalar(Math.max(0.05, w.r * u)); m.material.opacity = 0.22 + 0.2 * u;
        e.position.set(w.x, 0.07, w.z); e.scale.setScalar(w.r); e.material.opacity = 0.6 + 0.4 * Math.sin(now * 0.6);
      });
      const R = (fx && fx.rings) || [];
      rings.forEach((m, k) => {
        const r = R[k];
        m.visible = !!r && now - r.t < (r.life || 40) && now >= r.t;
        if (!m.visible) return;
        const u = (now - r.t) / (r.life || 40), c = RING_COL[r.kind] || RING_COL.slam;
        const rad = r.r1 ? r.r + (r.r1 - r.r) * u : r.r * (0.35 + 0.65 * (1 - (1 - u) ** 3));
        m.position.set(r.x, 0.1, r.z); m.scale.setScalar(rad); m.material.color.setRGB(c[0], c[1], c[2]); m.material.opacity = (r.r1 ? 1 : 1.1) * (1 - u * u);
      });
      const D = (fx && fx.drops) || [];
      drops.forEach((m, k) => {
        const d = D[k];
        m.visible = !!d && now >= d.t0 && now < d.t;
        if (!m.visible) return;
        const u = (now - d.t0) / Math.max(1, d.t - d.t0);
        m.position.set(d.x, 0.4 + (1 - u) * (1 - u) * 14, d.z); m.rotation.set(now * 0.2 + k, now * 0.13, 0);
      });
    },
  };
}
