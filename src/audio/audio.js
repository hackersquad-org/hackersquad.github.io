// The game's sound. Everything is synthesised offline at boot or on demand (no downloads) and played off bus events:
//  · music (music.js): one score per place — the menus' own, the warehouse's electro, the forest's folk dance — chosen by
//    the flow state (title / lobby: the menus; from the fighter select to the result: the mission's stage). Layers loop
//    together: on a menu the tune plays plainly, in a battle the drums and the lead swell with combat intensity (a boss
//    on the field holds them up) and duck under hits and the Overclock. The result screen opens on the score's jingle.
//  · the stage's air (the score's ambience bed), its enemies' voices (voices.js: people in the warehouse, wolves and
//    foxes in the forest) and the floor under the fighter's feet (concrete / grass).
//  · the dialogue (lines.js): every story line — the MC and the Elder's briefings, the bosses' taunts, the hero's intro
//    and his shout after the Overclock, the ally's cheers, the result screen's epilogue — spoken by a real voice, from
//    clips made with the ElevenLabs API and stored under assets/voice/ (tools/voices.mjs). The only sounds fetched
//    rather than synthesised; without them the lines are text only. A line plays on its own bus over the mix, with
//    the score and the effects dipped under it while it runs.
//  · swings: an air whoosh by move shape / weight, cued LEAD sim frames before each hitbox window opens (sound leads
//    the trail), with the weapon's own layer on it and the fighter's voice (kids shout; the sheep bleats, the pig oinks,
//    the cat mews, the jelly blubs).
//  · techniques (kits.js): what a move casts — a scream through the PA, a shutter, a dial tone, a thunderclap, a
//    jackhammer, a pumpkin — on its frame, and the Overclock's own timeline.
//  · impacts on the `hits` frame: a blunt body impact (3+ victims add a body-cluster layer and packed grains) under what
//    the blow is made of (steel tube, plastic, wire cart, sign, cone, cloth, bristles, jelly — or sound, sparks, wind,
//    rain, fire), with a post-hitstop "blow-away" release on heavy hits · enemy grunts, cries, body falls · dodge / jump
//    / land / hurt · Overclock gauge chime, activation flash + shout, close-up hush + charge drone swelling into the
//    contact blast, pre-burst inhale, finishing blast + chorus · reinforcement call + roar · foreground shouts.
// Mix: sfx / voice / bed buses + convolution reverb send → master EQ → compressor (25 ms attack: transients pass) →
// soft-clip ceiling (≈ -2 dBFS, no clipping). Impacts own the transient: every hit tick sidechains the whooshes / body
// falls (under bus), the music and bed, the voices and the reverb return for 50-100 ms — through to the next tick inside
// a multi-tick window, which builds to a heavier last blow — and flurry whoosh pulses land ON their ticks, so multi-tick
// moves read as separate blows instead of a plateau.
// Positional: pan + distance attenuation from the hero, relative to the sim camera yaw. Read-only on the sim; audio
// randomness is Math.random, never the sim RNG. Starts on the first user gesture.
import { on } from '../core/events.js';
import { buildBank, makeIR, noiseBuf } from './bank.js';
import { buildFoley } from './foley.js';
import { bakeVoice, bakeCast } from './voices.js';
import { createLines } from './lines.js';
import { CHARS, shoutOf } from '../chars/index.js';
import { bakeScore, scoreOf } from './music.js';
import { KITS, SOFT } from './kits.js';
import { handAt } from '../hero/moveset.js';
import { resolveChapter } from '../story/chapters.js';
import { ST } from '../crowd/crowd.js';

const rnd = (a, b) => a + (b - a) * Math.random();
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// Sim frames a swing cue precedes its hitbox window, per whoosh kind: the trail shows from f0-3 and each whoosh must be
// audible 2-4 sf before it (benchmark). Bank whooshes fade in: audible ≈ 1.5 frames in for a thrust, ≈ 3.5 for a slash,
// ≈ 6 for a spin or a heavy swing (peaks ≈ 3 / 6.5 / 8-16 / 12 frames in). The voice starts KIAI_LEAD frames ahead.
// Cues that fall on the move's first frame fire from attack:start (no rAF lag).
const LEAD = { thrust: 7, slash: 9, spin: 11, heavy: 12 }, KIAI_LEAD = 7;
const kindOf = (w) => (w.heavy ? 'heavy' : w.shape === 'circle' ? 'spin' : w.shape === 'line' ? 'thrust' : 'slash');
// a normal swing is voiced with probability VOICE_P; charge finishers, heavy blows and N6 always are (a long call)
const VOICE_P = 0.5;
const VOX = 0.72;                 // voice bus: ≈ 6 dB under the sfx stem, so calls and shouts never mask the impacts
const DLG = 1.3;                  // dialogue bus: the spoken lines sit on top of the mix (≈ +2 dB over unity, no sidechain)
const TALK = [0.3, 0.5];          // under a spoken line: the score + bed, and the effects + shouts, dip to these
const MIX = 0.6, POST = 0.9;     // master level (≈ -17 LUFS in the crowd-fight scenario), post-compressor gain
const BOSS = 0.55;                // a boss on the field: the score never drops below this intensity
// sidechain under every hit tick (hits own the transient): [whoosh, music + bed, voice, reverb return] depth, hold 50 ms + 10 ms
// per extra victim, or up to the next tick of a multi-tick window (Musou flurry: 50 ms under each accented stab)
const SIDE = [0.3, 0.65, 0.45, 0.5], SIDE_MU = [0.25, 0.5, 0.55, 0.4];

