// Title screen (#title, ui lane). Key art over the live warehouse: the eight fighters lined up on their real voxel models
// (kit.model on their own rigs, their secondary life running: Adam's drone, Ana's twin tails, Connector's wobble), each
// in a held frame of one of its own clips, data motes rising round them, neon glows behind in deep bokeh; a slow push-in
// on enter, then a breathing drift (+ a little mouse parallax). The lens is fitted every frame to the line-up's posed
// bounds, so all four stay whole in the column right of the logo / menu band at any window shape.
// Render-only: view(scene, camera, focus, dt) runs after the gameplay camera rig while this screen is up (main.js header).
// 2D: a dark band on the left carrying the logo and the menu, a name tag over each fighter's head, key / pad prompts along
// the bottom. First boot shows a "press any key" card (also unlocks audio); returns go straight to the menu.
// Menu: one line per mission (story/chapters.js: Warehouse Championship, Village Defense) / Practice → the difficulty
// panel in place of the menu (Easy · Normal · Hard · Extremely Hard + a card: the tier's line and pressure / bosses /
// damage pips, core/difficulty.js), confirm → select {mode, chapter}, Esc back to the menu. Practice first asks which
// mission's arena to train in (the arena panel) · Co-op → the lobby (ui/lobby.js: the host picks the mission there) ·
// Controls → the controls panel (Esc back). The title always stands in the warehouse (main.js stageMap).
// Mouse: hover highlights an item, click activates it.
// Screen contract: createTitle(el, flow) → { enter(ctx), exit(), view } (src/main.js header).
import * as THREE from 'three';
import { CHARS } from '../chars/index.js';
import { sampleClip, POSE_SIZE } from '../hero/rig.js';
import { heroLook } from '../hero/model.js';
import { createNav, sfx, inkWipe, wiping, afterWipe, stamp, clearStamp, replay } from './menu.js';
import { ground } from '../world/map.js';
import { dotTex, scatter, passPoint, standOfficer, poseOfficer } from './stage.js';
import { DIFFS, difficulty, setDifficulty } from '../core/difficulty.js';
import { CHAPTERS, CHAPTER_ORDER } from '../story/chapters.js';

export const GAME_TITLE = 'HACKER SQUAD';
export const GAME_TAGLINE = 'Pick your mission';

const ITEMS = [
  ...CHAPTER_ORDER.map((id) => ({ go: 'story', chapter: id, ...CHAPTERS[id].menu })),
  { go: 'free', label: 'Practice', sub: 'Endless waves · either arena · no knock-out' },
  { go: 'coop', label: 'Co-op', sub: '2–4 players · same Wi-Fi or over the internet' },
  { go: 'controls', label: 'Controls', sub: 'Keyboard · gamepad · touch' },
];
export const CONTROLS = [   // also the pause menu's table (main.js): [action, keyboard, gamepad]
  ['Move', '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> / arrows', 'left stick'],
  ['Attack', '<kbd>J</kbd> / left click — tap for the full combo', '<kbd>X</kbd> □'],
  ['Charge', '<kbd>K</kbd> / right click — mid-combo for a finisher', '<kbd>Y</kbd> △'],
  ['Jump', '<kbd>Space</kbd>', '<kbd>A</kbd> ×'],
  ['Dodge', '<kbd>L</kbd> / <kbd>Shift</kbd>', '<kbd>R1</kbd> <kbd>R2</kbd>'],
  ['Overclock', '<kbd>I</kbd> — when a gauge segment is full', '<kbd>B</kbd> ○'],
  ['Camera', 'mouse (click the field to lock it) / <kbd>Q</kbd><kbd>E</kbd>', 'right stick'],
  ['Recenter', '<kbd>R</kbd> — behind you, or onto the nearest boss', '<kbd>L1</kbd> <kbd>L2</kbd>'],
  ['Pause', '<kbd>Esc</kbd> (also frees the mouse)', '<kbd>Start</kbd>'],
];

