// DOM HUD: pixel portrait badge + long HP bar + 3-segment Overclock gauge (bottom band), K.O. count against the stage's
// goal with slam pops and a milestone every 50 (bottom right / upper third, held back during finishers), chain counter that
// rolls up hit by hit with ghost digits (left), boss target bar (top left) and stacked floating lieutenant / boss
// name/HP/▼▼ tags, square minimap with the control bar (top right), queued system banners and dialogue, a name/controls
// intro card, an objective line (top left), and an idle auto-fade.
// Character text / portraits come from game.hero.char (src/chars/index.js), refreshed on every 'scenario'. Dialogue,
// banners and the objective are driven by story events (story:say / story:banner / story:objective, core/events.js).
// Co-op (game.players has two to four): the HUD is the local player's (game.hero between steps = his, core/game.js); the
// K.O. count is the team's; every other player gets a small card under the minimap (portrait, HP, his K.O.s, the seconds
// until he is back up, PAUSED while his pause menu is open, or LEFT once he is gone), a name tag over his head and an arrow on the minimap; a knocked-out local player sees his own countdown.
// Hero events from the partner (his hits, his Overclock) leave this player's HUD alone (game.mine()).
// Render-only: reads sim state, never writes it. Animations are timed in sim frames.
// Styles live in index.html (#hud ...). Sizes are rem, and 1rem = 1/72 of the viewport height (10 px at 720p).
import { Vector3 } from 'three';
import { on } from '../core/events.js';
import { ST } from '../crowd/crowd.js';
import { ground, zoneAt, GATES, MAP, TERRAIN, ROUTE, walkIn } from '../world/map.js';
import { CHARS, paintPortrait, shoutOf } from '../chars/index.js';
import { REVIVE } from '../story/index.js';

// render-only seam: crowd view skips its 3D officer ▼ where the floating tags below take over
export const HUD_TAG_R = 44.7;

// Minimap layer: the active map's whole field drawn once per map, in the minimap's orientation (map up = +Z, up the field;
// +X is map-left, as the camera sees it at yaw 0), blitted around the hero every frame. Walkable floor pale with a bright
// rim where the walls stop you, the centre lane dotted, and the map's own overlays (MAP.minimap / MAP.minimapAfter).
// Gates, units and labels are drawn live over it.
const PPM = 2;                        // px per metre
// Minimap colours by the mission's theme (story/chapters.js `theme`; the DOM side: index.html body.forest): lane = the
// dotted route, bg / grid / ink / label = the panel, goal = the enemy HQ, cone = the view cone, ally = your side's dots,
// disc / me = the players' arrows.
const PAL = {
  hacker: { lane: 'rgba(70,255,138,0.5)', bg: 'rgba(6,10,16,0.88)', grid: 'rgba(120,210,230,0.12)', goal: '#ff3ea8', ink: 'rgba(232,251,255,0.9)',
    label: 'rgba(4,8,12,0.7)', cone: '200,240,255', ally: '#38e8ff', disc: 'rgba(8,30,38,0.85)', me: '#9ff4ff' },
  forest: { lane: 'rgba(155,224,90,0.5)', bg: 'rgba(10,16,8,0.88)', grid: 'rgba(200,220,150,0.12)', goal: '#ff7a3a', ink: 'rgba(251,247,230,0.9)',
    label: 'rgba(8,14,8,0.7)', cone: '255,244,200', ally: '#ffd75e', disc: 'rgba(24,30,8,0.85)', me: '#fff0b0' },
};
const layers = {};
/** { canvas, x1, z1, ppm }: canvas pixel (u, v) ↔ world (x1 - u / ppm, z1 - v / ppm). Built on first use per map. */
function minimapLayer(pal) {
  if (layers[MAP.id]) return layers[MAP.id];
  const G = TERRAIN, W = (G.x1 - G.x0) * PPM, H = (G.z1 - G.z0) * PPM;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d'), img = g.createImageData(W, H), d = img.data;
  for (let v = 0; v < H; v++) for (let u = 0; u < W; u++) {
    const x = G.x1 - (u + 0.5) / PPM, z = G.z1 - (v + 0.5) / PPM, s = walkIn(x, z), o = (u + v * W) * 4;
    const wet = MAP.wet ? MAP.wet(x, z) : false;
    if (s > 0) {                                                         // field: pale, bright rim at the edge
      const rim = s < 1.2;
      d[o] = 120; d[o + 1] = 210; d[o + 2] = 230; d[o + 3] = rim ? 190 : 70;
      if (wet) { d[o] = 120; d[o + 1] = 160; d[o + 2] = 170; d[o + 3] = 130; }   // the fords
    } else if (wet) { d[o] = 70; d[o + 1] = 120; d[o + 2] = 150; d[o + 3] = 120; }   // deep water
    else { d[o] = 4; d[o + 1] = 6; d[o + 2] = 10; d[o + 3] = Math.min(120, 40 - s * 4); }   // walls: darker the further out
  }
  g.putImageData(img, 0, 0);
  const X = (x) => (G.x1 - x) * PPM, Y = (z) => (G.z1 - z) * PPM;
  MAP.minimap?.(g, X, Y, PPM);
  // the centre lane, dotted
  g.strokeStyle = pal.lane; g.lineWidth = 1.5; g.setLineDash([4, 5]);
  g.beginPath(); ROUTE.forEach(([x, z], i) => (i ? g.lineTo(X(x), Y(z)) : g.moveTo(X(x), Y(z)))); g.stroke();
  g.setLineDash([]);
  MAP.minimapAfter?.(g, X, Y, PPM);
  return (layers[MAP.id] = { canvas: cv, x1: G.x1, z1: G.z1, ppm: PPM });
}

