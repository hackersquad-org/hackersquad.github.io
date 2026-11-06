// Adam's effects view (render-only; reads game.musou = ./musou.js and the hero's move, never writes sim state).
//  · Feedback (C1): cyan sound cones pulsing out of the mic, a wide violet one on the last note
//  · Overclock SONIC BOOM: a violet vignette and the cut-in; a ring per scream; an equaliser — a circle of bars round him
//    jumping to the beat — while it plays; a red scorch line down the strafed lane; the bass ring, rising tiles and a
//    flash on the mic drop
import * as THREE from 'three';
import { on } from '../../core/events.js';
import { createOverlay, ramp } from '../../musou/overlay.js';
import { ground } from '../../world/map.js';
import { createFx } from '../shared/fx.js';
import { ADAM_MUSOU as M } from './musou.js';

const CYAN = [0.5, 2.4, 3.0], VIOLET = [1.8, 0.8, 3.0], RED = [3.0, 0.6, 0.5], BARS = 36;

export function createMusouView(scene, game) {
  const mu = game.musou, hero = game.hero;
  const fx = createFx(scene);
  const ov = createOverlay({ sub: 'Sonic Boom', seal: 'ADAM',
    css: { big: 'color:#eafcff; text-shadow: 0 0 2vh rgba(56,232,255,.9), 0 0 5vh rgba(154,107,255,.6);', sub: 'color:#9ff4ff; text-shadow: 0 0 1vh rgba(0,0,0,.7);',
      seal: 'background:#38e8ff; box-shadow: 0 0 2vh rgba(56,232,255,.6);' } });
  ov.dim.style.background = 'radial-gradient(ellipse at 50% 55%, rgba(210,240,255,1) 25%, rgba(20,8,48,1) 100%)';
  ov.wash.style.background = 'radial-gradient(circle at 50% 60%, rgba(190,250,255,0.9), rgba(120,80,255,0.2) 70%)';

  // equaliser: instanced bars on a circle round him, each jumping on its own band
  const bars = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 1.2, 1.5), fog: false, toneMapped: false }), BARS);
  bars.frustumCulled = false; bars.visible = false; fx.root.add(bars);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s3 = new THREE.Vector3(), p3 = new THREE.Vector3(), e3 = new THREE.Euler();

  let key = -1, flash = 0, time = 0;
  const subs = [on('musou:burst', (e) => {
    if (game.musou !== mu) return;
    fx.ring({ x: e.x, z: e.z, r0: 1, r1: M.waveR, life: 0.5, color: CYAN, a: 1.3 });
    fx.ring({ x: e.x, z: e.z, r0: 0.6, r1: M.waveR * 0.8, life: 0.7, color: VIOLET, a: 1.1 });
    fx.tiles({ x: e.x, z: e.z, r: M.waveR * 0.8, n: 50, life: 1.4, color: CYAN });
    fx.sparks({ x: e.x, y: ground(e.x, e.z) + 0.4, z: e.z, n: 60, speed: 10, up: 7, life: 1.2, color: VIOLET });
    flash = 1;
  })];

  return {
    update(dt) {
      time += dt;
      const t = mu.active ? mu.t : 0, gy = ground(hero.x, hero.z), fwdX = Math.sin(hero.yaw), fwdZ = Math.cos(hero.yaw);
      ov.show(ov.dim, mu.active ? 0.55 * ramp(t, 0, 8) * (1 - ramp(t, M.activation - 4, M.activation + 8)) : 0);
      ov.cut(t, 6, mu.active ? ramp(t, 6, 10) * (1 - ramp(t, M.activation + 4, M.activation + 14)) : 0, ramp(t, 6, 12));
      flash = Math.max(0, flash - dt * 2.2);
      ov.show(ov.wash, flash * 0.5);
      // one-shot effects keyed on the sim frame of the move / the Overclock (hitstop holds the frame: no double spawns)
      const k = hero.state === 'attack' ? hero.moveSeq * 1000 + hero.moveT : mu.active ? -t : -1e9;
      if (k !== key) {
        key = k;
        if (hero.state === 'attack' && hero.move === 'c1') {
          const f = hero.moveT, x = hero.x + fwdX * 0.6, z = hero.z + fwdZ * 0.6;
          if (f >= 20 && f <= 44 && (f - 20) % 6 === 0) fx.cone({ x, z, y: gy + 1.2, yaw: hero.yaw, range: 5.5, ang: 70, life: 0.3, color: CYAN, a: 0.55, grow: 0.25 });
          if (f === 48) { fx.cone({ x, z, y: gy + 1.2, yaw: hero.yaw, range: 6.2, ang: 80, life: 0.45, color: VIOLET, a: 0.9, grow: 0.3 });
            fx.sparks({ x: hero.x + fwdX * 3, y: gy + 1.2, z: hero.z + fwdZ * 3, n: 24, speed: 8, up: 3, life: 0.7, color: CYAN }); }
        }
        if (hero.state === 'attack' && hero.move === 'c4' && hero.moveT === 46)
          fx.beam({ from: [hero.x + fwdX, gy + 0.15, hero.z + fwdZ], to: [hero.x + fwdX * 10, gy + 0.15, hero.z + fwdZ * 10], w: 1.6, life: 0.4, color: RED, a: 0.9 });
        if (mu.active) {
          M.screams.forEach((f, j) => { if (t === f) {
            fx.ring({ x: hero.x, z: hero.z, y: gy + 0.12, r0: 0.8, r1: M.screamR[j], life: 0.4, color: CYAN, a: 1.2 });
            fx.ring({ x: hero.x, z: hero.z, y: gy + 1.2, r0: 0.5, r1: M.screamR[j] * 0.8, life: 0.5, color: VIOLET, a: 0.8 });
          } });
          if (t >= M.strafe[0] && t < M.strafe[1] && (t - M.strafe[0]) % M.strafeEvery === 0) {
            const d = 1.5 + 11 * (t - M.strafe[0]) / (M.strafe[1] - M.strafe[0]), x = hero.x + fwdX * d, z = hero.z + fwdZ * d;
            fx.sparks({ x, y: ground(x, z) + 0.2, z, n: 14, speed: 5, up: 5, life: 0.6, color: RED });
            fx.ring({ x, z, y: ground(x, z) + 0.1, r0: 0.3, r1: 1.8, life: 0.3, color: RED, a: 0.9 });
          }
          if (t === M.strafe[1]) fx.beam({ from: [hero.x + fwdX, gy + 0.15, hero.z + fwdZ], to: [hero.x + fwdX * 13, gy + 0.15, hero.z + fwdZ * 13], w: 2.2, life: 0.5, color: RED, a: 1 });
        }
      }
      // equaliser bars
      const eq = mu.active && t >= M.activation - 4 && t < M.end - 6;
      bars.visible = eq;
      if (eq) {
        const fade = ramp(t, M.activation - 4, M.activation + 8) * (1 - ramp(t, M.end - 20, M.end - 6));
        const beat = Math.max(...M.screams.map((f) => 1 - ramp(t, f, f + 18) - (t < f ? 1 : 0)), t >= M.finisher ? 1 - ramp(t, M.finisher, M.finisher + 24) : 0, 0);
        for (let i = 0; i < BARS; i++) {
          const a = i / BARS * Math.PI * 2, r = 2.7;
          const h = (0.25 + 0.75 * Math.abs(Math.sin(time * (5 + (i * 7) % 5) + i * 1.7))) * (0.3 + 0.9 * beat) * fade;
          p3.set(hero.x + Math.sin(a) * r, gy + 0.02, hero.z + Math.cos(a) * r);
          e3.set(0, a, 0); q.setFromEuler(e3); s3.set(0.2, Math.max(0.02, h), 0.06);
          bars.setMatrixAt(i, m4.compose(p3, q, s3));
        }
        bars.instanceMatrix.needsUpdate = true;
      }
      fx.update(dt);
    },
    dispose() { fx.dispose(); ov.dispose(); void subs; },
  };
}