// ---- key-art stage. Frame: origin on the dock's centre lane, camera looks +Z (up the hall).
// Cast offsets in metres (x + = world +X = screen-left), face = yaw (0 = facing +Z, π = facing the camera), pose = a held
// frame of one of the kit's own clips (u 0-1); show: the key-art flourish (rig.show: Alex's umbrella open).
export const STAGE = {
  at: 0.5,                     // stage point: this far up the stage zone (0 = its south edge, 1 = north)
  eye: 1.1, fov: 32,           // low heroic eye (m above the floor), tilted up to the line-up
  fitR: 0.965, fitT: 0.14, fitK: 0.9,    // framing: right edge, top of the highest point, the floor line under the front rank
  push: 0.22, pushT: 3.2,      // enter: start this much farther back and push in to the fitted frame over pushT s
  motes: 300,
  cast: [
    { id: 'adam', clip: 'mu_adam', u: 24 / 210, x: 1.35, z: 0, face: Math.PI + 0.22, look: [0.7, 1.8] },
    { id: 'ana', clip: 'n3', u: 16 / 30, x: 0.0, z: 0.75, face: Math.PI + 0.05, look: [1.0, 2.0] },
    { id: 'brian', clip: 'idle', u: 0.2, x: -1.45, z: 1.5, face: Math.PI - 0.2, look: [0.8, 1.8] },
    { id: 'connector', clip: 'c2', u: 20 / 52, x: -2.9, z: 0.1, face: Math.PI - 0.3, look: [0.9, 2.0] },
    // the guests from Sheep Village, in the front row (show: rig.show, the key-art flourish — Alex's umbrella open)
    { id: 'alex', clip: 'keyart', u: 0, show: 1, x: 2.4, z: -0.8, face: Math.PI + 0.25, look: [0.5, 1.2] },
    { id: 'bryan', clip: 'keyart', u: 0, show: 1, x: 0.95, z: -0.9, face: Math.PI + 0.1, look: [0.5, 1.2] },
    { id: 'clara', clip: 'keyart', u: 0, show: 1, x: -0.5, z: -0.9, face: Math.PI - 0.15, look: [0.7, 1.4] },
    { id: 'ben', clip: 'keyart', u: 0, show: 1, x: -1.9, z: -1.0, face: Math.PI - 0.3, look: [0.6, 1.3] },
  ],
};

// neon glows [x, y, z, width, height, r, g, b, flicker] in the stage frame (additive soft sprites, blurred by the DoF)
const GLOWS = [[-6, 3.5, 30, 40, 14, 0.06, 0.36, 0.5], [9, 2.5, 22, 22, 10, 0.4, 0.08, 0.3], [-12, 1.5, 14, 12, 6, 0.08, 0.4, 0.2, 0.3],
  [5, 0.6, 12, 16, 2.4, 0.05, 0.25, 0.32, 0.08], [10, 1.0, 20, 24, 3.6, 0.3, 0.06, 0.22, 0.08], [0, 8, 40, 30, 10, 0.1, 0.3, 0.45, 0.2]];

