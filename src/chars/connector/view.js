// Connector's effects view (render-only; reads game.musou = ./musou.js and the hero's move, never writes sim state).
//  · Copy: Scream (C1): Adam's cyan sound cones; Copy: Flash (C4): Brian's white flash cones and a blink of the screen;
//    Clone Call (C6, or the Overclock pressed in the air): its three clones — blue, pink, yellow — each its own little jelly; a ring
//    in its colour where each one lands, slams and pops
//  · the hop slams (N6, C5, the stomp): an orange ring under each landing
//  · Overclock GIGA CONNECT: a green vignette and the cut-in; a ring and a shower of tiles under every giant hop; a
//    swirl round the giant spin; the belly flop's two rings, sparks and a flash
import * as THREE from 'three';
import { on } from '../../core/events.js';
import { createOverlay, ramp } from '../../musou/overlay.js';
import { ground } from '../../world/map.js';
import { createFx } from '../shared/fx.js';
import { CLONE_PAL, createCloneActor } from './model.js';

const AQUA = [0.6, 3.0, 1.3], ORANGE = [3.0, 1.3, 0.3], VIOLET = [1.8, 0.9, 3.0], WHITE = [2.8, 2.7, 2.4];

export function createMusouView(scene, game) {
  const mu = game.musou, hero = game.hero;
  // the numbers of this fighter's kit (Connector's, or a kit built on it: Anonymous reaches further and its clones are masked)
  const M = mu.M, CLONE = mu.K, MOVES = hero.kit.moves, far = hero.kit.reach || 1, masked = !!hero.kit.masked;
  const fx = createFx(scene);
  const ov = createOverlay({ sub: `${hero.char.musou.name} ×100`, seal: hero.char.tag,
    css: { big: 'color:#eafff0; text-shadow: 0 0 2vh rgba(70,224,122,.9), 0 0 5vh rgba(255,138,30,.6);', sub: 'color:#ffd9a8; text-shadow: 0 0 1vh rgba(0,0,0,.7);',
      seal: 'background:#ff8a1e; box-shadow: 0 0 2vh rgba(255,138,30,.6);' } });
  ov.dim.style.background = 'radial-gradient(ellipse at 50% 55%, rgba(220,255,230,1) 25%, rgba(0,40,20,1) 100%)';
  ov.wash.style.background = 'radial-gradient(circle at 50% 60%, rgba(230,255,240,0.9), rgba(255,160,60,0.25) 70%)';
  const swirl = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 64, 1), new THREE.MeshBasicMaterial({ color: new THREE.Color(...AQUA), transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  swirl.rotation.x = -Math.PI / 2; swirl.visible = false; fx.root.add(swirl);
  // the steered hops: a disc on the floor where the next one lands, a line to it from the giant
  const aimMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(...ORANGE), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false,
    side: THREE.DoubleSide, fog: false });
  const aimRing = new THREE.Mesh(new THREE.RingGeometry(0.82, 1, 48, 1), aimMat), aimDot = new THREE.Mesh(new THREE.CircleGeometry(0.3, 24), aimMat);
  const aimLine = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 1), aimMat);
  for (const m of [aimRing, aimDot, aimLine]) { m.rotation.x = -Math.PI / 2; m.visible = false; m.renderOrder = 6; fx.root.add(m); }

  const actors = CLONE_PAL.map((pal) => ({ pal, a: createCloneActor(fx.root, pal, masked), on: false, atk: 0 }));
  let flash = 0, key = -1;
  const blink = (v) => { flash = Math.max(flash, v); };
  const subs = [on('musou:burst', (e) => {
    if (game.musou !== mu) return;
    fx.ring({ x: e.x, z: e.z, r0: 2, r1: M.waveR, life: 0.55, color: AQUA, a: 1.3 });
    fx.ring({ x: e.x, z: e.z, r0: 1, r1: M.waveR * 0.8, life: 0.75, color: ORANGE, a: 1.1 });
    fx.tiles({ x: e.x, z: e.z, r: M.waveR * 0.8, n: 60, life: 1.5, color: AQUA, rise: 3 });
    fx.sparks({ x: e.x, y: ground(e.x, e.z) + 0.5, z: e.z, n: 80, speed: 12, up: 8, life: 1.3, color: ORANGE });
    blink(1);
  }), on('connector:clones', (e) => {
    if (game.musou !== mu) return;
    fx.ring({ x: e.x, z: e.z, r0: 0.6, r1: CLONE.pop.range, life: 0.4, color: AQUA, a: 1.2 });
    fx.sparks({ x: e.x, y: ground(e.x, e.z) + 1.2, z: e.z, n: 40, speed: 8, up: 5, life: 0.8, color: ORANGE });
    blink(0.4);
  })];

  return {
    update(dt) {
      const t = mu.active ? mu.t : 0, gy = ground(hero.x, hero.z), fwdX = Math.sin(hero.yaw), fwdZ = Math.cos(hero.yaw);
      ov.show(ov.dim, mu.active ? 0.55 * ramp(t, 0, 8) * (1 - ramp(t, M.activation - 6, M.activation + 8)) : 0);
      ov.cut(t, 6, mu.active ? ramp(t, 6, 10) * (1 - ramp(t, M.activation + 2, M.activation + 14)) : 0, ramp(t, 6, 12));
      flash = Math.max(0, flash - dt * 3);
      ov.show(ov.wash, flash * 0.5);
      const k = hero.state === 'attack' ? hero.moveSeq * 1000 + hero.moveT : mu.active ? -t : -1e9;
      if (k !== key) {
        key = k;
        if (hero.state === 'attack') {
          const f = hero.moveT, id = hero.move, x = hero.x + fwdX * 0.6, z = hero.z + fwdZ * 0.6;
          const cone = (range, ang, color, a, life = 0.3, y = 1.0) => fx.cone({ x, z, y: gy + y, yaw: hero.yaw, range: range * far, ang, life, color, a, grow: 0.3 });
          if (id === 'c1' && f >= 18 && f <= 38 && (f - 18) % 6 === 0) cone(5, 70, AQUA, 0.55);
          if (id === 'c1' && f === 42) cone(5.6, 80, VIOLET, 0.9, 0.45);
          if (id === 'c4' && f >= 14 && f <= 34 && (f - 14) % 10 === 0) { cone(5, 90, WHITE, 0.7, 0.2, 1.3); blink(0.3); }
          if (id === 'c4' && f === 38) { cone(5.6, 100, WHITE, 1, 0.25, 1.3); blink(0.7); }
          if (['n6', 'c5', 'jc'].includes(id)) for (const w of MOVES[id].hits) if (f === w.f[0]) {
            fx.ring({ x: hero.x, z: hero.z, y: gy + 0.12, r0: 0.5, r1: w.range, life: 0.35, color: ORANGE, a: 1.1 });
            fx.tiles({ x: hero.x, z: hero.z, r: w.range * 0.7, n: 12, life: 0.8, color: AQUA });
          }
        }
        if (mu.active) {
          if (M.hops.includes(t)) {
            fx.ring({ x: hero.x, z: hero.z, y: gy + 0.12, r0: 1.5, r1: M.hopR, life: 0.45, color: ORANGE, a: 1.2 });
            fx.tiles({ x: hero.x, z: hero.z, r: M.hopR * 0.8, n: 30, life: 1.1, color: AQUA, rise: 3 });
            fx.sparks({ x: hero.x, y: gy + 0.3, z: hero.z, n: 30, speed: 9, up: 6, life: 0.9, color: ORANGE });
          }
          if (t >= M.spin[0] && t <= M.spin[1] && (t - M.spin[0]) % M.spinEvery === 0) fx.ring({ x: hero.x, z: hero.z, y: gy + 1.4, r0: 3, r1: M.spinR, life: 0.3, color: AQUA, a: 0.8 });
        }
      }
      // the clones: each one's actor, and a ring in its colour when it lands, slams and pops
      for (const A of actors) {
        const q = mu.clones[actors.indexOf(A)], c = A.pal.fx;
        A.a.update(dt, q, CLONE.windup);
        const pop = (r) => { fx.ring({ x: q.x, z: q.z, y: ground(q.x, q.z) + 0.12, r0: 0.3, r1: r, life: 0.35, color: c, a: 1.1 });
          fx.sparks({ x: q.x, y: ground(q.x, q.z) + 0.7, z: q.z, n: 12, speed: 5, up: 4, life: 0.6, color: c }); };
        if (q.on !== A.on) { A.on = q.on; pop(1.6); }
        if (q.on && q.atk === CLONE.windup && A.atk !== CLONE.windup) pop(CLONE.hit.range);
        A.atk = q.on ? q.atk : 0;
      }
      const aim = mu.active && mu.aim;
      aimRing.visible = aimDot.visible = aimLine.visible = !!aim;
      if (aim) {
        const [ax, az] = aim, ay = ground(ax, az) + 0.16, dx = ax - hero.x, dz = az - hero.z, L = Math.hypot(dx, dz);
        aimRing.position.set(ax, ay, az); aimRing.scale.setScalar(M.hopR * (0.5 + 0.04 * Math.sin(t * 0.6))); aimDot.position.set(ax, ay, az);
        aimLine.visible = L > 0.5;
        aimLine.position.set(hero.x + dx / 2, ay, hero.z + dz / 2); aimLine.rotation.z = Math.atan2(dx, dz); aimLine.scale.set(1, Math.max(0.1, L), 1);
        aimMat.opacity = 0.75 + 0.2 * Math.sin(t * 0.6);
      }
      const sw = mu.active && t >= M.spin[0] - 6 && t < M.spin[1] + 14;
      swirl.visible = sw;
      if (sw) { swirl.position.set(hero.x, gy + 0.3, hero.z); swirl.scale.setScalar(M.spinR * (0.85 + 0.15 * Math.sin(t * 0.5))); swirl.rotation.z = t * 0.4;
        swirl.material.opacity = 0.8 * ramp(t, M.spin[0] - 6, M.spin[0]) * (1 - ramp(t, M.spin[1], M.spin[1] + 14)); }
      fx.update(dt);
    },
    dispose() { fx.dispose(); ov.dispose(); void subs; },
  };
}
