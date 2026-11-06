// Brian's effects view (render-only; reads game.musou = ./musou.js and the hero's move, never writes sim state).
//  · the camera's flashes (N3, C4 Burst Mode): a white cone down the lane and a blink of the whole screen
//  · Cart Surf / the Overclock ride: sparks off the wheels
//  · Overclock RUSH HOUR: an amber vignette and the cut-in; a white ring per flash; an amber streak along the ride; the
//    shock ring, rising tiles and a flash when the cart is unloaded
import * as THREE from 'three';
import { on } from '../../core/events.js';
import { createOverlay, ramp } from '../../musou/overlay.js';
import { ground } from '../../world/map.js';
import { createFx } from '../shared/fx.js';
import { BRIAN_MUSOU as M } from './musou.js';

const WHITE = [2.8, 2.7, 2.4], AMBER = [3.0, 1.7, 0.4], BLUE = [0.5, 1.4, 3.0];

export function createMusouView(scene, game) {
  const mu = game.musou, hero = game.hero;
  const fx = createFx(scene);
  const ov = createOverlay({ sub: 'Rush Hour', seal: 'BRIAN',
    css: { big: 'color:#fff6e0; text-shadow: 0 0 2vh rgba(255,176,46,.9), 0 0 5vh rgba(42,111,208,.6);', sub: 'color:#ffe0a0; text-shadow: 0 0 1vh rgba(0,0,0,.7);',
      seal: 'background:#ffb02e; box-shadow: 0 0 2vh rgba(255,176,46,.6);' } });
  ov.dim.style.background = 'radial-gradient(ellipse at 50% 55%, rgba(255,240,210,1) 25%, rgba(40,24,0,1) 100%)';
  ov.wash.style.background = 'radial-gradient(circle at 50% 50%, rgba(255,255,250,0.95), rgba(255,220,160,0.3) 75%)';
  const streak = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1), new THREE.MeshBasicMaterial({ color: new THREE.Color(...AMBER), transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  streak.rotation.x = -Math.PI / 2; streak.visible = false; fx.root.add(streak);

  let flash = 0, key = -1;
  const blink = (v) => { flash = Math.max(flash, v); };
  const subs = [on('musou:burst', (e) => {
    if (game.musou !== mu) return;
    fx.ring({ x: e.x, z: e.z, r0: 1, r1: M.waveR, life: 0.5, color: AMBER, a: 1.3 });
    fx.ring({ x: e.x, z: e.z, r0: 0.6, r1: M.waveR * 0.8, life: 0.7, color: BLUE, a: 1.0 });
    fx.tiles({ x: e.x, z: e.z, r: M.waveR * 0.8, n: 50, life: 1.4, color: AMBER });
    fx.sparks({ x: e.x, y: ground(e.x, e.z) + 0.4, z: e.z, n: 70, speed: 10, up: 7, life: 1.2, color: WHITE });
    blink(1);
  })];

  return {
    update(dt) {
      const t = mu.active ? mu.t : 0, gy = ground(hero.x, hero.z), fwdX = Math.sin(hero.yaw), fwdZ = Math.cos(hero.yaw);
      ov.show(ov.dim, mu.active ? 0.55 * ramp(t, 0, 8) * (1 - ramp(t, M.activation - 4, M.activation + 8)) : 0);
      ov.cut(t, 6, mu.active ? ramp(t, 6, 10) * (1 - ramp(t, M.activation + 4, M.activation + 14)) : 0, ramp(t, 6, 12));
      flash = Math.max(0, flash - dt * 4);
      ov.show(ov.wash, flash * 0.55);
      const k = hero.state === 'attack' ? hero.moveSeq * 1000 + hero.moveT : mu.active ? -t : -1e9;
      if (k !== key) {
        key = k;
        const cone = (range, ang, a = 0.8) => fx.cone({ x: hero.x + fwdX * 0.5, z: hero.z + fwdZ * 0.5, y: gy + 1.5, yaw: hero.yaw, range, ang, life: 0.2, color: WHITE, a, grow: 0.5 });
        if (hero.state === 'attack') {
          const f = hero.moveT;
          if (hero.move === 'n3' && f === 10) { cone(3.8, 100); blink(0.35); }
          if (hero.move === 'c4' && f >= 16 && f <= 40 && (f - 16) % 8 === 0) { cone(5, 90, 0.7); blink(0.3); }
          if (hero.move === 'c4' && f === 44) { cone(5.6, 100, 1); blink(0.7); }
          if ((hero.move === 'c1' && f >= 16 && f <= 44 && f % 3 === 0) || (hero.move === 'dash' && f >= 4 && f <= 24 && f % 3 === 0))
            fx.sparks({ x: hero.x + fwdX * 0.6, y: gy + 0.1, z: hero.z + fwdZ * 0.6, n: 5, speed: 3, up: 2.5, life: 0.4, color: AMBER });
        }
        if (mu.active) {
          M.flashes.forEach((f, j) => { if (t === f) { fx.ring({ x: hero.x, z: hero.z, y: gy + 1.2, r0: 0.6, r1: M.flashR[j], life: 0.35, color: WHITE, a: 1.2 }); blink(0.8); } });
          if (t > M.ride[0] && t <= M.ride[1] && t % 2 === 0) fx.sparks({ x: hero.x + fwdX * 0.6, y: gy + 0.1, z: hero.z + fwdZ * 0.6, n: 6, speed: 4, up: 3, life: 0.5, color: AMBER });
        }
      }
      // the ride's streak: from where it started to the cart
      const ds = mu.active && t > M.ride[0] && t < M.ride[1] + 24;
      streak.visible = ds;
      if (ds) {
        const x0 = mu.dx0, z0 = mu.dz0, dx = hero.x - x0, dz = hero.z - z0, L = Math.max(0.3, Math.hypot(dx, dz));
        streak.position.set(x0 + dx / 2, ground(x0 + dx / 2, z0 + dz / 2) + 0.1, z0 + dz / 2);
        streak.rotation.z = Math.atan2(dx, dz); streak.scale.set(1, L, 1);
        streak.material.opacity = 0.8 * (1 - ramp(t, M.ride[1], M.ride[1] + 24));
      }
      fx.update(dt);
    },
    dispose() { fx.dispose(); ov.dispose(); void subs; },
  };
}