export function createTitle(el, flow) {
  el.innerHTML = `
    <div class="t-veil"></div>
    ${STAGE.cast.map(({ id }) => { const c = CHARS[id]; return `<div class="t-tag" data-id="${id}" style="--acc:${c.accent}"><b>${c.name}</b><small>${c.role}</small></div>`; }).join('')}
    <div class="t-band">
      <div class="t-logo"><i class="t-chip">${STAGE.cast.length} fighters · ${CHAPTER_ORDER.length} missions · 1000 K.O.</i><h1>${GAME_TITLE.split(' ').map((w) => `<span data-t="${w}"><b>${w}</b></span>`).join('')}</h1>
        <p class="t-sub"><span>${GAME_TAGLINE}</span></p></div>
      <div class="t-press"><b>Press any key</b><small><kbd>Enter</kbd> to start</small></div>
      <nav class="t-menu t-main">${ITEMS.map((it, i) => `<button data-i="${i}" style="--i:${i}"><b>${it.label}</b><small>${it.sub}</small></button>`).join('')}</nav>
      <nav class="t-menu t-arena">${CHAPTER_ORDER.map((id, i) => `<button data-a="${i}" style="--i:${i}"><b>${CHAPTERS[id].arena}</b><small>Practice arena · ${CHAPTERS[id].menu.label}</small></button>`).join('')}</nav>
      <div class="t-dpanel"><nav class="t-menu t-dif">${DIFFS.map((d, i) => `<button data-d="${i}" style="--i:${i}"><b>${d.name}</b><small>Level ${i + 1} of ${DIFFS.length}</small></button>`).join('')}</nav>
        <div class="t-dcard"><h3>Difficulty</h3><p class="t-dline"></p>
          <ul class="s-stats t-dbars">${['Pressure', 'Bosses', 'Damage'].map((n) => `<li><b>${n}</b><span>${'<i></i>'.repeat(5)}</span></li>`).join('')}</ul></div></div>
    </div>
    <section class="t-ctl"><h2>Controls</h2>
      <table><tr><th></th><th>Keyboard / mouse</th><th>Gamepad</th></tr>${CONTROLS.map(([n, kb, pad]) => `<tr><th>${n}</th><td>${kb}</td><td class="pad">${pad}</td></tr>`).join('')}</table>
      <p>Tap attack for the combo, press charge mid-combo for a finisher. Every hit fills the gauge: spend a segment on your Overclock. On a phone: the stick is
        the left half of the screen, the buttons are on the right.</p></section>
    <footer class="ui-foot"></footer>`;
  const $ = (s) => el.querySelector(s), btns = [...el.querySelectorAll('.t-main button')], dbtns = [...el.querySelectorAll('.t-dif button')];
  const tags = [...el.querySelectorAll('.t-tag')], abtns = [...el.querySelectorAll('.t-arena button')];
  let cur = 0, pre = true, ctl = false, busy = false, dcur = 1, dmode = null;   // dmode: the mode picked, while the difficulty panel is up
  let chap = CHAPTER_ORDER[0], arena = false, acur = 0;                 // the mission picked · the practice arena panel is up, its cursor

  const focus = (i, quiet) => {
    i = (i + btns.length) % btns.length;
    if (i === cur && btns[i].classList.contains('on')) return;
    btns[cur].classList.remove('on'); cur = i; btns[cur].classList.add('on');
    if (!quiet) sfx('move');
  };
  const foot = () => {
    $('.ui-foot').innerHTML = ctl ? `<span><kbd>Esc</kbd><kbd class="pad">B</kbd>Back</span>`
      : `<span><kbd>↑</kbd><kbd>↓</kbd>${dmode ? 'Difficulty' : arena ? 'Arena' : 'Select'}</span><span><kbd>Enter</kbd><kbd class="pad">A</kbd>Confirm</span>`
        + (dmode || arena ? `<span><kbd>Esc</kbd><kbd class="pad">B</kbd>Back</span>` : '');
  };
  const setCtl = (v) => { ctl = v; el.classList.toggle('ctl', v); foot(); };
  // difficulty panel: the card shows the focused tier
  const dfocus = (i, quiet) => {
    i = (i + dbtns.length) % dbtns.length;
    if (i === dcur && dbtns[i].classList.contains('on')) return;
    dcur = i; dbtns.forEach((b, k) => b.classList.toggle('on', k === i));
    const d = DIFFS[i];
    $('.t-dcard h3').textContent = d.name;
    $('.t-dline').textContent = d.line;
    el.querySelectorAll('.t-dbars li').forEach((li, k) => li.querySelectorAll('i').forEach((q, j) => q.classList.toggle('f', j < d.bars[k])));
    el.style.setProperty('--tier', i);
    if (!quiet) sfx('move');
  };
  const setDif = (mode) => {
    dmode = mode; el.classList.toggle('dif', !!mode); foot();
    if (!mode) return;
    dbtns[dcur].classList.remove('on'); dfocus(DIFFS.indexOf(difficulty()), true);
    measure();                                          // the band widened: the key art glides right
  };
  const afocus = (i, quiet) => { acur = (i + abtns.length) % abtns.length; abtns.forEach((b, k) => b.classList.toggle('on', k === acur)); if (!quiet) sfx('move'); };
  const setArena = (v) => { arena = v; el.classList.toggle('arena', v); foot(); if (v) afocus(acur, true); measure(); };
  const wake = () => { pre = false; el.classList.remove('pre'); sfx('ok'); };
  const ok = () => {
    if (busy) return;
    if (wiping()) return afterWipe(ok);
    if (pre) return wake();
    if (ctl) return back();
    if (dmode) {
      const d = DIFFS[dcur], mode = dmode;
      setDifficulty(d); busy = true;
      stamp(dbtns[dcur], 'OK');
      return setTimeout(() => inkWipe(() => flow.go('select', { mode, chapter: chap })), 380);
    }
    if (arena) { sfx('ok'); chap = CHAPTER_ORDER[acur]; setArena(false); return setDif('free'); }
    const it = ITEMS[cur];
    if (it.go === 'controls') { sfx('ok'); return setCtl(true); }
    if (it.go === 'coop') { sfx('ok'); busy = true; return inkWipe(() => flow.go('lobby')); }   // ui/lobby.js
    sfx('ok');
    if (it.go === 'free') return setArena(true);
    chap = it.chapter; setDif(it.go);
  };
  const back = () => {
    if (busy) return;
    if (wiping()) return afterWipe(back);
    if (pre) return wake();
    if (ctl) { sfx('back'); setCtl(false); }
    else if (dmode) { sfx('back'); setDif(null); measure(); }
    else if (arena) { sfx('back'); setArena(false); }
  };
  // "press any key": any key wakes the menu and is swallowed (capture, before the menu driver would act on it too)
  let active = false;
  addEventListener('keydown', (e) => { if (active && pre && !e.metaKey && !e.ctrlKey) { e.stopImmediatePropagation(); e.preventDefault(); wake(); } }, true);
  const nav = createNav({ move: (d) => { if (pre) wake(); else if (!ctl && !busy) dmode ? dfocus(dcur + d) : arena ? afocus(acur + d) : focus(cur + d); }, ok, back });

  el.addEventListener('pointerover', (e) => {
    const b = e.target.closest('.t-menu button');
    if (b && !pre && !ctl && !busy) b.dataset.d ? dfocus(+b.dataset.d) : b.dataset.a ? afocus(+b.dataset.a) : focus(+b.dataset.i);
  });
  el.addEventListener('click', (e) => {
    if (pre) return wake();
    const b = e.target.closest('.t-menu button');
    if (b) { if (ctl) back(); else { b.dataset.d ? dfocus(+b.dataset.d, true) : b.dataset.a ? afocus(+b.dataset.a, true) : focus(+b.dataset.i, true); ok(); } }
    else if (ctl && !e.target.closest('.t-ctl')) back();
    else if ((dmode || arena) && !e.target.closest('.t-band')) back();
  });
  // mouse parallax target (-1..1), eased in view()
  const ptr = { x: 0, y: 0, ex: 0, ey: 0 };
  el.addEventListener('pointermove', (e) => { ptr.x = e.clientX / innerWidth * 2 - 1; ptr.y = e.clientY / innerHeight * 2 - 1; });

  // ---- 3D stage (render-only; built on the first view, hidden on exit, kept for the session)
  let group = null, motes = null, t = 0, enterT = 0;
  const cast = [], glows = [];
  const pose = new Float32Array(POSE_SIZE), S0 = new THREE.Vector3(), P = new THREE.Vector3(), V = new THREE.Vector3(), Q = new THREE.Vector3();
  const E = new THREE.Box3(), A = new THREE.Box3();
  // left edge of the key art = right edge of the logo / menu band + a gutter (measured on resize, not per frame)
  let fitL = 0.45, fitLe = 0.45;   // measured, eased (the band widens for the difficulty panel: the frame glides, never jumps)
  const measure = () => {
    const r = $('.t-band').getBoundingClientRect(); if (r.width) fitL = Math.min(0.62, (r.right + innerHeight / 72 * 3) / innerWidth);
  };
  addEventListener('resize', measure);

  function build(scene) {
    group = new THREE.Group(); scene.add(group);
    for (const c of STAGE.cast) {
      const o = standOfficer(c.id, group), parts = [];
      o.rig.show = c.show || 0;
      heroLook(o.m.material, ...c.look);          // key-art grade: brighter camera-side fill, hot rim (title copies only)
      o.rig.root.traverse((e) => { if (e.isMesh) parts.push(e); });   // the body and what it holds, for the framing box
      cast.push(Object.assign(o, { c, parts, box: new THREE.Box3() }));
    }
    // data motes: soft round sprites, HDR green / cyan so they bloom; flicker via vertex colours
    const n = STAGE.motes, geo = new THREE.BufferGeometry(), seed = scatter(n * 4, 4.1).map(Math.abs);
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    motes = new THREE.Points(geo, new THREE.PointsMaterial({ map: dotTex(0.35, 0.5), size: 0.085, vertexColors: true,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    motes.userData.seed = seed; motes.frustumCulled = false;
    group.add(motes);
    for (const [x, y, z, sx, sy, r, g2, b] of GLOWS) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: motes.material.map, color: new THREE.Color(r, g2, b), blending: THREE.AdditiveBlending,
        transparent: true, depthWrite: false, fog: false }));
      sp.scale.set(sx, sy, 1); sp.userData.at = [x, y, z]; glows.push(sp); group.add(sp);
    }
  }

  function view(scene, camera, focus, dt) {
    if (!group) build(scene);
    group.visible = true;
    dt = Math.min(dt || 1 / 60, 0.1); t += dt;
    const S = STAGE, O = passPoint(S0, S.at);
    // narrower than 16:9 the art column shrinks: the line-up closes ranks (0 at 16:9, all of it at ≤ 4:3)
    const nk = Math.min(1, Math.max(0, (1.78 - camera.aspect) / 0.45));
    // fighters: a held frame of their own clip + breath (hips bob) and their secondary life
    for (let i = 0; i < cast.length; i++) {
      const o = cast[i], c = o.c, br = Math.sin(t * 1.5 + i * 2.1);
      sampleClip(o.K.clips[c.clip] || o.K.clips.idle, c.u, pose);
      pose[1] += br * 0.008; pose[9] += br * 0.02; pose[12] -= br * 0.015;
      P.set(O.x + c.x * (1 - 0.25 * nk), 0, O.z + c.z); P.y = ground(P.x, P.z);
      poseOfficer(o, pose, P, c.face + Math.sin(t * 0.4 + i) * 0.03, dt);
    }
    for (let i = 0; i < glows.length; i++) {
      const [x, y, z] = glows[i].userData.at;
      glows[i].position.set(O.x + x, O.y + y, O.z + z);
      const f = GLOWS[i][8] ?? 0.15, slow = f < 0.1;
      glows[i].material.opacity = 1 - f + f * (slow ? Math.sin(t * 0.7 + i) : Math.sin(t * (3 + i * 2.3)) * Math.sin(t * 7.1 + i));
    }
    // motes: a 16 × 5 × 12 m box round the line-up, rising with a lazy curl, flickering, wrapping at the top
    const ep = motes.geometry.attributes.position, ec = motes.geometry.attributes.color, sd = motes.userData.seed;
    for (let i = 0; i < S.motes; i++) {
      const a = sd[i * 4], b = sd[i * 4 + 1], c = sd[i * 4 + 2], d = sd[i * 4 + 3];
      const y = (b * 5 + t * (0.25 + c * 0.5)) % 5, life = y / 5;
      ep.setXYZ(i, O.x + 1 + (a - 0.5) * 16 + Math.sin(t * (0.6 + d) + i) * 0.3, O.y + y, O.z - 2.5 + c * 12 + Math.cos(t * 0.5 + i * 1.7) * 0.3);
      const f = (0.55 + 0.45 * Math.sin(t * (9 + d * 14) + i * 3.3)) * Math.sin(Math.PI * Math.min(1, life * 1.15)) * (0.6 + d);
      if (i % 3) ec.setXYZ(i, 0.5 * f, 3.6 * f, 1.4 * f); else ec.setXYZ(i, 0.6 * f, 2.8 * f, 4.2 * f);
    }
    ep.needsUpdate = true; ec.needsUpdate = true;

    // camera: fitted every frame to the line-up's posed bounds (any aspect): their union spans [fitL, S.fitR] of the
    // width, the highest point sits at S.fitT from the top and the floor line at S.fitK. The lens looks straight up the
    // hall (no yaw), tilted up from a low eye; then the enter push-in (easeOutCubic), a slow breathing drift and eased
    // mouse parallax.
    ptr.ex += (ptr.x - ptr.ex) * Math.min(1, dt * 2); ptr.ey += (ptr.y - ptr.ey) * Math.min(1, dt * 2);
    const aspect = camera.aspect, tH = Math.tan(S.fov * Math.PI / 360), tW = tH * aspect;
    // each extreme (highest point, leftmost, rightmost) is the part corner that projects farthest out from last frame's
    // lens (Q), fitted at that part's own nearer depth
    if (!Q.z) Q.set(O.x, O.y + S.eye, O.z - 7);
    let top = 0, topZ = 0, pLx = 0, pLz = 0, pRx = 0, pRz = 0, sT = -Infinity, sL = -Infinity, sR = Infinity;
    A.makeEmpty();
    for (const o of cast) {
      o.box.makeEmpty();
      for (const m of o.parts) if (m.visible) {
        E.makeEmpty().expandByObject(m); o.box.union(E);
        const d = 1 / Math.max(0.5, E.min.z - Q.z);
        if ((E.max.y - Q.y) * d > sT) { sT = (E.max.y - Q.y) * d; top = E.max.y; topZ = E.min.z; }
        if ((E.max.x - Q.x) * d > sL) { sL = (E.max.x - Q.x) * d; pLx = E.max.x; pLz = E.min.z; }
        if ((E.min.x - Q.x) * d < sR) { sR = (E.min.x - Q.x) * d; pRx = E.min.x; pRz = E.min.z; }
      }
      A.union(o.box);
    }
    const zA = A.min.z + 0.4;
    fitLe += (fitL - fitLe) * Math.min(1, dt * 3);
    const L = fitLe, R = S.fitR, kL = (0.5 - L) * 2 * tW, kR = (0.5 - R) * 2 * tW;
    const knee = O.y;
    const czW = (kL * pLz - kR * pRz - pLx + pRx) / (kL - kR);                           // width fit
    const czH = zA - (top - knee) / ((S.fitK - S.fitT) * 2 * tH);                        // height fit (at the front rank's depth)
    let cz = Math.min(czW, czH);
    const gL = 1 / (2 * (pLz - cz) * tW), gR = 1 / (2 * (pRz - cz) * tW);
    let cx = (pLx * gL + pRx * gR - (1 - L - R)) / (gL + gR);                           // span centred in [L, R]
    const k = Math.min(1, (t - enterT) / S.pushT), push = S.push * (1 - k) ** 3;
    cz -= push * (zA - cz);
    cx += Math.sin(t * 0.13) * 0.08 - ptr.ex * 0.06;
    const cy = O.y + S.eye + Math.sin(t * 0.11) * 0.04 + ptr.ey * 0.04;
    const tilt = Math.max(Math.atan((top - cy) / (topZ - cz)) - Math.atan((0.5 - S.fitT) * 2 * tH),
      Math.atan((knee - cy) / (zA - cz)) - Math.atan((0.5 - S.fitK) * 2 * tH));
    camera.fov = S.fov; camera.updateProjectionMatrix();
    camera.position.set(cx, cy, cz); Q.set(cx, cy, cz);
    camera.lookAt(V.set(cx, cy + Math.tan(tilt) * 10, cz + 10));
    camera.updateMatrixWorld();
    focus.set(O.x + S.cast[1].x, O.y + 1.2, O.z + S.cast[1].z);
    // name tags: over each fighter's head (the top centre of its posed box), clear of the frame edges
    const w = innerWidth, h = innerHeight, rem = h / 72;
    for (let i = 0; i < tags.length; i++) {
      const b = cast[i].box;
      V.set((b.min.x + b.max.x) / 2, Math.min(b.max.y, P.y + 2.6) + 0.12, (b.min.z + b.max.z) / 2).project(camera);
      const px = Math.max(8 * rem, Math.min(w - 8 * rem, (V.x * 0.5 + 0.5) * w));
      const py = Math.max(7 * rem, (0.5 - V.y * 0.5) * h);
      tags[i].style.transform = `translate(${px.toFixed(1)}px, ${py.toFixed(1)}px) translate(-50%, -100%)`;
    }
  }

  return {
    view,
    enter() {
      busy = false; clearStamp(el); dmode = null; arena = false; el.classList.remove('dif', 'arena'); setCtl(false);
      el.classList.toggle('pre', pre);
      focus(cur, true); btns[cur].classList.add('on');
      replay(el, 'in');                                                     // logo in
      enterT = t; measure();
      for (const m of cast) m.fresh = true;
      nav.start(); active = true;
    },
    exit() { nav.stop(); busy = false; active = false; if (group) group.visible = false; },
  };
}