export function createHud(root, game, camera) {
  const nOff = game.crowd.N - game.crowd.grunts;                     // officer slots (crowd CROWD.officerSlots)
  root.innerHTML = `
    <div class="h-obj"><i>◆</i><b></b><small></small><span class="go"><i class="ar"></i><em></em></span></div>
    <div class="h-intro"><div class="nm"></div><i class="seal"></i><div class="role"></div>
      <div class="sub"></div>
      <div class="keys"></div></div>
    <div class="h-target"><i class="seal">TARGET</i><b></b><div class="bar"><em></em><i></i></div><strong>K.O.!</strong></div>
    <div class="h-map"><div class="morale"><i></i><span class="us">SQD</span><span class="them">BLK</span></div><canvas width="200" height="200"></canvas></div>
    <div class="h-offs">${'<div class="off"><i class="ld"></i><div class="mk">▼▼</div><div class="bd"><b></b><div class="bar"><em></em><i></i></div></div></div>'.repeat(nOff)}</div>
    <div class="h-chain"><div class="num"><b class="dig" data-t="0"><span>0</span></b><u></u><u></u><u></u></div><small>CHAIN</small></div>
    <div class="h-mile"><b class="dig" data-t="50"><span>50</span></b><i class="seal">K.O.</i></div>
    <div class="h-band"><p></p><small></small></div>
    <div class="h-dlg"><canvas width="20" height="20"></canvas><i class="dseal"></i><div><b></b><p></p></div></div>
    <div class="h-copy"></div>
    <div class="h-player"><div class="badge"><canvas width="20" height="20"></canvas></div><div class="name"></div>
      <div class="bar hp"><em></em><i></i></div>
      <div class="mu"><div><i></i></div><div><i></i></div><div><i></i></div><span>OVERCLOCK</span></div></div>
    ${[0, 1, 2].map((k) => `<div class="h-mate" style="--k:${k}"><canvas width="20" height="20"></canvas><b></b><small></small><div class="bar"><i></i></div></div>`).join('')}
    ${'<div class="h-mtag"></div>'.repeat(3)}
    <div class="h-down"><b>Knocked out</b><small></small></div>
    <div class="h-auto"><b>Auto mode</b>a bot is playing · Esc, then Resume to take over</div>
    <div class="h-ko"><div class="num"><b class="dig" data-t="0"><span>0</span></b><u>0</u></div><small>K.O. COUNT<em></em></small></div>`;
  const $ = (s) => root.querySelector(s), $$ = (s) => [...root.querySelectorAll(s)];
  const intro = $('.h-intro'), player = $('.h-player'), hpI = $('.hp i'), hpE = $('.hp em'), muSeg = $$('.mu i'), mu = $('.mu');
  const ko = $('.h-ko'), koB = $('.h-ko b'), koG = $('.h-ko u'), chain = $('.h-chain'), chainB = $('.h-chain b');
  const chainG = $$('.h-chain u').map((el) => ({ el, f: -99 }));          // ghost pool: one per tick, 3 alive in a roll
  const mile = $('.h-mile'), mileB = $('.h-mile b'), mileS = $('.h-mile .seal');
  const band = $('.h-band'), bandP = $('.h-band p'), bandS = $('.h-band small');
  const dlg = $('.h-dlg'), dlgP = $('.h-dlg p'), copy = $('.h-copy'), koGoal = $('.h-ko small em');
  const target = $('.h-target'), targetB = $('.h-target b'), targetI = $('.h-target .bar i'), targetE = $('.h-target .bar em');
  const offs = $$('.off').map((el) => ({ el, bd: el.querySelector('.bd'), mk: el.querySelector('.mk'), ld: el.querySelector('.ld'),
    nm: el.querySelector('b'), bar: el.querySelector('.bar i'), lagEl: el.querySelector('.bar em'), lag: 1 }));
  const obj = $('.h-obj'), objB = $('.h-obj b'), objS = $('.h-obj small'), dlgCv = $('.h-dlg canvas'), dlgN = $('.h-dlg b');
  const objGo = $('.h-obj .go'), objAr = $('.h-obj .ar'), objD = $('.h-obj .go em'), dlgSeal = $('.h-dlg .dseal');
  const moraleI = $('.morale i'), mapEl = $('.h-map'), autoEl = $('.h-auto');
  const down = $('.h-down'), downS = $('.h-down small'), mtags = $$('.h-mtag');
  const mates = $$('.h-mate').map((el) => ({ el, cv: el.querySelector('canvas'), nm: el.querySelector('b'), sm: el.querySelector('small'), bar: el.querySelector('.bar i') }));
  const partners = () => game.players.filter((p) => p.i !== game.me);   // co-op: the other players (up to three)
  const mapCv = $('.h-map canvas'), map = mapCv.getContext('2d');
  const offName = (i) => game.crowd.offName[i - game.crowd.grunts] || 'LIEUTENANT';

  // ---- event-driven state (frames are sim frames), rebuilt on every 'scenario' (game.frame restarts at 0)
  const S = {};
  let pal = PAL.hacker;
  const reset = () => {
    pal = PAL[game.story.chapter?.theme] || PAL.hacker;
    Object.assign(S, {
      lastCombo: 0, shownChain: 0, chainF: -99, chainQ: [], ghostN: 0, shownKo: 0, koF: -99, mile: 0, mileQ: 0, mileF: -99, busyF: -99,
      lagHp: 1, lastF: 0, hurtF: -99, actF: 0, band: null, bandQ: [], dlg: null, waveF: -999, allyF: -999, tgt: -1, tgtF: -999, tgtKoF: -999,
      musouF: -999, musouEnd: -999, waves: [], introCut: 0, obj: null,
    });
    const ch = game.hero.char;                                        // character text + portraits
    text($('.h-intro .nm'), ch.name); text($('.h-intro .seal'), ch.role); text($('.h-intro .role'), ch.weapon.toUpperCase());
    text($('.h-intro .sub'), ch.motto); text($('.h-player .name'), ch.name);
    root.style.setProperty('--acc', ch.accent);
    $('.h-copy').innerHTML = ch.lines.copy.map((l) => `<span>${l}</span>`).join('');
    $('.h-intro .keys').innerHTML = `<kbd>WASD</kbd> move · <kbd>J</kbd> attack · <kbd>K</kbd> charge (mid-combo: finisher)<br>
      <kbd>Space</kbd> jump · <kbd>L</kbd> dodge · <kbd>I</kbd> Overclock · <kbd>R</kbd> recenter · <kbd>H</kbd> show / hide this card`;
    paintPortrait($('.h-player canvas'), ch);
    partners().forEach((pm, k) => {                                     // co-op: the others' cards and tags
      const mc = pm.hero.char, M = mates[k];
      if (!M) return;
      paintPortrait(M.cv, mc); text(M.nm, mc.name); text(mtags[k], `P${pm.i + 1} · ${mc.name}`);
      M.el.style.setProperty('--macc', mc.accent); mtags[k].style.setProperty('--macc', mc.accent);
    });
    // the control bar's two sides (the active stage's; story/chapters.js)
    const sides = game.story.chapter?.sides || { us: 'SQD', them: 'BLK' };
    text($('.morale .us'), sides.us); text($('.morale .them'), sides.them);
    for (const g of chainG) g.f = -99;
    for (const o of offs) o.lag = 1;
  };
  on('scenario', reset);
  // heavy numerals: the rim layer (::before) reads data-t, the gradient face is the inner span
  const num = (el, v) => { v = String(v); if (el.dataset.t !== v) { el.dataset.t = v; el.firstChild.textContent = v; } };
  let showKeys = null;
  // system banners queue (one at a time, held back while the Musou plays); dialogue (top left) and the banner band
  // (y 64-70 %) sit apart, so neither cancels the other. Dialogue holds 5 s like DW8.
  // big: the boss / round banners (larger type in the same band)
  // pri: 0 officer KO / wave, 1 story, 2 big story. The queue stays sorted by pri (FIFO within one); when full the lowest
  // (newest of the lowest) is dropped, never a higher one. A big story banner flushes queued pri-0 chatter and cuts a
  // pri-0 band in play, so the stage payoff shows at once, inside the victory slow-mo.
  const banner = (html, sub, dur = 150, big = false, pri = 0) => {
    const q = S.bandQ;
    if (pri >= 2) { for (let k = q.length - 1; k >= 0; k--) if (!q[k].pri) q.splice(k, 1); if (S.band && !S.band.pri) S.band = null; }
    let k = q.length; while (k > 0 && q[k - 1].pri < pri) k--;
    q.splice(k, 0, { html, sub, dur, big, pri });
    if (q.length > 3) q.splice(q.reduce((m, e, j) => (e.pri <= q[m].pri ? j : m), 0), 1);
  };
  // dialogue: speaker name (default: the hero); portrait = CHARS id (default: the hero's) or {seal: tag} (the MC and the
  // bosses: a tag chip instead of a face). side 'them' turns the panel's rule and name red (an enemy speaking).
  const say = (line, dur = 300, speaker = game.hero.char.name, portrait = game.hero.char.id, side = 'us') => {
    S.dlg = { text: line, f: game.frame, dur };
    text(dlgN, speaker.toUpperCase());
    const seal = portrait.seal;
    if (!seal) paintPortrait(dlgCv, CHARS[portrait]);
    set(dlgCv, 'display', seal ? 'none' : '');
    set(dlgSeal, 'display', seal ? 'block' : 'none'); if (seal) text(dlgSeal, seal);
    dlg.classList.toggle('foe', side === 'them');
  };
  // a line's text holds for its sim duration, or as long as its voice clip runs (audio/lines.js), whichever is longer
  const spoken = (who, text, dur) => Math.max(dur, game.audio ? game.audio.lineFrames(who, text) + 24 : 0);
  on('story:say', (e) => say(e.text, spoken(e.who, e.text, e.dur ?? 300), e.speaker, e.portrait, e.side));
  on('story:banner', (e) => banner(e.html, e.sub || '', e.dur ?? 150, !!e.big, e.big ? 2 : 1));
  on('story:objective', (e) => { S.obj = e.text ? { text: e.text, f: game.frame } : null; if (S.obj) text(objB, e.text); });
  on('crowd:wave', (e) => {
    const nm = game.story.chapter?.sides?.names || { us: 'Your squad', them: 'Black-hat' };
    if (game.frame - S.waveF > 600) { S.waveF = game.frame; banner(`<em>${nm.them}</em> reinforcements`, `More ${game.story.chapter?.foes || 'challengers'} rush in`, 130); }
    S.waves.push({ x: e.x, z: e.z, f: game.frame });
  });
  on('crowd:allies', (e) => {
    const nm = game.story.chapter?.sides?.names || { us: 'Your squad', them: 'Black-hat' };
    if (game.frame - S.allyF > 900) { S.allyF = game.frame; banner(`<em>${nm.us}</em> joins the fight`, 'Reinforcements at your back', 120); }
    S.waves.push({ x: e.x, z: e.z, f: game.frame, ally: true });
  });
  on('hit', (e) => { if (!game.mine()) return; S.actF = game.frame; if (e.officer) { S.tgt = e.i; S.tgtF = game.frame; } });
  on('attack:start', () => { if (game.mine()) S.actF = game.frame; });
  on('ko', (e) => {
    if (!e.officer || game.crowd.boss[e.i]) return;                   // the stage announces its bosses itself (big banner)
    banner(`<em>${offName(e.i)}</em> knocked out`, 'Lieutenant down', 150);
    S.tgt = e.i; S.tgtKoF = game.frame;
  });
  on('musou:start', () => { if (!game.mine()) return; S.musouF = S.actF = game.frame; S.band = null; S.dlg = null; });
  on('musou:end', () => { if (!game.mine()) return; S.musouEnd = game.frame; const t = shoutOf(game.hero.char, game.chapter); say(t, spoken(game.hero.char.id, t, 300)); S.dlg.f += 20; });
  on('hero:hurt', () => { if (game.mine()) S.hurtF = S.actF = game.frame; });
  addEventListener('keydown', (e) => { if (e.code === 'KeyH') showKeys = !(showKeys ?? true); });

  const set = (el, prop, v) => { if (el.style[prop] !== v) el.style[prop] = v; };
  const text = (el, v) => { v = String(v); if (el.textContent !== v) el.textContent = v; };
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const mileOf = (n) => (n < 50 ? (n >= 25 ? 25 : 0) : Math.floor(n / 50) * 50);   // last KO milestone reached
  const v3 = new Vector3();
  reset();

  return {
    update() {
      const h = game.hero, f = game.frame, c = game.crowd, kos = game.kos();   // the K.O. count is the team's (co-op)
      const W = root.clientWidth, H = root.clientHeight;
      const df = Math.max(0, f - S.lastF); S.lastF = f;
      const inMusou = h.state === 'musou';

      // intro card (title + controls): first 3.5 s of a scenario; H toggles the controls back
      // (an officer tag that would land on the card fades it out instead of being shoved aside: S.introCut, set below)
      const introA = showKeys === false || S.musouF >= 0 ? 0 : clamp01((180 - f) / 30) * (1 - S.introCut);
      set(intro, 'opacity', (showKeys ? 1 : introA).toFixed(2));

      // idle auto-fade (quieter than DW8 at rest): 4 s after the last attack/hit/hurt, the player band, minimap and KO
      // count ease to 55 % over 40 f; the next action snaps them back. A full musou gauge keeps the band lit.
      const calm = 1 - 0.45 * clamp01((f - S.actF - 240) / 40) * (game.musou.ready() ? 0 : 1);
      set(player, 'opacity', calm.toFixed(2)); set(mapEl, 'opacity', calm.toFixed(2));

      // HP (teal, white lag bar) + 3-segment musou gauge
      const hp = h.hp / h.hpMax;
      S.lagHp = f - S.hurtF < 20 ? S.lagHp : Math.max(hp, S.lagHp - 0.008 * df);
      if (S.lagHp < hp) S.lagHp = hp;
      set(hpI, 'transform', `scaleX(${hp.toFixed(4)})`);
      set(hpE, 'transform', `scaleX(${S.lagHp.toFixed(4)})`);
      player.classList.toggle('low', hp < 0.3);
      player.classList.toggle('hurt', f - S.hurtF < 12);
      const m3 = h.musou / h.musouMax * 3;
      muSeg.forEach((el, k) => set(el, 'transform', `scaleX(${(Math.floor(clamp01(m3 - k) * 32) / 32).toFixed(4)})`));  // pixel-stepped fill
      const full = game.musou.ready() && !inMusou;                   // musou part r3: ready at one full segment (one Musou spends one)
      mu.classList.toggle('full', full);
      if (full) {                                                    // ready: glow pulse + glint sweeping the 3 segments
        mu.style.setProperty('--p', (0.5 + 0.5 * Math.sin(f * 0.12)).toFixed(2));
        const sw = (f % 90) / 50 * 3.6 - 0.3;
        muSeg.forEach((el, k) => el.style.setProperty('--s', `${((sw - k) * 100).toFixed(1)}%`));
      }
      mu.classList.toggle('active', inMusou);

      // chain counter (left). Combat resolves a whole swing's hits on one sim frame, so the shown number rolls up to
      // h.combo in DW8-style ticks instead of jumping: one tick every 2 f, the first on the hit frame, front-loaded steps
      // (+4 +3 +3 +2 +2 +2 for a 16-hit sweep). Each hit batch is queued as [frame, combo] and shown within 10 f (6 ticks),
      // so a long Musou stream never falls behind. Every tick spawns a ghost of the new last digit (pool of 3, so a roll
      // leaves a trail): 1.45× up-right with a smear, merging into the number in 6 f.
      if (h.combo < S.shownChain) { S.shownChain = 0; S.chainF = -99; S.chainQ.length = 0; }   // chain broke: roll from 0
      if (h.combo !== S.lastCombo) { if (h.combo > S.lastCombo) S.chainQ.push([f, h.combo]); S.lastCombo = h.combo; }
      if (h.combo > S.shownChain && f - S.chainF >= 2) {
        const prev = S.shownChain;
        let step = Math.floor((h.combo - prev) * 0.3);
        for (const [F, C] of S.chainQ) step = Math.max(step, Math.ceil((C - prev) / Math.max(1, ((F + 10 - f) >> 1) + 1)));
        S.shownChain = Math.min(h.combo, prev + Math.max(1, step));
        while (S.chainQ.length && S.chainQ[0][1] <= S.shownChain) S.chainQ.shift();
        S.chainF = f; num(chainB, S.shownChain);
        const g = chainG[S.ghostN++ % chainG.length];
        text(g.el, S.shownChain % 10); g.f = f;                                      // DW8 ghosts the last digit
      }
      const ct = f - S.chainF;
      set(chain, 'opacity', h.combo > 1 ? Math.min(1, h.comboT / 24).toFixed(2) : '0');
      set(chainB, 'transform', `scale(${(1 + 0.14 * clamp01(1 - ct / 4)).toFixed(3)})`);
      chainG.forEach((g, k) => {                // holds up-right, then slides in; a superseded ghost dims to a smear
        const a = (f - g.f) / 6, e = a < 1 ? 1 - a * a : 0, newest = k === (S.ghostN - 1) % chainG.length;
        set(g.el, 'opacity', (0.95 * e * (newest ? 1 : 0.35)).toFixed(2));
        set(g.el, 'transform', `translate(${(e * 0.52).toFixed(3)}em, ${(-e * 0.3).toFixed(3)}em) scale(${(1 + 0.45 * e).toFixed(3)})`);
      });

      // KO count (bottom right) counts up in DW8-style batches: every slam (>= 4 f apart) adds the KOs since the last
      // one (a big Musou batch as +10/+15 slams, caught up within ~8 f), lands at ~3× and settles in 7 f, then a ghost
      // rings out. The milestone fires on the true count, on the KO frame, and only the highest one crossed (a mass KO
      // from 18 to 54 shows "50", not "25" then "50"): every 50 like DW8, plus an early first one at 25 outside Musou.
      if (kos < S.shownKo) S.shownKo = kos;
      if (kos > S.shownKo && f - S.koF >= 4) {
        const gap = kos - S.shownKo;
        S.shownKo += gap <= 10 ? gap : Math.max(10, Math.ceil(gap / 10) * 5);
        S.koF = f; num(koB, S.shownKo); text(koG, S.shownKo);
      }
      const m = mileOf(kos);
      if (m < S.mile) S.mile = S.mileQ = m;
      if (m > S.mile) { S.mile = m; num(mileB, m); }                    // queued: shows the highest one crossed
      // held back while a charge finisher or the Musou payoff owns the screen (+ ~0.4 s for its blast to clear)
      if (inMusou || (h.move && (h.move[0] === 'c' || h.move === 'jc'))) S.busyF = f;
      if (S.mile > S.mileQ && f - S.busyF > 24 && f - S.musouEnd > 24) {
        S.mileQ = S.mile; S.mileF = f;
        S.shownKo = kos; S.koF = f; num(koB, kos); text(koG, kos);  // the corner count slams to the true total with it
      }
      const kt = f - S.koF, slam = clamp01(1 - kt / 7);
      set(koB, 'transform', `scale(${(1 + 0.45 * slam * slam).toFixed(3)})`);   // the slam stays inside its corner box
      const ring = kt >= 5 && kt < 20 ? (kt - 5) / 15 : 1;
      set(koG, 'opacity', ((1 - ring) * 0.55).toFixed(2));
      set(koG, 'transform', `scale(${(1 + ring * 0.35).toFixed(3)})`);
      set(ko, 'opacity', S.shownKo === 0 ? '0' : Math.min(calm, f - S.koF > 300 ? 0.7 : 1).toFixed(2));   // hidden until the first KO

      // KO milestone (upper third, right of centre: off the fighting space), DW8 timing (~0.3 s): slams in solid at 1.7× → 1 over 3 f with a white-hot flash, holds to
      // f 11, then slides left and fades out by f 18. The K.O. chip stamps down at f 2.
      const mt = f - S.mileF;
      if (mt < 19) {
        const k = clamp01(1 - mt / 3), fl = clamp01(1 - mt / 5);
        set(mile, 'opacity', ((mt < 11 ? 1 : 1 - (mt - 11) / 7)).toFixed(2));
        set(mile, 'transform', `translate(${(mt < 11 ? 0 : -(mt - 11) * 0.36).toFixed(2)}rem, 0) scale(${(1 + 0.7 * k * k).toFixed(3)})`);
        set(mile, 'filter', fl > 0 ? `brightness(${(1 + 0.9 * fl).toFixed(2)})` : 'none');
        const st = mt - 2;
        set(mileS, 'opacity', st < 0 ? '0' : '1');
        set(mileS, 'transform', `rotate(-6deg) scale(${(1 + 0.5 * clamp01(1 - st / 2)).toFixed(3)})`);
      } else set(mile, 'opacity', '0');

      // system banner (story: full-width band, y 64-70 %; pri-0 chatter — waves, officer KOs — a narrow strip up at y 27 %) and dialogue (portrait + 2 lines, top left: keeps the centre clear)
      if ((!S.band || f - S.band.f >= S.band.dur) && S.bandQ.length && !inMusou) S.band = { ...S.bandQ.shift(), f };
      const b = S.band, bt = b ? f - b.f : 1e9;
      if (b && bt < b.dur) {
        if (bandP.dataset.h !== b.html) { bandP.dataset.h = b.html; bandP.innerHTML = b.html; text(bandS, b.sub); band.classList.toggle('big', b.big); band.classList.toggle('lo', !b.pri); }
        set(band, 'opacity', Math.min(1, bt / 6, (b.dur - bt) / 18).toFixed(2));
        set(band, 'transform', `scaleY(${Math.min(1, 0.3 + bt / 6).toFixed(3)})`);
      } else set(band, 'opacity', '0');
      const d = S.dlg, dt = d ? f - d.f : -1, dlgA = d && dt >= 0 && dt < d.dur ? Math.min(1, dt / 8, (d.dur - dt) / 16) : 0;
      if (dlgA > 0) {
        text(dlgP, d.text);
        set(dlg, 'opacity', dlgA.toFixed(2));
        set(dlg, 'transform', `translateX(${(-Math.max(0, 1 - dt / 8) * 2).toFixed(2)}rem)`);
      } else set(dlg, 'opacity', '0');
      // objective (top left, above the target bar): fades in over 12 f, hidden while the intro card or a Musou is up; a new
      // one flares gold for 1.5 s. The arrow after it points (camera-relative: up = where the camera looks, screen right
      // = -X) at game.story.target with the distance, and hides within 8 m.
      set(obj, 'opacity', S.obj && !inMusou ? (Math.min(1, (f - S.obj.f) / 12) * (1 - introA)).toFixed(2) : '0');
      obj.classList.toggle('new', !!S.obj && f - S.obj.f < 90);
      const goT = S.obj && game.story.target, goD = goT ? Math.hypot(goT.x - h.x, goT.z - h.z) : 0;
      set(objGo, 'opacity', goT && goD > 8 ? '1' : '0');
      if (goT && goD > 8) {
        set(objAr, 'transform', `rotate(${(game.cam.yaw - Math.atan2(goT.x - h.x, goT.z - h.z)).toFixed(3)}rad)`);
        text(objD, `${Math.round(goD)} m`);
      }
      // the objective's K.O. goal: progress after the line, and the corner count reads "/ goal" of the whole stage
      const goal = game.story.goal || 0;
      text(objS, S.obj && goal ? `${Math.min(kos, goal)} / ${goal}` : '');
      text(koGoal, game.story.chapter?.GOAL && game.mode === 'story' ? ` / ${game.story.chapter.GOAL}` : '');

      // co-op: the partner's card (under the minimap) and the tag over his head; the local player's knock-out countdown
      const others = partners();
      let standing = 0;
      for (let k = 0; k < mates.length; k++) {
        const pm0 = others[k], M = mates[k], tag = mtags[k];
        set(M.el, 'opacity', pm0 ? (pm0.hero.gone ? 0.45 : calm).toFixed(2) : '0');
        set(tag, 'opacity', '0');
        if (!pm0) continue;
        const q = pm0.hero, back = Math.max(0, Math.ceil((REVIVE - (f - q.downF)) / 60));
        if (!q.dead) standing++;
        set(M.bar, 'transform', `scaleX(${(q.hp / q.hpMax).toFixed(3)})`);
        // (game.ping: main.js — the session's round trip, on the first card)
        text(M.sm, q.gone ? `LEFT · K.O. ${q.kos}` : q.dead ? (h.dead ? 'DOWN' : `DOWN · back in ${back} s`) : `${q.afk ? (q.away ? 'AWAY · ' : 'PAUSED · ') : ''}K.O. ${q.kos}${game.ping && !k ? ` · ${game.ping} ms` : ''}`);
        M.el.classList.toggle('low', q.hp < q.hpMax * 0.3); M.el.classList.toggle('down', q.dead); M.el.classList.toggle('afk', !!q.afk && !q.dead);
        if (q.gone) continue;
        v3.set(q.x, q.y + ground(q.x, q.z) + 2.15, q.z).project(camera);
        const sx = (v3.x + 1) / 2, sy = (1 - v3.y) / 2;
        if (v3.z < 1 && sx > 0.02 && sx < 0.98 && sy > 0.02 && sy < 0.9 && !inMusou) {
          set(tag, 'opacity', '0.9');
          set(tag, 'transform', `translate(${(sx * W).toFixed(1)}px, ${(sy * H).toFixed(1)}px) translate(-50%, -100%)`);
        }
      }
      const mineDown = h.dead && game.players.length > 1;
      set(down, 'opacity', mineDown ? '1' : '0');
      set(autoEl, 'opacity', game.auto ? '1' : '0');                 // (game.auto: main.js — the bot has this player's controls)
      if (mineDown) text(downS, standing ? `BACK ON YOUR FEET IN ${Math.max(0, Math.ceil((REVIVE - (f - h.downF)) / 60))} S` : 'THE TEAM IS DOWN');

      // musou: vertical calligraphy copy on the right (concept) while the musou runs
      const mf = f - S.musouF, me = f - S.musouEnd;
      const copyA = inMusou || me < 30 ? Math.min(clamp01((mf - 8) / 14), me >= 0 && me < 30 ? 1 - me / 30 : 1) : 0;
      set(copy, 'opacity', copyA.toFixed(2));

      // officer target bar (top left): last officer hit (10 s) or the nearest officer within 9 m
      let tg = S.tgt >= 0 && c.st[S.tgt] !== ST.OFF && (f - S.tgtF < 600 || f - S.tgtKoF < 70) ? S.tgt : -1;
      if (tg < 0) {
        let bd = 81;
        for (let i = c.grunts; i < c.N; i++) {
          if (c.st[i] === ST.OFF || c.st[i] === ST.DEAD) continue;
          const d2 = (c.x[i] - h.x) ** 2 + (c.z[i] - h.z) ** 2;
          if (d2 < bd) { bd = d2; tg = i; }
        }
      }
      const tKo = tg >= 0 && f - S.tgtKoF < 70 && tg === S.tgt;
      set(target, 'opacity', tg >= 0 && introA < 0.5 ? (tKo ? clamp01((70 - (f - S.tgtKoF)) / 20) : 1).toFixed(2) : '0');
      if (tg >= 0) {
        text(targetB, offName(tg));
        const th = clamp01(c.hp[tg] / c.hpMax[tg]);
        set(targetI, 'transform', `scaleX(${th.toFixed(4)})`);
        set(targetE, 'transform', `scaleX(${Math.max(th, 1 - clamp01((f - S.tgtF) / 40) * (1 - th)).toFixed(4)})`);
        target.classList.toggle('ko', tKo);
      }

      // floating officer tags (DW8): ▼▼ right on the officer's head top, name + red HP bar stacked above it. Every
      // on-screen officer within 45 m gets one, scaled by camera distance (k 0.7-1, so CJK stays ≥ 17 px and Latin ≥ 9 px
      // at 720p) and faded out over the last 5 m. Only the tag body is ever moved — clear of the screen top, the target
      // bar, the intro card, the dialogue and the minimap (it slides left of the map instead of vanishing) — and when it
      // has to leave the ▼▼, a thin leader ties it back to the officer. Overlapping bodies stack: the lowest (nearest)
      // keeps its spot, the next lifts above it, or slides beside it when there is no room above.
      const rem = H / 72, tags = [];
      let clash = false;
      const mapL = W * 0.976 - 22.5 * rem, mapB = 26 * rem;
      const zones = [];                                                   // [right edge, bottom] of top-left HUD blocks
      if (tg >= 0 && introA < 0.5) zones.push([2.6 * rem + W * 0.36 + 2 * rem, 8.5 * rem]);
      if (dlgA > 0) zones.push([dlg.offsetLeft + dlg.offsetWidth - 4 * rem, dlg.offsetTop + dlg.offsetHeight + rem]);   // minus the fade tail
      const place = (o) => {                                              // keep a body inside the free screen area
        o.bx = Math.max(o.tw / 2 + rem, Math.min(W - o.tw / 2 - rem, o.bx));
        if (o.bx + o.tw / 2 > mapL && o.by - o.th < mapB) o.bx = mapL - o.tw / 2 - 0.5 * rem;
        let top = 1.5 * rem;
        for (const [r, bt] of zones) {                                  // below the block, unless that would drop the
          if (o.bx - o.tw / 2 >= r) continue;                             // body onto the officer: then beside it
          if (bt + o.th > o.ay - o.mkH + rem) o.bx = r + o.tw / 2 + 0.5 * rem; else top = Math.max(top, bt);
        }
        o.by = Math.min(H * 0.8, Math.max(o.by, top + o.th));
        return top;
      };
      offs.forEach((o, j) => {
        const i = c.grunts + j;
        o.show = false;
        if (inMusou) return;                                          // r5: the Musou cut is clean (a tag sat on the dragon's face)
        if (i >= c.N || c.st[i] === ST.OFF || c.st[i] === ST.DEAD) return;
        const dist = Math.hypot(c.x[i] - h.x, c.z[i] - h.z);
        if (dist >= HUD_TAG_R) return;                               // faded out (alpha < 0.05)
        // ▼▼ on the helmet crest (2.3 m standing); a reacting officer bends or falls, so the anchor eases down with him
        const st = c.st[i], hy = st === ST.HURT || st === ST.KNOCK ? 1.7 : st === ST.AIR ? 1.3 : st === ST.DOWN || st === ST.GETUP ? 1.1 : 2.3;
        o.hy = o.hy == null || df > 30 ? hy : o.hy + (hy - o.hy) * (1 - 0.7 ** df);
        v3.set(c.x[i], c.y[i] + o.hy + ground(c.x[i], c.z[i]), c.z[i]);
        text(o.nm, offName(i));
        const k = Math.max(0.7, Math.min(1, 14 / v3.distanceTo(camera.position)));
        v3.project(camera);
        const sx = (v3.x + 1) / 2, sy = (1 - v3.y) / 2;
        if (v3.z >= 1 || sx < 0.02 || sx > 0.98 || sy < -0.3 || sy > 0.9) return;
        Object.assign(o, { show: true, k, ax: sx * W, ay: sy * H, mkH: 1.6 * rem * k, tw: 22 * rem * k, th: 5.5 * rem * k, a: clamp01((45 - dist) / 5) * (mt < 19 ? 0.25 : 1) });   // step back under the KO milestone
        o.bx = o.ax; o.by = o.ay - o.mkH;
        if (o.ax - o.tw / 2 < 50 * rem && o.by - o.th < 21 * rem) clash = true;   // natural spot on the intro card
        place(o); tags.push(o);
        const hpF = clamp01(c.hp[i] / c.hpMax[i]);
        o.lag = hpF > o.lag ? hpF : Math.max(hpF, o.lag - 0.006 * df);  // white damage chunk drains after the hit
        set(o.bar, 'transform', `scaleX(${hpF.toFixed(4)})`);
        set(o.lagEl, 'transform', `scaleX(${o.lag.toFixed(4)})`);
      });
      if (f - S.tgtF < 600 || f - S.tgtKoF < 70 || S.dlg) clash = true;   // … and a dialogue line takes the corner too           // an officer fight: the target bar needs the corner
      S.introCut = clamp01(S.introCut + (clash ? 0.15 : -0.05) * df);
      tags.sort((a, b) => b.ay - a.ay);
      for (let k = 1; k < tags.length; k++) {
        for (let q = 0, n = 0; q < k && n < 12; q++) {
          const o = tags[k], p = tags[q];
          if (Math.abs(o.bx - p.bx) < (o.tw + p.tw) / 2 && o.by - o.th < p.by && p.by - p.th < o.by) {
            const lifted = p.by - p.th - 0.3 * rem;
            if (lifted - o.th >= place({ ...o, by: lifted })) o.by = lifted;
            else o.bx = p.bx + (o.bx < p.bx ? -1 : 1) * ((o.tw + p.tw) / 2 + 0.5 * rem);
            place(o);
            q = -1; n++;                                                  // moved: re-check against every placed tag
          }
        }
      }
      for (const o of offs) {
        set(o.el, 'opacity', o.show ? o.a.toFixed(2) : '0');
        if (!o.show) continue;
        set(o.el, 'transform', `translate(${o.ax.toFixed(1)}px, ${o.ay.toFixed(1)}px)`);
        set(o.bd, 'transform', `translate(${(o.bx - o.ax).toFixed(1)}px, ${(o.by - o.ay).toFixed(1)}px) scale(${o.k.toFixed(3)})`);
        const hidden = (o.ax > W * 0.976 - 20.5 * rem && o.ay < mapB) || o.ay < 0;   // ▼▼ under the minimap / above the screen
        set(o.mk, 'opacity', hidden ? '0' : '1');
        set(o.mk, 'transform', `translateX(-50%) scale(${o.k.toFixed(3)})`);
        const vx = o.bx - o.ax, vy = o.by - (o.ay - o.mkH), L = Math.hypot(vx, vy);
        set(o.ld, 'opacity', L > rem && !hidden ? '1' : '0');
        if (L > rem) set(o.ld, 'transform', `translate(0, ${(-o.mkH).toFixed(1)}px) rotate(${Math.atan2(vx, -vy).toFixed(3)}rad) scaleY(${L.toFixed(1)})`);
      }

      // control bar (your squad vs the black hats) from K.O.s against the enemies still standing
      let alive = 0;
      for (let i = 0; i < c.N; i++) if (c.st[i] !== ST.OFF && c.st[i] !== ST.DEAD) alive++;
      // championship: the director's value (round clears raise it)
      set(moraleI, 'transform', `scaleX(${(game.story.morale ?? 0.3 + 0.65 * kos / (kos + alive + 1)).toFixed(4)})`);

      // minimap: 30 m around the hero, north = up the hall (camera yaw 0; map right = -X), the whole field
      // (minimapLayer above: walkable ground, cliffs, river, castle wall, road), 10 m grid, closed gates in red, the
      // enemy HQ on the summit pinned to the rim while it is off the map, the current zone's name along the bottom;
      // units, view cone, reinforcement pings; officers off the map are pinned to its edge
      const R = 30, s = 100 / R, X = (x) => 100 - (x - h.x) * s, Y = (z) => 100 - (z - h.z) * s;
      map.clearRect(0, 0, 200, 200);
      map.fillStyle = pal.bg; map.fillRect(0, 0, 200, 200);   // near-opaque: bright lights must not read through
      const L = minimapLayer(pal);
      map.drawImage(L.canvas, (L.x1 - h.x - R) * L.ppm, (L.z1 - h.z - R) * L.ppm, 2 * R * L.ppm, 2 * R * L.ppm, 0, 0, 200, 200);
      map.strokeStyle = pal.grid; map.lineWidth = 1; map.beginPath();
      for (let g = Math.ceil((h.x - R) / 10) * 10; g <= h.x + R; g += 10) { map.moveTo(X(g) + 0.5, 0); map.lineTo(X(g) + 0.5, 200); }
      for (let g = Math.ceil((h.z - R) / 10) * 10; g <= h.z + R; g += 10) { map.moveTo(0, Y(g) + 0.5); map.lineTo(200, Y(g) + 0.5); }
      map.stroke();
      map.fillStyle = '#e0412c';
      for (const id in GATES) {
        const g = GATES[id].rect;
        if (!GATES[id].open) map.fillRect(X(g[2]), Y(g[3]), (g[2] - g[0]) * s, Math.max(3, (g[3] - g[1]) * s));
      }
      const hqX = X(MAP.hq[0]), hqY = Y(MAP.hq[1]), hqName = MAP.hqName || 'HQ';   // the map's goal: the mainframe
      map.font = '700 12px "Courier New", monospace'; map.textAlign = 'center';
      if (hqX < 8 || hqX > 192 || hqY < 8 || hqY > 192) {           // enemy HQ beyond the map: pin it to the rim
        const dx = hqX - 100, dy = hqY - 100, k = 90 / Math.max(Math.abs(dx), Math.abs(dy)), px = 100 + dx * k, py = 100 + dy * k, a = Math.atan2(dx, -dy);
        map.save(); map.translate(px, py); map.rotate(a);
        map.fillStyle = pal.goal; map.beginPath(); map.moveTo(0, -7); map.lineTo(-5, 1); map.lineTo(5, 1); map.fill();
        map.restore();
        map.fillStyle = pal.ink;
        map.fillText(hqName, Math.max(18, Math.min(182, px - dx * 0.16)), Math.max(18, Math.min(186, py - dy * 0.16 + 5)));
      } else {
        map.fillStyle = pal.goal; map.fillRect(hqX - 4, hqY - 4, 8, 8);
        map.fillStyle = pal.ink; map.fillText(hqName, hqX, hqY - 8);
      }
      const zn = zoneAt(h.x, h.z);
      if (zn) S.zone = zn;
      if (S.zone) {
        map.fillStyle = pal.label; map.fillRect(0, 178, 200, 22);
        map.font = '700 13px "Courier New", monospace'; map.fillStyle = pal.ink;
        map.fillText(S.zone.name.toUpperCase(), 100, 194);
      }
      S.waves = S.waves.filter((w) => f - w.f < 120);
      for (const w of S.waves) {
        const t = (f - w.f) / 120;
        map.strokeStyle = w.ally ? `rgba(110,220,110,${(1 - t).toFixed(2)})` : `rgba(255,80,55,${(1 - t).toFixed(2)})`; map.lineWidth = 2;
        map.beginPath(); map.arc(X(w.x), Y(w.z), 5 + t * 22, 0, 7); map.stroke();
      }
      const cy = game.cam.yaw;
      const cone = map.createRadialGradient(100, 100, 0, 100, 100, 70);
      cone.addColorStop(0, `rgba(${pal.cone},0.3)`); cone.addColorStop(1, `rgba(${pal.cone},0)`);
      map.fillStyle = cone;
      map.beginPath(); map.moveTo(100, 100); map.arc(100, 100, 70, -Math.PI / 2 - cy - 0.5, -Math.PI / 2 - cy + 0.5); map.fill();
      const dots = (from, to, color) => {                            // soldiers [from, to) as 3 px dots
        map.fillStyle = color;
        for (let i = from; i < to; i++) {
          const st = c.st[i];
          if (st === ST.OFF || st === ST.DEAD) continue;
          const x = X(c.x[i]), y = Y(c.z[i]);
          if (x > -2 && x < 202 && y > -2 && y < 202) map.fillRect(x - 1.5, y - 1.5, 3, 3);
        }
      };
      dots(0, c.grunts, '#ff4a3a'); dots(c.N, c.T, pal.ally);       // black hats, your squad
      for (let i = c.grunts; i < c.N; i++) {
        if (c.st[i] === ST.OFF || c.st[i] === ST.DEAD) continue;
        const x = Math.max(5, Math.min(195, X(c.x[i]))), y = Math.max(5, Math.min(195, Y(c.z[i])));
        map.fillStyle = '#1a0d08'; map.fillRect(x - 5, y - 5, 10, 10);
        map.fillStyle = i === tg ? '#ffe08a' : '#ff5a3a'; map.fillRect(x - 3.5, y - 3.5, 7, 7);
      }
      const px = (a, r) => 100 - Math.sin(a) * r, py = (a, r) => 100 - Math.cos(a) * r;
      for (const pm of partners()) {                                 // co-op: the others' arrows (pinned to the rim when off the map)
        const q = pm.hero, mx = Math.max(6, Math.min(194, X(q.x))), my = Math.max(6, Math.min(194, Y(q.z))), a = q.yaw;
        if (q.gone) continue;
        map.fillStyle = pal.disc; map.beginPath(); map.arc(mx, my, 7, 0, 7); map.fill();
        map.fillStyle = q.dead ? '#ff4a3a' : q.char.accent;
        map.beginPath(); map.moveTo(mx - Math.sin(a) * 8, my - Math.cos(a) * 8); map.lineTo(mx - Math.sin(a + 2.5) * 6, my - Math.cos(a + 2.5) * 6); map.lineTo(mx - Math.sin(a - 2.5) * 6, my - Math.cos(a - 2.5) * 6); map.fill();
      }
      const ay = h.yaw;                                              // hero arrow
      map.fillStyle = pal.disc;
      map.beginPath(); map.arc(100, 100, 8, 0, 7); map.fill();
      map.fillStyle = pal.me;
      map.beginPath(); map.moveTo(px(ay, 9), py(ay, 9)); map.lineTo(px(ay + 2.5, 7), py(ay + 2.5, 7)); map.lineTo(px(ay - 2.5, 7), py(ay - 2.5, 7)); map.fill();
    },
  };
}