export function createAudio(game) {
  let ctx = null, mix, post, ceiling, sfx, vox, bedBus, bedDuck, revIn, live = 0;
  let underBus, sides = [], dlg, talk;        // sfx that yield to impacts (whooshes, body falls) + the sidechain gains;
                                              // dlg: the dialogue's own bus; talk: effects + shouts, dipped under a line
                                              // (under bus, bed, voice, reverb return)
  let muFrame = -1;                           // last sim frame that voiced a Musou tick (several strikes share a frame)
  let mu = null;                              // current Musou timing (musou:start payload, frames)
  let intensity = 0, lastT = performance.now(), drone = null, nextShout = 0;
  let flowState = 'title', score = null, wantScore = '', boss = false, nextBoss = 0, step = 'stepConcrete';
  let C = null;                               // the stage's enemy voices (voices.js bakeCast), once baked
  const V = {};                               // fighters' voices by char id (voices.js bakeVoice), once baked
  const last = new Map();                     // throttles
  const lastPick = new Map();
  const B = {};                               // filled progressively by the offline bakes (combat sounds first)
  const warn = (e) => console.warn('audio bank', e);
  buildBank(B).catch(warn); buildFoley(B).catch(warn);

  function start() {
    if (ctx) { if (ctx.state !== 'running') ctx.resume(); return; }
    // the bank is baked at 48 kHz and the reverb's impulse must match the context's rate: ask for 48 kHz (the browser
    // resamples to the device); a device that refuses gets its own rate and plays without the reverb
    try { ctx = new AudioContext({ latencyHint: 'interactive', sampleRate: 48000 }); } catch { ctx = new AudioContext({ latencyHint: 'interactive' }); }
    const comp = ctx.createDynamicsCompressor();
    // 25 ms attack: the first frame of every hit passes the compressor untouched (6 ms flattened the impacts); a gentle
    // -6 dB / 2:1 so dense melee still reads louder than a lull (LRA)
    comp.threshold.value = -6; comp.knee.value = 6; comp.ratio.value = 2; comp.attack.value = 0.025; comp.release.value = 0.12;
    const clip = ctx.createWaveShaper(), c = new Float32Array(2048);
    for (let i = 0; i < c.length; i++) {        // linear to 0.7, tanh knee to a 0.79 (-2 dBFS) ceiling: true peak ≤ -1 dBFS with the bright top
      const x = i / (c.length - 1) * 2 - 1, a = Math.abs(x);
      c[i] = Math.sign(x) * (a < 0.7 ? a : 0.7 + 0.09 * Math.tanh((a - 0.7) / 0.09));
    }
    clip.curve = c; clip.oversample = '2x';
    mix = ctx.createGain(); mix.gain.value = MIX;
    post = ctx.createGain(); post.gain.value = POST;
    // master EQ, matched to the benchmark clips' octave balance: less thump (63-125 Hz ran 2 dB hot), less 250 Hz mud,
    // more 500 Hz body and 2-6 kHz bite (500 Hz-4 kHz ran 1.5-3 dB shy), a softer top above 12k
    const eq = [['lowshelf', 140, 0.7, -4], ['peaking', 260, 1, -1], ['peaking', 560, 0.9, 2.5], ['peaking', 3600, 0.7, 3.5], ['highshelf', 12000, 0.7, -3]].map(([type, f, q, g]) => {
      const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; b.gain.value = g; return b;
    });
    ceiling = clip;                            // input after the compressor: the Musou riser rides through the inhale here
    eq.reduce((n, b) => n.connect(b), mix).connect(comp).connect(post).connect(clip).connect(ctx.destination);
    talk = ctx.createGain(); talk.connect(mix);                     // effects and shouts pass through here: dipped while a line is spoken
    sfx = ctx.createGain(); sfx.connect(talk);
    sides = SIDE.map(() => ctx.createGain());
    underBus = ctx.createGain(); underBus.connect(sides[0]).connect(sfx);
    vox = ctx.createGain(); vox.gain.value = VOX; vox.connect(sides[2]).connect(talk);
    dlg = ctx.createGain(); dlg.gain.value = DLG; dlg.connect(mix);   // the spoken lines: straight to the mix, no sidechain under hits
    const rev = ctx.createConvolver(); try { rev.buffer = makeIR(); } catch { /* rate mismatch: a dry mix */ }
    revIn = ctx.createGain(); revIn.connect(rev); rev.connect(sides[3]).connect(mix);   // the wash ducks under hits too
    bedDuck = ctx.createGain(); bedDuck.connect(mix);
    bedBus = ctx.createGain(); bedBus.connect(sides[1]).connect(bedDuck);
    const bedSend = ctx.createGain(); bedSend.gain.value = 0.4; bedDuck.connect(bedSend).connect(revIn);
  }
  addEventListener('pointerdown', start);
  addEventListener('keydown', start);
  addEventListener('touchend', start);        // iOS unlocks audio only from touchend (touch hook: the pad eats pointerdown)
  // musou part r3: build the context + graph at boot (it stays 'suspended' until the first key/pointer gesture resumes
  // it). Building it inside the first keydown stalled that frame 0.2-1 s (the first Musou of a session hitched when I
  // was the first key pressed).
  start();

  const ok = () => ctx && ctx.state === 'running';
  /** One-shot buffer → gain → pan → bus (+ reverb send). */
  function play(buf, { gain = 1, rate = 1, pan = 0, delay = 0, send = 0.12, bus = sfx, prio = 0 } = {}) {
    if (!buf || (live > 56 && prio < 1)) return null;
    const t = ctx.currentTime + delay;
    const s = ctx.createBufferSource(); s.buffer = buf; s.playbackRate.value = rate;
    const g = ctx.createGain(); g.gain.value = gain;
    const p = ctx.createStereoPanner(); p.pan.value = clamp(pan, -1, 1);
    s.connect(g).connect(p).connect(bus);
    if (send) { const r = ctx.createGain(); r.gain.value = send; p.connect(r).connect(revIn); }
    live++; s.onended = () => { live--; };
    s.start(t);
    return s;
  }
  /** Random variant, never the same one twice in a row. */
  function pick(arr) {
    if (!Array.isArray(arr)) return arr;
    let i = Math.floor(Math.random() * arr.length);
    if (arr.length > 1 && i === lastPick.get(arr)) i = (i + 1) % arr.length;
    lastPick.set(arr, i);
    return arr[i];
  }
  function gate(key, ms) {
    const t = performance.now();
    if (t - (last.get(key) || -1e9) < ms) return false;
    last.set(key, t); return true;
  }
  // ---- the dialogue's voices (lines.js): centred, on the voice bus, never dropped by the live-source cap
  const L = createLines({ ctx: () => (ok() ? ctx : null), play: (buf) => play(buf, { gain: 1, send: 0.08, bus: dlg, prio: 1 }) });
  /** A story line in its speaker's voice, on its own bus over the mix; the score and the effects dip under it for as long
   *  as the clip runs (not inside an Overclock: its own ducking runs the mix then). */
  function speak(who, text) {
    if (!ok() || !who) return null;
    const r = L.speak(who, text);
    if (r && r.sec && !game.musou.active) {
      duck(TALK[0], r.sec, 0.4);
      ramp(talk.gain, [[0.03, TALK[1]]]); talk.gain.setTargetAtTime(1, ctx.currentTime + 0.03 + r.sec, 0.25);
    }
    return r;
  }
  on('story:say', (e) => speak(e.who, e.text));
  on('musou:end', () => { if (game.mine()) speak(game.hero.char.id, shoutOf(game.hero.char, game.chapter)); });
  /** Pan + distance gain of a world point, heard from the hero with the sim camera's orientation. */
  function place(x, z) {
    const h = game.view.hero, yw = game.view.cam.yaw, dx = x - h.x, dz = z - h.z;   // the local player's ears (co-op: an event may come from the partner's step)
    const right = -dx * Math.cos(yw) + dz * Math.sin(yw);
    return { pan: clamp(right / 7, -0.8, 0.8), att: 1 / (1 + Math.max(0, Math.hypot(dx, dz) - 4) / 7) };
  }
  /** Sidechain: whooshes, bed and voices dip within 4 ms of a hit tick, hold, then recover (tau 80 ms). A tick with more
   *  ticks to come in its window holds the dip up to the next one, so a whole C3 / C4 / C6 train stands on a hushed floor. */
  function side(n, musou, until = 0) {
    const t = ctx.currentTime, D = musou ? SIDE_MU : SIDE;
    const hold = until || (musou ? 0.025 : Math.min(0.1, 0.05 + 0.01 * (n - 1)));
    sides.forEach(({ gain: g }, i) => {
      ramp(g, [[0.004, D[i]]]);
      g.setValueAtTime(D[i], t + 0.004 + hold); g.setTargetAtTime(1, t + 0.004 + hold, musou ? 0.05 : 0.08);
    });
  }
  function duck(depth, hold, rel = 0.18) {
    ramp(bedDuck.gain, [[0.015, depth]]); bedDuck.gain.setTargetAtTime(1, ctx.currentTime + 0.015 + hold, rel);
  }
  // ---- the score: the flow state picks it, frame() mixes its layers
  function setScore(id) {
    if (wantScore === id) return;
    wantScore = id;
    (id === 'title' ? Promise.resolve(null) : bakeCast(id)).then((cast) => bakeScore(id, cast)).then((S) => { if (wantScore === id) startScore(S); }, warn);
  }
  function startScore(S) {
    if (!ctx) return;
    const t = ctx.currentTime;
    if (score) { score.out.gain.setTargetAtTime(0, t, 0.25); for (const n of score.src) n.stop(t + 1.5); }
    const out = ctx.createGain(), g = {}, src = [];
    out.gain.value = 0; out.gain.setTargetAtTime(1, t + 0.2, 0.3); out.connect(bedBus);
    for (const k of ['bed', 'drums', 'music', 'lead']) {     // layers start silent; frame() fades them to their level
      if (!S[k]) continue;
      const n = ctx.createBufferSource(); n.buffer = S[k]; n.loop = true;
      g[k] = ctx.createGain(); g[k].gain.value = 0;
      n.connect(g[k]).connect(out); n.start(t + 0.05); src.push(n);   // same start: the layers stay locked
    }
    score = { S, out, g, src };
  }
  on('flow', ({ state, ctx: c }) => {
    flowState = state;
    if (state !== 'battle') L.stop();
    if (state === 'title' || state === 'lobby') return setScore('title');
    setScore(scoreOf(resolveChapter(c.chapter, c.char).map));
    if (state === 'result') bakeScore(wantScore).then((S) => {   // (baked long ago: the battle played it) its jingle, the tune held under it
      if (!ok() || flowState !== 'result') return;
      play(c.win ? S.win : S.lose, { gain: 0.8, delay: 0.45, send: 0.25, prio: 1 });
      duck(0.3, 2.6, 0.7);
      narrate(c);
    }, warn);
  });
  /** The result screen's closing lines (story/result.js shows them), read by the narrator once the jingle has landed:
   *  the fighter's epilogue on a win, the stage's defeat line otherwise. */
  async function narrate(c) {
    const ch = CHARS[c.char] || CHARS[game.hero.char.id], CH = resolveChapter(c.chapter, ch.id), E = CH.EPILOGUE || {};
    const lines = c.win ? E[ch.id] || Object.values(E)[0] || [] : [(CH.DEFEAT || '{name} is knocked out.').replace('{name}', ch.name)];
    await new Promise((f) => setTimeout(f, 1800));
    for (const t of lines) {
      if (flowState !== 'result') return;
      const r = speak('narrator', t);
      if (!r) return;
      await r.done;
      await new Promise((f) => setTimeout(f, 350));
    }
  }
  // the stage scores bake behind the title, one after the other, so picking a mission never waits for its music
  bakeScore('title').then(() => bakeCast('warehouse')).then((c) => bakeScore('warehouse', c)).then(() => bakeCast('forest')).then((c) => bakeScore('forest', c)).catch(warn);

  // ---- swing cues: read the hero's move clock (read-only) every animation frame
  // Co-op: every player's hero is voiced. The local hero's sounds are the mix's foreground, as in a solo game; the
  // partner's swings, shouts, casts and blows play from where he stands (pan + distance, place()), quieter, and leave
  // the local mix alone (no sidechain dip, no duck). `far` below = null for the local hero, else the partner's { pan, att }.
  const MATE = 0.6;
  const seqs = [], seen = [], muSeen = [];     // per player: the move whose cues are playing, its last frame cued; his Overclock's
  const farOf = (h) => (h.pi === game.me ? null : place(h.x, h.z));
  const kitOf = (h) => KITS[h.char.id];
  /** A foley sound (kits.js name) from the fighter: full for the local one, placed and quieter for a partner. */
  function fol(name, g = 0.7, rate = 1, far = null, o = null) {
    return play(pick(B[name]), { gain: g * (far ? MATE * far.att : 1), rate: rate * rnd(0.97, 1.03), pan: far ? far.pan : 0, send: 0.15, prio: far ? 0 : 1, ...o });
  }
  /** The fighter's voice: kind 'short' | 'long' | 'hurt' (arrays) | 'musou'. */
  function call(h, kind, g, far = null, delay = 0) {
    const v = V[h.char.id];
    if (v) play(pick(v[kind]), { gain: g * (far ? MATE * far.att : 1), rate: rnd(0.97, 1.03), pan: far ? far.pan : 0, send: far ? 0.3 : 0.2, bus: vox, prio: far ? 0 : 1, delay });
  }
  function cue(h, m, t, far = null) {
    const S = kitOf(h)?.moves[m.id];
    if (S && S.at) for (const [f, name, g, r] of S.at) if (f === t) fol(name, g, r, far);
    m.hits.forEach((w, wi) => {
      const lead = LEAD[kindOf(w)], t0 = Math.max(0, w.f[0] - lead), multi = w.every && w.every < 99;
      if (t === t0) swing(h, m, w, wi, 0, Math.max(0, Math.min(lead, w.f[0]) - KIAI_LEAD) / 60, far);
      if (S && S.on && S.on[wi] && t === w.f[0]) fol(S.on[wi], 0.85, S.rate, far);
      if (S && S.tick && S.tick[wi] && multi && t >= w.f[0] && t <= w.f[1] && (t - w.f[0]) % w.every === 0) fol(S.tick[wi], 0.45, S.rate, far, { prio: 0 });
      if (!multi || (S && S.sw && S.sw[wi] === 0)) return;
      // flurry pulses start 3 frames before a tick (a whoosh peaks ≈ 3 frames in, so it lands ON the tick and the gap
      // after it stays clean for the next impact), once the lead whoosh has run out (thrust ≈ 8 frames, spin ≈ 25)
      const line = w.shape === 'line', step = line ? Math.max(w.every, 4) : Math.max(w.every * 2, 10), p0 = w.f[0] - 3;
      if (t > t0 + (line ? 6 : 18) && t <= w.f[1] - 3 && (t - p0) % step === 0) swing(h, m, w, wi, (t - p0) / step, 0, far);
    });
  }
  function swing(h, m, w, wi, k, voiceDelay = 0, far = null) {
    const K = kitOf(h), S = K?.moves[m.id], own = S && S.sw ? S.sw[wi] : undefined;
    const g = far ? MATE * far.att : 1, pan = far ? far.pan : 0;
    if (own !== 0) {
      // flurry pulses (k > 0) stay quiet: the hit ticks carry the rhythm, the whoosh only keeps the air moving
      play(pick(B[kindOf(w)]), { gain: (k ? 0.3 : 0.8) * g, rate: rnd(0.94, 1.06) * (k ? rnd(1, 1.12) : 1), pan: pan + rnd(-0.12, 0.12), send: k ? 0.06 : 0.14, bus: underBus, prio: far ? 0 : 1 });
      // what is being swung: the kit's layer (by striking hand), or this window's own
      const d = K && K.sw, layer = own || (d && (typeof d === 'string' ? d : d[handAt(m, w.f[0])]));
      if (layer) play(pick(B[layer]), { gain: (k ? 0.25 : w.heavy ? 0.7 : 0.55) * g, rate: rnd(0.94, 1.06) * (w.heavy ? 0.9 : 1), pan, send: 0.1, bus: underBus, prio: far ? 0 : k ? 0 : 1 });
    }
    if (k || (own === 0 && !w.heavy)) return;
    const big = w.heavy || m.id === 'n6';
    if (!big && m.id[0] !== 'c' && Math.random() > VOICE_P) return;
    if (gate('call' + h.pi, 240)) call(h, big ? 'long' : 'short', big ? 0.7 : 0.5, far, voiceDelay);
  }
  function frame() {
    requestAnimationFrame(frame);
    const now = performance.now(), dt = Math.min(0.1, (now - lastT) / 1000);
    lastT = now;
    if (!ok()) return;
    const battle = flowState === 'battle';
    musouFrame();
    for (const { hero: h, musou: M, i } of game.players) {
      const m = h.state === 'attack' && h.move && h.kit.moves[h.move];
      if (m) {
        if (h.moveSeq !== seqs[i]) { seqs[i] = h.moveSeq; seen[i] = -1; }   // missed attack:start (should not happen)
        const far = farOf(h);
        for (let t = seen[i] + 1; t <= h.moveT; t++) cue(h, m, t, far);
        seen[i] = Math.max(seen[i], h.moveT);
      }
      // the Overclock's own timeline (kits.js mu.at), off its sim clock
      const K = kitOf(h);
      if (!M.active || !battle) { muSeen[i] = -1; continue; }
      if (K && M.t - muSeen[i] < 30) { const far = farOf(h); for (const [f, name, g, r] of K.mu.at) if (f > muSeen[i] && f <= M.t) fol(name, g ?? 0.8, r, far); }
      muSeen[i] = M.t;
    }
    // the score follows combat intensity (hits per ~2 s); a boss on the field holds it up
    intensity *= Math.exp(-dt / 2);
    if (now > nextBoss) {
      nextBoss = now + 500; boss = false;
      const c = game.crowd;
      if (battle) for (let i = 0; i < c.N && !boss; i++) boss = !!c.boss[i] && c.st[i] !== ST.OFF && c.st[i] !== ST.DEAD;
    }
    let b = 1 - Math.exp(-intensity / 60);         // ≈0.35 for a light skirmish, ≈0.8 in a packed melee
    if (boss) b = Math.max(b, BOSS);
    if (score) {
      const X = score.S.mix, t = ctx.currentTime;
      for (const k in score.g) score.g[k].gain.setTargetAtTime(battle ? X.battle[k][0] + X.battle[k][1] * b : X.menu[k], t, k === 'bed' ? 0.3 : 0.7);
    }
    // foreground shouts round the hero, denser as the fight heats up (the bed carries the distant ones)
    if (battle && C && now > nextShout) {
      nextShout = now + rnd(1000, 3000) / (0.5 + b);
      play(pick(C.crowd), { gain: rnd(0.14, 0.24) * (0.6 + 0.6 * b), rate: rnd(0.9, 1.1), pan: rnd(-0.8, 0.8), send: 0.35, bus: vox });
    }
  }
  requestAnimationFrame(frame);
  on('attack:start', (e) => {                 // fires inside the sim step: frame-0 cues play without the rAF poll's lag
    const h = game.hero, m = h.kit.moves[e.move];   // (the hero of the player in use: mine or my partner's)
    seqs[h.pi] = h.moveSeq; seen[h.pi] = 0;
    if (ok() && m) cue(h, m, 0, farOf(h));
  });

  // ---- impacts
  /** What the blow that just landed is made of (kits.js): the Overclock's by its clock, a move window's own, else the
   *  weapon in the striking hand. */
  function matOf(h, e) {
    const K = kitOf(h);
    if (!K) return null;
    if (e.move === 'musou') {
      let name = K.hit;
      if (game.musou.active) for (const [f, v] of K.mu.hit) if (game.musou.t >= f) name = v;
      return typeof name === 'string' ? name : name.R;
    }
    const mv = e.move === h.move && h.kit.moves[h.move], S = mv && K.moves[e.move];
    if (S && S.hit) { const own = S.hit[mv.hits.findIndex((q) => h.moveT >= q.f[0] && h.moveT <= q.f[1])]; if (own) return own; }
    return typeof K.hit === 'string' ? K.hit : K.hit[mv ? handAt(mv, h.moveT) : 'R'];
  }
  on('hits', (e) => {
    if (!ok()) return;
    const n = e.count, { pan, att } = place(e.x, e.z), mat = matOf(game.hero, e), body = SOFT.has(mat) ? 0.5 : 1;
    if (!game.mine()) {                         // the partner's blows: one impact per tick (≥ 50 ms apart) where it lands
      intensity += e.move === 'musou' ? n * 0.1 : n * 0.5;
      if (!gate('mateHit', 50)) return;
      const k = Math.min(1.4, 0.5 + Math.log2(n + 1) * 0.2) * MATE * att;
      play(pick(e.heavy ? B.hitHeavy : B.hit), { gain: (e.heavy ? 1.1 : 0.9) * k * body, rate: rnd(0.9, 1.12), pan, send: 0.2 });
      play(pick(B[mat]), { gain: (e.heavy ? 0.9 : 0.7) * k, rate: rnd(0.92, 1.08), pan, send: 0.2 });
      if (n >= 3) play(pick(B.mass), { gain: Math.min(0.8, 0.3 + n * 0.035) * MATE * att, rate: rnd(0.9, 1.1), pan, send: 0.12 });
      return;
    }
    intensity += e.move === 'musou' ? n * 0.15 : n;   // the field an Overclock clears goes quiet after it (no swell)
    if (e.move === 'musou') {                   // flurry: every tick frame is voiced — an accented blow ≥ 70 ms apart
      if (game.frame === muFrame) return;       // (≈ 14/s) on a dipped floor, a short sharp strike on the ticks between
      muFrame = game.frame;
      const u = mu ? clamp((game.musou.t - mu.C) / (mu.F - mu.C), 0, 1) : 1, cr = 0.7 + 0.45 * u;   // builds to the burst
      if (!gate('muHit', 70)) {
        play(pick(B.hit), { gain: rnd(0.4, 0.5) * cr * body, rate: rnd(1.25, 1.5), pan: pan * 0.6 + rnd(-0.3, 0.3), send: 0.03 });
        return;
      }
      side(n, true, 0.05);
      play(pick(B.hit), { gain: 0.9 * cr * body, rate: rnd(1.05, 1.25), pan: pan * 0.6, send: 0.08, prio: 1 });
      play(pick(B[mat]), { gain: 0.7 * cr, rate: rnd(0.95, 1.1), pan: pan * 0.6, send: 0.1, prio: 1 });
      if (n >= 4) play(pick(B.mass), { gain: 0.5 * cr, rate: rnd(1, 1.2), pan: pan * 0.6, send: 0.06 });
      return;
    }
    // multi-tick window (flurries): where this tick sits in its train. The next tick comes every + hitstop
    // frames later; the last one of a train lands hardest (a crescendo, so the spin / flurry ends on its blow)
    const h = game.hero, mv = e.move === h.move && h.kit.moves[h.move];
    const w = mv && mv.hits.find((q) => q.every && q.every < 99 && h.moveT >= q.f[0] && h.moveT <= q.f[1]);
    const more = !!w && h.moveT + w.every <= w.f[1], fin = !!w && !more && h.moveT > w.f[0];
    // a spin train opens light (its big whoosh + voice carry the first tick) and builds to the last blow
    const train = !w ? 1 : fin ? 1.25 : h.moveT === w.f[0] && w.shape === 'circle' ? 0.65 : 0.9;
    const k = Math.min(1.4, 0.5 + Math.log2(n + 1) * 0.2) * train;   // mass hits land harder (1 victim 0.7, 16 victims 1.3)
    side(n, false, more ? (w.every + e.hitstop) / 60 + 0.03 : 0);
    if (e.heavy) {
      play(pick(B.hitHeavy), { gain: 1.15 * k * body, rate: rnd(0.92, 1.06), pan: pan * 0.5, send: 0.3, prio: 1 });
      play(pick(B[mat]), { gain: 1.0 * k, rate: rnd(0.82, 0.92), pan: pan * 0.5, send: 0.3, prio: 1 });   // the weapon rings lower on a heavy blow
      duck(0.4, 0.12 + e.hitstop / 60, 0.25);
      if (e.hitstop >= 5) play(pick(B.blow), { delay: e.hitstop / 60, gain: 0.55, pan: pan * 0.5, send: 0.2 });   // bodies fly when the freeze releases
    } else {
      play(pick(B.hit), { gain: 0.9 * k * body * (0.7 + 0.3 * att), rate: rnd(0.9, 1.12), pan, send: 0.12, prio: 1 });
      play(pick(B[mat]), { gain: 0.75 * k, rate: rnd(0.93, 1.1), pan, send: 0.15, prio: 1 });
    }
    // multi-hit crunch: a body-cluster layer for 3+ victims, plus grains packed into ≈ 30 ms so the tick reads as one blow
    if (n >= 3 || fin) play(pick(B.mass), { gain: Math.min(0.8, 0.3 + n * 0.035) * (fin ? 1.3 : 1) * body, rate: rnd(0.9, 1.1), pan: pan * 0.6, send: 0.1, prio: 1 });
    const g = Math.min(6, n - 1);
    for (let j = 0; j < g; j++) play(pick(B.crunch), { gain: rnd(0.25, 0.4) * body, rate: rnd(0.8, 1.25), pan: pan + rnd(-0.45, 0.45), delay: 0.004 + j * rnd(0.003, 0.005), send: 0.06 });
  });
  on('hit', (e) => {
    if (!ok() || !C || e.killed || e.move === 'musou' || Math.random() > 0.3 || !gate('grunt', 180)) return;
    const { pan, att } = place(e.x, e.z);
    play(pick(C.grunt), { gain: 0.3 * att, rate: rnd(0.9, 1.1), pan, delay: rnd(0.02, 0.06), send: 0.15, bus: vox });
  });
  on('ko', (e) => {
    if (!ok() || !C) return;
    const { pan, att } = place(e.x, e.z);
    if (e.officer) { play(pick(C.officerCry), { gain: 0.6, pan, delay: 0.04, send: 0.25, bus: vox, prio: 1 }); return; }
    if (Math.random() > 0.55 || !gate('cry', 130)) return;
    play(pick(C.cry), { gain: rnd(0.3, 0.42) * att, rate: rnd(0.9, 1.1), pan, delay: rnd(0.03, 0.09), send: 0.22, bus: vox });
  });
  on('clash', (e) => {                        // duel blows off the hero's fight: a distant thwack, a cry on a KO
    if (!ok() || !gate('clash', 220)) return;
    const { pan, att } = place(e.x, e.z);
    play(pick(B.hit), { gain: 0.2 * att, rate: rnd(1.1, 1.3), pan, send: 0.25 });
    if (C && e.killed && gate('cry', 130)) play(pick(C.cry), { gain: 0.22 * att, rate: rnd(0.9, 1.1), pan, delay: 0.05, send: 0.3, bus: vox });
  });
  on('enemy:land', (e) => {
    if (!ok() || !gate('fall', e.bounce ? 110 : 80)) return;
    const { pan, att } = place(e.x, e.z);
    play(pick(B.fall), { gain: (e.bounce ? 0.18 : 0.28) * att, rate: rnd(0.85, 1.15) * (e.bounce ? 1.15 : 1), pan, send: 0.08, bus: underBus });
  });

  // ---- hero
  // (the partner's dodge / landing / hurt: the same cue from where he is, quieter)
  const mate = (e) => { const q = place(e.x, e.z); return { pan: q.pan, k: MATE * q.att }; };
  on('footstep', (e) => {                     // the local fighter's own feet on the stage's floor
    if (!ok() || !game.mine() || flowState !== 'battle' || !gate('step', 90)) return;
    play(pick(B[step]), { gain: e.kick ? 0.3 : 0.14, rate: rnd(0.9, 1.1), pan: rnd(-0.1, 0.1), send: 0.05, bus: underBus });
  });
  on('dodge', (e) => {
    if (!ok()) return;
    if (game.mine()) play(pick(B.dodge), { gain: 0.7, rate: rnd(0.95, 1.05), send: 0.1, prio: 1 });
    else { const { pan, k } = mate(e); play(pick(B.dodge), { gain: 0.7 * k, rate: rnd(0.95, 1.05), pan, send: 0.15 }); }
  });
  on('jump', () => {
    if (!ok() || !game.mine()) return;
    play(pick(B.dodge), { gain: 0.35, rate: rnd(1.1, 1.25) });
    if (kitOf(game.hero) === KITS.connector) fol('boing', 0.3, 1.3);   // the jelly (masked or not)
    else if (Math.random() < 0.4) call(game.hero, 'short', 0.3);
  });
  on('land', (e) => {
    if (!ok()) return;
    if (game.mine()) play(pick(B.land), { gain: e.hard ? 0.75 : 0.4, rate: rnd(0.95, 1.1), send: 0.08, prio: 1 });
    else { const { pan, k } = mate(e); play(pick(B.land), { gain: (e.hard ? 0.75 : 0.4) * k, rate: rnd(0.95, 1.1), pan, send: 0.12 }); }
  });
  on('hero:hurt', (e) => {
    if (!ok()) return;
    if (!game.mine()) { const { pan, k } = mate(e); play(pick(B.hit), { gain: 0.6 * k, rate: rnd(0.75, 0.9), pan, send: 0.15 }); return; }
    play(pick(B.hit), { gain: e.armored ? 0.45 : 0.6, rate: e.armored ? rnd(0.6, 0.7) : rnd(0.75, 0.85), send: 0.1, prio: 1 });
    if (!e.armored && gate('hurtVox', 400)) call(game.hero, 'hurt', 0.6, null, 0.02);
  });
  on('hero:down', (e) => {
    if (!ok()) return;
    const far = game.mine() ? null : place(e.x, e.z);
    play(pick(B.fall), { gain: 0.6 * (far ? MATE * far.att : 1), rate: 0.8, pan: far ? far.pan : 0, send: 0.2, prio: 1 });
    call(game.hero, 'long', 0.6, far, 0.05);
  });
  on('hero:up', (e) => { if (ok()) play(B.ready, { gain: 0.3, rate: 1.26, pan: game.mine() ? 0 : place(e.x, e.z).pan, send: 0.3 }); });
  on('connector:clones', (e) => {             // three clones pop out
    if (!ok()) return;
    const far = game.mine() ? null : place(e.x, e.z);
    [1, 1.2, 0.85].forEach((r, j) => fol('pop', 0.7, r, far, { delay: j * 0.07 }));
  });
  on('enemy:attack', (e) => {
    if (!ok() || !gate('eswing', 140)) return;
    const { pan, att } = place(e.x, e.z);
    play(pick(B.enemySwing), { gain: 0.3 * att, rate: rnd(0.85, 1.1), pan, send: 0.1, bus: underBus });
    if (C && (e.officer || Math.random() < 0.25)) play(pick(C.grunt), { gain: 0.25 * att, rate: rnd(1.05, 1.2), pan, bus: vox, send: 0.15 });
  });

  // ---- Overclock (the sim calls it musou). Its material sounds come from the kit's timeline (frame() above)
  on('musou:ready', () => ok() && game.mine() && play(B.ready, { gain: 0.5, send: 0.3, prio: 1 }));
  function undip() {                           // restore the mix and the sfx / voice buses after the Musou
    for (const [bus, v] of [[sfx, 1], [vox, VOX], [post, POST]]) ramp(bus.gain, [[0.004, v]]);
  }
  function stopDrone(fade = 0) {               // fade: drone + riser out over ≈ fade s (the contact blast covers it)
    if (!drone) return;
    const t = ctx.currentTime;
    if (fade && mu && mu.g) for (const p of [mu.g.g, mu.g.rg]) { p.cancelScheduledValues(t); p.setTargetAtTime(0, t, fade / 3); }
    for (const n of drone) n.stop(t + fade);
    drone = null;
  }
  // Shape (DW8XL ground Musou): flash + shout → hushed close-up (bed and buses dip, low drone) → drone + riser swell over
  // the chase run → CONTACT impact restores the mix → stab flurry → short inhale (triggered by the flurry's own ticks,
  // so sim lag can't misplace it) → burst.
  function ramp(g, pts) {                      // [[dt, v], ...] linear segments from now
    const t = ctx.currentTime;
    g.cancelScheduledValues(t); g.setValueAtTime(g.value, t);
    for (const [dt, v] of pts) g.linearRampToValueAtTime(v, t + dt);
  }
  on('musou:start', (e) => {
    if (!ok()) return;
    if (!game.mine()) {                         // the partner's Overclock: its flash and shout from over there; the mix stays mine
      const { pan, k } = mate(e);
      play(B.flash, { gain: 0.8 * k, pan, send: 0.4 }); call(game.hero, 'musou', 1, place(e.x, e.z), 0.06);
      return;
    }
    mu = { A: e.activation, C: e.contact, F: e.burstAt, inhaled: false, hushed: false, spins: 0, g: null };
    play(B.flash, { gain: 0.8, send: 0.4, prio: 1 });
    call(game.hero, 'musou', 1, null, 0.06);
    ramp(bedDuck.gain, [[0.02, 0.3]]);          // bed deep under the activation (the close-up hush takes it lower)
    // charge drone: detuned saws through an opening lowpass with a tremolo, plus a noise riser into the contact. Its
    // levels follow the sim's Musou clock every frame (musouFrame), so a slow real-time sim can't misplace the swell.
    stopDrone();
    const t = ctx.currentTime, g = ctx.createGain(), lp = ctx.createBiquadFilter(), trem = ctx.createGain();
    g.gain.value = 0; lp.type = 'lowpass'; lp.Q.value = 3; lp.frequency.value = 200; trem.gain.value = 0.7;
    const nodes = [55, 55.4, 82.6, 110.3].map((f) => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(lp); return o; });
    const lfo = ctx.createOscillator(); lfo.frequency.value = 6;
    const lg = ctx.createGain(); lg.gain.value = 0.3; lfo.connect(lg).connect(trem.gain);
    lp.connect(trem).connect(g).connect(mix); g.connect(revIn);
    const rbp = ctx.createBiquadFilter(); rbp.type = 'bandpass'; rbp.Q.value = 1.5; rbp.frequency.value = 400;
    const rg = ctx.createGain(); rg.gain.value = 0;
    const rn = ctx.createBufferSource(); rn.buffer = noiseBuf(); rn.loop = true;
    rn.connect(rbp).connect(rg).connect(ceiling);
    for (const n of [...nodes, lfo, rn]) n.start(t);
    drone = [...nodes, lfo, rn];
    mu.g = { g: g.gain, lp: lp.frequency, lfo: lfo.frequency, rg: rg.gain, rbp: rbp.frequency };
  });
  /** Per-frame Musou shaping from the sim's Musou clock (read-only): close-up hush, charge swell, finisher wind-up. */
  function musouFrame() {
    const M = game.musou;
    if (!mu || !M.active) return;
    const t = M.t, now = ctx.currentTime, set = (p, v, tau = 0.03) => p.setTargetAtTime(v, now, tau);
    if (!mu.hushed && t >= mu.A) {             // close-up: the world is paused — bed near silent, buses dip, drone hums
      mu.hushed = true;
      ramp(bedDuck.gain, [[0.35, 0.07]]);
      for (const bus of [sfx, vox]) ramp(bus.gain, [[0.3, (bus === vox ? VOX : 1) * 0.3]]);
    }
    if (drone && mu.g && t < mu.C) {           // hum → swell over the last ≈0.55 s of the chase run into the contact
      const u = Math.max(0, (t - (mu.C - 33)) / 33), q = u * u;
      set(mu.g.g, t < mu.A ? 0.015 * t / mu.A : 0.018 + 0.13 * q);
      set(mu.g.lp, t < mu.A ? 200 + 500 * t / mu.A : 1100 * (5000 / 1100) ** u);
      set(mu.g.lfo, 6 + 12 * t / mu.C, 0.1);
      set(mu.g.rg, 0.3 * q); set(mu.g.rbp, 400 * (7000 / 400) ** u);
    }
    // finisher wind-up: two spins ≈0.46 s and ≈0.24 s before the burst
    for (const [k, df, gv] of [[0, 28, 0.55], [1, 14, 0.7]]) {
      if (mu.spins === k && t >= mu.F - df) { mu.spins++; play(pick(B.spin), { gain: gv, rate: rnd(0.88, 0.96), send: 0.25, bus: underBus, prio: 1 }); }
    }
  }
  on('musou:hit', (e) => {
    if (!ok() || !game.mine()) return;
    if (e.stage === 'contact') {               // first mass hit: the mix comes back with a blast
      stopDrone(0.06);
      for (const bus of [sfx, vox]) ramp(bus.gain, [[0.004, bus === vox ? VOX : 1]]);
      ramp(bedDuck.gain, [[0.01, 0.2], [0.4, 0.3]]);   // the flurry owns the mix until the burst
      play(pick(B.hitHeavy), { gain: 1.0, rate: rnd(0.95, 1.02), send: 0.3, prio: 1 });
      play(pick(B.blow), { gain: 0.6, delay: 0.05, send: 0.25, prio: 1 });
      call(game.hero, 'long', 0.8);
      return;
    }
    if (e.stage === 'rush' && gate('muSwing', 130)) play(pick(B.slash), { gain: 0.16, rate: rnd(1.0, 1.15), pan: rnd(-0.2, 0.2), send: 0.1, bus: underBus, prio: 1 });
    if (mu && !mu.inhaled && e.stage !== 'wave' && e.n >= mu.F - mu.C - 9) {   // ≈ 0.15 s before the burst
      mu.inhaled = true;
      ramp(post.gain, [[0.1, POST * 0.2], [0.4, POST * 0.2], [0.45, POST]]);   // the burst event restores it earlier
    }
    if (e.stage === 'rush' && gate('muCall', 420)) call(game.hero, 'short', 0.5);
  });
  on('musou:burst', (e) => {
    if (!ok()) return;
    if (!game.mine()) { const { pan, k } = mate(e); play(B.boom, { gain: 1.2 * k, pan, send: 0.45 }); return; }
    stopDrone(); undip();
    play(B.boom, { gain: 1.2, send: 0.45, prio: 1 });
    call(game.hero, 'long', 0.8);
    if (C && e.count > 3) play(C.screams, { gain: 0.55, delay: 0.1, bus: vox, send: 0.3, prio: 1 });
    duck(0.35, 0.6, 0.6);
  });
  on('crowd:wave', (e) => {
    if (!ok() || !C) return;
    const { pan } = place(e.x, e.z);
    play(C.horn, { gain: 0.32, pan: pan * 0.6, send: 0.45 });
    play(C.roar, { gain: 0.4, pan: pan * 0.5, delay: 0.6, bus: vox, send: 0.4 });
  });
  on('scenario', () => {                       // a battle starts: its stage's enemies and floor, its fighters' voices
    if (ctx) { stopDrone(); undip(); }
    intensity = 0; seqs.length = seen.length = muSeen.length = 0; mu = null; muFrame = -1; boss = false;
    const map = game.story.chapter.map;
    C = null; bakeCast(map).then((c) => { if (game.story.chapter.map === map) C = c; }, warn);
    step = map === 'forest' ? 'stepGrass' : 'stepConcrete';
    for (const { hero: h } of game.players) { const id = h.char.id; bakeVoice(id).then((v) => { V[id] = v; }, warn); }
    L.stop(); L.prefetch({ chapter: game.chapter, chars: game.players.map((p) => p.hero.char.id) });
  });
  return { lineFrames: (who, text) => L.frames(who, text) };
}
